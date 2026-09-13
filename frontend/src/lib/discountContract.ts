import { parseAbi } from "viem";

/** Narrow ABI so the discount path is independent of stale copied Hardhat artifacts. */
export const DISCOUNT_CONTROLLER_ABI = parseAbi([
  "function discountRegistry() view returns (address)",
  "function discountRentPrice(string name_, uint256 duration) view returns ((uint256 base, uint256 premium))",
  "function registerWithDiscount(string name_, address owner_, uint256 duration, bytes32 secret, address resolverAddr, bool reverseRecord, uint256 maxCost, bytes32[] proof)",
]);

export const DISCOUNT_REGISTRY_ABI = parseAbi([
  "function campaignId() view returns (bytes32)",
  "function snapshotBlock() view returns (uint256)",
  "function merkleRoot() view returns (bytes32)",
  "function rootFrozen() view returns (bool)",
  "function discountActive() view returns (bool)",
  "function authorizedControllers(address) view returns (bool)",
  "function used(address) view returns (bool)",
]);
