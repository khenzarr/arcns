import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("wagmi", () => ({
  useAccount: () => ({ address: undefined, isConnected: false }),
}));

import { EarlyAdopterDiscountCard } from "./EarlyAdopterDiscountCard";

describe("EarlyAdopterDiscountCard disabled gate", () => {
  it("renders nothing when the default feature flag is disabled", () => {
    render(<EarlyAdopterDiscountCard />);

    expect(screen.queryByTestId("early-adopter-discount-card")).not.toBeInTheDocument();
  });
});
