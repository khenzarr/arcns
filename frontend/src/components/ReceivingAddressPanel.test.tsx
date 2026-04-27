/**
 * ReceivingAddressPanel Bug Condition Exploration Test — Bug 2 (arcns-ux-polish)
 *
 * Property 3: Bug Condition — ReceivingAddressPanel suppresses active CTA when already synced
 *
 * Encodes the EXPECTED (correct) behavior.
 * Written BEFORE any fix is applied.
 * FAILS on unfixed code — failure confirms the bug exists.
 *
 * Bug: The {isOwner && (...)} block renders the "Set to connected wallet" button
 * unconditionally for all isOwner=true cases. There is no check for the already-synced
 * condition (receivingAddress === connectedAddress) before rendering the button.
 *
 * Validates: Requirements 1.3, 2.3
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";

const CONNECTED_WALLET = "0xABCDEF1234567890ABCDef1234567890abcdef12";
const TEST_NODE = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef12" as `0x${string}`;

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock("wagmi", () => ({
  useAccount: () => ({ address: CONNECTED_WALLET, isConnected: true }),
  useReadContract: vi.fn(),
  useWriteContract: () => ({ writeContractAsync: vi.fn() }),
}));

vi.mock("../hooks/useReceivingAddress", () => ({
  useReceivingAddress: vi.fn(),
}));

vi.mock("../lib/publicClient", () => ({
  publicClient: {
    readContract: vi.fn(),
    waitForTransactionReceipt: vi.fn(),
  },
}));

import { useReceivingAddress } from "../hooks/useReceivingAddress";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeReceivingAddressHook(receivingAddress: `0x${string}` | null) {
  return {
    receivingAddress,
    addrState: receivingAddress ? "set" : "missing",
    isLoading: false,
    setStep: "idle" as const,
    setError: null,
    setReceivingAddress: vi.fn(),
    resetSet: vi.fn(),
  };
}

// ─── Bug 2 — ReceivingAddressPanel already-synced ─────────────────────────────
//
// Scope: { isOwner: true, receivingAddress: CONNECTED_WALLET, connectedAddress: CONNECTED_WALLET }
//
// On unfixed code: the "Set to connected wallet" button is rendered unconditionally
// for all isOwner=true cases — no already-synced guard exists.
//
// Expected (correct) behavior: when receivingAddress === connectedAddress,
// the "Set to connected wallet" button should NOT be present, and a
// "✓ Already set to connected wallet" indicator SHOULD be present.
//
// This test asserts the EXPECTED behavior. It FAILS on unfixed code because
// the already-synced guard is absent.

describe("Bug 2 (arcns-ux-polish) — ReceivingAddressPanel shows active CTA when already synced", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it(
    "should NOT show 'Set to connected wallet' button and SHOULD show '✓ Already set to connected wallet' when receivingAddress === connectedAddress (FAILS on unfixed code — button is still rendered as active CTA)",
    async () => {
      // receivingAddress already equals connectedAddress — the already-synced condition
      (useReceivingAddress as ReturnType<typeof vi.fn>).mockReturnValue(
        makeReceivingAddressHook(CONNECTED_WALLET as `0x${string}`)
      );

      const { ReceivingAddressPanel } = await import("./ReceivingAddressPanel");

      render(
        <ReceivingAddressPanel
          node={TEST_NODE}
          isOwner={true}
        />
      );

      // EXPECTED (correct) behavior: active CTA should be absent.
      //
      // On UNFIXED code: this assertion FAILS because the button is rendered
      // unconditionally inside {isOwner && (...)} with no already-synced guard.
      //
      // Counterexample: ReceivingAddressPanel({ isOwner: true, receivingAddress: CONNECTED_WALLET })
      // → "Set to connected wallet" button is active even when receivingAddress === connectedAddress
      // — BUG CONFIRMED.
      const setToWalletButton = screen.queryByRole("button", { name: /Set to connected wallet/i });
      expect(setToWalletButton).toBeNull();

      // EXPECTED (correct) behavior: already-synced indicator should be present.
      //
      // On UNFIXED code: this assertion FAILS because no such indicator exists.
      const alreadySyncedIndicator = screen.queryByText(/Already set to connected wallet/i);
      expect(alreadySyncedIndicator).not.toBeNull();
    }
  );
});

// ─── Preservation Tests — Bug 2 (arcns-ux-polish) ────────────────────────────
//
// Property 4: Preservation — ReceivingAddressPanel active CTA shown when not synced
//
// These tests encode the NON-BUGGY paths.
// They MUST PASS on unfixed code and continue to pass after the fix.
//
// Validates: Requirements 2.4, 3.3, 3.4, 3.5, 3.6

import * as fc from "fast-check";

const DIFFERENT_ADDRESS = "0x1111111111111111111111111111111111111111" as `0x${string}`;

describe("Preservation (arcns-ux-polish) — ReceivingAddressPanel non-synced CTA and non-owner view", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it(
    "isOwner=true, receivingAddress=null → 'Set to connected wallet' button is present and enabled — preservation (Req 3.5)",
    async () => {
      /**
       * Validates: Requirements 3.5
       *
       * Preservation case: receivingAddress is null (not set).
       * The "Set to connected wallet" button must be present and enabled.
       * This is the non-buggy path — must pass on unfixed code.
       */
      (useReceivingAddress as ReturnType<typeof vi.fn>).mockReturnValue(
        makeReceivingAddressHook(null)
      );

      const { ReceivingAddressPanel } = await import("./ReceivingAddressPanel");

      const { unmount } = render(
        <ReceivingAddressPanel node={TEST_NODE} isOwner={true} />
      );

      const button = screen.queryByRole("button", { name: /Set to connected wallet/i });
      expect(button).not.toBeNull();
      expect((button as HTMLButtonElement).disabled).toBe(false);

      unmount();
    }
  );

  it(
    "isOwner=true, receivingAddress='0x1111…', connectedAddress='0x2222…' (different) → 'Set to connected wallet' button is present and enabled — preservation (Req 3.6)",
    async () => {
      /**
       * Validates: Requirements 3.6
       *
       * Preservation case: receivingAddress is set but does NOT match connectedAddress.
       * The "Set to connected wallet" button must be present and enabled.
       * Must pass on unfixed code.
       */
      (useReceivingAddress as ReturnType<typeof vi.fn>).mockReturnValue(
        makeReceivingAddressHook(DIFFERENT_ADDRESS)
      );

      const { ReceivingAddressPanel } = await import("./ReceivingAddressPanel");

      const { unmount } = render(
        <ReceivingAddressPanel node={TEST_NODE} isOwner={true} />
      );

      // connectedAddress is CONNECTED_WALLET (0xABCD…) from the top-level wagmi mock
      // receivingAddress is DIFFERENT_ADDRESS (0x1111…) — they do not match
      const button = screen.queryByRole("button", { name: /Set to connected wallet/i });
      expect(button).not.toBeNull();
      expect((button as HTMLButtonElement).disabled).toBe(false);

      unmount();
    }
  );

  it(
    "isOwner=false → no write controls rendered regardless of receivingAddress — preservation (Req 3.4)",
    async () => {
      /**
       * Validates: Requirements 3.4
       *
       * Preservation case: non-owner view.
       * No write controls (no "Set to connected wallet" button, no update input) should
       * be rendered regardless of receivingAddress value.
       * Must pass on unfixed code.
       */
      (useReceivingAddress as ReturnType<typeof vi.fn>).mockReturnValue(
        makeReceivingAddressHook(DIFFERENT_ADDRESS)
      );

      const { ReceivingAddressPanel } = await import("./ReceivingAddressPanel");

      const { unmount } = render(
        <ReceivingAddressPanel node={TEST_NODE} isOwner={false} />
      );

      const setToWalletButton = screen.queryByRole("button", { name: /Set to connected wallet/i });
      expect(setToWalletButton).toBeNull();

      const updateButton = screen.queryByRole("button", { name: /Update/i });
      expect(updateButton).toBeNull();

      unmount();
    }
  );

  it(
    "property: for all isOwner=true renders where receivingAddress !== connectedAddress, 'Set to connected wallet' button is present — preservation (Req 3.5, 3.6)",
    async () => {
      /**
       * Validates: Requirements 3.5, 3.6
       *
       * Property-based preservation: for all isOwner=true renders where
       * receivingAddress.toLowerCase() !== connectedAddress.toLowerCase(),
       * the "Set to connected wallet" button must be present.
       *
       * Covers both null receivingAddress and non-matching address cases.
       */
      // Generate EVM addresses that differ from CONNECTED_WALLET (case-insensitive)
      const differentAddrArb = fc
        .stringMatching(/^[0-9a-f]{40}$/)
        .filter((hex) => `0x${hex}`.toLowerCase() !== CONNECTED_WALLET.toLowerCase())
        .map((hex) => `0x${hex}` as `0x${string}`);

      // Also include null as a valid receivingAddress (not set)
      const receivingAddrArb = fc.oneof(
        fc.constant(null),
        differentAddrArb
      );

      const { ReceivingAddressPanel } = await import("./ReceivingAddressPanel");

      await fc.assert(
        fc.asyncProperty(receivingAddrArb, async (receivingAddr) => {
          vi.clearAllMocks();

          (useReceivingAddress as ReturnType<typeof vi.fn>).mockReturnValue(
            makeReceivingAddressHook(receivingAddr)
          );

          const { unmount } = render(
            <ReceivingAddressPanel node={TEST_NODE} isOwner={true} />
          );

          const button = screen.queryByRole("button", { name: /Set to connected wallet/i });
          unmount();
          return button !== null;
        }),
        { numRuns: 25 }
      );
    }
  );
});
