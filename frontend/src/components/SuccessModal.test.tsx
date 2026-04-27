/**
 * SuccessModal Bug Condition Exploration Test — Bug 1
 *
 * Encodes the EXPECTED (correct) behavior.
 * Written BEFORE any fix is applied.
 * FAILS on unfixed code — failure confirms the bug exists.
 *
 * Bug: useReadContract fires once at mount. If addr(node) returns ZERO_ADDRESS
 * at that moment (RPC lag), resolvedToWallet is always false and the
 * "This name now resolves to [wallet]" confirmation line is never shown.
 *
 * Validates: Requirements 1.1, 1.2
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const CONNECTED_WALLET = "0xABCDEF1234567890ABCDef1234567890abcdef12";

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock("wagmi", () => ({
  useAccount: () => ({ address: CONNECTED_WALLET, isConnected: true }),
  useReadContract: vi.fn(),
  useWriteContract: () => ({ writeContractAsync: vi.fn() }),
}));

vi.mock("../hooks/usePrimaryName", () => ({
  usePrimaryName: () => ({
    setStep: "idle",
    setPrimaryName: vi.fn(),
  }),
}));

vi.mock("../lib/publicClient", () => ({
  publicClient: {
    readContract: vi.fn(),
    waitForTransactionReceipt: vi.fn(),
  },
}));

import { useReadContract } from "wagmi";

// ─── Helpers ──────────────────────────────────────────────────────────────────

import type { SupportedTLD } from "../lib/normalization";

function makeResult() {
  return {
    name: "alice",
    tld: "arc" as SupportedTLD,
    txHash: "0xdeadbeef" as `0x${string}`,
    expires: 1893456000n,
    cost: 2_000_000n,
  };
}

// ─── Bug 1 — SuccessModal timing ─────────────────────────────────────────────
//
// Scope: { registeredAddr: ZERO_ADDRESS, connectedAddress: CONNECTED_WALLET }
//
// On unfixed code: useReadContract fires once at mount, returns ZERO_ADDRESS.
// resolvedToWallet = false → confirmation line absent.
//
// Expected (correct) behavior: after polling confirms addr = connectedWallet,
// the confirmation line SHOULD appear.
//
// This test asserts the EXPECTED behavior. It FAILS on unfixed code because
// the single-fire read never retries and the line stays absent.

describe("Bug 1 — SuccessModal timing: confirmation line absent when addr returns ZERO_ADDRESS at mount", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it(
    "should show confirmation line once addr is confirmed (FAILS on unfixed code — single-fire read never retries)",
    async () => {
      // Simulate polling: first call returns ZERO_ADDRESS (RPC lag), subsequent calls
      // return CONNECTED_WALLET (addr confirmed on-chain). The fixed code polls via
      // refetchInterval and will re-render once the second value is returned.
      (useReadContract as ReturnType<typeof vi.fn>)
        .mockReturnValueOnce({
          data: ZERO_ADDRESS,
          isFetched: true,
          isLoading: false,
        })
        .mockReturnValue({
          data: CONNECTED_WALLET,
          isFetched: true,
          isLoading: false,
        });

      const { default: SuccessModal } = await import("./SuccessModal");

      const { rerender } = render(
        <SuccessModal
          result={makeResult()}
          onClose={vi.fn()}
          onSetPrimary={vi.fn()}
        />
      );

      // Simulate a poll cycle completing — re-render with the confirmed address
      rerender(
        <SuccessModal
          result={makeResult()}
          onClose={vi.fn()}
          onSetPrimary={vi.fn()}
        />
      );

      await new Promise(r => setTimeout(r, 50));

      // EXPECTED (correct) behavior: the confirmation line should appear after
      // polling confirms addr = connectedWallet.
      //
      // On UNFIXED code: this assertion FAILS because resolvedToWallet is always
      // false (single-fire read returned ZERO_ADDRESS, no retry mechanism).
      //
      // Counterexample: SuccessModal({ registeredAddr: ZERO_ADDRESS, connectedAddress: "0xABC…" })
      // → confirmation line absent, never retried — BUG CONFIRMED.
      const confirmationLine = screen.queryByText(/This name now resolves to/i);
      expect(confirmationLine).not.toBeNull();
    }
  );
});

// ─── Preservation Property Tests — Bug 1 ─────────────────────────────────────
//
// Property 2: Preservation — SuccessModal non-polling cases
//
// These tests encode the NON-BUGGY paths that must PASS on unfixed code and
// continue to pass after the fix is applied.
//
// The wagmi mock at the top of this file fixes useAccount → CONNECTED_WALLET.
// We vary the `data` returned by useReadContract to cover both preservation cases:
//   - addr === CONNECTED_WALLET → confirmation line shown (Req 3.1)
//   - addr === ZERO_ADDRESS     → confirmation line absent (Req 3.2)
//
// Validates: Requirements 3.1, 3.2

import * as fc from "fast-check";

// Arbitrary: a non-zero EVM address that is NOT ZERO_ADDRESS and NOT CONNECTED_WALLET.
// We use these as "other" addresses to verify the addr-must-match-wallet invariant.
const otherAddrArb = fc
  .stringMatching(/^[0-9a-f]{40}$/)
  .filter((hex) => {
    const addr = `0x${hex}`.toLowerCase();
    return (
      addr !== "0x0000000000000000000000000000000000000000" &&
      addr !== CONNECTED_WALLET.toLowerCase()
    );
  })
  .map((hex) => `0x${hex}` as string);

describe("Preservation — SuccessModal: confirmation line behavior on non-buggy paths (Property 2)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it(
    "should show confirmation line when addr === connectedWallet and isFetched=true (Req 3.1)",
    async () => {
      /**
       * Validates: Requirements 3.1
       *
       * Preservation case: addr already readable at mount time and matches the
       * connected wallet. The confirmation line must be shown immediately.
       * This path is NOT affected by the bug (bug only fires when addr = ZERO_ADDRESS
       * at mount time). Must pass on unfixed code.
       */
      // useAccount returns CONNECTED_WALLET (fixed by top-level vi.mock)
      // useReadContract returns CONNECTED_WALLET → resolvedToWallet = true
      (useReadContract as ReturnType<typeof vi.fn>).mockReturnValue({
        data: CONNECTED_WALLET,
        isFetched: true,
        isLoading: false,
      });

      const { default: SuccessModal } = await import("./SuccessModal");
      const { unmount } = render(
        <SuccessModal result={makeResult()} onClose={vi.fn()} onSetPrimary={vi.fn()} />
      );

      await new Promise((r) => setTimeout(r, 20));

      const confirmationLine = screen.queryByText(/This name now resolves to/i);
      expect(confirmationLine).not.toBeNull();
      unmount();
    }
  );

  it(
    "should NOT show confirmation line when addr is ZERO_ADDRESS and isFetched=true (Req 3.2)",
    async () => {
      /**
       * Validates: Requirements 3.2
       *
       * Preservation case: addr confirmed as zero (e.g. registration without resolver).
       * The confirmation line must be absent. Must pass on unfixed code.
       */
      (useReadContract as ReturnType<typeof vi.fn>).mockReturnValue({
        data: ZERO_ADDRESS,
        isFetched: true,
        isLoading: false,
      });

      const { default: SuccessModal } = await import("./SuccessModal");
      const { unmount } = render(
        <SuccessModal result={makeResult()} onClose={vi.fn()} onSetPrimary={vi.fn()} />
      );

      await new Promise((r) => setTimeout(r, 20));

      const confirmationLine = screen.queryByText(/This name now resolves to/i);
      expect(confirmationLine).toBeNull();
      unmount();
    }
  );

  it(
    "property: for any non-zero addr that does NOT match connectedWallet, confirmation line is absent (Req 3.2)",
    async () => {
      /**
       * Validates: Requirements 3.2
       *
       * Property-based: for all addr values that are non-zero but don't match the
       * connected wallet, the confirmation line must be absent.
       * This covers the full input space of non-matching addresses.
       */
      await fc.assert(
        fc.asyncProperty(otherAddrArb, async (otherAddr) => {
          vi.clearAllMocks();

          (useReadContract as ReturnType<typeof vi.fn>).mockReturnValue({
            data: otherAddr,
            isFetched: true,
            isLoading: false,
          });

          const { default: SuccessModal } = await import("./SuccessModal");
          const { unmount } = render(
            <SuccessModal result={makeResult()} onClose={vi.fn()} onSetPrimary={vi.fn()} />
          );

          await new Promise((r) => setTimeout(r, 20));

          const confirmationLine = screen.queryByText(/This name now resolves to/i);
          unmount();
          return confirmationLine === null;
        }),
        { numRuns: 20 }
      );
    }
  );
});

