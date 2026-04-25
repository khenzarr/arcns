const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("ArcNSResolver (v3)", function () {
  let registry, resolver;
  let deployer, alice, bob, controller, stranger;

  const ADMIN_ROLE      = ethers.keccak256(ethers.toUtf8Bytes("ADMIN_ROLE"));
  const CONTROLLER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("CONTROLLER_ROLE"));
  const UPGRADER_ROLE   = ethers.keccak256(ethers.toUtf8Bytes("UPGRADER_ROLE"));

  beforeEach(async function () {
    [deployer, alice, bob, controller, stranger] = await ethers.getSigners();

    // Deploy Registry
    const Registry = await ethers.getContractFactory(
      "contracts/v3/registry/ArcNSRegistry.sol:ArcNSRegistry"
    );
    registry = await Registry.deploy();
    await registry.waitForDeployment();

    // Deploy Resolver as UUPS proxy
    const ResolverFactory = await ethers.getContractFactory(
      "contracts/v3/resolver/ArcNSResolver.sol:ArcNSResolver"
    );
    resolver = await upgrades.deployProxy(
      ResolverFactory,
      [await registry.getAddress(), deployer.address],
      { kind: "uups", unsafeAllow: ["constructor"] }
    );
    await resolver.waitForDeployment();

    // Grant CONTROLLER_ROLE to controller signer
    await resolver.connect(deployer).setController(controller.address, true);
  });

  // ─── 1. Initialization ────────────────────────────────────────────────────

  describe("initialization", function () {
    it("initialize cannot be called twice", async function () {
      await expect(
        resolver.initialize(await registry.getAddress(), deployer.address)
      ).to.be.revertedWithCustomError(resolver, "InvalidInitialization");
    });

    it("registry is set correctly", async function () {
      expect(await resolver.registry()).to.equal(await registry.getAddress());
    });

    it("deployer holds ADMIN_ROLE", async function () {
      expect(await resolver.hasRole(ADMIN_ROLE, deployer.address)).to.be.true;
    });

    it("deployer holds UPGRADER_ROLE", async function () {
      expect(await resolver.hasRole(UPGRADER_ROLE, deployer.address)).to.be.true;
    });

    it("deployer holds DEFAULT_ADMIN_ROLE", async function () {
      const DEFAULT_ADMIN_ROLE = ethers.ZeroHash;
      expect(await resolver.hasRole(DEFAULT_ADMIN_ROLE, deployer.address)).to.be.true;
    });
  });

  // ─── 2. setAddr / addr ────────────────────────────────────────────────────

  describe("setAddr / addr", function () {
    let arcNode;

    beforeEach(async function () {
      // Give alice ownership of alice.arc node
      const arcLabel = labelhash("arc");
      await registry.setSubnodeOwner(ethers.ZeroHash, arcLabel, deployer.address);
      const arcBaseNode = ethers.keccak256(ethers.concat([ethers.ZeroHash, arcLabel]));

      const aliceLabel = labelhash("alice");
      await registry.setSubnodeOwner(arcBaseNode, aliceLabel, alice.address);
      arcNode = ethers.keccak256(ethers.concat([arcBaseNode, aliceLabel]));
    });

    it("node owner can call setAddr and addr returns the set value", async function () {
      await resolver.connect(alice).setAddr(arcNode, alice.address);
      expect(await resolver.addr(arcNode)).to.equal(alice.address);
    });

    it("approved operator can call setAddr", async function () {
      await registry.connect(alice).setApprovalForAll(bob.address, true);
      await resolver.connect(bob).setAddr(arcNode, bob.address);
      expect(await resolver.addr(arcNode)).to.equal(bob.address);
    });

    it("CONTROLLER_ROLE holder can call setAddr", async function () {
      await resolver.connect(controller).setAddr(arcNode, alice.address);
      expect(await resolver.addr(arcNode)).to.equal(alice.address);
    });

    it("unauthorized caller reverts with NotAuthorised", async function () {
      await expect(
        resolver.connect(stranger).setAddr(arcNode, stranger.address)
      ).to.be.revertedWithCustomError(resolver, "NotAuthorised");
    });

    it("addr returns address(0) for unset node", async function () {
      const unsetNode = labelhash("unset");
      expect(await resolver.addr(unsetNode)).to.equal(ethers.ZeroAddress);
    });

    it("AddrChanged event emitted with correct args", async function () {
      await expect(resolver.connect(alice).setAddr(arcNode, alice.address))
        .to.emit(resolver, "AddrChanged")
        .withArgs(arcNode, alice.address);
    });

    it("round-trip: setAddr then addr returns the same address", async function () {
      await resolver.connect(alice).setAddr(arcNode, alice.address);
      const result = await resolver.addr(arcNode);
      expect(result).to.equal(alice.address);
    });

    it("setAddr can overwrite a previous value", async function () {
      await resolver.connect(alice).setAddr(arcNode, alice.address);
      await resolver.connect(alice).setAddr(arcNode, bob.address);
      expect(await resolver.addr(arcNode)).to.equal(bob.address);
    });
  });

  // ─── 3. setName (internal path) ───────────────────────────────────────────

  describe("setName (internal path)", function () {
    const testNode = ethers.keccak256(ethers.toUtf8Bytes("test-reverse-node"));

    it("CONTROLLER_ROLE holder can call setName", async function () {
      await resolver.connect(controller).setName(testNode, "alice.arc");
      expect(await resolver.name(testNode)).to.equal("alice.arc");
    });

    it("non-CONTROLLER_ROLE caller reverts with AccessControlUnauthorizedAccount", async function () {
      await expect(
        resolver.connect(stranger).setName(testNode, "alice.arc")
      ).to.be.revertedWithCustomError(resolver, "AccessControlUnauthorizedAccount");
    });

    it("name(node) returns the set value after setName", async function () {
      await resolver.connect(controller).setName(testNode, "bob.arc");
      expect(await resolver.name(testNode)).to.equal("bob.arc");
    });

    it("NameChanged event emitted with correct args", async function () {
      await expect(resolver.connect(controller).setName(testNode, "alice.arc"))
        .to.emit(resolver, "NameChanged")
        .withArgs(testNode, "alice.arc");
    });

    it("name returns empty string for unset node", async function () {
      const unsetNode = labelhash("unset-name");
      expect(await resolver.name(unsetNode)).to.equal("");
    });
  });

  // ─── 4. setController ─────────────────────────────────────────────────────

  describe("setController", function () {
    it("ADMIN_ROLE holder can grant CONTROLLER_ROLE via setController(addr, true)", async function () {
      await resolver.connect(deployer).setController(stranger.address, true);
      expect(await resolver.hasRole(CONTROLLER_ROLE, stranger.address)).to.be.true;
    });

    it("ADMIN_ROLE holder can revoke CONTROLLER_ROLE via setController(addr, false)", async function () {
      await resolver.connect(deployer).setController(controller.address, false);
      expect(await resolver.hasRole(CONTROLLER_ROLE, controller.address)).to.be.false;
    });

    it("non-ADMIN_ROLE caller reverts", async function () {
      await expect(
        resolver.connect(stranger).setController(stranger.address, true)
      ).to.be.revertedWithCustomError(resolver, "AccessControlUnauthorizedAccount");
    });
  });

  // ─── 5. UUPS upgrade ──────────────────────────────────────────────────────

  describe("UUPS upgrade", function () {
    let arcNode;

    beforeEach(async function () {
      // Set up a node with an addr record to test storage continuity
      const arcLabel = labelhash("arc");
      await registry.setSubnodeOwner(ethers.ZeroHash, arcLabel, deployer.address);
      const arcBaseNode = ethers.keccak256(ethers.concat([ethers.ZeroHash, arcLabel]));
      const aliceLabel = labelhash("alice");
      await registry.setSubnodeOwner(arcBaseNode, aliceLabel, alice.address);
      arcNode = ethers.keccak256(ethers.concat([arcBaseNode, aliceLabel]));

      await resolver.connect(alice).setAddr(arcNode, alice.address);
    });

    it("UPGRADER_ROLE holder can upgrade the proxy to a new implementation", async function () {
      const V2Factory = await ethers.getContractFactory(
        "contracts/v3/mocks/ArcNSResolverV2Mock.sol:ArcNSResolverV2Mock"
      );
      const upgraded = await upgrades.upgradeProxy(await resolver.getAddress(), V2Factory, {
        unsafeAllow: ["constructor"],
      });
      await upgraded.waitForDeployment();

      expect(await upgraded.version()).to.equal("v2");
    });

    it("after upgrade, version() returns 'v2' and existing addr records are preserved", async function () {
      const V2Factory = await ethers.getContractFactory(
        "contracts/v3/mocks/ArcNSResolverV2Mock.sol:ArcNSResolverV2Mock"
      );
      const upgraded = await upgrades.upgradeProxy(await resolver.getAddress(), V2Factory, {
        unsafeAllow: ["constructor"],
      });
      await upgraded.waitForDeployment();

      expect(await upgraded.version()).to.equal("v2");
      expect(await upgraded.addr(arcNode)).to.equal(alice.address);
    });

    it("non-UPGRADER_ROLE caller cannot upgrade", async function () {
      const V2Factory = await ethers.getContractFactory(
        "contracts/v3/mocks/ArcNSResolverV2Mock.sol:ArcNSResolverV2Mock"
      );
      const newImpl = await V2Factory.deploy();
      await newImpl.waitForDeployment();

      // Attempt upgrade directly via the proxy as a non-upgrader
      const resolverAsStranger = resolver.connect(stranger);
      await expect(
        resolverAsStranger.upgradeToAndCall(await newImpl.getAddress(), "0x")
      ).to.be.revertedWithCustomError(resolver, "AccessControlUnauthorizedAccount");
    });
  });

  // ─── 6. Storage layout ────────────────────────────────────────────────────

  describe("storage layout", function () {
    it("after upgrade, previously set addr records are still readable", async function () {
      const arcLabel = labelhash("arc");
      await registry.setSubnodeOwner(ethers.ZeroHash, arcLabel, deployer.address);
      const arcBaseNode = ethers.keccak256(ethers.concat([ethers.ZeroHash, arcLabel]));
      const aliceLabel = labelhash("alice");
      await registry.setSubnodeOwner(arcBaseNode, aliceLabel, alice.address);
      const arcNode = ethers.keccak256(ethers.concat([arcBaseNode, aliceLabel]));

      await resolver.connect(alice).setAddr(arcNode, alice.address);

      const V2Factory = await ethers.getContractFactory(
        "contracts/v3/mocks/ArcNSResolverV2Mock.sol:ArcNSResolverV2Mock"
      );
      const upgraded = await upgrades.upgradeProxy(await resolver.getAddress(), V2Factory, {
        unsafeAllow: ["constructor"],
      });
      await upgraded.waitForDeployment();

      // Storage is preserved across upgrade
      expect(await upgraded.addr(arcNode)).to.equal(alice.address);
      expect(await upgraded.registry()).to.equal(await registry.getAddress());
    });
  });
});
