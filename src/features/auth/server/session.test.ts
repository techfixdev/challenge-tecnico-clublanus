import { beforeEach, describe, expect, it, vi } from "vitest";

const cookieStore = { get: vi.fn(), set: vi.fn(), delete: vi.fn() };

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ cookies: async () => cookieStore }));
vi.mock("../data/session-repository", () => ({
  deleteDeadSessions: vi.fn(),
  findLiveSessionUser: vi.fn(),
  insertSession: vi.fn(),
  revokeAllUserSessions: vi.fn(),
  revokeSessionById: vi.fn(),
}));
vi.mock("./session-token", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./session-token")>()),
  getSessionKey: () => new TextEncoder().encode("k".repeat(32)),
  signSessionToken: vi.fn(async () => "signed-token"),
  verifySessionToken: vi.fn(async () => ({ userId: "u1", sessionId: "s1" })),
}));

const repository = await import("../data/session-repository");
const { createSession, deleteSession } = await import("./session");

describe("session lifecycle failures", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("still deletes the cookie when revoking the session row fails", async () => {
    vi.mocked(repository.revokeSessionById).mockRejectedValueOnce(
      new Error("database unreachable"),
    );

    await expect(deleteSession()).resolves.toBeUndefined();

    expect(cookieStore.delete).toHaveBeenCalledOnce();
    expect(console.error).toHaveBeenCalled();
  });

  it("still signs in when cleaning up dead sessions fails", async () => {
    vi.mocked(repository.deleteDeadSessions).mockRejectedValueOnce(
      new Error("lock timeout"),
    );

    await expect(
      createSession("u1", { remember: false }),
    ).resolves.toBeUndefined();

    expect(repository.insertSession).toHaveBeenCalledOnce();
    expect(cookieStore.set).toHaveBeenCalledOnce();
    expect(console.error).toHaveBeenCalled();
  });
});
