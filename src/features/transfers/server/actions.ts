"use server";

import { randomUUID } from "node:crypto";

import { getCurrentUser } from "@/features/auth/server/current-user";

import { prismaTransferRepository } from "../data/prisma-transfer-repository";
import { TRANSFER_FAILURE_MESSAGE, previewRecipient } from "../domain/transfer";
import {
  TRANSFER_FORM_MESSAGES,
  firstErrorMessage,
  stepForFailure,
  stepForInvalidInput,
  type RecipientLookup,
  type SendTransferState,
} from "../domain/transfer-form";
import { TRANSFER_MESSAGES } from "../domain/transfer-schema";
import { sendTransferAs } from "./send-transfer";

/*
 * Server Actions of the send flow. Like any Server Action they are public POST endpoints:
 * each one re-checks the session and validates its input with the shared schema. Next.js
 * protects them against CSRF (POST only, Origin compared with Host).
 */

/** Step 1: who would receive the money (name, alias, masked CVU). */
export async function lookupRecipient(query: string): Promise<RecipientLookup> {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, message: TRANSFER_FORM_MESSAGES.sessionExpired };
  }

  const text = typeof query === "string" ? query.trim() : null;
  try {
    const result = await previewRecipient(
      prismaTransferRepository,
      user.id,
      text,
    );
    if (result.ok) {
      return {
        ok: true,
        recipient: { ...result.recipient, query: text ?? "" },
      };
    }
    if (result.reason === "invalid_input") {
      return {
        ok: false,
        message:
          firstErrorMessage(result.details) ??
          TRANSFER_MESSAGES.recipientRequired,
      };
    }
    return { ok: false, message: TRANSFER_FAILURE_MESSAGE[result.reason] };
  } catch (error) {
    console.error("Recipient lookup failed unexpectedly", error);
    return { ok: false, message: TRANSFER_FORM_MESSAGES.lookupUnexpected };
  }
}

function textField(formData: FormData, name: string): string | undefined {
  const value = formData.get(name);
  return typeof value === "string" && value !== "" ? value : undefined;
}

/**
 * Step 3: send the money. The idempotency key comes from the form; it was generated on
 * the server when the flow rendered (a LAN `http://` page has no `crypto.randomUUID`), and
 * a retry of the same attempt reuses it, so a double submit or a retry after a lost
 * response moves the money once.
 */
export async function submitTransfer(
  _previousState: SendTransferState,
  formData: FormData,
): Promise<SendTransferState> {
  const user = await getCurrentUser();
  if (!user) {
    return {
      status: "error",
      message: TRANSFER_FORM_MESSAGES.sessionExpired,
      step: "review",
    };
  }

  let result: Awaited<ReturnType<typeof sendTransferAs>>;
  try {
    result = await sendTransferAs(user.id, {
      recipient: textField(formData, "recipient"),
      amount: textField(formData, "amount"),
      description: textField(formData, "description"),
      cardId: textField(formData, "cardId"),
      idempotencyKey: textField(formData, "idempotencyKey"),
    });
  } catch (error) {
    // Unknown outcome: keep the key, so retrying replays instead of paying twice.
    console.error("Transfer failed unexpectedly", error);
    return {
      status: "error",
      message: TRANSFER_FORM_MESSAGES.unexpected,
      step: "review",
    };
  }

  if (result.ok) {
    return {
      status: "success",
      receipt: result.receipt,
      nextIdempotencyKey: randomUUID(),
    };
  }
  if (result.reason === "invalid_input") {
    return {
      status: "error",
      message:
        firstErrorMessage(result.details) ?? TRANSFER_FORM_MESSAGES.unexpected,
      step: stepForInvalidInput(result.details),
    };
  }
  if (result.reason === "idempotency_conflict") {
    return {
      status: "error",
      message: TRANSFER_FAILURE_MESSAGE.idempotency_conflict,
      step: stepForFailure(result.reason),
      nextIdempotencyKey: randomUUID(),
    };
  }
  return {
    status: "error",
    message: TRANSFER_FAILURE_MESSAGE[result.reason],
    step: stepForFailure(result.reason),
  };
}
