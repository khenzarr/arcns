/**
 * Renew Ownership Bug Condition Exploration Tests
 *
 * These tests encode the EXPECTED (correct) behavior.
 * They are written BEFORE any fix is applied.
 * They FAIL on unfixed code — that failure confirms the bugs exist.
 *
 * Bug: DomainCard renders an active Renew button for non-owners, and
 * useRenew.renew() submits transactions without checking ownership.
 *
 * Surface 1 — UI (DomainCard): Non-owner sees active Renew button (bug).
 *   Expected (correct): Renew button is disabled for non-owner.
 *   → FAILS on unfixed code (button is active, not disabled).
 *
 * Surface 2 — Submit path (useRenew): writeContractAsync is called for non-owner (bug).
 *   Expected (correct): writeContractAsync is NOT called; step = "failed".
 *   → FAILS on unfixed code (writeContractAsync IS called).
 *
 * Validates: Requirements 1.1, 1.2
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { renderHook, act } from "@testing-library/react";
import React from "react";

// ─── Address constants ────────────────────────────────────────────────────────

/** Connected wallet — NOT the owner of the name */
const NON_OWNER_ADDRESS = "0xBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB";

/** Actual NFT owner of the name (returned by ownerOf) */
const OWNER_ADDRESS = "0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";

/** Expiry timestamp: 6 months from now (active) */
const EXPIRY_ACTIVE = BigInt(Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 180);

/** Expiry timestamp: 20 days from now (expiring-soon) */
const EXPIRY_EXPIRING_SOON = BigInt(Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 20);

/** Expiry timestamp: 5 days ago (grace period — within 90-day grace) */
const EXPIRY_GRACE = BigInt(Math.floor(Date.now() / 1000) - 60 * 60 * 24 * 5);

// ─── Mocks ────────────────────────────────────────────────────────────────────

// Mock wagmi — connected as NON_OWNER_ADDRESS on the correct chain
vi.mock("wagmi", () => ({
  useAccount: () => ({
    address:    NON_OWNER_ADDRESS,
    isConnected: true,
    chainId:    5042002, // DEPLOYED_CHAIN_ID
  }),
  useReadContract: vi.fn(),
  useWriteContract: () => ({ writeContractAsync: vi.fn() }),
  useReadContracts: vi.fn(() => ({ data: undefined })),
}));

vi.mock("@rainbow-me/rainbowkit", () => ({
  ConnectButton: () => null,
}));

// Mock publicClient — used by useRentPrice and useRenew
vi.mock("../lib/publicClient", () => ({
  publicClient: {
    readContract:              vi.fn(),
    waitForTransactionReceipt: vi.fn().mockResolvedValue({}),
  },
}));

// Mock nameCache
vi.mock("../lib/nameCache", () => ({
  cacheGet:        vi.fn(() => false),
  cacheSet:        vi.fn(),
  cacheInvalidate: vi.fn(),
}));

import { useReadContract } from "wagmi";
import { publicClient }    from "../lib/publicClient";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Configure useReadContract mock for a DomainCard render with a TAKEN name.
 *
 * - available()     → false  (name is TAKEN)
 * - rentPrice()     → { base: 2_000_000n, premium: 0n }
 * - nameExpires()   → expiryTs (determines expiryState)
 * - allowance()     → 0n
 * - balanceOf()     → 100_000_000n ($100 — sufficient)
 * - ownerOf()       → OWNER_ADDRESS (different from connected NON_OWNER_ADDRESS)
 * - addr()          → undefined (post-registration polling — not relevant here)
 */
function setupReadContractForTakenName(expiryTs: bigint) {
  (useReadContract as ReturnType<typeof vi.fn>).mockImplementation((args: any) => {
    const fn = args?.functionName;

    if (fn === "available") {
      return { data: false, isLoading: false, isError: false, isFetching: false, refetch: vi.fn() };
    }
    if (fn === "rentPrice") {
      return { data: { base: 2_000_000n, premium: 0n }, isLoading: false, isError: false };
    }
    if (fn === "nameExpires") {
      return { data: expiryTs, isLoading: false, isError: false, refetch: vi.fn() };
    }
    if (fn === "allowance") {
      return { data: 0n, refetch: vi.fn() };
    }
    if (fn === "balanceOf") {
      return { data: 100_000_000n };
    }
    if (fn === "ownerOf") {
      // Return the OWNER_ADDRESS — different from the connected NON_OWNER_ADDRESS
      return { data: OWNER_ADDRESS, isLoading: false, isError: false };
    }
    if (fn === "addr") {
      return { data: undefined, isLoading: false, isFetched: false };
    }
    return { data: undefined, isLoading: false, isError: false, isFetching: false, refetch: vi.fn() };
  });
}

// ─── Surface 1: DomainCard UI ─────────────────────────────────────────────────
//
// Bug: DomainCard renders an active Renew button for any connected wallet when
// nameState = "TAKEN" and expiryState is active/expiring-soon/grace.
// There is no ownerOf check in the current code.
//
// Expected (correct) behavior: Renew button is disabled for non-owner.
// These tests FAIL on unfixed code — the button is active (not disabled).

