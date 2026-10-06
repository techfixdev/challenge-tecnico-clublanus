import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Dev only: extra hostnames (comma-separated) allowed to load dev assets, e.g. the
  // machine's LAN IP to try the app from a phone. Ignored by `next build`/`next start`.
  allowedDevOrigins: process.env.ALLOWED_DEV_ORIGINS?.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
};

export default nextConfig;
