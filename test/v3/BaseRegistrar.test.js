const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");

function labelhash(label) {
  return ethers.keccak256(ethers.toUtf8Bytes(label));
}

const GRACE_PERIOD = 90 * 24 * 60 * 60; // 90 days in seconds
const ONE_YEAR = 365 * 24 * 60 * 60;

// The .arc TLD namehash
const ARC_NAMEHASH = "0x9a7ad1c5d8b1c60ef156c6723dbf462681d6462768a9e60c53665d7fc1337bae";

describe("ArcNSBaseRegistrar (v3)", function () {
  let registry, registrar;
  let deployer, alice, bob, controller, other;

  beforeEach(async function () {
    [deployer, alice, bob, controller, other] = await ethers.getSigners();

    // Deploy registry
    const Registry = await ethers.getContractFactory("contracts/v3/registry/ArcNSRegistry.sol:ArcNSRegistry");
    registry = await Registry.deploy();
    await registry.waitForDeployment();

    // Deploy registrar for .arc
    const Registrar = await ethers.getContractFactory("contracts/v3/registrar/ArcNSBaseRegistrar.sol:ArcNSBaseRegistrar");
    registrar = await Registrar.deploy(await registry.getAddress(), ARC_NAMEHASH, "arc");
    await registrar.waitForDeployment();

    // Assign the .arc TLD node to the registrar
    const arcLabel = labelhash("arc");
    await registry.setSubnodeOwner(ethers.ZeroHash, arcLabel, await registrar.getAddress());

    // Add controller
    await registrar.addController(controller.address);
  });

  // ─── Deployment ───────────────────────────────────────────────────────────

  describe("deployment", function () {
    it("has correct name and symbol", async function () {
      expect(await registrar.name()).to.equal("ArcNS arc Name");
      expect(await registrar.symbol()).to.equal("ARCNS-arc");
    });

    it("has correct registry and baseNode", async function () {
      expect(await registrar.registry()).to.equal(await registry.getAddress());
      expect(await registrar.baseNode()).to.equal(ARC_NAMEHASH);
    });

    it("has correct tld", async function () {
      expect(await registrar.tld()).to.equal("arc");
    });

    it("has correct GRACE_PERIOD", async function () {
      expect(await registrar.GRACE_PERIOD()).to.equal(GRACE_PERIOD);
    });
  });

  // ─── available ────────────────────────────────────────────────────────────

  describe("available", function () {
    it("returns true for a new (never registered) id", async function () {
      const id = labelhash("alice");
      expect(await registrar.available(id)).to.be.true;
    });

    it("returns false immediately after registration", async function () {
      const id = labelhash("alice");
      await registrar.connect(controller).register(id, alice.address, ONE_YEAR);
      expect(await registrar.available(id)).to.be.false;
    });

    it("returns false during grace period after expiry", async function () {
      const id = labelhash("alice");
      await registrar.connect(controller).register(id, alice.address, ONE_YEAR);

      // Advance past expiry but within grace period
      await time.increase(ONE_YEAR + 1);
      expect(await registrar.available(id)).to.be.false;
    });

    it("returns true after expiry + grace period", async function () {
      const id = labelhash("alice");
      await registrar.connect(controller).register(id, alice.address, ONE_YEAR);

      // Advance past expiry + grace period
      await time.increase(ONE_YEAR + GRACE_PERIOD + 1);
      expect(await registrar.available(id)).to.be.true;
    });
  });

  // ─── register ─────────────────────────────────────────────────────────────

  describe("register", function () {
    it("mints NFT to owner", async function () {
      const id = labelhash("alice");
      await registrar.connect(controller).register(id, alice.address, ONE_YEAR);
      // Use ERC721 balanceOf since ownerOf checks expiry
      expect(await registrar.balanceOf(alice.address)).to.equal(1n);
    });

    it("sets nameExpires correctly", async function () {
      const id = labelhash("alice");
      const tx = await registrar.connect(controller).register(id, alice.address, ONE_YEAR);
      const receipt = await tx.wait();
      const block = await ethers.provider.getBlock(receipt.blockNumber);
      const expectedExpiry = BigInt(block.timestamp) + BigInt(ONE_YEAR);
      expect(await registrar.nameExpires(id)).to.equal(expectedExpiry);
    });

    it("emits NameRegistered event", async function () {
      const id = labelhash("alice");
      await expect(registrar.connect(controller).register(id, alice.address, ONE_YEAR))
        .to.emit(registrar, "NameRegistered")
        .withArgs(id, alice.address, anyValue);
    });

    it("reverts if caller is not a controller", async function () {
      const id = labelhash("alice");
      await expect(
        registrar.connect(other).register(id, alice.address, ONE_YEAR)
      ).to.be.revertedWithCustomError(registrar, "NotController");
    });

    it("reverts if name is not available", async function () {
      const id = labelhash("alice");
      await registrar.connect(controller).register(id, alice.address, ONE_YEAR);
      await expect(
        registrar.connect(controller).register(id, bob.address, ONE_YEAR)
      ).to.be.revertedWithCustomError(registrar, "NameNotAvailable");
    });

    it("sets registry subnode owner", async function () {
      const id = labelhash("alice");
      await registrar.connect(controller).register(id, alice.address, ONE_YEAR);
      const subnode = ethers.keccak256(ethers.concat([ARC_NAMEHASH, ethers.zeroPadValue(ethers.toBeHex(id), 32)]));
      expect(await registry.owner(subnode)).to.equal(alice.address);
    });
  });

  // ─── registerWithResolver ─────────────────────────────────────────────────

  describe("registerWithResolver", function () {
    it("sets resolver in registry atomically", async function () {
      const id = labelhash("alice");
      const fakeResolver = bob.address;
      await registrar.connect(controller).registerWithResolver(id, alice.address, ONE_YEAR, fakeResolver);

      const subnode = ethers.keccak256(ethers.concat([ARC_NAMEHASH, ethers.zeroPadValue(ethers.toBeHex(id), 32)]));
      expect(await registry.owner(subnode)).to.equal(alice.address);
      expect(await registry.resolver(subnode)).to.equal(fakeResolver);
    });

    it("emits NameRegistered event", async function () {
      const id = labelhash("alice");
      await expect(
        registrar.connect(controller).registerWithResolver(id, alice.address, ONE_YEAR, bob.address)
      ).to.emit(registrar, "NameRegistered").withArgs(id, alice.address, anyValue);
    });

    it("reverts if not controller", async function () {
      const id = labelhash("alice");
      await expect(
        registrar.connect(other).registerWithResolver(id, alice.address, ONE_YEAR, bob.address)
      ).to.be.revertedWithCustomError(registrar, "NotController");
    });
  });

  // ─── renew ────────────────────────────────────────────────────────────────

  describe("renew", function () {
    it("extends expiry", async function () {
      const id = labelhash("alice");
      await registrar.connect(controller).register(id, alice.address, ONE_YEAR);
      const originalExpiry = await registrar.nameExpires(id);

      await registrar.connect(controller).renew(id, ONE_YEAR);
      const newExpiry = await registrar.nameExpires(id);
      expect(newExpiry).to.equal(originalExpiry + BigInt(ONE_YEAR));
    });

    it("emits NameRenewed event", async function () {
      const id = labelhash("alice");
      await registrar.connect(controller).register(id, alice.address, ONE_YEAR);
      await expect(registrar.connect(controller).renew(id, ONE_YEAR))
        .to.emit(registrar, "NameRenewed")
        .withArgs(id, anyValue);
    });

    it("reverts if past grace period", async function () {
      const id = labelhash("alice");
      await registrar.connect(controller).register(id, alice.address, ONE_YEAR);

      // Advance past expiry + grace period
      await time.increase(ONE_YEAR + GRACE_PERIOD + 1);

      await expect(
        registrar.connect(controller).renew(id, ONE_YEAR)
      ).to.be.revertedWithCustomError(registrar, "NameExpired");
    });

    it("can renew during grace period", async function () {
      const id = labelhash("alice");
      await registrar.connect(controller).register(id, alice.address, ONE_YEAR);

      // Advance past expiry but within grace period
      await time.increase(ONE_YEAR + 1);

      // Should not revert
      await expect(registrar.connect(controller).renew(id, ONE_YEAR)).to.not.be.reverted;
    });
  });

  // ─── ownerOf ──────────────────────────────────────────────────────────────

  describe("ownerOf", function () {
    it("returns owner for active name", async function () {
      const id = labelhash("alice");
      await registrar.connect(controller).register(id, alice.address, ONE_YEAR);
      expect(await registrar.ownerOf(id)).to.equal(alice.address);
    });

    it("reverts for expired name", async function () {
      const id = labelhash("alice");
      await registrar.connect(controller).register(id, alice.address, ONE_YEAR);

      // Advance past expiry
      await time.increase(ONE_YEAR + 1);

      await expect(registrar.ownerOf(id)).to.be.revertedWithCustomError(registrar, "NameExpired");
    });
  });

  // ─── reclaim ──────────────────────────────────────────────────────────────

  describe("reclaim", function () {
    it("token owner can reclaim registry ownership", async function () {
      const id = labelhash("alice");
      await registrar.connect(controller).register(id, alice.address, ONE_YEAR);

      // Reclaim to bob
      await registrar.connect(alice).reclaim(id, bob.address);

      const subnode = ethers.keccak256(ethers.concat([ARC_NAMEHASH, ethers.zeroPadValue(ethers.toBeHex(id), 32)]));
      expect(await registry.owner(subnode)).to.equal(bob.address);
    });

    it("non-owner reverts with NotTokenOwner", async function () {
      const id = labelhash("alice");
      await registrar.connect(controller).register(id, alice.address, ONE_YEAR);

      await expect(
        registrar.connect(other).reclaim(id, other.address)
      ).to.be.revertedWithCustomError(registrar, "NotTokenOwner");
    });

    // ── T2-07: NFT/registry ownership divergence — intentional design ─────────

    it("T2-07: reclaim owner_ does not need to match NFT owner (divergence is intentional)", async function () {
      // Alice owns the NFT. She reclaims registry ownership to bob (a different address).
      // This is the documented divergence: NFT owner controls who holds registry ownership.
      const id = labelhash("alice");
      await registrar.connect(controller).register(id, alice.address, ONE_YEAR);

      await registrar.connect(alice).reclaim(id, bob.address);

      const subnode = ethers.keccak256(ethers.concat([ARC_NAMEHASH, ethers.zeroPadValue(ethers.toBeHex(id), 32)]));
      // Registry owner is now bob — NFT owner is still alice
      expect(await registry.owner(subnode)).to.equal(bob.address);
      expect(await registrar.ownerOf(id)).to.equal(alice.address);
    });

    it("T2-07: NFT owner can reclaim registry ownership back to themselves after divergence", async function () {
      const id = labelhash("alice");
      await registrar.connect(controller).register(id, alice.address, ONE_YEAR);

      // Diverge: set registry owner to bob
      await registrar.connect(alice).reclaim(id, bob.address);

      // Re-sync: reclaim back to alice
      await registrar.connect(alice).reclaim(id, alice.address);

      const subnode = ethers.keccak256(ethers.concat([ARC_NAMEHASH, ethers.zeroPadValue(ethers.toBeHex(id), 32)]));
      expect(await registry.owner(subnode)).to.equal(alice.address);
    });

    it("T2-07: ERC-721 approved operator can also call reclaim", async function () {
      const id = labelhash("alice");
      await registrar.connect(controller).register(id, alice.address, ONE_YEAR);

      // Alice approves bob as operator for this token
      await registrar.connect(alice).approve(bob.address, id);

      // Bob (as approved operator) can reclaim
      await expect(
        registrar.connect(bob).reclaim(id, bob.address)
      ).to.not.be.reverted;

      const subnode = ethers.keccak256(ethers.concat([ARC_NAMEHASH, ethers.zeroPadValue(ethers.toBeHex(id), 32)]));
      expect(await registry.owner(subnode)).to.equal(bob.address);
    });
  });

  // ─── tokenURI ─────────────────────────────────────────────────────────────

  describe("tokenURI", function () {
    it("returns valid base64-encoded JSON", async function () {
      const id = labelhash("alice");
      await registrar.connect(controller).register(id, alice.address, ONE_YEAR);

      const uri = await registrar.tokenURI(id);
      expect(uri).to.match(/^data:application\/json;base64,/);

      // Decode and parse
      const base64Data = uri.replace("data:application/json;base64,", "");
      const json = JSON.parse(Buffer.from(base64Data, "base64").toString("utf8"));

      expect(json.name).to.be.a("string");
      expect(json.description).to.equal("ArcNS domain name. Decentralized identity on Arc Testnet.");
      expect(json.image).to.match(/^data:image\/svg\+xml;base64,/);
      expect(json.attributes).to.be.an("array");
    });

    it("contains correct TLD attribute", async function () {
      const id = labelhash("alice");
      await registrar.connect(controller).register(id, alice.address, ONE_YEAR);

      const uri = await registrar.tokenURI(id);
      const base64Data = uri.replace("data:application/json;base64,", "");
      const json = JSON.parse(Buffer.from(base64Data, "base64").toString("utf8"));

      const tldAttr = json.attributes.find(a => a.trait_type === "TLD");
      expect(tldAttr).to.exist;
      expect(tldAttr.value).to.equal(".arc");
    });

    it("contains Expiry attribute with correct display_type", async function () {
      const id = labelhash("alice");
      await registrar.connect(controller).register(id, alice.address, ONE_YEAR);

      const uri = await registrar.tokenURI(id);
      const base64Data = uri.replace("data:application/json;base64,", "");
      const json = JSON.parse(Buffer.from(base64Data, "base64").toString("utf8"));

      const expiryAttr = json.attributes.find(a => a.trait_type === "Expiry");
      expect(expiryAttr).to.exist;
      expect(expiryAttr.display_type).to.equal("date");
      expect(expiryAttr.value).to.be.a("number");
    });

    it("shows Active status for active name", async function () {
      const id = labelhash("alice");
      await registrar.connect(controller).register(id, alice.address, ONE_YEAR);

      const uri = await registrar.tokenURI(id);
      const base64Data = uri.replace("data:application/json;base64,", "");
      const json = JSON.parse(Buffer.from(base64Data, "base64").toString("utf8"));

      const statusAttr = json.attributes.find(a => a.trait_type === "Status");
      expect(statusAttr.value).to.equal("Active");
    });
  });

  // ─── NotLive ──────────────────────────────────────────────────────────────

  describe("NotLive", function () {
    it("reverts if registrar does not own baseNode", async function () {
      // Deploy a new registrar that doesn't own the baseNode
      const Registrar = await ethers.getContractFactory("contracts/v3/registrar/ArcNSBaseRegistrar.sol:ArcNSBaseRegistrar");
      const newRegistrar = await Registrar.deploy(await registry.getAddress(), ARC_NAMEHASH, "arc");
      await newRegistrar.waitForDeployment();
      await newRegistrar.addController(controller.address);

      // The original registrar still owns the baseNode, so newRegistrar is not live
      const id = labelhash("test");
      await expect(
        newRegistrar.connect(controller).register(id, alice.address, ONE_YEAR)
      ).to.be.revertedWithCustomError(newRegistrar, "NotLive");
    });
  });

  // ─── Controller management ────────────────────────────────────────────────

  describe("controller management", function () {
    it("owner can add controller", async function () {
      await expect(registrar.addController(other.address))
        .to.emit(registrar, "ControllerAdded")
        .withArgs(other.address);
      expect(await registrar.controllers(other.address)).to.be.true;
    });

    it("owner can remove controller", async function () {
      await registrar.addController(other.address);
      await expect(registrar.removeController(other.address))
        .to.emit(registrar, "ControllerRemoved")
        .withArgs(other.address);
      expect(await registrar.controllers(other.address)).to.be.false;
    });

    it("non-owner cannot add controller", async function () {
      await expect(
        registrar.connect(alice).addController(other.address)
      ).to.be.revertedWithCustomError(registrar, "OwnableUnauthorizedAccount");
    });
  });
});


