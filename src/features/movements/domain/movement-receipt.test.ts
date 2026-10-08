import { describe, expect, it } from "vitest";

import { makeMovement } from "@/test/movement-fixtures";

import { movementShareText, repeatTransferAlias } from "./movement-receipt";

describe("movementShareText", () => {
  it("summarizes the receipt as plain text, in Buenos Aires time", () => {
    const text = movementShareText(
      makeMovement({
        counterparty: "Hincha Granate",
        description: "Transferencia enviada",
        type: "SENT",
        status: "COMPLETED",
        amount: "10.00",
        currency: "USD",
        reference: "ENV-186Y-CDM8",
        occurredAt: new Date("2026-10-06T21:40:00Z"),
      }),
    );

    // The amount keeps its symbol and number together with a no-break space.
    expect(text.replaceAll("\u00a0", " ")).toBe(
      [
        "Comprobante de GranaBank",
        "Hincha Granate · Transferencia enviada",
        "−US$ 10",
        "6 de octubre de 2026, 18:40 h",
        "Estado: Completado",
        "Referencia: ENV-186Y-CDM8",
      ].join("\n"),
    );
  });

  it("signs money that comes in with a plus", () => {
    const text = movementShareText(
      makeMovement({ type: "RECEIVED", amount: "95.00", currency: "USD" }),
    );
    expect(text.split("\n")[2]).toBe("+US$\u00a095");
  });

  it("never includes the card", () => {
    const text = movementShareText(
      makeMovement({ card: { brand: "VISA", last4: "5678" } }),
    );
    expect(text).not.toMatch(/5678|Visa/);
  });
});

describe("repeatTransferAlias", () => {
  it("is the recipient's alias for a transfer the user sent", () => {
    expect(
      repeatTransferAlias(
        makeMovement({ type: "SENT", recipientAlias: "hincha.granate" }),
      ),
    ).toBe("hincha.granate");
  });

  it("is null when the recipient is unknown (no transfer behind it, or no alias)", () => {
    expect(repeatTransferAlias(makeMovement({ type: "SENT" }))).toBeNull();
    expect(
      repeatTransferAlias(makeMovement({ type: "SENT", recipientAlias: null })),
    ).toBeNull();
  });

  it("is null for money received and for subscriptions", () => {
    expect(
      repeatTransferAlias(
        makeMovement({ type: "RECEIVED", recipientAlias: "hincha.granate" }),
      ),
    ).toBeNull();
    expect(
      repeatTransferAlias(
        makeMovement({ type: "SUBSCRIPTION", recipientAlias: "adobe.pagos" }),
      ),
    ).toBeNull();
  });
});
