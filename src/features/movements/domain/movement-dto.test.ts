import { describe, expect, it } from "vitest";

import type { Movement } from "./movement";
import { parseMovementDto, toMovementDto } from "./movement-dto";

const MOVEMENT: Movement = {
  id: "cmuvt8zut00035dm61qeqiekh",
  counterparty: "Adobe",
  description: "Pago de suscripción",
  type: "SUBSCRIPTION",
  status: "COMPLETED",
  amount: "125.00",
  currency: "USD",
  reference: "GB-000001",
  occurredAt: new Date("2026-10-05T12:00:00.000Z"),
  card: { brand: "MASTERCARD", last4: "1234" },
};

describe("movement DTO", () => {
  it("serializes the date as ISO 8601 and keeps the amount as a string", () => {
    expect(toMovementDto(MOVEMENT)).toEqual({
      ...MOVEMENT,
      occurredAt: "2026-10-05T12:00:00.000Z",
    });
  });

  it("round-trips through JSON back into a Movement", () => {
    const json: unknown = JSON.parse(JSON.stringify(toMovementDto(MOVEMENT)));

    expect(parseMovementDto(json)).toEqual(MOVEMENT);
  });

  it("rejects payloads that do not match the contract", () => {
    expect(() => parseMovementDto({ ...MOVEMENT, amount: 125 })).toThrow();
    expect(() =>
      parseMovementDto({ ...toMovementDto(MOVEMENT), type: "REFUND" }),
    ).toThrow();
  });
});
