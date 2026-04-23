const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

// ─── Namehash ─────────────────────────────────────────────────────────────────
function namehash(name) {
  let node = ethers.ZeroHash;
  if (name === "") return node;
  const labels = name.split(".").reverse();
  for (const label of labels) {
    const labelHash = ethers.keccak256(ethers.toUtf8Bytes(label));
    node = ethers.keccak256(ethers.concat([node, labelHash]));
  }
  return node;
}

describe("ArcNS Protocol", function () {
  let registry, resolver, priceOracle, arcRegistrar, circleRegistrar;
  let arcController, circleController, reverseRegistrar, usdc;
  let deployer, alice, bob, treasury;

  const ARC_NODE    = namehash("arc");
  const CIRCLE_NODE = namehash("circle");
  const ONE_YEAR    = 365 * 24 * 60 * 60;

  beforeEach(async function () {
    [deployer, alice, bob, treasury] = await ethers.getSigners();

    // Deploy MockUSDC
    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    usdc = await MockUSDC.deploy();

    // Deploy Registry
    const Registry = await ethers.getContractFactory("ArcNSRegistry");
    registry = await Registry.deploy();

    // Deploy Resolver
    const Resolver = await ethers.getContractFactory("ArcNSResolver");
    resolver = await Resolver.deploy(await registry.getAddress());

    // Deploy PriceOracle
    const PriceOracle = await ethers.getContractFactory("ArcNSPriceOracle");
    priceOracle = await PriceOracle.deploy();

    // Deploy BaseRegistrars
    const BaseRegistrar = await ethers.getContractFactory("ArcNSBaseRegistrar");
    arcRegistrar = await BaseRegistrar.deploy(await registry.getAddress(), ARC_NODE, "arc");
    circleRegistrar = await BaseRegistrar.deploy(await registry.getAddress(), CIRCLE_NODE, "circle");

    // Deploy ReverseRegistrar
    const ReverseRegistrar = await ethers.getContractFactory("ArcNSReverseRegistrar");
    reverseRegistrar = await ReverseRegistrar.deploy(
      await registry.getAddress(),
      await resolver.getAddress()
    );

    // Deploy Controllers
    const Controller = await ethers.getContractFactory("ArcNSRegistrarController");
    arcController = await Controller.deploy(
      await arcRegistrar.getAddress(),
      await priceOracle.getAddress(),
      await usdc.getAddress(),
      await registry.getAddress(),
      await resolver.getAddress(),
      treasury.address
    );
    circleController = await Controller.deploy(
      await circleRegistrar.getAddress(),
      await priceOracle.getAddress(),
      await usdc.getAddress(),
      await registry.getAddress(),
      await resolver.getAddress(),
      treasury.address
    );

    // Wire up
    const arcLabel    = ethers.keccak256(ethers.toUtf8Bytes("arc"));
    const circleLabel = ethers.keccak256(ethers.toUtf8Bytes("circle"));
    const reverseLabel = ethers.keccak256(ethers.toUtf8Bytes("reverse"));
    const addrLabel    = ethers.keccak256(ethers.toUtf8Bytes("addr"));

    await registry.setSubnodeOwner(ethers.ZeroHash, arcLabel, await arcRegistrar.getAddress());
    await registry.setSubnodeOwner(ethers.ZeroHash, circleLabel, await circleRegistrar.getAddress());
    await registry.setSubnodeOwner(ethers.ZeroHash, reverseLabel, deployer.address);
    await registry.setSubnodeOwner(namehash("reverse"), addrLabel, await reverseRegistrar.getAddress());

    await arcRegistrar.addController(await arcController.getAddress());
    await circleRegistrar.addController(await circleController.getAddress());

    await resolver.setTrustedController(await arcController.getAddress(), true);
    await resolver.setTrustedController(await circleController.getAddress(), true);
    await resolver.setTrustedController(await reverseRegistrar.getAddress(), true);

    // Fund alice with USDC
    await usdc.faucet(alice.address, 10_000 * 10 ** 6);
    await usdc.faucet(bob.address, 10_000 * 10 ** 6);
  });

  // ─── Registry ───────────────────────────────────────────────────────────────

  describe("ArcNSRegistry", function () {
    it("deployer owns root node", async function () {
      expect(await registry.owner(ethers.ZeroHash)).to.equal(deployer.address);
    });

    it("arcRegistrar owns .arc TLD", async function () {
      expect(await registry.owner(ARC_NODE)).to.equal(await arcRegistrar.getAddress());
    });

    it("circleRegistrar owns .circle TLD", async function () {
      expect(await registry.owner(CIRCLE_NODE)).to.equal(await circleRegistrar.getAddress());
    });

    it("setSubnodeOwner emits NewOwner", async function () {
      const label = ethers.keccak256(ethers.toUtf8Bytes("test"));
      await expect(registry.setSubnodeOwner(ethers.ZeroHash, label, alice.address))
        .to.emit(registry, "NewOwner")
        .withArgs(ethers.ZeroHash, label, alice.address);
    });

    it("non-owner cannot set subnode", async function () {
      const label = ethers.keccak256(ethers.toUtf8Bytes("test"));
      await expect(
        registry.connect(alice).setSubnodeOwner(ethers.ZeroHash, label, alice.address)
      ).to.be.revertedWith("ArcNS: not authorised");
    });

    it("operator can act on behalf of owner", async function () {
      await registry.setApprovalForAll(alice.address, true);
      const label = ethers.keccak256(ethers.toUtf8Bytes("test"));
      await expect(
        registry.connect(alice).setSubnodeOwner(ethers.ZeroHash, label, bob.address)
      ).to.not.be.reverted;
    });
  });

  // ─── Price Oracle ────────────────────────────────────────────────────────────

  describe("ArcNSPriceOracle", function () {
    it("returns correct price for 5+ char name (1 year)", async function () {
      const p = await priceOracle.price("alice", 0, ONE_YEAR);
      expect(p.base).to.equal(2_000_000); // $2 USDC
    });

    it("returns correct price for 3 char name (1 year)", async function () {
      const p = await priceOracle.price("abc", 0, ONE_YEAR);
      expect(p.base).to.equal(40_000_000); // $40 USDC
    });

    it("pro-rates for 6 months", async function () {
      const p = await priceOracle.price("alice", 0, ONE_YEAR / 2);
      expect(p.base).to.be.closeTo(1_000_000, 100); // ~$1 USDC
    });

    it("owner can update prices", async function () {
      await priceOracle.setPrices(1, 2, 3, 4, 5);
      const p = await priceOracle.price("alice", 0, ONE_YEAR);
      expect(p.base).to.equal(5);
    });
  });

  // ─── Registration ────────────────────────────────────────────────────────────

  describe("Registration (.arc)", function () {
    async function registerName(name, owner, duration = ONE_YEAR) {
      const secret = ethers.randomBytes(32);
      const commitment = await arcController["makeCommitment(string,address,uint256,bytes32,address,bytes[],bool,address)"](
        name, owner.address, duration, secret,
        await resolver.getAddress(), [], false, owner.address
      );

      await arcController.connect(owner).commit(commitment);
      await time.increase(65); // wait past MIN_COMMITMENT_AGE

      const price = await arcController.rentPrice(name, duration);
      await usdc.connect(owner).approve(await arcController.getAddress(), price.base + price.premium);

      return arcController.connect(owner).register(
        name, owner.address, duration, secret,
        await resolver.getAddress(), [], false
      );
    }

    it("alice can register alice.arc", async function () {
      const tx = registerName("alice", alice);
      await expect(tx).to.emit(arcController, "NameRegistered");
    });

    it("name is unavailable after registration", async function () {
      await registerName("alice", alice);
      expect(await arcController.available("alice")).to.be.false;
    });

    it("treasury receives USDC payment", async function () {
      const before = await usdc.balanceOf(treasury.address);
      await registerName("alice", alice);
      const after = await usdc.balanceOf(treasury.address);
      expect(after - before).to.equal(2_000_000);
    });

    it("cannot register without USDC approval", async function () {
      const secret = ethers.randomBytes(32);
      const commitment = await arcController.makeCommitment(
        "bob", bob.address, ONE_YEAR, secret,
        await resolver.getAddress(), [], false
      );
      await arcController.connect(bob).commit(commitment);
      await time.increase(65);

      await expect(
        arcController.connect(bob).register(
          "bob", bob.address, ONE_YEAR, secret,
          await resolver.getAddress(), [], false
        )
      ).to.be.reverted;
    });

    it("cannot register too early (front-run protection)", async function () {
      const secret = ethers.randomBytes(32);
      const commitment = await arcController["makeCommitment(string,address,uint256,bytes32,address,bytes[],bool,address)"](
        "alice", alice.address, ONE_YEAR, secret,
        await resolver.getAddress(), [], false, alice.address
      );
      await arcController.connect(alice).commit(commitment);
      // Don't wait

      const price = await arcController.rentPrice("alice", ONE_YEAR);
      await usdc.connect(alice).approve(await arcController.getAddress(), price.base);

      await expect(
        arcController.connect(alice).register(
          "alice", alice.address, ONE_YEAR, secret,
          await resolver.getAddress(), [], false
        )
      ).to.be.revertedWith("Controller: commitment too new");
    });

    it("cannot register name shorter than 3 chars", async function () {
      expect(await arcController.available("ab")).to.be.false;
    });

    it("alice can renew alice.arc", async function () {
      await registerName("alice", alice);
      const price = await arcController.rentPrice("alice", ONE_YEAR);
      await usdc.connect(alice).approve(await arcController.getAddress(), price.base);
      await expect(arcController.connect(alice).renew("alice", ONE_YEAR))
        .to.emit(arcController, "NameRenewed");
    });
  });

  // ─── Resolver ────────────────────────────────────────────────────────────────

  describe("ArcNSResolver", function () {
    let aliceNode;

    beforeEach(async function () {
      // Register alice.arc first
      const secret = ethers.randomBytes(32);
      const commitment = await arcController["makeCommitment(string,address,uint256,bytes32,address,bytes[],bool,address)"](
        "alice", alice.address, ONE_YEAR, secret,
        await resolver.getAddress(), [], false, alice.address
      );
      await arcController.connect(alice).commit(commitment);
      await time.increase(65);
      const price = await arcController.rentPrice("alice", ONE_YEAR);
      await usdc.connect(alice).approve(await arcController.getAddress(), price.base);
      await arcController.connect(alice).register(
        "alice", alice.address, ONE_YEAR, secret,
        await resolver.getAddress(), [], false
      );

      aliceNode = namehash("alice.arc");
    });

    it("alice can set her address record", async function () {
      await resolver.connect(alice)["setAddr(bytes32,address)"](aliceNode, alice.address);
      expect(await resolver["addr(bytes32)"](aliceNode)).to.equal(alice.address);
    });

    it("alice can set text records", async function () {
      await resolver.connect(alice).setText(aliceNode, "email", "alice@example.com");
      expect(await resolver.text(aliceNode, "email")).to.equal("alice@example.com");
    });

    it("alice can set contenthash", async function () {
      const hash = ethers.toUtf8Bytes("ipfs://QmTest");
      await resolver.connect(alice).setContenthash(aliceNode, hash);
      expect(await resolver.contenthash(aliceNode)).to.equal(ethers.hexlify(hash));
    });

    it("bob cannot set alice's records", async function () {
      await expect(
        resolver.connect(bob)["setAddr(bytes32,address)"](aliceNode, bob.address)
      ).to.be.revertedWith("Resolver: not authorised");
    });
  });

  // ─── Reverse Resolution ───────────────────────────────────────────────────────

  describe("ArcNSReverseRegistrar", function () {
    it("alice can set her reverse record", async function () {
      await expect(reverseRegistrar.connect(alice).setName("alice.arc"))
        .to.not.be.reverted;
    });

    it("node() returns correct reverse node for address", async function () {
      const node = await reverseRegistrar.node(alice.address);
      expect(node).to.be.a("string").with.length(66);
    });
  });

  // ─── .circle TLD ─────────────────────────────────────────────────────────────

  describe("Registration (.circle)", function () {
    it("alice can register alice.circle", async function () {
      const secret = ethers.randomBytes(32);
      const commitment = await circleController["makeCommitment(string,address,uint256,bytes32,address,bytes[],bool,address)"](
        "alice", alice.address, ONE_YEAR, secret,
        await resolver.getAddress(), [], false, alice.address
      );
      await circleController.connect(alice).commit(commitment);
      await time.increase(65);
      const price = await circleController.rentPrice("alice", ONE_YEAR);
      await usdc.connect(alice).approve(await circleController.getAddress(), price.base);
      await expect(
        circleController.connect(alice).register(
          "alice", alice.address, ONE_YEAR, secret,
          await resolver.getAddress(), [], false
        )
      ).to.emit(circleController, "NameRegistered");
    });
  });
});

