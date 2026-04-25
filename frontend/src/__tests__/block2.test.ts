/**
 * block2.test.ts — Block 2 hook logic smoke tests.
 *
 * Tests the pure logic helpers used by the hooks.
 * Hooks themselves require a React/wagmi environment — tested via integration.
 */

import { describe, it, expect } from "vitest";
import {
  makeCommitment, buildRegisterArgs, maxCostWithSlippage, randomSecret, ZERO_ADDRESS,
} from "../lib/commitment";
import { classifyRawError, userFacingMessage, ARC_ERR, isRetryable } from "../lib/errors";
import { reverseNodeFor, namehash, labelHash } from "../lib/namehash";
import { normalizeLabel, validateLabel, priceTierFor } from "../lib/normalization";

// ─── useAvailability logic ────────────────────────────────────────────────────

describe("useAvailability — normalization pipeline", () => {
  it("normalizes uppercase before validation", () => {
    expect(normalizeLabel("ALICE")).toBe("alice");
    expect(validateLabel("alice")).toBeNull();
  });

  it("price tier for 1-char label is 50 USDC", () => {
    expect(priceTierFor("a").annualUSDC).toBe(50_000_000n);
  });

  it("price tier for 5-char label is 2 USDC", () => {
    expect(priceTierFor("hello").annualUSDC).toBe(2_000_000n);
  });

  it("invalid label returns INVALID state", () => {
    expect(validateLabel("-bad")).toBe("LEADING_HYPHEN");
    expect(validateLabel("")).toBe("EMPTY");
    expect(validateLabel("ab--cd")).toBe("DOUBLE_HYPHEN");
  });
});

// ─── useRegistration logic ────────────────────────────────────────────────────

describe("useRegistration — commitment consistency", () => {
  const base = {
    name: "alice",
    owner: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266" as `0x${string}`,
    duration: BigInt(365 * 24 * 60 * 60),
    secret: ("0x" + "ab".repeat(32)) as `0x${string}`,
    resolverAddr: ZERO_ADDRESS,
    reverseRecord: false,
    sender: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266" as `0x${string}`,
  };

  it("commitment is deterministic", () => {
    expect(makeCommitment(base)).toBe(makeCommitment(base));
  });

  it("different sender = different commitment (front-run protection)", () => {
    const other = { ...base, sender: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8" as `0x${string}` };
    expect(makeCommitment(base)).not.toBe(makeCommitment(other));
  });

  it("reverseRecord=true produces different commitment than false", () => {
    const withReverse = { ...base, reverseRecord: true };
    expect(makeCommitment(base)).not.toBe(makeCommitment(withReverse));
  });

  it("buildRegisterArgs returns 7-element tuple", () => {
    const args = buildRegisterArgs({ ...base, maxCost: 2_100_000n });
    expect(args.length).toBe(7);
    expect(args[0]).toBe("alice");   // name
    expect(args[6]).toBe(2_100_000n); // maxCost
  });

  it("maxCostWithSlippage adds 5%", () => {
    expect(maxCostWithSlippage(2_000_000n)).toBe(2_100_000n);
    expect(maxCostWithSlippage(50_000_000n)).toBe(52_500_000n);
  });

  it("randomSecret is 32-byte hex", () => {
    const s = randomSecret();
    expect(s).toMatch(/^0x[0-9a-f]{64}$/);
    expect(s.length).toBe(66);
  });

  it("two randomSecrets are different", () => {
    expect(randomSecret()).not.toBe(randomSecret());
  });
});

// ─── useRenew logic ───────────────────────────────────────────────────────────

describe("useRenew — maxCost calculation", () => {
  it("5% slippage on 2 USDC = 2.10 USDC", () => {
    expect(maxCostWithSlippage(2_000_000n)).toBe(2_100_000n);
  });

  it("5% slippage on 50 USDC = 52.50 USDC", () => {
    expect(maxCostWithSlippage(50_000_000n)).toBe(52_500_000n);
  });
});

// ─── usePrimaryName logic ─────────────────────────────────────────────────────

describe("usePrimaryName — reverse node computation", () => {
  const addr = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266" as `0x${string}`;

  it("reverseNodeFor is deterministic", () => {
    expect(reverseNodeFor(addr)).toBe(reverseNodeFor(addr));
  });

  it("reverseNodeFor is case-insensitive", () => {
    const lower = addr.toLowerCase() as `0x${string}`;
    const upper = addr.toUpperCase().replace("0X", "0x") as `0x${string}`;
    expect(reverseNodeFor(lower)).toBe(reverseNodeFor(upper));
  });

  it("different addresses produce different reverse nodes", () => {
    const addr2 = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8" as `0x${string}`;
    expect(reverseNodeFor(addr)).not.toBe(reverseNodeFor(addr2));
  });

  it("namehash of alice.arc is deterministic", () => {
    expect(namehash("alice.arc")).toBe(namehash("alice.arc"));
  });

  it("namehash of alice.arc != alice.circle", () => {
    expect(namehash("alice.arc")).not.toBe(namehash("alice.circle"));
  });
});

// ─── Error flow (all hooks) ───────────────────────────────────────────────────

describe("errors — hook error flow", () => {
  it("user rejection is classified correctly", () => {
    const { code, category } = classifyRawError(new Error("user rejected the request"));
    expect(code).toBe(ARC_ERR.USER_REJECTED);
    expect(category).toBe("USER_REJECTION");
  });

  it("chain mismatch message is ArcNS-branded", () => {
    const msg = userFacingMessage(ARC_ERR.CHAIN_MISMATCH);
    expect(msg).toContain("Arc Testnet");
    expect(msg.toLowerCase()).not.toContain("ens");
  });

  it("commitment too new message is actionable", () => {
    const msg = userFacingMessage(ARC_ERR.COMMITMENT_TOO_NEW);
    expect(msg.length).toBeGreaterThan(10);
    expect(msg.toLowerCase()).not.toContain("ens");
  });

  it("infra errors are retryable", () => {
    expect(isRetryable(ARC_ERR.TXPOOL_FULL)).toBe(true);
    expect(isRetryable(ARC_ERR.RPC_SUBMISSION_FAILED)).toBe(true);
    expect(isRetryable(ARC_ERR.RECEIPT_TIMEOUT)).toBe(true);
  });

  it("semantic errors are not retryable", () => {
    expect(isRetryable(ARC_ERR.INVALID_NAME)).toBe(false);
    expect(isRetryable(ARC_ERR.PRICE_EXCEEDS_MAX_COST)).toBe(false);
    expect(isRetryable(ARC_ERR.NAME_NOT_AVAILABLE)).toBe(false);
  });

  it("no user-facing message contains ENS wording", () => {
    for (const code of Object.values(ARC_ERR)) {
      const msg = userFacingMessage(code);
      expect(msg.toLowerCase()).not.toContain("ens");
    }
  });
});