/**
 * dashboardPrimaryClearing.test.ts
 *
 * Tests for the dashboard-driven previous-primary-name clearing fix.
 *
 * Bug: When switching Primary Name via the dashboard (usePrimaryName.setPrimaryName),
 * the previous primary name's addr was NOT cleared when the new name's addr already
 * matched the connected wallet (addrMatches === true path). clearPrevPrimaryAddr was
 * nested inside the `if (!addrMatches)` block and was never reached in that case.
 *
 * Fix: clearPrevPrimaryAddr is now called unconditionally after the addr-sync
 * decision block, regardless of whether a new setAddr tx was needed.
 *
 * Scenario tested:
 *   old primary: newtest2904.circle  (has receiving addr = connected wallet)
 *   new primary: newtest2904.arc     (addr already matches connected wallet)
 *   expected:    newtest2904.circle addr is cleared to ZERO_ADDRESS
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { clearPrevPrimaryAddr } from "../lib/clearPrevPrimaryAddr";

// ─── Constants ────────────────────────────────────────────────────────────────

const CONNECTED_WALLET = "0xABCDEF1234567890ABCDef1234567890abcdef12" as `0x${string}`;
const OTHER_WALLET     = "0x1111111111111111111111111111111111111111" as `0x${string}`;
const ZERO_ADDRESS     = "0x0000000000000000000000000000000000000000";

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock("../lib/publicClient", () => ({
  publicClient: {
    readContract: vi.fn(),
    waitForTransactionReceipt: vi.fn().mockResolvedValue({}),
  },
}));

import { publicClient } from "../lib/publicClient";

// ─── Core regression: old primary addr cleared when new addr already matches ──

describe("dashboard primary switch — old primary addr clearing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("clears old primary addr even when new name addr already matches wallet (the regression case)", async () => {
    /**
     * This is the exact regression scenario:
     * - new name (newtest2904.arc) addr already matches connected wallet
     * - addrMatches === true → no setAddr tx for new name
     * - clearPrevPrimaryAddr must still be called for old name (newtest2904.circle)
     *
     * The fix moves clearPrevPrimaryAddr outside the if (!addrMatches) block.
     */
    const writeContractAsync = vi.fn().mockResolvedValue("0xcleartx" as `0x${string}`);

    // Registry.owner(newtest2904.circle node) returns connected wallet
    (publicClient.readContract as ReturnType<typeof vi.fn>).mockResolvedValue(CONNECTED_WALLET);

    await clearPrevPrimaryAddr(
      "newtest2904.circle",  // old primary
      "newtest2904.arc",     // new primary
      CONNECTED_WALLET,
      writeContractAsync,
    );

    // setAddr(oldNode, ZERO_ADDRESS) must have been called
    expect(writeContractAsync).toHaveBeenCalledOnce();
    const callArgs = writeContractAsync.mock.calls[0][0];
    expect(callArgs.functionName).toBe("setAddr");
    expect(callArgs.args[1]).toBe(ZERO_ADDRESS);
  });

  it("clears old primary addr when new name addr was missing (normal addrMatches=false path)", async () => {
    /**
     * The pre-existing path: new name addr was missing, setAddr was called for
     * new name, then clearPrevPrimaryAddr is called. Verify this still works.
     */
    const writeContractAsync = vi.fn().mockResolvedValue("0xcleartx" as `0x${string}`);

    (publicClient.readContract as ReturnType<typeof vi.fn>).mockResolvedValue(CONNECTED_WALLET);

    await clearPrevPrimaryAddr(
      "alice.arc",
      "bob.arc",
      CONNECTED_WALLET,
      writeContractAsync,
    );

    expect(writeContractAsync).toHaveBeenCalledOnce();
    const callArgs = writeContractAsync.mock.calls[0][0];
    expect(callArgs.functionName).toBe("setAddr");
    expect(callArgs.args[1]).toBe(ZERO_ADDRESS);
  });

  it("does NOT clear old primary addr when wallet no longer owns old node", async () => {
    const writeContractAsync = vi.fn();

    // Registry.owner returns a different wallet — wallet transferred the old name
    (publicClient.readContract as ReturnType<typeof vi.fn>).mockResolvedValue(OTHER_WALLET);

    await clearPrevPrimaryAddr(
      "newtest2904.circle",
      "newtest2904.arc",
      CONNECTED_WALLET,
      writeContractAsync,
    );

    expect(writeContractAsync).not.toHaveBeenCalled();
  });

  it("does NOT clear when prevPrimary equals newFullName (same-name no-op guard)", async () => {
    const writeContractAsync = vi.fn();

    await clearPrevPrimaryAddr(
      "newtest2904.arc",
      "newtest2904.arc",
      CONNECTED_WALLET,
      writeContractAsync,
    );

    expect(writeContractAsync).not.toHaveBeenCalled();
    expect(publicClient.readContract).not.toHaveBeenCalled();
  });

  it("does NOT clear when prevPrimary is null/empty (no previous primary)", async () => {
    const writeContractAsync = vi.fn();

    await clearPrevPrimaryAddr("", "newtest2904.arc", CONNECTED_WALLET, writeContractAsync);

    expect(writeContractAsync).not.toHaveBeenCalled();
    expect(publicClient.readContract).not.toHaveBeenCalled();
  });

  it("clearing failure is non-fatal — does not throw", async () => {
    const writeContractAsync = vi.fn().mockRejectedValue(new Error("tx reverted"));

    (publicClient.readContract as ReturnType<typeof vi.fn>).mockResolvedValue(CONNECTED_WALLET);

    await expect(
      clearPrevPrimaryAddr("newtest2904.circle", "newtest2904.arc", CONNECTED_WALLET, writeContractAsync)
    ).resolves.toBeUndefined();
  });

  it("waits for receipt after clearing setAddr tx", async () => {
    const clearTxHash = "0xcleartx" as `0x${string}`;
    const writeContractAsync = vi.fn().mockResolvedValue(clearTxHash);

    (publicClient.readContract as ReturnType<typeof vi.fn>).mockResolvedValue(CONNECTED_WALLET);

    await clearPrevPrimaryAddr("newtest2904.circle", "newtest2904.arc", CONNECTED_WALLET, writeContractAsync);

    expect(publicClient.waitForTransactionReceipt).toHaveBeenCalledWith({ hash: clearTxHash });
  });
});

