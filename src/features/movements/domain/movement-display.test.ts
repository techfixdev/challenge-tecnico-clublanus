import { describe, expect, it } from "vitest";

import {
  MOVEMENT_STATUS_LABEL,
  MOVEMENT_TYPE_LABEL,
  formatMovementCount,
  movementDirection,
} from "./movement-display";

describe("movementDirection", () => {
  it("brings received money in and sends the rest out", () => {
    expect(movementDirection("RECEIVED")).toBe("in");
    expect(movementDirection("SENT")).toBe("out");
    expect(movementDirection("SUBSCRIPTION")).toBe("out");
  });
});

describe("labels", () => {
  it("names every type and status in Spanish", () => {
    expect(MOVEMENT_TYPE_LABEL).toEqual({
      SUBSCRIPTION: "Débito automático",
      RECEIVED: "Recibido",
      SENT: "Enviado",
    });
    expect(MOVEMENT_STATUS_LABEL).toEqual({
      COMPLETED: "Completado",
      PENDING: "Pendiente",
    });
  });
});

describe("formatMovementCount", () => {
  it("uses the singular only for exactly one movement", () => {
    expect(formatMovementCount(0)).toBe("0 movimientos");
    expect(formatMovementCount(1)).toBe("1 movimiento");
    expect(formatMovementCount(26)).toBe("26 movimientos");
  });
});
