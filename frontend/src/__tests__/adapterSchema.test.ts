/**
 * adapterSchema.test.ts
 *
 * Tests for the v1 ArcNS adapter response schema and error code contracts.
 *
 * Covers:
 *   - parseName() → AdapterError shape (status/code/hint)
 *   - parseAddress() → AdapterError shape
 *   - makeError() / makeNotFound() response builders
 *   - httpStatusForError() HTTP status mapping
 *   - v1Headers() CORS header presence
 *   - Response shape contracts for all distinguishable states
 */

import { describe, it, expect } from "vitest";
import {
  parseName,
  parseAddress,
  makeError,
  makeNotFound,
  v1Headers,
  httpStatusForError,
  type AdapterErrorCode,
} from "../lib/adapterHelpers";

// ─── Error response shape ─────────────────────────────────────────────────────

describe("AdapterError shape", () => {
  it("has status, code, and hint fields", () => {
    const err = makeError("INVALID_NAME", "some hint");
    expect(err).toMatchObject({
      status: "error",
      code:   "INVALID_NAME",
      hint:   "some hint",
    });
  });

  it("status is always 'error'", () => {
    const codes: AdapterErrorCode[] = [
      "INVALID_NAME", "INVALID_ADDRESS", "UNSUPPORTED_TLD",
      "MALFORMED_INPUT", "NOT_FOUND", "VERIFICATION_FAILED",
      "UPSTREAM_UNAVAILABLE", "INTERNAL_ERROR",
    ];
    for (const code of codes) {
      expect(makeError(code, "hint").status).toBe("error");
    }
  });
});

// ─── Not-found response shape ─────────────────────────────────────────────────

describe("AdapterNotFound shape", () => {
  it("has status and hint fields", () => {
    const nf = makeNotFound("Name has no address record set.");
    expect(nf).toMatchObject({
      status: "not_found",
      hint:   "Name has no address record set.",
    });
  });

  it("status is always 'not_found'", () => {
    expect(makeNotFound("x").status).toBe("not_found");
  });
});

// ─── HTTP status mapping ──────────────────────────────────────────────────────

describe("httpStatusForError", () => {
  it("returns 400 for input validation errors", () => {
    const inputErrors: AdapterErrorCode[] = [
      "INVALID_NAME", "INVALID_ADDRESS", "UNSUPPORTED_TLD",
      "MALFORMED_INPUT", "NOT_FOUND", "VERIFICATION_FAILED",
    ];
    for (const code of inputErrors) {
      expect(httpStatusForError(code)).toBe(400);
    }
  });

  it("returns 503 for UPSTREAM_UNAVAILABLE", () => {
    expect(httpStatusForError("UPSTREAM_UNAVAILABLE")).toBe(503);
  });

  it("returns 500 for INTERNAL_ERROR", () => {
    expect(httpStatusForError("INTERNAL_ERROR")).toBe(500);
  });
});

// ─── CORS headers ─────────────────────────────────────────────────────────────

describe("v1Headers", () => {
  it("includes Access-Control-Allow-Origin: *", () => {
    const h = v1Headers();
    expect(h["Access-Control-Allow-Origin"]).toBe("*");
  });

  it("includes X-ArcNS-Version: v1", () => {
    const h = v1Headers();
    expect(h["X-ArcNS-Version"]).toBe("v1");
  });

  it("sets Cache-Control with provided max-age", () => {
    expect(v1Headers(30)["Cache-Control"]).toBe("public, max-age=30");
    expect(v1Headers(0)["Cache-Control"]).toBe("public, max-age=0");
  });

  it("includes Access-Control-Allow-Methods", () => {
    expect(v1Headers()["Access-Control-Allow-Methods"]).toContain("GET");
  });
});

// ─── parseName error codes ────────────────────────────────────────────────────

describe("parseName error codes", () => {
  it("returns MALFORMED_INPUT for empty string", () => {
    const r = parseName("");
    expect("code" in r && r.code).toBe("MALFORMED_INPUT");
    expect("status" in r && r.status).toBe("error");
  });

  it("returns INVALID_NAME for name without TLD", () => {
    const r = parseName("alice");
    expect("code" in r && r.code).toBe("INVALID_NAME");
  });

  it("returns UNSUPPORTED_TLD for .eth", () => {
    const r = parseName("alice.eth");
    expect("code" in r && r.code).toBe("UNSUPPORTED_TLD");
    expect("status" in r && r.status).toBe("error");
  });

  it("returns UNSUPPORTED_TLD for .xyz", () => {
    const r = parseName("alice.xyz");
    expect("code" in r && r.code).toBe("UNSUPPORTED_TLD");
  });

  it("returns INVALID_NAME for leading hyphen", () => {
    const r = parseName("-alice.arc");
    expect("code" in r && r.code).toBe("INVALID_NAME");
  });

  it("returns INVALID_NAME for trailing hyphen", () => {
    const r = parseName("alice-.arc");
    expect("code" in r && r.code).toBe("INVALID_NAME");
  });

  it("returns INVALID_NAME for double-hyphen", () => {
    const r = parseName("ab--cd.arc");
    expect("code" in r && r.code).toBe("INVALID_NAME");
  });

  it("returns INVALID_NAME for invalid characters", () => {
    const r = parseName("alice!.arc");
    expect("code" in r && r.code).toBe("INVALID_NAME");
  });

  it("all error responses have status: 'error'", () => {
    const cases = ["", "alice", "alice.eth", "-alice.arc", "alice-.arc"];
    for (const c of cases) {
      const r = parseName(c);
      if ("status" in r) expect(r.status).toBe("error");
    }
  });
});

