/// ArcNS V2 — Contract addresses and ABIs
/// All addresses match deployed contracts on Arc Testnet (Chain ID: 5042002)

import { parseAbi } from "viem";

// ─── Addresses ────────────────────────────────────────────────────────────────

export const CONTRACTS = {
  registry:         (process.env.NEXT_PUBLIC_REGISTRY_ADDRESS         ?? "0x3731b7c9F1830aD2880020DfcB0A4714E7fc252a") as `0x${string}`,
  arcRegistrar:     (process.env.NEXT_PUBLIC_ARC_REGISTRAR_ADDRESS    ?? "0xb156d9726661E92C541e3a267ee8710Fdcd24969") as `0x${string}`,
  circleRegistrar:  (process.env.NEXT_PUBLIC_CIRCLE_REGISTRAR_ADDRESS ?? "0xBdfF2790Dd72E86C3510Cc8374EaC5E2E0659c5e") as `0x${string}`,
  arcController:    (process.env.NEXT_PUBLIC_ARC_CONTROLLER_ADDRESS   ?? "0x1bd377A2762510c00dd0ec2142E42829e7053C80") as `0x${string}`,
  circleController: (process.env.NEXT_PUBLIC_CIRCLE_CONTROLLER_ADDRESS ?? "0xfBFE553633AB91b6B32A0E6296341000Bf03DB95") as `0x${string}`,
  resolver:         (process.env.NEXT_PUBLIC_RESOLVER_ADDRESS          ?? "0xE62De42eAcb270D2f2465c017C30bbf24F3f9350") as `0x${string}`,
  reverseRegistrar: (process.env.NEXT_PUBLIC_REVERSE_REGISTRAR_ADDRESS ?? "0x97DEf95ADE4b67cD877725282d872d1eD2b4D489") as `0x${string}`,
  usdc:             (process.env.NEXT_PUBLIC_USDC_ADDRESS              ?? "0x3600000000000000000000000000000000000000") as `0x${string}`,
  priceOracle:      (process.env.NEXT_PUBLIC_PRICE_ORACLE_ADDRESS      ?? "0x18EE0175504e033D72486235F8A2552038EF4ce6") as `0x${string}`,
  treasury:         (process.env.NEXT_PUBLIC_TREASURY_ADDRESS          ?? "0xbbDF5bC7D63B1b7223556d4899905d56589A682d") as `0x${string}`,
} as const;

// ─── V2 Controller ABI — matches ArcNSRegistrarController ────────────────────

export const CONTROLLER_ABI = parseAbi([
  "function available(string name) view returns (bool)",
  "function rentPrice(string name, uint256 duration) view returns (uint256, uint256)",
  // 8-param overload: explicit caller binding (chainId + address(this) included on-chain)
  "function makeCommitment(string name, address owner, uint256 duration, bytes32 secret, address resolver, bytes[] data, bool reverseRecord, address caller) view returns (bytes32)",
  // 7-param convenience overload: uses msg.sender as caller
  "function makeCommitment(string name, address owner, uint256 duration, bytes32 secret, address resolver, bytes[] data, bool reverseRecord) view returns (bytes32)",
  "function commit(bytes32 commitment)",
  "function register(string name, address owner, uint256 duration, bytes32 secret, address resolver, bytes[] data, bool reverseRecord)",
  "function renew(string name, uint256 duration)",
  "function commitments(bytes32) view returns (uint256)",
  "function MIN_COMMITMENT_AGE() view returns (uint256)",
  "function MAX_COMMITMENT_AGE() view returns (uint256)",
  "function MIN_REGISTRATION_DURATION() view returns (uint256)",
  "function MAX_REGISTRATION_DURATION() view returns (uint256)",
  "event NameRegistered(string name, bytes32 indexed label, address indexed owner, uint256 cost, uint256 expires)",
  "event NameRenewed(string name, bytes32 indexed label, uint256 cost, uint256 expires)",
  "event CommitmentMade(bytes32 indexed commitment)",
]);

// ─── Registry ABI ─────────────────────────────────────────────────────────────

