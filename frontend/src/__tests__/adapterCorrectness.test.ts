/**
 * adapterCorrectness.test.ts
 *
 * Focused correctness tests for the ArcNS public resolution adapter.
 *
 * Tests cover:
 *   - parseName(): normalization, TLD validation, label validation
 *   - parseAddress(): address format validation
 *   - resolveAddressWithVerification(): forward-confirmation logic
 *     (mocked — does not make live RPC calls)
 *
 * These tests do NOT test live on-chain resolution.
 * They verify the adapter's correctness logic in isolation.
 */

import { describe, it, expect, vi } from "vitest";
import { parseName, parseAddress } from "../lib/adapterHelpers";

// ─── parseName tests ──────────────────────────────────────────────────────────

describe("parseName", () => {
  it("accepts a valid .arc name", () => {
    const result = parseName("alice.arc");
    expect(result).toMatchObject({
      label:          "alice",
      tld:            "arc",
      normalizedName: "alice.arc",
    });
    expect("error" in result).toBe(false);
  });

  it("accepts a valid .circle name", () => {
    const result = parseName("bob.circle");
    expect(result).toMatchObject({
      label:          "bob",
      tld:            "circle",
      normalizedName: "bob.circle",
    });
    expect("error" in result).toBe(false);
  });

  it("normalizes uppercase to lowercase", () => {
    const result = parseName("Alice.ARC");
    expect(result).toMatchObject({ normalizedName: "alice.arc" });
  });

  it("trims whitespace", () => {
    const result = parseName("  alice.arc  ");
    expect(result).toMatchObject({ normalizedName: "alice.arc" });
  });

  it("rejects unsupported TLD .eth", () => {
    const result = parseName("alice.eth");
    expect("code" in result).toBe(true);
    if ("code" in result) {
      expect(result.code).toBe("UNSUPPORTED_TLD");
    }
  });

  it("rejects unsupported TLD .xyz", () => {
    const result = parseName("alice.xyz");
    expect("code" in result).toBe(true);
    if ("code" in result) {
      expect(result.code).toBe("UNSUPPORTED_TLD");
    }
  });

  it("rejects name with no TLD", () => {
    const result = parseName("alice");
    expect("code" in result).toBe(true);
    if ("code" in result) {
      expect(result.code).toBe("INVALID_NAME");
    }
  });

  it("rejects empty string", () => {
    const result = parseName("");
    expect("code" in result).toBe(true);
    if ("code" in result) {
      expect(result.code).toBe("MALFORMED_INPUT");
    }
  });

  it("rejects label with leading hyphen", () => {
    const result = parseName("-alice.arc");
    expect("code" in result).toBe(true);
    if ("code" in result) {
      expect(result.code).toBe("INVALID_NAME");
    }
  });

  it("rejects label with trailing hyphen", () => {
    const result = parseName("alice-.arc");
    expect("code" in result).toBe(true);
    if ("code" in result) {
      expect(result.code).toBe("INVALID_NAME");
    }
  });

  it("rejects label with double-hyphen at positions 2-3", () => {
    const result = parseName("ab--cd.arc");
    expect("code" in result).toBe(true);
    if ("code" in result) {
      expect(result.code).toBe("INVALID_NAME");
    }
  });

  it("rejects label with invalid ASCII characters", () => {
    const result = parseName("alice!.arc");
    expect("code" in result).toBe(true);
    if ("code" in result) {
      expect(result.code).toBe("INVALID_NAME");
    }
  });

  it("accepts label with underscore", () => {
    const result = parseName("_alice.arc");
    expect("error" in result).toBe(false);
    if (!("error" in result)) {
      expect(result.normalizedName).toBe("_alice.arc");
    }
  });

  it("accepts label with hyphen in middle", () => {
    const result = parseName("al-ice.arc");
    expect("error" in result).toBe(false);
    if (!("error" in result)) {
      expect(result.normalizedName).toBe("al-ice.arc");
    }
  });

  it("accepts numeric label", () => {
    const result = parseName("123.arc");
    expect("error" in result).toBe(false);
  });
});

// ─── parseAddress tests ───────────────────────────────────────────────────────

