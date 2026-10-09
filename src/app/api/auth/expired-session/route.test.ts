// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

import { SESSION_COOKIE_NAME } from "@/features/auth/server/session-token";
import { ROUTES } from "@/shared/lib/routes";

const mocks = vi.hoisted(() => ({ getCurrentUser: vi.fn() }));

vi.mock("@/features/auth/server/current-user", () => ({
  getCurrentUser: mocks.getCurrentUser,
}));

const { GET } = await import("./route");

function clearsSessionCookie(response: Response): boolean {
  const setCookie = response.headers.get("set-cookie") ?? "";
  return setCookie.includes(`${SESSION_COOKIE_NAME}=;`);
}

beforeEach(() => {
  mocks.getCurrentUser.mockReset();
});

describe("GET /api/auth/expired-session", () => {
  it("sends a live session back home and keeps its cookie: a link cannot sign anyone out", async () => {
    mocks.getCurrentUser.mockResolvedValue({ id: "user_1" });

    const response = await GET();

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(ROUTES.home);
    expect(clearsSessionCookie(response)).toBe(false);
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("deletes the cookie of a session the server no longer honours and shows the login page", async () => {
    mocks.getCurrentUser.mockResolvedValue(null);

    const response = await GET();

    expect(response.status).toBe(307);
    // Plain /login: with the cookie gone the proxy shows the form, no redirect loop.
    expect(response.headers.get("location")).toBe(ROUTES.login);
    expect(clearsSessionCookie(response)).toBe(true);
  });

  it("keeps the cookie when the database cannot answer, sending the visitor home (which explains the outage)", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.getCurrentUser.mockRejectedValue(new Error("database down"));

    const response = await GET();

    expect(response.headers.get("location")).toBe(ROUTES.home);
    expect(clearsSessionCookie(response)).toBe(false);
  });
});
