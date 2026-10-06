/**
 * Local-only opt-in to try a production build from a phone on the same Wi-Fi.
 *
 * In production the session cookie is `Secure`, and browsers drop `Secure` cookies over
 * plain `http://` to a LAN IP (only `localhost` is exempt), so login cannot work there.
 * `GRANABANK_LAN_PREVIEW=1` makes that one cookie non-Secure for a local `next start`.
 *
 * Safety rails, failing loudly rather than silently weakening security:
 * - off unless the value is exactly "1"; any other non-empty value (e.g. "true") throws;
 * - throws on Vercel (`VERCEL` / `VERCEL_ENV`), so a deployment with the flag fails its
 *   build (next.config.ts runs this) and could never issue a non-Secure cookie;
 * - ignored outside production: dev cookies are never Secure anyway;
 * - prints a warning every time it is on.
 *
 * Framework-free and dependency-free: next.config.ts imports it by relative path.
 */

export const LAN_PREVIEW_ENV = "GRANABANK_LAN_PREVIEW";

type Env = Readonly<Record<string, string | undefined>>;

export function isLanPreviewEnabled(env: Env = process.env): boolean {
  const flag = env[LAN_PREVIEW_ENV];
  if (flag === undefined || flag === "" || flag === "0") return false;
  if (flag !== "1") {
    throw new Error(
      `${LAN_PREVIEW_ENV} must be "1" (on) or unset (off), got "${flag}".`,
    );
  }
  if (env.VERCEL || env.VERCEL_ENV) {
    throw new Error(
      `${LAN_PREVIEW_ENV} is a local-only LAN preview and must never be set on Vercel: ` +
        "it would make the session cookie non-Secure. Remove it from the project's environment variables.",
    );
  }
  return env.NODE_ENV === "production";
}

/** Startup check (next.config.ts): throws on misuse, warns when the preview is on. */
export function assertLanPreviewConfig(env: Env = process.env): void {
  if (!isLanPreviewEnabled(env)) return;
  console.warn(
    `\n⚠ ${LAN_PREVIEW_ENV}=1: LAN preview of a production build. The session cookie is NOT Secure ` +
      "(sent over plain http). Local network testing only; never use it for a real deployment.\n",
  );
}
