import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  account: { address: undefined as `0x${string}` | undefined, isConnected: false },
}));

vi.mock("wagmi", () => ({
  useAccount: () => mocks.account,
}));

vi.mock("../lib/discountFeature", () => ({
  isEarlyAdopterDiscountUiEnabled: true,
}));

vi.mock("../lib/discountProofs", () => ({
  lookupEarlyAdopterProof: vi.fn(),
}));

import { EarlyAdopterDiscountCard } from "./EarlyAdopterDiscountCard";
import { lookupEarlyAdopterProof } from "../lib/discountProofs";

const lookupMock = vi.mocked(lookupEarlyAdopterProof);

afterEach(() => {
  mocks.account = { address: undefined, isConnected: false };
  lookupMock.mockReset();
});

describe("EarlyAdopterDiscountCard", () => {
  it("shows a safe connect-wallet state", () => {
    render(<EarlyAdopterDiscountCard />);

    expect(screen.getByText(/connect wallet to check local eligibility/i)).toBeInTheDocument();
    expect(screen.getByText(/discount not active yet/i)).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("shows eligible proof without a claim CTA", async () => {
    mocks.account = {
      address: "0x0000b9b20ddd33cd240e8d3b7afa02fa1cdaebcc",
      isConnected: true,
    };
    lookupMock.mockResolvedValue({
      status: "eligible",
      address: "0x0000b9b20ddd33cd240e8d3b7afa02fa1cdaebcc",
      proof: [],
      metadata: {} as never,
    });

    render(<EarlyAdopterDiscountCard />);

    await waitFor(() => expect(screen.getByText(/eligible proof found/i)).toBeInTheDocument());
    expect(screen.getByText(/does not mean the discount is active/i)).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("keeps an ineligible result safe", async () => {
    mocks.account = {
      address: "0x0000000000000000000000000000000000000001",
      isConnected: true,
    };
    lookupMock.mockResolvedValue({
      status: "ineligible",
      address: "0x0000000000000000000000000000000000000001",
      reason: "missing-proof",
    });

    render(<EarlyAdopterDiscountCard />);

    await waitFor(() => expect(screen.getByText(/no eligible proof found/i)).toBeInTheDocument());
    expect(screen.queryByText(/claim|register with discount/i)).not.toBeInTheDocument();
  });

  it("fails safely when the proof artifact is unavailable", async () => {
    mocks.account = {
      address: "0x0000000000000000000000000000000000000001",
      isConnected: true,
    };
    lookupMock.mockResolvedValue({ status: "unavailable", reason: "artifact-fetch-failed" });

    render(<EarlyAdopterDiscountCard />);

    await waitFor(() => expect(screen.getByText(/proof artifact unavailable/i)).toBeInTheDocument());
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});


