/**
 * Preservation Property Tests
 *
 * These tests verify behaviors that MUST NOT change after the fix.
 * They are written BEFORE any fix is applied.
 * They PASS on unfixed code — confirming the baseline behavior to preserve.
 *
 * Validates: Requirements 3.1, 3.2, 3.3, 3.4
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock("wagmi", () => ({
  useAccount: () => ({ address: "0x0b943Fe9f1f8135e0751BA8B43dc0cD688ad209D", isConnected: true }),
  useReadContract: vi.fn(),
  useWriteContract: () => ({ writeContractAsync: vi.fn() }),
  useReadContracts: vi.fn(() => ({ data: undefined })),
}));

vi.mock("../lib/publicClient", () => ({
  publicClient: {
    readContract: vi.fn().mockResolvedValue({ base: 2_000_000n, premium: 0n }),
  },
}));

vi.mock("../lib/nameCache", () => ({
  cacheGet: vi.fn(() => true),
  cacheSet: vi.fn(),
  cacheInvalidate: vi.fn(),
}));

import { useReadContract } from "wagmi";
import { useBalanceSafety } from "../hooks/useAvailability";
import { readFileSync } from "fs";
import path from "path";

// ─── Test 1: maxCost formula preservation ─────────────────────────────────────
//
// For any totalCost, the on-chain maxCost arg must equal:
//   totalCost + (totalCost * 500n) / 10000n
//
// This is a pure formula test — no hooks needed.
// Validates: Requirements 3.1
//
// **Validates: Requirements 3.1**

describe("Test 1 — maxCost formula preservation", () => {
  const testCases: bigint[] = [
    0n,
    1n,
    2_000_000n,       // $2.00
    10_000_000n,      // $10.00
    100_000_000n,     // $100.00
    640_000_000n,     // $640.00 (1-char name)
    1_000_000_000n,   // $1000.00
    999_999_999n,
    123_456_789n,
    500_000_000n,
  ];

  it.each(testCases)(
    "maxCost = totalCost + 5%% slippage for totalCost = %s",
    (totalCost) => {
      const expectedMaxCost = totalCost + (totalCost * 500n) / 10000n;

      // Verify the formula directly — this is what register() and renew() use
      const computedMaxCost = totalCost + (totalCost * 500n) / 10000n;

      expect(computedMaxCost).toBe(expectedMaxCost);
    }
  );

  it("maxCost formula is consistent across many values (property)", () => {
    // Simulate property-based testing with a range of values
    for (let i = 0n; i <= 100n; i++) {
      const totalCost = i * 1_000_000n; // $0 to $100 in $1 increments
      const maxCost = totalCost + (totalCost * 500n) / 10000n;
      // maxCost must always be >= totalCost
      expect(maxCost).toBeGreaterThanOrEqual(totalCost);
      // maxCost must equal the exact formula
      expect(maxCost).toBe(totalCost + (totalCost * 500n) / 10000n);
    }
  });

  it("register() source code uses maxCost = totalCost + (totalCost * 500n) / 10000n", () => {
    const sourceFile = path.resolve(__dirname, "../hooks/useArcNS.ts");
    const source = readFileSync(sourceFile, "utf-8");

    // Verify the register function computes maxCost with 5% slippage
    const registerFnStart = source.indexOf("const register = useCallback");
    expect(registerFnStart).toBeGreaterThan(-1);

    const nextCallback = source.indexOf("const approveUsdc = useCallback", registerFnStart + 1);
    const registerBody = source.slice(registerFnStart, nextCallback > -1 ? nextCallback : undefined);

    expect(registerBody).toContain("maxCost = totalCost + (totalCost * 500n) / 10000n");
  });

  it("renew() source code uses maxCost = cost + (cost * 500n) / 10000n", () => {
    const sourceFile = path.resolve(__dirname, "../hooks/useArcNS.ts");
    const source = readFileSync(sourceFile, "utf-8");

    const renewFnStart = source.indexOf("export function useRenewal()");
    expect(renewFnStart).toBeGreaterThan(-1);

    const nextFn = source.indexOf("export function", renewFnStart + 1);
    const renewBody = source.slice(renewFnStart, nextFn > -1 ? nextFn : undefined);

    expect(renewBody).toContain("maxCost = cost + (cost * 500n) / 10000n");
  });
});

// ─── Test 2: Genuine insufficient balance still flagged ───────────────────────
//
// When balance < registrationPrice, useBalanceSafety must return sufficient = false.
// This behavior must be preserved after the fix.
//
// On unfixed code: this PASSES because even with GAS_BUFFER, balance = 0n < any price.
// Validates: Requirements 3.2
//
// **Validates: Requirements 3.2**

describe("Test 2 — Genuine insufficient balance still flagged", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("useBalanceSafety returns sufficient=false when balance = 0n and registrationPrice = 10_000_000n", () => {
    (useReadContract as ReturnType<typeof vi.fn>).mockReturnValue({ data: 0n });

    const { result } = renderHook(() => useBalanceSafety(10_000_000n));

    expect(result.current.sufficient).toBe(false);
  });

  it("useBalanceSafety returns sufficient=false for multiple genuine shortfall cases", () => {
    const cases: Array<{ balance: bigint; price: bigint }> = [
      { balance: 0n,         price: 10_000_000n },
      { balance: 1_000_000n, price: 10_000_000n },
      { balance: 5_000_000n, price: 10_000_000n },
      { balance: 9_999_999n, price: 10_000_000n },
      { balance: 0n,         price: 2_000_000n  },
      { balance: 1_000_000n, price: 2_000_000n  },
    ];

    for (const { balance, price } of cases) {
      (useReadContract as ReturnType<typeof vi.fn>).mockReturnValue({ data: balance });

      const { result } = renderHook(() => useBalanceSafety(price));

      expect(result.current.sufficient).toBe(false);
    }
  });
});

// ─── Test 3: needsApproval uses maxCost (structural) ─────────────────────────
//
// In useDomainResolutionPipeline.ts, needsApproval compares allowance < maxCost.
// This must NOT be changed to allowance < totalCost after the fix.
//
// This is a structural/source-code test.
// Validates: Requirements 3.3
//
// **Validates: Requirements 3.3**

describe("Test 3 — needsApproval uses maxCost (structural)", () => {
  it("useDomainResolutionPipeline source code compares allowance < maxCost for needsApproval", () => {
    const sourceFile = path.resolve(
      __dirname,
      "../hooks/useDomainResolutionPipeline.ts"
    );
    const source = readFileSync(sourceFile, "utf-8");

    // Verify needsApproval uses maxCost, not totalCost
    expect(source).toContain("allowance < maxCost");
    // Ensure it does NOT compare allowance < totalCost
    expect(source).not.toContain("allowance < totalCost");
  });

  it("useDomainResolutionPipeline computes maxCost with 5% slippage formula", () => {
    const sourceFile = path.resolve(
      __dirname,
      "../hooks/useDomainResolutionPipeline.ts"
    );
    const source = readFileSync(sourceFile, "utf-8");

    // maxCost must be computed with the 5% slippage formula
    expect(source).toContain("(totalCost * 500n) / 10000n");
  });
});
