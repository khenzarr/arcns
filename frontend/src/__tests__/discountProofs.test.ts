import { afterEach, describe, expect, it, vi } from "vitest";
import proofArtifact from "../../public/discount-proofs/arcns-v3-early-adopter-2026.json";
import {
  EARLY_ADOPTER_PROOF_ARTIFACT_PATH,
  lookupEarlyAdopterProof,
  lookupEarlyAdopterProofFromArtifact,
} from "../lib/discountProofs";

const ELIGIBLE_ADDRESS = "0x0000b9b20ddd33cd240e8d3b7afa02fa1cdaebcc";
const INELIGIBLE_ADDRESS = "0x0000000000000000000000000000000000000001";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("lookupEarlyAdopterProofFromArtifact", () => {
  it("returns the proof for a known eligible wallet", () => {
    const result = lookupEarlyAdopterProofFromArtifact(ELIGIBLE_ADDRESS, proofArtifact);

    expect(result.status).toBe("eligible");
    if (result.status === "eligible") {
      expect(result.proof).toEqual(proofArtifact.proofs[ELIGIBLE_ADDRESS]);
      expect(result.metadata.eligibleWalletCount).toBe(849);
    }
  });

  it("normalizes a mixed-case address before lookup", () => {
    const mixedCaseAddress = "0x0000B9B20dDd33Cd240E8d3B7AfA02Fa1CdAeBcC";
    const result = lookupEarlyAdopterProofFromArtifact(mixedCaseAddress, proofArtifact);

    expect(result.status).toBe("eligible");
    if (result.status === "eligible") {
      expect(result.address).toBe(ELIGIBLE_ADDRESS);
    }
  });

  it("returns a safe ineligible result when no proof exists", () => {
    expect(lookupEarlyAdopterProofFromArtifact(INELIGIBLE_ADDRESS, proofArtifact)).toEqual({
      status: "ineligible",
      address: INELIGIBLE_ADDRESS,
      reason: "missing-proof",
    });
  });

  it("rejects an invalid address before reading artifact data", () => {
    expect(lookupEarlyAdopterProofFromArtifact("not-an-address", null)).toMatchObject({
      status: "invalid-address",
    });
  });

  it("fails closed when finalized metadata does not match", () => {
    const mismatchedArtifact = { ...proofArtifact, snapshotBlock: 1 };

    expect(
      lookupEarlyAdopterProofFromArtifact(ELIGIBLE_ADDRESS, mismatchedArtifact),
    ).toEqual({ status: "unavailable", reason: "metadata-mismatch" });
  });

  it("fails closed when proof data is malformed", () => {
    const malformedArtifact = {
      ...proofArtifact,
      proofs: { ...proofArtifact.proofs, [ELIGIBLE_ADDRESS]: ["0x1234"] },
    };

    expect(lookupEarlyAdopterProofFromArtifact(ELIGIBLE_ADDRESS, malformedArtifact)).toEqual({
      status: "unavailable",
      reason: "artifact-invalid",
    });
  });
});

describe("lookupEarlyAdopterProof", () => {
  it("fetches only the bundled static proof artifact", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => proofArtifact,
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(lookupEarlyAdopterProof(ELIGIBLE_ADDRESS)).resolves.toMatchObject({
      status: "eligible",
      address: ELIGIBLE_ADDRESS,
    });
    expect(fetchMock).toHaveBeenCalledWith(EARLY_ADOPTER_PROOF_ARTIFACT_PATH, {
      method: "GET",
      cache: "force-cache",
      credentials: "same-origin",
    });
  });

  it("returns unavailable when the artifact cannot be fetched", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));

    await expect(lookupEarlyAdopterProof(ELIGIBLE_ADDRESS)).resolves.toEqual({
      status: "unavailable",
      reason: "artifact-fetch-failed",
    });
  });
});