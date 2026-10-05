// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

import { makeCard } from "@/test/movement-fixtures";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  findByUserId: vi.fn(),
}));

vi.mock("@/features/auth/server/current-user", () => ({
  getCurrentUser: mocks.getCurrentUser,
}));

vi.mock("@/features/account/data/prisma-card-repository", () => ({
  prismaCardRepository: { findByUserId: mocks.findByUserId },
}));

const { GET } = await import("./route");

beforeEach(() => {
  mocks.getCurrentUser.mockReset().mockResolvedValue({ id: "user_1" });
  mocks.findByUserId.mockReset();
});

describe("GET /api/account/cards", () => {
  it("returns the user's cards, primary first, balances as decimal strings", async () => {
    const visa = makeCard({ id: "visa", brand: "VISA", isPrimary: false });
    const mastercard = makeCard();
    mocks.findByUserId.mockResolvedValue([visa, mastercard]);

    const response = await GET();

    expect(response.status).toBe(200);
    expect(mocks.findByUserId).toHaveBeenCalledWith("user_1");
    await expect(response.json()).resolves.toEqual({
      data: [mastercard, visa],
    });
  });

  it("answers 401 without a session", async () => {
    mocks.getCurrentUser.mockResolvedValue(null);

    const response = await GET();

    expect(response.status).toBe(401);
    expect(mocks.findByUserId).not.toHaveBeenCalled();
  });

  it("answers 503 when the session store or database fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.getCurrentUser.mockRejectedValue(
      new Error("SESSION_SECRET is not set"),
    );

    const response = await GET();

    expect(response.status).toBe(503);
    expect((await response.json()).error.code).toBe("SERVICE_UNAVAILABLE");
  });
});
