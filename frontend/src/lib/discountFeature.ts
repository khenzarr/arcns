/**
 * Fail-closed gate for the inactive early-adopter discount UX shell.
 *
 * Production must not enable this flag until the mainnet contracts are
 * deployed, the expected root is set and frozen, activation is approved,
 * used-state reads are available, preview smoke tests pass, and frontend
 * cutover is approved. This gate does not select a chain, resolve contract
 * addresses, read chain state, or authorize a discount action.
 */
export const isEarlyAdopterDiscountUiEnabled =
  process.env.NEXT_PUBLIC_ENABLE_EARLY_ADOPTER_DISCOUNT_UI === "true";
