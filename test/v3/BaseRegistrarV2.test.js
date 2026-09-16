const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

const ONE_YEAR = 365 * 24 * 60 * 60;

function labelhash(label) {
  return ethers.keccak256(ethers.toUtf8Bytes(label));
}

function namehash(name) {
  let node = ethers.ZeroHash;
  if (!name) return node;
  for (const label of name.split(".").reverse()) {
    node = ethers.keccak256(ethers.concat([node, labelhash(label)]));
  }
  return node;
}

function decodeMetadata(uri) {
  const encoded = uri.replace("data:application/json;base64,", "");
  return JSON.parse(Buffer.from(encoded, "base64").toString("utf8"));
}

describe("ArcNSBaseRegistrarV2", function () {
  let registry, registrar, deployer, alice;
  const ARC_NODE = namehash("arc");

  beforeEach(async function () {
    [deployer, alice] = await ethers.getSigners();
    const Registry = await ethers.getContractFactory("contracts/v3/registry/ArcNSRegistry.sol:ArcNSRegistry");
    registry = await Registry.deploy();
    await registry.waitForDeployment();

    const Registrar = await ethers.getContractFactory("contracts/v3/registrar/ArcNSBaseRegistrarV2.sol:ArcNSBaseRegistrarV2");
    registrar = await Registrar.deploy(await registry.getAddress(), ARC_NODE, "arc", [], [], []);
    await registrar.waitForDeployment();

    await registry.setSubnodeOwner(ethers.ZeroHash, labelhash("arc"), await registrar.getAddress());
    await registrar.addController(deployer.address);
  });

  it("renders the registered plaintext .arc name and Arc Mainnet description", async function () {
    const id = BigInt(labelhash("alice"));
    await registrar.registerWithLabel(id, "alice", alice.address, ONE_YEAR);

    const metadata = decodeMetadata(await registrar.tokenURI(id));
    expect(metadata.name).to.equal("alice.arc");
    expect(metadata.description).to.equal("ArcNS domain name. Decentralized identity on Arc Mainnet.");
    expect(metadata.description).not.to.include("Testnet");
  });

  it("renders the registered plaintext .circle name", async function () {
    const CIRCLE_NODE = namehash("circle");
    const Registrar = await ethers.getContractFactory("contracts/v3/registrar/ArcNSBaseRegistrarV2.sol:ArcNSBaseRegistrarV2");
    const circle = await Registrar.deploy(await registry.getAddress(), CIRCLE_NODE, "circle", [], [], []);
    await circle.waitForDeployment();
    await registry.setSubnodeOwner(ethers.ZeroHash, labelhash("circle"), await circle.getAddress());
    await circle.addController(deployer.address);

    const id = BigInt(labelhash("circle"));
    await circle.registerWithLabel(id, "circle", alice.address, ONE_YEAR);
    expect(decodeMetadata(await circle.tokenURI(id)).name).to.equal("circle.circle");
  });

  it("rejects a plaintext label that does not match the supplied token id", async function () {
    await expect(registrar.registerWithLabel(BigInt(labelhash("bob")), "alice", alice.address, ONE_YEAR))
      .to.be.revertedWithCustomError(registrar, "LabelHashMismatch");
  });

  it("fails closed on the legacy hash-only registration entrypoints", async function () {
    const id = BigInt(labelhash("alice"));
    await expect(registrar.register(id, alice.address, ONE_YEAR))
      .to.be.revertedWithCustomError(registrar, "LabelRequired");
    await expect(registrar.registerWithResolver(id, alice.address, ONE_YEAR, deployer.address))
      .to.be.revertedWithCustomError(registrar, "LabelRequired");
  });

  it("seeds an active mainnet registration with the original owner and expiry", async function () {
    const expiry = (await time.latest()) + ONE_YEAR;
    const Registrar = await ethers.getContractFactory("contracts/v3/registrar/ArcNSBaseRegistrarV2.sol:ArcNSBaseRegistrarV2");
    const seeded = await Registrar.deploy(
      await registry.getAddress(), ARC_NODE, "arc", ["circle"], [alice.address], [expiry]
    );
    await seeded.waitForDeployment();

    const id = BigInt(labelhash("circle"));
    expect(await seeded.ownerOf(id)).to.equal(alice.address);
    expect(await seeded.nameExpires(id)).to.equal(expiry);
    expect(decodeMetadata(await seeded.tokenURI(id)).name).to.equal("circle.arc");
  });

  it("preserves a registration that is still inside the renewal grace period", async function () {
    const latest = await ethers.provider.getBlock("latest");
    const expiry = BigInt(latest.timestamp - 30 * 24 * 60 * 60);
    const Registrar = await ethers.getContractFactory("ArcNSBaseRegistrarV2");
    const seeded = await Registrar.deploy(
      await registry.getAddress(),
      ARC_NODE,
      "arc",
      ["grace"],
      [alice.address],
      [expiry]
    );
    await seeded.waitForDeployment();

    const id = BigInt(ethers.keccak256(ethers.toUtf8Bytes("grace")));
    expect(await seeded.nameExpires(id)).to.equal(expiry);

    const extension = 31 * 24 * 60 * 60;
    await (await registry.setSubnodeOwner(ethers.ZeroHash, labelhash("arc"), await seeded.getAddress())).wait();
    expect(await registry.owner(ARC_NODE)).to.equal(await seeded.getAddress());
    await (await seeded.addController(deployer.address)).wait();
    await (await seeded.renew(id, extension)).wait();

    expect(await seeded.ownerOf(id)).to.equal(alice.address);
    expect(await seeded.nameExpires(id)).to.equal(expiry + BigInt(extension));
    expect(decodeMetadata(await seeded.tokenURI(id)).name).to.equal("grace.arc");
  });
});
