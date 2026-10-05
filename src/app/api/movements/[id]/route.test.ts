// @vitest-environment node
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { MovementRepository } from "@/features/movements/domain/movement-queries";
import { databaseUnavailableError } from "@/test/db-errors";
import {
  OTHER_USER_ID,
  OWNER_ID,
  createInMemoryMovementRepository,
  makeMovement,
} from "@/test/movement-fixtures";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  repository: { current: null as MovementRepository | null },
}));

vi.mock("@/features/auth/server/current-user", () => ({
  getCurrentUser: mocks.getCurrentUser,
}));

vi.mock("@/features/movements/data/prisma-movement-repository", () => ({
  get prismaMovementRepository() {
    return mocks.repository.current;
  },
}));

const { GET } = await import("./route");

const OWNER = {
  id: OWNER_ID,
  email: "soygranate@clublanus.com",
  firstName: "Granate",
  lastName: "Lanús",
};

const own = makeMovement({
  counterparty: "Ronaldo",
  description: "Pago recibido",
  type: "RECEIVED",
  amount: "95.00",
});
const foreign = makeMovement({ counterparty: "Adobe (ajeno)" });

function detail(id: string) {
  return GET(
    new NextRequest(new URL(`/api/movements/${id}`, "http://localhost:3000")),
    { params: Promise.resolve({ id }) },
  );
}

beforeEach(() => {
  mocks.getCurrentUser.mockReset().mockResolvedValue(OWNER);
  mocks.repository.current = createInMemoryMovementRepository([
    { ...own, userId: OWNER_ID },
    { ...foreign, userId: OTHER_USER_ID },
  ]);
});

describe("GET /api/movements/[id]", () => {
  it("answers 401 with the shared error shape when there is no session", async () => {
    mocks.getCurrentUser.mockResolvedValue(null);

    const response = await detail(own.id);

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: { code: "UNAUTHORIZED", message: expect.any(String) },
    });
  });

  it("returns the user's own movement as a DTO (ISO date, decimal string)", async () => {
    const response = await detail(own.id);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      data: { ...own, occurredAt: own.occurredAt.toISOString() },
    });
  });

  it("answers 404 (never 403) for another user's movement, so ids are not confirmed", async () => {
    const response = await detail(foreign.id);

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: { code: "NOT_FOUND", message: "No encontramos ese movimiento" },
    });
  });

  it("answers the same 404 for unknown and malformed ids, without querying for the latter", async () => {
    const findById = vi.spyOn(mocks.repository.current!, "findById");

    expect((await detail("cmuvt8zut00035dm61qeqiekh")).status).toBe(404);
    expect((await detail("not-an-id")).status).toBe(404);
    expect((await detail("' OR 1=1 --")).status).toBe(404);
    expect(findById).toHaveBeenCalledOnce();
  });

  it("answers 503 when the database is unreachable", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.repository.current = {
      findMany: vi.fn(),
      count: vi.fn(),
      findById: vi.fn().mockRejectedValue(databaseUnavailableError()),
    };

    const response = await detail(own.id);

    expect(response.status).toBe(503);
    expect((await response.json()).error.code).toBe("SERVICE_UNAVAILABLE");
  });
});
