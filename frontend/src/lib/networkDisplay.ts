/**
 * Display-only labels for the current public ArcNS environment.
 *
 * These values must not be used to configure wallets, RPCs, contracts,
 * transaction flows, or any other runtime network behavior.
 */
import { DEPLOYED_CHAIN_ID } from "./generated-contracts";

export const IS_MAINNET = Number(DEPLOYED_CHAIN_ID) === 5042;
export const NETWORK_DISPLAY = IS_MAINNET ? {
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
