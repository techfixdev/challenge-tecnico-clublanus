import { randomUUID } from "node:crypto";

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import {
  TRANSFER_FAILURE_MESSAGE,
  type TransferReceipt,
} from "../domain/transfer";
import type {
  ConfirmedRecipient,
  LookupRecipientAction,
  SendTransferAction,
  SendTransferState,
} from "../domain/transfer-form";
import { TRANSFER_MESSAGES } from "../domain/transfer-schema";
import type { SourceCard } from "./AmountStep";
import { TransferFlow } from "./TransferFlow";

const HINCHA: ConfirmedRecipient = {
  fullName: "Hincha Granate",
  alias: "hincha.granate",
  cvuMasked: "•••• •••• •••• •••• ••02 55",
  query: "hincha.granate",
};

const CARDS: SourceCard[] = [
  {
    id: "card_mc",
    brand: "MASTERCARD",
    last4: "1234",
    balance: "978.85",
    currency: "USD",
  },
  {
    id: "card_visa",
    brand: "VISA",
    last4: "5678",
    balance: "312.40",
    currency: "USD",
  },
];

const RECEIPT: TransferReceipt = {
  id: "ctransfer1",
  amount: "12.30",
  currency: "USD",
  description: "Entradas",
  createdAt: new Date("2026-10-06T15:00:00.000Z"),
  recipient: { fullName: "Hincha Granate", alias: "hincha.granate" },
  sourceCard: {
    id: "card_mc",
    brand: "MASTERCARD",
    last4: "1234",
    balance: "966.55",
  },
  movementId: "cmovement1",
  reference: "TRF-CTRANSFER1-E",
};

function renderFlow({
  lookup = vi.fn<LookupRecipientAction>(async () => ({
    ok: true,
    recipient: HINCHA,
  })),
  send = vi.fn<SendTransferAction>(async () => ({
    status: "success",
    receipt: RECEIPT,
    nextIdempotencyKey: randomUUID(),
  })),
  recent = [] as ConfirmedRecipient[],
  key = randomUUID(),
} = {}) {
  const user = userEvent.setup();
  render(
    <TransferFlow
      cards={CARDS}
      recentRecipients={recent}
      idempotencyKey={key}
      lookupAction={lookup}
      sendAction={send}
    />,
  );
  return { user, lookup, send, key };
}

async function toAmountStep(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText("Alias o CVU"), "hincha.granate");
  await user.click(screen.getByRole("button", { name: "Continuar" }));
  await screen.findByRole("heading", { name: "¿Cuánto le enviás?" });
}

async function toReviewStep(user: ReturnType<typeof userEvent.setup>) {
  await toAmountStep(user);
  await user.type(screen.getByLabelText("Monto en USD"), "12,30");
  await user.type(screen.getByLabelText(/Motivo/), "Entradas");
  await user.click(screen.getByRole("button", { name: "Continuar" }));
  await screen.findByRole("heading", { name: "Revisá la transferencia" });
}

