/**
 * ArcNS v3 — Integration Tests
 *
 * End-to-end coverage for both .arc and .circle TLDs:
 *   - Full registration lifecycle (commit → wait → register)
 *   - Renewal and expiry
 *   - Replay rejection
 *   - Resolver addr flow
 *   - Reverse / primary name flow
 *   - Premium decay behavior
 *   - Grace period behavior
 *   - maxCost / payment protection
 *   - Deployment wiring verification
 */

"use strict";

const { expect }  = require("chai");
const { ethers, upgrades } = require("hardhat");
const { time }    = require("@nomicfoundation/hardhat-network-helpers");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");

// ─── Constants ────────────────────────────────────────────────────────────────
const ONE_YEAR           = 365 * 24 * 60 * 60;
const ONE_DAY            = 24 * 60 * 60;
const GRACE_PERIOD       = 90 * ONE_DAY;
const MIN_COMMIT_AGE     = 60;
const MAX_COMMIT_AGE     = 24 * 60 * 60;
const MIN_REG_DURATION   = 28 * ONE_DAY;
const PREMIUM_START      = 100_000_000n;
const PREMIUM_DECAY_DAYS = 28;

const ARC_NAMEHASH    = "0x9a7ad1c5d8b1c60ef156c6723dbf462681d6462768a9e60c53665d7fc1337bae";
const CIRCLE_NAMEHASH = "0xb3f3947bd9b363b1955fa597e342731ea6bde24d057527feb2cdfdeb807c2084";
const ADDR_REVERSE    = "0x91d1777781884d03a6757a803996e38de2a42967fb37eeaca72729271025a9e2";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function labelhash(label) {
  return ethers.keccak256(ethers.toUtf8Bytes(label));
}

function namehash(name) {
  let node = ethers.ZeroHash;
  if (name === "") return node;
  for (const label of name.split(".").reverse()) {
    node = ethers.keccak256(ethers.concat([node, labelhash(label)]));
  }
  return node;
}

function reverseNodeFor(addr) {
  const hex = addr.toLowerCase().slice(2);
  return ethers.keccak256(ethers.concat([ADDR_REVERSE, ethers.keccak256(ethers.toUtf8Bytes(hex))]));
}

async function commitAndWait(ctrl, name, owner, duration, secret, resolverAddr, reverseRecord, signer) {
  const c = await ctrl.makeCommitment(name, owner, duration, secret, resolverAddr, reverseRecord, signer.address);
  await ctrl.connect(signer).commit(c);
  await time.increase(MIN_COMMIT_AGE + 1);
  return c;
}

async function register(ctrl, name, owner, duration, secret, resolverAddr, reverseRecord, signer) {
  await commitAndWait(ctrl, name, owner, duration, secret, resolverAddr, reverseRecord, signer);
  await ctrl.connect(signer).register(name, owner, duration, secret, resolverAddr, reverseRecord, ethers.MaxUint256);
}

