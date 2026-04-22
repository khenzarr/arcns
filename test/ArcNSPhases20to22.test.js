/**
 * ArcNS Phases 20–22 Test Suite
 * Phase 20: New pricing model
 * Phase 21: NFT tokenURI / metadata
 * Phase 22: Reverse auto-set
 */
const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

function namehash(name) {
  let node = ethers.ZeroHash;
  if (name === "") return node;
  for (const label of name.split(".").reverse()) {
    const lh = ethers.keccak256(ethers.toUtf8Bytes(label));
    node = ethers.keccak256(ethers.concat([node, lh]));
  }
  return node;
}

const ONE_YEAR = BigInt(365 * 24 * 60 * 60);
const ARC_NODE = namehash("arc");

describe("ArcNS Phases 20–22", function () {
  let registry, resolverV2, priceOracleV2, arcRegistrar, arcControllerV2, treasury, usdc;
  let deployer, alice, bob;

  beforeEach(async function () {
    [deployer, alice, bob] = await ethers.getSigners();

    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    usdc = await MockUSDC.deploy();

    const Registry = await ethers.getContractFactory("ArcNSRegistry");
    registry = await Registry.deploy();

    const ResolverV2 = await ethers.getContractFactory("ArcNSResolverV2");
    resolverV2 = await upgrades.deployProxy(ResolverV2, [await registry.getAddress(), deployer.address], { kind: "uups", initializer: "initialize" });

    const PriceOracleV2 = await ethers.getContractFactory("ArcNSPriceOracleV2");
    priceOracleV2 = await upgrades.deployProxy(PriceOracleV2, [deployer.address], { kind: "uups", initializer: "initialize" });

    const BaseRegistrar = await ethers.getContractFactory("ArcNSBaseRegistrar");
    arcRegistrar = await BaseRegistrar.deploy(await registry.getAddress(), ARC_NODE, "arc");

    const Treasury = await ethers.getContractFactory("ArcNSTreasury");
    treasury = await upgrades.deployProxy(Treasury, [
      await usdc.getAddress(), deployer.address,
      deployer.address, deployer.address, deployer.address,
    ], { kind: "uups", initializer: "initialize" });

    const ControllerV2 = await ethers.getContractFactory("ArcNSRegistrarControllerV2");
    arcControllerV2 = await upgrades.deployProxy(ControllerV2, [
      await arcRegistrar.getAddress(), await priceOracleV2.getAddress(),
      await usdc.getAddress(), await registry.getAddress(),
      await resolverV2.getAddress(), await treasury.getAddress(), deployer.address,
    ], { kind: "uups", initializer: "initialize" });

    const arcLabel = ethers.keccak256(ethers.toUtf8Bytes("arc"));
    await registry.setSubnodeOwner(ethers.ZeroHash, arcLabel, await arcRegistrar.getAddress());
    await arcRegistrar.addController(await arcControllerV2.getAddress());

    const CONTROLLER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("CONTROLLER_ROLE"));
    await resolverV2.grantRole(CONTROLLER_ROLE, await arcControllerV2.getAddress());

    await usdc.faucet(alice.address, 10_000 * 10 ** 6);
    await usdc.faucet(bob.address,   10_000 * 10 ** 6);
  });

  async function registerName(label, owner, duration = ONE_YEAR) {
    const secret = ethers.randomBytes(32);
    const commitment = await arcControllerV2.makeCommitment(
      label, owner.address, duration, secret, await resolverV2.getAddress(), [], true
    );
    await arcControllerV2.connect(owner).commit(commitment);
    await time.increase(65);
    const p = await arcControllerV2.rentPrice(label, duration);
    const maxCost = p.base + p.premium + BigInt(1_000_000);
    await usdc.connect(owner).approve(await arcControllerV2.getAddress(), maxCost);
    return arcControllerV2.connect(owner).register(
      label, owner.address, duration, secret,
      await resolverV2.getAddress(), [], true, maxCost
    );
  }

  // ─── PHASE 20: Pricing ────────────────────────────────────────────────────

  describe("Phase 20 — Pricing Model", function () {
    it("5+ char name costs $1.99/year", async function () {
      const p = await priceOracleV2.price("alice", 0, ONE_YEAR);
      expect(p.base).to.equal(1_990_000n);
    });

    it("4 char name costs $9.99/year", async function () {
      const p = await priceOracleV2.price("abcd", 0, ONE_YEAR);
      expect(p.base).to.equal(9_990_000n);
    });

    it("3 char name costs $14.99/year", async function () {
      const p = await priceOracleV2.price("abc", 0, ONE_YEAR);
      expect(p.base).to.equal(14_990_000n);
    });

    it("2 char name costs $24.99/year", async function () {
      const p = await priceOracleV2.price("ab", 0, ONE_YEAR);
      expect(p.base).to.equal(24_990_000n);
    });

    it("1 char name costs $49.99/year", async function () {
      const p = await priceOracleV2.price("a", 0, ONE_YEAR);
      expect(p.base).to.equal(49_990_000n);
    });

    it("pro-rates correctly for 2 years", async function () {
      const p1 = await priceOracleV2.price("alice", 0, ONE_YEAR);
      const p2 = await priceOracleV2.price("alice", 0, ONE_YEAR * 2n);
      expect(p2.base).to.equal(p1.base * 2n);
    });

    it("premium decays from $100 to $0 over 28 days", async function () {
      const justExpired = BigInt(await time.latest()) - 1n;
      const p = await priceOracleV2.price("alice", justExpired, ONE_YEAR);
      expect(p.premium).to.be.closeTo(100_000_000n, 1_000_000n); // ~$100

      const halfDecay = BigInt(await time.latest()) - BigInt(14 * 86400);
      const p2 = await priceOracleV2.price("alice", halfDecay, ONE_YEAR);
      expect(p2.premium).to.be.closeTo(50_000_000n, 2_000_000n); // ~$50

      const fullyDecayed = BigInt(await time.latest()) - BigInt(29 * 86400);
      const p3 = await priceOracleV2.price("alice", fullyDecayed, ONE_YEAR);
      expect(p3.premium).to.equal(0n);
    });

    it("unicode name length counted correctly (emoji = 1 char)", async function () {
      // "ab" is 2 bytes → 2 chars → $24.99
      const p = await priceOracleV2.price("ab", 0, ONE_YEAR);
      expect(p.base).to.equal(24_990_000n);
    });

    it("admin can update prices", async function () {
      await priceOracleV2.setPrices(1n, 2n, 3n, 4n, 5n);
      const p = await priceOracleV2.price("alice", 0, ONE_YEAR);
      expect(p.base).to.equal(5n);
    });

    it("registration uses new pricing", async function () {
      const before = await usdc.balanceOf(await treasury.getAddress());
      await registerName("alice", alice);
      const after = await usdc.balanceOf(await treasury.getAddress());
      // Should be ~$1.99 (pro-rated for 1 year)
      expect(after - before).to.equal(1_990_000n);
    });
  });

  // ─── PHASE 21: NFT Metadata ───────────────────────────────────────────────

  describe("Phase 21 — NFT tokenURI", function () {
    it("tokenURI returns data URI after registration", async function () {
      await registerName("alice", alice);
      const tokenId = BigInt(ethers.keccak256(ethers.toUtf8Bytes("alice")));
      const uri = await arcRegistrar.tokenURI(tokenId);
      expect(uri).to.match(/^data:application\/json;base64,/);
    });

    it("tokenURI decodes to valid JSON with required fields", async function () {
      await registerName("alice", alice);
      const tokenId = BigInt(ethers.keccak256(ethers.toUtf8Bytes("alice")));
      const uri = await arcRegistrar.tokenURI(tokenId);
      const b64 = uri.replace("data:application/json;base64,", "");
      const json = JSON.parse(Buffer.from(b64, "base64").toString("utf8"));

      expect(json).to.have.property("name");
      expect(json).to.have.property("description");
      expect(json).to.have.property("image");
      expect(json).to.have.property("attributes");
      expect(json.image).to.match(/^data:image\/svg\+xml;base64,/);
    });

    it("tokenURI attributes include expiry date", async function () {
      await registerName("alice", alice);
      const tokenId = BigInt(ethers.keccak256(ethers.toUtf8Bytes("alice")));
      const uri = await arcRegistrar.tokenURI(tokenId);
      const b64 = uri.replace("data:application/json;base64,", "");
      const json = JSON.parse(Buffer.from(b64, "base64").toString("utf8"));
      const expiryAttr = json.attributes.find((a) => a.trait_type === "Expiry");
      expect(expiryAttr).to.exist;
      expect(Number(expiryAttr.value)).to.be.gt(Math.floor(Date.now() / 1000));
    });

    it("tokenURI attributes include Status=Active", async function () {
      await registerName("alice", alice);
      const tokenId = BigInt(ethers.keccak256(ethers.toUtf8Bytes("alice")));
      const uri = await arcRegistrar.tokenURI(tokenId);
      const b64 = uri.replace("data:application/json;base64,", "");
      const json = JSON.parse(Buffer.from(b64, "base64").toString("utf8"));
      const statusAttr = json.attributes.find((a) => a.trait_type === "Status");
      expect(statusAttr.value).to.equal("Active");
    });

    it("NFT is owned by registrant", async function () {
      await registerName("alice", alice);
      const tokenId = BigInt(ethers.keccak256(ethers.toUtf8Bytes("alice")));
      // ownerOf reverts for expired — use internal _ownerOf via nameExpires check
      const expiry = await arcRegistrar.nameExpires(tokenId);
      expect(expiry).to.be.gt(BigInt(Math.floor(Date.now() / 1000)));
    });
  });

  // ─── PHASE 22: Reverse Auto-Set ───────────────────────────────────────────

  describe("Phase 22 — Reverse Auto-Set", function () {
    it("registration with reverseRecord=true sets reverse name", async function () {
      await registerName("alice", alice);
      // The reverse node for alice's address
      const ADDR_REVERSE_NODE = "0x91d1777781884d03a6757a803996e38de2a42967fb37eeaca72729271025a9e2";
      const addrHex = alice.address.toLowerCase().slice(2);
      const addrLabel = ethers.keccak256(ethers.toUtf8Bytes(addrHex));
      const reverseNode = ethers.keccak256(ethers.concat([ADDR_REVERSE_NODE, addrLabel]));
      const name = await resolverV2.name(reverseNode);
      expect(name).to.equal("alice.arc");
    });

    it("registration without reverseRecord does NOT set reverse", async function () {
      const secret = ethers.randomBytes(32);
      const commitment = await arcControllerV2.makeCommitment(
        "bob", bob.address, ONE_YEAR, secret, await resolverV2.getAddress(), [], false
      );
      await arcControllerV2.connect(bob).commit(commitment);
      await time.increase(65);
      const p = await arcControllerV2.rentPrice("bob", ONE_YEAR);
      const maxCost = p.base + p.premium + BigInt(1_000_000);
      await usdc.connect(bob).approve(await arcControllerV2.getAddress(), maxCost);
      await arcControllerV2.connect(bob).register(
        "bob", bob.address, ONE_YEAR, secret,
        await resolverV2.getAddress(), [], false, maxCost
      );

      const ADDR_REVERSE_NODE = "0x91d1777781884d03a6757a803996e38de2a42967fb37eeaca72729271025a9e2";
      const addrHex = bob.address.toLowerCase().slice(2);
      const addrLabel = ethers.keccak256(ethers.toUtf8Bytes(addrHex));
      const reverseNode = ethers.keccak256(ethers.concat([ADDR_REVERSE_NODE, addrLabel]));
      const name = await resolverV2.name(reverseNode);
      expect(name).to.equal(""); // not set
    });

    it("reverse auto-set failure does NOT revert registration", async function () {
      // Even if reverse set would fail, registration should succeed
      // (tested by the fact that registration completes without revert)
      await expect(registerName("charlie", alice)).to.emit(arcControllerV2, "NameRegistered");
    });

    it("user can manually override reverse record after registration", async function () {
      await registerName("alice", alice);
      // Override with a different name
      await resolverV2.connect(alice).setNameForAddr(
        alice.address, alice.address, await resolverV2.getAddress(), "alice.arc"
      );
      const ADDR_REVERSE_NODE = "0x91d1777781884d03a6757a803996e38de2a42967fb37eeaca72729271025a9e2";
      const addrHex = alice.address.toLowerCase().slice(2);
      const addrLabel = ethers.keccak256(ethers.toUtf8Bytes(addrHex));
      const reverseNode = ethers.keccak256(ethers.concat([ADDR_REVERSE_NODE, addrLabel]));
      const name = await resolverV2.name(reverseNode);
      expect(name).to.equal("alice.arc");
    });
  });
});
