/**
 * SecurityFixes.test.js
 *
 * Focused tests for two Tier-1 ArcNS v3 security fixes:
 *   A) ArcNSReverseRegistrar.claimWithResolver — authorization guard
 *   B) ArcNSController.initialize — zero-address validation for all critical params
 *
 * These tests prove the fixes without expanding scope.
 */

const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");

// ─── Helpers ──────────────────────────────────────────────────────────────────

function labelhash(label) {
  return ethers.keccak256(ethers.toUtf8Bytes(label));
}

function reverseNodeFor(addr) {
  const ADDR_REVERSE_NODE = "0x91d1777781884d03a6757a803996e38de2a42967fb37eeaca72729271025a9e2";
  const hexAddr = addr.toLowerCase().slice(2);
  const labelHash = ethers.keccak256(ethers.toUtf8Bytes(hexAddr));
  return ethers.keccak256(ethers.concat([ADDR_REVERSE_NODE, labelHash]));
}

const ARC_NAMEHASH = "0x9a7ad1c5d8b1c60ef156c6723dbf462681d6462768a9e60c53665d7fc1337bae";

// ─── Shared fixture ───────────────────────────────────────────────────────────

async function deployBase() {
  const [deployer, alice, bob, stranger] = await ethers.getSigners();

  // Registry
  const Registry = await ethers.getContractFactory(
    "contracts/v3/registry/ArcNSRegistry.sol:ArcNSRegistry"
  );
  const registry = await Registry.deploy();
  await registry.waitForDeployment();

  // Resolver (UUPS proxy)
  const ResolverFactory = await ethers.getContractFactory(
    "contracts/v3/resolver/ArcNSResolver.sol:ArcNSResolver"
  );
  const resolver = await upgrades.deployProxy(
    ResolverFactory,
    [await registry.getAddress(), deployer.address],
    { kind: "uups", unsafeAllow: ["constructor"] }
  );
  await resolver.waitForDeployment();

  // ReverseRegistrar
  const ReverseRegistrar = await ethers.getContractFactory(
    "contracts/v3/registrar/ArcNSReverseRegistrar.sol:ArcNSReverseRegistrar"
  );
  const reverseRegistrar = await ReverseRegistrar.deploy(
    await registry.getAddress(),
    await resolver.getAddress()
  );
  await reverseRegistrar.waitForDeployment();

  // Grant CONTROLLER_ROLE on Resolver to ReverseRegistrar
  await resolver.connect(deployer).setController(await reverseRegistrar.getAddress(), true);

  // Set up addr.reverse node in Registry — assign to ReverseRegistrar
  const reverseLabel = labelhash("reverse");
  const addrLabel    = labelhash("addr");
  const reverseBaseNode = ethers.keccak256(ethers.concat([ethers.ZeroHash, reverseLabel]));
  await registry.setSubnodeOwner(ethers.ZeroHash, reverseLabel, deployer.address);
  await registry.setSubnodeOwner(reverseBaseNode, addrLabel, await reverseRegistrar.getAddress());

  return { registry, resolver, reverseRegistrar, deployer, alice, bob, stranger };
}

// ─── A) claimWithResolver authorization fix ───────────────────────────────────

