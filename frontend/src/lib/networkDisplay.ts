/**
 * Display-only labels for the current public ArcNS environment.
 *
 * These values must not be used to configure wallets, RPCs, contracts,
 * transaction flows, or any other runtime network behavior.
 */
export const NETWORK_DISPLAY = {
  networkDisplayName: "Arc Testnet",
  networkShortLabel: "Testnet",
  chainIdLabel: "Chain ID 5042002",
  currencyDisplayName: "Testnet USDC",
  environmentStatusLabel: "Pre-mainnet",
} as const;