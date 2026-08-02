import { isAddress, type Address, type Hex } from "viem";

/**
 * Static artifact prepared for a future early-adopter discount experience.
 *
 * This module performs local proof lookup only. A matching proof does not show
 * that a registry is deployed, its root is set or frozen, the campaign is
 * active, or the wallet has not already used its claim.
 */

export const EARLY_ADOPTER_PROOF_ARTIFACT_PATH =
  "/discount-proofs/arcns-v3-early-adopter-2026.json";

export const EARLY_ADOPTER_PROOF_METADATA = {
  campaignId: "ARCNS_TESTNET_V3_EARLY_ADOPTER_2026_V1",
  campaignIdBytes32:
    "0xae3c7462e46cc76b3e0349e7d211264ada95257da9d9d7a797abed70b7eb83e3",
  snapshotBlock: 54933646,
  snapshotBlockHash:
    "0x0a450d7fb8055de409084ddb9942f31431aa017a3b3241c4eb8e2e655b8c024d",
  merkleRoot:
    "0xf18c50fa221162f76d0b88f21aa26e4211c5a77ee72d4dd58240a40406f38d9e",
  eligibleWalletCount: 849,
} as const;

export type DiscountProofMetadata = typeof EARLY_ADOPTER_PROOF_METADATA;

export type DiscountProofLookupResult =
  | {
      status: "eligible";
      address: Address;
      proof: Hex[];
      metadata: DiscountProofMetadata;
    }
  | {
      status: "ineligible";
      address: Address;
      reason: "missing-proof";
    }
  | {
      status: "invalid-address";
      reason: string;
    }
  | {
      status: "unavailable";
      reason: "artifact-fetch-failed" | "artifact-invalid" | "metadata-mismatch";
    };

type ProofArtifact = DiscountProofMetadata & {
  version: 1;
  proofs: Record<string, Hex[]>;
};

const BYTES32_PATTERN = /^0x[0-9a-fA-F]{64}$/;

function normalizeAddress(address: string): Address | null {
  if (typeof address !== "string") return null;

  const trimmed = address.trim();
  if (!isAddress(trimmed, { strict: false })) return null;

  return trimmed.toLowerCase() as Address;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExpectedMetadata(value: Record<string, unknown>): boolean {
  return (
    value.campaignId === EARLY_ADOPTER_PROOF_METADATA.campaignId &&
    value.campaignIdBytes32 === EARLY_ADOPTER_PROOF_METADATA.campaignIdBytes32 &&
    value.snapshotBlock === EARLY_ADOPTER_PROOF_METADATA.snapshotBlock &&
    value.snapshotBlockHash === EARLY_ADOPTER_PROOF_METADATA.snapshotBlockHash &&
    value.merkleRoot === EARLY_ADOPTER_PROOF_METADATA.merkleRoot &&
    value.eligibleWalletCount === EARLY_ADOPTER_PROOF_METADATA.eligibleWalletCount
  );
}

function parseArtifact(
  value: unknown,
): { artifact: ProofArtifact } | { error: "artifact-invalid" | "metadata-mismatch" } {
  if (!isRecord(value)) return { error: "artifact-invalid" };
  if (!hasExpectedMetadata(value)) return { error: "metadata-mismatch" };
  if (value.version !== 1 || !isRecord(value.proofs)) {
    return { error: "artifact-invalid" };
  }

  const entries = Object.entries(value.proofs);
  if (entries.length !== EARLY_ADOPTER_PROOF_METADATA.eligibleWalletCount) {
    return { error: "metadata-mismatch" };
  }

  for (const [address, proof] of entries) {
    if (
      address !== address.toLowerCase() ||
      !isAddress(address, { strict: false }) ||
      !Array.isArray(proof) ||
      proof.length === 0 ||
      !proof.every((item) => typeof item === "string" && BYTES32_PATTERN.test(item))
    ) {
      return { error: "artifact-invalid" };
    }
  }

  return { artifact: value as ProofArtifact };
}

/**
 * Pure lookup entry point for validation and unit tests.
 * It does not perform network, RPC, wallet, or contract operations.
 */
export function lookupEarlyAdopterProofFromArtifact(
  address: string,
  artifactValue: unknown,
): DiscountProofLookupResult {
  const normalizedAddress = normalizeAddress(address);
  if (!normalizedAddress) {
    return {
      status: "invalid-address",
      reason: "Address must be a valid 0x-prefixed EVM address.",
    };
  }

  const parsed = parseArtifact(artifactValue);
  if ("error" in parsed) {
    return { status: "unavailable", reason: parsed.error };
  }

  const proof = parsed.artifact.proofs[normalizedAddress];
  if (!proof) {
    return { status: "ineligible", address: normalizedAddress, reason: "missing-proof" };
  }

  return {
    status: "eligible",
    address: normalizedAddress,
    proof: [...proof],
    metadata: EARLY_ADOPTER_PROOF_METADATA,
  };
}

/**
 * Fetch the bundled static artifact and look up an address.
 *
 * This helper intentionally does not read chain state or determine whether a
 * discount action is available. Future UI code must separately fail closed on
 * root, freeze, activation, controller authorization, and already-used state.
 */
export async function lookupEarlyAdopterProof(
  address: string,
): Promise<DiscountProofLookupResult> {
  const normalizedAddress = normalizeAddress(address);
  if (!normalizedAddress) {
    return {
      status: "invalid-address",
      reason: "Address must be a valid 0x-prefixed EVM address.",
    };
  }

  try {
    const response = await fetch(EARLY_ADOPTER_PROOF_ARTIFACT_PATH, {
      method: "GET",
      cache: "force-cache",
      credentials: "same-origin",
    });

    if (!response.ok) {
      return { status: "unavailable", reason: "artifact-fetch-failed" };
    }

    return lookupEarlyAdopterProofFromArtifact(normalizedAddress, await response.json());
  } catch {
    return { status: "unavailable", reason: "artifact-fetch-failed" };
  }
}