describe("Security Fix A — claimWithResolver authorization", function () {
  let registry, resolver, reverseRegistrar;
  let deployer, alice, bob, stranger;

  beforeEach(async function () {
    ({ registry, resolver, reverseRegistrar, deployer, alice, bob, stranger } =
      await deployBase());
  });

  // ── Authorized paths (must still work) ──────────────────────────────────────

  describe("authorized caller paths", function () {
    it("addr claims their own reverse node (msg.sender == addr_)", async function () {
      // Alice claims her own reverse node — always authorized
      await expect(
        reverseRegistrar.connect(alice).claimWithResolver(
          alice.address,
          alice.address,
          await resolver.getAddress()
        )
      ).to.not.be.reverted;

      const rNode = reverseNodeFor(alice.address);
      expect(await registry.owner(rNode)).to.equal(alice.address);
      expect(await registry.resolver(rNode)).to.equal(await resolver.getAddress());
    });

    it("current reverse node owner can re-claim (msg.sender == registry.owner(node(addr_)))", async function () {
      // Alice first claims her own node, making herself the owner
      await reverseRegistrar.connect(alice).claimWithResolver(
        alice.address,
        alice.address,
        await resolver.getAddress()
      );

      // Now alice (as node owner) re-claims with a different owner assignment
      await expect(
        reverseRegistrar.connect(alice).claimWithResolver(
          alice.address,
          bob.address,
          await resolver.getAddress()
        )
      ).to.not.be.reverted;

      const rNode = reverseNodeFor(alice.address);
      expect(await registry.owner(rNode)).to.equal(bob.address);
    });

    it("deployer (who owns ADDR_REVERSE_NODE parent) cannot claim alice's node unless they own it", async function () {
      // Deployer does NOT own alice's specific reverse node — only the parent
      // This should revert because deployer != alice.address and deployer != owner(node(alice))
      await expect(
        reverseRegistrar.connect(deployer).claimWithResolver(
          alice.address,
          deployer.address,
          await resolver.getAddress()
        )
      ).to.be.revertedWithCustomError(reverseRegistrar, "NotAuthorised");
    });
  });

  // ── Unauthorized paths (must now revert) ────────────────────────────────────

  describe("unauthorized caller paths — must revert NotAuthorised", function () {
    it("stranger cannot hijack alice's reverse node", async function () {
      await expect(
        reverseRegistrar.connect(stranger).claimWithResolver(
          alice.address,
          stranger.address,
          await resolver.getAddress()
        )
      ).to.be.revertedWithCustomError(reverseRegistrar, "NotAuthorised");
    });

    it("bob cannot claim alice's reverse node even with alice as owner_", async function () {
      // Even if bob tries to be "nice" and set alice as owner, he's still unauthorized
      await expect(
        reverseRegistrar.connect(bob).claimWithResolver(
          alice.address,
          alice.address,
          await resolver.getAddress()
        )
      ).to.be.revertedWithCustomError(reverseRegistrar, "NotAuthorised");
    });

    it("stranger cannot claim alice's node after alice has already claimed it", async function () {
      // Alice claims first
      await reverseRegistrar.connect(alice).claimWithResolver(
        alice.address,
        alice.address,
        await resolver.getAddress()
      );

      // Stranger still cannot hijack — alice owns the node, not stranger
      await expect(
        reverseRegistrar.connect(stranger).claimWithResolver(
          alice.address,
          stranger.address,
          await resolver.getAddress()
        )
      ).to.be.revertedWithCustomError(reverseRegistrar, "NotAuthorised");
    });

    it("zero-address addr_ with stranger caller reverts", async function () {
      await expect(
        reverseRegistrar.connect(stranger).claimWithResolver(
          ethers.ZeroAddress,
          stranger.address,
          await resolver.getAddress()
        )
      ).to.be.revertedWithCustomError(reverseRegistrar, "NotAuthorised");
    });
  });

  // ── Unaffected flows (setName and setReverseRecord bypass the guard) ─────────

  describe("unaffected flows — setName and setReverseRecord still work", function () {
    it("setName still works for any user (calls _claimWithResolver directly)", async function () {
      await expect(
        reverseRegistrar.connect(alice).setName("alice.arc")
      ).to.not.be.reverted;

      const rNode = reverseNodeFor(alice.address);
      expect(await resolver.name(rNode)).to.equal("alice.arc");
    });

    it("setReverseRecord still works for any caller (Controller path)", async function () {
      // setReverseRecord is intentionally open — Controller wraps in try/catch
      await expect(
        reverseRegistrar.connect(stranger).setReverseRecord(alice.address, "alice.arc")
      ).to.not.be.reverted;

      const rNode = reverseNodeFor(alice.address);
      expect(await resolver.name(rNode)).to.equal("alice.arc");
    });
  });
});

// ─── B) ArcNSController.initialize zero-address fix ──────────────────────────

