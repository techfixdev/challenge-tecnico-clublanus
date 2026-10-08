// @vitest-environment node
import { describe, expect, it, vi } from "vitest";

import type { Movement } from "./movement";
import { decodeMovementCursor } from "./movement-cursor";
import {
  getLatestMovements,
  getMovement,
  listMovements,
  type MovementRepository,
} from "./movement-queries";

const USER_ID = "user_1";
const VALID_ID = "cmuvt8zut00035dm61qeqiekh";

function makeMovement(index: number): Movement {
  return {
    id: `cmov${String(index).padStart(21, "0")}`,
    counterparty: `Persona ${index}`,
    description: "Pago recibido",
    type: "RECEIVED",
    status: "COMPLETED",
    amount: "95.00",
    currency: "USD",
    reference: `GB-${String(index).padStart(6, "0")}`,
    occurredAt: new Date(Date.UTC(2026, 9, 30 - index, 12)),
    card: { brand: "MASTERCARD", last4: "1234" },
  };
}

function makeRepository(rows: Movement[], total = rows.length) {
  return {
    findMany: vi.fn<MovementRepository["findMany"]>(async (query) =>
      rows.slice(0, query.take),
    ),
    count: vi.fn<MovementRepository["count"]>(async () => total),
    findById: vi.fn<MovementRepository["findById"]>(
      async () => rows[0] ?? null,
    ),
  } satisfies MovementRepository;
}

describe("listMovements", () => {
  it("scopes the query by user and passes the filters through", async () => {
    const repository = makeRepository([makeMovement(1)]);
    const filters = { query: "adobe", type: "SUBSCRIPTION" as const };

    await listMovements(repository, USER_ID, { filters });

    expect(repository.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ userId: USER_ID, filters }),
    );
    expect(repository.count).toHaveBeenCalledWith({ userId: USER_ID, filters });
  });

  it("asks for one extra row to know whether there is a next page", async () => {
    const rows = Array.from({ length: 21 }, (_, index) => makeMovement(index));
    const repository = makeRepository(rows, 26);

    const page = await listMovements(repository, USER_ID, { pageSize: 20 });

    expect(repository.findMany.mock.calls[0][0].take).toBe(21);
    expect(page.items).toHaveLength(20);
    expect(page.total).toBe(26);
    // The cursor points at the last item actually returned.
    expect(decodeMovementCursor(page.nextCursor ?? "")).toEqual({
      occurredAt: rows[19].occurredAt,
      id: rows[19].id,
    });
  });

  it("returns no cursor on the last page", async () => {
    const repository = makeRepository([makeMovement(1), makeMovement(2)]);

    const page = await listMovements(repository, USER_ID, { pageSize: 20 });

    expect(page.items).toHaveLength(2);
    expect(page.nextCursor).toBeNull();
  });

  it("continues after the given cursor", async () => {
    const repository = makeRepository([makeMovement(3)]);
    const cursor = { occurredAt: new Date("2026-10-01T00:00:00Z"), id: "x" };

    await listMovements(repository, USER_ID, { cursor });

    expect(repository.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ after: cursor }),
    );
  });

  it("defaults to no filters and pages of 20", async () => {
    const repository = makeRepository([]);

    const page = await listMovements(repository, USER_ID);

    expect(repository.findMany).toHaveBeenCalledWith({
      userId: USER_ID,
      filters: {},
      after: undefined,
      take: 21,
    });
    expect(page).toEqual({ items: [], total: 0, nextCursor: null });
  });
});

describe("getLatestMovements", () => {
  it("returns the newest five movements of the user", async () => {
    const rows = Array.from({ length: 8 }, (_, index) => makeMovement(index));
    const repository = makeRepository(rows);

    const latest = await getLatestMovements(repository, USER_ID);

    expect(repository.findMany).toHaveBeenCalledWith({
      userId: USER_ID,
      filters: {},
      take: 5,
    });
    expect(latest).toHaveLength(5);
  });
});

describe("getMovement", () => {
  it("looks the movement up scoped to the owner", async () => {
    const repository = makeRepository([makeMovement(1)]);

    const movement = await getMovement(repository, USER_ID, VALID_ID);

    expect(repository.findById).toHaveBeenCalledWith(USER_ID, VALID_ID);
    expect(movement?.reference).toBe("GB-000001");
  });

  it("returns null when it does not exist or belongs to someone else", async () => {
    const repository = makeRepository([]);

    await expect(
      getMovement(repository, USER_ID, VALID_ID),
    ).resolves.toBeNull();
  });

  it("returns null for malformed ids without touching the database", async () => {
    const repository = makeRepository([makeMovement(1)]);

    await expect(
      getMovement(repository, USER_ID, "1 OR 1=1"),
    ).resolves.toBeNull();
    await expect(getMovement(repository, USER_ID, "")).resolves.toBeNull();
    expect(repository.findById).not.toHaveBeenCalled();
  });
});
