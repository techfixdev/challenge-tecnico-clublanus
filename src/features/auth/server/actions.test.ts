// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

import { INITIAL_LOGIN_FORM_STATE } from "../domain/login-form-state";

const mocks = vi.hoisted(() => ({
  signIn: vi.fn(),
  headers: vi.fn(),
  redirect: vi.fn(),
}));

vi.mock("./sign-in", () => ({ signIn: mocks.signIn, signOut: vi.fn() }));
vi.mock("next/headers", () => ({ headers: mocks.headers }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));

const { login } = await import("./actions");

function form(email: string, password: string) {
  const data = new FormData();
  data.set("email", email);
  data.set("password", password);
  return data;
}

beforeEach(() => {
  mocks.signIn.mockReset();
  mocks.redirect.mockReset();
  mocks.headers
    .mockReset()
    .mockResolvedValue(
      new Headers({ "x-forwarded-for": "203.0.113.7, 10.0.0.1" }),
    );
});

describe("login action", () => {
  it("passes the client IP from the request headers to the login service", async () => {
    mocks.signIn.mockResolvedValue({
      ok: false,
      reason: "invalid_credentials",
    });

    await login(INITIAL_LOGIN_FORM_STATE, form("a@b.com", "x"));

    expect(mocks.signIn).toHaveBeenCalledWith(expect.anything(), {
      clientIp: "203.0.113.7",
    });
  });

  it("shows the wait as a form error when too many attempts failed, keeping the email", async () => {
    mocks.signIn.mockResolvedValue({
      ok: false,
      reason: "rate_limited",
      retryAfterSeconds: 540,
    });

    const state = await login(
      INITIAL_LOGIN_FORM_STATE,
      form("soygranate@clublanus.com", "x"),
    );

    expect(state).toEqual({
      formError: "Demasiados intentos. Probá de nuevo en 9 minutos.",
      values: { email: "soygranate@clublanus.com", remember: false },
    });
    expect(mocks.redirect).not.toHaveBeenCalled();
  });
});
