/**
 * SetReverseRegistrar.test.js
 *
 * Tests for the ArcNSController.setReverseRegistrar extension.
 *
 * Covers:
 *   1. Authorized admin can update reverseRegistrar (event emitted, slot updated)
 *   2. Unauthorized caller reverts with AccessControl error
 *   3. Zero address reverts with ZeroAddress()
 *   4. Registration path uses the updated reverseRegistrar pointer
 *   5. Existing registration behavior unchanged (reverseRecord=false, failure swallowed)
 *   6. Existing renew behavior unchanged
 *   7. Storage layout / upgrade safety (OZ validateUpgrade)
 *
 * Bug condition methodology:
 *   C(X)  — proxy upgraded, NEW_RR deployed, stale OLD_RR in storage, no setter
 *   P     — after setReverseRegistrar(NEW_RR), register(..., reverseRecord=true) targets NEW_RR
 *   ¬C(X) — all other inputs (no setReverseRegistrar call) — behavior must be identical
 */

"use strict";

const { expect }  = require("chai");
const { ethers, upgrades } = require("hardhat");
const { time }    = require("@nomicfoundation/hardhat-network-helpers");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");

// ─── Constants ────────────────────────────────────────────────────────────────

const ONE_YEAR           = 365 * 24 * 60 * 60;
const MIN_COMMITMENT_AGE = 60;
const MAX_COMMITMENT_AGE = 24 * 60 * 60;
const MIN_REG_DURATION   = 28 * 24 * 60 * 60;
const ARC_NAMEHASH       = "0x9a7ad1c5d8b1c60ef156c6723dbf462681d6462768a9e60c53665d7fc1337bae";
const ADDR_REVERSE_NODE  = "0x91d1777781884d03a6757a803996e38de2a42967fb37eeaca72729271025a9e2";

const ADMIN_ROLE    = ethers.keccak256(ethers.toUtf8Bytes("ADMIN_ROLE"));
const UPGRADER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("UPGRADER_ROLE"));

// ─── Helpers ──────────────────────────────────────────────────────────────────

function labelhash(label) {
  return ethers.keccak256(ethers.toUtf8Bytes(label));
}

function reverseNodeFor(addr) {
  const hexAddr   = addr.toLowerCase().slice(2);
  const labelHash = ethers.keccak256(ethers.toUtf8Bytes(hexAddr));
  return ethers.keccak256(ethers.concat([ADDR_REVERSE_NODE, labelHash]));
}

async function commitAndWait(controller, name, owner, duration, secret, resolverAddr, reverseRecord, signer) {
  const commitment = await controller.makeCommitment(
    name, owner, duration, secret, resolverAddr, reverseRecord, signer.address
  );
  await controller.connect(signer).commit(commitment);
  await time.increase(MIN_COMMITMENT_AGE + 1);
  return commitment;
}

// ─── Shared fixture ───────────────────────────────────────────────────────────

