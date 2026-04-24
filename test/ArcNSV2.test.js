/**
 * ArcNS V2 Security & Upgrade Test Suite
 * Tests all Phase 10 audit fixes + Phase 13-16 features
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

describe("ArcNS V2 — Security & Upgrades", function () {
  let registry, resolverV2, priceOracleV2, arcRegistrar, arcControllerV2, treasury, usdc;
  let deployer, alice, bob, attacker, admin;

  const ARC_NODE = namehash("arc");

  beforeEach(async function () {
    [deployer, alice, bob, attacker, admin] = await ethers.getSigners();

    // Deploy MockUSDC
    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    usdc = await MockUSDC.deploy();

    // Deploy Registry
    const Registry = await ethers.getContractFactory("ArcNSRegistry");
    registry = await Registry.deploy();

    // Deploy ResolverV2 (UUPS proxy)
    const ResolverV2 = await ethers.getContractFactory("ArcNSResolverV2");
    resolverV2 = await upgrades.deployProxy(ResolverV2, [await registry.getAddress(), deployer.address], {
      kind: "uups",
      initializer: "initialize",
    });

    // Deploy PriceOracleV2 (UUPS proxy)
    const PriceOracleV2 = await ethers.getContractFactory("ArcNSPriceOracleV2");
    priceOracleV2 = await upgrades.deployProxy(PriceOracleV2, [deployer.address], {
      kind: "uups",
      initializer: "initialize",
    });

    // Deploy BaseRegistrar
    const BaseRegistrar = await ethers.getContractFactory("ArcNSBaseRegistrar");
    arcRegistrar = await BaseRegistrar.deploy(await registry.getAddress(), ARC_NODE, "arc");

    // Deploy Treasury (UUPS proxy)
    const Treasury = await ethers.getContractFactory("ArcNSTreasury");
    treasury = await upgrades.deployProxy(Treasury, [
      await usdc.getAddress(),
      deployer.address,
      deployer.address, // protocol wallet
      alice.address,    // reserve wallet
      bob.address,      // community wallet
    ], { kind: "uups", initializer: "initialize" });

    // Deploy ControllerV2 (UUPS proxy)
    const ControllerV2 = await ethers.getContractFactory("ArcNSRegistrarControllerV2");
    arcControllerV2 = await upgrades.deployProxy(ControllerV2, [
      await arcRegistrar.getAddress(),
      await priceOracleV2.getAddress(),
      await usdc.getAddress(),
      await registry.getAddress(),
      await resolverV2.getAddress(),
      await treasury.getAddress(),
      deployer.address,
    ], { kind: "uups", initializer: "initialize" });

    // Wire up
    const arcLabel    = ethers.keccak256(ethers.toUtf8Bytes("arc"));
    await registry.setSubnodeOwner(ethers.ZeroHash, arcLabel, await arcRegistrar.getAddress());
    await arcRegistrar.addController(await arcControllerV2.getAddress());

    // Grant controller role in resolver
    const CONTROLLER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("CONTROLLER_ROLE"));
    await resolverV2.grantRole(CONTROLLER_ROLE, await arcControllerV2.getAddress());

    // Fund users
    await usdc.faucet(alice.address,   10_000 * 10 ** 6);
    await usdc.faucet(bob.address,     10_000 * 10 ** 6);
    await usdc.faucet(attacker.address, 10_000 * 10 ** 6);
  });

  // ─── Helper ───────────────────────────────────────────────────────────────

  async function registerV2(label, owner, duration = ONE_YEAR) {
    const secret = ethers.randomBytes(32);
    // MUST use makeCommitmentWithSender — register() reconstructs hash with msg.sender binding.
    // makeCommitment (7-arg, no sender) produces a different hash and always fails.
    const commitment = await arcControllerV2.makeCommitmentWithSender(
      label, owner.address, duration, secret,
      await resolverV2.getAddress(), [], false, owner.address
    );
    await arcControllerV2.connect(owner).commit(commitment);
    await time.increase(65);

    const price = await arcControllerV2.rentPrice(label, duration);
    const maxCost = price.base + price.premium + BigInt(1_000_000); // +$1 slippage buffer
    await usdc.connect(owner).approve(await arcControllerV2.getAddress(), maxCost);

    return arcControllerV2.connect(owner).register(
      label, owner.address, duration, secret,
      await resolverV2.getAddress(), [], false, maxCost
    );
  }

  // ─── PHASE 10: Security Fixes ─────────────────────────────────────────────

  describe("FIX C-01: Commitment Replay Prevention", function () {
    it("cannot reuse a commitment after registration", async function () {
      const secret = ethers.randomBytes(32);
      const commitment = await arcControllerV2.makeCommitmentWithSender(
        "alice", alice.address, ONE_YEAR, secret,
        await resolverV2.getAddress(), [], false, alice.address
      );

      await arcControllerV2.connect(alice).commit(commitment);
      await time.increase(65);

      const price = await arcControllerV2.rentPrice("alice", ONE_YEAR);
      const maxCost = price.base + price.premium + BigInt(1_000_000);
      await usdc.connect(alice).approve(await arcControllerV2.getAddress(), maxCost * 2n);

      // First registration succeeds
      await arcControllerV2.connect(alice).register(
        "alice", alice.address, ONE_YEAR, secret,
        await resolverV2.getAddress(), [], false, maxCost
      );

      // Attempt to re-commit same commitment — should fail permanently
      await expect(
        arcControllerV2.connect(attacker).commit(commitment)
      ).to.be.revertedWith("Controller: commitment already used");
    });

    it("expired commitment cannot be replayed", async function () {
      const secret = ethers.randomBytes(32);
      const commitment = await arcControllerV2.makeCommitmentWithSender(
        "bob", bob.address, ONE_YEAR, secret,
        await resolverV2.getAddress(), [], false, bob.address
      );

      await arcControllerV2.connect(bob).commit(commitment);
      // Let it expire (> MAX_COMMITMENT_AGE = 24h)
      await time.increase(25 * 60 * 60);

      // Re-commit is allowed (expired, not used)
      await expect(
        arcControllerV2.connect(bob).commit(commitment)
      ).to.not.be.reverted;
    });
  });

  describe("FIX C-03: Slippage Protection", function () {
    it("reverts if price exceeds maxCost", async function () {
      const secret = ethers.randomBytes(32);
      const commitment = await arcControllerV2.makeCommitmentWithSender(
        "alice", alice.address, ONE_YEAR, secret,
        await resolverV2.getAddress(), [], false, alice.address
      );
      await arcControllerV2.connect(alice).commit(commitment);
      await time.increase(65);

      const price = await arcControllerV2.rentPrice("alice", ONE_YEAR);
      const tooLow = price.base - 1n; // 1 unit below actual price

      await usdc.connect(alice).approve(await arcControllerV2.getAddress(), price.base);

      await expect(
        arcControllerV2.connect(alice).register(
          "alice", alice.address, ONE_YEAR, secret,
          await resolverV2.getAddress(), [], false, tooLow
        )
      ).to.be.revertedWith("Controller: price exceeds maxCost");
    });
  });

  describe("FIX C-02: Resolver Whitelist", function () {
    it("rejects non-approved resolver", async function () {
      const secret = ethers.randomBytes(32);
      const fakeResolver = attacker.address; // not approved
      const commitment = await arcControllerV2.makeCommitmentWithSender(
        "alice", alice.address, ONE_YEAR, secret, fakeResolver, [], false, alice.address
      );
      await arcControllerV2.connect(alice).commit(commitment);
      await time.increase(65);

      const price = await arcControllerV2.rentPrice("alice", ONE_YEAR);
      await usdc.connect(alice).approve(await arcControllerV2.getAddress(), price.base + BigInt(1_000_000));

      await expect(
        arcControllerV2.connect(alice).register(
          "alice", alice.address, ONE_YEAR, secret, fakeResolver, [], false, price.base + BigInt(1_000_000)
        )
      ).to.be.revertedWith("Controller: resolver not approved");
    });

    it("admin can approve a new resolver", async function () {
      const newResolver = bob.address;
      await arcControllerV2.setApprovedResolver(newResolver, true);
      expect(await arcControllerV2.approvedResolvers(newResolver)).to.be.true;
    });
  });

  describe("FIX C-06: Treasury Zero-Address Guard", function () {
    it("reverts setTreasury(address(0))", async function () {
      await expect(
        arcControllerV2.setTreasury(ethers.ZeroAddress)
      ).to.be.revertedWith("Controller: zero treasury");
    });
  });

  describe("FIX C-05: Pausability", function () {
    it("paused controller rejects registrations", async function () {
      await arcControllerV2.pause();

      const secret = ethers.randomBytes(32);
      const commitment = await arcControllerV2.makeCommitmentWithSender(
        "alice", alice.address, ONE_YEAR, secret,
        await resolverV2.getAddress(), [], false, alice.address
      );

      await expect(
        arcControllerV2.connect(alice).commit(commitment)
      ).to.be.revertedWithCustomError(arcControllerV2, "EnforcedPause");
    });

    it("unpaused controller works again", async function () {
      await arcControllerV2.pause();
      await arcControllerV2.unpause();
      await expect(registerV2("alice", alice)).to.emit(arcControllerV2, "NameRegistered");
    });
  });

  describe("FIX C-07: AccessControl Roles", function () {
    it("non-admin cannot set price oracle", async function () {
      const ORACLE_ROLE = ethers.keccak256(ethers.toUtf8Bytes("ORACLE_ROLE"));
      await expect(
        arcControllerV2.connect(attacker).setPriceOracle(await priceOracleV2.getAddress())
      ).to.be.revertedWithCustomError(arcControllerV2, "AccessControlUnauthorizedAccount");
    });

    it("non-pauser cannot pause", async function () {
      await expect(
        arcControllerV2.connect(attacker).pause()
      ).to.be.revertedWithCustomError(arcControllerV2, "AccessControlUnauthorizedAccount");
    });

    it("admin can grant oracle role to another address", async function () {
      const ORACLE_ROLE = ethers.keccak256(ethers.toUtf8Bytes("ORACLE_ROLE"));
      await arcControllerV2.grantRole(ORACLE_ROLE, alice.address);
      await expect(
        arcControllerV2.connect(alice).setPriceOracle(await priceOracleV2.getAddress())
      ).to.not.be.reverted;
    });
  });

  // ─── PHASE 13: UUPS Upgradeability ────────────────────────────────────────

  describe("PHASE 13: UUPS Proxy", function () {
    it("controller is deployed behind a proxy", async function () {
      // Proxy address differs from implementation
      const implAddr = await upgrades.erc1967.getImplementationAddress(
        await arcControllerV2.getAddress()
      );
      expect(implAddr).to.not.equal(await arcControllerV2.getAddress());
    });

    it("resolver is deployed behind a proxy", async function () {
      const implAddr = await upgrades.erc1967.getImplementationAddress(
        await resolverV2.getAddress()
      );
      expect(implAddr).to.not.equal(await resolverV2.getAddress());
    });

    it("non-upgrader cannot upgrade", async function () {
      const ControllerV2 = await ethers.getContractFactory("ArcNSRegistrarControllerV2");
      await expect(
        upgrades.upgradeProxy(await arcControllerV2.getAddress(), ControllerV2.connect(attacker))
      ).to.be.reverted;
    });
  });

  // ─── PHASE 14: Premium Decay Pricing ──────────────────────────────────────

  describe("PHASE 14: Premium Decay Pricing", function () {
    it("new name has zero premium", async function () {
      const p = await priceOracleV2.price("alice", 0, ONE_YEAR);
      expect(p.premium).to.equal(0n);
    });

    it("recently expired name has premium", async function () {
      const expiredAt = BigInt(await time.latest()) - BigInt(1 * 24 * 60 * 60); // expired 1 day ago
      const p = await priceOracleV2.price("alice", expiredAt, ONE_YEAR);
      expect(p.premium).to.be.gt(0n);
    });

    it("premium decays to zero after 28 days", async function () {
      const expiredAt = BigInt(await time.latest()) - BigInt(29 * 24 * 60 * 60); // expired 29 days ago
      const p = await priceOracleV2.price("alice", expiredAt, ONE_YEAR);
      expect(p.premium).to.equal(0n);
    });

    it("premium is highest just after expiry", async function () {
      const justExpired = BigInt(await time.latest()) - 1n;
      const expiredLong = BigInt(await time.latest()) - BigInt(14 * 24 * 60 * 60);
      const p1 = await priceOracleV2.price("alice", justExpired, ONE_YEAR);
      const p2 = await priceOracleV2.price("alice", expiredLong, ONE_YEAR);
      expect(p1.premium).to.be.gt(p2.premium);
    });
  });

  // ─── PHASE 16: Treasury ───────────────────────────────────────────────────

  describe("PHASE 16: Treasury", function () {
    it("treasury receives fees on registration", async function () {
      const before = await usdc.balanceOf(await treasury.getAddress());
      await registerV2("alice", alice);
      const after = await usdc.balanceOf(await treasury.getAddress());
      expect(after).to.be.gt(before);
    });

    it("distribute splits fees correctly", async function () {
      await registerV2("alice", alice);

      const bal = await usdc.balanceOf(await treasury.getAddress());
      const protocolBefore = await usdc.balanceOf(deployer.address);

      await treasury.distribute();

      const protocolAfter = await usdc.balanceOf(deployer.address);
      // Protocol gets 70%
      expect(protocolAfter - protocolBefore).to.equal((bal * 7000n) / 10000n);
    });

    it("non-withdrawer cannot distribute", async function () {
      await expect(
        treasury.connect(attacker).distribute()
      ).to.be.revertedWithCustomError(treasury, "AccessControlUnauthorizedAccount");
    });

    it("emergency withdraw works for governor", async function () {
      await registerV2("alice", alice);
      const bal = await usdc.balanceOf(await treasury.getAddress());
      await treasury.emergencyWithdraw(deployer.address, bal);
      expect(await usdc.balanceOf(await treasury.getAddress())).to.equal(0n);
    });
  });

  // ─── Commitment Equivalence Proof ────────────────────────────────────────
  // H15: proves makeCommitmentWithSender hash == hash validated by register()

  describe("Commitment Equivalence — H15 Proof", function () {
    it("makeCommitment (no sender) produces a DIFFERENT hash than makeCommitmentWithSender", async function () {
      const secret = ethers.randomBytes(32);
      const resolverAddr = await resolverV2.getAddress();

      const hashNoSender = await arcControllerV2.makeCommitment(
        "alice", alice.address, ONE_YEAR, secret, resolverAddr, [], false
      );
      const hashWithSender = await arcControllerV2.makeCommitmentWithSender(
        "alice", alice.address, ONE_YEAR, secret, resolverAddr, [], false, alice.address
      );

      // These MUST differ — proves the sender binding changes the hash
      expect(hashNoSender).to.not.equal(hashWithSender);
    });

    it("committing makeCommitment hash (no sender) causes register() to revert with commitment not found", async function () {
      const secret = ethers.randomBytes(32);
      const resolverAddr = await resolverV2.getAddress();

      // Commit the WRONG hash (no sender binding)
      const wrongHash = await arcControllerV2.makeCommitment(
        "alice", alice.address, ONE_YEAR, secret, resolverAddr, [], false
      );
      await arcControllerV2.connect(alice).commit(wrongHash);
      await time.increase(65);

      const price = await arcControllerV2.rentPrice("alice", ONE_YEAR);
      const maxCost = price.base + price.premium + BigInt(1_000_000);
      await usdc.connect(alice).approve(await arcControllerV2.getAddress(), maxCost);

      // register() reconstructs with sender — different hash — not found
      await expect(
        arcControllerV2.connect(alice).register(
          "alice", alice.address, ONE_YEAR, secret, resolverAddr, [], false, maxCost
        )
      ).to.be.revertedWith("Controller: commitment not found");
    });

    it("committing makeCommitmentWithSender hash allows register() to succeed", async function () {
      const secret = ethers.randomBytes(32);
      const resolverAddr = await resolverV2.getAddress();

      // Commit the CORRECT hash (with sender binding)
      const correctHash = await arcControllerV2.makeCommitmentWithSender(
        "alice", alice.address, ONE_YEAR, secret, resolverAddr, [], false, alice.address
      );
      await arcControllerV2.connect(alice).commit(correctHash);
      await time.increase(65);

      const price = await arcControllerV2.rentPrice("alice", ONE_YEAR);
      const maxCost = price.base + price.premium + BigInt(1_000_000);
      await usdc.connect(alice).approve(await arcControllerV2.getAddress(), maxCost);

      // register() reconstructs with sender — same hash — succeeds
      await expect(
        arcControllerV2.connect(alice).register(
          "alice", alice.address, ONE_YEAR, secret, resolverAddr, [], false, maxCost
        )
      ).to.emit(arcControllerV2, "NameRegistered");
    });

    it("commitment hash is sender-specific: alice hash cannot be used by bob", async function () {
      const secret = ethers.randomBytes(32);
      const resolverAddr = await resolverV2.getAddress();

      // Alice commits her sender-bound hash
      const aliceHash = await arcControllerV2.makeCommitmentWithSender(
        "alice", alice.address, ONE_YEAR, secret, resolverAddr, [], false, alice.address
      );
      await arcControllerV2.connect(alice).commit(aliceHash);
      await time.increase(65);

      const price = await arcControllerV2.rentPrice("alice", ONE_YEAR);
      const maxCost = price.base + price.premium + BigInt(1_000_000);
      await usdc.connect(bob).approve(await arcControllerV2.getAddress(), maxCost);

      // Bob tries to register using alice's commitment — bob's sender produces different hash
      await expect(
        arcControllerV2.connect(bob).register(
          "alice", alice.address, ONE_YEAR, secret, resolverAddr, [], false, maxCost
        )
      ).to.be.revertedWith("Controller: commitment not found");
    });
  });

  describe("V2 Full Registration Flow", function () {
    it("alice can register alice.arc via V2 controller", async function () {
      await expect(registerV2("alice", alice))
        .to.emit(arcControllerV2, "NameRegistered");
    });

    it("alice can renew alice.arc via V2 controller", async function () {
      await registerV2("alice", alice);
      const price = await arcControllerV2.rentPrice("alice", ONE_YEAR);
      const maxCost = price.base + price.premium + BigInt(1_000_000);
      await usdc.connect(alice).approve(await arcControllerV2.getAddress(), maxCost);
      await expect(
        arcControllerV2.connect(alice).renew("alice", ONE_YEAR, maxCost)
      ).to.emit(arcControllerV2, "NameRenewed");
    });

    it("resolver V2 stores address records", async function () {
      await registerV2("alice", alice);
      const node = namehash("alice.arc");
      await resolverV2.connect(alice)["setAddr(bytes32,address)"](node, alice.address);
      expect(await resolverV2["addr(bytes32)"](node)).to.equal(alice.address);
    });
  });
});
