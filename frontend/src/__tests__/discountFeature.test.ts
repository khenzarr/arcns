import { describe, expect, it } from "vitest";
import { isEarlyAdopterDiscountUiEnabled } from "../lib/discountFeature";

describe("early-adopter discount UI feature flag", () => {
  it("is disabled by default unless explicitly set to true", () => {
    expect(process.env.NEXT_PUBLIC_ENABLE_EARLY_ADOPTER_DISCOUNT_UI).not.toBe("true");
    expect(isEarlyAdopterDiscountUiEnabled).toBe(false);
  });
});