// ─── Shared fixture ───────────────────────────────────────────────────────────
async function deployAll() {
  const [deployer, alice, bob, treasury] = await ethers.getSigners();

  // Registry
  const Registry = await ethers.getContractFactory("contracts/v3/registry/ArcNSRegistry.sol:ArcNSRegistry");
  const registry = await Registry.deploy();
  await registry.waitForDeployment();

  // Resolver (UUPS)
  const ResolverF = await ethers.getContractFactory("contracts/v3/resolver/ArcNSResolver.sol:ArcNSResolver");
  const resolver = await upgrades.deployProxy(ResolverF, [await registry.getAddress(), deployer.address], { kind: "uups", unsafeAllow: ["constructor"] });
  await resolver.waitForDeployment();

  // PriceOracle
  const OracleF = await ethers.getContractFactory("contracts/v3/registrar/ArcNSPriceOracle.sol:ArcNSPriceOracle");
  const oracle = await OracleF.deploy();
  await oracle.waitForDeployment();

  // MockUSDC
  const USDCF = await ethers.getContractFactory("contracts/v3/mocks/MockUSDC.sol:MockUSDC");
  const usdc = await USDCF.deploy();
  await usdc.waitForDeployment();

  // BaseRegistrar .arc
  const RegF = await ethers.getContractFactory("contracts/v3/registrar/ArcNSBaseRegistrar.sol:ArcNSBaseRegistrar");
  const arcReg = await RegF.deploy(await registry.getAddress(), ARC_NAMEHASH, "arc");
  await arcReg.waitForDeployment();

  // BaseRegistrar .circle
  const circleReg = await RegF.deploy(await registry.getAddress(), CIRCLE_NAMEHASH, "circle");
  await circleReg.waitForDeployment();

  // ReverseRegistrar
  const RevF = await ethers.getContractFactory("contracts/v3/registrar/ArcNSReverseRegistrar.sol:ArcNSReverseRegistrar");
  const reverseReg = await RevF.deploy(await registry.getAddress(), await resolver.getAddress());
  await reverseReg.waitForDeployment();

  // Controller .arc (UUPS)
  const CtrlF = await ethers.getContractFactory("contracts/v3/controller/ArcNSController.sol:ArcNSController");
  const arcCtrl = await upgrades.deployProxy(CtrlF, [
    await arcReg.getAddress(), await oracle.getAddress(), await usdc.getAddress(),
    await registry.getAddress(), await resolver.getAddress(), await reverseReg.getAddress(),
    treasury.address, deployer.address,
  ], { kind: "uups", unsafeAllow: ["constructor"] });
  await arcCtrl.waitForDeployment();

  // Controller .circle (UUPS)
  const circleCtrl = await upgrades.deployProxy(CtrlF, [
    await circleReg.getAddress(), await oracle.getAddress(), await usdc.getAddress(),
    await registry.getAddress(), await resolver.getAddress(), await reverseReg.getAddress(),
    treasury.address, deployer.address,
  ], { kind: "uups", unsafeAllow: ["constructor"] });
  await circleCtrl.waitForDeployment();

  // ── Wire ──────────────────────────────────────────────────────────────────
  await registry.setSubnodeOwner(ethers.ZeroHash, labelhash("arc"),    await arcReg.getAddress());
  await registry.setSubnodeOwner(ethers.ZeroHash, labelhash("circle"), await circleReg.getAddress());
  await registry.setSubnodeOwner(ethers.ZeroHash, labelhash("reverse"), deployer.address);
  const reverseBase = namehash("reverse");
  await registry.setSubnodeOwner(reverseBase, labelhash("addr"), await reverseReg.getAddress());

  await arcReg.addController(await arcCtrl.getAddress());
  await circleReg.addController(await circleCtrl.getAddress());

  await resolver.setController(await arcCtrl.getAddress(),    true);
  await resolver.setController(await circleCtrl.getAddress(), true);
  await resolver.setController(await reverseReg.getAddress(), true);

  await arcCtrl.setApprovedResolver(await resolver.getAddress(),    true);
  await circleCtrl.setApprovedResolver(await resolver.getAddress(), true);

  // Mint USDC to alice and bob
  await usdc.mint(alice.address, 10_000_000_000n); // 10,000 USDC
  await usdc.mint(bob.address,   10_000_000_000n);
  await usdc.connect(alice).approve(await arcCtrl.getAddress(),    ethers.MaxUint256);
  await usdc.connect(alice).approve(await circleCtrl.getAddress(), ethers.MaxUint256);
  await usdc.connect(bob).approve(await arcCtrl.getAddress(),      ethers.MaxUint256);
  await usdc.connect(bob).approve(await circleCtrl.getAddress(),   ethers.MaxUint256);

  return { registry, resolver, oracle, usdc, arcReg, circleReg, reverseReg, arcCtrl, circleCtrl, deployer, alice, bob, treasury };
}

