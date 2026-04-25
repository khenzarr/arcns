const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

const ONE_YEAR = 365 * 24 * 60 * 60;
const ONE_DAY  = 24 * 60 * 60;
const PREMIUM_START = 100_000_000n;       // 100 USDC
const PREMIUM_DECAY_PERIOD = 28 * ONE_DAY; // 28 days

describe("ArcNSPriceOracle (v3)", function () {
  let oracle;
  let deployer, other;

  beforeEach(async function () {
    [deployer, other] = await ethers.getSigners();
    const Oracle = await ethers.getContractFactory("contracts/v3/registrar/ArcNSPriceOracle.sol:ArcNSPriceOracle");
    oracle = await Oracle.deploy();
    await oracle.waitForDeployment();
  });

  // ─── Base price tiers ─────────────────────────────────────────────────────

  describe("base price tiers (1-year duration)", function () {
    it("1-character name: 50 USDC/year", async function () {
      const p = await oracle.price("a", 0, ONE_YEAR);
      expect(p.base).to.equal(50_000_000n);
      expect(p.premium).to.equal(0n);
    });

    it("2-character name: 25 USDC/year", async function () {
      const p = await oracle.price("ab", 0, ONE_YEAR);
      expect(p.base).to.equal(25_000_000n);
    });

    it("3-character name: 15 USDC/year", async function () {
      const p = await oracle.price("abc", 0, ONE_YEAR);
      expect(p.base).to.equal(15_000_000n);
    });

    it("4-character name: 10 USDC/year", async function () {
      const p = await oracle.price("abcd", 0, ONE_YEAR);
      expect(p.base).to.equal(10_000_000n);
    });

    it("5-character name: 2 USDC/year", async function () {
      const p = await oracle.price("abcde", 0, ONE_YEAR);
      expect(p.base).to.equal(2_000_000n);
    });

    it("6-character name: 2 USDC/year (5+ tier)", async function () {
      const p = await oracle.price("abcdef", 0, ONE_YEAR);
      expect(p.base).to.equal(2_000_000n);
    });
  });

  // ─── Pro-rated pricing ────────────────────────────────────────────────────

  describe("pro-rated pricing", function () {
    it("180-day registration is approximately half of annual price", async function () {
      const halfYear = Math.floor(ONE_YEAR / 2);
      const p = await oracle.price("abcde", 0, halfYear);
      // 2_000_000 * halfYear / ONE_YEAR ≈ 1_000_000
      const expected = BigInt(2_000_000) * BigInt(halfYear) / BigInt(ONE_YEAR);
      expect(p.base).to.equal(expected);
    });

    it("30-day registration for 3-char name", async function () {
      const thirtyDays = 30 * ONE_DAY;
      const p = await oracle.price("abc", 0, thirtyDays);
      const expected = BigInt(15_000_000) * BigInt(thirtyDays) / BigInt(ONE_YEAR);
      expect(p.base).to.equal(expected);
    });
  });

  // ─── Premium decay ────────────────────────────────────────────────────────

  describe("premium decay", function () {
    it("premium is 0 for new name (expires=0)", async function () {
      const p = await oracle.price("abc", 0, ONE_YEAR);
      expect(p.premium).to.equal(0n);
    });

    it("premium is 0 for non-expired name", async function () {
      const futureExpiry = Math.floor(Date.now() / 1000) + ONE_YEAR * 2;
      const p = await oracle.price("abc", futureExpiry, ONE_YEAR);
      expect(p.premium).to.equal(0n);
    });

    it("premium is full 100 USDC at moment of expiry (elapsed=0)", async function () {
      // Set expires to current block timestamp (just expired)
      const now = await time.latest();
      const p = await oracle.price("abc", now, ONE_YEAR);
      // elapsed = 0, so premium = PREMIUM_START * PREMIUM_DECAY_PERIOD / PREMIUM_DECAY_PERIOD = PREMIUM_START
      expect(p.premium).to.equal(PREMIUM_START);
    });

    it("premium is ~50 USDC at 14 days after expiry", async function () {
      const now = await time.latest();
      const expiredAt = now - 14 * ONE_DAY;
      const p = await oracle.price("abc", expiredAt, ONE_YEAR);
      // elapsed = 14 days, PERIOD = 28 days
      // premium = 100_000_000 * (28 - 14) / 28 = 100_000_000 * 14 / 28 = 50_000_000
      const elapsed = BigInt(14 * ONE_DAY);
      const period = BigInt(PREMIUM_DECAY_PERIOD);
      const expected = PREMIUM_START * (period - elapsed) / period;
      expect(p.premium).to.equal(expected);
    });

    it("premium is 0 at exactly 28 days after expiry", async function () {
      const now = await time.latest();
      const expiredAt = now - 28 * ONE_DAY;
      const p = await oracle.price("abc", expiredAt, ONE_YEAR);
      expect(p.premium).to.equal(0n);
    });

    it("premium is 0 beyond 28 days after expiry", async function () {
      const now = await time.latest();
      const expiredAt = now - 60 * ONE_DAY;
      const p = await oracle.price("abc", expiredAt, ONE_YEAR);
      expect(p.premium).to.equal(0n);
    });
  });

  // ─── setPrices ────────────────────────────────────────────────────────────

  describe("setPrices", function () {
    it("owner can update prices", async function () {
      await oracle.setPrices(
        10_000_000n,
        8_000_000n,
        6_000_000n,
        4_000_000n,
        2_000_000n
      );
      const p = await oracle.price("a", 0, ONE_YEAR);
      expect(p.base).to.equal(10_000_000n);
    });

    it("non-owner reverts", async function () {
      await expect(
        oracle.connect(other).setPrices(1n, 1n, 1n, 1n, 1n)
      ).to.be.revertedWithCustomError(oracle, "OwnableUnauthorizedAccount");
    });

    it("emits PricesUpdated event", async function () {
      await expect(oracle.setPrices(10n, 8n, 6n, 4n, 2n))
        .to.emit(oracle, "PricesUpdated")
        .withArgs(10n, 8n, 6n, 4n, 2n);
    });
  });

  // ─── Unicode codepoint counting (_strlen via price) ───────────────────────

  describe("Unicode codepoint counting", function () {
    it("ASCII single-byte characters counted correctly", async function () {
      // "hello" = 5 ASCII chars → 5+ tier
      const p = await oracle.price("hello", 0, ONE_YEAR);
      expect(p.base).to.equal(2_000_000n); // 5+ tier
    });

    it("2-byte UTF-8 character counts as 1 codepoint", async function () {
      // "é" is U+00E9, encoded as 2 bytes in UTF-8 → 1 codepoint → 1-char tier
      const p = await oracle.price("\u00e9", 0, ONE_YEAR);
      expect(p.base).to.equal(50_000_000n); // 1-char tier
    });

    it("3-byte UTF-8 character counts as 1 codepoint", async function () {
      // "中" is U+4E2D, encoded as 3 bytes in UTF-8 → 1 codepoint → 1-char tier
      const p = await oracle.price("\u4e2d", 0, ONE_YEAR);
      expect(p.base).to.equal(50_000_000n); // 1-char tier
    });

    it("4-byte UTF-8 emoji counts as 1 codepoint", async function () {
      // "😀" is U+1F600, encoded as 4 bytes in UTF-8 → 1 codepoint → 1-char tier
      const p = await oracle.price("\u{1F600}", 0, ONE_YEAR);
      expect(p.base).to.equal(50_000_000n); // 1-char tier
    });

    it("mixed ASCII and emoji: 2 codepoints → 2-char tier", async function () {
      // "a😀" = 1 ASCII + 1 emoji = 2 codepoints → 2-char tier
      const p = await oracle.price("a\u{1F600}", 0, ONE_YEAR);
      expect(p.base).to.equal(25_000_000n); // 2-char tier
    });

    it("two 2-byte chars count as 2 codepoints → 2-char tier", async function () {
      // "éé" = 2 × U+00E9 = 2 codepoints → 2-char tier
      const p = await oracle.price("\u00e9\u00e9", 0, ONE_YEAR);
      expect(p.base).to.equal(25_000_000n); // 2-char tier
    });
  });

  // ─── ZeroDuration error ───────────────────────────────────────────────────

  describe("ZeroDuration", function () {
    it("reverts with ZeroDuration for duration=0", async function () {
      await expect(oracle.price("abc", 0, 0))
        .to.be.revertedWithCustomError(oracle, "ZeroDuration");
    });
  });

  // ─── Constants ────────────────────────────────────────────────────────────

  describe("constants", function () {
    it("PREMIUM_START is 100 USDC", async function () {
      expect(await oracle.PREMIUM_START()).to.equal(100_000_000n);
    });

    it("PREMIUM_DECAY_PERIOD is 28 days", async function () {
      expect(await oracle.PREMIUM_DECAY_PERIOD()).to.equal(BigInt(28 * ONE_DAY));
    });
  });
});
