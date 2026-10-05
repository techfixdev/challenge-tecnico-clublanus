// @vitest-environment node
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { decodeMovementCursor } from "@/features/movements/domain/movement-cursor";
import type { MovementRepository } from "@/features/movements/domain/movement-queries";
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

vi.mock("@/features/auth/session/current-user", () => ({
  getCurrentUser: mocks.getCurrentUser,
}));

vi.mock("@/features/movements/data/prisma-movement-repository", () => ({
  get prismaMovementRepository() {
    return mocks.repository.current;
  },
}));

const { GET: listRoute } = await import("./route");
const { GET: detailRoute } = await import("./[id]/route");

const OWNER = {
  id: OWNER_ID,
  email: "soygranate@clublanus.com",
  firstName: "Granate",
  lastName: "Lanús",
};

const ownAdobe = makeMovement({ counterparty: "Adobe" });
const ownRonaldo = makeMovement({
  counterparty: "Ronaldo",
  description: "Pago recibido",
  type: "RECEIVED",
  amount: "95.00",
});
const foreign = makeMovement({ counterparty: "Adobe (ajeno)" });

function seed(
  extra: Parameters<typeof createInMemoryMovementRepository>[0] = [],
) {
  mocks.repository.current = createInMemoryMovementRepository([
    { ...ownAdobe, userId: OWNER_ID },
    { ...ownRonaldo, userId: OWNER_ID },
    { ...foreign, userId: OTHER_USER_ID },
    ...extra,
  ]);
}

function get(path: string): NextRequest {
  return new NextRequest(new URL(path, "http://localhost:3000"));
}

function detail(id: string) {
  return detailRoute(get(`/api/movements/${id}`), {
    params: Promise.resolve({ id }),
  });
}

beforeEach(() => {
  mocks.getCurrentUser.mockReset().mockResolvedValue(OWNER);
  seed();
});

describe("GET /api/movements", () => {
  it("answers 401 with the shared error shape when there is no session", async () => {
    mocks.getCurrentUser.mockResolvedValue(null);

    const response = await listRoute(get("/api/movements"));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: { code: "UNAUTHORIZED", message: expect.any(String) },
    });
  });

  it("lists only the signed-in user's movements, serialized for JSON", async () => {
    const response = await listRoute(get("/api/movements"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.total).toBe(2);
    expect(body.nextCursor).toBeNull();
    expect(
      body.data.map((m: { counterparty: string }) => m.counterparty),
    ).toEqual(["Adobe", "Ronaldo"]);
    expect(body.data[0]).toMatchObject({
      amount: "125.00",
      occurredAt: ownAdobe.occurredAt.toISOString(),
    });
  });

  it("filters by search text and type slug", async () => {
    const byQuery = await (
      await listRoute(get("/api/movements?q=ronal"))
    ).json();
    const byType = await (
      await listRoute(get("/api/movements?type=debito"))
    ).json();

    expect(byQuery.data.map((m: { id: string }) => m.id)).toEqual([
      ownRonaldo.id,
    ]);
    expect(byType.data.map((m: { id: string }) => m.id)).toEqual([ownAdobe.id]);
  });

  it("paginates with an opaque cursor", async () => {
    seed(
      Array.from({ length: 25 }, () => ({
        ...makeMovement({ counterparty: "Spotify" }),
        userId: OWNER_ID,
      })),
    );

    const first = await (await listRoute(get("/api/movements"))).json();
    const second = await (
      await listRoute(get(`/api/movements?cursor=${first.nextCursor}`))
    ).json();

    expect(first.data).toHaveLength(20);
    expect(first.total).toBe(27);
    expect(decodeMovementCursor(first.nextCursor)).not.toBeNull();
    expect(second.data).toHaveLength(7);
    expect(second.nextCursor).toBeNull();
    const ids = [...first.data, ...second.data].map(
      (m: { id: string }) => m.id,
    );
    expect(new Set(ids).size).toBe(27);
  });

  it("answers 400 with field errors for invalid params", async () => {
    const response = await listRoute(
      get(`/api/movements?type=SENT&cursor=nope&q=${"x".repeat(51)}`),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe("INVALID_INPUT");
    expect(Object.keys(body.error.details.fieldErrors).sort()).toEqual([
      "cursor",
      "q",
      "type",
    ]);
  });

  it("answers 503 without leaking details when the database fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.repository.current = {
      findMany: vi.fn().mockRejectedValue(new Error("ECONNREFUSED")),
      count: vi.fn().mockRejectedValue(new Error("ECONNREFUSED")),
      findById: vi.fn(),
    };

    const response = await listRoute(get("/api/movements"));

    expect(response.status).toBe(503);
    expect(JSON.stringify(await response.json())).not.toContain("ECONNREFUSED");
  });
});

describe("GET /api/movements/[id]", () => {
  it("returns the user's own movement", async () => {
    const response = await detail(ownRonaldo.id);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      data: { ...ownRonaldo, occurredAt: ownRonaldo.occurredAt.toISOString() },
    });
  });

  it("answers 404 (never 403) for another user's movement, so ids are not confirmed", async () => {
    const response = await detail(foreign.id);

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: { code: "NOT_FOUND", message: expect.any(String) },
    });
  });

  it("answers 404 for malformed and unknown ids", async () => {
    expect((await detail("not-an-id")).status).toBe(404);
    expect((await detail("cmuvt8zut00035dm61qeqiekh")).status).toBe(404);
  });

  it("answers 401 without a session", async () => {
    mocks.getCurrentUser.mockResolvedValue(null);

    expect((await detail(ownRonaldo.id)).status).toBe(401);
  });
});
