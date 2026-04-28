/**
 * ResolvePage Tests — updated for arcns-primary-name-receiving-address refactor.
 *
 * The Resolve page no longer shows a "Set to connected wallet" CTA.
 * Instead, when the owner views a name with no addr set, they see:
 *   "Set this name as your Primary Name to activate it for receiving transfers."
 *   + a link to My Domains.
 *
 * Non-owners see "No receiving address set" only (read-only, no guidance).
 *
 * Validates: Requirements 5.1, 5.2, 5.3, 5.4
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

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: any) =>
    React.createElement("a", { href, ...props }, children),
}));

import { useReadContract } from "wagmi";

// ─── Bug 2 — Resolve page state conflation ────────────────────────────────────
//
// Unregistered names (expiryTs === 0n) must show "Name not registered", not
// "No receiving address set". This behavior is unchanged by the refactor.

describe("Bug 2 — Resolve page state conflation: unregistered name shows wrong message", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it(
    "should show 'Name not registered' and hide owner guidance when expiryTs=0n",
    async () => {
      (useReadContract as ReturnType<typeof vi.fn>).mockImplementation((args: any) => {
        if (args?.functionName === "nameExpires") {
          return { data: 0n, isLoading: false };
        }
        if (args?.functionName === "owner") {
          return { data: CONNECTED_WALLET, isLoading: false };
        }
        return { data: undefined, isLoading: false };
      });

      const { publicClient } = await import("../../lib/publicClient");
      (publicClient.readContract as ReturnType<typeof vi.fn>).mockResolvedValue(ZERO_ADDRESS);

      const { default: ResolvePage } = await import("./page");

      render(<ResolvePage />);

      const input = screen.getByPlaceholderText(/alice\.arc/i);
      const button = screen.getByRole("button", { name: /resolve/i });

      const { fireEvent } = await import("@testing-library/react");
      fireEvent.change(input, { target: { value: "notexist.arc" } });
      fireEvent.click(button);

      await waitFor(() => {
        const notRegisteredMsg = screen.queryByText(/Name not registered/i);
        expect(notRegisteredMsg).not.toBeNull();
      }, { timeout: 500 });

      // No write CTA should appear
      const ownerCTA = screen.queryByRole("button", { name: /Set to connected wallet/i });
      expect(ownerCTA).toBeNull();
    }
  );
});

// ─── Preservation Property Tests — updated for new product model ──────────────
//
// New model:
//   - expiryTs > 0n, addr = nonZeroAddr → resolved address displayed, no CTA
//   - expiryTs > 0n, addr = ZERO_ADDRESS, isOwner = true  → "No receiving address set"
//     + Primary Name guidance message + My Domains link (NO write button)
//   - expiryTs > 0n, addr = ZERO_ADDRESS, isOwner = false → "No receiving address set" only
//
// Validates: Requirements 5.1, 5.2, 5.3, 5.4

import * as fc from "fast-check";
import { cleanup, fireEvent } from "@testing-library/react";

const positiveBigintArb = fc.bigInt({ min: 1n, max: 4102444800n });

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
    "should display resolved address and no CTA when expiryTs > 0n and addr is non-zero (Req 5.1)",
    async () => {
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

      // No write CTA in new model
      const ownerCTA = screen.queryByRole("button", { name: /Set to connected wallet/i });
      expect(ownerCTA).toBeNull();

      unmount();
    }
  );

  it(
    "should show 'No receiving address set' and Primary Name guidance when expiryTs > 0n, addr=ZERO, isOwner=true (Req 5.1)",
    async () => {
      /**
       * New model: owner sees guidance to set Primary Name, not a write button.
       * Validates: Requirement 5.1
       */
      const { unmount } = await renderAndResolve({
        expiryTs: 1893456000n,
        resolvedAddr: ZERO_ADDRESS,
        isOwner: true,
      });

      await waitFor(() => {
        expect(screen.queryByText(/No receiving address set/i)).not.toBeNull();
      }, { timeout: 1000 });

      // New model: guidance message shown, no write button
      const guidance = screen.queryByText(/Set this name as your Primary Name/i);
      expect(guidance).not.toBeNull();

      const myDomainsLink = screen.queryByText(/Go to My Domains/i);
      expect(myDomainsLink).not.toBeNull();

      // No write button
      const writeBtn = screen.queryByRole("button", { name: /Set to connected wallet/i });
      expect(writeBtn).toBeNull();

      unmount();
    }
  );

  it(
    "should show 'No receiving address set' and NO guidance when expiryTs > 0n, addr=ZERO, isOwner=false (Req 5.2)",
    async () => {
      /**
       * Non-owner sees read-only message only. No guidance, no write surface.
       * Validates: Requirement 5.2
       */
      const { unmount } = await renderAndResolve({
        expiryTs: 1893456000n,
        resolvedAddr: ZERO_ADDRESS,
        isOwner: false,
      });

      await waitFor(() => {
        expect(screen.queryByText(/No receiving address set/i)).not.toBeNull();
      }, { timeout: 1000 });

      // No guidance for non-owner
      expect(screen.queryByText(/Set this name as your Primary Name/i)).toBeNull();
      expect(screen.queryByRole("button", { name: /Set to connected wallet/i })).toBeNull();

      unmount();
    }
  );

  it(
    "property: for all expiryTs > 0n with ZERO addr and isOwner=true, 'No receiving address set' + guidance shown, no write button (Req 5.1, 5.3)",
    async () => {
      /**
       * Property: for all positive expiryTs values with zero addr and owner=true,
       * "No receiving address set" and Primary Name guidance must be shown.
       * No write button must appear.
       * Validates: Requirements 5.1, 5.3
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
          let guidanceShown = false;

          await waitFor(() => {
            noAddrShown = screen.queryByText(/No receiving address set/i) !== null;
            guidanceShown = screen.queryByText(/Set this name as your Primary Name/i) !== null;
            if (!noAddrShown || !guidanceShown) throw new Error("not yet");
          }, { timeout: 1000 }).catch(() => {});

          const noWriteBtn =
            screen.queryByRole("button", { name: /Set to connected wallet/i }) === null;

          unmount();
          cleanup();
          return noAddrShown && guidanceShown && noWriteBtn;
        }),
        { numRuns: 10 }
      );
    }
  );

  it(
    "property: for all expiryTs > 0n with ZERO addr and isOwner=false, 'No receiving address set' shown, no CTA (Req 5.2, 5.4)",
    async () => {
      /**
       * Property: for all positive expiryTs values with zero addr and owner=false,
       * "No receiving address set" shown and no write CTA or guidance.
       * Validates: Requirements 5.2, 5.4
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
          const guidanceAbsent =
            screen.queryByText(/Set this name as your Primary Name/i) === null;

          unmount();
          cleanup();
          return noAddrShown && ctaAbsent && guidanceAbsent;
        }),
        { numRuns: 10 }
      );
    }
  );
});
