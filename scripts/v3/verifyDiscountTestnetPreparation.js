"use strict";

const { ethers } = require("ethers");

const EXPECTED_CHAIN_ID = 5042002n;
const ADMIN_SAFE = "0x01BaeBec34dd426E98cA7e550Eb652235Ea7e4f3";
const TIMELOCK = "0x0f9d898D74f29c69cAD1a66918b41891E73e08f0";
const ARC_CONTROLLER = "0xe0A67F2E74Bcb740F0446fF2aCF32081DB877D46";
const CIRCLE_CONTROLLER = "0x4CB0650847459d9BbDd5823cc6D320C900D883dA";
const CURRENT_IMPLEMENTATION = "0x0E84B34bAa5E865C2Dc1CDe907D41b86F6031cCB";
const NEW_IMPLEMENTATION = "0xb095cece945C08b793cEc07191ae9A2225b6f9Da";
const DISCOUNT_REGISTRY = "0x654C98c3452944Be06fF79A79641739249be553E";
const IMPLEMENTATION_TX = "0x4246e90249d3b4f287381c97d057045d800f27067ea5b2d2fac806eb469e5763";
const REGISTRY_TX = "0xb5fcdea3049730620c12b777ea4b19c2e4af069dacab7091245baf133e500fcb";
const CAMPAIGN_ID = "0xae3c7462e46cc76b3e0349e7d211264ada95257da9d9d7a797abed70b7eb83e3";
const SNAPSHOT_BLOCK = 54933646n;
const DELAY = 172800n;
const SALT = "0x0fcd7139b06c33e0e8568e0bbf6500840560f13f14942a4dbd17e83f3d34407b";
const EXPECTED_OPERATION_ID = "0xbba3fbb8c53eb915e61b4476ec4466904841311c2a5a802e4ebdac2bcd1214fb";
const IMPLEMENTATION_SLOT =
  "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function implementationFromSlot(value) {
  return ethers.getAddress(`0x${value.slice(-40)}`);
}

async function main() {
  const provider = new ethers.JsonRpcProvider(
    process.env.ARC_RPC_URL_2 || process.env.ARC_RPC_URL || "https://rpc.testnet.arc.network"
  );
  const network = await provider.getNetwork();
  assert(network.chainId === EXPECTED_CHAIN_ID, `wrong chain: ${network.chainId}`);

  for (const [label, address] of [
    ["controller implementation", NEW_IMPLEMENTATION],
    ["discount registry", DISCOUNT_REGISTRY],
  ]) {
    const code = await provider.getCode(address);
    assert(code !== "0x", `${label} has no deployed bytecode`);
    console.log(`PASS bytecode: ${label} (${(code.length - 2) / 2} bytes)`);
  }

  for (const [label, hash] of [
    ["controller implementation", IMPLEMENTATION_TX],
    ["discount registry", REGISTRY_TX],
  ]) {
    const receipt = await provider.getTransactionReceipt(hash);
    assert(receipt && receipt.status === 1, `${label} deployment receipt failed or missing`);
    console.log(`PASS receipt: ${label} block=${receipt.blockNumber}`);
  }

  const Registry = new ethers.Contract(DISCOUNT_REGISTRY, [
    "function owner() view returns (address)",
    "function campaignId() view returns (bytes32)",
    "function snapshotBlock() view returns (uint256)",
    "function merkleRoot() view returns (bytes32)",
    "function rootFrozen() view returns (bool)",
    "function discountActive() view returns (bool)",
  ], provider);
  assert(await Registry.owner() === ethers.getAddress(ADMIN_SAFE), "registry owner mismatch");
  assert(await Registry.campaignId() === CAMPAIGN_ID, "campaign id mismatch");
  assert(await Registry.snapshotBlock() === SNAPSHOT_BLOCK, "snapshot block mismatch");
  assert(await Registry.merkleRoot() === ethers.ZeroHash, "registry root must remain unset");
  assert(!(await Registry.rootFrozen()), "registry root must remain unfrozen");
  assert(!(await Registry.discountActive()), "discount must remain inactive");
  console.log("PASS registry: Safe-owned, root unset, unfrozen, inactive");

  for (const proxy of [ARC_CONTROLLER, CIRCLE_CONTROLLER]) {
    const slot = await provider.getStorage(proxy, IMPLEMENTATION_SLOT);
    assert(
      implementationFromSlot(slot) === ethers.getAddress(CURRENT_IMPLEMENTATION),
      `controller changed before timelock execution: ${proxy}`
    );
  }
  console.log("PASS controllers: still on current production implementation");

  const proxyInterface = new ethers.Interface([
    "function upgradeToAndCall(address newImplementation, bytes data)",
  ]);
  const payload = proxyInterface.encodeFunctionData("upgradeToAndCall", [NEW_IMPLEMENTATION, "0x"]);
  const targets = [ARC_CONTROLLER, CIRCLE_CONTROLLER];
  const values = [0n, 0n];
  const payloads = [payload, payload];
  const timelockInterface = new ethers.Interface([
    "function getMinDelay() view returns (uint256)",
    "function hashOperationBatch(address[] targets,uint256[] values,bytes[] payloads,bytes32 predecessor,bytes32 salt) view returns(bytes32)",
    "function getTimestamp(bytes32 id) view returns(uint256)",
    "function scheduleBatch(address[] targets,uint256[] values,bytes[] payloads,bytes32 predecessor,bytes32 salt,uint256 delay)",
  ]);
  const timelock = new ethers.Contract(TIMELOCK, timelockInterface, provider);
  assert(await timelock.getMinDelay() === DELAY, "timelock delay mismatch");
  const operationId = await timelock.hashOperationBatch(
    targets,
    values,
    payloads,
    ethers.ZeroHash,
    SALT
  );
  assert(operationId === EXPECTED_OPERATION_ID, "operation id mismatch");
  const operationTimestamp = await timelock.getTimestamp(operationId);

  const scheduleData = timelockInterface.encodeFunctionData("scheduleBatch", [
    targets,
    values,
    payloads,
    ethers.ZeroHash,
    SALT,
    DELAY,
  ]);
  if (operationTimestamp === 0n) {
    await provider.call({ from: ADMIN_SAFE, to: TIMELOCK, data: scheduleData });
    console.log("PASS governance: operation unscheduled and Safe-origin schedule simulation succeeds");
  } else {
    const readyAt = new Date(Number(operationTimestamp) * 1000).toISOString();
    console.log(`PASS governance: operation scheduled, readyAt=${readyAt}`);
  }
  console.log(`operationId=${operationId}`);
  console.log(`scheduleSelector=${scheduleData.slice(0, 10)}`);
  console.log("READ ONLY: no transaction was submitted.");
}

main().catch((error) => {
  console.error(error.message || error);
  process.exitCode = 1;
});