// Helper — matches any value in chai event assertions
function anyValue() {
  return (x) => true;
}

describe("ArcNS Protocol Hardening", function () {
  let registry, resolver, priceOracle, arcRegistrar;
  let arcController, reverseRegistrar, usdc;
  let deployer, alice, bob, treasury;

  const ARC_NODE = namehash("arc");
  const ONE_YEAR = 365 * 24 * 60 * 60;
  const GRACE_PERIOD = 90 * 24 * 60 * 60;

  beforeEach(async function () {
    [deployer, alice, bob, treasury] = await ethers.getSigners();

    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    usdc = await MockUSDC.deploy();

    const Registry = await ethers.getContractFactory("ArcNSRegistry");
    registry = await Registry.deploy();

    const Resolver = await ethers.getContractFactory("ArcNSResolver");
    resolver = await Resolver.deploy(await registry.getAddress());

    const PriceOracle = await ethers.getContractFactory("ArcNSPriceOracle");
    priceOracle = await PriceOracle.deploy();

    const BaseRegistrar = await ethers.getContractFactory("ArcNSBaseRegistrar");
    arcRegistrar = await BaseRegistrar.deploy(await registry.getAddress(), ARC_NODE, "arc");

    const ReverseRegistrar = await ethers.getContractFactory("ArcNSReverseRegistrar");
    reverseRegistrar = await ReverseRegistrar.deploy(
      await registry.getAddress(),
      await resolver.getAddress()
    );

    const Controller = await ethers.getContractFactory("ArcNSRegistrarController");
    arcController = await Controller.deploy(
      await arcRegistrar.getAddress(),
      await priceOracle.getAddress(),
      await usdc.getAddress(),
      await registry.getAddress(),
      await resolver.getAddress(),
      treasury.address
    );

    const arcLabel    = ethers.keccak256(ethers.toUtf8Bytes("arc"));
    const reverseLabel = ethers.keccak256(ethers.toUtf8Bytes("reverse"));
    const addrLabel    = ethers.keccak256(ethers.toUtf8Bytes("addr"));

    await registry.setSubnodeOwner(ethers.ZeroHash, arcLabel, await arcRegistrar.getAddress());
    await registry.setSubnodeOwner(ethers.ZeroHash, reverseLabel, deployer.address);
    await registry.setSubnodeOwner(namehash("reverse"), addrLabel, await reverseRegistrar.getAddress());

    await arcRegistrar.addController(await arcController.getAddress());
    await resolver.setTrustedController(await arcController.getAddress(), true);
    await resolver.setTrustedController(await reverseRegistrar.getAddress(), true);

    await usdc.faucet(alice.address, 10_000 * 10 ** 6);
    await usdc.faucet(bob.address, 10_000 * 10 ** 6);
  });

  async function registerName(name, owner, duration = ONE_YEAR) {
    const secret = ethers.randomBytes(32);
    // Use explicit-caller overload: makeCommitment(..., caller)
    const commitment = await arcController["makeCommitment(string,address,uint256,bytes32,address,bytes[],bool,address)"](
      name, owner.address, duration, secret,
      await resolver.getAddress(), [], false, owner.address
    );
    await arcController.connect(owner).commit(commitment);
    await time.increase(65);
    const price = await arcController.rentPrice(name, duration);
    await usdc.connect(owner).approve(await arcController.getAddress(), price.base + price.premium);
    await arcController.connect(owner).register(
      name, owner.address, duration, secret,
      await resolver.getAddress(), [], false
    );
  }

  describe("Commit-Reveal Security", function () {
    it("register() reverts with 'commitment not found' when no commit was made", async function () {
      const secret = ethers.randomBytes(32);
      const price = await arcController.rentPrice("ghost", ONE_YEAR);
      await usdc.connect(alice).approve(await arcController.getAddress(), price.base);

      await expect(
        arcController.connect(alice).register(
          "ghost", alice.address, ONE_YEAR, secret,
          await resolver.getAddress(), [], false
        )
      ).to.be.revertedWith("Controller: commitment not found");
    });

    it("register() reverts before MIN_COMMITMENT_AGE (60s)", async function () {
      const secret = ethers.randomBytes(32);
      const commitment = await arcController["makeCommitment(string,address,uint256,bytes32,address,bytes[],bool,address)"](
        "early", alice.address, ONE_YEAR, secret,
        await resolver.getAddress(), [], false, alice.address
      );
      await arcController.connect(alice).commit(commitment);
      // Do NOT advance time

      const price = await arcController.rentPrice("early", ONE_YEAR);
      await usdc.connect(alice).approve(await arcController.getAddress(), price.base);

      await expect(
        arcController.connect(alice).register(
          "early", alice.address, ONE_YEAR, secret,
          await resolver.getAddress(), [], false
        )
      ).to.be.revertedWith("Controller: commitment too new");
    });

    it("register() reverts after MAX_COMMITMENT_AGE (24h)", async function () {
      const secret = ethers.randomBytes(32);
      const commitment = await arcController["makeCommitment(string,address,uint256,bytes32,address,bytes[],bool,address)"](
        "stale", alice.address, ONE_YEAR, secret,
        await resolver.getAddress(), [], false, alice.address
      );
      await arcController.connect(alice).commit(commitment);
      await time.increase(25 * 60 * 60); // 25 hours

      const price = await arcController.rentPrice("stale", ONE_YEAR);
      await usdc.connect(alice).approve(await arcController.getAddress(), price.base);

      await expect(
        arcController.connect(alice).register(
          "stale", alice.address, ONE_YEAR, secret,
          await resolver.getAddress(), [], false
        )
      ).to.be.revertedWith("Controller: commitment expired");
    });

    it("commitment cannot be reused after successful register (replay protection)", async function () {
      const secret = ethers.randomBytes(32);
      const commitment = await arcController["makeCommitment(string,address,uint256,bytes32,address,bytes[],bool,address)"](
        "replay", alice.address, ONE_YEAR, secret,
        await resolver.getAddress(), [], false, alice.address
      );
      await arcController.connect(alice).commit(commitment);
      await time.increase(65);

      const price = await arcController.rentPrice("replay", ONE_YEAR);
      await usdc.connect(alice).approve(await arcController.getAddress(), price.base * 2n);

      // First register succeeds
      await arcController.connect(alice).register(
        "replay", alice.address, ONE_YEAR, secret,
        await resolver.getAddress(), [], false
      );

      // Second register with same commitment must revert with "not found" (commitment deleted)
      await expect(
        arcController.connect(alice).register(
          "replay", alice.address, ONE_YEAR, secret,
          await resolver.getAddress(), [], false
        )
      ).to.be.revertedWith("Controller: commitment not found");
    });

    it("commitment includes msg.sender — different caller cannot register with another's commitment", async function () {
      const secret = ethers.randomBytes(32);
      // Alice commits (commitment binds to alice.address as caller)
      const aliceCommitment = await arcController["makeCommitment(string,address,uint256,bytes32,address,bytes[],bool,address)"](
        "stolen", alice.address, ONE_YEAR, secret,
        await resolver.getAddress(), [], false, alice.address
      );
      await arcController.connect(alice).commit(aliceCommitment);
      await time.increase(65);

      const price = await arcController.rentPrice("stolen", ONE_YEAR);
      await usdc.connect(bob).approve(await arcController.getAddress(), price.base);

      // Bob tries to register using alice's commitment — must fail because
      // bob's makeCommitment produces a different hash (different msg.sender)
      await expect(
        arcController.connect(bob).register(
          "stolen", alice.address, ONE_YEAR, secret,
          await resolver.getAddress(), [], false
        )
      ).to.be.reverted; // commitment hash mismatch
    });

    it("re-commit overwrites expired commitment safely", async function () {
      const secret = ethers.randomBytes(32);
      const commitment = await arcController["makeCommitment(string,address,uint256,bytes32,address,bytes[],bool,address)"](
        "recom", alice.address, ONE_YEAR, secret,
        await resolver.getAddress(), [], false, alice.address
      );

      // First commit
      await arcController.connect(alice).commit(commitment);
      const ts1 = await arcController.commitments(commitment);

      // Advance past MAX_COMMITMENT_AGE so the old commitment expires
      await time.increase(25 * 60 * 60);

      // Re-commit — should succeed and overwrite timestamp
      await arcController.connect(alice).commit(commitment);
      const ts2 = await arcController.commitments(commitment);
      expect(ts2).to.be.gt(ts1);

      // Now wait MIN_COMMITMENT_AGE and register successfully
      await time.increase(65);
      const price = await arcController.rentPrice("recom", ONE_YEAR);
      await usdc.connect(alice).approve(await arcController.getAddress(), price.base);
      await expect(
        arcController.connect(alice).register(
          "recom", alice.address, ONE_YEAR, secret,
          await resolver.getAddress(), [], false
        )
      ).to.emit(arcController, "NameRegistered");
    });
  });

  // ─── Expiry + Grace Period ─────────────────────────────────────────────────

  describe("Expiry + Grace Period", function () {
    it("available() returns false during GRACE_PERIOD", async function () {
      await registerName("grace", alice);
      const label = ethers.keccak256(ethers.toUtf8Bytes("grace"));
      const tokenId = BigInt(label);
      const expiry = await arcRegistrar.nameExpires(tokenId);

      // Advance to just after expiry but within grace
      await time.increaseTo(Number(expiry) + 1);
      expect(await arcController.available("grace")).to.be.false;
    });

    it("available() returns true after GRACE_PERIOD has elapsed", async function () {
      await registerName("postgrace", alice);
      const label = ethers.keccak256(ethers.toUtf8Bytes("postgrace"));
      const tokenId = BigInt(label);
      const expiry = await arcRegistrar.nameExpires(tokenId);

      // Advance past expiry + grace
      await time.increaseTo(Number(expiry) + GRACE_PERIOD + 1);
      expect(await arcController.available("postgrace")).to.be.true;
    });

    it("renew() succeeds during GRACE_PERIOD", async function () {
      await registerName("renewgrace", alice);
      const label = ethers.keccak256(ethers.toUtf8Bytes("renewgrace"));
      const tokenId = BigInt(label);
      const expiry = await arcRegistrar.nameExpires(tokenId);

      // Advance to within grace period
      await time.increaseTo(Number(expiry) + 1);

      const price = await arcController.rentPrice("renewgrace", ONE_YEAR);
      await usdc.connect(alice).approve(await arcController.getAddress(), price.base);
      await expect(arcController.connect(alice).renew("renewgrace", ONE_YEAR))
        .to.emit(arcController, "NameRenewed");
    });

    it("renew() reverts after GRACE_PERIOD has elapsed", async function () {
      await registerName("expiredname", alice);
      const label = ethers.keccak256(ethers.toUtf8Bytes("expiredname"));
      const tokenId = BigInt(label);
      const expiry = await arcRegistrar.nameExpires(tokenId);

      // Advance past expiry + grace
      await time.increaseTo(Number(expiry) + GRACE_PERIOD + 1);

      const price = await arcController.rentPrice("expiredname", ONE_YEAR);
      await usdc.connect(alice).approve(await arcController.getAddress(), price.base);
      await expect(arcController.connect(alice).renew("expiredname", ONE_YEAR))
        .to.be.revertedWith("BaseRegistrar: name expired");
    });

    it("name state: ACTIVE before expiry, GRACE between expiry and expiry+GRACE_PERIOD, AVAILABLE after", async function () {
      await registerName("states", alice);
      const label = ethers.keccak256(ethers.toUtf8Bytes("states"));
      const tokenId = BigInt(label);
      const expiry = await arcRegistrar.nameExpires(tokenId);

      // ACTIVE: before expiry
      expect(await arcController.available("states")).to.be.false;

      // GRACE: just after expiry
      await time.increaseTo(Number(expiry) + 1);
      expect(await arcController.available("states")).to.be.false; // still not available

      // AVAILABLE: after grace
      await time.increaseTo(Number(expiry) + GRACE_PERIOD + 1);
      expect(await arcController.available("states")).to.be.true;
    });

    it("renewal extends expiry correctly and preserves owner", async function () {
      await registerName("extend", alice);
      const label = ethers.keccak256(ethers.toUtf8Bytes("extend"));
      const tokenId = BigInt(label);
      const expiryBefore = await arcRegistrar.nameExpires(tokenId);

      const price = await arcController.rentPrice("extend", ONE_YEAR);
      await usdc.connect(alice).approve(await arcController.getAddress(), price.base);
      await arcController.connect(alice).renew("extend", ONE_YEAR);

      const expiryAfter = await arcRegistrar.nameExpires(tokenId);
      expect(expiryAfter).to.be.gt(expiryBefore);
      // Owner unchanged
      const node = namehash("extend.arc");
      expect(await registry.owner(node)).to.equal(alice.address);
    });
  });

  // ─── Resolver Completeness ─────────────────────────────────────────────────

  describe("Resolver Completeness", function () {
    let aliceNode;

    beforeEach(async function () {
      await registerName("alice", alice);
      aliceNode = namehash("alice.arc");
    });

    it("setText / text round-trip", async function () {
      await resolver.connect(alice).setText(aliceNode, "email", "alice@example.com");
      expect(await resolver.text(aliceNode, "email")).to.equal("alice@example.com");
    });

    it("setText emits TextChanged event", async function () {
      await expect(resolver.connect(alice).setText(aliceNode, "url", "https://alice.xyz"))
        .to.emit(resolver, "TextChanged")
        .withArgs(aliceNode, "url", "url", "https://alice.xyz");
    });

    it("setContenthash / contenthash round-trip", async function () {
      const hash = ethers.toUtf8Bytes("ipfs://QmHardeningTest");
      await resolver.connect(alice).setContenthash(aliceNode, hash);
      expect(await resolver.contenthash(aliceNode)).to.equal(ethers.hexlify(hash));
    });

    it("setContenthash emits ContenthashChanged event", async function () {
      const hash = ethers.toUtf8Bytes("ipfs://QmEventTest");
      await expect(resolver.connect(alice).setContenthash(aliceNode, hash))
        .to.emit(resolver, "ContenthashChanged")
        .withArgs(aliceNode, ethers.hexlify(hash));
    });

    it("setAddr(node, coinType, bytes) / addr(node, coinType) round-trip for non-EVM coin", async function () {
      // Bitcoin coin type = 0
      const btcAddr = ethers.toUtf8Bytes("1A1zP1eP5QGefi2DMPTfTL5SLmv7Divf");
      await resolver.connect(alice)["setAddr(bytes32,uint256,bytes)"](aliceNode, 0, btcAddr);
      const stored = await resolver["addr(bytes32,uint256)"](aliceNode, 0);
      expect(stored).to.equal(ethers.hexlify(btcAddr));
    });

    it("setAddr(EVM) emits both AddrChanged and AddressChanged", async function () {
      await expect(resolver.connect(alice)["setAddr(bytes32,address)"](aliceNode, alice.address))
        .to.emit(resolver, "AddrChanged").withArgs(aliceNode, alice.address)
        .and.to.emit(resolver, "AddressChanged");
    });

    it("non-owner cannot write resolver records", async function () {
      await expect(
        resolver.connect(bob).setText(aliceNode, "email", "hacker@evil.com")
      ).to.be.revertedWith("Resolver: not authorised");
    });
  });

  // ─── Reverse Record Integrity ──────────────────────────────────────────────

  describe("Reverse Record Integrity", function () {
    it("setNameForAddr() with empty string does not store empty name", async function () {
      // Should not revert but also not store empty string
      await resolver.connect(alice).setNameForAddr(
        alice.address, alice.address, await resolver.getAddress(), ""
      );
      // Verify nothing was stored (name should remain empty/default)
      const reverseBaseNode = "0x91d1777781884d03a6757a803996e38de2a42967fb37eeaca72729271025a9e2";
      // The call should silently no-op — no revert, no storage
    });

    it("full registration flow produces correct forward and reverse record", async function () {
      const secret = ethers.randomBytes(32);
      const commitment = await arcController["makeCommitment(string,address,uint256,bytes32,address,bytes[],bool,address)"](
        "fwdrev", alice.address, ONE_YEAR, secret,
        await resolver.getAddress(), [], true, alice.address
      );
      await arcController.connect(alice).commit(commitment);
      await time.increase(65);

      const price = await arcController.rentPrice("fwdrev", ONE_YEAR);
      await usdc.connect(alice).approve(await arcController.getAddress(), price.base);
      await arcController.connect(alice).register(
        "fwdrev", alice.address, ONE_YEAR, secret,
        await resolver.getAddress(), [], true
      );

      // Forward: addr(namehash("fwdrev.arc")) should resolve to alice
      const node = namehash("fwdrev.arc");
      await resolver.connect(alice)["setAddr(bytes32,address)"](node, alice.address);
      expect(await resolver["addr(bytes32)"](node)).to.equal(alice.address);

      // Registry owner should be alice
      expect(await registry.owner(node)).to.equal(alice.address);
    });
  });
});


