// @vitest-environment node
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  SESSION_COOKIE_NAME,
  getSessionExpiry,
  getSessionKey,
  signSessionToken,
} from "@/features/auth/server/session-token";
import { ROUTES } from "@/shared/lib/routes";

import { config, proxy } from "./proxy";

const SECRET = "a-test-secret-that-is-at-least-32-characters";
const ORIGIN = "http://localhost:3000";

function request(path: string, cookie?: string): NextRequest {
  return new NextRequest(new URL(path, ORIGIN), {
    headers: cookie ? { cookie: `${SESSION_COOKIE_NAME}=${cookie}` } : {},
  });
}

async function validToken(): Promise<string> {
  return signSessionToken({ userId: "user_1", sessionId: "session_1" }, {
    key: getSessionKey(SECRET),
    expiresAt: getSessionExpiry(false),
  });
}

function clearsSessionCookie(response: Response): boolean {
  const setCookie = response.headers.get("set-cookie") ?? "";
  return (
    setCookie.includes(`${SESSION_COOKIE_NAME}=;`) &&
    setCookie.includes("Expires=Thu, 01 Jan 1970")
  );
}

beforeEach(() => {
  vi.stubEnv("SESSION_SECRET", SECRET);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("proxy", () => {
  it("guards every private page, including the transfer screens", () => {
    expect(config.matcher).toEqual(
      expect.arrayContaining([
        "/",
        "/movimientos/:path*",
        `${ROUTES.transfer}/:path*`,
        `${ROUTES.receive}/:path*`,
      ]),
    );
  });

  it("redirects anonymous visitors of private pages to /login", async () => {
    const response = await proxy(request("/movimientos"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(`${ORIGIN}${ROUTES.login}`);
  });

  it("lets signed-in users through and bounces them away from /login", async () => {
    const token = await validToken();

    expect(
      (await proxy(request("/", token))).headers.get("location"),
    ).toBeNull();
    expect(
      (await proxy(request(ROUTES.login, token))).headers.get("location"),
    ).toBe(`${ORIGIN}${ROUTES.home}`);
  });

  it("clears a tampered cookie while redirecting to /login", async () => {
    const response = await proxy(request("/", "not-a-valid-token"));

    expect(response.headers.get("location")).toBe(`${ORIGIN}${ROUTES.login}`);
    expect(clearsSessionCookie(response)).toBe(true);
  });

  it("on the expired-session login URL, drops the cookie and shows the login page", async () => {
    // Valid signature but the user no longer exists: requireUser() sends them here.
    const response = await proxy(
      request(ROUTES.loginExpired, await validToken()),
    );

    expect(response.headers.get("location")).toBeNull();
    expect(clearsSessionCookie(response)).toBe(true);
  });

  it("fails safe when SESSION_SECRET is missing: treats everyone as signed out", async () => {
    vi.stubEnv("SESSION_SECRET", "");
    const log = vi.spyOn(console, "error").mockImplementation(() => {});

    const privatePage = await proxy(request("/", "any-token"));
    const loginPage = await proxy(request(ROUTES.login));

    expect(privatePage.headers.get("location")).toBe(
      `${ORIGIN}${ROUTES.login}`,
    );
    expect(loginPage.headers.get("location")).toBeNull();
    expect(log).toHaveBeenCalled();
  });
});
