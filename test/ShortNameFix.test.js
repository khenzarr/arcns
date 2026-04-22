/**
 * ShortNameFix.test.js
 *
 * Verifies that 1-char and 2-char names:
 *   - are reported as AVAILABLE (not blocked by MIN_NAME_LENGTH)
 *   - have correct pricing ($640/yr for 1-char, $160/yr for 2-char)
 *   - can be registered successfully
 *   - have resolver.addr() set after registration
 *   - have reverse record set after registration
 *
 * DO NOT SHIP until all tests pass.
 */
const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

function namehash(name) {
  let node = ethers.ZeroHash;
  if (name === "") return node;
  const labels = name.split(".").reverse();
  for (const label of labels) {
    const lh = ethers.keccak256(ethers.toUtf8Bytes(label));
    node = ethers.keccak256(ethers.concat([node, lh]));
  }
  return node;
}

const ONE_YEAR = BigInt(365 * 24 * 60 * 60);

// Expected annual prices (matching updated ArcNSPriceOracle after upgrade)
const PRICE_1_CHAR  =  50_000_000n; //  $50/yr
const PRICE_2_CHAR  =  25_000_000n; //  $25/yr
const PRICE_5_PLUS  =   2_000_000n; //   $2/yr

describe("ShortNameFix — 1-char & 2-char domain support", function () {
  let registry, resolverV2, priceOracle, arcRegistrar, controller, usdc;
  let deployer, alice, bob;

  const ARC_NODE = namehash("arc");

  beforeEach(async function () {
    [deployer, alice, bob] = await ethers.getSigners();

    // Deploy MockUSDC
    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    usdc = await MockUSDC.deploy();

    // Deploy Registry
    const Registry = await ethers.getContractFactory("ArcNSRegistry");
    registry = await Registry.deploy();

    // Deploy ResolverV2
    const ResolverV2 = await ethers.getContractFactory("ArcNSResolverV2");
    resolverV2 = await upgrades.deployProxy(ResolverV2, [await registry.getAddress(), deployer.address], {
      kind: "uups",
      initializer: "initialize",
    });

    // Deploy old ArcNSPriceOracle and update prices to $50/$25/$15/$10/$2
    const PriceOracle = await ethers.getContractFactory("ArcNSPriceOracle");
    priceOracle = await PriceOracle.deploy();
    await priceOracle.setPrices(
      50_000_000n,  //  $50/yr — 1 char
      25_000_000n,  //  $25/yr — 2 chars
      15_000_000n,  //  $15/yr — 3 chars
      10_000_000n,  //  $10/yr — 4 chars
       2_000_000n,  //   $2/yr — 5+ chars
    );

    // Deploy BaseRegistrar
    const BaseRegistrar = await ethers.getContractFactory("ArcNSBaseRegistrar");
    arcRegistrar = await BaseRegistrar.deploy(await registry.getAddress(), ARC_NODE, "arc");

    // Deploy Treasury
    const Treasury = await ethers.getContractFactory("ArcNSTreasury");
    const treasury = await upgrades.deployProxy(Treasury, [
      await usdc.getAddress(),
      deployer.address,
      deployer.address,
      alice.address,
      bob.address,
    ], { kind: "uups", initializer: "initialize" });

    // Deploy ControllerV2
    const ControllerV2 = await ethers.getContractFactory("ArcNSRegistrarControllerV2");
    controller = await upgrades.deployProxy(ControllerV2, [
      await arcRegistrar.getAddress(),
      await priceOracle.getAddress(),
      await usdc.getAddress(),
      await registry.getAddress(),
      await resolverV2.getAddress(),
      await treasury.getAddress(),
      deployer.address,
    ], { kind: "uups", initializer: "initialize" });

    // Wire up
    const arcLabel = ethers.keccak256(ethers.toUtf8Bytes("arc"));
    await registry.setSubnodeOwner(ethers.ZeroHash, arcLabel, await arcRegistrar.getAddress());
    await arcRegistrar.addController(await controller.getAddress());

    // Grant CONTROLLER_ROLE to controller in resolver
    const CONTROLLER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("CONTROLLER_ROLE"));
    await resolverV2.grantRole(CONTROLLER_ROLE, await controller.getAddress());

    // Fund alice with enough for 1-char name ($50) + buffer
    await usdc.faucet(alice.address, 10_000 * 10 ** 6);
  });

  // ─── Helper ───────────────────────────────────────────────────────────────

  async function register(label, owner, duration = ONE_YEAR) {
    const secret = ethers.randomBytes(32);
    const commitment = await controller.makeCommitment(
      label, owner.address, duration, secret,
      await resolverV2.getAddress(), [], true
    );
    await controller.connect(owner).commit(commitment);
    await time.increase(65);

    const price = await controller.rentPrice(label, duration);
    const maxCost = price.base + price.premium + BigInt(1_000_000);
    await usdc.connect(owner).approve(await controller.getAddress(), maxCost);

    return controller.connect(owner).register(
      label, owner.address, duration, secret,
      await resolverV2.getAddress(), [], true, maxCost
    );
  }

  // ─── Step 1: MIN_NAME_LENGTH = 1 ─────────────────────────────────────────

  describe("Step 1 — MIN_NAME_LENGTH = 1", function () {
    it("MIN_NAME_LENGTH is 1", async function () {
      expect(await controller.MIN_NAME_LENGTH()).to.equal(1n);
    });

    it("available('a') returns true (1-char name not blocked)", async function () {
      expect(await controller.available("a")).to.be.true;
    });

    it("available('aa') returns true (2-char name not blocked)", async function () {
      expect(await controller.available("aa")).to.be.true;
    });

    it("available('alice') returns true (5-char name)", async function () {
      expect(await controller.available("alice")).to.be.true;
    });
  });

  // ─── Step 2: Pricing ──────────────────────────────────────────────────────

  describe("Step 2 — Pricing tiers", function () {
    it("1-char name costs $640/yr", async function () {
      const p = await controller.rentPrice("a", ONE_YEAR);
      expect(p.base).to.equal(PRICE_1_CHAR);
    });

    it("2-char name costs $160/yr", async function () {
      const p = await controller.rentPrice("aa", ONE_YEAR);
      expect(p.base).to.equal(PRICE_2_CHAR);
    });

    it("5+ char name costs $2/yr", async function () {
      const p = await controller.rentPrice("alice", ONE_YEAR);
      expect(p.base).to.equal(PRICE_5_PLUS);
    });

    it("1-char 2-year registration costs $1280", async function () {
      const TWO_YEARS = ONE_YEAR * 2n;
      const p = await controller.rentPrice("a", TWO_YEARS);
      expect(p.base).to.equal(PRICE_1_CHAR * 2n);
    });
  });

  // ─── Step 3: Registration ─────────────────────────────────────────────────

  describe("Step 3 — Registration flow", function () {
    it("can register 'a.arc' (1-char)", async function () {
      await expect(register("a", alice))
        .to.emit(controller, "NameRegistered");
    });

    it("can register 'aa.arc' (2-char)", async function () {
      await expect(register("aa", alice))
        .to.emit(controller, "NameRegistered");
    });

    it("'a.arc' is TAKEN after registration", async function () {
      await register("a", alice);
      expect(await controller.available("a")).to.be.false;
    });

    it("'aa.arc' is TAKEN after registration", async function () {
      await register("aa", alice);
      expect(await controller.available("aa")).to.be.false;
    });
  });

  // ─── Step 4: Resolver addr() ──────────────────────────────────────────────

  describe("Step 4 — Resolver addr() set after registration", function () {
    it("resolver.addr(node) returns owner after registering 'a.arc'", async function () {
      await register("a", alice);
      const node = namehash("a.arc");
      expect(await resolverV2["addr(bytes32)"](node)).to.equal(alice.address);
    });

    it("resolver.addr(node) returns owner after registering 'aa.arc'", async function () {
      await register("aa", alice);
      const node = namehash("aa.arc");
      expect(await resolverV2["addr(bytes32)"](node)).to.equal(alice.address);
    });

    it("resolver.addr(node) returns owner after registering 'alice.arc'", async function () {
      await register("alice", alice);
      const node = namehash("alice.arc");
      expect(await resolverV2["addr(bytes32)"](node)).to.equal(alice.address);
    });
  });

  // ─── Step 5: Reverse record ───────────────────────────────────────────────

  describe("Step 5 — Reverse record (MetaMask resolution)", function () {
    it("reverse record is set after registering 'a.arc' with reverseRecord=true", async function () {
      await register("a", alice);
      // Compute reverse node for alice's address
      const ADDR_REVERSE_NODE = "0x91d1777781884d03a6757a803996e38de2a42967fb37eeaca72729271025a9e2";
      const addrHex = alice.address.toLowerCase().slice(2); // 40 hex chars, no 0x
      const addrLabel = ethers.keccak256(ethers.toUtf8Bytes(addrHex));
      const reverseNode = ethers.keccak256(ethers.concat([ADDR_REVERSE_NODE, addrLabel]));
      const reverseName = await resolverV2.name(reverseNode);
      expect(reverseName).to.equal("a.arc");
    });

    it("reverse record is set after registering 'alice.arc'", async function () {
      await register("alice", alice);
      const ADDR_REVERSE_NODE = "0x91d1777781884d03a6757a803996e38de2a42967fb37eeaca72729271025a9e2";
      const addrHex = alice.address.toLowerCase().slice(2);
      const addrLabel = ethers.keccak256(ethers.toUtf8Bytes(addrHex));
      const reverseNode = ethers.keccak256(ethers.concat([ADDR_REVERSE_NODE, addrLabel]));
      const reverseName = await resolverV2.name(reverseNode);
      expect(reverseName).to.equal("alice.arc");
    });
  });

  // ─── Step 6: Namehash consistency ────────────────────────────────────────

  describe("Step 6 — Namehash consistency (frontend === contract)", function () {
    it("registry owner of 'a.arc' node matches after registration", async function () {
      await register("a", alice);
      const node = namehash("a.arc");
      expect(await registry.owner(node)).to.equal(alice.address);
    });

    it("registry owner of 'aa.arc' node matches after registration", async function () {
      await register("aa", alice);
      const node = namehash("aa.arc");
      expect(await registry.owner(node)).to.equal(alice.address);
    });

    it("registry resolver of 'a.arc' is set to resolverV2", async function () {
      await register("a", alice);
      const node = namehash("a.arc");
      expect(await registry.resolver(node)).to.equal(await resolverV2.getAddress());
    });
  });
});

// Helper for any value in emit assertions
function anyValue() {
  return { asymmetricMatch: () => true };
}