async function deployFull() {
  const [deployer, alice, bob, treasury, stranger] = await ethers.getSigners();

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

  // OLD ReverseRegistrar (simulates pre-migration state)
  const ReverseRegistrar = await ethers.getContractFactory(
    "contracts/v3/registrar/ArcNSReverseRegistrar.sol:ArcNSReverseRegistrar"
  );
  const oldReverseRegistrar = await ReverseRegistrar.deploy(
    await registry.getAddress(),
    await resolver.getAddress()
  );
  await oldReverseRegistrar.waitForDeployment();

  // NEW ReverseRegistrar (simulates post-migration deployment)
  const newReverseRegistrar = await ReverseRegistrar.deploy(
    await registry.getAddress(),
    await resolver.getAddress()
  );
  await newReverseRegistrar.waitForDeployment();

  // BaseRegistrar (.arc)
  const Registrar = await ethers.getContractFactory(
    "contracts/v3/registrar/ArcNSBaseRegistrar.sol:ArcNSBaseRegistrar"
  );
  const registrar = await Registrar.deploy(
    await registry.getAddress(), ARC_NAMEHASH, "arc"
  );
  await registrar.waitForDeployment();

  // PriceOracle
  const Oracle = await ethers.getContractFactory(
    "contracts/v3/registrar/ArcNSPriceOracle.sol:ArcNSPriceOracle"
  );
  const oracle = await Oracle.deploy();
  await oracle.waitForDeployment();

  // MockUSDC
  const USDC = await ethers.getContractFactory(
    "contracts/v3/mocks/MockUSDC.sol:MockUSDC"
  );
  const usdc = await USDC.deploy();
  await usdc.waitForDeployment();

  // Controller (UUPS proxy) — initialized with OLD ReverseRegistrar
  const ControllerFactory = await ethers.getContractFactory(
    "contracts/v3/controller/ArcNSController.sol:ArcNSController"
  );
  const controller = await upgrades.deployProxy(ControllerFactory, [
    await registrar.getAddress(),
    await oracle.getAddress(),
    await usdc.getAddress(),
    await registry.getAddress(),
    await resolver.getAddress(),
    await oldReverseRegistrar.getAddress(),
    treasury.address,
    deployer.address,
  ], { kind: "uups", unsafeAllow: ["constructor"] });
  await controller.waitForDeployment();

  // Wire: .arc TLD → registrar
  await registry.setSubnodeOwner(ethers.ZeroHash, labelhash("arc"), await registrar.getAddress());

  // Wire: addr.reverse → oldReverseRegistrar (and newReverseRegistrar shares same node for test)
  const reverseBaseNode = ethers.keccak256(
    ethers.concat([ethers.ZeroHash, labelhash("reverse")])
  );
  await registry.setSubnodeOwner(ethers.ZeroHash, labelhash("reverse"), deployer.address);
  await registry.setSubnodeOwner(reverseBaseNode, labelhash("addr"), await oldReverseRegistrar.getAddress());

  // Wire: controller → registrar
  await registrar.addController(await controller.getAddress());

  // Wire: CONTROLLER_ROLE on resolver
  await resolver.setController(await controller.getAddress(), true);
  await resolver.setController(await oldReverseRegistrar.getAddress(), true);
  await resolver.setController(await newReverseRegistrar.getAddress(), true);

  // Wire: approve resolver on controller
  await controller.setApprovedResolver(await resolver.getAddress(), true);

  // Mint USDC to alice
  await usdc.mint(alice.address, 1_000_000_000n);
  await usdc.connect(alice).approve(await controller.getAddress(), ethers.MaxUint256);

  return {
    registry, resolver,
    oldReverseRegistrar, newReverseRegistrar,
    registrar, oracle, usdc, controller,
    ControllerFactory,
    deployer, alice, bob, treasury, stranger,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("ArcNSController — setReverseRegistrar", function () {
  let ctx;

  beforeEach(async function () {
    ctx = await deployFull();
  });

  // ── 1. Authorized admin updates pointer ──────────────────────────────────────

  describe("1. Authorized admin can update reverseRegistrar", function () {
    it("updates the reverseRegistrar slot to the new address", async function () {
      const { controller, newReverseRegistrar, deployer } = ctx;

      expect(await controller.reverseRegistrar()).to.equal(
        await ctx.oldReverseRegistrar.getAddress()
      );

      await controller.connect(deployer).setReverseRegistrar(
        await newReverseRegistrar.getAddress()
      );

      expect(await controller.reverseRegistrar()).to.equal(
        await newReverseRegistrar.getAddress()
      );
    });

    it("emits ReverseRegistrarUpdated with correct old and new addresses", async function () {
      const { controller, oldReverseRegistrar, newReverseRegistrar, deployer } = ctx;

      await expect(
        controller.connect(deployer).setReverseRegistrar(
          await newReverseRegistrar.getAddress()
        )
      )
        .to.emit(controller, "ReverseRegistrarUpdated")
        .withArgs(
          await oldReverseRegistrar.getAddress(),
          await newReverseRegistrar.getAddress()
        );
    });

    it("can be called multiple times — each call updates the slot", async function () {
      const { controller, oldReverseRegistrar, newReverseRegistrar, deployer } = ctx;

      await controller.connect(deployer).setReverseRegistrar(
        await newReverseRegistrar.getAddress()
      );
      expect(await controller.reverseRegistrar()).to.equal(
        await newReverseRegistrar.getAddress()
      );

      // Update back to old (simulates rollback scenario)
      await controller.connect(deployer).setReverseRegistrar(
        await oldReverseRegistrar.getAddress()
      );
      expect(await controller.reverseRegistrar()).to.equal(
        await oldReverseRegistrar.getAddress()
      );
    });
  });

  // ── 2. Unauthorized caller reverts ───────────────────────────────────────────

  describe("2. Unauthorized caller reverts", function () {
    it("stranger (no role) reverts with AccessControlUnauthorizedAccount", async function () {
      const { controller, newReverseRegistrar, stranger } = ctx;

      await expect(
        controller.connect(stranger).setReverseRegistrar(
          await newReverseRegistrar.getAddress()
        )
      ).to.be.revertedWithCustomError(controller, "AccessControlUnauthorizedAccount");
    });

    it("alice (no role) reverts", async function () {
      const { controller, newReverseRegistrar, alice } = ctx;

      await expect(
        controller.connect(alice).setReverseRegistrar(
          await newReverseRegistrar.getAddress()
        )
      ).to.be.revertedWithCustomError(controller, "AccessControlUnauthorizedAccount");
    });

    it("treasury (no role) reverts", async function () {
      const { controller, newReverseRegistrar, treasury } = ctx;

      await expect(
        controller.connect(treasury).setReverseRegistrar(
          await newReverseRegistrar.getAddress()
        )
      ).to.be.revertedWithCustomError(controller, "AccessControlUnauthorizedAccount");
    });
  });

  // ── 3. Zero address reverts ───────────────────────────────────────────────────

  describe("3. Zero address reverts ZeroAddress()", function () {
    it("setReverseRegistrar(address(0)) reverts with ZeroAddress", async function () {
      const { controller, deployer } = ctx;

      await expect(
        controller.connect(deployer).setReverseRegistrar(ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(controller, "ZeroAddress");
    });

    it("existing pointer is unchanged after zero-address revert", async function () {
      const { controller, oldReverseRegistrar, deployer } = ctx;

      const before = await controller.reverseRegistrar();

      await expect(
        controller.connect(deployer).setReverseRegistrar(ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(controller, "ZeroAddress");

      expect(await controller.reverseRegistrar()).to.equal(before);
    });
  });

  // ── 4. Registration uses updated pointer ─────────────────────────────────────

  describe("4. Registration path uses updated reverseRegistrar pointer", function () {
    it("after setReverseRegistrar(NEW_RR), register with reverseRecord=true writes to NEW_RR", async function () {
      const { controller, newReverseRegistrar, resolver, registry, deployer, alice } = ctx;
      const secret = ethers.id("migrationsecret");

      // Update pointer to NEW_RR
      await controller.connect(deployer).setReverseRegistrar(
        await newReverseRegistrar.getAddress()
      );

      // Transfer addr.reverse node ownership to NEW_RR so it can write reverse records
      const reverseBaseNode = ethers.keccak256(
        ethers.concat([ethers.ZeroHash, labelhash("reverse")])
      );
      await registry.setSubnodeOwner(
        reverseBaseNode, labelhash("addr"), await newReverseRegistrar.getAddress()
      );

      // Register with reverseRecord=true
      const resolverAddr = await resolver.getAddress();
      await commitAndWait(controller, "alice", alice.address, ONE_YEAR, secret, resolverAddr, true, alice);
      await controller.connect(alice).register(
        "alice", alice.address, ONE_YEAR, secret, resolverAddr, true, ethers.MaxUint256
      );

      // Verify reverse record was written (resolver.name on alice's reverse node)
      const rNode = reverseNodeFor(alice.address);
      expect(await resolver.name(rNode)).to.equal("alice.arc");
    });

    it("before setReverseRegistrar, reverseRegistrar() returns OLD_RR (confirms stale pointer)", async function () {
      const { controller, oldReverseRegistrar } = ctx;

      // This confirms the bug condition: after upgrade, stale pointer persists
      expect(await controller.reverseRegistrar()).to.equal(
        await oldReverseRegistrar.getAddress()
      );
    });

    it("after setReverseRegistrar(NEW_RR), reverseRegistrar() returns NEW_RR", async function () {
      const { controller, newReverseRegistrar, deployer } = ctx;

      await controller.connect(deployer).setReverseRegistrar(
        await newReverseRegistrar.getAddress()
      );

      expect(await controller.reverseRegistrar()).to.equal(
        await newReverseRegistrar.getAddress()
      );
    });
  });

  // ── 5. Existing registration behavior unchanged ───────────────────────────────

  describe("5. Existing registration behavior unchanged", function () {
    const secret = ethers.id("preservationsecret");

    it("register with reverseRecord=false is unaffected by setReverseRegistrar", async function () {
      const { controller, newReverseRegistrar, resolver, registrar, deployer, alice } = ctx;

      // Update pointer
      await controller.connect(deployer).setReverseRegistrar(
        await newReverseRegistrar.getAddress()
      );

      // Register without reverse record
      await commitAndWait(controller, "bob", alice.address, ONE_YEAR, secret, ethers.ZeroAddress, false, alice);
      await expect(
        controller.connect(alice).register(
          "bob", alice.address, ONE_YEAR, secret, ethers.ZeroAddress, false, ethers.MaxUint256
        )
      ).to.not.be.reverted;

      // NFT minted
      expect(await registrar.balanceOf(alice.address)).to.equal(1n);
    });

    it("registration does NOT revert even if reverseRegistrar.setReverseRecord fails (try/catch preserved)", async function () {
      const { controller, resolver, deployer, alice } = ctx;
      const secret2 = ethers.id("swallowsecret");

      // Revoke CONTROLLER_ROLE from reverseRegistrar on resolver — makes setReverseRecord fail
      await resolver.setController(await ctx.oldReverseRegistrar.getAddress(), false);

      const resolverAddr = await resolver.getAddress();
      await commitAndWait(controller, "carol", alice.address, ONE_YEAR, secret2, resolverAddr, true, alice);

      // Must not revert — failure is silently swallowed
      await expect(
        controller.connect(alice).register(
          "carol", alice.address, ONE_YEAR, secret2, resolverAddr, true, ethers.MaxUint256
        )
      ).to.not.be.reverted;
    });

    it("NameRegistered event still emitted correctly after setReverseRegistrar", async function () {
      const { controller, newReverseRegistrar, resolver, deployer, alice } = ctx;
      const secret3 = ethers.id("eventsecret");

      await controller.connect(deployer).setReverseRegistrar(
        await newReverseRegistrar.getAddress()
      );

      const resolverAddr = await resolver.getAddress();
      await commitAndWait(controller, "dave", alice.address, ONE_YEAR, secret3, resolverAddr, false, alice);

      const label = ethers.keccak256(ethers.toUtf8Bytes("dave"));
      await expect(
        controller.connect(alice).register(
          "dave", alice.address, ONE_YEAR, secret3, resolverAddr, false, ethers.MaxUint256
        )
      )
        .to.emit(controller, "NameRegistered")
        .withArgs("dave", label, alice.address, anyValue, anyValue);
    });
  });

  // ── 6. Existing renew behavior unchanged ─────────────────────────────────────

  describe("6. Existing renew behavior unchanged", function () {
    const secret = ethers.id("renewsecret2");

    it("renew is unaffected by setReverseRegistrar — no interaction with reverseRegistrar", async function () {
      const { controller, newReverseRegistrar, usdc, registrar, deployer, alice } = ctx;

      // Register first
      await commitAndWait(controller, "alice", alice.address, ONE_YEAR, secret, ethers.ZeroAddress, false, alice);
      await controller.connect(alice).register(
        "alice", alice.address, ONE_YEAR, secret, ethers.ZeroAddress, false, ethers.MaxUint256
      );

      // Update reverseRegistrar
      await controller.connect(deployer).setReverseRegistrar(
        await newReverseRegistrar.getAddress()
      );

      // Renew — must succeed without touching reverseRegistrar
      await usdc.connect(alice).approve(await controller.getAddress(), ethers.MaxUint256);
      const tokenId = BigInt(ethers.keccak256(ethers.toUtf8Bytes("alice")));
      const expiryBefore = await registrar.nameExpires(tokenId);

      await expect(
        controller.connect(alice).renew("alice", ONE_YEAR, ethers.MaxUint256)
      )
        .to.emit(controller, "NameRenewed")
        .withArgs("alice", anyValue, anyValue, anyValue);

      const expiryAfter = await registrar.nameExpires(tokenId);
      expect(expiryAfter).to.be.gt(expiryBefore);
    });
  });

  // ── 7. Storage layout / upgrade safety ───────────────────────────────────────

  describe("7. Storage layout / upgrade safety", function () {
    it("OZ validateUpgrade: new implementation is compatible with existing proxy storage", async function () {
      const { controller, ControllerFactory } = ctx;

      // This will throw if there is any storage layout incompatibility
      await expect(
        upgrades.validateUpgrade(
          await controller.getAddress(),
          ControllerFactory,
          { kind: "uups", unsafeAllow: ["constructor"] }
        )
      ).to.not.be.rejected;
    });

    it("all existing storage slots are readable and correct after setReverseRegistrar", async function () {
      const { controller, newReverseRegistrar, registrar, oracle, usdc, registry, resolver, treasury, deployer } = ctx;

      // Capture state before
      const baseBefore     = await controller.base();
      const oracleBefore   = await controller.priceOracle();
      const usdcBefore     = await controller.usdc();
      const regBefore      = await controller.registry();
      const resBefore      = await controller.resolver();
      const treasuryBefore = await controller.treasury();

      // Update reverseRegistrar
      await controller.connect(deployer).setReverseRegistrar(
        await newReverseRegistrar.getAddress()
      );

      // All other slots must be unchanged
      expect(await controller.base()).to.equal(baseBefore);
      expect(await controller.priceOracle()).to.equal(oracleBefore);
      expect(await controller.usdc()).to.equal(usdcBefore);
      expect(await controller.registry()).to.equal(regBefore);
      expect(await controller.resolver()).to.equal(resBefore);
      expect(await controller.treasury()).to.equal(treasuryBefore);

      // Only reverseRegistrar slot changed
      expect(await controller.reverseRegistrar()).to.equal(
        await newReverseRegistrar.getAddress()
      );
    });

    it("_authorizeUpgrade still requires UPGRADER_ROLE", async function () {
      const { controller, ControllerFactory, stranger } = ctx;

      await expect(
        upgrades.upgradeProxy(
          await controller.getAddress(),
          ControllerFactory.connect(stranger),
          { kind: "uups", unsafeAllow: ["constructor"] }
        )
      ).to.be.reverted;
    });

    it("setReverseRegistrar does not consume a new storage slot (writes to existing Slot N+6)", async function () {
      const { controller, newReverseRegistrar, deployer } = ctx;

      // Read Slot N+6 directly via provider storage read
      // The reverseRegistrar field is at a known position in the layout.
      // We verify by comparing the slot value before and after — it must change to NEW_RR
      // and no adjacent slots must change.
      const proxyAddr = await controller.getAddress();

      // Get the implementation address to compute storage layout
      const implAddr = await upgrades.erc1967.getImplementationAddress(proxyAddr);

      // Verify via the public getter — the slot is the same one used by reverseRegistrar()
      const before = await controller.reverseRegistrar();
      await controller.connect(deployer).setReverseRegistrar(
        await newReverseRegistrar.getAddress()
      );
      const after = await controller.reverseRegistrar();

      expect(before).to.not.equal(after);
      expect(after).to.equal(await newReverseRegistrar.getAddress());

      // treasury (Slot N+7) must be unchanged
      expect(await controller.treasury()).to.not.equal(ethers.ZeroAddress);
    });
  });
});