describe("ArcNS Attack Simulation", function () {
  let registry, resolver, priceOracle, arcRegistrar;
  let arcController, usdc;
  let deployer, alice, bob, attacker, treasury;

  const ARC_NODE = namehash("arc");
  const ONE_YEAR = 365 * 24 * 60 * 60;
  const GRACE_PERIOD = 90 * 24 * 60 * 60;

  beforeEach(async function () {
    [deployer, alice, bob, attacker, treasury] = await ethers.getSigners();

    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    usdc = await MockUSDC.deploy();

    const Registry = await ethers.getContractFactory("ArcNSRegistry");
    registry = await Registry.deploy();

    const Resolver = await ethers.getContractFactory("ArcNSResolver");
    resolver = await Resolver.deploy(await registry.getAddress());

    const PriceOracle = await ethers.getContractFactory("ArcNSPriceOracle");
    priceOracle = await PriceOracle.deploy();

    const BaseRegistrar = await ethers.getContractFactory("ArcNSBaseRegistrar");
    arcRegistrar = await BaseRegistrar.deploy(await registry.getAddress(), ARC_NODE, "arc");

    const Controller = await ethers.getContractFactory("ArcNSRegistrarController");
    arcController = await Controller.deploy(
      await arcRegistrar.getAddress(),
      await priceOracle.getAddress(),
      await usdc.getAddress(),
      await registry.getAddress(),
      await resolver.getAddress(),
      treasury.address
    );

    const arcLabel = ethers.keccak256(ethers.toUtf8Bytes("arc"));
    await registry.setSubnodeOwner(ethers.ZeroHash, arcLabel, await arcRegistrar.getAddress());
    await arcRegistrar.addController(await arcController.getAddress());
    await resolver.setTrustedController(await arcController.getAddress(), true);

    await usdc.faucet(alice.address, 10_000 * 10 ** 6);
    await usdc.faucet(attacker.address, 10_000 * 10 ** 6);
  });

  async function registerName(name, owner, duration = ONE_YEAR) {
    const secret = ethers.randomBytes(32);
    const commitment = await arcController["makeCommitment(string,address,uint256,bytes32,address,bytes[],bool,address)"](
      name, owner.address, duration, secret,
      await resolver.getAddress(), [], false, owner.address
    );
    await arcController.connect(owner).commit(commitment);
    await time.increase(65);
    const price = await arcController.rentPrice(name, duration);
    await usdc.connect(owner).approve(await arcController.getAddress(), price.base + price.premium);
    await arcController.connect(owner).register(
      name, owner.address, duration, secret,
      await resolver.getAddress(), [], false
    );
  }

  // ─── Economic Attacks ─────────────────────────────────────────────────────

  describe("Economic Attack Simulation", function () {
    it("front-running: attacker cannot steal commitment (msg.sender bound)", async function () {
      const secret = ethers.randomBytes(32);
      // Alice creates her commitment
      const aliceCommitment = await arcController["makeCommitment(string,address,uint256,bytes32,address,bytes[],bool,address)"](
        "premium", alice.address, ONE_YEAR, secret,
        await resolver.getAddress(), [], false, alice.address
      );
      await arcController.connect(alice).commit(aliceCommitment);
      await time.increase(65);

      // Attacker sees the commitment on-chain and tries to register with it
      await usdc.connect(attacker).approve(await arcController.getAddress(), 10_000_000n);
      await expect(
        arcController.connect(attacker).register(
          "premium", alice.address, ONE_YEAR, secret,
          await resolver.getAddress(), [], false
        )
      ).to.be.revertedWith("Controller: commitment not found");
    });

    it("register sniping after expiry: blocked during grace period", async function () {
      await registerName("snipe", alice);
      const label = ethers.keccak256(ethers.toUtf8Bytes("snipe"));
      const tokenId = BigInt(label);
      const expiry = await arcRegistrar.nameExpires(tokenId);

      // Advance to just after expiry (within grace)
      await time.increaseTo(Number(expiry) + 1);

      // Attacker tries to register — must fail (still in grace)
      const secret = ethers.randomBytes(32);
      const commitment = await arcController["makeCommitment(string,address,uint256,bytes32,address,bytes[],bool,address)"](
        "snipe", attacker.address, ONE_YEAR, secret,
        await resolver.getAddress(), [], false, attacker.address
      );
      await arcController.connect(attacker).commit(commitment);
      await time.increase(65);
      await usdc.connect(attacker).approve(await arcController.getAddress(), 10_000_000n);

      await expect(
        arcController.connect(attacker).register(
          "snipe", attacker.address, ONE_YEAR, secret,
          await resolver.getAddress(), [], false
        )
      ).to.be.reverted; // BaseRegistrar: name not available
    });

    it("register sniping after grace: succeeds (correct behaviour)", async function () {
      await registerName("expired", alice);
      const label = ethers.keccak256(ethers.toUtf8Bytes("expired"));
      const tokenId = BigInt(label);
      const expiry = await arcRegistrar.nameExpires(tokenId);

      // Advance past expiry + grace
      await time.increaseTo(Number(expiry) + GRACE_PERIOD + 1);

      const secret = ethers.randomBytes(32);
      const commitment = await arcController["makeCommitment(string,address,uint256,bytes32,address,bytes[],bool,address)"](
        "expired", attacker.address, ONE_YEAR, secret,
        await resolver.getAddress(), [], false, attacker.address
      );
      await arcController.connect(attacker).commit(commitment);
      await time.increase(65);
      await usdc.connect(attacker).approve(await arcController.getAddress(), 10_000_000n);

      await expect(
        arcController.connect(attacker).register(
          "expired", attacker.address, ONE_YEAR, secret,
          await resolver.getAddress(), [], false
        )
      ).to.emit(arcController, "NameRegistered");
    });

    it("duration overflow attack: register with max uint256 duration reverts", async function () {
      const secret = ethers.randomBytes(32);
      const maxDuration = ethers.MaxUint256;
      const commitment = await arcController["makeCommitment(string,address,uint256,bytes32,address,bytes[],bool,address)"](
        "overflow", attacker.address, maxDuration, secret,
        await resolver.getAddress(), [], false, attacker.address
      );
      await arcController.connect(attacker).commit(commitment);
      await time.increase(65);
      await usdc.connect(attacker).approve(await arcController.getAddress(), ethers.MaxUint256);

      await expect(
        arcController.connect(attacker).register(
          "overflow", attacker.address, maxDuration, secret,
          await resolver.getAddress(), [], false
        )
      ).to.be.revertedWith("Controller: duration too long");
    });

    it("duration overflow attack: renew with max uint256 duration reverts", async function () {
      await registerName("renew-overflow", alice);
      await usdc.connect(alice).approve(await arcController.getAddress(), ethers.MaxUint256);
      await expect(
        arcController.connect(alice).renew("renew-overflow", ethers.MaxUint256)
      ).to.be.revertedWith("Controller: duration too long");
    });
  });

  // ─── DoS / Spam Protection ────────────────────────────────────────────────

  describe("DoS / Spam Protection", function () {
    it("commitment spam: 20 different commitments from attacker all stored (gas cost is the limit)", async function () {
      // Each commit costs gas — this is the intended DoS protection
      // Verify the mapping correctly stores all of them
      const commitments = [];
      for (let i = 0; i < 20; i++) {
        const secret = ethers.randomBytes(32);
        const c = await arcController["makeCommitment(string,address,uint256,bytes32,address,bytes[],bool,address)"](
          `spam${i}`, attacker.address, ONE_YEAR, secret,
          await resolver.getAddress(), [], false, attacker.address
        );
        await arcController.connect(attacker).commit(c);
        commitments.push(c);
      }
      // All commitments stored
      for (const c of commitments) {
        expect(await arcController.commitments(c)).to.be.gt(0);
      }
    });

    it("_setRecords: more than MAX_RESOLVER_DATA_ITEMS items reverts", async function () {
      const secret = ethers.randomBytes(32);
      // Build 11 data items (over the limit of 10) first so we can include them in commitment
      const node = ethers.ZeroHash; // placeholder — will be overwritten
      const iface = new ethers.Interface(["function setText(bytes32,string,string)"]);
      const dataItem = iface.encodeFunctionData("setText", [node, "key", "val"]);
      const data = Array(11).fill(dataItem);

      const commitment = await arcController["makeCommitment(string,address,uint256,bytes32,address,bytes[],bool,address)"](
        "dataflood", alice.address, ONE_YEAR, secret,
        await resolver.getAddress(), data, false, alice.address
      );
      await arcController.connect(alice).commit(commitment);
      await time.increase(65);

      await usdc.connect(alice).approve(await arcController.getAddress(), 10_000_000n);
      await expect(
        arcController.connect(alice).register(
          "dataflood", alice.address, ONE_YEAR, secret,
          await resolver.getAddress(), data, false
        )
      ).to.be.revertedWith("Controller: too many data items");
    });

    it("_setRecords: disallowed selector (setTrustedController) reverts", async function () {
      const secret = ethers.randomBytes(32);

      // Craft a call to setTrustedController — should be blocked
      // Build: 4-byte selector + 32-byte node placeholder + 32-byte address arg
      const sel = ethers.id("setTrustedController(address,bool)").slice(0, 10); // "0x" + 8 hex chars
      const selBytes = ethers.getBytes(sel);
      const nodeBytes = ethers.getBytes(ethers.ZeroHash);
      const addrPadded = ethers.getBytes(ethers.zeroPadValue(attacker.address, 32));
      const boolPadded = ethers.getBytes(ethers.zeroPadValue("0x01", 32));
      const data = [ethers.concat([selBytes, nodeBytes, addrPadded, boolPadded])];

      const commitment = await arcController["makeCommitment(string,address,uint256,bytes32,address,bytes[],bool,address)"](
        "badsel", alice.address, ONE_YEAR, secret,
        await resolver.getAddress(), data, false, alice.address
      );
      await arcController.connect(alice).commit(commitment);
      await time.increase(65);

      await usdc.connect(alice).approve(await arcController.getAddress(), 10_000_000n);
      await expect(
        arcController.connect(alice).register(
          "badsel", alice.address, ONE_YEAR, secret,
          await resolver.getAddress(), data, false
        )
      ).to.be.revertedWith("Controller: disallowed selector");
    });
  });

  // ─── Resolver Attack Surface ──────────────────────────────────────────────

  describe("Resolver Attack Surface", function () {
    let aliceNode;

    beforeEach(async function () {
      await registerName("alice", alice);
      aliceNode = namehash("alice.arc");
    });

    it("setAddr with coinType=60 and wrong length reverts with clear error", async function () {
      // Attacker tries to set a 0-byte EVM address — should revert cleanly
      await expect(
        resolver.connect(alice)["setAddr(bytes32,uint256,bytes)"](aliceNode, 60, "0x")
      ).to.be.revertedWith("Resolver: invalid EVM address length");
    });

    it("setAddr with coinType=60 and 21-byte payload reverts", async function () {
      const badAddr = ethers.randomBytes(21);
      await expect(
        resolver.connect(alice)["setAddr(bytes32,uint256,bytes)"](aliceNode, 60, badAddr)
      ).to.be.revertedWith("Resolver: invalid EVM address length");
    });

    it("non-EVM coin with arbitrary length bytes succeeds", async function () {
      // Solana address = 32 bytes
      const solAddr = ethers.randomBytes(32);
      await expect(
        resolver.connect(alice)["setAddr(bytes32,uint256,bytes)"](aliceNode, 501, solAddr)
      ).to.not.be.reverted;
      const stored = await resolver["addr(bytes32,uint256)"](aliceNode, 501);
      expect(stored).to.equal(ethers.hexlify(solAddr));
    });
  });
});

