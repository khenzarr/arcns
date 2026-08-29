/**
 * runtimeClient.ts - deployed Arc execution context helpers.
 *
 * Active registration runtime follows the generated deployment manifest.
 * Critical transaction observation must stay bound to the active wallet
 * connector provider; detached public RPCs are for optional/non-critical reads.
 */

import { createPublicClient, fallback, http, publicActions } from "viem";
import {
  ARC_TESTNET_CHAIN_ID,
  DEPLOYED_FALLBACK_RPC_URLS,
  DEPLOYED_PRIMARY_RPC_URL,
  DEPLOYED_RUNTIME_MODE,
  deployedChain,
} from "./chains";
import { ADDR_ARC_CONTROLLER, ADDR_CIRCLE_CONTROLLER } from "./contracts";
import { DEPLOYED_CHAIN_ID } from "./generated-contracts";

export const SUPPORTED_CHAIN_IDS = {
  ARC: DEPLOYED_CHAIN_ID,
} as const;

export interface ExecutionContext {
  runtimeMode: typeof DEPLOYED_RUNTIME_MODE;
  walletChainId: number;
  readChainId: number;
  chainName: string;
  account: `0x${string}`;
  chain: typeof deployedChain;
  primaryReadClient: ReturnType<typeof createPublicClient>;
  primaryRpcSource: string;
  fallbackClient: ReturnType<typeof createPublicClient>;
  fallbackRpcSource: string;
  fallbackRpcSources: readonly string[];
  fallbackActive: boolean;
  senderAuthorityHint: string;
  writeAuthorityType: string;
  readClientType: string;
  controller: `0x${string}`;
  abiSource: string;
  isArcTestnetOnly: boolean;
}

function buildArcReadContext(): {
  chain: typeof deployedChain;
  primaryReadClient: ReturnType<typeof createPublicClient>;
  primaryRpcSource: string;
  fallbackClient: ReturnType<typeof createPublicClient>;
  fallbackRpcSource: string;
  fallbackRpcSources: readonly string[];
  fallbackActive: boolean;
  senderAuthorityHint: string;
  writeAuthorityType: string;
  readClientType: string;
} {
  const primaryReadClient = createPublicClient({
    chain: deployedChain,
    transport: http(DEPLOYED_PRIMARY_RPC_URL, {
      timeout: 10_000,
      retryCount: 2,
      retryDelay: 1_000,
    }),
  });

  const fallbackRpcSources = DEPLOYED_FALLBACK_RPC_URLS;
  const fallbackClient = createPublicClient({
    chain: deployedChain,
    transport: fallback(
      fallbackRpcSources.map((rpc, index) =>
        http(rpc, { timeout: 10_000, retryCount: index === 0 ? 2 : 1, retryDelay: 1_000 }),
      ),
      { rank: false },
    ),
  });

  return {
    chain: deployedChain,
    primaryReadClient,
    primaryRpcSource: `Arc RPC (${DEPLOYED_PRIMARY_RPC_URL})`,
    fallbackClient,
    fallbackRpcSource: `Arc RPC (${DEPLOYED_PRIMARY_RPC_URL})`,
    fallbackRpcSources,
    fallbackActive: fallbackRpcSources.length > 1,
    senderAuthorityHint: `wallet connector provider (${deployedChain.name})`,
    writeAuthorityType: "wallet-connector-provider",
    readClientType: "primary-public-client",
  };
}

/**
 * Binds public actions to the same connector transport that submits the tx.
 * This keeps getTransaction() and waitForTransactionReceipt() attached to the
 * sender's runtime authority instead of a detached public RPC client.
 */
export function bindSenderAuthority(
  connectorClient: any,
  fallbackChainId: number,
): {
  authorityClient: ReturnType<typeof createPublicClient>;
  authorityChainId: number;
  authoritySource: string;
  authorityType: string;
  senderAuthorityBound: boolean;
} {
  const authorityClient =
    connectorClient.extend(publicActions) as ReturnType<typeof createPublicClient>;
  const authorityChainId =
    authorityClient.chain?.id ?? connectorClient.chain?.id ?? fallbackChainId;
  const authoritySource = `wallet connector provider chain=${authorityChainId}`;

  return {
    authorityClient,
    authorityChainId,
    authoritySource,
    authorityType: "wallet-connector-provider+publicActions",
    senderAuthorityBound: authorityChainId === DEPLOYED_CHAIN_ID,
  };
}

export function resolveExecutionContext(
  walletChainId: number,
  account: `0x${string}`,
  tld: "arc" | "circle",
): ExecutionContext {
  if (walletChainId !== DEPLOYED_CHAIN_ID) {
    throw new Error(
      `[CHAIN_MISMATCH] Unsupported chainId=${walletChainId}. ` +
      `Active registration runtime is ${deployedChain.name} (${DEPLOYED_CHAIN_ID}). ` +
      `Please switch your wallet to Arc.`
    );
  }

  const {
    chain,
    primaryReadClient,
    primaryRpcSource,
    fallbackClient,
    fallbackRpcSource,
    fallbackRpcSources,
    fallbackActive,
    senderAuthorityHint,
    writeAuthorityType,
    readClientType,
  } = buildArcReadContext();
  const controller = tld === "arc" ? ADDR_ARC_CONTROLLER : ADDR_CIRCLE_CONTROLLER;

  console.log("[ExecutionContext]", {
    runtimeMode: DEPLOYED_RUNTIME_MODE,
    walletChainId,
    readChainId: DEPLOYED_CHAIN_ID,
    chainName: deployedChain.name,
    account,
    controller,
    writeAuthorityType,
    readClientType,
    senderAuthorityHint,
    primaryRpcSource,
    fallbackRpcSource,
    fallbackRpcSources,
    fallbackActive,
    abiSource: "artifacts/contracts/proxy/ArcNSRegistrarControllerV2.sol/ArcNSRegistrarControllerV2.json",
  });

  return {
    runtimeMode: DEPLOYED_RUNTIME_MODE,
    walletChainId,
    readChainId: DEPLOYED_CHAIN_ID,
    chainName: deployedChain.name,
    account,
    chain,
    primaryReadClient,
    primaryRpcSource,
    fallbackClient,
    fallbackRpcSource,
    fallbackRpcSources,
    fallbackActive,
    senderAuthorityHint,
    writeAuthorityType,
    readClientType,
    controller,
    abiSource: "artifacts/contracts/proxy/ArcNSRegistrarControllerV2.sol/ArcNSRegistrarControllerV2.json",
    isArcTestnetOnly: DEPLOYED_CHAIN_ID === ARC_TESTNET_CHAIN_ID,
  };
}