// ─── Bug Condition Exploration Test — Bug 1 (arcns-ux-polish) ─────────────────
//
// Property 1: Bug Condition — SuccessModal sub-headline reflects confirmed resolution
//
// Encodes the EXPECTED (correct) behavior.
// Written BEFORE any fix is applied.
// FAILS on unfixed code — failure confirms the bug exists.
//
// Bug: The gradient header <p> sub-headline is static ("Your domain is live on Arc Testnet")
// and never reacts to resolvedToWallet. Even when resolvedToWallet = true (addr confirmed),
// the sub-headline does not update to reflect the resolved state.
//
// Validates: Requirements 1.1, 2.1

describe("Bug 1 (arcns-ux-polish) — SuccessModal sub-headline does not reflect resolvedToWallet=true", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it(
    "sub-headline should read 'Registered and resolving to your wallet' when resolvedToWallet=true (FAILS on unfixed code — sub-headline still reads 'Your domain is live on Arc Testnet')",
    async () => {
      // Mock useReadContract to return connectedAddress immediately so resolvedToWallet = true
      (useReadContract as ReturnType<typeof vi.fn>).mockReturnValue({
        data: CONNECTED_WALLET,
        isFetched: true,
        isLoading: false,
      });

      const { default: SuccessModal } = await import("./SuccessModal");

      const { unmount } = render(
        <SuccessModal
          result={makeResult()}
          onClose={vi.fn()}
          onSetPrimary={vi.fn()}
        />
      );

      await new Promise(r => setTimeout(r, 20));

      // EXPECTED (correct) behavior: sub-headline should read resolution-confirmed copy.
      //
      // On UNFIXED code: this assertion FAILS because the <p> sub-headline is hardcoded
      // to "Your domain is live on Arc Testnet" and never branches on resolvedToWallet.
      //
      // Counterexample: SuccessModal({ resolvedToWallet: true })
      // → sub-headline reads "Your domain is live on Arc Testnet" — BUG CONFIRMED.
      const resolvedSubHeadline = screen.queryByText(/Registered and resolving to your wallet/i);
      expect(resolvedSubHeadline).not.toBeNull();

      unmount();
    }
  );
});