describe("TransferFlow", () => {
  it("validates the alias or CVU live, with the server's messages", async () => {
    const { user, lookup } = renderFlow();
    const field = screen.getByLabelText("Alias o CVU");

    await user.type(field, "corto");
    await user.tab();

    expect(field).toHaveAttribute("aria-invalid", "true");
    expect(
      screen.getByText(TRANSFER_MESSAGES.aliasInvalid),
    ).toBeInTheDocument();
    // From then on it updates while typing.
    await user.type(field, "12");
    expect(field).toHaveAttribute("aria-invalid", "false");
    await user.type(field, "!");
    expect(
      screen.getByText(TRANSFER_MESSAGES.aliasInvalid),
    ).toBeInTheDocument();

    await user.clear(field);
    await user.type(field, "000000");
    expect(screen.getByText(TRANSFER_MESSAGES.cvuLength)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    expect(lookup).not.toHaveBeenCalled();
  });

  it("shows why the server could not resolve the recipient", async () => {
    const { user } = renderFlow({
      lookup: vi.fn(async () => ({
        ok: false,
        message: TRANSFER_FAILURE_MESSAGE.recipient_not_found,
      })),
    });

    await user.type(screen.getByLabelText("Alias o CVU"), "nadie.granate");
    await user.click(screen.getByRole("button", { name: "Continuar" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      TRANSFER_FAILURE_MESSAGE.recipient_not_found,
    );
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "¿A quién le enviás?",
    );
  });

  it("resolves a recent recipient in one tap and moves the focus to the next step", async () => {
    const { user, lookup } = renderFlow({ recent: [HINCHA] });

    await user.click(screen.getByRole("button", { name: /Hincha Granate/ }));

    expect(lookup).toHaveBeenCalledWith("hincha.granate");
    const heading = await screen.findByRole("heading", {
      name: "¿Cuánto le enviás?",
    });
    await waitFor(() => expect(heading).toHaveFocus());
    expect(screen.getByText("hincha.granate")).toBeInTheDocument();
  });

  it("checks the amount against the chosen card and keeps every value when going back", async () => {
    const { user } = renderFlow();
    await toAmountStep(user);
    const amount = screen.getByLabelText("Monto en USD");
    const proceed = screen.getByRole("button", { name: "Continuar" });

    expect(proceed).toBeDisabled();
    expect(screen.getByRole("radio", { name: /Mastercard/ })).toBeChecked();

    await user.type(amount, "500");
    expect(proceed).toBeEnabled();
    await user.click(screen.getByRole("radio", { name: /Visa/ }));
    expect(
      screen.getByText(TRANSFER_FAILURE_MESSAGE.insufficient_funds),
    ).toBeInTheDocument();
    expect(proceed).toBeDisabled();

    await user.click(screen.getByRole("radio", { name: /Mastercard/ }));
    await user.type(screen.getByLabelText(/Motivo/), "Entradas");
    expect(screen.getByText("8/60")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Volver" }));
    expect(screen.getByLabelText("Alias o CVU")).toHaveValue("hincha.granate");
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    await screen.findByRole("heading", { name: "¿Cuánto le enviás?" });

    expect(screen.getByLabelText("Monto en USD")).toHaveValue("500");
    expect(screen.getByLabelText(/Motivo/)).toHaveValue("Entradas");
  });

  it("flags an amount above the balance while typing, but a half-typed one only on blur", async () => {
    const { user } = renderFlow();
    await toAmountStep(user);
    const amount = screen.getByLabelText("Monto en USD");

    await user.type(amount, "5000");
    expect(amount).toHaveAttribute("aria-invalid", "true");
    expect(
      screen.getByText(TRANSFER_FAILURE_MESSAGE.insufficient_funds),
    ).toBeInTheDocument();

    await user.clear(amount);
    await user.type(amount, "1,");
    expect(amount).toHaveAttribute("aria-invalid", "false");
  });

  it("accepts a decimal comma and submits the normalized transfer with the server's key", async () => {
    const { user, send, key } = renderFlow();
    await toReviewStep(user);

    expect(screen.getByText("$12.30")).toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: "Confirmar y enviar" }),
    );

    await screen.findByRole("heading", { name: "¡Transferencia enviada!" });
    const formData = send.mock.calls[0][1];
    expect(Object.fromEntries(formData)).toEqual({
      recipient: "hincha.granate",
      amount: "12.30",
      cardId: "card_mc",
      description: "Entradas",
      idempotencyKey: key,
    });
    expect(
      screen.getByRole("link", { name: "Ver comprobante" }),
    ).toHaveAttribute("href", "/movimientos/cmovement1");
    expect(
      screen.getByRole("link", { name: "Volver al inicio" }),
    ).toHaveAttribute("href", "/");
    expect(screen.getByText("TRF-CTRANSFER1-E")).toBeInTheDocument();
  });

  it("disables the button while sending, so a double tap sends once", async () => {
    let finish: (state: SendTransferState) => void = () => {};
    const send = vi.fn<SendTransferAction>(
      () => new Promise((resolve) => (finish = resolve)),
    );
    const { user } = renderFlow({ send });
    await toReviewStep(user);

    await user.click(
      screen.getByRole("button", { name: "Confirmar y enviar" }),
    );
    const sending = await screen.findByRole("button", { name: "Enviando…" });
    expect(sending).toBeDisabled();
    await user.click(sending);
    expect(send).toHaveBeenCalledTimes(1);

    finish({
      status: "success",
      receipt: RECEIPT,
      nextIdempotencyKey: randomUUID(),
    });
    await screen.findByRole("heading", { name: "¡Transferencia enviada!" });
  });

  it("sends the user to the step that can fix a refused transfer, keeping the key", async () => {
    const send = vi.fn<SendTransferAction>(async () => ({
      status: "error",
      message: TRANSFER_FAILURE_MESSAGE.insufficient_funds,
      step: "amount",
    }));
    const { user, key } = renderFlow({ send });
    await toReviewStep(user);

    await user.click(
      screen.getByRole("button", { name: "Confirmar y enviar" }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      TRANSFER_FAILURE_MESSAGE.insufficient_funds,
    );
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "¿Cuánto le enviás?",
    );
    await user.clear(screen.getByLabelText("Monto en USD"));
    await user.type(screen.getByLabelText("Monto en USD"), "1");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    await user.click(
      screen.getByRole("button", { name: "Confirmar y enviar" }),
    );
    await waitFor(() => expect(send).toHaveBeenCalledTimes(2));
    expect(send.mock.calls[1][1].get("idempotencyKey")).toBe(key);
  });

  it("retries with the fresh key the server hands out after a key conflict", async () => {
    const fresh = randomUUID();
    const send = vi.fn<SendTransferAction>(async () => ({
      status: "error",
      message: TRANSFER_FAILURE_MESSAGE.idempotency_conflict,
      step: "review",
      nextIdempotencyKey: fresh,
    }));
    const { user } = renderFlow({ send });
    await toReviewStep(user);

    await user.click(
      screen.getByRole("button", { name: "Confirmar y enviar" }),
    );
    await screen.findByRole("alert");
    await user.click(
      screen.getByRole("button", { name: "Confirmar y enviar" }),
    );

    await waitFor(() => expect(send).toHaveBeenCalledTimes(2));
    expect(send.mock.calls[1][1].get("idempotencyKey")).toBe(fresh);
  });
});
