/**
 * ResolvePage Bug Condition Exploration Test — Bug 2
 *
 * Encodes the EXPECTED (correct) behavior.
 * Written BEFORE any fix is applied.
 * FAILS on unfixed code — failure confirms the bug exists.
 *
 * Bug: !hasAddr is true for both unregistered names (expiryTs === 0n) and
 * registered-but-no-addr names (expiryTs > 0n, addr = ZERO_ADDRESS). Both
 * cases render "No receiving address set" and the owner CTA appears even for
 * unregistered names.
 *
 * Validates: Requirements 1.3, 1.4
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import React from "react";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const CONNECTED_WALLET = "0xABCDEF1234567890ABCDef1234567890abcdef12";

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock("wagmi", () => ({
  useAccount: () => ({ address: CONNECTED_WALLET, isConnected: true }),
  useReadContract: vi.fn(),
  useWriteContract: () => ({ writeContractAsync: vi.fn() }),
}));

vi.mock("../../lib/publicClient", () => ({
  publicClient: {
    readContract: vi.fn().mockResolvedValue(ZERO_ADDRESS),
    waitForTransactionReceipt: vi.fn(),
  },
}));

import { useReadContract } from "wagmi";

// ─── Bug 2 — Resolve page state conflation ────────────────────────────────────
//
// Scope: { expiryTs: 0n, addr: ZERO_ADDRESS, isOwner: true }
//
// On unfixed code: !hasAddr branch renders "No receiving address set" + owner CTA
// for BOTH unregistered names AND registered-but-no-addr names.
//
// Expected (correct) behavior:
//   - expiryTs === 0n → "Name not registered", NO owner CTA
//   - expiryTs > 0n, addr = ZERO_ADDRESS → "No receiving address set" + owner CTA
//
// This test asserts the EXPECTED behavior. It FAILS on unfixed code because
// the !hasAddr branch does not check expiryTs.

describe("Bug 2 — Resolve page state conflation: unregistered name shows wrong message", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it(
    "should show 'Name not registered' and hide owner CTA when expiryTs=0n (FAILS on unfixed code — shows 'No receiving address set' + CTA instead)",
    async () => {
      // Mock useReadContract:
      //   - nameExpires → 0n (unregistered)
      //   - Registry.owner → CONNECTED_WALLET (isOwner = true)
      (useReadContract as ReturnType<typeof vi.fn>).mockImplementation((args: any) => {
        if (args?.functionName === "nameExpires") {
          return { data: 0n, isLoading: false };
        }
        if (args?.functionName === "owner") {
          // Registry owner = connected wallet → isOwner = true
          return { data: CONNECTED_WALLET, isLoading: false };
        }
        return { data: undefined, isLoading: false };
      });

      // Mock the publicClient used by useResolveAddress to return ZERO_ADDRESS
      const { publicClient } = await import("../../lib/publicClient");
      (publicClient.readContract as ReturnType<typeof vi.fn>).mockResolvedValue(ZERO_ADDRESS);

      const { default: ResolvePage } = await import("./page");

      render(<ResolvePage />);

      // Simulate a user typing and resolving an unregistered name.
      // We need to trigger the queried state — find the input and resolve button.
      const input = screen.getByPlaceholderText(/alice\.arc/i);
      const button = screen.getByRole("button", { name: /resolve/i });

      // Use fireEvent to set input value and click resolve
      const { fireEvent } = await import("@testing-library/react");
      fireEvent.change(input, { target: { value: "notexist.arc" } });
      fireEvent.click(button);

      // Wait for async resolution
      await waitFor(() => {
        // EXPECTED (correct) behavior: "Name not registered" shown, no owner CTA
        //
        // On UNFIXED code: this assertion FAILS because the page shows
        // "No receiving address set" + "Set to connected wallet" CTA instead.
        //
        // Counterexample: ResolvePage({ expiryTs: 0n, addr: ZERO_ADDRESS, isOwner: true })
        // → "No receiving address set" + CTA shown — BUG CONFIRMED.
        const notRegisteredMsg = screen.queryByText(/Name not registered/i);
        expect(notRegisteredMsg).not.toBeNull();
      }, { timeout: 500 });

      // Also assert the owner CTA is absent
      const ownerCTA = screen.queryByRole("button", { name: /Set to connected wallet/i });
      expect(ownerCTA).toBeNull();
    }
  );
});

// ─── Preservation Property Tests — Bug 2 ─────────────────────────────────────
//
// Property 2: Preservation — Resolve page registered-name cases
//
// These tests encode the NON-BUGGY paths that must PASS on unfixed code and
// continue to pass after the fix is applied.
//
// For all expiryTs > 0n inputs, the following behaviors must hold:
//   - expiryTs > 0n, addr = nonZeroAddr → resolved address displayed, no CTA
//   - expiryTs > 0n, addr = ZERO_ADDRESS, isOwner = true  → "No receiving address set" + CTA
//   - expiryTs > 0n, addr = ZERO_ADDRESS, isOwner = false → "No receiving address set", no CTA
//
// Validates: Requirements 3.3, 3.4, 3.5

import * as fc from "fast-check";
import { cleanup, fireEvent } from "@testing-library/react";

// Arbitrary: a non-zero EVM address (40 hex chars, not all zeros)
const nonZeroAddrArb = fc
  .stringMatching(/^[0-9a-f]{40}$/)
  .filter((hex) => hex !== "0".repeat(40))
  .map((hex) => `0x${hex}` as string);

// Arbitrary: a positive bigint representing a future expiry timestamp
// Use values in a realistic range: 1 to year 2100 (4102444800)
const positiveBigintArb = fc.bigInt({ min: 1n, max: 4102444800n });

// Helper: set up mocks, render ResolvePage, and trigger a resolve
// Returns unmount function. Caller must call unmount() + cleanup() after assertions.
async function renderAndResolve(opts: {
  expiryTs: bigint;
  resolvedAddr: string;
  isOwner: boolean;
}) {
  const { expiryTs, resolvedAddr, isOwner } = opts;

  (useReadContract as ReturnType<typeof vi.fn>).mockImplementation((args: any) => {
    if (args?.functionName === "nameExpires") {
      return { data: expiryTs, isLoading: false };
    }
    if (args?.functionName === "owner") {
      return {
        data: isOwner ? CONNECTED_WALLET : "0x0000000000000000000000000000000000000001",
        isLoading: false,
      };
    }
    // useReceivingAddress addr read — return ZERO_ADDRESS (no addr set)
    if (args?.functionName === "addr") {
      return { data: ZERO_ADDRESS, isLoading: false };
    }
    return { data: undefined, isLoading: false };
  });

  const { publicClient } = await import("../../lib/publicClient");
  (publicClient.readContract as ReturnType<typeof vi.fn>).mockResolvedValue(resolvedAddr);

  const { default: ResolvePage } = await import("./page");
  const { unmount } = render(<ResolvePage />);

  const input = screen.getByPlaceholderText(/alice\.arc/i);
  const button = screen.getByRole("button", { name: /resolve/i });
  fireEvent.change(input, { target: { value: "alice.arc" } });
  fireEvent.click(button);

  return { unmount };
}

describe("Preservation — Resolve page: registered-name behaviors for expiryTs > 0n (Property 2)", () => {
  afterEach(() => {
    cleanup();
  });

  it(
    "should display resolved address and no CTA when expiryTs > 0n and addr is non-zero (Req 3.3)",
    async () => {
      /**
       * Validates: Requirements 3.3
       *
       * Preservation case: registered name with a non-zero addr record.
       * The resolved address must be displayed and no owner CTA shown.
       * Must pass on unfixed code.
       */
      const NON_ZERO_ADDR = "0x1234567890123456789012345678901234567890";

      const { unmount } = await renderAndResolve({
        expiryTs: 1893456000n,
        resolvedAddr: NON_ZERO_ADDR,
        isOwner: true,
      });

      await waitFor(() => {
        const addrDisplay = screen.queryByText(NON_ZERO_ADDR);
        expect(addrDisplay).not.toBeNull();
      }, { timeout: 1000 });

      const ownerCTA = screen.queryByRole("button", { name: /Set to connected wallet/i });
      expect(ownerCTA).toBeNull();

      unmount();
    }
  );

  it(
    "should show 'No receiving address set' and owner CTA when expiryTs > 0n, addr=ZERO, isOwner=true (Req 3.4)",
    async () => {
      /**
       * Validates: Requirements 3.4
       *
       * Preservation case: registered name with no addr set, connected wallet is owner.
       * "No receiving address set" + owner CTA must be shown.
       * Must pass on unfixed code.
       */
      const { unmount } = await renderAndResolve({
        expiryTs: 1893456000n,
        resolvedAddr: ZERO_ADDRESS,
        isOwner: true,
      });

      await waitFor(() => {
        expect(screen.queryByText(/No receiving address set/i)).not.toBeNull();
        expect(screen.queryByRole("button", { name: /Set to connected wallet/i })).not.toBeNull();
      }, { timeout: 1000 });

      unmount();
    }
  );

  it(
    "should show 'No receiving address set' and NO CTA when expiryTs > 0n, addr=ZERO, isOwner=false (Req 3.5)",
    async () => {
      /**
       * Validates: Requirements 3.5
       *
       * Preservation case: registered name with no addr set, connected wallet is NOT owner.
       * "No receiving address set" shown, no owner CTA.
       * Must pass on unfixed code.
       */
      const { unmount } = await renderAndResolve({
        expiryTs: 1893456000n,
        resolvedAddr: ZERO_ADDRESS,
        isOwner: false,
      });

      await waitFor(() => {
        expect(screen.queryByText(/No receiving address set/i)).not.toBeNull();
      }, { timeout: 1000 });

      expect(screen.queryByRole("button", { name: /Set to connected wallet/i })).toBeNull();

      unmount();
    }
  );

  it(
    "property: for all expiryTs > 0n with ZERO addr and isOwner=true, 'No receiving address set' + CTA shown (Req 3.4)",
    async () => {
      /**
       * Validates: Requirements 3.4
       *
       * Property-based: for all positive expiryTs values with zero addr and owner=true,
       * "No receiving address set" and the owner CTA must both be shown.
       */
      await fc.assert(
        fc.asyncProperty(positiveBigintArb, async (expiryTs) => {
          vi.resetAllMocks();
          cleanup();

          const { unmount } = await renderAndResolve({
            expiryTs,
            resolvedAddr: ZERO_ADDRESS,
            isOwner: true,
          });

          let noAddrShown = false;
          let ctaShown = false;

          await waitFor(() => {
            noAddrShown = screen.queryByText(/No receiving address set/i) !== null;
            ctaShown = screen.queryByRole("button", { name: /Set to connected wallet/i }) !== null;
            if (!noAddrShown || !ctaShown) throw new Error("not yet");
          }, { timeout: 1000 }).catch(() => {});

          unmount();
          cleanup();
          return noAddrShown && ctaShown;
        }),
        { numRuns: 10 }
      );
    }
  );

  it(
    "property: for all expiryTs > 0n with ZERO addr and isOwner=false, 'No receiving address set' shown, no CTA (Req 3.5)",
    async () => {
      /**
       * Validates: Requirements 3.5
       *
       * Property-based: for all positive expiryTs values with zero addr and owner=false,
       * "No receiving address set" shown and no owner CTA.
       */
      await fc.assert(
        fc.asyncProperty(positiveBigintArb, async (expiryTs) => {
          vi.resetAllMocks();
          cleanup();

          const { unmount } = await renderAndResolve({
            expiryTs,
            resolvedAddr: ZERO_ADDRESS,
            isOwner: false,
          });

          let noAddrShown = false;

          await waitFor(() => {
            noAddrShown = screen.queryByText(/No receiving address set/i) !== null;
            if (!noAddrShown) throw new Error("not yet");
          }, { timeout: 1000 }).catch(() => {});

          const ctaAbsent =
            screen.queryByRole("button", { name: /Set to connected wallet/i }) === null;

          unmount();
          cleanup();
          return noAddrShown && ctaAbsent;
        }),
        { numRuns: 10 }
      );
    }
  );
});
