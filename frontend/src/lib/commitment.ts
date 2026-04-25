/**
 * commitment.ts — canonical v3 commitment builder.
 *
 * The v3 commitment signature (ArcNSController.makeCommitment):
 *   keccak256(abi.encode(
 *     keccak256(name),   // label hash
 *     owner,             // address
 *     duration,          // uint256
 *     secret,            // bytes32
 *     resolverAddr,      // address
 *     reverseRecord,     // bool
 *     sender             // address — prevents front-running
 *   ))
 *
 * NOTE: The deployed v3 controller does NOT include a `data[]` parameter.
 * The ABI has exactly 7 inputs for both makeCommitment and register.
 */

import { keccak256, encodeAbiParameters, stringToBytes } from "viem";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CommitmentParams {
  name:          string;
  owner:         `0x${string}`;
  duration:      bigint;
  secret:        `0x${string}`;
  resolverAddr:  `0x${string}`;
  reverseRecord: boolean;
  sender:        `0x${string}`;
}

export interface RegisterArgs {
  name:          string;
  owner:         `0x${string}`;
  duration:      bigint;
  secret:        `0x${string}`;
  resolverAddr:  `0x${string}`;
  reverseRecord: boolean;
  maxCost:       bigint;
}

export const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as `0x${string}`;

// ─── Secret generation ────────────────────────────────────────────────────────

export function randomSecret(): `0x${string}` {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return `0x${Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join("")}`;
}

// ─── Commitment hash ──────────────────────────────────────────────────────────

/**
 * Computes the v3 commitment hash client-side.
 *
 * Mirrors ArcNSController.makeCommitment() exactly — 7 params, no data[].
 */
export function makeCommitment(params: CommitmentParams): `0x${string}` {
  const { name, owner, duration, secret, resolverAddr, reverseRecord, sender } = params;

  const label = keccak256(stringToBytes(name)) as `0x${string}`;

  const encoded = encodeAbiParameters(
    [
      { type: "bytes32" },   // label = keccak256(name)
      { type: "address" },   // owner
      { type: "uint256" },   // duration
      { type: "bytes32" },   // secret
      { type: "address" },   // resolverAddr
      { type: "bool"    },   // reverseRecord
      { type: "address" },   // sender (msg.sender binding)
    ],
    [label, owner, duration, secret, resolverAddr, reverseRecord, sender],
  );

  return keccak256(encoded);
}

// ─── Register args builder ────────────────────────────────────────────────────

/**
 * Builds the arguments tuple for ArcNSController.register().
 *
 * v3 register signature (7 params — no data[]):
 *   register(
 *     string name_,
 *     address owner_,
 *     uint256 duration,
 *     bytes32 secret,
 *     address resolverAddr,
 *     bool reverseRecord,
 *     uint256 maxCost
 *   )
 */
export function buildRegisterArgs(args: RegisterArgs): readonly [
  string,
  `0x${string}`,
  bigint,
  `0x${string}`,
  `0x${string}`,
  boolean,
  bigint,
] {
  return [
    args.name,
    args.owner,
    args.duration,
    args.secret,
    args.resolverAddr,
    args.reverseRecord,
    args.maxCost,
  ] as const;
}

// ─── Consistency helpers ──────────────────────────────────────────────────────

export function verifyCommitmentConsistency(
  params: CommitmentParams,
  expectedHash: `0x${string}`,
): boolean {
  return makeCommitment(params) === expectedHash;
}

export function maxCostWithSlippage(cost: bigint, bps = 500n): bigint {
  return cost + (cost * bps) / 10_000n;
}
