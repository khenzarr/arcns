const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ArcNS pricing preparation", function () {
  it("preserves testnet defaults and quotes the mainnet target values after setPrices", async function () {
    const Oracle = await ethers.getContractFactory("contracts/v3/registrar/ArcNSPriceOracle.sol:ArcNSPriceOracle");
    const oracle = await Oracle.deploy();
    expect(await oracle.price1Char()).to.equal(50_000_000n);
    expect(await oracle.price5Plus()).to.equal(2_000_000n);
    await oracle.setPrices(100_000_000n, 50_000_000n, 25_000_000n, 15_000_000n, 5_000_000n);
    expect(await oracle.price1Char()).to.equal(100_000_000n);
    expect(await oracle.price2Char()).to.equal(50_000_000n);
    expect(await oracle.price3Char()).to.equal(25_000_000n);
    expect(await oracle.price4Char()).to.equal(15_000_000n);
    expect(await oracle.price5Plus()).to.equal(5_000_000n);
  });
});