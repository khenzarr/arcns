const { expect } = require("chai");
const { ethers } = require("hardhat");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { MAINNET_DEPLOY_CONFIRMATION, discountDeploymentConfig, mainnetDeploymentConfig } = require("../../scripts/v3/deployV3");
const { EXPECTED_FINAL_SNAPSHOT, validateFinalSnapshotManifest } = require("../../scripts/mainnet/final-snapshot");
const { loadAssertionConfig } = require("../../scripts/mainnet/assert-admin-handoff");
const { loadHandoffConfig } = require("../../scripts/mainnet/handoff-admin");
const { generateBatches, loadBatchConfig } = require("../../scripts/mainnet/generate-safe-discount-batches");
const { generateManifest } = require("../../scripts/mainnet/generate-mainnet-subgraph");
const { loadConfig: loadDiscountStateConfig } = require("../../scripts/mainnet/verify-discount-state");
const { loadVerificationPlan } = require("../../scripts/v3/verifyV3");

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
  it("write-capable mainnet preparation tools fail closed", function () {
    expect(() => loadHandoffConfig({})).to.throw("CONFIRM_MAINNET_ADMIN_HANDOFF");
    expect(() => loadBatchConfig({})).to.throw("DEPLOYMENT_ARTIFACT_PATH");
    expect(() => loadDiscountStateConfig({})).to.throw("EXPECTED_DISCOUNT_STAGE");
    expect(() => loadVerificationPlan("arc_mainnet", {})).to.throw("ARC_MAINNET_EXPLORER_API_URL");
  });
  it("canonical mainnet deployment requires the exact launch confirmation and reviewed inputs", function () {
    expect(() => mainnetDeploymentConfig("arc_mainnet", {})).to.throw("CONFIRM_MAINNET_PROTOCOL_DEPLOY");
    expect(() => mainnetDeploymentConfig("arc_mainnet", {
      CONFIRM_MAINNET_PROTOCOL_DEPLOY: MAINNET_DEPLOY_CONFIRMATION,
      USDC_ADDRESS: "0x3600000000000000000000000000000000000000",
      TREASURY_ADDRESS: "0x0b943Fe9f1f8135e0751BA8B43dc0cD688ad209D",
      EXPECTED_DEPLOYER_ADDRESS: "0x0b943Fe9f1f8135e0751BA8B43dc0cD688ad209D",
      EXPECTED_ADMIN_SAFE_ADDRESS: "0xFd48189D3Feb99a5cC6fcC6896744DAa73F3BF72",
      DEPLOY_EARLY_ADOPTER_DISCOUNT_REGISTRY: "true",
    })).to.throw("MIN_DEPLOYER_BALANCE_WEI");
  });
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

  it("generates three independently reviewable Safe discount transactions", function () {
    const parent = fs.mkdtempSync(path.join(os.tmpdir(), "arcns-safe-batches-"));
    const outputDir = path.join(parent, "batches");
    try {
      const review = generateBatches({
        outputDir,
        safe: "0xFd48189D3Feb99a5cC6fcC6896744DAa73F3BF72",
        registry: "0x1111111111111111111111111111111111111111",
        snapshot: EXPECTED_FINAL_SNAPSHOT,
      });
      expect(review.map((entry) => entry.filename)).to.deep.equal(["01-set-root.json", "02-freeze-root.json", "03-activate.json"]);
      const setRoot = JSON.parse(fs.readFileSync(path.join(outputDir, "01-set-root.json"), "utf8"));
      const activate = JSON.parse(fs.readFileSync(path.join(outputDir, "03-activate.json"), "utf8"));
      expect(setRoot.chainId).to.equal("5042");
      expect(setRoot.transactions[0].to).to.equal("0x1111111111111111111111111111111111111111");
      expect(setRoot.transactions[0].data).to.include(EXPECTED_FINAL_SNAPSHOT.merkleRoot.slice(2));
      expect(new ethers.Interface(["function setDiscountActive(bool)"]).decodeFunctionData("setDiscountActive", activate.transactions[0].data)[0]).to.equal(true);
      expect(JSON.parse(fs.readFileSync(path.join(outputDir, "REVIEW.json"), "utf8")).files).to.have.length(3);
      expect(() => generateBatches({ outputDir })).to.throw("Refusing to overwrite");
    } finally {
      fs.rmSync(parent, { recursive: true, force: true });
    }
  });

  it("materializes all eight mainnet subgraph sources from deployment receipts", function () {
    const parent = fs.mkdtempSync(path.join(os.tmpdir(), "arcns-mainnet-subgraph-"));
    const outputPath = path.join(parent, "subgraph.mainnet.yaml");
    const keys = ["arcController", "circleController", "arcRegistrar", "circleRegistrar", "resolver", "registry", "reverseRegistrar", "discountRegistry"];
    const contracts = {};
    const deploymentRecords = {};
    keys.forEach((key, index) => {
      contracts[key] = ethers.getAddress(`0x${String(index + 1).padStart(40, "0")}`);
      deploymentRecords[key] = { blockNumber: 1000 + index, blockHash: ethers.keccak256(ethers.toUtf8Bytes(key)) };
    });
    try {
      generateManifest({
        outputPath,
        templatePath: path.resolve(__dirname, "../../indexer/subgraph.yaml"),
        graphNetwork: "arc-mainnet-reviewed",
        deployment: { contracts, deploymentRecords },
      });
      const manifest = fs.readFileSync(outputPath, "utf8");
      expect(manifest).to.not.include("network: arc-testnet");
      expect(manifest.match(/network: arc-mainnet-reviewed/g)).to.have.length(8);
      expect(manifest).to.not.match(/^templates:/m);
      keys.forEach((key, index) => {
        expect(manifest).to.include(`address: "${contracts[key]}"`);
        expect(manifest).to.include(`startBlock: ${1000 + index}`);
      });
      expect(() => generateManifest({ outputPath })).to.throw("Refusing to overwrite");
    } finally {
      fs.rmSync(parent, { recursive: true, force: true });
    }
  });

  it("builds a complete mainnet explorer verification plan and requires Timelock evidence", function () {
    const parent = fs.mkdtempSync(path.join(os.tmpdir(), "arcns-mainnet-verify-"));
    const deploymentPath = path.join(parent, "deployment.json");
    const timelockPath = path.join(parent, "timelock.json");
    const keys = ["registry", "priceOracle", "arcRegistrar", "circleRegistrar", "reverseRegistrar", "resolver", "arcController", "circleController", "discountRegistry"];
    const contracts = Object.fromEntries(keys.map((key, index) => [key, ethers.getAddress(`0x${String(index + 1).padStart(40, "0")}`)]));
    const deployment = {
      network: "arc_mainnet", chainId: 5042, deployer: "0x0000000000000000000000000000000000000010", contracts,
      namehashes: { arc: ethers.ZeroHash, circle: ethers.ZeroHash },
      deploymentArguments: { discountRegistry: { constructor: [ethers.id("campaign"), "1", "0x0000000000000000000000000000000000000010"] } },
    };
    const timelock = {
      chainId: 5042, timelock: "0x0000000000000000000000000000000000000020",
      constructorArgs: { minDelay: "172800", proposers: ["0x0000000000000000000000000000000000000030"], executors: ["0x0000000000000000000000000000000000000030"], admin: ethers.ZeroAddress },
    };
    try {
      fs.writeFileSync(deploymentPath, JSON.stringify(deployment));
      fs.writeFileSync(timelockPath, JSON.stringify(timelock));
      const plan = loadVerificationPlan("arc_mainnet", { ARC_MAINNET_EXPLORER_API_URL: "https://explorer.example/api", DEPLOYMENT_ARTIFACT_PATH: deploymentPath, TIMELOCK_ARTIFACT_PATH: timelockPath });
      expect(plan.expected.chainId).to.equal(5042);
      expect(plan.discountArgs).to.have.length(3);
      expect(plan.timelock.timelock).to.equal(timelock.timelock);
    } finally {
      fs.rmSync(parent, { recursive: true, force: true });
    }
  });
});
