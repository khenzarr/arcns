const { expect } = require("chai");
const { ethers } = require("hardhat");
const { discountDeploymentConfig } = require("../../scripts/v3/deployV3");
const { EXPECTED_FINAL_SNAPSHOT, validateFinalSnapshotManifest } = require("../../scripts/mainnet/final-snapshot");
const { loadAssertionConfig } = require("../../scripts/mainnet/assert-admin-handoff");

describe("v3 deployment discount preparation", function () {
  it("validates the pinned finalized manifest facts", function () {
    expect(validateFinalSnapshotManifest({ ...EXPECTED_FINAL_SNAPSHOT })).to.deep.equal(EXPECTED_FINAL_SNAPSHOT);
    for (const [field, value] of [["campaignId", "wrong"], ["campaignIdBytes32", ethers.ZeroHash], ["snapshotBlock", 1], ["merkleRoot", ethers.ZeroHash]]) {
      expect(() => validateFinalSnapshotManifest({ ...EXPECTED_FINAL_SNAPSHOT, [field]: value })).to.throw();
    }
  });
  it("keeps deployment lifecycle operations disabled", function () {
    const config = discountDeploymentConfig({ DEPLOY_EARLY_ADOPTER_DISCOUNT_REGISTRY: "true" });
    expect(config).to.include({ rootSetDuringDeploy: false, rootFrozenDuringDeploy: false, activeDuringDeploy: false });
    expect(() => discountDeploymentConfig({ DEPLOY_EARLY_ADOPTER_DISCOUNT_REGISTRY: "true", EARLY_ADOPTER_DISCOUNT_ACTIVE: "true" })).to.throw("forbidden");
  });
  it("authority assertion fails closed without expected values", function () { expect(() => loadAssertionConfig({})).to.throw("required"); });
  it("is disabled by default and uses only the finalized manifest when enabled", function () {
    expect(discountDeploymentConfig({})).to.deep.equal({ enabled: false });
    const config = discountDeploymentConfig({ DEPLOY_EARLY_ADOPTER_DISCOUNT_REGISTRY: "true" });
    expect(config.campaignId).to.equal(EXPECTED_FINAL_SNAPSHOT.campaignIdBytes32);
    expect(config.snapshotBlock).to.equal(EXPECTED_FINAL_SNAPSHOT.snapshotBlock);
  });

  it("rejects environment facts that contradict the finalized manifest", function () {
    expect(() => discountDeploymentConfig({ DEPLOY_EARLY_ADOPTER_DISCOUNT_REGISTRY: "true", EARLY_ADOPTER_CAMPAIGN_ID: "wrong" })).to.throw("contradicts");
    expect(() => discountDeploymentConfig({ DEPLOY_EARLY_ADOPTER_DISCOUNT_REGISTRY: "true", EARLY_ADOPTER_SNAPSHOT_BLOCK: "1" })).to.throw("contradicts");
  });

  it("refuses lifecycle writes in ordinary deployment", function () {
    const common = { DEPLOY_EARLY_ADOPTER_DISCOUNT_REGISTRY: "true" };
    expect(() => discountDeploymentConfig({ ...common, EARLY_ADOPTER_DISCOUNT_ACTIVE: "true" })).to.throw("forbidden");
    expect(() => discountDeploymentConfig({ ...common, EARLY_ADOPTER_FREEZE_ROOT: "true" })).to.throw("forbidden");
  });
});