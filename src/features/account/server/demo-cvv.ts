import "server-only";

import { createHmac } from "node:crypto";

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

/**
 * `DEMO_CVV_SECRET` if set, otherwise `SESSION_SECRET` (already required by the app):
 * the HMAC message is prefixed with its own purpose, so the two uses never collide.
 */
export function demoCvvSecret(
  env: Partial<Record<string, string>> = process.env,
): string {
  const secret = env.DEMO_CVV_SECRET || env.SESSION_SECRET;
  if (!secret)
    throw new Error("Neither DEMO_CVV_SECRET nor SESSION_SECRET is set");
  return secret;
}