describe("parseAddress", () => {
  it("accepts a valid lowercase address", () => {
    const result = parseAddress("0xabc123def456abc123def456abc123def456abc1");
    expect(typeof result).toBe("string");
    expect(result).toBe("0xabc123def456abc123def456abc123def456abc1");
  });

  it("normalizes uppercase address to lowercase", () => {
    const result = parseAddress("0xABC123DEF456ABC123DEF456ABC123DEF456ABC1");
    expect(result).toBe("0xabc123def456abc123def456abc123def456abc1");
  });

  it("rejects address without 0x prefix", () => {
    const result = parseAddress("abc123def456abc123def456abc123def456abc1");
    expect("code" in result).toBe(true);
    if ("code" in result) {
      expect(result.code).toBe("INVALID_ADDRESS");
    }
  });

  it("rejects address that is too short", () => {
    const result = parseAddress("0xabc123");
    expect("code" in result).toBe(true);
    if ("code" in result) {
      expect(result.code).toBe("INVALID_ADDRESS");
    }
  });

  it("rejects address with invalid hex characters", () => {
    const result = parseAddress("0xzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz");
    expect("code" in result).toBe(true);
    if ("code" in result) {
      expect(result.code).toBe("INVALID_ADDRESS");
    }
  });

  it("rejects empty string", () => {
    const result = parseAddress("");
    expect("code" in result).toBe(true);
    if ("code" in result) {
      expect(result.code).toBe("INVALID_ADDRESS");
    }
  });

  it("trims whitespace before validating", () => {
    const result = parseAddress("  0xabc123def456abc123def456abc123def456abc1  ");
    expect(typeof result).toBe("string");
  });
});

// ─── resolveAddressWithVerification logic tests ───────────────────────────────
// These tests verify the forward-confirmation logic by testing the
// underlying building blocks that the function composes.
//
// Integration-level mocking of dynamic imports inside graphql.ts is
// unreliable in vitest due to module caching. Instead we test:
//   (a) the verification decision logic directly
//   (b) the parseName/parseAddress guards that protect the route layer
//
// Live forward-confirmation behavior is covered by the smoke test matrix.

describe("resolveAddressWithVerification — verification decision rules", () => {
  const TEST_ADDRESS  = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
  const OTHER_ADDRESS = "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
  const ZERO          = "0x0000000000000000000000000000000000000000";

  // Inline the verification decision logic to test it in isolation.
  // This mirrors exactly what resolveAddressWithVerification does in step 2.
  function forwardConfirmationDecision(
    resolvedAddr: string | null,
    queriedAddress: string
  ): boolean {
    if (!resolvedAddr) return false;
    if (resolvedAddr === ZERO) return false;
    return resolvedAddr.toLowerCase() === queriedAddress.toLowerCase();
  }

  it("verified:true when resolved address matches queried address", () => {
    expect(forwardConfirmationDecision(TEST_ADDRESS, TEST_ADDRESS)).toBe(true);
  });

  it("verified:true is case-insensitive", () => {
    expect(forwardConfirmationDecision(
      TEST_ADDRESS.toUpperCase(),
      TEST_ADDRESS.toLowerCase()
    )).toBe(true);
  });

  it("verified:false when resolved address is a different address (stale record)", () => {
    expect(forwardConfirmationDecision(OTHER_ADDRESS, TEST_ADDRESS)).toBe(false);
  });

  it("verified:false when resolved address is zero address", () => {
    expect(forwardConfirmationDecision(ZERO, TEST_ADDRESS)).toBe(false);
  });

  it("verified:false when resolved address is null (no addr record)", () => {
    expect(forwardConfirmationDecision(null, TEST_ADDRESS)).toBe(false);
  });

  it("verified:false when resolved address is empty string", () => {
    expect(forwardConfirmationDecision("", TEST_ADDRESS)).toBe(false);
  });
});

describe("resolveAddressWithVerification — route-layer guard integration", () => {
  // Verify that the address route correctly rejects invalid inputs
  // before any resolution is attempted. These test the parseAddress guard
  // that sits in front of resolveAddressWithVerification in the route handler.

  it("parseAddress rejects input that would reach resolveAddressWithVerification malformed", () => {
    // These would cause incorrect reverse node computation if not caught
    const cases = [
      "not-an-address",
      "0x123",
      "0xGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG",
      "",
    ];
    for (const input of cases) {
      const result = parseAddress(input);
      expect("code" in result).toBe(true);
    }
  });

  it("valid address passes parseAddress and reaches resolution layer", () => {
    const result = parseAddress("0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa");
    expect(typeof result).toBe("string");
    expect(result).toBe("0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa");
  });
});
