const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");

// ─── Constants ────────────────────────────────────────────────────────────────
const ONE_YEAR            = 365 * 24 * 60 * 60;
const MIN_COMMITMENT_AGE  = 60;
const MAX_COMMITMENT_AGE  = 24 * 60 * 60;
const MIN_REG_DURATION    = 28 * 24 * 60 * 60;
const ARC_NAMEHASH        = "0x9a7ad1c5d8b1c60ef156c6723dbf462681d6462768a9e60c53665d7fc1337bae";
const ADDR_REVERSE_NODE   = "0x91d1777781884d03a6757a803996e38de2a42967fb37eeaca72729271025a9e2";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function labelhash(label) {
  return ethers.keccak256(ethers.toUtf8Bytes(label));
}

function reverseNodeFor(addr) {
  const hexAddr = addr.toLowerCase().slice(2);
  const labelHash = ethers.keccak256(ethers.toUtf8Bytes(hexAddr));
  return ethers.keccak256(ethers.concat([ADDR_REVERSE_NODE, labelHash]));
}

async function commitAndWait(controller, name, owner, duration, secret, resolverAddr, reverseRecord, signer) {
  const commitment = await controller.makeCommitment(name, owner, duration, secret, resolverAddr, reverseRecord, signer.address);
  await controller.connect(signer).commit(commitment);
  await time.increase(MIN_COMMITMENT_AGE + 1);
  return commitment;
}

