/**
 * Bug Condition Exploration Tests
 *
 * These tests encode the EXPECTED (correct) behavior.
 * They are written BEFORE any fix is applied.
 * They FAIL on unfixed code — that failure confirms the bugs exist.
 *
 * Validates: Requirements 1.1, 1.2, 1.3
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import { readFileSync } from "fs";
import path from "path";

// ─── Mocks ────────────────────────────────────────────────────────────────────

// Mock wagmi hooks used by DomainCard and its dependencies
vi.mock("wagmi", () => ({
  useAccount: () => ({ address: "0x0b943Fe9f1f8135e0751BA8B43dc0cD688ad209D", isConnected: true }),
  useReadContract: vi.fn(),
  useWriteContract: () => ({ writeContractAsync: vi.fn() }),
  useReadContracts: vi.fn(() => ({ data: undefined })),
}));

// Mock @rainbow-me/rainbowkit if used
vi.mock("@rainbow-me/rainbowkit", () => ({
  ConnectButton: () => null,
}));

// Mock publicClient (used by useRentPrice)
vi.mock("../lib/publicClient", () => ({
  publicClient: {
    readContract: vi.fn().mockResolvedValue({ base: 2_000_000n, premium: 0n }),
  },
}));

// Mock nameCache
vi.mock("../lib/nameCache", () => ({
  cacheGet: vi.fn(() => true), // domain is available
  cacheSet: vi.fn(),
  cacheInvalidate: vi.fn(),
}));

import { useReadContract } from "wagmi";
import { renderHook } from "@testing-library/react";
import { useBalanceSafety } from "../hooks/useArcNS";
import { formatUSDC } from "../lib/namehash";
import { arcTestnet } from "../lib/chains";

// ─── Test 1: Approval Label Bug ───────────────────────────────────────────────
//
// DomainCard renders the approval button label using formatUSDC(maxCost)
// instead of formatUSDC(totalCost). For totalCost = $2.00, maxCost = $2.10.
// The label should show "$2.00" but currently shows "$2.10".
//
// This test FAILS on unfixed code (shows "$2.10" instead of "$2.00").

describe("Test 1 — Approval Label Bug", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // useReadContract: return available=true for availability check,
    // and a balance of $100 so the user is not blocked by insufficient balance
    (useReadContract as ReturnType<typeof vi.fn>).mockImplementation((args: any) => {
      // allowance check — return large allowance so needsApproval = true requires low allowance
      if (args?.functionName === "allowance") {
        return { data: 0n, refetch: vi.fn() }; // 0 allowance → needsApproval = true
      }
      // balance check
      if (args?.functionName === "balanceOf") {
        return { data: 100_000_000n }; // $100 USDC — sufficient
      }
      // availability
      if (args?.functionName === "available") {
        return { data: true, isLoading: false, isError: false, isFetching: false };
      }
      return { data: undefined, isLoading: false, isError: false, isFetching: false };
    });
  });

  it("approval button label should show formatUSDC(totalCost) = $2.00, not formatUSDC(maxCost) = $2.10", async () => {
    // Import DomainCard dynamically after mocks are set up
    const { default: DomainCard } = await import("../components/DomainCard");

    const { container } = render(<DomainCard label="lowpay" tld="arc" isCommitted={true} />);

    // Wait for the component to settle
    await new Promise(r => setTimeout(r, 100));

    // The approval button should contain "$2.00" (totalCost), not "$2.10" (maxCost)
    // totalCost = 2_000_000n → "$2.00"
    // maxCost   = 2_100_000n → "$2.10"
    const approveButton = screen.queryByText(/Approve.*USDC to continue/i);

    if (approveButton) {
      // Bug: button shows "$2.10" (maxCost with 5% slippage)
      // Fix: button should show "$2.00" (totalCost, exact price)
      expect(approveButton.textContent).toContain("$2.00");
      expect(approveButton.textContent).not.toContain("$2.10");
    } else {
      // If button not found, check the container for the label text
      const html = container.innerHTML;
      // The bug: label contains "$2.10" instead of "$2.00"
      expect(html).toContain("$2.00");
    }
  });
});

// ─── Test 2: Balance Chain Bug (Structural) ───────────────────────────────────
//
// The fix: useUSDCBalance now uses publicClient.readContract directly,
// bypassing wagmi's useReadContract entirely. This guarantees the balance
// is always read from Arc Testnet regardless of the wallet's active chain.
//
// This test verifies the structural fix is in place.

describe("Test 2 — Balance Chain Bug (Structural)", () => {
  it("useUSDCBalance source code should use publicClient, not useReadContract", () => {
    const sourceFile = path.resolve(__dirname, "../hooks/useArcNS.ts");
    const source = readFileSync(sourceFile, "utf-8");

    const fnStart = source.indexOf("export function useUSDCBalance()");
    expect(fnStart).toBeGreaterThan(-1);

    const nextFn = source.indexOf("export function", fnStart + 1);
    const fnBody = source.slice(fnStart, nextFn > -1 ? nextFn : undefined);

    // Fix: uses publicClient to bypass wagmi chain context
    expect(fnBody).toContain("publicClient");
    expect(fnBody).toContain("balanceOf");
    // Should NOT use useReadContract (which is chain-context-dependent)
    expect(fnBody).not.toContain("useReadContract");
  });
});

// ─── Test 3: Gas Buffer Bug — exact balance ───────────────────────────────────
//
// useBalanceSafety(2_000_000n) with balance = 2_000_000n should return
// { sufficient: true, shortfall: 0n }.
//
// On unfixed code: GAS_BUFFER = 2_000_000n is added, so the check requires
// balance >= 4_000_000n. With balance = 2_000_000n, sufficient = false.
//
// This test FAILS on unfixed code.

import { publicClient } from "../lib/publicClient";

describe("Test 3 — Gas Buffer Bug (exact balance)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("useBalanceSafety(2_000_000n) with balance = 2_000_000n should return sufficient=true, shortfall=0n", async () => {
    // Mock publicClient.readContract to return balance = 2_000_000n ($2.00)
    (publicClient.readContract as ReturnType<typeof vi.fn>).mockResolvedValue(2_000_000n);

    const { result } = renderHook(() => useBalanceSafety(2_000_000n));

    // Wait for the async publicClient call to resolve
    await new Promise(r => setTimeout(r, 50));

    // Re-read after async update
    const { result: result2 } = renderHook(() => useBalanceSafety(2_000_000n));
    await new Promise(r => setTimeout(r, 50));

    // Expected (correct) behavior: user has exactly enough, no buffer needed
    expect(result2.current.sufficient).toBe(true);
    expect(result2.current.shortfall).toBe(0n);
    expect(result2.current.balance).toBe(2_000_000n);
  });
});

// ─── Test 4: Gas Buffer Bug — zero balance ────────────────────────────────────
//
// useBalanceSafety(2_000_000n) with balance = 0n should return
// { sufficient: false, shortfall: 2_000_000n }.
//
// On unfixed code: shortfall = requiredAmount + GAS_BUFFER - balance
//                            = 2_000_000n + 2_000_000n - 0n = 4_000_000n
//
// This test FAILS on unfixed code (shortfall is 4_000_000n, not 2_000_000n).

describe("Test 4 — Gas Buffer Bug (zero balance)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("useBalanceSafety(2_000_000n) with balance = 0n should return shortfall = 2_000_000n, not 4_000_000n", async () => {
    // Mock publicClient.readContract to return balance = 0n
    (publicClient.readContract as ReturnType<typeof vi.fn>).mockResolvedValue(0n);

    const { result } = renderHook(() => useBalanceSafety(2_000_000n));
    await new Promise(r => setTimeout(r, 50));

    // Expected (correct) behavior: shortfall = registrationPrice - balance = $2.00
    expect(result.current.sufficient).toBe(false);
    // Bug: shortfall is 4_000_000n ($4.00) due to GAS_BUFFER
    // Fix: shortfall should be 2_000_000n ($2.00)
    expect(result.current.shortfall).toBe(2_000_000n);
  });
});
