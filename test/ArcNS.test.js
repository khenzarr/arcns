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
      const commitment = await arcController.makeCommitment(
        name, owner.address, duration, secret,
        await resolver.getAddress(), [], false
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
      const commitment = await arcController.makeCommitment(
        "alice", alice.address, ONE_YEAR, secret,
        await resolver.getAddress(), [], false
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
      const commitment = await arcController.makeCommitment(
        "alice", alice.address, ONE_YEAR, secret,
        await resolver.getAddress(), [], false
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
      const commitment = await circleController.makeCommitment(
        "alice", alice.address, ONE_YEAR, secret,
        await resolver.getAddress(), [], false
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
