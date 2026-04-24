/**
 * runtimeClient.ts - Arc Testnet execution context helpers.
 *
 * Active registration runtime mode is Arc Testnet only.
 * Critical transaction observation must stay bound to the active wallet
 * connector provider; detached public RPCs are for optional/non-critical reads.
 */

import { createPublicClient, fallback, http, publicActions } from "viem";
import {
  ARC_TESTNET_ALL_RPC_URLS,
  ARC_TESTNET_CHAIN_ID,
  ARC_TESTNET_PRIMARY_RPC_URL,
  ARC_TESTNET_RPCS,
  ARC_TESTNET_RUNTIME_MODE,
  arcTestnet,
} from "./chains";
import { CONTRACTS } from "./contracts";

export const SUPPORTED_CHAIN_IDS = {
  ARC_TESTNET: ARC_TESTNET_CHAIN_ID,
} as const;

export interface ExecutionContext {
  runtimeMode: typeof ARC_TESTNET_RUNTIME_MODE;
  walletChainId: number;
  readChainId: number;
  chainName: string;
  account: `0x${string}`;
  chain: typeof arcTestnet;
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
  chain: typeof arcTestnet;
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
    chain: arcTestnet,
    transport: http(ARC_TESTNET_PRIMARY_RPC_URL, {
      timeout: 10_000,
      retryCount: 2,
      retryDelay: 1_000,
    }),
  });

  const fallbackRpcSources = ARC_TESTNET_ALL_RPC_URLS;
  const fallbackClient = createPublicClient({
    chain: arcTestnet,
    transport: fallback(
      [
        http(ARC_TESTNET_RPCS.primary.url, { timeout: 10_000, retryCount: 2, retryDelay: 1_000 }),
        ...ARC_TESTNET_RPCS.secondary.map((rpc) =>
          http(rpc.url, { timeout: 10_000, retryCount: 1, retryDelay: 1_000 }),
        ),
      ],
      { rank: false },
    ),
  });

  return {
    chain: arcTestnet,
    primaryReadClient,
    primaryRpcSource: `${ARC_TESTNET_RPCS.primary.name} (${ARC_TESTNET_RPCS.primary.url})`,
    fallbackClient,
    fallbackRpcSource: `${ARC_TESTNET_RPCS.primary.name} (${ARC_TESTNET_RPCS.primary.url})`,
    fallbackRpcSources,
    fallbackActive: fallbackRpcSources.length > 1,
    senderAuthorityHint: "wallet connector provider (Arc Testnet)",
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
    senderAuthorityBound: authorityChainId === ARC_TESTNET_CHAIN_ID,
  };
}

export function resolveExecutionContext(
  walletChainId: number,
  account: `0x${string}`,
  tld: "arc" | "circle",
): ExecutionContext {
  if (walletChainId !== ARC_TESTNET_CHAIN_ID) {
    throw new Error(
      `[CHAIN_MISMATCH] Unsupported chainId=${walletChainId}. ` +
      `Active registration runtime is Arc Testnet only (${ARC_TESTNET_CHAIN_ID}). ` +
      `Please switch your wallet to Arc Testnet.`
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
  const controller = tld === "arc" ? CONTRACTS.arcController : CONTRACTS.circleController;

  console.log("[ExecutionContext]", {
    runtimeMode: ARC_TESTNET_RUNTIME_MODE,
    walletChainId,
    readChainId: ARC_TESTNET_CHAIN_ID,
    chainName: arcTestnet.name,
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
    runtimeMode: ARC_TESTNET_RUNTIME_MODE,
    walletChainId,
    readChainId: ARC_TESTNET_CHAIN_ID,
    chainName: arcTestnet.name,
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
    isArcTestnetOnly: true,
  };
}
