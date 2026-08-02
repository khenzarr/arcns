const { expect } = require("chai");
const { ethers } = require("hardhat");
const { sortRecords, uniqueWallets } = require("../../scripts/snapshot/generate-arcns-v3-early-adopters");

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
});