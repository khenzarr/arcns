/**
 * Renew Ownership Preservation Tests
 *
 * These tests capture the CORRECT baseline behavior for all non-buggy inputs.
 * They are written BEFORE any fix is applied.
 * They MUST ALL PASS on unfixed code — they encode the behavior to preserve.
 *
 * Non-buggy inputs are all cases where isBugCondition_1 and isBugCondition_2
 * return false:
 *   - available name (no Renew button)
 *   - TAKEN + owner wallet (address = ownerOf) → Renew button enabled
 *   - TAKEN + no wallet connected → "Connect wallet to renew"
 *   - TAKEN + wrong network → wrong-network warning
 *   - TAKEN + expiryState = "expired" → "This name is taken", no Renew button
 *   - owner submit path → writeContractAsync IS called for approval and renew()
 *
 * Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { renderHook, act } from "@testing-library/react";
import React from "react";

// ─── Address constants ────────────────────────────────────────────────────────

/** Connected wallet — IS the owner of the name */
const OWNER_ADDRESS = "0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";

/** Expiry timestamp: 6 months from now (active) */
const EXPIRY_ACTIVE = BigInt(Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 180);

/** Expiry timestamp: 20 days from now (expiring-soon) */
const EXPIRY_EXPIRING_SOON = BigInt(Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 20);

/** Expiry timestamp: 90 days ago (expired — past grace period) */
const EXPIRY_EXPIRED = BigInt(Math.floor(Date.now() / 1000) - 60 * 60 * 24 * 90);

// ─── Mutable account state ────────────────────────────────────────────────────
// Using a mutable object so individual tests can override account state
// without needing vi.doMock (which doesn't work after vi.mock hoisting).

const mockAccountState = {
  address:     OWNER_ADDRESS as string | undefined,
  isConnected: true,
  chainId:     5042002 as number | undefined,
};

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock("wagmi", () => ({
  useAccount: () => ({
    address:     mockAccountState.address,
    isConnected: mockAccountState.isConnected,
    chainId:     mockAccountState.chainId,
  }),
  useReadContract:  vi.fn(),
  useWriteContract: () => ({ writeContractAsync: mockWriteContractAsync }),
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

// Shared mutable writeContractAsync mock — tests can spy on it
let mockWriteContractAsync = vi.fn().mockResolvedValue("0xdeadbeef");

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Configure useReadContract mock for a TAKEN name with the OWNER wallet connected.
 * ownerOf returns OWNER_ADDRESS — same as the connected wallet.
 */
function setupReadContractForTakenNameOwner(expiryTs: bigint) {
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
      // Return OWNER_ADDRESS — same as the connected wallet
      return { data: OWNER_ADDRESS, isLoading: false, isError: false };
    }
    if (fn === "addr") {
      return { data: undefined, isLoading: false, isFetched: false };
    }
    return { data: undefined, isLoading: false, isError: false, isFetching: false, refetch: vi.fn() };
  });
}

/**
 * Configure useReadContract mock for an AVAILABLE name.
 */
function setupReadContractForAvailableName() {
  (useReadContract as ReturnType<typeof vi.fn>).mockImplementation((args: any) => {
    const fn = args?.functionName;

    if (fn === "available") {
      return { data: true, isLoading: false, isError: false, isFetching: false, refetch: vi.fn() };
    }
    if (fn === "rentPrice") {
      return { data: { base: 2_000_000n, premium: 0n }, isLoading: false, isError: false };
    }
    if (fn === "nameExpires") {
      return { data: 0n, isLoading: false, isError: false, refetch: vi.fn() };
    }
    if (fn === "allowance") {
      return { data: 0n, refetch: vi.fn() };
    }
    if (fn === "balanceOf") {
      return { data: 100_000_000n };
    }
    if (fn === "addr") {
      return { data: undefined, isLoading: false, isFetched: false };
    }
    return { data: undefined, isLoading: false, isError: false, isFetching: false, refetch: vi.fn() };
  });
}

/**
 * Configure useReadContract mock for a TAKEN name with EXPIRED expiry.
 */
function setupReadContractForExpiredName() {
  (useReadContract as ReturnType<typeof vi.fn>).mockImplementation((args: any) => {
    const fn = args?.functionName;

    if (fn === "available") {
      return { data: false, isLoading: false, isError: false, isFetching: false, refetch: vi.fn() };
    }
    if (fn === "rentPrice") {
      return { data: { base: 2_000_000n, premium: 0n }, isLoading: false, isError: false };
    }
    if (fn === "nameExpires") {
      return { data: EXPIRY_EXPIRED, isLoading: false, isError: false, refetch: vi.fn() };
    }
    if (fn === "allowance") {
      return { data: 0n, refetch: vi.fn() };
    }
    if (fn === "balanceOf") {
      return { data: 100_000_000n };
    }
    if (fn === "addr") {
      return { data: undefined, isLoading: false, isFetched: false };
    }
    return { data: undefined, isLoading: false, isError: false, isFetching: false, refetch: vi.fn() };
  });
}

/**
 * Configure useReadContract mock for a TAKEN name (no wallet connected).
 */
