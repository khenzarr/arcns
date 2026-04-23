/// ArcNS — Contract addresses and ABIs
/// All addresses match deployed contracts on Arc Testnet (Chain ID: 5042002)
/// RULE: NO parseAbi. All ABIs are plain JSON objects for viem compatibility.

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

// ─── Controller ABI ───────────────────────────────────────────────────────────
// Single makeCommitment overload (7 params). Contract uses msg.sender internally.
// publicClient.readContract with account:address ensures msg.sender == wallet.

export const CONTROLLER_ABI = [
  {
    type: "function",
    name: "available",
    stateMutability: "view",
    inputs:  [{ name: "name", type: "string" }],
    outputs: [{ name: "",     type: "bool"   }],
  },
  {
    type: "function",
    name: "rentPrice",
    stateMutability: "view",
    inputs: [
      { name: "name",     type: "string"  },
      { name: "duration", type: "uint256" },
    ],
    outputs: [
      { name: "base",    type: "uint256" },
      { name: "premium", type: "uint256" },
    ],
  },
  {
    type: "function",
    name: "makeCommitment",
    stateMutability: "view",
    inputs: [
      { name: "name",          type: "string"  },
      { name: "owner",         type: "address" },
      { name: "duration",      type: "uint256" },
      { name: "secret",        type: "bytes32" },
      { name: "resolver",      type: "address" },
      { name: "data",          type: "bytes[]" },
      { name: "reverseRecord", type: "bool"    },
    ],
    outputs: [{ name: "", type: "bytes32" }],
  },
  {
    type: "function",
    name: "commit",
    stateMutability: "nonpayable",
    inputs:  [{ name: "commitment", type: "bytes32" }],
    outputs: [],
  },
  {
    type: "function",
    name: "register",
    stateMutability: "nonpayable",
    inputs: [
      { name: "name",          type: "string"  },
      { name: "owner",         type: "address" },
      { name: "duration",      type: "uint256" },
      { name: "secret",        type: "bytes32" },
      { name: "resolver",      type: "address" },
      { name: "data",          type: "bytes[]" },
      { name: "reverseRecord", type: "bool"    },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "renew",
    stateMutability: "nonpayable",
    inputs: [
      { name: "name",     type: "string"  },
      { name: "duration", type: "uint256" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "commitments",
    stateMutability: "view",
    inputs:  [{ name: "", type: "bytes32" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "MIN_COMMITMENT_AGE",
    stateMutability: "view",
    inputs:  [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "MAX_COMMITMENT_AGE",
    stateMutability: "view",
    inputs:  [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "MIN_REGISTRATION_DURATION",
    stateMutability: "view",
    inputs:  [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "MAX_REGISTRATION_DURATION",
    stateMutability: "view",
    inputs:  [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "event",
    name: "NameRegistered",
    inputs: [
      { name: "name",    type: "string",  indexed: false },
      { name: "label",   type: "bytes32", indexed: true  },
      { name: "owner",   type: "address", indexed: true  },
      { name: "cost",    type: "uint256", indexed: false },
      { name: "expires", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "NameRenewed",
    inputs: [
      { name: "name",    type: "string",  indexed: false },
      { name: "label",   type: "bytes32", indexed: true  },
      { name: "cost",    type: "uint256", indexed: false },
      { name: "expires", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "CommitmentMade",
    inputs: [
      { name: "commitment", type: "bytes32", indexed: true },
    ],
  },
] as const;

// ─── Registry ABI ─────────────────────────────────────────────────────────────

export const REGISTRY_ABI = [
  {
    type: "function",
    name: "owner",
    stateMutability: "view",
    inputs:  [{ name: "node", type: "bytes32" }],
    outputs: [{ name: "",     type: "address" }],
  },
  {
    type: "function",
    name: "resolver",
    stateMutability: "view",
    inputs:  [{ name: "node", type: "bytes32" }],
    outputs: [{ name: "",     type: "address" }],
  },
  {
    type: "function",
    name: "setResolver",
    stateMutability: "nonpayable",
    inputs: [
      { name: "node",     type: "bytes32" },
      { name: "resolver", type: "address" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "setApprovalForAll",
    stateMutability: "nonpayable",
    inputs: [
      { name: "operator", type: "address" },
      { name: "approved", type: "bool"    },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "isApprovedForAll",
    stateMutability: "view",
    inputs: [
      { name: "owner",    type: "address" },
      { name: "operator", type: "address" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;

// ─── Registrar ABI ────────────────────────────────────────────────────────────

export const REGISTRAR_ABI = [
  {
    type: "function",
    name: "nameExpires",
    stateMutability: "view",
    inputs:  [{ name: "id", type: "uint256" }],
    outputs: [{ name: "",   type: "uint256" }],
  },
  {
    type: "function",
    name: "available",
    stateMutability: "view",
    inputs:  [{ name: "id", type: "uint256" }],
    outputs: [{ name: "",   type: "bool"    }],
  },
  {
    type: "function",
    name: "ownerOf",
    stateMutability: "view",
    inputs:  [{ name: "tokenId", type: "uint256" }],
    outputs: [{ name: "",        type: "address" }],
  },
  {
    type: "function",
    name: "tokenURI",
    stateMutability: "view",
    inputs:  [{ name: "tokenId", type: "uint256" }],
    outputs: [{ name: "",        type: "string"  }],
  },
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs:  [{ name: "owner", type: "address" }],
    outputs: [{ name: "",      type: "uint256" }],
  },
  {
    type: "function",
    name: "tld",
    stateMutability: "view",
    inputs:  [],
    outputs: [{ name: "", type: "string" }],
  },
] as const;

// ─── Resolver ABI ─────────────────────────────────────────────────────────────

export const RESOLVER_ABI = [
  {
    type: "function",
    name: "addr",
    stateMutability: "view",
    inputs:  [{ name: "node", type: "bytes32" }],
    outputs: [{ name: "",     type: "address" }],
  },
  {
    type: "function",
    name: "text",
    stateMutability: "view",
    inputs: [
      { name: "node", type: "bytes32" },
      { name: "key",  type: "string"  },
    ],
    outputs: [{ name: "", type: "string" }],
  },
  {
    type: "function",
    name: "name",
    stateMutability: "view",
    inputs:  [{ name: "node", type: "bytes32" }],
    outputs: [{ name: "",     type: "string"  }],
  },
  {
    type: "function",
    name: "contenthash",
    stateMutability: "view",
    inputs:  [{ name: "node", type: "bytes32" }],
    outputs: [{ name: "",     type: "bytes"   }],
  },
  {
    type: "function",
    name: "setAddr",
    stateMutability: "nonpayable",
    inputs: [
      { name: "node", type: "bytes32" },
      { name: "a",    type: "address" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "setText",
    stateMutability: "nonpayable",
    inputs: [
      { name: "node",  type: "bytes32" },
      { name: "key",   type: "string"  },
      { name: "value", type: "string"  },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "setName",
    stateMutability: "nonpayable",
    inputs: [
      { name: "node",  type: "bytes32" },
      { name: "name_", type: "string"  },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "setNameForAddr",
    stateMutability: "nonpayable",
    inputs: [
      { name: "addr_",       type: "address" },
      { name: "owner_",      type: "address" },
      { name: "resolverAddr", type: "address" },
      { name: "name_",       type: "string"  },
    ],
    outputs: [],
  },
] as const;

// ─── Reverse Registrar ABI ────────────────────────────────────────────────────

export const REVERSE_REGISTRAR_ABI = [
  {
    type: "function",
    name: "setName",
    stateMutability: "nonpayable",
    inputs:  [{ name: "name", type: "string" }],
    outputs: [{ name: "",     type: "bytes32" }],
  },
  {
    type: "function",
    name: "node",
    stateMutability: "pure",
    inputs:  [{ name: "addr", type: "address" }],
    outputs: [{ name: "",     type: "bytes32" }],
  },
  {
    type: "function",
    name: "claim",
    stateMutability: "nonpayable",
    inputs:  [{ name: "owner", type: "address" }],
    outputs: [{ name: "",      type: "bytes32" }],
  },
] as const;

// ─── Price Oracle ABI ─────────────────────────────────────────────────────────

export const PRICE_ORACLE_ABI = [
  {
    type: "function",
    name: "price1Char",
    stateMutability: "view",
    inputs: [], outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "price2Char",
    stateMutability: "view",
    inputs: [], outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "price3Char",
    stateMutability: "view",
    inputs: [], outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "price4Char",
    stateMutability: "view",
    inputs: [], outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "price5Plus",
    stateMutability: "view",
    inputs: [], outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "setPrices",
    stateMutability: "nonpayable",
    inputs: [
      { name: "p1", type: "uint256" },
      { name: "p2", type: "uint256" },
      { name: "p3", type: "uint256" },
      { name: "p4", type: "uint256" },
      { name: "p5", type: "uint256" },
    ],
    outputs: [],
  },
] as const;

// ─── Treasury ABI ─────────────────────────────────────────────────────────────

export const TREASURY_ABI = [
  {
    type: "function",
    name: "balance",
    stateMutability: "view",
    inputs: [], outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "distribute",
    stateMutability: "nonpayable",
    inputs: [], outputs: [],
  },
  {
    type: "function",
    name: "totalCollected",
    stateMutability: "view",
    inputs: [], outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "totalDistributed",
    stateMutability: "view",
    inputs: [], outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "protocolWallet",
    stateMutability: "view",
    inputs: [], outputs: [{ name: "", type: "address" }],
  },
] as const;

// ─── ERC-20 ABI (USDC) ────────────────────────────────────────────────────────

export const ERC20_ABI = [
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs:  [{ name: "account", type: "address" }],
    outputs: [{ name: "",        type: "uint256" }],
  },
  {
    type: "function",
    name: "allowance",
    stateMutability: "view",
    inputs: [
      { name: "owner",   type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount",  type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "decimals",
    stateMutability: "view",
    inputs:  [],
    outputs: [{ name: "", type: "uint8" }],
  },
  {
    type: "function",
    name: "symbol",
    stateMutability: "view",
    inputs:  [],
    outputs: [{ name: "", type: "string" }],
  },
  {
    type: "function",
    name: "transfer",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to",     type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;

// ─── Pricing tiers (mirrors deployed ArcNSPriceOracle on Arc Testnet) ─────────

export const PRICE_TIERS = [
  { chars: 1, label: "1 character",   annualUSDC:  50_000_000n },
  { chars: 2, label: "2 characters",  annualUSDC:  25_000_000n },
  { chars: 3, label: "3 characters",  annualUSDC:  15_000_000n },
  { chars: 4, label: "4 characters",  annualUSDC:  10_000_000n },
  { chars: 5, label: "5+ characters", annualUSDC:   2_000_000n },
];

export interface PriceTier {
  chars: number;
  label: string;
  annualUSDC: bigint;
}

export function getPriceTier(label: string): PriceTier {
  const len = [...label].length;
  if (len === 1) return PRICE_TIERS[0];
  if (len === 2) return PRICE_TIERS[1];
  if (len === 3) return PRICE_TIERS[2];
  if (len === 4) return PRICE_TIERS[3];
  return PRICE_TIERS[4];
}

// ─── Safe BigInt helper ───────────────────────────────────────────────────────

export function safeBigInt(value: unknown): bigint {
  try {
    if (value === undefined || value === null || value === "") return 0n;
    return BigInt(value as string | number | bigint);
  } catch {
    return 0n;
  }
}
