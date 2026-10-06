import { describe, expect, it } from "vitest";

import {
  MOVEMENT_STATUS_LABEL,
  MOVEMENT_TYPE_LABEL,
  formatMovementCount,
  formatSignedAmount,
  formatSummaryAmount,
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

describe("formatMovementCount", () => {
  it("uses the singular only for exactly one movement", () => {
    expect(formatMovementCount(0)).toBe("0 movimientos");
    expect(formatMovementCount(1)).toBe("1 movimiento");
    expect(formatMovementCount(26)).toBe("26 movimientos");
  });
});

describe("formatSummaryAmount", () => {
  it("signs money in with + and money out with a minus sign", () => {
    expect(formatSummaryAmount("95.00", "in")).toBe("+$95");
    expect(formatSummaryAmount("1250.50", "out")).toBe("−$1,250.50");
  });

  it("shows a plain $0 when there is nothing to sign", () => {
    expect(formatSummaryAmount("0.00", "in")).toBe("$0");
    expect(formatSummaryAmount("0.00", "out")).toBe("$0");
  });
});
