/**
 * clearPrevPrimaryAddr.ts — shared utility for clearing the previous primary
 * name's receiving address when a new primary name is set.
 *
 * Used by:
 *   - usePrimaryName.ts (dashboard-driven primary name update)
 *   - DomainCard.tsx (registration-time primary name switching)
 *
 * Behavior:
 *   - Best-effort, non-fatal: any failure is caught and silently ignored.
 *   - Owner-guarded: only attempts the clear if the connected wallet is still
 *     the Registry owner of the old node. If not, skips silently.
 *   - Truthfulness: callers must not imply the old name was deactivated if
 *     this function was not called or if it failed.
 */

import { publicClient } from "./publicClient";
import { RESOLVER_CONTRACT, REGISTRY_CONTRACT } from "./contracts";
import { namehash } from "./namehash";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as `0x${string}`;

/**
 * Attempts to clear the addr record of the previous primary name.
 *
 * @param prevPrimary   - The full name (e.g. "alice.arc") of the previous primary name.
 * @param newFullName   - The full name of the newly set primary name (used to guard against no-op).
 * @param connectedAddr - The connected wallet address.
 * @param writeContractAsync - The wagmi writeContractAsync function from the calling hook/component.
 */
export async function clearPrevPrimaryAddr(
  prevPrimary: string,
  newFullName: string,
  connectedAddr: `0x${string}`,
  writeContractAsync: (args: any) => Promise<`0x${string}`>,
): Promise<void> {
  // Guard: no-op if prev and new are the same name
  if (!prevPrimary || prevPrimary === newFullName) return;

  try {
    const oldNode = namehash(prevPrimary) as `0x${string}`;

    // Check Registry ownership before attempting the clear
    const oldOwner = await publicClient.readContract({
      ...REGISTRY_CONTRACT,
      functionName: "owner",
      args: [oldNode],
    }) as string;

    if (oldOwner.toLowerCase() !== connectedAddr.toLowerCase()) {
      // Wallet is no longer the Registry owner of the old node — skip silently.
      // Do not imply the old name was deactivated.
      return;
    }

    // Wallet still owns the old node — clear its addr record
    const clearTxHash = await writeContractAsync({
      ...RESOLVER_CONTRACT,
      functionName: "setAddr",
      args: [oldNode, ZERO_ADDRESS],
    });
    await publicClient.waitForTransactionReceipt({ hash: clearTxHash });
  } catch {
    // Non-fatal — clearing failed, skip silently.
    // The UI copy must not imply the old name was deactivated.
  }
}
