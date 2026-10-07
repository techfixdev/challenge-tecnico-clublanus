// @vitest-environment node
// Server-only code; jsdom's Uint8Array is a different realm than the one jose checks.
import { SignJWT } from "jose";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  SESSION_DURATION_SECONDS,
  buildSessionCookieOptions,
  getSessionKey,
  getSessionExpiry,
  signSessionToken,
  verifySessionToken,
} from "./session-token";

const SECRET = "a-test-secret-that-is-at-least-32-characters";
const key = getSessionKey(SECRET);

describe("getSessionKey", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("fails fast when the secret is missing", () => {
    // Clear it explicitly: CI exports SESSION_SECRET, and `undefined` falls back to the env.
    vi.stubEnv("SESSION_SECRET", "");
    expect(() => getSessionKey(undefined)).toThrow(/SESSION_SECRET is not set/);
  });

  it("fails fast when the secret is too short", () => {
    expect(() => getSessionKey("short")).toThrow(/at least 32 characters/);
  });
});

describe("session token", () => {
  it("round-trips the user id", async () => {
    const token = await signSessionToken("user_123", {
      key,
      expiresAt: getSessionExpiry(false),
    });

    await expect(verifySessionToken(token, key)).resolves.toEqual({
      userId: "user_123",
    });
  });

  it("only carries the user id (no PII) in the payload", async () => {
    const token = await signSessionToken("user_123", {
      key,
      expiresAt: getSessionExpiry(true),
    });
    const payload = JSON.parse(
      Buffer.from(token.split(".")[1], "base64url").toString(),
    ) as Record<string, unknown>;

    expect(Object.keys(payload).sort()).toEqual(["exp", "iat", "sub"]);
  });

  it("rejects an expired token", async () => {
    const token = await signSessionToken("user_123", {
      key,
      expiresAt: new Date(Date.now() - 60_000),
    });
    await expect(verifySessionToken(token, key)).resolves.toBeNull();
  });

  it("rejects a tampered token", async () => {
    const token = await signSessionToken("user_123", {
      key,
      expiresAt: getSessionExpiry(false),
    });
    const [header, , signature] = token.split(".");
    const forgedPayload = Buffer.from(
      JSON.stringify({ sub: "admin", exp: 9_999_999_999 }),
    ).toString("base64url");

    await expect(
      verifySessionToken(`${header}.${forgedPayload}.${signature}`, key),
    ).resolves.toBeNull();
  });

  it("rejects a token signed with a different secret", async () => {
    const otherKey = getSessionKey("another-secret-that-is-also-32-chars-long");
    const token = await signSessionToken("user_123", {
      key: otherKey,
      expiresAt: getSessionExpiry(false),
    });
    await expect(verifySessionToken(token, key)).resolves.toBeNull();
  });

  it("rejects a token without a subject", async () => {
    const token = await new SignJWT({})
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("1h")
      .sign(key);
    await expect(verifySessionToken(token, key)).resolves.toBeNull();
  });

  it("returns null for missing or garbage input", async () => {
    await expect(verifySessionToken(undefined, key)).resolves.toBeNull();
    await expect(verifySessionToken("not-a-jwt", key)).resolves.toBeNull();
  });
});

describe("session lifetime (remember me)", () => {
  it("lasts 30 days when remembered and 1 day otherwise", () => {
    const now = new Date("2026-10-05T12:00:00Z");
    expect(getSessionExpiry(true, now).getTime() - now.getTime()).toBe(
      SESSION_DURATION_SECONDS.remembered * 1000,
    );
    expect(getSessionExpiry(false, now).getTime() - now.getTime()).toBe(
      SESSION_DURATION_SECONDS.default * 1000,
    );
    expect(SESSION_DURATION_SECONDS.remembered).toBe(30 * 24 * 60 * 60);
    expect(SESSION_DURATION_SECONDS.default).toBe(24 * 60 * 60);
  });

  it("persists the cookie only when remembered", () => {
    const expiresAt = new Date("2026-11-04T12:00:00Z");

    expect(buildSessionCookieOptions({ remember: true, expiresAt })).toEqual({
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      path: "/",
      expires: expiresAt,
    });

    const sessionOnly = buildSessionCookieOptions({
      remember: false,
      expiresAt,
    });
    expect(sessionOnly).not.toHaveProperty("expires");
    expect(sessionOnly).not.toHaveProperty("maxAge");
  });

  it("marks the cookie secure in production", () => {
    const options = buildSessionCookieOptions({
      remember: false,
      expiresAt: new Date(),
      isProduction: true,
    });
    expect(options.secure).toBe(true);
  });

  it("drops Secure only for the explicit local LAN preview of a production build", () => {
    const base = { remember: false, expiresAt: new Date(), isProduction: true };

    expect(
      buildSessionCookieOptions({ ...base, env: { NODE_ENV: "production" } })
        .secure,
    ).toBe(true);
    expect(
      buildSessionCookieOptions({
        ...base,
        env: { NODE_ENV: "production", GRANABANK_LAN_PREVIEW: "1" },
      }).secure,
    ).toBe(false);
  });

  it("decides production once: the caller's isProduction, not NODE_ENV again", () => {
    // A production server whose env object carries no NODE_ENV: the opt-in still applies.
    expect(
      buildSessionCookieOptions({
        remember: false,
        expiresAt: new Date(),
        isProduction: true,
        env: { GRANABANK_LAN_PREVIEW: "1" },
      }).secure,
    ).toBe(false);
    // Not production by the caller's word: no Secure, and the flag is not validated.
    expect(
      buildSessionCookieOptions({
        remember: false,
        expiresAt: new Date(),
        isProduction: false,
        env: { NODE_ENV: "production", GRANABANK_LAN_PREVIEW: "true" },
      }).secure,
    ).toBe(false);
  });

  it("never issues a non-Secure cookie on Vercel, even with the opt-in", () => {
    expect(() =>
      buildSessionCookieOptions({
        remember: false,
        expiresAt: new Date(),
        isProduction: true,
        env: {
          NODE_ENV: "production",
          VERCEL: "1",
          GRANABANK_LAN_PREVIEW: "1",
        },
      }),
    ).toThrow(/Vercel/);
  });
});
