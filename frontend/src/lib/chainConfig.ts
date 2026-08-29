/**
 * Canonical runtime configuration derived from the generated deployment file.
 * A mainnet cutover is activated by generating `generated-contracts.ts` from
 * the verified `arc_mainnet-v3.json` deployment manifest.
 */

import {
  ADDR_ARC_CONTROLLER,
  ADDR_ARC_REGISTRAR,
  ADDR_CIRCLE_CONTROLLER,
  ADDR_CIRCLE_REGISTRAR,
  ADDR_PRICE_ORACLE,
  ADDR_REGISTRY,
  ADDR_RESOLVER,
  ADDR_REVERSE_REGISTRAR,
  ADDR_TREASURY,
  ADDR_USDC,
  DEPLOYED_CHAIN_ID,
} from "./generated-contracts";
import {
  DEPLOYED_FALLBACK_RPC_URLS,
  DEPLOYED_PRIMARY_RPC_URL,
  deployedChain,
} from "./chains";

export interface ChainConfig {
  chainId: number;
  name: string;
  rpcUrl: string;
  fallbackRpcUrls: string[];
  blockExplorer: string;
  contracts: {
    registry: `0x${string}`;
    arcController: `0x${string}`;
    circleController: `0x${string}`;
    resolver: `0x${string}`;
    reverseRegistrar: `0x${string}`;
    priceOracle: `0x${string}`;
    usdc: `0x${string}`;
    arcRegistrar: `0x${string}`;
    circleRegistrar: `0x${string}`;
    treasury: `0x${string}`;
  };
  subgraphUrl: string;
  minCommitmentAge: number;
  maxCommitmentAge: number;
}

const deployedConfig: ChainConfig = {
  chainId: DEPLOYED_CHAIN_ID,
  name: deployedChain.name,
  rpcUrl: DEPLOYED_PRIMARY_RPC_URL,
  fallbackRpcUrls: [...DEPLOYED_FALLBACK_RPC_URLS.slice(1)],
  blockExplorer: deployedChain.blockExplorers?.default.url ?? "https://arc-mainnet.cloud.blockscout.com",
  contracts: {
    registry: ADDR_REGISTRY,
    arcController: ADDR_ARC_CONTROLLER,
    circleController: ADDR_CIRCLE_CONTROLLER,
    resolver: ADDR_RESOLVER,
    reverseRegistrar: ADDR_REVERSE_REGISTRAR,
    priceOracle: ADDR_PRICE_ORACLE,
    usdc: ADDR_USDC,
    arcRegistrar: ADDR_ARC_REGISTRAR,
    circleRegistrar: ADDR_CIRCLE_REGISTRAR,
    treasury: ADDR_TREASURY,
  },
  subgraphUrl: process.env.NEXT_PUBLIC_SUBGRAPH_URL ?? "",
  minCommitmentAge: 60,
  maxCommitmentAge: 86_400,
};

export const CHAIN_CONFIGS: Record<number, ChainConfig> = {
  [DEPLOYED_CHAIN_ID]: deployedConfig,
};

export function getChainConfig(chainId: number = DEPLOYED_CHAIN_ID): ChainConfig {
  const config = CHAIN_CONFIGS[chainId];
  if (!config) throw new Error(`Unsupported FlashNames chain: ${chainId}`);
  return config;
}

export const ACTIVE_CHAIN_ID = DEPLOYED_CHAIN_ID;
export const activeConfig = deployedConfig;
