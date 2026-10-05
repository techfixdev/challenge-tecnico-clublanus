// @vitest-environment node
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { DUMMY_PASSWORD_HASH } from "@/features/auth/domain/authenticate";

/*
 * Exercises the real signIn service, zod schema and authenticate use case; only the
 * persistence (user repository), password hashing and the cookie session are mocked.
 */
const mocks = vi.hoisted(() => ({
  findCredentialsByEmail: vi.fn(),
  createSession: vi.fn(),
  compare: vi.fn(),
}));

vi.mock("@/features/auth/data/user-repository", () => ({
  findCredentialsByEmail: mocks.findCredentialsByEmail,
}));
vi.mock("@/features/auth/server/session", () => ({
  createSession: mocks.createSession,
  deleteSession: vi.fn(),
}));
vi.mock("bcryptjs", () => ({ default: { compare: mocks.compare } }));

const { POST } = await import("./route");

const CREDENTIALS = {
  email: "soygranate@clublanus.com",
  password: "GRANATE1@",
};

function post(body: string, contentType: string | null = "application/json") {
  return POST(
    new NextRequest("http://localhost:3000/api/auth/login", {
      method: "POST",
      body,
      headers: contentType ? { "content-type": contentType } : {},
    }),
  );
}

beforeEach(() => {
  mocks.findCredentialsByEmail
    .mockReset()
    .mockResolvedValue({ id: "user_1", passwordHash: "$2b$10$stored" });
  mocks.compare
    .mockReset()
    .mockImplementation(
      async (plain: string, hash: string) =>
        plain === CREDENTIALS.password && hash !== DUMMY_PASSWORD_HASH,
    );
  mocks.createSession.mockReset().mockResolvedValue(undefined);
});

describe("POST /api/auth/login", () => {
  it("signs in and starts a session", async () => {
    const response = await post(
      JSON.stringify({ ...CREDENTIALS, remember: true }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ user: { id: "user_1" } });
    expect(mocks.createSession).toHaveBeenCalledWith("user_1", {
      remember: true,
    });
  });

  it("accepts a JSON media type with parameters", async () => {
    const response = await post(
      JSON.stringify(CREDENTIALS),
      "Application/JSON; charset=utf-8",
    );

    expect(response.status).toBe(200);
  });

  it.each([
    ["missing", null],
    ["form data", "application/x-www-form-urlencoded"],
    ["a substring match", "text/plain; note=application/json"],
  ])("answers 415 for a %s content type", async (_label, contentType) => {
    const response = await post(JSON.stringify(CREDENTIALS), contentType);

    expect(response.status).toBe(415);
    expect((await response.json()).error.code).toBe("UNSUPPORTED_MEDIA_TYPE");
    expect(mocks.findCredentialsByEmail).not.toHaveBeenCalled();
  });

  it("answers 400 INVALID_JSON for a malformed body", async () => {
    const response = await post("{not json");

    expect(response.status).toBe(400);
    expect((await response.json()).error.code).toBe("INVALID_JSON");
  });

  it("answers 400 with every field error, including fields the form never shows", async () => {
    const response = await post(
      JSON.stringify({ email: "nope", password: "", remember: "yes" }),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe("INVALID_INPUT");
    expect(Object.keys(body.error.details.fieldErrors).sort()).toEqual([
      "email",
      "password",
      "remember",
    ]);
  });

  it("answers 400 with a root error when the body is not an object", async () => {
    const response = await post("null");
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.details.formErrors).toHaveLength(1);
  });

  it("answers 401 with a generic message for wrong credentials", async () => {
    const response = await post(
      JSON.stringify({ ...CREDENTIALS, password: "wrong" }),
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: "INVALID_CREDENTIALS",
        message: "Email o contraseña incorrectos",
      },
    });
    expect(mocks.createSession).not.toHaveBeenCalled();
  });

  it("answers 503 (not an unhandled 500) when the database is down", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.findCredentialsByEmail.mockRejectedValue(
      new Error("connect ECONNREFUSED 127.0.0.1:5432"),
    );

    const response = await post(JSON.stringify(CREDENTIALS));
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.error.code).toBe("SERVICE_UNAVAILABLE");
    expect(JSON.stringify(body)).not.toContain("ECONNREFUSED");
  });
});
