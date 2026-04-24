/// ArcNS — Contract addresses and ABIs
/// ABIs are imported directly from Hardhat artifacts — single source of truth.
/// NO manual ABI definitions. NO parseAbi. NO inline overrides.

// ─── Addresses ────────────────────────────────────────────────────────────────

export const CONTRACTS = {
  registry:         (process.env.NEXT_PUBLIC_REGISTRY_ADDRESS          ?? "0x3731b7c9F1830aD2880020DfcB0A4714E7fc252a") as `0x${string}`,
  arcRegistrar:     (process.env.NEXT_PUBLIC_ARC_REGISTRAR_ADDRESS     ?? "0xb156d9726661E92C541e3a267ee8710Fdcd24969") as `0x${string}`,
  circleRegistrar:  (process.env.NEXT_PUBLIC_CIRCLE_REGISTRAR_ADDRESS  ?? "0xBdfF2790Dd72E86C3510Cc8374EaC5E2E0659c5e") as `0x${string}`,
  arcController:    (process.env.NEXT_PUBLIC_ARC_CONTROLLER_ADDRESS    ?? "0x1bd377A2762510c00dd0ec2142E42829e7053C80") as `0x${string}`,
  circleController: (process.env.NEXT_PUBLIC_CIRCLE_CONTROLLER_ADDRESS ?? "0xfBFE553633AB91b6B32A0E6296341000Bf03DB95") as `0x${string}`,
  resolver:         (process.env.NEXT_PUBLIC_RESOLVER_ADDRESS           ?? "0xE62De42eAcb270D2f2465c017C30bbf24F3f9350") as `0x${string}`,
  reverseRegistrar: (process.env.NEXT_PUBLIC_REVERSE_REGISTRAR_ADDRESS  ?? "0x97DEf95ADE4b67cD877725282d872d1eD2b4D489") as `0x${string}`,
  usdc:             (process.env.NEXT_PUBLIC_USDC_ADDRESS               ?? "0x3600000000000000000000000000000000000000") as `0x${string}`,
  priceOracle:      (process.env.NEXT_PUBLIC_PRICE_ORACLE_ADDRESS       ?? "0x18EE0175504e033D72486235F8A2552038EF4ce6") as `0x${string}`,
  treasury:         (process.env.NEXT_PUBLIC_TREASURY_ADDRESS           ?? "0xbbDF5bC7D63B1b7223556d4899905d56589A682d") as `0x${string}`,
} as const;

// ─── ABIs — imported from Hardhat artifacts ───────────────────────────────────
// These are the exact ABIs produced by the Solidity compiler.
// Any mismatch between these and the deployed bytecode is a deployment issue,
// not a frontend issue.

import ControllerArtifact  from "../../../artifacts/contracts/proxy/ArcNSRegistrarControllerV2.sol/ArcNSRegistrarControllerV2.json";
import RegistrarArtifact   from "../../../artifacts/contracts/registrar/ArcNSBaseRegistrar.sol/ArcNSBaseRegistrar.json";
import ResolverArtifact    from "../../../artifacts/contracts/resolver/ArcNSResolverV2.sol/ArcNSResolverV2.json";

export const CONTROLLER_ABI  = ControllerArtifact.abi  as readonly any[];
export const REGISTRAR_ABI   = RegistrarArtifact.abi   as readonly any[];
export const RESOLVER_ABI    = ResolverArtifact.abi    as readonly any[];

// ─── ERC-20 ABI (USDC — standard interface, no artifact needed) ──────────────

export const ERC20_ABI = [
  { type: "function", name: "balanceOf", stateMutability: "view",
    inputs: [{ name: "account", type: "address" }], outputs: [{ name: "", type: "uint256" }] },
  { type: "function", name: "allowance", stateMutability: "view",
    inputs: [{ name: "owner", type: "address" }, { name: "spender", type: "address" }],
    outputs: [{ name: "", type: "uint256" }] },
  { type: "function", name: "approve", stateMutability: "nonpayable",
    inputs: [{ name: "spender", type: "address" }, { name: "amount", type: "uint256" }],
    outputs: [{ name: "", type: "bool" }] },
  { type: "function", name: "decimals", stateMutability: "view",
    inputs: [], outputs: [{ name: "", type: "uint8" }] },
  { type: "function", name: "symbol", stateMutability: "view",
    inputs: [], outputs: [{ name: "", type: "string" }] },
] as const;

// ─── Reverse Registrar ABI (minimal — only setName is used) ──────────────────

export const REVERSE_REGISTRAR_ABI = [
  { type: "function", name: "setName", stateMutability: "nonpayable",
    inputs: [{ name: "name", type: "string" }], outputs: [{ name: "", type: "bytes32" }] },
] as const;

// ─── Pricing tiers ────────────────────────────────────────────────────────────

export const PRICE_TIERS = [
  { chars: 1, label: "1 character",   annualUSDC:  50_000_000n },
  { chars: 2, label: "2 characters",  annualUSDC:  25_000_000n },
  { chars: 3, label: "3 characters",  annualUSDC:  15_000_000n },
  { chars: 4, label: "4 characters",  annualUSDC:  10_000_000n },
  { chars: 5, label: "5+ characters", annualUSDC:   2_000_000n },
];

export interface PriceTier { chars: number; label: string; annualUSDC: bigint; }

export function getPriceTier(label: string): PriceTier {
  const len = [...label].length;
  if (len === 1) return PRICE_TIERS[0];
  if (len === 2) return PRICE_TIERS[1];
  if (len === 3) return PRICE_TIERS[2];
  if (len === 4) return PRICE_TIERS[3];
  return PRICE_TIERS[4];
}

export function safeBigInt(value: unknown): bigint {
  try {
    if (value === undefined || value === null || value === "") return 0n;
    return BigInt(value as string | number | bigint);
  } catch { return 0n; }
}
