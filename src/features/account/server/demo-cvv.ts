import "server-only";

import { createHmac } from "node:crypto";

import { isLanPreviewEnabled } from "@/shared/config/lan-preview";

/**
 * Display-only CVV for the demo cards. A real issuer never stores the CVV after
 * authorization (PCI DSS requirement 3.3.1); here it is not stored at all: it is derived
 * on demand from the card id with a server-side secret (HMAC-SHA256), so it is stable
 * for a card, unguessable without the secret, and absent from the database.
 */
export function deriveDemoCvv(cardId: string, secret: string): string {
  if (!secret) throw new Error("The demo CVV secret is empty");
  const digest = createHmac("sha256", secret)
    .update(`granabank:demo-cvv:v1:${cardId}`)
    .digest();
  return String(digest.readUInt32BE(0) % 1000).padStart(3, "0");
}

const MIN_SECRET_LENGTH = 32;

/**
 * The secret behind the demo CVVs:
 * - in production, its own `DEMO_CVV_SECRET` (at least 32 characters) is required: a
 *   deployment must not quietly reuse the session-signing secret, so a missing one fails
 *   loudly at the first reveal instead. The one exception is the local LAN preview
 *   (`GRANABANK_LAN_PREVIEW=1`, a production build on the Wi-Fi, which itself refuses to
 *   run on Vercel), so trying the app from a phone needs no extra setup;
 * - in development and tests, `DEMO_CVV_SECRET` if set, otherwise `SESSION_SECRET`
 *   (already required by the app). The HMAC message is prefixed with its own purpose, so
 *   the two uses never collide.
 */
export function demoCvvSecret(
  env: Partial<Record<string, string>> = process.env,
): string {
  const isProduction = env.NODE_ENV === "production";
  if (isProduction && !isLanPreviewEnabled({ env, isProduction })) {
    const secret = env.DEMO_CVV_SECRET;
    if (!secret) {
      throw new Error(
        "DEMO_CVV_SECRET is required in production (it no longer falls back to SESSION_SECRET).",
      );
    }
    if (secret.length < MIN_SECRET_LENGTH) {
      throw new Error(
        `DEMO_CVV_SECRET must be at least ${MIN_SECRET_LENGTH} characters long.`,
      );
    }
    return secret;
  }

  const secret = env.DEMO_CVV_SECRET || env.SESSION_SECRET;
  if (!secret)
    throw new Error("Neither DEMO_CVV_SECRET nor SESSION_SECRET is set");
  return secret;
}
