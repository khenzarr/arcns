/**
 * Quick live check: what does rentPrice() actually expect?
 * Run: npx hardhat test test/RentPriceCheck.js --network arc_testnet
 */
const { ethers } = require("hardhat");

describe("rentPrice live check", function () {
  it("tests label-only vs full-name vs short names", async function () {
    const ABI = ["function rentPrice(string name, uint256 duration) view returns (tuple(uint256 base, uint256 premium))"];
    const provider = ethers.provider;
    const controller = new ethers.Contract(
      "0x1bd377A2762510c00dd0ec2142E42829e7053C80",
      ABI,
      provider
    );
    const ONE_YEAR = BigInt(365 * 24 * 60 * 60);

    const cases = ["flowpay", "flowpay.arc", "a", "abc", "ab"];
    for (const name of cases) {
      try {
        const r = await controller.rentPrice(name, ONE_YEAR);
        console.log(`  ✓ rentPrice("${name}") = ${ethers.formatUnits(r.base, 6)} USDC`);
      } catch (e) {
        console.log(`  ✗ rentPrice("${name}") FAILED: ${e.message.slice(0, 80)}`);
      }
    }
  });
});