export const REGISTRY_ABI = parseAbi([
  "function owner(bytes32 node) view returns (address)",
  "function resolver(bytes32 node) view returns (address)",
  "function setResolver(bytes32 node, address resolver)",
  "function setApprovalForAll(address operator, bool approved)",
  "function isApprovedForAll(address owner, address operator) view returns (bool)",
]);

// ─── Registrar ABI (ERC-721 + nameExpires) ────────────────────────────────────

export const REGISTRAR_ABI = parseAbi([
  "function nameExpires(uint256 id) view returns (uint256)",
  "function available(uint256 id) view returns (bool)",
  "function ownerOf(uint256 tokenId) view returns (address)",
  "function tokenURI(uint256 tokenId) view returns (string)",
  "function balanceOf(address owner) view returns (uint256)",
  "function tld() view returns (string)",
]);

// ─── Resolver ABI ─────────────────────────────────────────────────────────────

export const RESOLVER_ABI = parseAbi([
  "function addr(bytes32 node) view returns (address)",
  "function text(bytes32 node, string key) view returns (string)",
  "function name(bytes32 node) view returns (string)",
  "function contenthash(bytes32 node) view returns (bytes)",
  "function setAddr(bytes32 node, address a)",
  "function setText(bytes32 node, string key, string value)",
  "function setName(bytes32 node, string name)",
  "function setNameForAddr(address addr, address owner, address resolver, string name)",
]);

// ─── Reverse Registrar ABI ────────────────────────────────────────────────────

export const REVERSE_REGISTRAR_ABI = parseAbi([
  "function setName(string name) returns (bytes32)",
  "function node(address addr) pure returns (bytes32)",
  "function claim(address owner) returns (bytes32)",
]);

// ─── Price Oracle ABI ─────────────────────────────────────────────────────────

export const PRICE_ORACLE_ABI = parseAbi([
  "function price1Char() view returns (uint256)",
  "function price2Char() view returns (uint256)",
  "function price3Char() view returns (uint256)",
  "function price4Char() view returns (uint256)",
  "function price5Plus() view returns (uint256)",
  "function setPrices(uint256 p1, uint256 p2, uint256 p3, uint256 p4, uint256 p5)",
]);

// ─── Treasury ABI ─────────────────────────────────────────────────────────────

export const TREASURY_ABI = parseAbi([
  "function balance() view returns (uint256)",
  "function distribute()",
  "function totalCollected() view returns (uint256)",
  "function totalDistributed() view returns (uint256)",
  "function protocolWallet() view returns (address)",
]);

// ─── ERC-20 ABI (USDC) ────────────────────────────────────────────────────────

export const ERC20_ABI = parseAbi([
  "function balanceOf(address account) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "function transfer(address to, uint256 amount) returns (bool)",
]);

// ─── Pricing tiers (mirrors deployed ArcNSPriceOracle on Arc Testnet) ─────────

export const PRICE_TIERS = [
  { chars: 1, label: "1 character",   annualUSDC:  50_000_000n },  //  $50/yr
  { chars: 2, label: "2 characters",  annualUSDC:  25_000_000n },  //  $25/yr
  { chars: 3, label: "3 characters",  annualUSDC:  15_000_000n },  //  $15/yr
  { chars: 4, label: "4 characters",  annualUSDC:  10_000_000n },  //  $10/yr
  { chars: 5, label: "5+ characters", annualUSDC:   2_000_000n },  //   $2/yr
];

export interface PriceTier {
  chars: number;
  label: string;
  annualUSDC: bigint;
}

export function getPriceTier(label: string): PriceTier {
  const len = [...label].length; // unicode-safe char count
  if (len === 1) return PRICE_TIERS[0]; // $49.99/yr
  if (len === 2) return PRICE_TIERS[1]; // $24.99/yr
  if (len === 3) return PRICE_TIERS[2]; // $14.99/yr
  if (len === 4) return PRICE_TIERS[3]; //  $9.99/yr
  return PRICE_TIERS[4];               //  $1.99/yr (5+)
}
