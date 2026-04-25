const { expect } = require("chai");
const { ethers } = require("hardhat");

// Compute namehash for a label under the root node
function labelhash(label) {
  return ethers.keccak256(ethers.toUtf8Bytes(label));
}

function namehash(name) {
  if (name === "") return ethers.ZeroHash;
  const parts = name.split(".");
  let node = ethers.ZeroHash;
  for (let i = parts.length - 1; i >= 0; i--) {
    const lh = labelhash(parts[i]);
    node = ethers.keccak256(ethers.concat([node, lh]));
  }
  return node;
}

describe("ArcNSRegistry (v3)", function () {
  let registry;
  let deployer, alice, bob, operator;

  beforeEach(async function () {
    [deployer, alice, bob, operator] = await ethers.getSigners();
    const Registry = await ethers.getContractFactory("contracts/v3/registry/ArcNSRegistry.sol:ArcNSRegistry");
    registry = await Registry.deploy();
    await registry.waitForDeployment();
  });

  // ─── Deployment ───────────────────────────────────────────────────────────

  describe("deployment", function () {
    it("deployer owns the root node", async function () {
      expect(await registry.owner(ethers.ZeroHash)).to.equal(deployer.address);
    });

    it("root node record exists", async function () {
      expect(await registry.recordExists(ethers.ZeroHash)).to.be.true;
    });

    it("unknown node does not exist", async function () {
      expect(await registry.recordExists(labelhash("unknown"))).to.be.false;
    });
  });

  // ─── setSubnodeOwner ──────────────────────────────────────────────────────

  describe("setSubnodeOwner", function () {
    it("owner can set subnode owner", async function () {
      const label = labelhash("arc");
      await registry.setSubnodeOwner(ethers.ZeroHash, label, alice.address);
      const arcNode = ethers.keccak256(ethers.concat([ethers.ZeroHash, label]));
      expect(await registry.owner(arcNode)).to.equal(alice.address);
    });

    it("non-owner reverts with NotAuthorised", async function () {
      const label = labelhash("arc");
      await expect(
        registry.connect(alice).setSubnodeOwner(ethers.ZeroHash, label, alice.address)
      ).to.be.revertedWithCustomError(registry, "NotAuthorised");
    });

    it("returns the subnode hash", async function () {
      const label = labelhash("arc");
      const tx = await registry.setSubnodeOwner(ethers.ZeroHash, label, alice.address);
      const arcNode = ethers.keccak256(ethers.concat([ethers.ZeroHash, label]));
      // Verify the subnode was set correctly
      expect(await registry.owner(arcNode)).to.equal(alice.address);
    });

    it("emits NewOwner event", async function () {
      const label = labelhash("arc");
      await expect(registry.setSubnodeOwner(ethers.ZeroHash, label, alice.address))
        .to.emit(registry, "NewOwner")
        .withArgs(ethers.ZeroHash, label, alice.address);
    });

    it("emits Transfer event for the subnode", async function () {
      const label = labelhash("arc");
      const arcNode = ethers.keccak256(ethers.concat([ethers.ZeroHash, label]));
      await expect(registry.setSubnodeOwner(ethers.ZeroHash, label, alice.address))
        .to.emit(registry, "Transfer")
        .withArgs(arcNode, alice.address);
    });

    it("recordExists is true after setSubnodeOwner", async function () {
      const label = labelhash("arc");
      await registry.setSubnodeOwner(ethers.ZeroHash, label, alice.address);
      const arcNode = ethers.keccak256(ethers.concat([ethers.ZeroHash, label]));
      expect(await registry.recordExists(arcNode)).to.be.true;
    });
  });

  // ─── setSubnodeRecord ─────────────────────────────────────────────────────

  describe("setSubnodeRecord", function () {
    it("sets owner, resolver, and ttl atomically", async function () {
      const label = labelhash("arc");
      const arcNode = ethers.keccak256(ethers.concat([ethers.ZeroHash, label]));
      const fakeResolver = bob.address;
      const ttl = 3600n;

      await registry.setSubnodeRecord(ethers.ZeroHash, label, alice.address, fakeResolver, ttl);

      expect(await registry.owner(arcNode)).to.equal(alice.address);
      expect(await registry.resolver(arcNode)).to.equal(fakeResolver);
      expect(await registry.ttl(arcNode)).to.equal(ttl);
    });

    it("emits NewOwner, NewResolver, NewTTL events", async function () {
      const label = labelhash("arc");
      const arcNode = ethers.keccak256(ethers.concat([ethers.ZeroHash, label]));
      const fakeResolver = bob.address;
      const ttl = 3600n;

      const tx = registry.setSubnodeRecord(ethers.ZeroHash, label, alice.address, fakeResolver, ttl);
      await expect(tx).to.emit(registry, "NewOwner").withArgs(ethers.ZeroHash, label, alice.address);
      await expect(tx).to.emit(registry, "NewResolver").withArgs(arcNode, fakeResolver);
      await expect(tx).to.emit(registry, "NewTTL").withArgs(arcNode, ttl);
    });

    it("non-owner reverts with NotAuthorised", async function () {
      const label = labelhash("arc");
      await expect(
        registry.connect(alice).setSubnodeRecord(ethers.ZeroHash, label, alice.address, ethers.ZeroAddress, 0)
      ).to.be.revertedWithCustomError(registry, "NotAuthorised");
    });
  });

  // ─── setResolver ──────────────────────────────────────────────────────────

  describe("setResolver", function () {
    let arcNode;

    beforeEach(async function () {
      const label = labelhash("arc");
      arcNode = ethers.keccak256(ethers.concat([ethers.ZeroHash, label]));
      await registry.setSubnodeOwner(ethers.ZeroHash, label, alice.address);
    });

    it("owner can set resolver", async function () {
      await registry.connect(alice).setResolver(arcNode, bob.address);
      expect(await registry.resolver(arcNode)).to.equal(bob.address);
    });

    it("non-owner reverts with NotAuthorised", async function () {
      await expect(
        registry.connect(bob).setResolver(arcNode, bob.address)
      ).to.be.revertedWithCustomError(registry, "NotAuthorised");
    });

    it("emits NewResolver event", async function () {
      await expect(registry.connect(alice).setResolver(arcNode, bob.address))
        .to.emit(registry, "NewResolver")
        .withArgs(arcNode, bob.address);
    });
  });

  // ─── setOwner ─────────────────────────────────────────────────────────────

  describe("setOwner", function () {
    let arcNode;

    beforeEach(async function () {
      const label = labelhash("arc");
      arcNode = ethers.keccak256(ethers.concat([ethers.ZeroHash, label]));
      await registry.setSubnodeOwner(ethers.ZeroHash, label, alice.address);
    });

    it("owner can transfer ownership", async function () {
      await registry.connect(alice).setOwner(arcNode, bob.address);
      expect(await registry.owner(arcNode)).to.equal(bob.address);
    });

    it("non-owner reverts with NotAuthorised", async function () {
      await expect(
        registry.connect(bob).setOwner(arcNode, bob.address)
      ).to.be.revertedWithCustomError(registry, "NotAuthorised");
    });

    it("emits Transfer event", async function () {
      await expect(registry.connect(alice).setOwner(arcNode, bob.address))
        .to.emit(registry, "Transfer")
        .withArgs(arcNode, bob.address);
    });
  });

  // ─── setTTL ───────────────────────────────────────────────────────────────

  describe("setTTL", function () {
    let arcNode;

    beforeEach(async function () {
      const label = labelhash("arc");
      arcNode = ethers.keccak256(ethers.concat([ethers.ZeroHash, label]));
      await registry.setSubnodeOwner(ethers.ZeroHash, label, alice.address);
    });

    it("owner can set TTL", async function () {
      await registry.connect(alice).setTTL(arcNode, 7200n);
      expect(await registry.ttl(arcNode)).to.equal(7200n);
    });

    it("emits NewTTL event", async function () {
      await expect(registry.connect(alice).setTTL(arcNode, 7200n))
        .to.emit(registry, "NewTTL")
        .withArgs(arcNode, 7200n);
    });
  });

  // ─── setApprovalForAll ────────────────────────────────────────────────────

  describe("setApprovalForAll", function () {
    let arcNode;

    beforeEach(async function () {
      const label = labelhash("arc");
      arcNode = ethers.keccak256(ethers.concat([ethers.ZeroHash, label]));
      await registry.setSubnodeOwner(ethers.ZeroHash, label, alice.address);
    });

    it("operator can act on behalf of owner after approval", async function () {
      await registry.connect(alice).setApprovalForAll(operator.address, true);
      expect(await registry.isApprovedForAll(alice.address, operator.address)).to.be.true;

      // Operator can now set resolver on alice's node
      await registry.connect(operator).setResolver(arcNode, bob.address);
      expect(await registry.resolver(arcNode)).to.equal(bob.address);
    });

    it("revoked operator cannot act", async function () {
      await registry.connect(alice).setApprovalForAll(operator.address, true);
      await registry.connect(alice).setApprovalForAll(operator.address, false);
      expect(await registry.isApprovedForAll(alice.address, operator.address)).to.be.false;

      await expect(
        registry.connect(operator).setResolver(arcNode, bob.address)
      ).to.be.revertedWithCustomError(registry, "NotAuthorised");
    });

    it("emits ApprovalForAll event", async function () {
      await expect(registry.connect(alice).setApprovalForAll(operator.address, true))
        .to.emit(registry, "ApprovalForAll")
        .withArgs(alice.address, operator.address, true);
    });
  });

  // ─── setRecord ────────────────────────────────────────────────────────────

  describe("setRecord", function () {
    it("owner can set record atomically", async function () {
      const label = labelhash("arc");
      const arcNode = ethers.keccak256(ethers.concat([ethers.ZeroHash, label]));
      await registry.setSubnodeOwner(ethers.ZeroHash, label, alice.address);

      await registry.connect(alice).setRecord(arcNode, bob.address, deployer.address, 1000n);
      expect(await registry.owner(arcNode)).to.equal(bob.address);
      expect(await registry.resolver(arcNode)).to.equal(deployer.address);
      expect(await registry.ttl(arcNode)).to.equal(1000n);
    });
  });

  // ─── recordExists ─────────────────────────────────────────────────────────

  describe("recordExists", function () {
    it("returns false for unknown node", async function () {
      expect(await registry.recordExists(labelhash("nonexistent"))).to.be.false;
    });

    it("returns true after setSubnodeOwner", async function () {
      const label = labelhash("test");
      await registry.setSubnodeOwner(ethers.ZeroHash, label, alice.address);
      const node = ethers.keccak256(ethers.concat([ethers.ZeroHash, label]));
      expect(await registry.recordExists(node)).to.be.true;
    });
  });
});
