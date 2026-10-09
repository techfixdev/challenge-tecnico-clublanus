import { describe, expect, it } from "vitest";

import {
  STATIC_SECURITY_HEADERS,
  buildContentSecurityPolicy,
  generateNonce,
} from "./headers";

const NONCE = "bm9uY2Utb2YtdGhlLXRlc3Q=";

function directives(policy: string): Map<string, string[]> {
  return new Map(
    policy.split("; ").map((directive) => {
      const [name, ...values] = directive.split(" ");
      return [name, values];
    }),
  );
}

const production = directives(
  buildContentSecurityPolicy({
    nonce: NONCE,
    isDevelopment: false,
    isLanPreview: false,
    host: "granabank.example",
  }),
);
const development = directives(
  buildContentSecurityPolicy({
    nonce: NONCE,
    isDevelopment: true,
    isLanPreview: false,
    host: "localhost:3000",
  }),
);
const lanPreview = directives(
  buildContentSecurityPolicy({
    nonce: NONCE,
    isDevelopment: false,
    isLanPreview: true,
    host: "192.168.0.10:3001",
  }),
);

describe("buildContentSecurityPolicy", () => {
  it("in production, runs only scripts carrying the request's nonce, never eval", () => {
    expect(production.get("script-src")).toEqual([
      "'self'",
      `'nonce-${NONCE}'`,
      "'strict-dynamic'",
    ]);
  });

  it("locks down everything the app does not load", () => {
    expect(production.get("default-src")).toEqual(["'self'"]);
    expect(production.get("object-src")).toEqual(["'none'"]);
    expect(production.get("base-uri")).toEqual(["'self'"]);
    expect(production.get("form-action")).toEqual(["'self'"]);
    expect(production.get("frame-ancestors")).toEqual(["'none'"]);
    expect(production.get("connect-src")).toEqual(["'self'"]);
    expect(production.get("font-src")).toEqual(["'self'"]);
    expect(production.get("img-src")).toEqual(["'self'", "data:", "blob:"]);
  });

  it("allows inline styles without a nonce, which would disable 'unsafe-inline'", () => {
    expect(production.get("style-src")).toEqual(["'self'", "'unsafe-inline'"]);
  });

  it("upgrades insecure requests in production only", () => {
    expect(production.get("upgrade-insecure-requests")).toEqual([]);
    expect(development.has("upgrade-insecure-requests")).toBe(false);
    expect(lanPreview.has("upgrade-insecure-requests")).toBe(false);
  });

  it("in development, allows React's eval and the HMR WebSocket of this host", () => {
    expect(development.get("script-src")).toContain("'unsafe-eval'");
    expect(development.get("connect-src")).toEqual([
      "'self'",
      "ws://localhost:3000",
      "wss://localhost:3000",
    ]);
  });

  it("the LAN preview is a production build: no eval, no WebSocket", () => {
    expect(lanPreview.get("script-src")).not.toContain("'unsafe-eval'");
    expect(lanPreview.get("connect-src")).toEqual(["'self'"]);
  });
});

describe("generateNonce", () => {
  it("returns 128 random bits in base64, different on every call", () => {
    const nonces = new Set(Array.from({ length: 50 }, generateNonce));

    expect(nonces.size).toBe(50);
    for (const nonce of nonces) {
      expect(nonce).toMatch(/^[A-Za-z0-9+/]{22}==$/);
    }
  });
});

describe("STATIC_SECURITY_HEADERS", () => {
  const headers = new Map(
    STATIC_SECURITY_HEADERS.map(({ key, value }) => [key, value]),
  );

  it("sets the anti-sniffing, referrer, framing and opener headers", () => {
    expect(headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(headers.get("Referrer-Policy")).toBe(
      "strict-origin-when-cross-origin",
    );
    expect(headers.get("X-Frame-Options")).toBe("DENY");
    expect(headers.get("Cross-Origin-Opener-Policy")).toBe("same-origin");
  });

  it("denies unused features but keeps sharing and copying available", () => {
    const policy = headers.get("Permissions-Policy") ?? "";

    for (const feature of ["camera", "microphone", "geolocation", "payment"]) {
      expect(policy).toContain(`${feature}=()`);
    }
    expect(policy).not.toContain("web-share");
    expect(policy).not.toContain("clipboard");
  });

  it("leaves HSTS to the HTTPS host (Vercel), so the http LAN preview keeps working", () => {
    expect(headers.has("Strict-Transport-Security")).toBe(false);
  });
});
