// @vitest-environment node
import { createHmac } from "node:crypto";

import { describe, expect, it } from "vitest";

import { demoCvvSecret, deriveDemoCvv } from "./demo-cvv";

const SECRET = "a-test-secret-that-is-at-least-32-chars";

describe("deriveDemoCvv", () => {
  it("is three digits, leading zeros included", () => {
    for (let index = 0; index < 200; index += 1) {
      expect(deriveDemoCvv(`card_${index}`, SECRET)).toMatch(/^\d{3}$/);
    }
  });

  it("is deterministic for a card and secret (nothing is stored)", () => {
    expect(deriveDemoCvv("card_mc", SECRET)).toBe(
      deriveDemoCvv("card_mc", SECRET),
    );
  });

  it("depends on the card and on the server secret", () => {
    const values = new Set(
      Array.from({ length: 50 }, (_, index) =>
        deriveDemoCvv(`card_${index}`, SECRET),
      ),
    );
    // 50 cards over 1000 values: a constant or a tiny range would collapse this.
    expect(values.size).toBeGreaterThan(40);
    const other = Array.from({ length: 10 }, (_, index) =>
      deriveDemoCvv(`card_${index}`, `${SECRET}-rotated`),
    );
    const same = Array.from({ length: 10 }, (_, index) =>
      deriveDemoCvv(`card_${index}`, SECRET),
    );
    expect(other).not.toEqual(same);
  });

  it("matches a known HMAC-SHA256 vector (the derivation is a stable contract)", () => {
    // HMAC-SHA256(SECRET, "granabank:demo-cvv:v1:card_mc"), first 4 bytes mod 1000.
    expect(deriveDemoCvv("card_mc", SECRET)).toBe(KNOWN_VECTOR);
  });

  it("refuses an empty secret", () => {
    expect(() => deriveDemoCvv("card_mc", "")).toThrow();
  });
});

describe("demoCvvSecret", () => {
  it("prefers DEMO_CVV_SECRET and falls back to SESSION_SECRET", () => {
    expect(demoCvvSecret({ DEMO_CVV_SECRET: "x".repeat(32) })).toBe(
      "x".repeat(32),
    );
    expect(demoCvvSecret({ SESSION_SECRET: "y".repeat(32) })).toBe(
      "y".repeat(32),
    );
  });

  it("throws when neither is set", () => {
    expect(() => demoCvvSecret({})).toThrow();
  });
});

const KNOWN_VECTOR = (() => {
  // Computed independently with node:crypto so the test pins the algorithm, not the
  // implementation's helper.
  const digest = createHmac("sha256", SECRET)
    .update("granabank:demo-cvv:v1:card_mc")
    .digest();
  return String(digest.readUInt32BE(0) % 1000).padStart(3, "0");
})();
