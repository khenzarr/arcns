const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ArcNSEarlyAdopterDiscountRegistry", function () {
  it("consumes a valid wallet proof once and rejects unauthorized/invalid reuse", async function () {
    const [owner, controller, alice, bob] = await ethers.getSigners();
    const campaignId = ethers.id("arcns-v3-early-adopters-1");
    const Registry = await ethers.getContractFactory("contracts/v3/discount/ArcNSEarlyAdopterDiscountRegistry.sol:ArcNSEarlyAdopterDiscountRegistry");
    const registry = await Registry.deploy(campaignId, 123, owner.address);
    await registry.waitForDeployment();

    const leaf = (account) => ethers.keccak256(ethers.AbiCoder.defaultAbiCoder().encode(["bytes32", "address"], [campaignId, account]));
    const root = leaf(alice.address);
    await registry.setMerkleRoot(root);
    await registry.setDiscountActive(true);
    await registry.setControllerAuthorization(controller.address, true);

    await expect(registry.connect(controller).consume(alice.address, [])).to.be.revertedWithCustomError(registry, "RootNotFrozen");
    await registry.freezeRoot();
    await expect(registry.connect(controller).consume(bob.address, [])).to.be.revertedWithCustomError(registry, "InvalidProof");
    await expect(registry.connect(controller).consume(alice.address, [])).to.emit(registry, "DiscountUsed");
    expect(await registry.used(alice.address)).to.equal(true);
    await expect(registry.connect(controller).consume(alice.address, [])).to.be.revertedWithCustomError(registry, "DiscountAlreadyUsed");
    await expect(registry.connect(bob).consume(alice.address, [])).to.be.revertedWithCustomError(registry, "UnauthorizedController");
  });

  it("freezes the root and prevents later changes", async function () {
    const [owner] = await ethers.getSigners();
    const Registry = await ethers.getContractFactory("contracts/v3/discount/ArcNSEarlyAdopterDiscountRegistry.sol:ArcNSEarlyAdopterDiscountRegistry");
    const registry = await Registry.deploy(ethers.id("campaign"), 1, owner.address);
    await registry.setMerkleRoot(ethers.id("root"));
    await registry.freezeRoot();
    await expect(registry.setMerkleRoot(ethers.id("other"))).to.be.revertedWithCustomError(registry, "RootAlreadyFrozen");
  });
});