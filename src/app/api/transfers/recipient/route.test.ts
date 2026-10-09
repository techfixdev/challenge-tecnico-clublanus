// @vitest-environment node
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { TRANSFER_MESSAGES } from "@/features/transfers/domain/transfer-schema";
import {
  RECIPIENT_LOOKUP_POLICY,
  decide,
  windowStartFor,
} from "@/shared/lib/rate-limit";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  findRecipient: vi.fn(),
  consumeRateLimit: vi.fn(),
}));

vi.mock("@/features/auth/server/current-user", () => ({
  getCurrentUser: mocks.getCurrentUser,
}));
vi.mock("@/features/transfers/data/prisma-transfer-repository", () => ({
  prismaTransferRepository: {
    findRecipient: mocks.findRecipient,
    execute: vi.fn(),
  },
}));

// The limiter's verdict logic is real; only its PostgreSQL counter lives in memory.
vi.mock("@/shared/server/rate-limit-store", () => ({
  consumeRateLimit: mocks.consumeRateLimit,
}));

const { GET } = await import("./route");

const NOW = new Date("2026-10-08T12:03:00.000Z");
let hits: Map<string, number>;

function get(query: string) {
  return GET(
    new NextRequest(`http://localhost:3000/api/transfers/recipient${query}`),
  );
}

beforeEach(() => {
  mocks.getCurrentUser.mockReset().mockResolvedValue({ id: "user_1" });
  mocks.findRecipient.mockReset().mockResolvedValue({
    id: "user_2",
    firstName: "Hincha",
    lastName: "Granate",
    alias: "hincha.granate",
    cvu: "0000003100020000000202",
  });
  hits = new Map();
  mocks.consumeRateLimit
    .mockReset()
    .mockImplementation(async (scope: string, key: string, policy) => {
      const count = (hits.get(`${scope}:${key}`) ?? 0) + 1;
      hits.set(`${scope}:${key}`, count);
      return decide(count, windowStartFor(NOW, policy), NOW, policy);
    });
});

describe("GET /api/transfers/recipient", () => {
  it("previews the recipient with a masked CVU", async () => {
    const response = await get("?q=Hincha.Granate");

    expect(response.status).toBe(200);
    expect(mocks.findRecipient).toHaveBeenCalledWith({
      kind: "alias",
      alias: "hincha.granate",
    });
    await expect(response.json()).resolves.toEqual({
      data: {
        fullName: "Hincha Granate",
        alias: "hincha.granate",
        cvuMasked: "•• •••• •••• •••• •••• 0202",
      },
    });
  });

  it("answers 404 for an unknown alias and 422 for the user's own account", async () => {
    mocks.findRecipient.mockResolvedValueOnce(null);
    const unknown = await get("?q=nadie.granate");
    mocks.findRecipient.mockResolvedValueOnce({
      id: "user_1",
      firstName: "Granate",
      lastName: "Lanús",
      alias: "soy.granate.lanus",
      cvu: null,
    });
    const self = await get("?q=soy.granate.lanus");

    expect(unknown.status).toBe(404);
    expect((await unknown.json()).error.code).toBe("RECIPIENT_NOT_FOUND");
    expect(self.status).toBe(422);
    expect((await self.json()).error.code).toBe("SELF_TRANSFER");
  });

  it("answers 400 for a missing or malformed query", async () => {
    const response = await get("");

    expect(response.status).toBe(400);
    expect((await response.json()).error.details.fieldErrors).toEqual({
      q: [TRANSFER_MESSAGES.recipientRequired],
    });
    expect(mocks.findRecipient).not.toHaveBeenCalled();
  });

  it("answers 401 without a session", async () => {
    mocks.getCurrentUser.mockResolvedValue(null);

    expect((await get("?q=hincha.granate")).status).toBe(401);
    expect(mocks.findRecipient).not.toHaveBeenCalled();
  });

  it("answers the 31st lookup in 10 minutes with 429 and Retry-After, without reading accounts", async () => {
    for (let lookup = 1; lookup <= 30; lookup++) {
      expect((await get("?q=hincha.granate")).status).toBe(200);
    }
    mocks.findRecipient.mockClear();

    const response = await get("?q=otro.granate");

    expect(response.status).toBe(429);
    // Window 12:00–12:10, now 12:03 → 420 s.
    expect(response.headers.get("retry-after")).toBe("420");
    expect(await response.json()).toEqual({
      error: {
        code: "RATE_LIMITED",
        message: "Demasiados intentos. Probá de nuevo en 7 minutos.",
      },
    });
    expect(mocks.findRecipient).not.toHaveBeenCalled();
    expect(mocks.consumeRateLimit).toHaveBeenLastCalledWith(
      "transfer:recipient-lookup",
      "user_1",
      RECIPIENT_LOOKUP_POLICY,
    );
  });

  it("counts lookups per user: another user still gets through", async () => {
    for (let lookup = 1; lookup <= 31; lookup++) await get("?q=hincha.granate");
    mocks.getCurrentUser.mockResolvedValue({ id: "user_3" });

    expect((await get("?q=hincha.granate")).status).toBe(200);
  });
});
