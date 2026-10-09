import type { NextConfig } from "next";

import { assertLanPreviewConfig } from "./src/shared/config/lan-preview";
import { STATIC_SECURITY_HEADERS } from "./src/shared/security/headers";

// `next build` / `next start` with GRANABANK_LAN_PREVIEW=1: warn, or fail on Vercel.
assertLanPreviewConfig();

const nextConfig: NextConfig = {
  // Dev only: extra hostnames (comma-separated) allowed to load dev assets, e.g. the
  // machine's LAN IP to try the app from a phone. Ignored by `next build`/`next start`.
  allowedDevOrigins: process.env.ALLOWED_DEV_ORIGINS?.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
  // No `X-Powered-By: Next.js`: it only tells an attacker which framework to target.
  poweredByHeader: false,
  // Security headers that never change, on every response (pages, API, assets). The
  // Content-Security-Policy needs a fresh nonce per request, so src/proxy.ts sends it.
  async headers() {
    return [{ source: "/:path*", headers: [...STATIC_SECURITY_HEADERS] }];
  },
  experimental: {
    // Links that prefetch in full (Enviar, Recibir, Movimientos) cache the page for
    // `static` seconds (default 5 min). Balances and movements can change from outside
    // (money received from someone else), so a prefetched page is reused for 30s at most.
    staleTimes: { static: 30 },
  },
};

export default nextConfig;
