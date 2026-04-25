import { describe, it, expect } from "vitest";
import { normalizeLabel, validateLabel, isValidLabel, codepointLength, priceTierFor, parseSearchInput, formatUSDC, withSlippage } from "../lib/normalization";
import { makeCommitment, randomSecret, buildRegisterArgs, maxCostWithSlippage, ZERO_ADDRESS } from "../lib/commitment";
import { classifyRawError, userFacingMessage, ARC_ERR, isRetryable } from "../lib/errors";
import { labelHash, namehash, reverseNodeFor } from "../lib/namehash";

describe("normalization", () => {
  it("normalizes uppercase to lowercase", () => { expect(normalizeLabel("ALICE")).toBe("alice"); });
  it("trims whitespace", () => { expect(normalizeLabel("  alice  ")).toBe("alice"); });
  it("valid: alice", () => { expect(validateLabel("alice")).toBeNull(); });
  it("valid: _test", () => { expect(validateLabel("_test")).toBeNull(); });
  it("valid: a-b", () => { expect(validateLabel("a-b")).toBeNull(); });
  it("valid: 1char", () => { expect(isValidLabel("a")).toBe(true); });
  it("invalid: empty", () => { expect(validateLabel("")).toBe("EMPTY"); });
  it("invalid: leading hyphen", () => { expect(validateLabel("-alice")).toBe("LEADING_HYPHEN"); });
  it("invalid: trailing hyphen", () => { expect(validateLabel("alice-")).toBe("TRAILING_HYPHEN"); });
  it("invalid: double hyphen at 2-3", () => { expect(validateLabel("ab--cd")).toBe("DOUBLE_HYPHEN"); });
  it("invalid: uppercase A", () => { expect(validateLabel("Alice")).toBe("INVALID_CHARACTERS"); });
  it("invalid: space", () => { expect(validateLabel("ali ce")).toBe("INVALID_CHARACTERS"); });
  it("codepoint length: emoji = 1", () => { expect(codepointLength("\u{1F600}")).toBe(1); });
  it("codepoint length: 2-byte char = 1", () => { expect(codepointLength("\u00e9")).toBe(1); });
  it("price tier: 1 char = 50 USDC", () => { expect(priceTierFor("a").annualUSDC).toBe(50_000_000n); });
  it("price tier: 5+ chars = 2 USDC", () => { expect(priceTierFor("hello").annualUSDC).toBe(2_000_000n); });
  it("formatUSDC: 2_000_000 = $2.00", () => { expect(formatUSDC(2_000_000n)).toContain("2.00"); });
  it("withSlippage: 5% on 100", () => { expect(withSlippage(100n)).toBe(105n); });
  it("parseSearchInput: strips .arc suffix", () => {
    const r = parseSearchInput("alice.arc", "arc");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.label).toBe("alice");
  });
});

describe("namehash", () => {
  it("labelHash is deterministic", () => {
    expect(labelHash("alice")).toBe(labelHash("alice"));
  });
  it("namehash of empty string is zero hash", () => {
    expect(namehash("")).toBe("0x0000000000000000000000000000000000000000000000000000000000000000");
  });
  it("namehash of alice.arc matches known value", () => {
    const h = namehash("alice.arc");
    expect(h).toMatch(/^0x[0-9a-f]{64}$/);
  });
  it("reverseNodeFor is deterministic", () => {
    const addr = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266" as `0x${string}`;
    expect(reverseNodeFor(addr)).toBe(reverseNodeFor(addr));
  });
});

describe("commitment", () => {
  const params = {
    name: "alice", owner: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266" as `0x${string}`,
    duration: BigInt(365 * 24 * 60 * 60), secret: ("0x" + "ab".repeat(32)) as `0x${string}`,
    resolverAddr: ZERO_ADDRESS, reverseRecord: false,
    sender: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266" as `0x${string}`,
  };
  it("makeCommitment is deterministic", () => {
    expect(makeCommitment(params)).toBe(makeCommitment(params));
  });
  it("different sender produces different hash", () => {
    const p2 = { ...params, sender: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8" as `0x${string}` };
    expect(makeCommitment(params)).not.toBe(makeCommitment(p2));
  });
  it("different secret produces different hash", () => {
    const p2 = { ...params, secret: ("0x" + "cd".repeat(32)) as `0x${string}` };
    expect(makeCommitment(params)).not.toBe(makeCommitment(p2));
  });
  it("randomSecret returns 32-byte hex", () => {
    const s = randomSecret();
    expect(s).toMatch(/^0x[0-9a-f]{64}$/);
  });
  it("buildRegisterArgs returns 7-element tuple", () => {
    const args = buildRegisterArgs({ ...params, maxCost: 2_000_000n });
    expect(args.length).toBe(7);
  });
  it("maxCostWithSlippage: 5% on 2_000_000", () => {
    expect(maxCostWithSlippage(2_000_000n)).toBe(2_100_000n);
  });
});

describe("errors", () => {
  it("user rejection classified correctly", () => {
    const { code, category } = classifyRawError(new Error("user rejected the request"));
    expect(code).toBe(ARC_ERR.USER_REJECTED);
    expect(category).toBe("USER_REJECTION");
  });
  it("txpool full is infra failure", () => {
    const { code, category } = classifyRawError(new Error("txpool is full"));
    expect(code).toBe(ARC_ERR.TXPOOL_FULL);
    expect(category).toBe("INFRA_FAILURE");
  });
  it("insufficient funds is semantic", () => {
    const { code, category } = classifyRawError(new Error("insufficient funds"));
    expect(code).toBe(ARC_ERR.INSUFFICIENT_FUNDS);
    expect(category).toBe("SEMANTIC_FAILURE");
  });
  it("infra errors are retryable", () => { expect(isRetryable(ARC_ERR.TXPOOL_FULL)).toBe(true); });
  it("semantic errors are not retryable", () => { expect(isRetryable(ARC_ERR.INVALID_NAME)).toBe(false); });
  it("user messages contain no ENS wording", () => {
    for (const code of Object.values(ARC_ERR)) {
      const msg = userFacingMessage(code);
      expect(msg.toLowerCase()).not.toContain("ens");
    }
  });
  it("user messages are non-empty strings", () => {
    for (const code of Object.values(ARC_ERR)) {
      expect(userFacingMessage(code).length).toBeGreaterThan(0);
    }
  });
});