function setupReadContractForTakenNameNoWallet(expiryTs: bigint) {
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
      return { data: 0n };
    }
    if (fn === "addr") {
      return { data: undefined, isLoading: false, isFetched: false };
    }
    return { data: undefined, isLoading: false, isError: false, isFetching: false, refetch: vi.fn() };
  });
}

// ─── Test Suite ───────────────────────────────────────────────────────────────

describe("Preservation — Available name: Register button shown, no Renew button", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset account state to default (owner, connected, correct chain)
    mockAccountState.address     = OWNER_ADDRESS;
    mockAccountState.isConnected = true;
    mockAccountState.chainId     = 5042002;
    mockWriteContractAsync = vi.fn().mockResolvedValue("0xdeadbeef");
  });

  /**
   * Preservation Test 1: Available name → Register button shown, no Renew button.
   *
   * Non-buggy input: nameState = "AVAILABLE" — isBugCondition_1 does not hold.
   * This behavior must be preserved after the fix.
   *
   * Validates: Requirement 3.1, 3.7
   */
  it("available name shows Register button and no Renew button (PASSES on unfixed code)", async () => {
    setupReadContractForAvailableName();

    const { default: DomainCard } = await import("../components/DomainCard");

    render(<DomainCard label="newname" tld="arc" isCommitted={true} />);

    // Wait for the component to settle
    await waitFor(() => {
      const registerButton = screen.queryByRole("button", { name: /register/i });
      expect(registerButton).not.toBeNull();
    }, { timeout: 2000 });

    // Register button should be present
    const registerButton = screen.queryByRole("button", { name: /register/i });
    expect(registerButton).not.toBeNull();

    // No Renew button should be present for an available name
    const renewButton = screen.queryByRole("button", { name: /renew/i });
    expect(renewButton).toBeNull();
  });
});

describe("Preservation — TAKEN + owner wallet: Renew button enabled", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset account state to default (owner, connected, correct chain)
    mockAccountState.address     = OWNER_ADDRESS;
    mockAccountState.isConnected = true;
    mockAccountState.chainId     = 5042002;
    mockWriteContractAsync = vi.fn().mockResolvedValue("0xdeadbeef");
  });

  /**
   * Preservation Test 2: TAKEN + owner wallet (address = ownerOf) → Renew button enabled.
   *
   * Non-buggy input: connectedAddress = ownerOf — isBugCondition_1 does not hold.
   * On unfixed code: any connected wallet sees an enabled Renew button (no ownerOf check).
   * This behavior must be preserved after the fix (owner still sees enabled Renew button).
   *
   * Validates: Requirement 3.2
   */
  it("TAKEN + owner wallet: Renew button is enabled (not disabled) (PASSES on unfixed code)", async () => {
    setupReadContractForTakenNameOwner(EXPIRY_ACTIVE);

    const { default: DomainCard } = await import("../components/DomainCard");

    render(<DomainCard label="alice" tld="arc" isCommitted={true} />);

    // Wait for the Renew button to appear
    await waitFor(() => {
      const renewButton = screen.queryByRole("button", { name: /renew/i });
      expect(renewButton).not.toBeNull();
    }, { timeout: 2000 });

    // On unfixed code: Renew button is enabled (no ownerOf check exists)
    // On fixed code: Renew button is enabled because address = ownerOf
    const renewButton = screen.queryByRole("button", { name: /renew/i });
    expect(renewButton).not.toBeNull();
    expect(renewButton).not.toBeDisabled();
  });

  it("TAKEN + owner wallet + expiring-soon: Renew button is enabled (PASSES on unfixed code)", async () => {
    setupReadContractForTakenNameOwner(EXPIRY_EXPIRING_SOON);

    const { default: DomainCard } = await import("../components/DomainCard");

    render(<DomainCard label="bob" tld="arc" isCommitted={true} />);

    await waitFor(() => {
      const renewButton = screen.queryByRole("button", { name: /renew/i });
      expect(renewButton).not.toBeNull();
    }, { timeout: 2000 });

    const renewButton = screen.queryByRole("button", { name: /renew/i });
    expect(renewButton).not.toBeNull();
    expect(renewButton).not.toBeDisabled();
  });
});

describe("Preservation — TAKEN + no wallet connected: 'Connect wallet to renew' shown", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Set account state: no wallet connected
    mockAccountState.address     = undefined;
    mockAccountState.isConnected = false;
    mockAccountState.chainId     = undefined;
    mockWriteContractAsync = vi.fn().mockResolvedValue("0xdeadbeef");
  });

  /**
   * Preservation Test 3: TAKEN + no wallet connected → "Connect wallet to renew" shown.
   *
   * Non-buggy input: no wallet connected — isBugCondition_1 does not hold.
   * This behavior must be preserved after the fix.
   *
   * Validates: Requirement 3.3
   */
  it("TAKEN + no wallet: shows 'Connect wallet to renew' (PASSES on unfixed code)", async () => {
    setupReadContractForTakenNameNoWallet(EXPIRY_ACTIVE);

    const { default: DomainCard } = await import("../components/DomainCard");

    render(<DomainCard label="alice" tld="arc" isCommitted={true} />);

    // Wait for the component to settle
    await waitFor(() => {
      expect(screen.queryByText(/connect wallet to renew/i)).not.toBeNull();
    }, { timeout: 2000 });

    // "Connect wallet to renew" message should be shown
    expect(screen.queryByText(/connect wallet to renew/i)).not.toBeNull();

    // No Renew button should be present
    const renewButton = screen.queryByRole("button", { name: /renew/i });
    expect(renewButton).toBeNull();
  });
});

