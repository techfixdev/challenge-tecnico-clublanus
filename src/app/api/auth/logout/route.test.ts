// @vitest-environment node
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ deleteSession: vi.fn() }));

vi.mock("@/features/auth/data/user-repository", () => ({
  findCredentialsByEmail: vi.fn(),
}));
vi.mock("@/features/auth/server/session", () => ({
  createSession: vi.fn(),
  deleteSession: mocks.deleteSession,
}));

const { POST } = await import("./route");

function post(origin?: string) {
  return POST(
    new NextRequest("http://localhost:3000/api/auth/logout", {
      method: "POST",
      headers: origin ? { origin } : {},
    }),
  );
}

beforeEach(() => {
  mocks.deleteSession.mockReset().mockResolvedValue(undefined);
});

describe("POST /api/auth/logout", () => {
  it("ends the session for same-origin requests", async () => {
    const response = await post("http://localhost:3000");

    expect(response.status).toBe(204);
    expect(mocks.deleteSession).toHaveBeenCalledOnce();
  });

  it("allows non-browser clients that send no Origin", async () => {
    expect((await post()).status).toBe(204);
  });

  it("answers 403 to cross-origin requests and keeps the session", async () => {
    const response = await post("https://evil.example");

    expect(response.status).toBe(403);
    expect((await response.json()).error.code).toBe("FORBIDDEN");
    expect(mocks.deleteSession).not.toHaveBeenCalled();
  });

  it("answers a generic 500 when ending the session fails unexpectedly", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.deleteSession.mockRejectedValue(new Error("boom"));

    const response = await post();

    expect(response.status).toBe(500);
    expect((await response.json()).error.code).toBe("INTERNAL_ERROR");
  });
});
