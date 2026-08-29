import { NextRequest, NextResponse } from "next/server";
import { getAddress, isAddress } from "viem";
import { normalizeIndexedWalletAssets } from "../../../../../lib/walletAssets";
import { v1Headers } from "../../../../../lib/adapterHelpers";

const ARC_EXPLORER_URL = process.env.NEXT_PUBLIC_BLOCK_EXPLORER_URL || "https://arc-mainnet.cloud.blockscout.com";

export async function GET(
  _request: NextRequest,
  { params }: { params: { address: string } },
) {
  const rawAddress = decodeURIComponent(params.address ?? "");
  if (!isAddress(rawAddress)) {
    return NextResponse.json(
      { status: "error", code: "INVALID_ADDRESS", hint: "Enter a valid EVM wallet address." },
      { status: 400, headers: v1Headers(0) },
    );
  }

  const address = getAddress(rawAddress);
  const endpoint = `${ARC_EXPLORER_URL.replace(/\/$/, "")}/api/v2/addresses/${address}/tokens?type=ERC-20`;

  try {
    const response = await fetch(endpoint, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(8_000),
      next: { revalidate: 30 },
    });
    if (!response.ok) throw new Error(`Explorer returned ${response.status}`);

    const payload = await response.json();
    const assets = normalizeIndexedWalletAssets(payload);
    return NextResponse.json(
      { status: "ok", address, assets },
      { headers: { ...v1Headers(30), "Cache-Control": "private, max-age=30" } },
    );
  } catch {
    return NextResponse.json(
      { status: "error", code: "ASSET_INDEX_UNAVAILABLE", hint: "Wallet assets could not be loaded right now." },
      { status: 503, headers: v1Headers(0) },
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: v1Headers(0) });
}
