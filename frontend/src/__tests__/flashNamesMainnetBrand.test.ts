import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const source = (relativePath: string) =>
  readFileSync(join(root, relativePath), "utf8");

describe("FlashNames mainnet cutover surface", () => {
  it("uses the FlashNames domain and product name in global metadata", () => {
    const layout = source("src/app/layout.tsx");
    const page = source("src/app/page.tsx");

    expect(layout).toContain("https://flashnames.space");
    expect(layout).toContain("FlashNames");
    expect(page).toContain("https://flashnames.space");
    expect(page).not.toContain("arcname.services");
  });

  it("keeps mainnet header branding free of testnet status chrome", () => {
    const header = source("src/components/Header.tsx");

    expect(header).toContain("FlashNames");
    expect(header).toContain("/flashnames/flashnames-emblem.svg");
    expect(header).not.toContain("NetworkBadge");
    expect(header).not.toContain("Testnet");
  });

  it("publishes the renamed integration contract and canonical endpoint", () => {
    const integrate = source("src/app/developers/integrate/page.tsx");
    const helpers = source("src/lib/adapterHelpers.ts");

    expect(integrate).toContain("https://flashnames.space/api/v1");
    expect(integrate).toContain("FlashNamesResolution");
    expect(integrate).toContain("resolveFlashNamesName");
    expect(helpers).toContain('"X-FlashNames-Version"');
    expect(integrate).not.toContain("arcname.services");
  });

  it("uses generated deployment data and env-gated optional Circle assets", () => {
    const chainConfig = source("src/lib/chainConfig.ts");
    const sendAssets = source("src/lib/sendAssets.ts");

    expect(chainConfig).toContain("generated-contracts");
    expect(sendAssets).toContain("NEXT_PUBLIC_EURC_ADDRESS");
    expect(sendAssets).toContain("NEXT_PUBLIC_CIRBTC_ADDRESS");
    expect(sendAssets).toContain("ADDR_USDC");
  });

  it("ships new vector brand assets and removes the old public logo path", () => {
    expect(existsSync(join(root, "public/flashnames/flashnames-emblem.svg"))).toBe(true);
    expect(existsSync(join(root, "public/flashnames/flashnames-logo.svg"))).toBe(true);
    expect(existsSync(join(root, "public/arcns/arcns-emblem.svg"))).toBe(false);
    expect(existsSync(join(root, "public/arcns/arcns-logo.svg"))).toBe(false);
  });
});
