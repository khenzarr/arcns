/**
 * namehash.ts — low-level ArcNS hashing helpers only.
 *
 * Responsibilities:
 *   - labelHash(label): keccak256 of a UTF-8 label string
 *   - namehash(name): recursive EIP-137 namehash
 *   - reverseNodeFor(addr): reverse resolution node for an EVM address
 *
 * No commitment logic. No normalization. No pricing.
 * See commitment.ts for commitment building.
 * See normalization.ts for label validation and pricing-length.
 */

import { keccak256, stringToBytes, concat } from "viem";
import { NAMEHASH_ADDR_REVERSE } from "./generated-contracts";

// ─── Core hashing ─────────────────────────────────────────────────────────────

/**
 * Returns keccak256(label) as a hex string.
 * Input must already be normalized (lowercase).
 */
export function labelHash(label: string): `0x${string}` {
  return keccak256(stringToBytes(label));
}

/**
 * ArcNS namehash — implements EIP-137 pattern.
 * Input must already be normalized (lowercase, trimmed).
 */
export function namehash(name: string): `0x${string}` {
  let node = "0x0000000000000000000000000000000000000000000000000000000000000000" as `0x${string}`;
  if (name === "") return node;

  for (const label of name.split(".").reverse()) {
    node = keccak256(concat([node, labelHash(label)]));
  }
  return node;
}

/**
 * Returns the ERC-721 token ID for a label (uint256 of labelHash).
 */
export function labelToTokenId(label: string): bigint {
  return BigInt(labelHash(label));
}

/**
 * Returns the reverse resolution node for an EVM address.
 * Mirrors ArcNSReverseRegistrar._sha3HexAddress logic:
 *   keccak256(ADDR_REVERSE_NODE || keccak256(lowercase_hex_address_without_0x))
 */
export function reverseNodeFor(addr: `0x${string}`): `0x${string}` {
  const hexAddr = addr.toLowerCase().slice(2); // 40 hex chars, no 0x
  const labelH  = keccak256(stringToBytes(hexAddr));
  return keccak256(concat([NAMEHASH_ADDR_REVERSE, labelH]));
}
