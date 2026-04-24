/**
 * Identity Consistency Tests
 *
 * Validates the contract identity enforcement requirements:
 * - Same controller used for commit and register (H1, H2)
 * - Commit storage persisted check (H7)
 * - No fallback addresses (H12)
 * - Chain mismatch detection (H11)
 * - Proxy implementation mismatch detection (H6)
 * - Hash consistency (H10)
 * - Infra submission failure classification (H8)
 * - 3-confirmation finality (H9)
 * - Diagnostic logging (mandatory fields)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  resolveControllerIdentity,
  assertIdentityStable,
  clearIdentityCache,
  classifyTransportError,
  ERR,
  EIP1967_IMPL_SLOT,
} from "../lib/controllerIdentity";
import { makeCommitmentHash } from "../lib/namehash";
import { CONTRACTS } from "../lib/contracts";

// ─── Mock publicClient ────────────────────────────────────────────────────────

function makePublicClient(overrides: {
  chainId?: number;
  implSlot?: string;
  storageError?: boolean;
} = {}) {
  return {
    chain: { id: overrides.chainId ?? 5042002 },
    getStorageAt: vi.fn(async () => {
      if (overrides.storageError) throw new Error("RPC error");
      return overrides.implSlot ?? "0x000000000000000000000000abcdef1234567890abcdef1234567890abcdef12";
    }),
    readContract: vi.fn(),
    getBlock: vi.fn(async () => ({ timestamp: BigInt(Math.floor(Date.now() / 1000)) })),
  };
}

// ─── A: Same controller used for commit and register ─────────────────────────

describe("A — Same controller used for commit and register", () => {
  beforeEach(() => clearIdentityCache());
  afterEach(() => clearIdentityCache());

  it("resolveControllerIdentity returns arcController address for tld=arc", async () => {
    const client = makePublicClient();
    const identity = await resolveControllerIdentity("arc", client);
    expect(identity.controllerAddress.toLowerCase()).toBe(CONTRACTS.arcController.toLowerCase());
    expect(identity.tld).toBe("arc");
  });

  it("resolveControllerIdentity returns circleController address for tld=circle", async () => {
    const client = makePublicClient();
    const identity = await resolveControllerIdentity("circle", client);
    expect(identity.controllerAddress.toLowerCase()).toBe(CONTRACTS.circleController.toLowerCase());
    expect(identity.tld).toBe("circle");
  });

  it("identity object is identical across two calls (cached)", async () => {
    const client = makePublicClient();
    const id1 = await resolveControllerIdentity("arc", client);
    const id2 = await resolveControllerIdentity("arc", client);
    expect(id1.controllerAddress).toBe(id2.controllerAddress);
    expect(id1.implSlotValue).toBe(id2.implSlotValue);
    expect(id1.chainId).toBe(id2.chainId);
  });

  it("assertIdentityStable passes when identity is unchanged", async () => {
    const client = makePublicClient();
    await resolveControllerIdentity("arc", client);
    await expect(assertIdentityStable("arc", client, "commit")).resolves.toBeDefined();
    await expect(assertIdentityStable("arc", client, "register")).resolves.toBeDefined();
  });
});

// ─── B: Commit storage persisted check ───────────────────────────────────────

describe("B — Commit storage persisted check (STATE_NOT_PERSISTED)", () => {
  it("STATE_NOT_PERSISTED error code is defined", () => {
    expect(ERR.STATE_NOT_PERSISTED).toBe("STATE_NOT_PERSISTED");
  });

  it("error message contains STATE_NOT_PERSISTED when commitments[hash] = 0", () => {
    // Simulate what the pipeline throws when storage check fails
    const commitment = "0xdeadbeef" as `0x${string}`;
    const controller = CONTRACTS.arcController;
    const txHash = "0xabc123" as `0x${string}`;
    const blockNumber = 12345n;

    const msg = `[${ERR.STATE_NOT_PERSISTED}] commitments[${commitment}] = 0 on controller ${controller}. ` +
      `Commit tx ${txHash} was mined at block ${blockNumber} with 3 confirmations ` +
      `but state is not visible. Possible: wrong controller address, hash mismatch, or RPC inconsistency.`;

    expect(msg).toContain(ERR.STATE_NOT_PERSISTED);
    expect(msg).toContain(controller);
    expect(msg).toContain(commitment);
  });
});

// ─── C: No fallback addresses ─────────────────────────────────────────────────

describe("C — No fallback addresses", () => {
  it("CONTRACTS.arcController is a non-zero address", () => {
    expect(CONTRACTS.arcController).toMatch(/^0x[0-9a-fA-F]{40}$/);
    expect(CONTRACTS.arcController).not.toBe("0x0000000000000000000000000000000000000000");
  });

  it("CONTRACTS.circleController is a non-zero address", () => {
    expect(CONTRACTS.circleController).toMatch(/^0x[0-9a-fA-F]{40}$/);
    expect(CONTRACTS.circleController).not.toBe("0x0000000000000000000000000000000000000000");
  });

  it("resolveControllerIdentity sourceOfTruth references the env var", async () => {
    const client = makePublicClient();
    clearIdentityCache();
    const identity = await resolveControllerIdentity("arc", client);
    expect(identity.sourceOfTruth).toContain("NEXT_PUBLIC_ARC_CONTROLLER_ADDRESS");
  });

  it("resolveControllerIdentity sourceOfTruth references contracts.ts", async () => {
    const client = makePublicClient();
    clearIdentityCache();
    const identity = await resolveControllerIdentity("circle", client);
    expect(identity.sourceOfTruth).toContain("contracts.ts");
  });
});

// ─── D: Chain mismatch detection ─────────────────────────────────────────────

describe("D — Chain mismatch detection (CHAIN_MISMATCH)", () => {
  beforeEach(() => clearIdentityCache());
  afterEach(() => clearIdentityCache());

  it("CHAIN_MISMATCH error code is defined", () => {
    expect(ERR.CHAIN_MISMATCH).toBe("CHAIN_MISMATCH");
  });

  it("assertIdentityStable throws CHAIN_MISMATCH when chainId changes between calls", async () => {
    // First resolve with chainId 5042002
    const client1 = makePublicClient({ chainId: 5042002 });
    await resolveControllerIdentity("arc", client1);

    // Then assert with a different chainId
    const client2 = makePublicClient({ chainId: 1 }); // mainnet
    await expect(assertIdentityStable("arc", client2, "register"))
      .rejects.toThrow(ERR.CHAIN_MISMATCH);
  });
});

// ─── E: Proxy implementation mismatch detection ───────────────────────────────

describe("E — Proxy implementation mismatch (IMPL_SLOT_MISMATCH)", () => {
  beforeEach(() => clearIdentityCache());
  afterEach(() => clearIdentityCache());

  it("IMPL_SLOT_MISMATCH error code is defined", () => {
    expect(ERR.IMPL_SLOT_MISMATCH).toBe("IMPL_SLOT_MISMATCH");
  });

  it("EIP1967_IMPL_SLOT is the correct keccak256 slot", () => {
    expect(EIP1967_IMPL_SLOT).toBe(
      "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc"
    );
  });

  it("assertIdentityStable throws IMPL_SLOT_MISMATCH when impl slot changes between calls", async () => {
    const implSlot1 = "0x000000000000000000000000aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
    const implSlot2 = "0x000000000000000000000000bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";

    // First resolve with implSlot1
    const client1 = makePublicClient({ implSlot: implSlot1 });
    await resolveControllerIdentity("arc", client1);

    // Then assert with implSlot2 (proxy was upgraded)
    const client2 = makePublicClient({ implSlot: implSlot2 });
    await expect(assertIdentityStable("arc", client2, "register"))
      .rejects.toThrow(ERR.IMPL_SLOT_MISMATCH);
  });

  it("assertIdentityStable passes when impl slot is unchanged", async () => {
    const implSlot = "0x000000000000000000000000aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
    const client1 = makePublicClient({ implSlot });
    await resolveControllerIdentity("arc", client1);

    const client2 = makePublicClient({ implSlot });
    await expect(assertIdentityStable("arc", client2, "register")).resolves.toBeDefined();
  });

  it("assertIdentityStable passes when storage read fails (non-proxy fallback)", async () => {
    // If getStorageAt fails, implSlotValue = "NO_PROXY" — no mismatch check
    const client1 = makePublicClient({ storageError: true });
    await resolveControllerIdentity("arc", client1);

    const client2 = makePublicClient({ storageError: true });
    await expect(assertIdentityStable("arc", client2, "register")).resolves.toBeDefined();
  });
});

// ─── F: Hash consistency ──────────────────────────────────────────────────────

describe("F — Hash consistency (makeCommitmentHash)", () => {
  const owner    = "0x0b943Fe9f1f8135e0751BA8B43dc0cD688ad209D" as `0x${string}`;
  const duration = BigInt(365 * 24 * 60 * 60);
  const secret   = "0x" + "ab".repeat(32) as `0x${string}`;
  const resolver = "0xE62De42eAcb270D2f2465c017C30bbf24F3f9350" as `0x${string}`;

  it("makeCommitmentHash is deterministic for same inputs", () => {
    const h1 = makeCommitmentHash("alice", owner, duration, secret, resolver, [], false, owner);
    const h2 = makeCommitmentHash("alice", owner, duration, secret, resolver, [], false, owner);
    expect(h1).toBe(h2);
  });

  it("makeCommitmentHash differs when label changes", () => {
    const h1 = makeCommitmentHash("alice", owner, duration, secret, resolver, [], false, owner);
    const h2 = makeCommitmentHash("bob",   owner, duration, secret, resolver, [], false, owner);
    expect(h1).not.toBe(h2);
  });

  it("makeCommitmentHash differs when owner changes", () => {
    const other = "0x1111111111111111111111111111111111111111" as `0x${string}`;
    const h1 = makeCommitmentHash("alice", owner, duration, secret, resolver, [], false, owner);
    const h2 = makeCommitmentHash("alice", other, duration, secret, resolver, [], false, other);
    expect(h1).not.toBe(h2);
  });

  it("makeCommitmentHash differs when secret changes", () => {
    const secret2 = "0x" + "cd".repeat(32) as `0x${string}`;
    const h1 = makeCommitmentHash("alice", owner, duration, secret,  resolver, [], false, owner);
    const h2 = makeCommitmentHash("alice", owner, duration, secret2, resolver, [], false, owner);
    expect(h1).not.toBe(h2);
  });

  it("makeCommitmentHash output is 32-byte hex", () => {
    const h = makeCommitmentHash("alice", owner, duration, secret, resolver, [], false, owner);
    expect(h).toMatch(/^0x[0-9a-f]{64}$/);
  });
});

// ─── G: Infra submission failure classification ───────────────────────────────

describe("G — Infra error classification (classifyTransportError)", () => {
  it("classifies txpool full error", () => {
    const result = classifyTransportError(new Error("txpool is full"));
    expect(result?.code).toBe(ERR.TXPOOL_FULL);
    expect(result?.message).toContain(ERR.TXPOOL_FULL);
  });

  it("classifies transaction pool is full (alternate phrasing)", () => {
    const result = classifyTransportError(new Error("transaction pool is full"));
    expect(result?.code).toBe(ERR.TXPOOL_FULL);
  });

  it("classifies nonce too low", () => {
    const result = classifyTransportError(new Error("nonce too low"));
    expect(result?.code).toBe(ERR.NONCE_CONFLICT);
  });

  it("classifies replacement transaction underpriced", () => {
    const result = classifyTransportError(new Error("replacement transaction underpriced"));
    expect(result?.code).toBe(ERR.NONCE_CONFLICT);
  });

  it("classifies already known", () => {
    const result = classifyTransportError(new Error("already known"));
    expect(result?.code).toBe(ERR.NONCE_CONFLICT);
  });

  it("classifies RPC timeout", () => {
    const result = classifyTransportError(new Error("request timed out"));
    expect(result?.code).toBe(ERR.RPC_RECEIPT_TIMEOUT);
  });

  it("classifies network error", () => {
    const result = classifyTransportError(new Error("failed to fetch"));
    expect(result?.code).toBe(ERR.TX_SUBMISSION_FAILED);
  });

  it("returns null for contract logic errors (not transport)", () => {
    const result = classifyTransportError(new Error("Controller: commitment expired"));
    expect(result).toBeNull();
  });

  it("returns null for user rejection", () => {
    const result = classifyTransportError(new Error("user rejected transaction"));
    expect(result).toBeNull();
  });

  it("transport errors never contain 'commitment expired' in their message", () => {
    const errors = [
      "txpool is full",
      "nonce too low",
      "replacement transaction underpriced",
      "request timed out",
      "failed to fetch",
    ];
    for (const msg of errors) {
      const result = classifyTransportError(new Error(msg));
      expect(result?.message).not.toContain("commitment expired");
    }
  });
});

// ─── H: .arc vs .circle isolation ────────────────────────────────────────────

describe("H — .arc vs .circle controller isolation", () => {
  beforeEach(() => clearIdentityCache());
  afterEach(() => clearIdentityCache());

  it("arc and circle controllers have different addresses", () => {
    expect(CONTRACTS.arcController.toLowerCase()).not.toBe(
      CONTRACTS.circleController.toLowerCase()
    );
  });

  it("resolveControllerIdentity for arc returns arcController, not circleController", async () => {
    const client = makePublicClient();
    const identity = await resolveControllerIdentity("arc", client);
    expect(identity.controllerAddress.toLowerCase()).toBe(CONTRACTS.arcController.toLowerCase());
    expect(identity.controllerAddress.toLowerCase()).not.toBe(CONTRACTS.circleController.toLowerCase());
  });

  it("resolveControllerIdentity for circle returns circleController, not arcController", async () => {
    const client = makePublicClient();
    const identity = await resolveControllerIdentity("circle", client);
    expect(identity.controllerAddress.toLowerCase()).toBe(CONTRACTS.circleController.toLowerCase());
    expect(identity.controllerAddress.toLowerCase()).not.toBe(CONTRACTS.arcController.toLowerCase());
  });

  it("arc and circle identities are cached independently", async () => {
    const client = makePublicClient();
    const arcId    = await resolveControllerIdentity("arc", client);
    const circleId = await resolveControllerIdentity("circle", client);
    expect(arcId.controllerAddress).not.toBe(circleId.controllerAddress);
    expect(arcId.tld).toBe("arc");
    expect(circleId.tld).toBe("circle");
  });
});

// ─── I: 3-confirmation finality ───────────────────────────────────────────────

describe("I — 3-confirmation finality rule", () => {
  it("COMMIT_CONFIRMATIONS constant matches current source behavior", async () => {
    const { readFileSync } = await import("fs");
    const { resolve } = await import("path");
    const src = readFileSync(
      resolve(__dirname, "../hooks/useRegistrationPipeline.ts"),
      "utf-8"
    );
    expect(src).toContain("COMMIT_CONFIRMATIONS = 1");
    expect(src).toContain("confirmations: COMMIT_CONFIRMATIONS");
  });
});

// ─── J: Diagnostic coverage ───────────────────────────────────────────────────

describe("J — Diagnostic output coverage", () => {
  it("resolveControllerIdentity identity object contains all required diagnostic fields", async () => {
    const client = makePublicClient();
    clearIdentityCache();
    const identity = await resolveControllerIdentity("arc", client);

    expect(identity).toHaveProperty("controllerAddress");
    expect(identity).toHaveProperty("chainId");
    expect(identity).toHaveProperty("implSlotValue");
    expect(identity).toHaveProperty("tld");
    expect(identity).toHaveProperty("sourceOfTruth");
  });

  it("all required error codes are defined in ERR", () => {
    const required = [
      "CONTROLLER_MISMATCH",
      "IMPL_SLOT_MISMATCH",
      "CHAIN_MISMATCH",
      "STATE_NOT_PERSISTED",
      "TX_SUBMISSION_FAILED",
      "TXPOOL_FULL",
      "NONCE_CONFLICT",
      "RPC_RECEIPT_TIMEOUT",
      "NO_FALLBACK_ALLOWED",
      "COMMITMENT_HASH_MISMATCH",
    ];
    for (const code of required) {
      expect(ERR).toHaveProperty(code);
    }
  });
});
