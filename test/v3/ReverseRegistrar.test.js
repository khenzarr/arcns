const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");

// ─── Helpers ──────────────────────────────────────────────────────────────────

function labelhash(label) {
  return ethers.keccak256(ethers.toUtf8Bytes(label));
}

/// @dev Computes the reverse node for an address, matching the contract's _sha3HexAddress logic
function reverseNode(addr) {
  const ADDR_REVERSE_NODE = "0x91d1777781884d03a6757a803996e38de2a42967fb37eeaca72729271025a9e2";
  // lowercase hex without 0x prefix
  const hexAddr = addr.toLowerCase().slice(2); // remove 0x
  const labelHash = ethers.keccak256(ethers.toUtf8Bytes(hexAddr));
  return ethers.keccak256(ethers.concat([ADDR_REVERSE_NODE, labelHash]));
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("ArcNSReverseRegistrar (v3)", function () {
  let registry, resolver, reverseRegistrar;
  let deployer, alice, bob, stranger;

  const ADDR_REVERSE_NODE = "0x91d1777781884d03a6757a803996e38de2a42967fb37eeaca72729271025a9e2";

  beforeEach(async function () {
    [deployer, alice, bob, stranger] = await ethers.getSigners();

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

    // Deploy ReverseRegistrar
    const ReverseRegistrar = await ethers.getContractFactory(
      "contracts/v3/registrar/ArcNSReverseRegistrar.sol:ArcNSReverseRegistrar"
    );
    reverseRegistrar = await ReverseRegistrar.deploy(
      await registry.getAddress(),
      await resolver.getAddress()
    );
    await reverseRegistrar.waitForDeployment();

    // Grant CONTROLLER_ROLE on Resolver to ReverseRegistrar
    await resolver.connect(deployer).setController(await reverseRegistrar.getAddress(), true);

    // Set up addr.reverse node in Registry — assign to ReverseRegistrar
    const addrLabel = labelhash("addr");
    const reverseLabel = labelhash("reverse");
    // Create "reverse" under root, then "addr" under "reverse"
    // Actually ADDR_REVERSE_NODE = namehash("addr.reverse")
    // We need to set up the registry so ReverseRegistrar owns ADDR_REVERSE_NODE
    // namehash("reverse") = keccak256(root, labelhash("reverse"))
    const reverseBaseNode = ethers.keccak256(ethers.concat([ethers.ZeroHash, reverseLabel]));
    await registry.setSubnodeOwner(ethers.ZeroHash, reverseLabel, deployer.address);
    await registry.setSubnodeOwner(reverseBaseNode, addrLabel, await reverseRegistrar.getAddress());
  });

  // ─── 1. Deployment ────────────────────────────────────────────────────────

  describe("deployment", function () {
    it("registry is set correctly", async function () {
      expect(await reverseRegistrar.registry()).to.equal(await registry.getAddress());
    });

    it("defaultResolver is set correctly", async function () {
      expect(await reverseRegistrar.defaultResolver()).to.equal(await resolver.getAddress());
    });

    it("ADDR_REVERSE_NODE is correct", async function () {
      expect(await reverseRegistrar.ADDR_REVERSE_NODE()).to.equal(ADDR_REVERSE_NODE);
    });
  });

  // ─── 2. node(addr) ────────────────────────────────────────────────────────

  describe("node(addr)", function () {
    it("returns deterministic reverse node for an address", async function () {
      const expected = reverseNode(alice.address);
      expect(await reverseRegistrar.node(alice.address)).to.equal(expected);
    });

    it("same address always returns same node", async function () {
      const n1 = await reverseRegistrar.node(alice.address);
      const n2 = await reverseRegistrar.node(alice.address);
      expect(n1).to.equal(n2);
    });

    it("different addresses return different nodes", async function () {
      const nAlice = await reverseRegistrar.node(alice.address);
      const nBob   = await reverseRegistrar.node(bob.address);
      expect(nAlice).to.not.equal(nBob);
    });
  });

  // ─── 3. setName (dashboard-driven flow) ──────────────────────────────────

  describe("setName (dashboard-driven flow)", function () {
    it("user calls setName and resolver.name(reverseNode) returns the set name", async function () {
      await reverseRegistrar.connect(alice).setName("alice.arc");
      const rNode = reverseNode(alice.address);
      expect(await resolver.name(rNode)).to.equal("alice.arc");
    });

    it("ReverseClaimed event emitted with correct addr and node", async function () {
      const rNode = reverseNode(alice.address);
      await expect(reverseRegistrar.connect(alice).setName("alice.arc"))
        .to.emit(reverseRegistrar, "ReverseClaimed")
        .withArgs(alice.address, rNode);
    });

    it("round-trip: setName then resolver.name(reverseNode) returns the set name", async function () {
      await reverseRegistrar.connect(alice).setName("alice.arc");
      const rNode = reverseNode(alice.address);
      expect(await resolver.name(rNode)).to.equal("alice.arc");
    });

    it("different users get different reverse nodes", async function () {
      await reverseRegistrar.connect(alice).setName("alice.arc");
      await reverseRegistrar.connect(bob).setName("bob.arc");

      const rNodeAlice = reverseNode(alice.address);
      const rNodeBob   = reverseNode(bob.address);

      expect(await resolver.name(rNodeAlice)).to.equal("alice.arc");
      expect(await resolver.name(rNodeBob)).to.equal("bob.arc");
      expect(rNodeAlice).to.not.equal(rNodeBob);
    });

    it("setName returns the reverse node hash", async function () {
      const rNode = reverseNode(alice.address);
      const tx = await reverseRegistrar.connect(alice).setName("alice.arc");
      const receipt = await tx.wait();
      // Verify via the event that the returned node matches
      const event = receipt.logs.find(
        (l) => l.fragment && l.fragment.name === "ReverseClaimed"
      );
      expect(event.args[1]).to.equal(rNode);
    });
  });

  // ─── 4. setReverseRecord (registration-time flow) ─────────────────────────

  describe("setReverseRecord (registration-time flow)", function () {
    // NOTE: This is the registration-time path. In production, the Controller calls
    // this inside a try/catch so failures are silently swallowed. Any address can call
    // this function — the Controller is the intended caller.

    it("can be called to set reverse record for any address", async function () {
      await reverseRegistrar.connect(deployer).setReverseRecord(alice.address, "alice.arc");
      const rNode = reverseNode(alice.address);
      expect(await resolver.name(rNode)).to.equal("alice.arc");
    });

    it("resolver.name(reverseNode(addr)) returns the set name after call", async function () {
      await reverseRegistrar.connect(stranger).setReverseRecord(bob.address, "bob.arc");
      const rNode = reverseNode(bob.address);
      expect(await resolver.name(rNode)).to.equal("bob.arc");
    });

    it("ReverseClaimed event emitted with correct addr and node", async function () {
      const rNode = reverseNode(alice.address);
      await expect(reverseRegistrar.connect(deployer).setReverseRecord(alice.address, "alice.arc"))
        .to.emit(reverseRegistrar, "ReverseClaimed")
        .withArgs(alice.address, rNode);
    });
  });

  // ─── 5. claimWithResolver ─────────────────────────────────────────────────

  describe("claimWithResolver", function () {
    it("claims reverse node with specified resolver", async function () {
      const rNode = reverseNode(alice.address);
      await reverseRegistrar.connect(alice).claimWithResolver(
        alice.address,
        alice.address,
        await resolver.getAddress()
      );
      expect(await registry.owner(rNode)).to.equal(alice.address);
      expect(await registry.resolver(rNode)).to.equal(await resolver.getAddress());
    });

    it("registry records the correct owner and resolver for the reverse node", async function () {
      const rNode = reverseNode(bob.address);
      await reverseRegistrar.connect(bob).claimWithResolver(
        bob.address,
        bob.address,
        await resolver.getAddress()
      );
      expect(await registry.owner(rNode)).to.equal(bob.address);
      expect(await registry.resolver(rNode)).to.equal(await resolver.getAddress());
    });
  });

  // ─── 6. setDefaultResolver ────────────────────────────────────────────────

  describe("setDefaultResolver", function () {
    it("owner can update defaultResolver", async function () {
      // Deploy a second resolver proxy for this test
      const ResolverFactory = await ethers.getContractFactory(
        "contracts/v3/resolver/ArcNSResolver.sol:ArcNSResolver"
      );
      const resolver2 = await upgrades.deployProxy(
        ResolverFactory,
        [await registry.getAddress(), deployer.address],
        { kind: "uups", unsafeAllow: ["constructor"] }
      );
      await resolver2.waitForDeployment();

      await reverseRegistrar.connect(deployer).setDefaultResolver(await resolver2.getAddress());
      expect(await reverseRegistrar.defaultResolver()).to.equal(await resolver2.getAddress());
    });

    it("DefaultResolverChanged event emitted", async function () {
      const ResolverFactory = await ethers.getContractFactory(
        "contracts/v3/resolver/ArcNSResolver.sol:ArcNSResolver"
      );
      const resolver2 = await upgrades.deployProxy(
        ResolverFactory,
        [await registry.getAddress(), deployer.address],
        { kind: "uups", unsafeAllow: ["constructor"] }
      );
      await resolver2.waitForDeployment();

      await expect(
        reverseRegistrar.connect(deployer).setDefaultResolver(await resolver2.getAddress())
      )
        .to.emit(reverseRegistrar, "DefaultResolverChanged")
        .withArgs(await resolver2.getAddress());
    });

    it("non-owner reverts with OwnableUnauthorizedAccount", async function () {
      const ResolverFactory = await ethers.getContractFactory(
        "contracts/v3/resolver/ArcNSResolver.sol:ArcNSResolver"
      );
      const resolver2 = await upgrades.deployProxy(
        ResolverFactory,
        [await registry.getAddress(), deployer.address],
        { kind: "uups", unsafeAllow: ["constructor"] }
      );
      await resolver2.waitForDeployment();

      await expect(
        reverseRegistrar.connect(stranger).setDefaultResolver(await resolver2.getAddress())
      ).to.be.revertedWithCustomError(reverseRegistrar, "OwnableUnauthorizedAccount");
    });
  });

  // ─── 7. Two-flow separation test ──────────────────────────────────────────

  describe("two-flow separation", function () {
    // Both setName (dashboard) and setReverseRecord (registration-time) write to
    // the same reverse record slot. This test verifies they interoperate correctly.

    it("setReverseRecord then setName overwrites correctly", async function () {
      // Registration-time flow sets the initial reverse record
      await reverseRegistrar.connect(deployer).setReverseRecord(alice.address, "alice.arc");
      const rNode = reverseNode(alice.address);
      expect(await resolver.name(rNode)).to.equal("alice.arc");

      // Dashboard-driven flow overwrites with a new name
      await reverseRegistrar.connect(alice).setName("alice-updated.arc");
      expect(await resolver.name(rNode)).to.equal("alice-updated.arc");
    });

    it("setName then setReverseRecord overwrites correctly", async function () {
      // Dashboard-driven flow sets the initial reverse record
      await reverseRegistrar.connect(alice).setName("alice.arc");
      const rNode = reverseNode(alice.address);
      expect(await resolver.name(rNode)).to.equal("alice.arc");

      // Registration-time flow overwrites
      await reverseRegistrar.connect(deployer).setReverseRecord(alice.address, "alice-v2.arc");
      expect(await resolver.name(rNode)).to.equal("alice-v2.arc");
    });

    it("both flows write to the same reverse record slot", async function () {
      const rNode = reverseNode(alice.address);

      // Use registration-time flow
      await reverseRegistrar.connect(deployer).setReverseRecord(alice.address, "alice.arc");
      const nameAfterRegistration = await resolver.name(rNode);

      // Use dashboard flow — same slot
      await reverseRegistrar.connect(alice).setName("alice.arc");
      const nameAfterDashboard = await resolver.name(rNode);

      expect(nameAfterRegistration).to.equal("alice.arc");
      expect(nameAfterDashboard).to.equal("alice.arc");
    });
  });
});
