const { ethers } = require("../node_modules/ethers");

async function main() {
  const provider = new ethers.JsonRpcProvider("https://rpc.testnet.arc.network");
  const ABI = ["function rentPrice(string,uint256) view returns (tuple(uint256,uint256))"];
  const c = new ethers.Contract("0x1bd377A2762510c00dd0ec2142E42829e7053C80", ABI, provider);
  const Y = BigInt(365 * 24 * 60 * 60);

  for (const name of ["flowpay", "flowpay.arc", "a", "abc"]) {
    try {
      const r = await c.rentPrice(name, Y);
      console.log("OK  " + name.padEnd(14) + ethers.formatUnits(r[0], 6) + " USDC");
    } catch (e) {
      console.log("FAIL " + name.padEnd(13) + e.message.slice(0, 80));
    }
  }
}
main().catch(console.error);