// ─── Test Suite ───────────────────────────────────────────────────────────────
describe("ArcNS v3 — Integration Tests", function () {
  let ctx;

  beforeEach(async function () {
    ctx = await deployAll();
  });

  // ── 1. Deployment wiring verification ──────────────────────────────────────
  describe("1. Deployment wiring", function () {
    it("arcRegistrar owns the .arc TLD node in registry", async function () {
      expect(await ctx.registry.owner(ARC_NAMEHASH)).to.equal(await ctx.arcReg.getAddress());
    });

    it("circleRegistrar owns the .circle TLD node in registry", async function () {
      expect(await ctx.registry.owner(CIRCLE_NAMEHASH)).to.equal(await ctx.circleReg.getAddress());
    });

    it("reverseRegistrar owns addr.reverse node in registry", async function () {
      expect(await ctx.registry.owner(ADDR_REVERSE)).to.equal(await ctx.reverseReg.getAddress());
    });

    it("arcController is authorized on arcRegistrar", async function () {
      expect(await ctx.arcReg.controllers(await ctx.arcCtrl.getAddress())).to.be.true;
    });

    it("circleController is authorized on circleRegistrar", async function () {
      expect(await ctx.circleReg.controllers(await ctx.circleCtrl.getAddress())).to.be.true;
    });

    it("arcController holds CONTROLLER_ROLE on resolver", async function () {
      const CONTROLLER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("CONTROLLER_ROLE"));
      expect(await ctx.resolver.hasRole(CONTROLLER_ROLE, await ctx.arcCtrl.getAddress())).to.be.true;
    });

    it("circleController holds CONTROLLER_ROLE on resolver", async function () {
      const CONTROLLER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("CONTROLLER_ROLE"));
      expect(await ctx.resolver.hasRole(CONTROLLER_ROLE, await ctx.circleCtrl.getAddress())).to.be.true;
    });

    it("reverseRegistrar holds CONTROLLER_ROLE on resolver", async function () {
      const CONTROLLER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("CONTROLLER_ROLE"));
      expect(await ctx.resolver.hasRole(CONTROLLER_ROLE, await ctx.reverseReg.getAddress())).to.be.true;
    });

    it("resolver is approved on arcController", async function () {
      expect(await ctx.arcCtrl.approvedResolvers(await ctx.resolver.getAddress())).to.be.true;
    });

    it("resolver is approved on circleController", async function () {
      expect(await ctx.circleCtrl.approvedResolvers(await ctx.resolver.getAddress())).to.be.true;
    });

    it("arcRegistrar is live (owns its baseNode)", async function () {
      expect(await ctx.registry.owner(ARC_NAMEHASH)).to.equal(await ctx.arcReg.getAddress());
    });

    it("circleRegistrar is live (owns its baseNode)", async function () {
      expect(await ctx.registry.owner(CIRCLE_NAMEHASH)).to.equal(await ctx.circleReg.getAddress());
    });
  });

  // ── 2. .arc registration lifecycle ─────────────────────────────────────────
  describe("2. .arc registration lifecycle", function () {
    const secret = ethers.id("arc-integration-secret");

    it("full commit → wait → register flow succeeds", async function () {
      await register(ctx.arcCtrl, "alice", ctx.alice.address, ONE_YEAR, secret, await ctx.resolver.getAddress(), false, ctx.alice);
      expect(await ctx.arcReg.balanceOf(ctx.alice.address)).to.equal(1n);
    });

    it("name is unavailable after registration", async function () {
      await register(ctx.arcCtrl, "alice", ctx.alice.address, ONE_YEAR, secret, ethers.ZeroAddress, false, ctx.alice);
      expect(await ctx.arcCtrl.available("alice")).to.be.false;
    });

    it("registry subnode owner is set to registrant", async function () {
      await register(ctx.arcCtrl, "alice", ctx.alice.address, ONE_YEAR, secret, ethers.ZeroAddress, false, ctx.alice);
      const node = namehash("alice.arc");
      expect(await ctx.registry.owner(node)).to.equal(ctx.alice.address);
    });

    it("NameRegistered event emitted", async function () {
      const label = labelhash("alice");
      await commitAndWait(ctx.arcCtrl, "alice", ctx.alice.address, ONE_YEAR, secret, ethers.ZeroAddress, false, ctx.alice);
      await expect(
        ctx.arcCtrl.connect(ctx.alice).register("alice", ctx.alice.address, ONE_YEAR, secret, ethers.ZeroAddress, false, ethers.MaxUint256)
      ).to.emit(ctx.arcCtrl, "NameRegistered").withArgs("alice", label, ctx.alice.address, anyValue, anyValue);
    });

    it("USDC payment flows to treasury", async function () {
      const p = await ctx.arcCtrl.rentPrice("alice", ONE_YEAR);
      const cost = p.base + p.premium;
      const before = await ctx.usdc.balanceOf(ctx.treasury.address);
      await register(ctx.arcCtrl, "alice", ctx.alice.address, ONE_YEAR, secret, ethers.ZeroAddress, false, ctx.alice);
      expect(await ctx.usdc.balanceOf(ctx.treasury.address) - before).to.equal(cost);
    });
  });

  // ── 3. .circle registration lifecycle ──────────────────────────────────────
  describe("3. .circle registration lifecycle", function () {
    const secret = ethers.id("circle-integration-secret");

    it("full commit → wait → register flow succeeds for .circle", async function () {
      await register(ctx.circleCtrl, "bob", ctx.bob.address, ONE_YEAR, secret, await ctx.resolver.getAddress(), false, ctx.bob);
      expect(await ctx.circleReg.balanceOf(ctx.bob.address)).to.equal(1n);
    });

    it(".circle name is unavailable after registration", async function () {
      await register(ctx.circleCtrl, "bob", ctx.bob.address, ONE_YEAR, secret, ethers.ZeroAddress, false, ctx.bob);
      expect(await ctx.circleCtrl.available("bob")).to.be.false;
    });

    it(".circle registry subnode owner is set correctly", async function () {
      await register(ctx.circleCtrl, "bob", ctx.bob.address, ONE_YEAR, secret, ethers.ZeroAddress, false, ctx.bob);
      const node = namehash("bob.circle");
      expect(await ctx.registry.owner(node)).to.equal(ctx.bob.address);
    });

    it(".arc and .circle are independent TLDs — same label can exist in both", async function () {
      const s2 = ethers.id("circle-s2");
      await register(ctx.arcCtrl,    "alice", ctx.alice.address, ONE_YEAR, secret, ethers.ZeroAddress, false, ctx.alice);
      await register(ctx.circleCtrl, "alice", ctx.alice.address, ONE_YEAR, s2,     ethers.ZeroAddress, false, ctx.alice);
      expect(await ctx.arcReg.balanceOf(ctx.alice.address)).to.equal(1n);
      expect(await ctx.circleReg.balanceOf(ctx.alice.address)).to.equal(1n);
    });
  });

  // ── 4. Resolver addr flow ───────────────────────────────────────────────────
  describe("4. Resolver addr flow", function () {
    const secret = ethers.id("resolver-secret");

    it("addr record set at registration time (.arc)", async function () {
      const resolverAddr = await ctx.resolver.getAddress();
      await register(ctx.arcCtrl, "alice", ctx.alice.address, ONE_YEAR, secret, resolverAddr, false, ctx.alice);
      const node = namehash("alice.arc");
      expect(await ctx.resolver.addr(node)).to.equal(ctx.alice.address);
    });

    it("addr record set at registration time (.circle)", async function () {
      const resolverAddr = await ctx.resolver.getAddress();
      const s2 = ethers.id("circle-resolver-secret");
      await register(ctx.circleCtrl, "bob", ctx.bob.address, ONE_YEAR, s2, resolverAddr, false, ctx.bob);
      const node = namehash("bob.circle");
      expect(await ctx.resolver.addr(node)).to.equal(ctx.bob.address);
    });

    it("forward resolution: namehash → registry.resolver → resolver.addr", async function () {
      const resolverAddr = await ctx.resolver.getAddress();
      await register(ctx.arcCtrl, "alice", ctx.alice.address, ONE_YEAR, secret, resolverAddr, false, ctx.alice);
      const node = namehash("alice.arc");
      const resolverFromRegistry = await ctx.registry.resolver(node);
      expect(resolverFromRegistry).to.equal(resolverAddr);
      expect(await ctx.resolver.addr(node)).to.equal(ctx.alice.address);
    });

    it("addr returns address(0) when no resolver set", async function () {
      await register(ctx.arcCtrl, "alice", ctx.alice.address, ONE_YEAR, secret, ethers.ZeroAddress, false, ctx.alice);
      const node = namehash("alice.arc");
      expect(await ctx.resolver.addr(node)).to.equal(ethers.ZeroAddress);
    });

    it("owner can update addr record after registration", async function () {
      const resolverAddr = await ctx.resolver.getAddress();
      await register(ctx.arcCtrl, "alice", ctx.alice.address, ONE_YEAR, secret, resolverAddr, false, ctx.alice);
      const node = namehash("alice.arc");
      await ctx.resolver.connect(ctx.alice).setAddr(node, ctx.bob.address);
      expect(await ctx.resolver.addr(node)).to.equal(ctx.bob.address);
    });
  });

  // ── 5. Reverse / primary name flow ─────────────────────────────────────────
  describe("5. Reverse / primary name flow", function () {
    const secret = ethers.id("reverse-secret");

    it("registration-time reverse record set when reverseRecord=true", async function () {
      const resolverAddr = await ctx.resolver.getAddress();
      await register(ctx.arcCtrl, "alice", ctx.alice.address, ONE_YEAR, secret, resolverAddr, true, ctx.alice);
      const rNode = reverseNodeFor(ctx.alice.address);
      expect(await ctx.resolver.name(rNode)).to.equal("alice.arc");
    });

    it("dashboard-driven setName updates primary name", async function () {
      const resolverAddr = await ctx.resolver.getAddress();
      await register(ctx.arcCtrl, "alice", ctx.alice.address, ONE_YEAR, secret, resolverAddr, false, ctx.alice);
      await ctx.reverseReg.connect(ctx.alice).setName("alice.arc");
      const rNode = reverseNodeFor(ctx.alice.address);
      expect(await ctx.resolver.name(rNode)).to.equal("alice.arc");
    });

    it("dashboard setName overwrites registration-time reverse record", async function () {
      const resolverAddr = await ctx.resolver.getAddress();
      await register(ctx.arcCtrl, "alice", ctx.alice.address, ONE_YEAR, secret, resolverAddr, true, ctx.alice);
      await ctx.reverseReg.connect(ctx.alice).setName("alice-updated.arc");
      const rNode = reverseNodeFor(ctx.alice.address);
      expect(await ctx.resolver.name(rNode)).to.equal("alice-updated.arc");
    });

    it("different users have independent reverse records", async function () {
      const s2 = ethers.id("reverse-s2");
      const resolverAddr = await ctx.resolver.getAddress();
      await register(ctx.arcCtrl, "alice", ctx.alice.address, ONE_YEAR, secret, resolverAddr, true, ctx.alice);
      await register(ctx.arcCtrl, "bob",   ctx.bob.address,   ONE_YEAR, s2,     resolverAddr, true, ctx.bob);
      expect(await ctx.resolver.name(reverseNodeFor(ctx.alice.address))).to.equal("alice.arc");
      expect(await ctx.resolver.name(reverseNodeFor(ctx.bob.address))).to.equal("bob.arc");
    });

    it("registration does not revert when reverse record fails", async function () {
      // Revoke CONTROLLER_ROLE from reverseRegistrar
      await ctx.resolver.setController(await ctx.reverseReg.getAddress(), false);
      const resolverAddr = await ctx.resolver.getAddress();
      await expect(
        register(ctx.arcCtrl, "alice", ctx.alice.address, ONE_YEAR, secret, resolverAddr, true, ctx.alice)
      ).to.not.be.reverted;
    });
  });

  // ── 6. Renewal and expiry ───────────────────────────────────────────────────
  describe("6. Renewal and expiry", function () {
    const secret = ethers.id("renew-secret");

    beforeEach(async function () {
      await register(ctx.arcCtrl, "alice", ctx.alice.address, ONE_YEAR, secret, ethers.ZeroAddress, false, ctx.alice);
    });

    it("renewal extends expiry", async function () {
      const tokenId = BigInt(labelhash("alice"));
      const before = await ctx.arcReg.nameExpires(tokenId);
      await ctx.arcCtrl.connect(ctx.alice).renew("alice", ONE_YEAR, ethers.MaxUint256);
      expect(await ctx.arcReg.nameExpires(tokenId)).to.be.gt(before);
    });

    it("NameRenewed event emitted", async function () {
      const label = labelhash("alice");
      await expect(ctx.arcCtrl.connect(ctx.alice).renew("alice", ONE_YEAR, ethers.MaxUint256))
        .to.emit(ctx.arcCtrl, "NameRenewed").withArgs("alice", label, anyValue, anyValue);
    });

    it("name is unavailable during grace period after expiry", async function () {
      await time.increase(ONE_YEAR + 1);
      expect(await ctx.arcCtrl.available("alice")).to.be.false;
    });

    it("name becomes available after grace period", async function () {
      await time.increase(ONE_YEAR + GRACE_PERIOD + 1);
      expect(await ctx.arcCtrl.available("alice")).to.be.true;
    });

    it("ownerOf reverts for expired name", async function () {
      const tokenId = BigInt(labelhash("alice"));
      await time.increase(ONE_YEAR + 1);
      await expect(ctx.arcReg.ownerOf(tokenId))
        .to.be.revertedWithCustomError(ctx.arcReg, "NameExpired");
    });

    it("renewal during grace period succeeds", async function () {
      await time.increase(ONE_YEAR + 1);
      await expect(ctx.arcCtrl.connect(ctx.alice).renew("alice", ONE_YEAR, ethers.MaxUint256))
        .to.not.be.reverted;
    });

    it("renewal after grace period reverts (name expired)", async function () {
      await time.increase(ONE_YEAR + GRACE_PERIOD + 1);
      await expect(ctx.arcCtrl.connect(ctx.alice).renew("alice", ONE_YEAR, ethers.MaxUint256))
        .to.be.reverted;
    });
  });

  // ── 7. Replay rejection ─────────────────────────────────────────────────────
  describe("7. Replay rejection", function () {
    const secret = ethers.id("replay-secret");

    it("same commitment cannot be used twice", async function () {
      await register(ctx.arcCtrl, "alice", ctx.alice.address, ONE_YEAR, secret, ethers.ZeroAddress, false, ctx.alice);
      const commitment = await ctx.arcCtrl.makeCommitment("alice", ctx.alice.address, ONE_YEAR, secret, ethers.ZeroAddress, false, ctx.alice.address);
      await expect(ctx.arcCtrl.connect(ctx.alice).commit(commitment))
        .to.be.revertedWithCustomError(ctx.arcCtrl, "CommitmentAlreadyUsed");
    });

    it("different sender cannot replay alice's commitment", async function () {
      const aliceCommitment = await ctx.arcCtrl.makeCommitment("alice", ctx.alice.address, ONE_YEAR, secret, ethers.ZeroAddress, false, ctx.alice.address);
      await ctx.arcCtrl.connect(ctx.alice).commit(aliceCommitment);
      await time.increase(MIN_COMMIT_AGE + 1);
      // Bob tries to register with same params — different commitment hash (sender-bound)
      await expect(
        ctx.arcCtrl.connect(ctx.bob).register("alice", ctx.alice.address, ONE_YEAR, secret, ethers.ZeroAddress, false, ethers.MaxUint256)
      ).to.be.revertedWithCustomError(ctx.arcCtrl, "CommitmentNotFound");
    });

    it("expired commitment cannot be used", async function () {
      const commitment = await ctx.arcCtrl.makeCommitment("alice", ctx.alice.address, ONE_YEAR, secret, ethers.ZeroAddress, false, ctx.alice.address);
      await ctx.arcCtrl.connect(ctx.alice).commit(commitment);
      await time.increase(MAX_COMMIT_AGE + 1);
      await expect(
        ctx.arcCtrl.connect(ctx.alice).register("alice", ctx.alice.address, ONE_YEAR, secret, ethers.ZeroAddress, false, ethers.MaxUint256)
      ).to.be.revertedWithCustomError(ctx.arcCtrl, "CommitmentExpired");
    });
  });

  // ── 8. Premium decay behavior ───────────────────────────────────────────────
  describe("8. Premium decay behavior", function () {
    const secret = ethers.id("premium-secret");

    it("new name has zero premium", async function () {
      const p = await ctx.arcCtrl.rentPrice("newname", ONE_YEAR);
      expect(p.premium).to.equal(0n);
    });

    it("recently expired name has non-zero premium", async function () {
      await register(ctx.arcCtrl, "alice", ctx.alice.address, ONE_YEAR, secret, ethers.ZeroAddress, false, ctx.alice);
      // Advance just past expiry (within premium decay window of 28 days)
      // but NOT past grace period — name is still in grace, so advance just past expiry
      await time.increase(ONE_YEAR + 1);
      const p = await ctx.arcCtrl.rentPrice("alice", ONE_YEAR);
      // Premium should be non-zero (just expired, within 28-day decay window)
      expect(p.premium).to.be.gt(0n);
    });

    it("premium decays to zero after 28 days post-expiry", async function () {
      await register(ctx.arcCtrl, "alice", ctx.alice.address, ONE_YEAR, secret, ethers.ZeroAddress, false, ctx.alice);
      // Advance past expiry + grace + 28 days premium decay
      await time.increase(ONE_YEAR + GRACE_PERIOD + PREMIUM_DECAY_DAYS * ONE_DAY + 1);
      const p = await ctx.arcCtrl.rentPrice("alice", ONE_YEAR);
      expect(p.premium).to.equal(0n);
    });

    it("re-registration of expired name succeeds (with premium)", async function () {
      await register(ctx.arcCtrl, "alice", ctx.alice.address, ONE_YEAR, secret, ethers.ZeroAddress, false, ctx.alice);
      await time.increase(ONE_YEAR + GRACE_PERIOD + 1);
      const s2 = ethers.id("premium-s2");
      await expect(
        register(ctx.arcCtrl, "alice", ctx.bob.address, ONE_YEAR, s2, ethers.ZeroAddress, false, ctx.bob)
      ).to.not.be.reverted;
      expect(await ctx.arcReg.balanceOf(ctx.bob.address)).to.equal(1n);
    });
  });

  // ── 9. maxCost / payment protection ────────────────────────────────────────
  describe("9. maxCost / payment protection", function () {
    const secret = ethers.id("maxcost-secret");

    it("PriceExceedsMaxCost: maxCost=1 reverts on .arc", async function () {
      await commitAndWait(ctx.arcCtrl, "alice", ctx.alice.address, ONE_YEAR, secret, ethers.ZeroAddress, false, ctx.alice);
      await expect(
        ctx.arcCtrl.connect(ctx.alice).register("alice", ctx.alice.address, ONE_YEAR, secret, ethers.ZeroAddress, false, 1n)
      ).to.be.revertedWithCustomError(ctx.arcCtrl, "PriceExceedsMaxCost");
    });

    it("PriceExceedsMaxCost: maxCost=1 reverts on .circle", async function () {
      await commitAndWait(ctx.circleCtrl, "bob", ctx.bob.address, ONE_YEAR, secret, ethers.ZeroAddress, false, ctx.bob);
      await expect(
        ctx.circleCtrl.connect(ctx.bob).register("bob", ctx.bob.address, ONE_YEAR, secret, ethers.ZeroAddress, false, 1n)
      ).to.be.revertedWithCustomError(ctx.circleCtrl, "PriceExceedsMaxCost");
    });

    it("insufficient USDC balance reverts", async function () {
      // Deploy a fresh user with no USDC
      const [,,,,noFunds] = await ethers.getSigners();
      await ctx.usdc.connect(noFunds).approve(await ctx.arcCtrl.getAddress(), ethers.MaxUint256);
      await commitAndWait(ctx.arcCtrl, "alice", noFunds.address, ONE_YEAR, secret, ethers.ZeroAddress, false, noFunds);
      await expect(
        ctx.arcCtrl.connect(noFunds).register("alice", noFunds.address, ONE_YEAR, secret, ethers.ZeroAddress, false, ethers.MaxUint256)
      ).to.be.reverted;
    });

    it("exact maxCost equal to price succeeds", async function () {
      const p = await ctx.arcCtrl.rentPrice("alice", ONE_YEAR);
      const exactCost = p.base + p.premium;
      await commitAndWait(ctx.arcCtrl, "alice", ctx.alice.address, ONE_YEAR, secret, ethers.ZeroAddress, false, ctx.alice);
      await expect(
        ctx.arcCtrl.connect(ctx.alice).register("alice", ctx.alice.address, ONE_YEAR, secret, ethers.ZeroAddress, false, exactCost)
      ).to.not.be.reverted;
    });
  });

  // ── 10. Deploy script smoke test ────────────────────────────────────────────
  describe("10. Deploy script smoke test", function () {
    it("deployV3.js runs without error on hardhat network", async function () {
      // Run the deploy script programmatically by requiring it via hre
      // We verify the output JSON is written correctly
      const { execSync } = require("child_process");
      const result = execSync(
        "npx hardhat run scripts/v3/deployV3.js --network hardhat",
        { cwd: process.cwd(), encoding: "utf8", timeout: 120_000 }
      );
      expect(result).to.include("deployment complete");

      const fs = require("fs");
      const path = require("path");
      const outFile = path.join(process.cwd(), "deployments", "hardhat-v3.json");
      expect(fs.existsSync(outFile)).to.be.true;

      const output = JSON.parse(fs.readFileSync(outFile, "utf8"));
      expect(output.version).to.equal("v3");
      expect(output.chainId).to.be.a("number");
      expect(output.contracts.registry).to.match(/^0x/);
      expect(output.contracts.arcController).to.match(/^0x/);
      expect(output.contracts.circleController).to.match(/^0x/);
      expect(output.contracts.arcControllerImpl).to.match(/^0x/);
      expect(output.contracts.resolver).to.match(/^0x/);
      expect(output.contracts.resolverImpl).to.match(/^0x/);
      expect(output.namehashes.arc).to.equal(ARC_NAMEHASH);
      expect(output.namehashes.circle).to.equal(CIRCLE_NAMEHASH);
      expect(Array.isArray(output.upgrades)).to.be.true;
    });
  });

});