// ─── Preservation Tests — Bug 1 (arcns-ux-polish) ────────────────────────────
//
// Property 2: Preservation — SuccessModal sub-headline unchanged when not resolved
//
// These tests encode the NON-BUGGY paths.
// They MUST PASS on unfixed code and continue to pass after the fix.
//
// Validates: Requirements 2.2, 3.8

describe("Preservation (arcns-ux-polish) — SuccessModal sub-headline and secondary line", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it(
    "sub-headline reads 'Your domain is live on Arc Testnet' when resolvedToWallet=false (addr=ZERO_ADDRESS) — preservation",
    async () => {
      /**
       * Validates: Requirements 2.2
       *
       * Preservation case: addr is ZERO_ADDRESS → resolvedToWallet = false.
       * The sub-headline must remain "Your domain is live on Arc Testnet".
       * This is the non-buggy path — must pass on unfixed code.
       */
      (useReadContract as ReturnType<typeof vi.fn>).mockReturnValue({
        data: ZERO_ADDRESS,
        isFetched: true,
        isLoading: false,
      });

      const { default: SuccessModal } = await import("./SuccessModal");
      const { unmount } = render(
        <SuccessModal result={makeResult()} onClose={vi.fn()} onSetPrimary={vi.fn()} />
      );

      await new Promise((r) => setTimeout(r, 20));

      const subHeadline = screen.queryByText(/Your domain is live on Arc Testnet/i);
      expect(subHeadline).not.toBeNull();

      unmount();
    }
  );

  it(
    "secondary '✓ This name now resolves to [wallet]' line is still present when resolvedToWallet=true — preservation (Req 3.8)",
    async () => {
      /**
       * Validates: Requirements 3.8
       *
       * Preservation case: resolvedToWallet = true.
       * The secondary confirmation line must still be present — the headline fix
       * is additive, not a replacement of the secondary line.
       * Must pass on unfixed code.
       */
      (useReadContract as ReturnType<typeof vi.fn>).mockReturnValue({
        data: CONNECTED_WALLET,
        isFetched: true,
        isLoading: false,
      });

      const { default: SuccessModal } = await import("./SuccessModal");
      const { unmount } = render(
        <SuccessModal result={makeResult()} onClose={vi.fn()} onSetPrimary={vi.fn()} />
      );

      await new Promise((r) => setTimeout(r, 20));

      const secondaryLine = screen.queryByText(/This name now resolves to/i);
      expect(secondaryLine).not.toBeNull();

      unmount();
    }
  );
});