describe("Preservation — TAKEN + wrong network: wrong-network warning shown", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Set account state: connected but on wrong chain
    mockAccountState.address     = OWNER_ADDRESS;
    mockAccountState.isConnected = true;
    mockAccountState.chainId     = 1; // Ethereum mainnet — wrong chain
    mockWriteContractAsync = vi.fn().mockResolvedValue("0xdeadbeef");
  });

  /**
   * Preservation Test 4: TAKEN + wrong network → wrong-network warning shown.
   *
   * Non-buggy input: wrong network — isBugCondition_1 does not hold.
   * This behavior must be preserved after the fix.
   *
   * Validates: Requirement 3.4
   */
  it("TAKEN + wrong network: shows wrong-network warning (PASSES on unfixed code)", async () => {
    setupReadContractForTakenNameOwner(EXPIRY_ACTIVE);

    const { default: DomainCard } = await import("../components/DomainCard");

    render(<DomainCard label="alice" tld="arc" isCommitted={true} />);

    // Wait for the component to settle and show the wrong-network warning
    await waitFor(() => {
      expect(screen.queryByText(/switch to arc testnet/i)).not.toBeNull();
    }, { timeout: 2000 });

    // Wrong-network warning should be shown
    expect(screen.queryByText(/switch to arc testnet/i)).not.toBeNull();

    // No Renew button should be present
    const renewButton = screen.queryByRole("button", { name: /renew/i });
    expect(renewButton).toBeNull();
  });
});

describe("Preservation — TAKEN + expired: 'This name is taken' shown, no Renew button", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset account state to default (owner, connected, correct chain)
    mockAccountState.address     = OWNER_ADDRESS;
    mockAccountState.isConnected = true;
    mockAccountState.chainId     = 5042002;
    mockWriteContractAsync = vi.fn().mockResolvedValue("0xdeadbeef");
  });

  /**
   * Preservation Test 5: TAKEN + expiryState = "expired" → "This name is taken" shown, no Renew button.
   *
   * Non-buggy input: expiryState = "expired" — isBugCondition_1 does not hold.
   * This behavior must be preserved after the fix.
   *
   * Validates: Requirement 3.5
   */
  it("TAKEN + expired: shows 'This name is taken' and no Renew button (PASSES on unfixed code)", async () => {
    setupReadContractForExpiredName();

    const { default: DomainCard } = await import("../components/DomainCard");

    render(<DomainCard label="alice" tld="arc" isCommitted={true} />);

    // Wait for the component to settle
    await waitFor(() => {
      expect(screen.queryByText(/this name is taken/i)).not.toBeNull();
    }, { timeout: 2000 });

    // "This name is taken" message should be shown
    expect(screen.queryByText(/this name is taken/i)).not.toBeNull();

    // No Renew button should be present for an expired name
    const renewButton = screen.queryByRole("button", { name: /renew/i });
    expect(renewButton).toBeNull();
  });
});

describe("Preservation — Owner submit path: writeContractAsync IS called", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset account state to default (owner, connected, correct chain)
    mockAccountState.address     = OWNER_ADDRESS;
    mockAccountState.isConnected = true;
    mockAccountState.chainId     = 5042002;
    mockWriteContractAsync = vi.fn().mockResolvedValue("0xdeadbeef");
  });

  /**
   * Preservation Test 6: Owner submit path → writeContractAsync IS called for approval and renew().
   *
   * Non-buggy input: connectedAddress = ownerOf — isBugCondition_2 does not hold.
   * On unfixed code: writeContractAsync is always called (no ownership check).
   * This behavior must be preserved after the fix (owner can still renew).
   *
   * Validates: Requirement 3.2, 3.6
   */
  it("owner submit path: writeContractAsync IS called for approval and renew() (PASSES on unfixed code)", async () => {
    // publicClient.readContract returns OWNER_ADDRESS for ownerOf
    // (same as connected wallet — owner path)
    (publicClient.readContract as ReturnType<typeof vi.fn>).mockResolvedValue(OWNER_ADDRESS);

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

    // On unfixed code: writeContractAsync IS called (no ownership check)
    // On fixed code: writeContractAsync IS called because address = ownerOf
    expect(mockWriteContractAsync).toHaveBeenCalled();

    // The first call should be the USDC approval
    expect(mockWriteContractAsync.mock.calls[0][0]).toMatchObject({
      functionName: "approve",
    });

    // The second call should be the renew() call
    expect(mockWriteContractAsync.mock.calls[1][0]).toMatchObject({
      functionName: "renew",
    });

    // Step should be "success" (or at least not "failed")
    expect(result.current.step).not.toBe("failed");
  });
});
