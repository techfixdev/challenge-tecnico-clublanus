import { describe, expect, it } from "vitest";

import {
  MOVEMENT_STATUS_LABEL,
  MOVEMENT_TYPE_LABEL,
  formatSignedAmount,
} from "./movement-display";

describe("formatSignedAmount", () => {
  it("adds a plus sign to money received", () => {
    expect(formatSignedAmount({ type: "RECEIVED", amount: "95.00" })).toBe(
      "+$95",
    );
  });

  it("adds a minus sign (U+2212) to money that leaves the account", () => {
    expect(formatSignedAmount({ type: "SENT", amount: "35.50" })).toBe(
      "−$35.50",
    );
    expect(formatSignedAmount({ type: "SUBSCRIPTION", amount: "125.00" })).toBe(
      "−$125",
    );
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
