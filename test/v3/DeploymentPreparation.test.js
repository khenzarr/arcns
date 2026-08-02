const { expect } = require("chai");
const { ethers } = require("hardhat");
const { discountDeploymentConfig } = require("../../scripts/v3/deployV3");

describe("v3 deployment discount preparation", function () {
  it("is disabled by default and does not require a final root", function () {
    expect(discountDeploymentConfig({})).to.deep.equal({ enabled: false });
    const config = discountDeploymentConfig({
      DEPLOY_EARLY_ADOPTER_DISCOUNT_REGISTRY: "true",
      EARLY_ADOPTER_CAMPAIGN_ID: "campaign-1",
      EARLY_ADOPTER_SNAPSHOT_BLOCK: "123",
    });
    expect(config).to.include({ enabled: true, snapshotBlock: 123, merkleRoot: null, active: false, freezeRoot: false });
    expect(config.campaignId).to.equal(ethers.id("campaign-1"));
  });

  it("requires campaign and snapshot metadata when enabled", function () {
    expect(() => discountDeploymentConfig({ DEPLOY_EARLY_ADOPTER_DISCOUNT_REGISTRY: "true" })).to.throw("EARLY_ADOPTER_CAMPAIGN_ID");
    expect(() => discountDeploymentConfig({ DEPLOY_EARLY_ADOPTER_DISCOUNT_REGISTRY: "true", EARLY_ADOPTER_CAMPAIGN_ID: "campaign" })).to.throw("EARLY_ADOPTER_SNAPSHOT_BLOCK");
  });

  it("refuses freeze or activation without a finalized root", function () {
    const common = {
      DEPLOY_EARLY_ADOPTER_DISCOUNT_REGISTRY: "true",
      EARLY_ADOPTER_CAMPAIGN_ID: "campaign",
      EARLY_ADOPTER_SNAPSHOT_BLOCK: "123",
    };
    expect(() => discountDeploymentConfig({ ...common, EARLY_ADOPTER_DISCOUNT_ACTIVE: "true" })).to.throw("finalized EARLY_ADOPTER_MERKLE_ROOT");
    expect(() => discountDeploymentConfig({ ...common, EARLY_ADOPTER_FREEZE_ROOT: "true" })).to.throw("finalized EARLY_ADOPTER_MERKLE_ROOT");
  });
});