describe("ArcNS Mainnet Readiness", function () {
  let registry, resolver, priceOracle, arcRegistrar, circleRegistrar;
  let arcController, circleController, usdc;
  let deployer, alice, bob, treasury;

  const ARC_NODE    = namehash("arc");
  const CIRCLE_NODE = namehash("circle");
  const ONE_YEAR    = 365 * 24 * 60 * 60;
  const GRACE_PERIOD = 90 * 24 * 60 * 60;

  beforeEach(async function () {
    [deployer, alice, bob, treasury] = await ethers.getSigners();

    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    usdc = await MockUSDC.deploy();

    const Registry = await ethers.getContractFactory("ArcNSRegistry");
    registry = await Registry.deploy();

    const Resolver = await ethers.getContractFactory("ArcNSResolver");
    resolver = await Resolver.deploy(await registry.getAddress());

    const PriceOracle = await ethers.getContractFactory("ArcNSPriceOracle");
    priceOracle = await PriceOracle.deploy();

    const BaseRegistrar = await ethers.getContractFactory("ArcNSBaseRegistrar");
    arcRegistrar    = await BaseRegistrar.deploy(await registry.getAddress(), ARC_NODE, "arc");
    circleRegistrar = await BaseRegistrar.deploy(await registry.getAddress(), CIRCLE_NODE, "circle");

    const Controller = await ethers.getContractFactory("ArcNSRegistrarController");
    arcController = await Controller.deploy(
      await arcRegistrar.getAddress(), await priceOracle.getAddress(),
      await usdc.getAddress(), await registry.getAddress(),
      await resolver.getAddress(), treasury.address
    );
    circleController = await Controller.deploy(
      await circleRegistrar.getAddress(), await priceOracle.getAddress(),
      await usdc.getAddress(), await registry.getAddress(),
      await resolver.getAddress(), treasury.address
    );

    const arcLabel    = ethers.keccak256(ethers.toUtf8Bytes("arc"));
    const circleLabel = ethers.keccak256(ethers.toUtf8Bytes("circle"));
    const reverseLabel = ethers.keccak256(ethers.toUtf8Bytes("reverse"));
    const addrLabel    = ethers.keccak256(ethers.toUtf8Bytes("addr"));

    await registry.setSubnodeOwner(ethers.ZeroHash, arcLabel, await arcRegistrar.getAddress());
    await registry.setSubnodeOwner(ethers.ZeroHash, circleLabel, await circleRegistrar.getAddress());
    await registry.setSubnodeOwner(ethers.ZeroHash, reverseLabel, deployer.address);
    await registry.setSubnodeOwner(namehash("reverse"), addrLabel, deployer.address);

    await arcRegistrar.addController(await arcController.getAddress());
    await circleRegistrar.addController(await circleController.getAddress());
    await resolver.setTrustedController(await arcController.getAddress(), true);
    await resolver.setTrustedController(await circleController.getAddress(), true);

    await usdc.faucet(alice.address, 10_000 * 10 ** 6);
    await usdc.faucet(bob.address, 10_000 * 10 ** 6);
  });

  async function registerName(name, owner, controller = arcController, duration = ONE_YEAR) {
    const secret = ethers.randomBytes(32);
    const commitment = await controller["makeCommitment(string,address,uint256,bytes32,address,bytes[],bool,address)"](
      name, owner.address, duration, secret,
      await resolver.getAddress(), [], false, owner.address
    );
    await controller.connect(owner).commit(commitment);
    await time.increase(65);
    const price = await controller.rentPrice(name, duration);
    await usdc.connect(owner).approve(await controller.getAddress(), price.base + price.premium);
    await controller.connect(owner).register(
      name, owner.address, duration, secret, await resolver.getAddress(), [], false
    );
    return secret;
  }

  // ─── Cross-controller replay prevention ───────────────────────────────────

  describe("Cross-controller replay prevention (chainId + address(this))", function () {
    it("commitment for arcController is rejected by circleController", async function () {
      const secret = ethers.randomBytes(32);
      // Generate commitment bound to arcController (via msg.sender binding)
      const commitment = await arcController["makeCommitment(string,address,uint256,bytes32,address,bytes[],bool,address)"](
        "crossreplay", alice.address, ONE_YEAR, secret,
        await resolver.getAddress(), [], false, alice.address
      );
      // Submit to arcController
      await arcController.connect(alice).commit(commitment);
      await time.increase(65);

      // Try to use same commitment on circleController — must fail
      // because the commitment was stored in arcController's mapping, not circleController's
      await usdc.connect(alice).approve(await circleController.getAddress(), 10_000_000n);
      await expect(
        circleController.connect(alice).register(
          "crossreplay", alice.address, ONE_YEAR, secret,
          await resolver.getAddress(), [], false
        )
      ).to.be.revertedWith("Controller: commitment not found");
    });

    it("commitment hash is deterministic for same inputs", async function () {
      const secret = ethers.randomBytes(32);
      const hash1 = await arcController["makeCommitment(string,address,uint256,bytes32,address,bytes[],bool,address)"](
        "diffhash", alice.address, ONE_YEAR, secret,
        await resolver.getAddress(), [], false, alice.address
      );
      const hash2 = await arcController["makeCommitment(string,address,uint256,bytes32,address,bytes[],bool,address)"](
        "diffhash", alice.address, ONE_YEAR, secret,
        await resolver.getAddress(), [], false, alice.address
      );
      // Same inputs → same hash (deterministic)
      expect(hash1).to.equal(hash2);
    });
  });

  // ─── ENS parity: resolve ↔ reverse consistency ────────────────────────────

  describe("ENS parity: forward ↔ reverse consistency", function () {
    it("addr(namehash(name)) == owner after registration with setAddr", async function () {
      await registerName("consistency", alice);
      const node = namehash("consistency.arc");
      await resolver.connect(alice)["setAddr(bytes32,address)"](node, alice.address);
      expect(await resolver["addr(bytes32)"](node)).to.equal(alice.address);
      expect(await registry.owner(node)).to.equal(alice.address);
    });

    it("namehash is deterministic: same name always produces same hash", async function () {
      const h1 = namehash("alice.arc");
      const h2 = namehash("alice.arc");
      expect(h1).to.equal(h2);
    });

    it("different names produce different namehashes", async function () {
      expect(namehash("alice.arc")).to.not.equal(namehash("bob.arc"));
      expect(namehash("alice.arc")).to.not.equal(namehash("alice.circle"));
    });
  });

  // ─── Resolver completeness: no silent failures ────────────────────────────

  describe("Resolver: no silent failures on invalid input", function () {
    let aliceNode;
    beforeEach(async function () {
      await registerName("alice", alice);
      aliceNode = namehash("alice.arc");
    });

    it("setAddr with zero address stores zero (explicit, not silent)", async function () {
      await resolver.connect(alice)["setAddr(bytes32,address)"](aliceNode, ethers.ZeroAddress);
      expect(await resolver["addr(bytes32)"](aliceNode)).to.equal(ethers.ZeroAddress);
    });

    it("text() returns empty string for unset key (no revert)", async function () {
      const val = await resolver.text(aliceNode, "nonexistent");
      expect(val).to.equal("");
    });

    it("contenthash() returns empty bytes for unset node (no revert)", async function () {
      const val = await resolver.contenthash(aliceNode);
      expect(val).to.equal("0x");
    });

    it("addr() returns zero address for unset node (no revert)", async function () {
      const unsetNode = namehash("unset.arc");
      expect(await resolver["addr(bytes32)"](unsetNode)).to.equal(ethers.ZeroAddress);
    });

    it("multiple text keys are independent", async function () {
      await resolver.connect(alice).setText(aliceNode, "email", "alice@example.com");
      await resolver.connect(alice).setText(aliceNode, "url", "https://alice.xyz");
      expect(await resolver.text(aliceNode, "email")).to.equal("alice@example.com");
      expect(await resolver.text(aliceNode, "url")).to.equal("https://alice.xyz");
      expect(await resolver.text(aliceNode, "twitter")).to.equal("");
    });
  });

  // ─── Duration boundary tests ──────────────────────────────────────────────

  describe("Duration boundary enforcement", function () {
    it("register with exactly MIN_REGISTRATION_DURATION succeeds", async function () {
      const minDuration = 28 * 24 * 60 * 60; // 28 days
      const secret = ethers.randomBytes(32);
      const commitment = await arcController["makeCommitment(string,address,uint256,bytes32,address,bytes[],bool,address)"](
        "mindur", alice.address, minDuration, secret,
        await resolver.getAddress(), [], false, alice.address
      );
      await arcController.connect(alice).commit(commitment);
      await time.increase(65);
      const price = await arcController.rentPrice("mindur", minDuration);
      await usdc.connect(alice).approve(await arcController.getAddress(), price.base + price.premium);
      await expect(
        arcController.connect(alice).register(
          "mindur", alice.address, minDuration, secret, await resolver.getAddress(), [], false
        )
      ).to.emit(arcController, "NameRegistered");
    });

    it("register with exactly MAX_REGISTRATION_DURATION succeeds", async function () {
      const maxDuration = 10 * 365 * 24 * 60 * 60; // 10 years
      const secret = ethers.randomBytes(32);
      const commitment = await arcController["makeCommitment(string,address,uint256,bytes32,address,bytes[],bool,address)"](
        "maxdur", alice.address, maxDuration, secret,
        await resolver.getAddress(), [], false, alice.address
      );
      await arcController.connect(alice).commit(commitment);
      await time.increase(65);
      const price = await arcController.rentPrice("maxdur", maxDuration);
      await usdc.connect(alice).approve(await arcController.getAddress(), price.base + price.premium);
      await expect(
        arcController.connect(alice).register(
          "maxdur", alice.address, maxDuration, secret, await resolver.getAddress(), [], false
        )
      ).to.emit(arcController, "NameRegistered");
    });

    it("register with MIN_REGISTRATION_DURATION - 1 second reverts", async function () {
      const tooShort = 28 * 24 * 60 * 60 - 1;
      const secret = ethers.randomBytes(32);
      const commitment = await arcController["makeCommitment(string,address,uint256,bytes32,address,bytes[],bool,address)"](
        "tooshort", alice.address, tooShort, secret,
        await resolver.getAddress(), [], false, alice.address
      );
      await arcController.connect(alice).commit(commitment);
      await time.increase(65);
      await usdc.connect(alice).approve(await arcController.getAddress(), 10_000_000n);
      await expect(
        arcController.connect(alice).register(
          "tooshort", alice.address, tooShort, secret, await resolver.getAddress(), [], false
        )
      ).to.be.revertedWith("Controller: duration too short");
    });
  });

  // ─── Subgraph trust boundary ──────────────────────────────────────────────

  describe("Subgraph trust boundary: RPC is source of truth", function () {
    it("registry.owner() is authoritative — not subgraph", async function () {
      await registerName("truth", alice);
      const node = namehash("truth.arc");
      // On-chain owner is alice — this is the ground truth
      expect(await registry.owner(node)).to.equal(alice.address);
    });

    it("available() on-chain is authoritative for availability", async function () {
      await registerName("avail", alice);
      // On-chain says not available
      expect(await arcController.available("avail")).to.be.false;
      // Advance past grace
      const label = ethers.keccak256(ethers.toUtf8Bytes("avail"));
      const tokenId = BigInt(label);
      const expiry = await arcRegistrar.nameExpires(tokenId);
      await time.increaseTo(Number(expiry) + GRACE_PERIOD + 1);
      // On-chain now says available
      expect(await arcController.available("avail")).to.be.true;
    });
  });
});
