/**
 * explorerAdapter.ts — Blockscout / explorer compatibility layer
 *
 * Provides ArcNS resolution for block explorers that support
 * the name service metadata API format.
 *
 * Endpoints consumed by Blockscout:
 *   GET /api/resolve/name/:name     → { address }
 *   GET /api/resolve/address/:addr  → { name }
 */

import { resolveName, resolveAddress } from "./graphql";

export interface ExplorerNameResult {
  /** Resolved EVM address for the given name, or null */
  address: string | null;
  /** Source of truth used */
  source: "subgraph" | "rpc" | null;
}

export interface ExplorerAddressResult {
  /** Primary name for the given address, or null */
  name: string | null;
  /** Source of truth used */
  source: "subgraph" | "rpc" | null;
}

/**
 * Resolve a domain name to an EVM address.
 * Used by explorer "name → address" lookups.
 */
export async function explorerResolveName(name: string): Promise<ExplorerNameResult> {
  const result = await resolveName(name);
  return { address: result.address, source: result.source };
}

/**
 * Resolve an EVM address to its primary domain name.
 * Used by explorer "address → name" lookups (reverse resolution).
 */
export async function explorerResolveAddress(address: string): Promise<ExplorerAddressResult> {
  const result = await resolveAddress(address);
  return { name: result.name, source: result.source };
}
