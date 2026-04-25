/**
 * abis.ts — v3 ABI exports only.
 *
 * Imports directly from Hardhat artifacts under contracts/v3/.
 * No addresses. No business logic. No v1/v2 artifacts.
 *
 * These are the exact ABIs produced by the Solidity compiler for the v3
 * contract system. Any mismatch between these and deployed bytecode is a
 * deployment issue, not a frontend issue.
 */

import ControllerArtifact      from "../../../artifacts/contracts/v3/controller/ArcNSController.sol/ArcNSController.json";
import RegistrarArtifact        from "../../../artifacts/contracts/v3/registrar/ArcNSBaseRegistrar.sol/ArcNSBaseRegistrar.json";
import PriceOracleArtifact      from "../../../artifacts/contracts/v3/registrar/ArcNSPriceOracle.sol/ArcNSPriceOracle.json";
import ResolverArtifact         from "../../../artifacts/contracts/v3/resolver/ArcNSResolver.sol/ArcNSResolver.json";
import ReverseRegistrarArtifact from "../../../artifacts/contracts/v3/registrar/ArcNSReverseRegistrar.sol/ArcNSReverseRegistrar.json";
import RegistryArtifact         from "../../../artifacts/contracts/v3/registry/ArcNSRegistry.sol/ArcNSRegistry.json";

export const CONTROLLER_ABI       = ControllerArtifact.abi       as readonly unknown[];
export const REGISTRAR_ABI        = RegistrarArtifact.abi        as readonly unknown[];
export const PRICE_ORACLE_ABI     = PriceOracleArtifact.abi      as readonly unknown[];
export const RESOLVER_ABI         = ResolverArtifact.abi         as readonly unknown[];
export const REVERSE_REGISTRAR_ABI = ReverseRegistrarArtifact.abi as readonly unknown[];
export const REGISTRY_ABI         = RegistryArtifact.abi         as readonly unknown[];

// ─── ERC-20 ABI (USDC — standard interface, no artifact needed) ──────────────

export const ERC20_ABI = [
  {
    type: "function", name: "balanceOf", stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function", name: "allowance", stateMutability: "view",
    inputs: [{ name: "owner", type: "address" }, { name: "spender", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function", name: "approve", stateMutability: "nonpayable",
    inputs: [{ name: "spender", type: "address" }, { name: "amount", type: "uint256" }],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function", name: "decimals", stateMutability: "view",
    inputs: [], outputs: [{ name: "", type: "uint8" }],
  },
  {
    type: "function", name: "symbol", stateMutability: "view",
    inputs: [], outputs: [{ name: "", type: "string" }],
  },
] as const;