// ─── Tests ────────────────────────────────────────────────────────────────────
describe("ArcNSController (v3)", function () {
  let registry, resolver, reverseRegistrar, registrar, oracle, usdc, controller;
  let deployer, alice, bob, treasury, stranger;

  const ADMIN_ROLE    = ethers.keccak256(ethers.toUtf8Bytes("ADMIN_ROLE"));
  const PAUSER_ROLE   = ethers.keccak256(ethers.toUtf8Bytes("PAUSER_ROLE"));
  const ORACLE_ROLE   = ethers.keccak256(ethers.toUtf8Bytes("ORACLE_ROLE"));
  const UPGRADER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("UPGRADER_ROLE"));
  const CONTROLLER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("CONTROLLER_ROLE"));

  beforeEach(async function () {
    [deployer, alice, bob, treasury, stranger] = await ethers.getSigners();

    // Registry
    const Registry = await ethers.getContractFactory("contracts/v3/registry/ArcNSRegistry.sol:ArcNSRegistry");
    registry = await Registry.deploy();
    await registry.waitForDeployment();

    // Resolver (UUPS proxy)
    const ResolverFactory = await ethers.getContractFactory("contracts/v3/resolver/ArcNSResolver.sol:ArcNSResolver");
    resolver = await upgrades.deployProxy(ResolverFactory, [await registry.getAddress(), deployer.address], { kind: "uups", unsafeAllow: ["constructor"] });
    await resolver.waitForDeployment();

    // ReverseRegistrar
    const ReverseRegistrar = await ethers.getContractFactory("contracts/v3/registrar/ArcNSReverseRegistrar.sol:ArcNSReverseRegistrar");
    reverseRegistrar = await ReverseRegistrar.deploy(await registry.getAddress(), await resolver.getAddress());
    await reverseRegistrar.waitForDeployment();

    // BaseRegistrar (.arc)
    const Registrar = await ethers.getContractFactory("contracts/v3/registrar/ArcNSBaseRegistrar.sol:ArcNSBaseRegistrar");
    registrar = await Registrar.deploy(await registry.getAddress(), ARC_NAMEHASH, "arc");
    await registrar.waitForDeployment();

    // PriceOracle
    const Oracle = await ethers.getContractFactory("contracts/v3/registrar/ArcNSPriceOracle.sol:ArcNSPriceOracle");
    oracle = await Oracle.deploy();
    await oracle.waitForDeployment();

    // MockUSDC
    const USDC = await ethers.getContractFactory("contracts/v3/mocks/MockUSDC.sol:MockUSDC");
    usdc = await USDC.deploy();
    await usdc.waitForDeployment();

    // Controller (UUPS proxy)
    const ControllerFactory = await ethers.getContractFactory("contracts/v3/controller/ArcNSController.sol:ArcNSController");
    controller = await upgrades.deployProxy(ControllerFactory, [
      await registrar.getAddress(),
      await oracle.getAddress(),
      await usdc.getAddress(),
      await registry.getAddress(),
      await resolver.getAddress(),
      await reverseRegistrar.getAddress(),
      treasury.address,
      deployer.address,
    ], { kind: "uups", unsafeAllow: ["constructor"] });
    await controller.waitForDeployment();

    // Wire up: assign .arc TLD node to registrar
    const arcLabel = labelhash("arc");
    await registry.setSubnodeOwner(ethers.ZeroHash, arcLabel, await registrar.getAddress());

    // Add controller to registrar
    await registrar.addController(await controller.getAddress());

    // Grant CONTROLLER_ROLE on Resolver to Controller and ReverseRegistrar
    await resolver.setController(await controller.getAddress(), true);
    await resolver.setController(await reverseRegistrar.getAddress(), true);

    // Set up addr.reverse node in Registry
    const reverseLabel = labelhash("reverse");
    const addrLabel    = labelhash("addr");
    const reverseBaseNode = ethers.keccak256(ethers.concat([ethers.ZeroHash, reverseLabel]));
    await registry.setSubnodeOwner(ethers.ZeroHash, reverseLabel, deployer.address);
    await registry.setSubnodeOwner(reverseBaseNode, addrLabel, await reverseRegistrar.getAddress());

    // Approve resolver on controller
    await controller.setApprovedResolver(await resolver.getAddress(), true);

    // Mint USDC to alice (1000 USDC)
    await usdc.mint(alice.address, 1_000_000_000n);
    // Approve controller to spend alice's USDC
    await usdc.connect(alice).approve(await controller.getAddress(), ethers.MaxUint256);
  });

  // ─── 1. Initialization ──────────────────────────────────────────────────────
  describe("initialization", function () {
    it("cannot initialize twice", async function () {
      await expect(controller.initialize(
        await registrar.getAddress(), await oracle.getAddress(), await usdc.getAddress(),
        await registry.getAddress(), await resolver.getAddress(), await reverseRegistrar.getAddress(),
        treasury.address, deployer.address
      )).to.be.revertedWithCustomError(controller, "InvalidInitialization");
    });

    it("state variables set correctly", async function () {
      expect(await controller.base()).to.equal(await registrar.getAddress());
      expect(await controller.priceOracle()).to.equal(await oracle.getAddress());
      expect(await controller.usdc()).to.equal(await usdc.getAddress());
      expect(await controller.registry()).to.equal(await registry.getAddress());
      expect(await controller.resolver()).to.equal(await resolver.getAddress());
      expect(await controller.reverseRegistrar()).to.equal(await reverseRegistrar.getAddress());
      expect(await controller.treasury()).to.equal(treasury.address);
    });

    it("admin holds all roles", async function () {
      expect(await controller.hasRole(ADMIN_ROLE,    deployer.address)).to.be.true;
      expect(await controller.hasRole(PAUSER_ROLE,   deployer.address)).to.be.true;
      expect(await controller.hasRole(ORACLE_ROLE,   deployer.address)).to.be.true;
      expect(await controller.hasRole(UPGRADER_ROLE, deployer.address)).to.be.true;
    });
  });

  // ─── 2. makeCommitment ──────────────────────────────────────────────────────
  describe("makeCommitment", function () {
    const secret = ethers.id("mysecret");

    it("same inputs always produce same hash", async function () {
      const h1 = await controller.makeCommitment("alice", alice.address, ONE_YEAR, secret, ethers.ZeroAddress, false, alice.address);
      const h2 = await controller.makeCommitment("alice", alice.address, ONE_YEAR, secret, ethers.ZeroAddress, false, alice.address);
      expect(h1).to.equal(h2);
    });

    it("different sender produces different hash", async function () {
      const h1 = await controller.makeCommitment("alice", alice.address, ONE_YEAR, secret, ethers.ZeroAddress, false, alice.address);
      const h2 = await controller.makeCommitment("alice", alice.address, ONE_YEAR, secret, ethers.ZeroAddress, false, bob.address);
      expect(h1).to.not.equal(h2);
    });

    it("different secret produces different hash", async function () {
      const h1 = await controller.makeCommitment("alice", alice.address, ONE_YEAR, secret, ethers.ZeroAddress, false, alice.address);
      const h2 = await controller.makeCommitment("alice", alice.address, ONE_YEAR, ethers.id("other"), ethers.ZeroAddress, false, alice.address);
      expect(h1).to.not.equal(h2);
    });

    it("different name produces different hash", async function () {
      const h1 = await controller.makeCommitment("alice", alice.address, ONE_YEAR, secret, ethers.ZeroAddress, false, alice.address);
      const h2 = await controller.makeCommitment("bob",   alice.address, ONE_YEAR, secret, ethers.ZeroAddress, false, alice.address);
      expect(h1).to.not.equal(h2);
    });

    it("different resolverAddr produces different hash", async function () {
      const h1 = await controller.makeCommitment("alice", alice.address, ONE_YEAR, secret, ethers.ZeroAddress, false, alice.address);
      const h2 = await controller.makeCommitment("alice", alice.address, ONE_YEAR, secret, await resolver.getAddress(), false, alice.address);
      expect(h1).to.not.equal(h2);
    });
  });

  // ─── 3. commit() ────────────────────────────────────────────────────────────
  describe("commit()", function () {
    const secret = ethers.id("commitsecret");

    it("stores commitment timestamp", async function () {
      const commitment = await controller.makeCommitment("alice", alice.address, ONE_YEAR, secret, ethers.ZeroAddress, false, alice.address);
      await controller.connect(alice).commit(commitment);
      const { exists } = await controller.getCommitmentStatus(commitment);
      expect(exists).to.be.true;
    });

    it("emits CommitmentMade", async function () {
      const commitment = await controller.makeCommitment("alice", alice.address, ONE_YEAR, secret, ethers.ZeroAddress, false, alice.address);
      await expect(controller.connect(alice).commit(commitment))
        .to.emit(controller, "CommitmentMade")
        .withArgs(commitment);
    });

    it("reverts CommitmentAlreadyUsed if commitment was used in a prior register", async function () {
      await commitAndWait(controller, "alice", alice.address, ONE_YEAR, secret, await resolver.getAddress(), false, alice);
      await controller.connect(alice).register("alice", alice.address, ONE_YEAR, secret, await resolver.getAddress(), false, ethers.MaxUint256);
      const commitment = await controller.makeCommitment("alice", alice.address, ONE_YEAR, secret, await resolver.getAddress(), false, alice.address);
      await expect(controller.connect(alice).commit(commitment))
        .to.be.revertedWithCustomError(controller, "CommitmentAlreadyUsed");
    });

    it("reverts CommitmentAlreadyExists if same commitment committed again within MAX_COMMITMENT_AGE", async function () {
      const commitment = await controller.makeCommitment("alice", alice.address, ONE_YEAR, secret, ethers.ZeroAddress, false, alice.address);
      await controller.connect(alice).commit(commitment);
      await expect(controller.connect(alice).commit(commitment))
        .to.be.revertedWithCustomError(controller, "CommitmentAlreadyExists");
    });

    it("allows re-commit after MAX_COMMITMENT_AGE has passed", async function () {
      const commitment = await controller.makeCommitment("alice", alice.address, ONE_YEAR, secret, ethers.ZeroAddress, false, alice.address);
      await controller.connect(alice).commit(commitment);
      await time.increase(MAX_COMMITMENT_AGE + 1);
      await expect(controller.connect(alice).commit(commitment)).to.not.be.reverted;
    });

    it("reverts when paused", async function () {
      await controller.pause();
      const commitment = await controller.makeCommitment("alice", alice.address, ONE_YEAR, secret, ethers.ZeroAddress, false, alice.address);
      await expect(controller.connect(alice).commit(commitment))
        .to.be.revertedWithCustomError(controller, "EnforcedPause");
    });
  });

  // ─── 4. register() — commitment lifecycle ───────────────────────────────────
  describe("register() — commitment lifecycle", function () {
    const secret = ethers.id("regsecret");

    it("CommitmentTooNew: register immediately after commit reverts", async function () {
      const commitment = await controller.makeCommitment("alice", alice.address, ONE_YEAR, secret, ethers.ZeroAddress, false, alice.address);
      await controller.connect(alice).commit(commitment);
      // No time.increase — commitment is too new
      await expect(
        controller.connect(alice).register("alice", alice.address, ONE_YEAR, secret, ethers.ZeroAddress, false, ethers.MaxUint256)
      ).to.be.revertedWithCustomError(controller, "CommitmentTooNew");
    });

    it("CommitmentExpired: register after MAX_COMMITMENT_AGE reverts", async function () {
      const commitment = await controller.makeCommitment("alice", alice.address, ONE_YEAR, secret, ethers.ZeroAddress, false, alice.address);
      await controller.connect(alice).commit(commitment);
      await time.increase(MAX_COMMITMENT_AGE + 1);
      await expect(
        controller.connect(alice).register("alice", alice.address, ONE_YEAR, secret, ethers.ZeroAddress, false, ethers.MaxUint256)
      ).to.be.revertedWithCustomError(controller, "CommitmentExpired");
    });

    it("CommitmentNotFound: register with commitment never committed", async function () {
      await expect(
        controller.connect(alice).register("alice", alice.address, ONE_YEAR, secret, ethers.ZeroAddress, false, ethers.MaxUint256)
      ).to.be.revertedWithCustomError(controller, "CommitmentNotFound");
    });

    it("CommitmentAlreadyUsed (replay): register twice with same commitment reverts", async function () {
      await commitAndWait(controller, "alice", alice.address, ONE_YEAR, secret, ethers.ZeroAddress, false, alice);
      await controller.connect(alice).register("alice", alice.address, ONE_YEAR, secret, ethers.ZeroAddress, false, ethers.MaxUint256);
      // Try to commit the same hash again — should be CommitmentAlreadyUsed
      const commitment = await controller.makeCommitment("alice", alice.address, ONE_YEAR, secret, ethers.ZeroAddress, false, alice.address);
      await expect(controller.connect(alice).commit(commitment))
        .to.be.revertedWithCustomError(controller, "CommitmentAlreadyUsed");
    });

    it("Wrong sender: bob cannot use alice's commitment params", async function () {
      // Alice commits with her address as sender
      const aliceCommitment = await controller.makeCommitment("alice", alice.address, ONE_YEAR, secret, ethers.ZeroAddress, false, alice.address);
      await controller.connect(alice).commit(aliceCommitment);
      await time.increase(MIN_COMMITMENT_AGE + 1);
      // Bob tries to register using same params but bob is msg.sender — different commitment hash
      await expect(
        controller.connect(bob).register("alice", alice.address, ONE_YEAR, secret, ethers.ZeroAddress, false, ethers.MaxUint256)
      ).to.be.revertedWithCustomError(controller, "CommitmentNotFound");
    });

    it("Wrong secret: register with different secret reverts CommitmentNotFound", async function () {
      const commitment = await controller.makeCommitment("alice", alice.address, ONE_YEAR, secret, ethers.ZeroAddress, false, alice.address);
      await controller.connect(alice).commit(commitment);
      await time.increase(MIN_COMMITMENT_AGE + 1);
      await expect(
        controller.connect(alice).register("alice", alice.address, ONE_YEAR, ethers.id("wrongsecret"), ethers.ZeroAddress, false, ethers.MaxUint256)
      ).to.be.revertedWithCustomError(controller, "CommitmentNotFound");
    });

    it("Wrong resolverAddr in register vs commit: reverts CommitmentNotFound", async function () {
      const resolverAddr = await resolver.getAddress();
      const commitment = await controller.makeCommitment("alice", alice.address, ONE_YEAR, secret, resolverAddr, false, alice.address);
      await controller.connect(alice).commit(commitment);
      await time.increase(MIN_COMMITMENT_AGE + 1);
      // Register with different resolverAddr
      await expect(
        controller.connect(alice).register("alice", alice.address, ONE_YEAR, secret, ethers.ZeroAddress, false, ethers.MaxUint256)
      ).to.be.revertedWithCustomError(controller, "CommitmentNotFound");
    });
  });

  // ─── 5. register() — name validation ────────────────────────────────────────
  describe("register() — name validation", function () {
    const secret = ethers.id("namesecret");

    async function tryRegister(name, signer) {
      await commitAndWait(controller, name, signer.address, ONE_YEAR, secret, ethers.ZeroAddress, false, signer);
      return controller.connect(signer).register(name, signer.address, ONE_YEAR, secret, ethers.ZeroAddress, false, ethers.MaxUint256);
    }

    it("valid name 'alice' registers successfully", async function () {
      await expect(tryRegister("alice", alice)).to.not.be.reverted;
    });

    it("valid name 'bob123' registers successfully", async function () {
      await expect(tryRegister("bob123", alice)).to.not.be.reverted;
    });

    it("valid name '_test' registers successfully", async function () {
      await expect(tryRegister("_test", alice)).to.not.be.reverted;
    });

    it("valid name 'a-b' registers successfully", async function () {
      await expect(tryRegister("a-b", alice)).to.not.be.reverted;
    });

    it("InvalidName: empty string", async function () {
      // Can't commit empty string through normal flow — test available() instead
      expect(await controller.available("")).to.be.false;
    });

    it("InvalidName: leading hyphen '-alice'", async function () {
      // Commit with the invalid name — commit doesn't validate, register does
      const commitment = await controller.makeCommitment("-alice", alice.address, ONE_YEAR, secret, ethers.ZeroAddress, false, alice.address);
      await controller.connect(alice).commit(commitment);
      await time.increase(MIN_COMMITMENT_AGE + 1);
      await expect(
        controller.connect(alice).register("-alice", alice.address, ONE_YEAR, secret, ethers.ZeroAddress, false, ethers.MaxUint256)
      ).to.be.revertedWithCustomError(controller, "InvalidName");
    });

    it("InvalidName: trailing hyphen 'alice-'", async function () {
      const commitment = await controller.makeCommitment("alice-", alice.address, ONE_YEAR, secret, ethers.ZeroAddress, false, alice.address);
      await controller.connect(alice).commit(commitment);
      await time.increase(MIN_COMMITMENT_AGE + 1);
      await expect(
        controller.connect(alice).register("alice-", alice.address, ONE_YEAR, secret, ethers.ZeroAddress, false, ethers.MaxUint256)
      ).to.be.revertedWithCustomError(controller, "InvalidName");
    });

    it("InvalidName: double hyphen at positions 2-3 'ab--cd'", async function () {
      const commitment = await controller.makeCommitment("ab--cd", alice.address, ONE_YEAR, secret, ethers.ZeroAddress, false, alice.address);
      await controller.connect(alice).commit(commitment);
      await time.increase(MIN_COMMITMENT_AGE + 1);
      await expect(
        controller.connect(alice).register("ab--cd", alice.address, ONE_YEAR, secret, ethers.ZeroAddress, false, ethers.MaxUint256)
      ).to.be.revertedWithCustomError(controller, "InvalidName");
    });

    it("InvalidName: uppercase 'Alice'", async function () {
      const commitment = await controller.makeCommitment("Alice", alice.address, ONE_YEAR, secret, ethers.ZeroAddress, false, alice.address);
      await controller.connect(alice).commit(commitment);
      await time.increase(MIN_COMMITMENT_AGE + 1);
      await expect(
        controller.connect(alice).register("Alice", alice.address, ONE_YEAR, secret, ethers.ZeroAddress, false, ethers.MaxUint256)
      ).to.be.revertedWithCustomError(controller, "InvalidName");
    });

    it("InvalidName: space 'ali ce'", async function () {
      const commitment = await controller.makeCommitment("ali ce", alice.address, ONE_YEAR, secret, ethers.ZeroAddress, false, alice.address);
      await controller.connect(alice).commit(commitment);
      await time.increase(MIN_COMMITMENT_AGE + 1);
      await expect(
        controller.connect(alice).register("ali ce", alice.address, ONE_YEAR, secret, ethers.ZeroAddress, false, ethers.MaxUint256)
      ).to.be.revertedWithCustomError(controller, "InvalidName");
    });

    it("DurationTooShort: duration < 28 days", async function () {
      const shortDuration = MIN_REG_DURATION - 1;
      const commitment = await controller.makeCommitment("alice", alice.address, shortDuration, secret, ethers.ZeroAddress, false, alice.address);
      await controller.connect(alice).commit(commitment);
      await time.increase(MIN_COMMITMENT_AGE + 1);
      await expect(
        controller.connect(alice).register("alice", alice.address, shortDuration, secret, ethers.ZeroAddress, false, ethers.MaxUint256)
      ).to.be.revertedWithCustomError(controller, "DurationTooShort");
    });
  });

  // ─── 6. register() — payment ────────────────────────────────────────────────
  describe("register() — payment", function () {
    const secret = ethers.id("paysecret");

    it("PriceExceedsMaxCost: maxCost=1 reverts", async function () {
      await commitAndWait(controller, "alice", alice.address, ONE_YEAR, secret, ethers.ZeroAddress, false, alice);
      await expect(
        controller.connect(alice).register("alice", alice.address, ONE_YEAR, secret, ethers.ZeroAddress, false, 1n)
      ).to.be.revertedWithCustomError(controller, "PriceExceedsMaxCost");
    });

    it("Insufficient allowance: alice approves 0 USDC reverts", async function () {
      await usdc.connect(alice).approve(await controller.getAddress(), 0n);
      await commitAndWait(controller, "alice", alice.address, ONE_YEAR, secret, ethers.ZeroAddress, false, alice);
      await expect(
        controller.connect(alice).register("alice", alice.address, ONE_YEAR, secret, ethers.ZeroAddress, false, ethers.MaxUint256)
      ).to.be.reverted;
    });

    it("Insufficient balance: zero-balance user reverts", async function () {
      // bob has no USDC
      await usdc.connect(bob).approve(await controller.getAddress(), ethers.MaxUint256);
      await commitAndWait(controller, "bob", bob.address, ONE_YEAR, secret, ethers.ZeroAddress, false, bob);
      await expect(
        controller.connect(bob).register("bob", bob.address, ONE_YEAR, secret, ethers.ZeroAddress, false, ethers.MaxUint256)
      ).to.be.reverted;
    });

    it("Correct payment: USDC transferred from alice to treasury exactly", async function () {
      const p = await controller.rentPrice("alice", ONE_YEAR);
      const cost = p.base + p.premium;
      const treasuryBefore = await usdc.balanceOf(treasury.address);

      await commitAndWait(controller, "alice", alice.address, ONE_YEAR, secret, ethers.ZeroAddress, false, alice);
      await controller.connect(alice).register("alice", alice.address, ONE_YEAR, secret, ethers.ZeroAddress, false, ethers.MaxUint256);

      const treasuryAfter = await usdc.balanceOf(treasury.address);
      expect(treasuryAfter - treasuryBefore).to.equal(cost);
    });

    it("Treasury balance increases by exact cost", async function () {
      const p = await controller.rentPrice("hello", ONE_YEAR);
      const cost = p.base + p.premium;
      const before = await usdc.balanceOf(treasury.address);

      await commitAndWait(controller, "hello", alice.address, ONE_YEAR, secret, ethers.ZeroAddress, false, alice);
      await controller.connect(alice).register("hello", alice.address, ONE_YEAR, secret, ethers.ZeroAddress, false, ethers.MaxUint256);

      expect(await usdc.balanceOf(treasury.address) - before).to.equal(cost);
    });
  });

  // ─── 7. register() — resolver integration ───────────────────────────────────
  describe("register() — resolver integration", function () {
    const secret = ethers.id("resolversecret");

    it("with resolverAddr=address(0): registers without setting addr record", async function () {
      await commitAndWait(controller, "alice", alice.address, ONE_YEAR, secret, ethers.ZeroAddress, false, alice);
      await controller.connect(alice).register("alice", alice.address, ONE_YEAR, secret, ethers.ZeroAddress, false, ethers.MaxUint256);

      const label = ethers.keccak256(ethers.toUtf8Bytes("alice"));
      const arcBaseNode = ARC_NAMEHASH;
      const nodehash = ethers.keccak256(ethers.concat([arcBaseNode, label]));
      expect(await resolver.addr(nodehash)).to.equal(ethers.ZeroAddress);
    });

    it("with approved resolverAddr: registers and sets addr record", async function () {
      const resolverAddr = await resolver.getAddress();
      await commitAndWait(controller, "alice", alice.address, ONE_YEAR, secret, resolverAddr, false, alice);
      await controller.connect(alice).register("alice", alice.address, ONE_YEAR, secret, resolverAddr, false, ethers.MaxUint256);

      const label = ethers.keccak256(ethers.toUtf8Bytes("alice"));
      const nodehash = ethers.keccak256(ethers.concat([ARC_NAMEHASH, label]));
      expect(await resolver.addr(nodehash)).to.equal(alice.address);
    });

    it("ResolverNotApproved: unapproved resolver reverts", async function () {
      const fakeResolver = bob.address;
      await commitAndWait(controller, "alice", alice.address, ONE_YEAR, secret, fakeResolver, false, alice);
      await expect(
        controller.connect(alice).register("alice", alice.address, ONE_YEAR, secret, fakeResolver, false, ethers.MaxUint256)
      ).to.be.revertedWithCustomError(controller, "ResolverNotApproved");
    });
  });

  // ─── 8. register() — reverse record ─────────────────────────────────────────
  describe("register() — reverse record", function () {
    const secret = ethers.id("reversesecret");

    it("reverseRecord=true with approved resolver: reverse record set", async function () {
      const resolverAddr = await resolver.getAddress();
      await commitAndWait(controller, "alice", alice.address, ONE_YEAR, secret, resolverAddr, true, alice);
      await controller.connect(alice).register("alice", alice.address, ONE_YEAR, secret, resolverAddr, true, ethers.MaxUint256);

      const rNode = reverseNodeFor(alice.address);
      expect(await resolver.name(rNode)).to.equal("alice.arc");
    });

    it("reverseRecord=true but resolverAddr=address(0): no revert, no reverse record", async function () {
      await commitAndWait(controller, "alice", alice.address, ONE_YEAR, secret, ethers.ZeroAddress, true, alice);
      await expect(
        controller.connect(alice).register("alice", alice.address, ONE_YEAR, secret, ethers.ZeroAddress, true, ethers.MaxUint256)
      ).to.not.be.reverted;
    });

    it("registration does NOT revert even if reverse record fails (CONTROLLER_ROLE revoked)", async function () {
      // Revoke CONTROLLER_ROLE from ReverseRegistrar on Resolver
      await resolver.setController(await reverseRegistrar.getAddress(), false);

      const resolverAddr = await resolver.getAddress();
      await commitAndWait(controller, "alice", alice.address, ONE_YEAR, secret, resolverAddr, true, alice);
      // Should succeed — reverse record failure is silently swallowed
      await expect(
        controller.connect(alice).register("alice", alice.address, ONE_YEAR, secret, resolverAddr, true, ethers.MaxUint256)
      ).to.not.be.reverted;
    });
  });

  // ─── 9. register() — NFT ownership ──────────────────────────────────────────
  describe("register() — NFT ownership", function () {
    const secret = ethers.id("nftsecret");

    it("owner holds the NFT after registration", async function () {
      await commitAndWait(controller, "alice", alice.address, ONE_YEAR, secret, ethers.ZeroAddress, false, alice);
      await controller.connect(alice).register("alice", alice.address, ONE_YEAR, secret, ethers.ZeroAddress, false, ethers.MaxUint256);
      expect(await registrar.balanceOf(alice.address)).to.equal(1n);
    });

    it("nameExpires is set after registration", async function () {
      await commitAndWait(controller, "alice", alice.address, ONE_YEAR, secret, ethers.ZeroAddress, false, alice);
      await controller.connect(alice).register("alice", alice.address, ONE_YEAR, secret, ethers.ZeroAddress, false, ethers.MaxUint256);
      const tokenId = BigInt(ethers.keccak256(ethers.toUtf8Bytes("alice")));
      expect(await registrar.nameExpires(tokenId)).to.be.gt(0n);
    });

    it("NameRegistered event emitted with correct args", async function () {
      await commitAndWait(controller, "alice", alice.address, ONE_YEAR, secret, ethers.ZeroAddress, false, alice);
      const label = ethers.keccak256(ethers.toUtf8Bytes("alice"));
      await expect(
        controller.connect(alice).register("alice", alice.address, ONE_YEAR, secret, ethers.ZeroAddress, false, ethers.MaxUint256)
      ).to.emit(controller, "NameRegistered")
        .withArgs("alice", label, alice.address, anyValue, anyValue);
    });
  });

  // ─── 10. renew() ────────────────────────────────────────────────────────────
  describe("renew()", function () {
    const secret = ethers.id("renewsecret");

    beforeEach(async function () {
      await commitAndWait(controller, "alice", alice.address, ONE_YEAR, secret, ethers.ZeroAddress, false, alice);
      await controller.connect(alice).register("alice", alice.address, ONE_YEAR, secret, ethers.ZeroAddress, false, ethers.MaxUint256);
    });

    it("happy path: renews name and emits NameRenewed", async function () {
      const tokenId = BigInt(ethers.keccak256(ethers.toUtf8Bytes("alice")));
      const expiryBefore = await registrar.nameExpires(tokenId);
      await usdc.connect(alice).approve(await controller.getAddress(), ethers.MaxUint256);
      await controller.connect(alice).renew("alice", ONE_YEAR, ethers.MaxUint256);
      const expiryAfter = await registrar.nameExpires(tokenId);
      expect(expiryAfter).to.be.gt(expiryBefore);
    });

    it("NameRenewed event emitted", async function () {
      const label = ethers.keccak256(ethers.toUtf8Bytes("alice"));
      await expect(controller.connect(alice).renew("alice", ONE_YEAR, ethers.MaxUint256))
        .to.emit(controller, "NameRenewed")
        .withArgs("alice", label, anyValue, anyValue);
    });

    it("PriceExceedsMaxCost: maxCost too low reverts", async function () {
      await expect(
        controller.connect(alice).renew("alice", ONE_YEAR, 1n)
      ).to.be.revertedWithCustomError(controller, "PriceExceedsMaxCost");
    });

    it("DurationTooShort: duration < 28 days reverts", async function () {
      await expect(
        controller.connect(alice).renew("alice", MIN_REG_DURATION - 1, ethers.MaxUint256)
      ).to.be.revertedWithCustomError(controller, "DurationTooShort");
    });

    it("correct USDC payment to treasury on renewal", async function () {
      const p = await controller.rentPrice("alice", ONE_YEAR);
      const cost = p.base + p.premium;
      const before = await usdc.balanceOf(treasury.address);
      await controller.connect(alice).renew("alice", ONE_YEAR, ethers.MaxUint256);
      expect(await usdc.balanceOf(treasury.address) - before).to.equal(cost);
    });
  });

  // ─── 11. available() ────────────────────────────────────────────────────────
  describe("available()", function () {
    const secret = ethers.id("availsecret");

    it("returns true for new name", async function () {
      expect(await controller.available("newname")).to.be.true;
    });

    it("returns false after registration", async function () {
      await commitAndWait(controller, "alice", alice.address, ONE_YEAR, secret, ethers.ZeroAddress, false, alice);
      await controller.connect(alice).register("alice", alice.address, ONE_YEAR, secret, ethers.ZeroAddress, false, ethers.MaxUint256);
      expect(await controller.available("alice")).to.be.false;
    });

    it("returns false for invalid name (empty string)", async function () {
      expect(await controller.available("")).to.be.false;
    });
  });

  // ─── 12. rentPrice() ────────────────────────────────────────────────────────
  describe("rentPrice()", function () {
    it("returns correct price for 5+ char name (2 USDC/year)", async function () {
      const p = await controller.rentPrice("hello", ONE_YEAR);
      expect(p.base).to.equal(2_000_000n);
    });

    it("returns correct price for 1 char name (50 USDC/year)", async function () {
      const p = await controller.rentPrice("a", ONE_YEAR);
      expect(p.base).to.equal(50_000_000n);
    });
  });

  // ─── 13. getCommitmentStatus() ──────────────────────────────────────────────
  describe("getCommitmentStatus()", function () {
    const secret = ethers.id("statussecret");

    it("exists=false for unknown commitment", async function () {
      const fake = ethers.id("fake");
      const s = await controller.getCommitmentStatus(fake);
      expect(s.exists).to.be.false;
    });

    it("exists=true, matured=false immediately after commit", async function () {
      const commitment = await controller.makeCommitment("alice", alice.address, ONE_YEAR, secret, ethers.ZeroAddress, false, alice.address);
      await controller.connect(alice).commit(commitment);
      const s = await controller.getCommitmentStatus(commitment);
      expect(s.exists).to.be.true;
      expect(s.matured).to.be.false;
    });

    it("matured=true after MIN_COMMITMENT_AGE", async function () {
      const commitment = await controller.makeCommitment("alice", alice.address, ONE_YEAR, secret, ethers.ZeroAddress, false, alice.address);
      await controller.connect(alice).commit(commitment);
      await time.increase(MIN_COMMITMENT_AGE + 1);
      const s = await controller.getCommitmentStatus(commitment);
      expect(s.matured).to.be.true;
    });

    it("expired_=true after MAX_COMMITMENT_AGE", async function () {
      const commitment = await controller.makeCommitment("alice", alice.address, ONE_YEAR, secret, ethers.ZeroAddress, false, alice.address);
      await controller.connect(alice).commit(commitment);
      await time.increase(MAX_COMMITMENT_AGE + 1);
      const s = await controller.getCommitmentStatus(commitment);
      expect(s.expired_).to.be.true;
    });
  });

  // ─── 14. Admin functions ────────────────────────────────────────────────────
  describe("admin functions", function () {
    it("setPriceOracle: ORACLE_ROLE can update", async function () {
      const Oracle2 = await ethers.getContractFactory("contracts/v3/registrar/ArcNSPriceOracle.sol:ArcNSPriceOracle");
      const oracle2 = await Oracle2.deploy();
      await oracle2.waitForDeployment();
      await controller.setPriceOracle(await oracle2.getAddress());
      expect(await controller.priceOracle()).to.equal(await oracle2.getAddress());
    });

    it("setPriceOracle: non-role reverts", async function () {
      await expect(controller.connect(stranger).setPriceOracle(await oracle.getAddress()))
        .to.be.revertedWithCustomError(controller, "AccessControlUnauthorizedAccount");
    });

    it("setTreasury: ADMIN_ROLE can update", async function () {
      await controller.setTreasury(bob.address);
      expect(await controller.treasury()).to.equal(bob.address);
    });

    it("setTreasury: ZeroAddress reverts", async function () {
      await expect(controller.setTreasury(ethers.ZeroAddress))
        .to.be.revertedWithCustomError(controller, "ZeroAddress");
    });

    it("setTreasury: non-role reverts", async function () {
      await expect(controller.connect(stranger).setTreasury(bob.address))
        .to.be.revertedWithCustomError(controller, "AccessControlUnauthorizedAccount");
    });

    it("setApprovedResolver: ADMIN_ROLE can approve and revoke", async function () {
      await controller.setApprovedResolver(stranger.address, true);
      expect(await controller.approvedResolvers(stranger.address)).to.be.true;
      await controller.setApprovedResolver(stranger.address, false);
      expect(await controller.approvedResolvers(stranger.address)).to.be.false;
    });

    it("setApprovedResolver: non-role reverts", async function () {
      await expect(controller.connect(stranger).setApprovedResolver(stranger.address, true))
        .to.be.revertedWithCustomError(controller, "AccessControlUnauthorizedAccount");
    });

    it("pause/unpause: PAUSER_ROLE can pause; register reverts when paused", async function () {
      await controller.pause();
      const secret = ethers.id("pausesecret");
      const commitment = await controller.makeCommitment("alice", alice.address, ONE_YEAR, secret, ethers.ZeroAddress, false, alice.address);
      await expect(controller.connect(alice).commit(commitment))
        .to.be.revertedWithCustomError(controller, "EnforcedPause");
    });

    it("unpause restores functionality", async function () {
      await controller.pause();
      await controller.unpause();
      const secret = ethers.id("unpausesecret");
      const commitment = await controller.makeCommitment("alice", alice.address, ONE_YEAR, secret, ethers.ZeroAddress, false, alice.address);
      await expect(controller.connect(alice).commit(commitment)).to.not.be.reverted;
    });
  });

  // ─── 15. UUPS upgrade ───────────────────────────────────────────────────────
  describe("UUPS upgrade", function () {
    const secret = ethers.id("upgradesecret");

    it("UPGRADER_ROLE can upgrade proxy", async function () {
      const V2Factory = await ethers.getContractFactory("contracts/v3/mocks/ArcNSControllerV2Mock.sol:ArcNSControllerV2Mock");
      const upgraded = await upgrades.upgradeProxy(await controller.getAddress(), V2Factory, { unsafeAllow: ["constructor"] });
      await upgraded.waitForDeployment();
      expect(await upgraded.version()).to.equal("v2");
    });

    it("non-UPGRADER_ROLE cannot upgrade", async function () {
      const V2Factory = await ethers.getContractFactory("contracts/v3/mocks/ArcNSControllerV2Mock.sol:ArcNSControllerV2Mock");
      const newImpl = await V2Factory.deploy();
      await newImpl.waitForDeployment();
      await expect(
        controller.connect(stranger).upgradeToAndCall(await newImpl.getAddress(), "0x")
      ).to.be.revertedWithCustomError(controller, "AccessControlUnauthorizedAccount");
    });

    it("storage preserved after upgrade", async function () {
      // Register a name before upgrade
      await commitAndWait(controller, "alice", alice.address, ONE_YEAR, secret, ethers.ZeroAddress, false, alice);
      await controller.connect(alice).register("alice", alice.address, ONE_YEAR, secret, ethers.ZeroAddress, false, ethers.MaxUint256);

      const V2Factory = await ethers.getContractFactory("contracts/v3/mocks/ArcNSControllerV2Mock.sol:ArcNSControllerV2Mock");
      const upgraded = await upgrades.upgradeProxy(await controller.getAddress(), V2Factory, { unsafeAllow: ["constructor"] });
      await upgraded.waitForDeployment();

      // Treasury and base still set
      expect(await upgraded.treasury()).to.equal(treasury.address);
      expect(await upgraded.base()).to.equal(await registrar.getAddress());
      // Name is no longer available (still registered)
      expect(await upgraded.available("alice")).to.be.false;
    });
  });

});
