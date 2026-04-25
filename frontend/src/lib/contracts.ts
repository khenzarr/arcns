/**
 * contracts.ts — thin composition layer.
 *
 * Combines deployed addresses (from generated-contracts.ts) with
 * v3 ABIs (from abis.ts). No business logic lives here.
 *
 * Consumers import typed contract objects from this file.
 * Address constants are re-exported for convenience.
 */

export {
  ADDR_USDC,
  ADDR_REGISTRY,
  ADDR_RESOLVER,
  ADDR_PRICE_ORACLE,
  ADDR_ARC_REGISTRAR,
  ADDR_CIRCLE_REGISTRAR,
  ADDR_REVERSE_REGISTRAR,
  ADDR_TREASURY,
  ADDR_ARC_CONTROLLER,
  ADDR_CIRCLE_CONTROLLER,
  DEPLOYED_CHAIN_ID,
  DEPLOYED_NETWORK,
  DEPLOYED_VERSION,
  NAMEHASH_ARC,
  NAMEHASH_CIRCLE,
  NAMEHASH_ADDR_REVERSE,
} from "./generated-contracts";

export {
  CONTROLLER_ABI,
  REGISTRAR_ABI,
  PRICE_ORACLE_ABI,
  RESOLVER_ABI,
  REVERSE_REGISTRAR_ABI,
  REGISTRY_ABI,
  ERC20_ABI,
} from "./abis";

// ─── Typed contract descriptors ───────────────────────────────────────────────
// These are the objects passed directly to wagmi's useReadContract /
// useWriteContract / readContract / writeContract calls.

import {
  ADDR_ARC_CONTROLLER,
  ADDR_CIRCLE_CONTROLLER,
  ADDR_RESOLVER,
  ADDR_REVERSE_REGISTRAR,
  ADDR_USDC,
  ADDR_PRICE_ORACLE,
  ADDR_REGISTRY,
  ADDR_ARC_REGISTRAR,
  ADDR_CIRCLE_REGISTRAR,
} from "./generated-contracts";

import {
  CONTROLLER_ABI,
  RESOLVER_ABI,
  REVERSE_REGISTRAR_ABI,
  ERC20_ABI,
  PRICE_ORACLE_ABI,
  REGISTRY_ABI,
  REGISTRAR_ABI,
} from "./abis";

export const ARC_CONTROLLER = {
  address: ADDR_ARC_CONTROLLER,
  abi:     CONTROLLER_ABI,
} as const;

export const CIRCLE_CONTROLLER = {
  address: ADDR_CIRCLE_CONTROLLER,
  abi:     CONTROLLER_ABI,
} as const;

export const RESOLVER_CONTRACT = {
  address: ADDR_RESOLVER,
  abi:     RESOLVER_ABI,
} as const;

export const REVERSE_REGISTRAR_CONTRACT = {
  address: ADDR_REVERSE_REGISTRAR,
  abi:     REVERSE_REGISTRAR_ABI,
} as const;

export const USDC_CONTRACT = {
  address: ADDR_USDC,
  abi:     ERC20_ABI,
} as const;

export const PRICE_ORACLE_CONTRACT = {
  address: ADDR_PRICE_ORACLE,
  abi:     PRICE_ORACLE_ABI,
} as const;

export const REGISTRY_CONTRACT = {
  address: ADDR_REGISTRY,
  abi:     REGISTRY_ABI,
} as const;

export const ARC_REGISTRAR_CONTRACT = {
  address: ADDR_ARC_REGISTRAR,
  abi:     REGISTRAR_ABI,
} as const;

export const CIRCLE_REGISTRAR_CONTRACT = {
  address: ADDR_CIRCLE_REGISTRAR,
  abi:     REGISTRAR_ABI,
} as const;

/** Returns the controller descriptor for a given TLD. */
export function controllerFor(tld: "arc" | "circle") {
  return tld === "arc" ? ARC_CONTROLLER : CIRCLE_CONTROLLER;
}

/** Returns the registrar descriptor for a given TLD. */
export function registrarFor(tld: "arc" | "circle") {
  return tld === "arc" ? ARC_REGISTRAR_CONTRACT : CIRCLE_REGISTRAR_CONTRACT;
}