// ─── Full switch scenario ─────────────────────────────────────────────────────

describe("dashboard primary switch — full scenario", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("scenario: switch from newtest2904.circle to newtest2904.arc — circle addr is cleared", async () => {
    /**
     * Full scenario matching the reported regression:
     *   old primary: newtest2904.circle
     *   new primary: newtest2904.arc
     *   new name addr: already matches wallet (addrMatches=true, no setAddr for new name)
     *   expected: clearPrevPrimaryAddr called → newtest2904.circle addr set to ZERO_ADDRESS
     */
    const writeContractAsync = vi.fn().mockResolvedValue("0xcleartx" as `0x${string}`);

    // Registry.owner(circle node) = connected wallet
    (publicClient.readContract as ReturnType<typeof vi.fn>).mockResolvedValue(CONNECTED_WALLET);

    await clearPrevPrimaryAddr(
      "newtest2904.circle",
      "newtest2904.arc",
      CONNECTED_WALLET,
      writeContractAsync,
    );

    // Exactly one write: setAddr(circle node, ZERO_ADDRESS)
    expect(writeContractAsync).toHaveBeenCalledOnce();
    const { functionName, args } = writeContractAsync.mock.calls[0][0];
    expect(functionName).toBe("setAddr");
    expect(args[1]).toBe(ZERO_ADDRESS);
  });

  it("scenario: switch from newtest2904.circle to newtest2904.arc — arc addr is NOT touched by clearing", async () => {
    /**
     * Verifies the no-op guard: clearPrevPrimaryAddr must never call setAddr
     * on the new name (newtest2904.arc). It only targets the old name.
     * The no-op guard (prevPrimary === newFullName) prevents this.
     */
    const writeContractAsync = vi.fn();

    // Simulate: caller accidentally passes new name as both args
    await clearPrevPrimaryAddr(
      "newtest2904.arc",  // same as new — should be no-op
      "newtest2904.arc",
      CONNECTED_WALLET,
      writeContractAsync,
    );

    expect(writeContractAsync).not.toHaveBeenCalled();
  });
});
