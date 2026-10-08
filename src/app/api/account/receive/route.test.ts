// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

import { buildCvu } from "@/features/account/domain/account-identifiers";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  findByUserId: vi.fn(),
}));

vi.mock("@/features/auth/server/current-user", () => ({
  getCurrentUser: mocks.getCurrentUser,
}));
vi.mock("@/features/account/data/prisma-receive-details-repository", () => ({
  prismaReceiveDetailsRepository: { findByUserId: mocks.findByUserId },
}));

const { GET } = await import("./route");

const CVU = buildCvu("0000003", "1000000000017");

beforeEach(() => {
  mocks.getCurrentUser.mockReset().mockResolvedValue({ id: "user_1" });
  mocks.findByUserId.mockReset().mockResolvedValue({
    firstName: "Granate",
    lastName: "Lanús",
    alias: "soy.granate.lanus",
    cvu: CVU,
  });
});

describe("GET /api/account/receive", () => {
  it("returns the user's own alias, full CVU and holder name", async () => {
    const response = await GET();

    expect(response.status).toBe(200);
    expect(mocks.findByUserId).toHaveBeenCalledWith("user_1");
    await expect(response.json()).resolves.toEqual({
      data: {
        holderName: "Granate Lanús",
        alias: "soy.granate.lanus",
        cvu: CVU,
        // Fours from the end: the last group is the last 4 digits.
        cvuFormatted: "00 0000 3110 0000 0000 0175",
      },
    });
  });

  it("answers 404 when the account has no alias or CVU yet", async () => {
    mocks.findByUserId.mockResolvedValue({
      firstName: "A",
      lastName: "B",
      alias: null,
      cvu: null,
    });

    const response = await GET();

    expect(response.status).toBe(404);
    expect((await response.json()).error.code).toBe("NOT_FOUND");
  });

  it("answers 401 without a session", async () => {
    mocks.getCurrentUser.mockResolvedValue(null);

    expect((await GET()).status).toBe(401);
    expect(mocks.findByUserId).not.toHaveBeenCalled();
  });
});
