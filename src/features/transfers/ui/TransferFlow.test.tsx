import { randomUUID } from "node:crypto";

import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
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
import type { TransferPrefill } from "../domain/transfer-prefill";
import { TRANSFER_MESSAGES } from "../domain/transfer-schema";
import type { SourceCard } from "./AmountStep";
import { TransferFlow } from "./TransferFlow";

const HINCHA: ConfirmedRecipient = {
  fullName: "Hincha Granate",
  alias: "hincha.granate",
  cvuMasked: "•• •••• •••• •••• •••• 0255",
  query: "hincha.granate",
};

const SOCIA: ConfirmedRecipient = {
  fullName: "Socia Granate",
  alias: "socia.granate",
  cvuMasked: "•• •••• •••• •••• •••• 0310",
  query: "socia.granate",
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
    balance: "312400.50",
    currency: "ARS",
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
  reference: "ENV-7Q4K-92XA",
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
  prefill = null as TransferPrefill | null,
} = {}) {
  const user = userEvent.setup();
  render(
    <TransferFlow
      cards={CARDS}
      recentRecipients={recent}
      idempotencyKey={key}
      lookupAction={lookup}
      sendAction={send}
      prefill={prefill}
    />,
  );
  return { user, lookup, send, key };
}

async function toAmountStep(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText("Alias o CVU"), "hincha.granate");
  await user.click(screen.getByRole("button", { name: "Continuar" }));
  await screen.findByRole("heading", { name: "¿Cuánto le enviás?" });
}

/** The amount step from the dollar card (the peso card is the default). */
async function toDollarAmountStep(user: ReturnType<typeof userEvent.setup>) {
  await toAmountStep(user);
  await user.click(screen.getByRole("radio", { name: /Mastercard/ }));
}

async function toReviewStep(user: ReturnType<typeof userEvent.setup>) {
  await toDollarAmountStep(user);
  await user.type(screen.getByLabelText("Monto en USD"), "12,30");
  await user.type(screen.getByLabelText(/Motivo/), "Entradas");
  await user.click(screen.getByRole("button", { name: "Continuar" }));
  await screen.findByRole("heading", { name: "Revisá la transferencia" });
}

