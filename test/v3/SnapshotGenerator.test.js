const { expect } = require("chai");
const { ethers } = require("hardhat");
const {
  campaignBytes32,
  classifyRecords,
  sortRecords,
  uniqueWallets,
  leafFor,
  buildMerkleTree,
  verifyProof,
} = require("../../scripts/snapshot/generate-arcns-v3-early-adopters");

describe("v3 early-adopter snapshot generator", function () {
  const registrars = {
    arc: "0x1000000000000000000000000000000000000001",
    circle: "0x2000000000000000000000000000000000000002",
  };
  const alice = "0x3000000000000000000000000000000000000003";
  const bob = "0x4000000000000000000000000000000000000004";
  const timestamp = 1_000;

  function record(overrides = {}) {
    const tld = overrides.tld || "arc";
    return {
      tld,
      label: overrides.label || "alice",
      name: `${overrides.label || "alice"}.${tld}`,
      owner: overrides.owner || alice,
      expires: overrides.expires ?? 2_000,
      registrar: overrides.registrar || registrars[tld],
      version: overrides.version || "v3",
      active: overrides.active ?? true,
      burned: overrides.burned ?? false,
      ...overrides,
    };
  }

  it("includes valid .arc and .circle rows and deduplicates a wallet across TLDs", function () {
    const rows = sortRecords([record(), record({ tld: "circle", registrar: registrars.circle })], timestamp, registrars);
    expect(rows).to.have.length(2);
    expect(uniqueWallets(rows)).to.deep.equal([alice.toLowerCase()]);
  });

  it("hard-fails wrong registrar membership for either TLD", function () {
    expect(() => sortRecords([record({ registrar: registrars.circle })], timestamp, registrars)).to.throw("does not match supplied .arc registrar");
    expect(() => sortRecords([record({ tld: "circle", registrar: registrars.arc })], timestamp, registrars)).to.throw("does not match supplied .circle registrar");
  });

  it("hard-fails missing registrar provenance and explicit legacy versions", function () {
    const missing = record();
    delete missing.registrar;
    expect(() => sortRecords([missing], timestamp, registrars)).to.throw("missing registrar provenance");
    expect(() => sortRecords([record({ version: "v2" })], timestamp, registrars)).to.throw("non-v3 provenance");
  });

  it("excludes zero owners, expired rows, and burned rows", function () {
    const rows = sortRecords([
      record({ owner: ethers.ZeroAddress }),
      record({ owner: bob, label: "expired", name: "expired.arc", expires: timestamp }),
      record({ owner: bob, label: "burned", name: "burned.arc", burned: true }),
    ], timestamp, registrars);
    expect(rows).to.deep.equal([]);
  });

  it("reports exclusion counts and excludes reviewed protocol/internal owners", function () {
    const result = classifyRecords([
      record({ owner: ethers.ZeroAddress }),
      record({ owner: bob, label: "expired", expires: timestamp }),
      record({ owner: bob, label: "burned", burned: true }),
      record({ owner: bob, label: "internal" }),
      record({ tld: "eth", registrar: registrars.arc }),
    ], timestamp, registrars, [{ address: bob, reason: "protocol internal" }]);
    expect(result.eligible).to.deep.equal([]);
    expect(result.excluded).to.deep.equal({ wrongTld: 1, expired: 1, burned: 1, zeroOwner: 1, protocolInternal: 1 });
  });

  it("uses ethers.id for the exact campaign bytes32", function () {
    expect(campaignBytes32("ARCNS_TESTNET_V3_EARLY_ADOPTER_2026_V1")).to.equal(
      "0xae3c7462e46cc76b3e0349e7d211264ada95257da9d9d7a797abed70b7eb83e3",
    );
  });

  it("builds deterministic Solidity-compatible leaves and proofs", function () {
    const campaign = campaignBytes32("ARCNS_TESTNET_V3_EARLY_ADOPTER_2026_V1");
    const wallets = [alice.toLowerCase(), bob.toLowerCase(), "0x5000000000000000000000000000000000000005"];
    const first = buildMerkleTree(wallets, campaign);
    const second = buildMerkleTree(wallets, campaign);
    expect(first.root).to.equal(second.root);
    expect(first.entries[0].leaf).to.equal(
      ethers.keccak256(ethers.AbiCoder.defaultAbiCoder().encode(["bytes32", "address"], [campaign, alice])),
    );
    for (const entry of first.entries) expect(verifyProof(entry.leaf, entry.proof, first.root)).to.equal(true);
    expect(verifyProof(leafFor(campaign, "0x6000000000000000000000000000000000000006"), first.entries[0].proof, first.root)).to.equal(false);
    expect(verifyProof(leafFor(campaignBytes32("wrong-campaign"), alice), first.entries[0].proof, first.root)).to.equal(false);
  });
});