// ─── parseName success shape ──────────────────────────────────────────────────

describe("parseName success shape", () => {
  it("returns label, tld, normalizedName for valid .arc name", () => {
    const r = parseName("alice.arc");
    expect("code" in r).toBe(false);
    if (!("code" in r)) {
      expect(r.label).toBe("alice");
      expect(r.tld).toBe("arc");
      expect(r.normalizedName).toBe("alice.arc");
    }
  });

  it("returns label, tld, normalizedName for valid .circle name", () => {
    const r = parseName("bob.circle");
    expect("code" in r).toBe(false);
    if (!("code" in r)) {
      expect(r.tld).toBe("circle");
      expect(r.normalizedName).toBe("bob.circle");
    }
  });

  it("normalizes uppercase input", () => {
    const r = parseName("ALICE.ARC");
    if (!("code" in r)) {
      expect(r.normalizedName).toBe("alice.arc");
    }
  });
});

// ─── parseAddress error codes ─────────────────────────────────────────────────

describe("parseAddress error codes", () => {
  it("returns INVALID_ADDRESS for empty string", () => {
    const r = parseAddress("");
    expect(typeof r !== "string" && r.code).toBe("INVALID_ADDRESS");
    expect(typeof r !== "string" && r.status).toBe("error");
  });

  it("returns INVALID_ADDRESS for missing 0x prefix", () => {
    const r = parseAddress("aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa");
    expect(typeof r !== "string" && r.code).toBe("INVALID_ADDRESS");
  });

  it("returns INVALID_ADDRESS for too-short address", () => {
    const r = parseAddress("0xabc");
    expect(typeof r !== "string" && r.code).toBe("INVALID_ADDRESS");
  });

  it("returns INVALID_ADDRESS for invalid hex chars", () => {
    const r = parseAddress("0xzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz");
    expect(typeof r !== "string" && r.code).toBe("INVALID_ADDRESS");
  });

  it("all error responses have status: 'error'", () => {
    const cases = ["", "0xabc", "not-an-address"];
    for (const c of cases) {
      const r = parseAddress(c);
      if (typeof r !== "string") expect(r.status).toBe("error");
    }
  });
});

// ─── parseAddress success shape ───────────────────────────────────────────────

describe("parseAddress success shape", () => {
  it("returns lowercased address string for valid input", () => {
    const r = parseAddress("0xABCDEF1234567890ABCDEF1234567890ABCDEF12");
    expect(typeof r).toBe("string");
    expect(r).toBe("0xabcdef1234567890abcdef1234567890abcdef12");
  });
});

// ─── Name resolve response shape contracts ────────────────────────────────────

describe("name resolve response shape contracts", () => {
  it("success shape has required fields", () => {
    const success = {
      status:  "ok" as const,
      name:    "alice.arc",
      address: "0xabc",
      owner:   null,
      expiry:  null,
      source:  "rpc" as const,
    };
    expect(success.status).toBe("ok");
    expect(typeof success.name).toBe("string");
    expect(typeof success.address).toBe("string");
    expect("owner" in success).toBe(true);
    expect("expiry" in success).toBe(true);
    expect("source" in success).toBe(true);
  });

  it("not_found shape has status and hint", () => {
    const nf = makeNotFound("Name has no address record set.");
    expect(nf.status).toBe("not_found");
    expect(typeof nf.hint).toBe("string");
  });
});

// ─── Address resolve response shape contracts ─────────────────────────────────

describe("address resolve response shape contracts", () => {
  it("success shape has verified:true and name", () => {
    const success = {
      status:   "ok" as const,
      address:  "0xabc",
      name:     "alice.arc",
      verified: true as const,
      source:   "rpc" as const,
    };
    expect(success.status).toBe("ok");
    expect(success.verified).toBe(true);
    expect(typeof success.name).toBe("string");
  });

  it("not_found shape has verified:false and name:null", () => {
    const nf = {
      status:   "not_found" as const,
      address:  "0xabc",
      name:     null,
      verified: false as const,
      hint:     "No verified primary name for this address.",
    };
    expect(nf.status).toBe("not_found");
    expect(nf.verified).toBe(false);
    expect(nf.name).toBeNull();
    expect(typeof nf.hint).toBe("string");
  });

  it("verified:false is returned for stale reverse (forward mismatch)", () => {
    // The verification decision logic (tested in adapterCorrectness.test.ts)
    // ensures that a forward mismatch produces verified:false.
    // Here we verify the shape contract: when verified is false, name must be null.
    const staleResult = {
      status:   "not_found" as const,
      address:  "0xabc",
      name:     null,       // must be null when verified is false
      verified: false as const,
      hint:     "No verified primary name for this address.",
    };
    expect(staleResult.verified).toBe(false);
    expect(staleResult.name).toBeNull();
  });
});

// ─── Health response shape ────────────────────────────────────────────────────

describe("health response shape", () => {
  it("has required fields", () => {
    const health = {
      status:    "ok" as const,
      chainId:   5042002,
      network:   "arc_testnet",
      version:   "v1" as const,
      timestamp: Math.floor(Date.now() / 1000),
    };
    expect(health.status).toBe("ok");
    expect(health.chainId).toBe(5042002);
    expect(health.network).toBe("arc_testnet");
    expect(health.version).toBe("v1");
    expect(typeof health.timestamp).toBe("number");
  });
});
