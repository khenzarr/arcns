/**
 * Display-only labels for the current public ArcNS environment.
 *
 * These values must not be used to configure wallets, RPCs, contracts,
 * transaction flows, or any other runtime network behavior.
 */
import { DEPLOYED_CHAIN_ID } from "./generated-contracts";

export const IS_MAINNET = Number(DEPLOYED_CHAIN_ID) === 5042;
// The public product is already presented in its launch-ready form while the
// transaction runtime remains pinned to the deployed testnet contracts. Keep
// runtime chain checks on IS_MAINNET / DEPLOYED_CHAIN_ID; use this flag only
// for public copy, navigation and pricing presentation.
export const IS_MAINNET_UI = true;
export function networkDisplayFor(chainId: number) {
  return chainId === 5042 ? {
    networkDisplayName: "Arc",
    networkShortLabel: "Arc",
    chainIdLabel: "",
    currencyDisplayName: "USDC",
    environmentStatusLabel: "Live",
  } : {
    networkDisplayName: "Arc Testnet",
    networkShortLabel: "Testnet",
    chainIdLabel: "Chain ID 5042002",
    currencyDisplayName: "Testnet USDC",
    environmentStatusLabel: "Pre-mainnet",
  };
}

export const RUNTIME_NETWORK_DISPLAY = networkDisplayFor(Number(DEPLOYED_CHAIN_ID));
export const NETWORK_DISPLAY = networkDisplayFor(IS_MAINNET_UI ? 5042 : Number(DEPLOYED_CHAIN_ID));