describe("Security Fix B — ArcNSController.initialize zero-address validation", function () {
  let registry, resolver, reverseRegistrar, registrar, oracle, usdc;
  let deployer, alice, treasury;

  beforeEach(async function () {
    ({ registry, resolver, reverseRegistrar, deployer, alice } = await deployBase());
    [deployer, alice, , treasury] = await ethers.getSigners();

    // BaseRegistrar
    const Registrar = await ethers.getContractFactory(
      "contracts/v3/registrar/ArcNSBaseRegistrar.sol:ArcNSBaseRegistrar"
    );
    registrar = await Registrar.deploy(await registry.getAddress(), ARC_NAMEHASH, "arc");
    await registrar.waitForDeployment();

    // PriceOracle
    const Oracle = await ethers.getContractFactory(
      "contracts/v3/registrar/ArcNSPriceOracle.sol:ArcNSPriceOracle"
    );
    oracle = await Oracle.deploy();
    await oracle.waitForDeployment();

    // MockUSDC
    const USDC = await ethers.getContractFactory(
      "contracts/v3/mocks/MockUSDC.sol:MockUSDC"
    );
    usdc = await USDC.deploy();
    await usdc.waitForDeployment();
  });

  // Helper: deploy a fresh controller proxy with overridden params
  async function deployController(overrides = {}) {
    const params = {
      base:             await registrar.getAddress(),
      priceOracle:      await oracle.getAddress(),
      usdc:             await usdc.getAddress(),
      registry:         await registry.getAddress(),
      resolver:         await resolver.getAddress(),
      reverseRegistrar: await reverseRegistrar.getAddress(),
      treasury:         treasury.address,
      admin:            deployer.address,
      ...overrides,
    };

    const ControllerFactory = await ethers.getContractFactory(
      "contracts/v3/controller/ArcNSController.sol:ArcNSController"
    );
    return upgrades.deployProxy(
      ControllerFactory,
      [
        params.base,
        params.priceOracle,
        params.usdc,
        params.registry,
        params.resolver,
        params.reverseRegistrar,
        params.treasury,
        params.admin,
      ],
      { kind: "uups", unsafeAllow: ["constructor"] }
    );
  }

  // ── Valid initialization ─────────────────────────────────────────────────────

  it("valid non-zero initialization succeeds", async function () {
    await expect(deployController()).to.not.be.reverted;
  });

  // ── Zero-address rejections ──────────────────────────────────────────────────

  it("zero base_ reverts ZeroAddress", async function () {
    await expect(
      deployController({ base: ethers.ZeroAddress })
    ).to.be.revertedWithCustomError(
      { interface: (await ethers.getContractFactory("contracts/v3/controller/ArcNSController.sol:ArcNSController")).interface },
      "ZeroAddress"
    );
  });

  it("zero priceOracle_ reverts ZeroAddress", async function () {
    await expect(
      deployController({ priceOracle: ethers.ZeroAddress })
    ).to.be.revertedWithCustomError(
      { interface: (await ethers.getContractFactory("contracts/v3/controller/ArcNSController.sol:ArcNSController")).interface },
      "ZeroAddress"
    );
  });

  it("zero usdc_ reverts ZeroAddress", async function () {
    await expect(
      deployController({ usdc: ethers.ZeroAddress })
    ).to.be.revertedWithCustomError(
      { interface: (await ethers.getContractFactory("contracts/v3/controller/ArcNSController.sol:ArcNSController")).interface },
      "ZeroAddress"
    );
  });

  it("zero registry_ reverts ZeroAddress", async function () {
    await expect(
      deployController({ registry: ethers.ZeroAddress })
    ).to.be.revertedWithCustomError(
      { interface: (await ethers.getContractFactory("contracts/v3/controller/ArcNSController.sol:ArcNSController")).interface },
      "ZeroAddress"
    );
  });

  it("zero resolver_ reverts ZeroAddress", async function () {
    await expect(
      deployController({ resolver: ethers.ZeroAddress })
    ).to.be.revertedWithCustomError(
      { interface: (await ethers.getContractFactory("contracts/v3/controller/ArcNSController.sol:ArcNSController")).interface },
      "ZeroAddress"
    );
  });

  it("zero reverseRegistrar_ reverts ZeroAddress", async function () {
    await expect(
      deployController({ reverseRegistrar: ethers.ZeroAddress })
    ).to.be.revertedWithCustomError(
      { interface: (await ethers.getContractFactory("contracts/v3/controller/ArcNSController.sol:ArcNSController")).interface },
      "ZeroAddress"
    );
  });

  it("zero treasury_ reverts ZeroAddress", async function () {
    await expect(
      deployController({ treasury: ethers.ZeroAddress })
    ).to.be.revertedWithCustomError(
      { interface: (await ethers.getContractFactory("contracts/v3/controller/ArcNSController.sol:ArcNSController")).interface },
      "ZeroAddress"
    );
  });

  it("zero admin_ reverts ZeroAddress", async function () {
    await expect(
      deployController({ admin: ethers.ZeroAddress })
    ).to.be.revertedWithCustomError(
      { interface: (await ethers.getContractFactory("contracts/v3/controller/ArcNSController.sol:ArcNSController")).interface },
      "ZeroAddress"
    );
  });
});