describe("TransferFlow", () => {
  it("opens on the amount step for a recipient the server already confirmed (repeat)", async () => {
    const { user, lookup } = renderFlow({
      prefill: { kind: "confirmed", recipient: HINCHA },
    });

    expect(
      screen.getByRole("heading", { name: "¿Cuánto le enviás?" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Hincha Granate")).toBeInTheDocument();
    expect(lookup).not.toHaveBeenCalled();

    // Back a step keeps the alias typed, so the user can change it.
    await user.click(screen.getByRole("button", { name: "Volver" }));
    await screen.findByRole("heading", { name: "¿A quién le enviás?" });
    expect(screen.getByLabelText("Alias o CVU")).toHaveValue("hincha.granate");
  });

  it("only types an alias the server could not confirm, on the first step", () => {
    renderFlow({ prefill: { kind: "typed", text: "nadie.granate" } });

    expect(
      screen.getByRole("heading", { name: "¿A quién le enviás?" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Alias o CVU")).toHaveValue("nadie.granate");
  });

  it("sends pesos from the peso card, in the Argentine format", async () => {
    const { user, send } = renderFlow();
    await toAmountStep(user);
    // The peso card is preselected: no need to pick it.
    expect(screen.getByRole("radio", { name: /Visa/ })).toBeChecked();
    expect(screen.getByText("Disponible:").parentElement).toHaveTextContent(
      "$ 312.400,50",
    );
    await user.type(screen.getByLabelText("Monto en ARS"), "12.400,5");
    await user.tab();
    expect(screen.getByLabelText("Monto en ARS")).toHaveValue("12.400,50");
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    await screen.findByRole("heading", { name: "Revisá la transferencia" });

    expect(screen.getByText("$ 12.400,50")).toBeInTheDocument();
    expect(screen.getByText("12.400,50 pesos")).toHaveClass("sr-only");
    await user.click(
      screen.getByRole("button", { name: "Confirmar y enviar" }),
    );

    await screen.findByRole("heading", { name: "¡Transferencia enviada!" });
    expect(Object.fromEntries(send.mock.calls[0][1])).toMatchObject({
      amount: "12400.50",
      cardId: "card_visa",
    });
  });

  it("rearranges one surface between steps instead of mounting a new page", async () => {
    const { user } = renderFlow();
    const heading = screen.getByRole("heading", { level: 1 });
    // Server-rendered: nothing on the first step waits for hydration to show.
    expect(heading.closest("[style*='opacity: 0']")).toBeNull();
    const proceed = screen.getByRole("button", { name: "Continuar" });

    await toAmountStep(user);
    // The same header and the same pinned button, with new texts.
    expect(screen.getByRole("heading", { level: 1 })).toBe(heading);
    expect(screen.getByRole("button", { name: "Continuar" })).toBe(proceed);

    await user.click(screen.getByRole("radio", { name: /Mastercard/ }));
    await user.type(screen.getByLabelText("Monto en USD"), "1");
    await user.click(proceed);
    await screen.findByRole("heading", { name: "Revisá la transferencia" });
    expect(screen.getByRole("button", { name: "Confirmar y enviar" })).toBe(
      proceed,
    );
  });

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

    await user.click(screen.getByRole("option", { name: /Hincha Granate/ }));

    expect(lookup).toHaveBeenCalledWith("hincha.granate");
    const heading = await screen.findByRole("heading", {
      name: "¿Cuánto le enviás?",
    });
    await waitFor(() => expect(heading).toHaveFocus());
    expect(screen.getByText("hincha.granate")).toBeInTheDocument();
  });

  it("checks the amount against the chosen card and keeps every value when going back", async () => {
    const { user } = renderFlow();
    await toDollarAmountStep(user);
    const amount = screen.getByLabelText("Monto en USD");
    const proceed = screen.getByRole("button", { name: "Continuar" });

    expect(proceed).toBeDisabled();
    expect(screen.getByRole("radio", { name: /Mastercard/ })).toBeChecked();

    await user.type(amount, "500");
    expect(proceed).toBeEnabled();
    expect(screen.getByTestId("amount-currency")).toHaveTextContent("US$");

    // The peso card: the field switches to pesos and checks the peso balance.
    await user.click(screen.getByRole("radio", { name: /Visa/ }));
    const pesos = screen.getByLabelText("Monto en ARS");
    expect(pesos).toHaveValue("500");
    expect(screen.getByTestId("amount-currency")).toHaveTextContent(/^\$$/);
    expect(proceed).toBeEnabled();
    await user.type(pesos, "000");
    expect(
      screen.getByText(TRANSFER_FAILURE_MESSAGE.insufficient_funds),
    ).toBeInTheDocument();
    expect(proceed).toBeDisabled();
    await user.clear(pesos);
    await user.type(pesos, "500");

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
    await toDollarAmountStep(user);
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

  it("groups thousands while typing, without the phone's keyboard, keeping the caret", async () => {
    const { user } = renderFlow();
    await toAmountStep(user);
    const pesos = screen.getByLabelText("Monto en ARS");
    // The flow's keypad is the keyboard: the field asks the phone for none.
    expect(pesos).toHaveAttribute("inputmode", "none");

    await user.type(pesos, "12500");
    expect(pesos).toHaveValue("12.500");
    // A dot typed after the digits is the decimal comma.
    await user.type(pesos, ".5");
    expect(pesos).toHaveValue("12.500,5");

    // A digit typed mid-number lands next to the caret, dots regrouped around it.
    await user.clear(pesos);
    await user.type(pesos, "1234");
    expect(pesos).toHaveValue("1.234");
    await user.type(pesos, "9", {
      initialSelectionStart: 1,
      initialSelectionEnd: 1,
    });
    expect(pesos).toHaveValue("19.234");
    expect((pesos as HTMLInputElement).selectionStart).toBe(2);
  });

  it("writes a decimal comma amount the app's way once the field is left", async () => {
    const { user } = renderFlow();
    await toDollarAmountStep(user);
    const amount = screen.getByLabelText("Monto en USD");

    await user.type(amount, "12,3");
    expect(amount).toHaveValue("12,3");
    await user.tab();
    expect(amount).toHaveValue("12,30");

    await user.clear(amount);
    await user.type(amount, "1234.5");
    await user.tab();
    expect(amount).toHaveValue("1.234,50");

    await user.clear(amount);
    await user.type(amount, "40");
    await user.tab();
    expect(amount).toHaveValue("40");
  });

  it("accepts a decimal comma and submits the normalized transfer with the server's key", async () => {
    const { user, send, key } = renderFlow();
    await toReviewStep(user);

    expect(screen.getByText("US$ 12,30")).toBeInTheDocument();
    expect(screen.getByText("12,30 dólares")).toHaveClass("sr-only");
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
    expect(screen.getByText("ENV-7Q4K-92XA")).toBeInTheDocument();
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

  it("asks the server again for a recipient the transfer was refused for", async () => {
    const send = vi.fn<SendTransferAction>(async () => ({
      status: "error",
      message: TRANSFER_FAILURE_MESSAGE.recipient_not_found,
      step: "recipient",
    }));
    const lookup = vi
      .fn<LookupRecipientAction>()
      .mockResolvedValueOnce({ ok: true, recipient: HINCHA })
      .mockResolvedValueOnce({
        ok: false,
        message: TRANSFER_FAILURE_MESSAGE.recipient_not_found,
      });
    const { user } = renderFlow({ send, lookup });
    await toReviewStep(user);

    await user.click(
      screen.getByRole("button", { name: "Confirmar y enviar" }),
    );
    await screen.findByRole("heading", { name: "¿A quién le enviás?" });

    // Same text: the confirmed recipient is gone, so it is looked up again.
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    await waitFor(() => expect(lookup).toHaveBeenCalledTimes(2));
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "¿A quién le enviás?",
    );
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

  it("chooses a recent recipient from the carousel with the arrow keys", async () => {
    const { user, lookup } = renderFlow({ recent: [HINCHA, SOCIA] });
    const carousel = screen.getByRole("listbox", { name: "Recientes" });
    const field = screen.getByLabelText("Alias o CVU");

    // Nobody is chosen until the user says so.
    expect(field).toHaveValue("");
    expect(screen.getByRole("button", { name: "Continuar" })).toBeDisabled();

    carousel.focus();
    await user.keyboard("{ArrowRight}");
    expect(
      screen.getByRole("option", { name: /Socia Granate/ }),
    ).toHaveAttribute("aria-selected", "true");
    expect(carousel).toHaveAttribute(
      "aria-activedescendant",
      screen.getByRole("option", { name: /Socia Granate/ }).id,
    );
    expect(field).toHaveValue("socia.granate");

    await user.keyboard("{Home}");
    expect(field).toHaveValue("hincha.granate");
    await user.keyboard("{Enter}");
    expect(lookup).toHaveBeenCalledWith("hincha.granate");
    await screen.findByRole("heading", { name: "¿Cuánto le enviás?" });
  });

  it("selects the recent whose alias is typed in the field", async () => {
    const { user } = renderFlow({ recent: [HINCHA, SOCIA] });

    await user.type(screen.getByLabelText("Alias o CVU"), "socia.granate");

    expect(
      screen.getByRole("option", { name: /Socia Granate/ }),
    ).toHaveAttribute("aria-selected", "true");
    expect(
      screen.getByRole("option", { name: /Hincha Granate/ }),
    ).toHaveAttribute("aria-selected", "false");
  });

  it("types the amount on the flow's keypad, in the Argentine format", async () => {
    const { user } = renderFlow();
    await toAmountStep(user);
    const keypad = screen.getByRole("group", { name: "Teclado numérico" });
    const press = async (...names: string[]) => {
      for (const name of names) {
        await user.click(within(keypad).getByRole("button", { name }));
      }
    };

    await press("1", "2", "5", "0", "0", "Coma decimal", "5", "0", "7");
    expect(screen.getByLabelText("Monto en ARS")).toHaveValue("12.500,50");
    expect(screen.getByText("Monto: 12.500,50")).toHaveAttribute(
      "aria-live",
      "polite",
    );

    await press("Borrar", "Borrar", "Borrar");
    expect(screen.getByLabelText("Monto en ARS")).toHaveValue("12.500");

    // Holding delete clears it all.
    const remove = within(keypad).getByRole("button", { name: "Borrar" });
    fireEvent.pointerDown(remove);
    await waitFor(
      () => expect(screen.getByLabelText("Monto en ARS")).toHaveValue(""),
      { timeout: 1500 },
    );
    fireEvent.pointerUp(remove);
    fireEvent.click(remove);
    expect(screen.getByLabelText("Monto en ARS")).toHaveValue("");
  });

  it("takes the amount from a hardware keyboard anywhere on the step", async () => {
    const { user } = renderFlow();
    await toAmountStep(user);
    // The step's title has the focus when it opens.
    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: "¿Cuánto le enviás?" }),
      ).toHaveFocus(),
    );

    await user.keyboard("1500.5");
    expect(screen.getByLabelText("Monto en ARS")).toHaveValue("1.500,5");
    await user.keyboard("{Backspace}");
    expect(screen.getByLabelText("Monto en ARS")).toHaveValue("1.500,");
  });
});
