/**
 * Browser security headers: the Content-Security-Policy (per request, with a nonce, sent by
 * `src/proxy.ts`) and the static headers every response carries (`next.config.ts`).
 *
 * Framework-free and dependency-free: next.config.ts imports it by relative path, and the
 * policy is a pure function of its inputs so each environment is unit-tested.
 *
 * HSTS is not here on purpose: Vercel already sends
 * `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload` on its HTTPS
 * domains, and sending it from the app would reach the plain-http LAN preview too.
 */

export type ContentSecurityPolicyOptions = {
  /** Per-request nonce (base64) that Next.js attaches to its own scripts. */
  nonce: string;
  /** `next dev`: React needs `eval` for its debugging stacks, and HMR uses a WebSocket. */
  isDevelopment: boolean;
  /**
   * `GRANABANK_LAN_PREVIEW=1` (see shared/config/lan-preview.ts): a production build
   * served over plain http on the LAN, where upgrading requests to https would break
   * every asset.
   */
  isLanPreview: boolean;
  /** Host of the request (`localhost:3000`), for the dev HMR WebSocket. */
  host?: string;
};

export function buildContentSecurityPolicy({
  nonce,
  isDevelopment,
  isLanPreview,
  host,
}: ContentSecurityPolicyOptions): string {
  const directives: Array<[string, ...string[]]> = [
    ["default-src", "'self'"],
    // 'strict-dynamic': scripts loaded by a nonced script are trusted too (Next's chunks),
    // and host allowlists are ignored, so an injected <script> without the nonce never runs.
    [
      "script-src",
      "'self'",
      `'nonce-${nonce}'`,
      "'strict-dynamic'",
      ...(isDevelopment ? ["'unsafe-eval'"] : []),
    ],
    // Styles keep 'unsafe-inline' (and no nonce: a nonce would make browsers ignore it).
    // React renders `style=""` attributes (Motion animates through them, the layout sets
    // CSS variables inline) and Next injects <style> tags, and attributes cannot carry a
    // nonce. Inline CSS cannot run code; the XSS protection comes from script-src.
    ["style-src", "'self'", "'unsafe-inline'"],
    // data: for the CSS-embedded SVG icons; blob: for images built in the browser.
    ["img-src", "'self'", "data:", "blob:"],
    // next/font downloads Poppins and Rokkitt at build time and serves them from /_next.
    ["font-src", "'self'"],
    [
      "connect-src",
      "'self'",
      ...(isDevelopment && host ? [`ws://${host}`, `wss://${host}`] : []),
    ],
    ["object-src", "'none'"],
    ["base-uri", "'self'"],
    ["form-action", "'self'"],
    ["frame-ancestors", "'none'"],
    ...(isDevelopment || isLanPreview
      ? []
      : [["upgrade-insecure-requests"] as [string]]),
  ];
  return directives.map((parts) => parts.join(" ")).join("; ");
}

/** 128 random bits, base64: unguessable and fresh for every request. */
export function generateNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes));
}

/**
 * Features the app never uses, denied for the page and any frame. Left at their default
 * (same origin allowed) on purpose: `web-share` (the "Compartir" buttons call
 * `navigator.share`) and `clipboard-write` ("Copiar" calls `navigator.clipboard`).
 */
const DENIED_FEATURES = [
  "accelerometer",
  "browsing-topics",
  "camera",
  "display-capture",
  "geolocation",
  "gyroscope",
  "hid",
  "magnetometer",
  "microphone",
  "midi",
  "payment",
  "serial",
  "usb",
] as const;

/** Headers that do not change per request: set once for every route in next.config.ts. */
export const STATIC_SECURITY_HEADERS: ReadonlyArray<{
  key: string;
  value: string;
}> = [
  // Never guess a MIME type: a JSON or text response is never run as a script.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Other sites see only the origin, never the path (movement ids, search terms).
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Clickjacking: no site may frame the app. Older browsers' twin of frame-ancestors.
  { key: "X-Frame-Options", value: "DENY" },
  {
    key: "Permissions-Policy",
    value: DENIED_FEATURES.map((feature) => `${feature}=()`).join(", "),
  },
  // A window opened from another site gets no handle to this one (and vice versa).
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
];
