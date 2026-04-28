/**
 * registrationPrimaryClearing.test.ts
 *
 * Tests for the registration-time previous-primary-name clearing fix.
 *
 * Bug: When a wallet with an existing Primary Name registers a new name with
 * "Set as primary name" checked, the previous primary name's addr was not cleared.
 *
 * Fix: clearPrevPrimaryAddr() is now called after registration succeeds with
 * reverseRecord=true, using the same owner-guarded logic as usePrimaryName.
 *
 * Feature: arcns-primary-name-receiving-address (registration-time clearing gap)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { clearPrevPrimaryAddr } from "../lib/clearPrevPrimaryAddr";

// ─── Mocks ────────────────────────────────────────────────────────────────────

const CONNECTED_WALLET = "0xABCDEF1234567890ABCDef1234567890abcdef12" as `0x${string}`;
const OTHER_WALLET     = "0x1111111111111111111111111111111111111111" as `0x${string}`;
const ZERO_ADDRESS     = "0x0000000000000000000000000000000000000000";

// Mock publicClient
vi.mock("../lib/publicClient", () => ({
  publicClient: {
    readContract: vi.fn(),
    waitForTransactionReceipt: vi.fn().mockResolvedValue({}),
  },
}));

import { publicClient } from "../lib/publicClient";

// ─── clearPrevPrimaryAddr unit tests ─────────────────────────────────────────

describe("clearPrevPrimaryAddr — registration-time clearing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls setAddr(oldNode, ZERO_ADDRESS) when wallet is still Registry owner of old node", async () => {
    const writeContractAsync = vi.fn().mockResolvedValue("0xdeadbeef" as `0x${string}`);

    (publicClient.readContract as ReturnType<typeof vi.fn>).mockResolvedValue(CONNECTED_WALLET);

    await clearPrevPrimaryAddr("alice.arc", "bob.arc", CONNECTED_WALLET, writeContractAsync);

    expect(writeContractAsync).toHaveBeenCalledOnce();
    const callArgs = writeContractAsync.mock.calls[0][0];
    expect(callArgs.functionName).toBe("setAddr");
    expect(callArgs.args[1]).toBe(ZERO_ADDRESS);
  });

  it("does NOT call setAddr when wallet is no longer Registry owner of old node", async () => {
    const writeContractAsync = vi.fn();

    // Registry.owner returns a different wallet
    (publicClient.readContract as ReturnType<typeof vi.fn>).mockResolvedValue(OTHER_WALLET);

    await clearPrevPrimaryAddr("alice.arc", "bob.arc", CONNECTED_WALLET, writeContractAsync);

    expect(writeContractAsync).not.toHaveBeenCalled();
  });

  it("does NOT call setAddr when prevPrimary equals newFullName (no-op guard)", async () => {
    const writeContractAsync = vi.fn();

    await clearPrevPrimaryAddr("alice.arc", "alice.arc", CONNECTED_WALLET, writeContractAsync);

    expect(writeContractAsync).not.toHaveBeenCalled();
    expect(publicClient.readContract).not.toHaveBeenCalled();
  });

  it("does NOT call setAddr when prevPrimary is empty string", async () => {
    const writeContractAsync = vi.fn();

    await clearPrevPrimaryAddr("", "bob.arc", CONNECTED_WALLET, writeContractAsync);

    expect(writeContractAsync).not.toHaveBeenCalled();
  });

  it("swallows errors non-fatally — does not throw when writeContractAsync fails", async () => {
    const writeContractAsync = vi.fn().mockRejectedValue(new Error("tx reverted"));

    (publicClient.readContract as ReturnType<typeof vi.fn>).mockResolvedValue(CONNECTED_WALLET);

    // Must not throw
    await expect(
      clearPrevPrimaryAddr("alice.arc", "bob.arc", CONNECTED_WALLET, writeContractAsync)
    ).resolves.toBeUndefined();
  });

  it("swallows errors non-fatally — does not throw when readContract (owner check) fails", async () => {
    const writeContractAsync = vi.fn();

    (publicClient.readContract as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("rpc error"));

    // Must not throw
    await expect(
      clearPrevPrimaryAddr("alice.arc", "bob.arc", CONNECTED_WALLET, writeContractAsync)
    ).resolves.toBeUndefined();

    expect(writeContractAsync).not.toHaveBeenCalled();
  });

  it("waits for transaction receipt after successful setAddr call", async () => {
    const clearTxHash = "0xcleartx" as `0x${string}`;
    const writeContractAsync = vi.fn().mockResolvedValue(clearTxHash);

    (publicClient.readContract as ReturnType<typeof vi.fn>).mockResolvedValue(CONNECTED_WALLET);

    await clearPrevPrimaryAddr("alice.arc", "bob.arc", CONNECTED_WALLET, writeContractAsync);

    expect(publicClient.waitForTransactionReceipt).toHaveBeenCalledWith({ hash: clearTxHash });
  });
});

// ─── Registration-time clearing integration scenario ─────────────────────────

describe("Registration-time primary switching — clearing scenario", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("scenario: existing primary 'alice.arc', register 'bob.arc' with primary checked → alice.arc addr cleared", async () => {
    /**
     * Simulates the full registration-time clearing scenario:
     * 1. Wallet has existing primary: alice.arc
     * 2. User registers bob.arc with "Set as primary name" checked
     * 3. After registration, clearPrevPrimaryAddr is called with prevPrimary=alice.arc
     * 4. alice.arc addr is cleared (wallet still owns it)
     */
    const writeContractAsync = vi.fn().mockResolvedValue("0xdeadbeef" as `0x${string}`);

    // Registry.owner(alice.arc node) returns connected wallet
    (publicClient.readContract as ReturnType<typeof vi.fn>).mockResolvedValue(CONNECTED_WALLET);

    await clearPrevPrimaryAddr("alice.arc", "bob.arc", CONNECTED_WALLET, writeContractAsync);

    // setAddr(alice.arc node, ZERO_ADDRESS) must have been called
    expect(writeContractAsync).toHaveBeenCalledOnce();
    const callArgs = writeContractAsync.mock.calls[0][0];
    expect(callArgs.functionName).toBe("setAddr");
    expect(callArgs.args[1]).toBe(ZERO_ADDRESS);
  });

  it("scenario: register 'bob.arc' WITHOUT primary checked → no clearing attempted", async () => {
    /**
     * When reverseRecord=false, prevPrimaryAtRegRef is set to null in DomainCard.
     * clearPrevPrimaryAddr is never called. This test verifies the utility
     * correctly handles a null/empty prevPrimary.
     */
    const writeContractAsync = vi.fn();

    // Simulate: prevPrimary is null (reverseRecord=false path)
    // clearPrevPrimaryAddr is not called at all in this path — but if it were
    // called with empty string, it should be a no-op.
    await clearPrevPrimaryAddr("", "bob.arc", CONNECTED_WALLET, writeContractAsync);

    expect(writeContractAsync).not.toHaveBeenCalled();
    expect(publicClient.readContract).not.toHaveBeenCalled();
  });

  it("scenario: no previous primary (first registration with primary checked) → no clearing attempted", async () => {
    /**
     * When currentPrimaryName is null (no previous primary), prevPrimaryAtRegRef
     * is set to null. clearPrevPrimaryAddr is not called.
     * Verifies the utility handles empty prevPrimary correctly.
     */
    const writeContractAsync = vi.fn();

    await clearPrevPrimaryAddr("", "alice.arc", CONNECTED_WALLET, writeContractAsync);

    expect(writeContractAsync).not.toHaveBeenCalled();
  });
});
