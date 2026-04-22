const { ethers } = require("hardhat");

async function main() {
  const ABI = ["function rentPrice(string name, uint256 duration) view returns (tuple(uint256 base, uint256 premium))"];
  const provider = new ethers.JsonRpcProvider("https://rpc.testnet.arc.network");
  const controller = new ethers.Contract("0x1bd377A2762510c00dd0ec2142E42829e7053C80", ABI, provider);
  const ONE_YEAR = BigInt(365 * 24 * 60 * 60);

  const tests = [
    ["flowpay",     "label only"],
    ["flowpay.arc", "full name with TLD"],
    ["a",           "1-char label"],
    ["abc",         "3-char label"],
  ];

  for (const [name, desc] of tests) {
    try {
      const r = await controller.rentPrice(name, ONE_YEAR);
      console.log(`✓ ${desc} (${name}): base=${ethers.formatUnits(r.base, 6)} USDC`);
    } catch (e) {
      console.log(`✗ ${desc} (${name}): ${e.message.slice(0, 100)}`);
    }
  }
}

main().catch(console.error);