describe("Surface 1 — DomainCard: Non-owner should see disabled Renew button", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("expiryState=active: Renew button is disabled for non-owner (FAILS on unfixed code)", async () => {
    setupReadContractForTakenName(EXPIRY_ACTIVE);

    const { default: DomainCard } = await import("../components/DomainCard");

    render(<DomainCard label="alice" tld="arc" isCommitted={true} />);

    // Wait for the component to settle and render the Renew button
    await waitFor(() => {
      // The non-owner copy should be present (name is TAKEN + active + connected + non-owner)
      const nonOwnerEl = screen.queryByRole("button", { name: /only the owner can renew/i });
      expect(nonOwnerEl).not.toBeNull();
    }, { timeout: 2000 });

    // On UNFIXED code: the Renew button is active (not disabled) — this assertion FAILS
    // On FIXED code: the Renew button is disabled because the connected wallet is not the owner
    const renewButton = screen.queryByRole("button", { name: /only the owner can renew/i });
    expect(renewButton).not.toBeNull();
    expect(renewButton).toHaveAttribute("aria-disabled", "true");
  });

  it("expiryState=expiring-soon: Renew button is disabled for non-owner (FAILS on unfixed code)", async () => {
    setupReadContractForTakenName(EXPIRY_EXPIRING_SOON);

    const { default: DomainCard } = await import("../components/DomainCard");

    render(<DomainCard label="bob" tld="arc" isCommitted={true} />);

    await waitFor(() => {
      const nonOwnerEl = screen.queryByRole("button", { name: /only the owner can renew/i });
      expect(nonOwnerEl).not.toBeNull();
    }, { timeout: 2000 });

    // On UNFIXED code: the Renew button is active — this assertion FAILS
    // On FIXED code: the Renew button is disabled for non-owner
    const renewButton = screen.queryByRole("button", { name: /only the owner can renew/i });
    expect(renewButton).not.toBeNull();
    expect(renewButton).toHaveAttribute("aria-disabled", "true");
  });

  it("expiryState=grace: Renew button is disabled for non-owner (FAILS on unfixed code)", async () => {
    setupReadContractForTakenName(EXPIRY_GRACE);

    const { default: DomainCard } = await import("../components/DomainCard");

    render(<DomainCard label="carol" tld="arc" isCommitted={true} />);

    await waitFor(() => {
      const nonOwnerEl = screen.queryByRole("button", { name: /only the owner can renew/i });
      expect(nonOwnerEl).not.toBeNull();
    }, { timeout: 2000 });

    // On UNFIXED code: the Renew button is active — this assertion FAILS
    // On FIXED code: the Renew button is disabled for non-owner
    const renewButton = screen.queryByRole("button", { name: /only the owner can renew/i });
    expect(renewButton).not.toBeNull();
    expect(renewButton).toHaveAttribute("aria-disabled", "true");
  });
});

// ─── Surface 2: useRenew submit path ─────────────────────────────────────────
//
// Bug: useRenew.renew() calls writeContractAsync (USDC approval) without
// checking ownership. The v3 controller.renew() is permissionless by design,
// so the transaction succeeds on-chain for any caller.
//
// Expected (correct) behavior: writeContractAsync is NOT called; step = "failed".
// This test FAILS on unfixed code — writeContractAsync IS called.

describe("Surface 2 — useRenew: Non-owner renew should abort before any transaction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("writeContractAsync is NOT called and step = 'failed' for non-owner (FAILS on unfixed code)", async () => {
    // Mock publicClient.readContract to return OWNER_ADDRESS for ownerOf
    // (different from connected NON_OWNER_ADDRESS)
    (publicClient.readContract as ReturnType<typeof vi.fn>).mockResolvedValue(OWNER_ADDRESS);

    // Mock writeContractAsync — we will assert it is NOT called
    const writeContractAsync = vi.fn().mockResolvedValue("0xdeadbeef");

    vi.doMock("wagmi", () => ({
      useAccount: () => ({
        address:    NON_OWNER_ADDRESS,
        isConnected: true,
        chainId:    5042002,
      }),
      useReadContract: vi.fn(() => ({ data: undefined, isLoading: false })),
      useWriteContract: () => ({ writeContractAsync }),
      useReadContracts: vi.fn(() => ({ data: undefined })),
    }));

    const { useRenew } = await import("../hooks/useRenew");

    const { result } = renderHook(() => useRenew());

    await act(async () => {
      await result.current.renew({
        label:     "alice",
        tld:       "arc",
        duration:  BigInt(365 * 24 * 60 * 60),
        totalCost: 2_000_000n,
      });
    });

    // On UNFIXED code: writeContractAsync IS called (for USDC approval) — this assertion FAILS
    // On FIXED code: writeContractAsync is NOT called because the ownership guard aborts first
    expect(writeContractAsync).not.toHaveBeenCalled();

    // On UNFIXED code: step is "approving" or "renewing" or "success" — this assertion FAILS
    // On FIXED code: step = "failed" because the ownership guard sets it
    expect(result.current.step).toBe("failed");
  });
});
