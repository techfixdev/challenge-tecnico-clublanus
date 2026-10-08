import "server-only";

import { prismaTransferRepository } from "../data/prisma-transfer-repository";
import { sendTransfer, type TransferResult } from "../domain/transfer";
import { revalidateAfterTransfer } from "./revalidate";

/**
 * Server entry point shared by `POST /api/transfers` and the send Server Action: run the
 * use case and, only when money actually moved, invalidate what shows balances.
 * The caller resolves the session (`getCurrentUser` / `requireUser`) and passes its id.
 */
export async function sendTransferAs(
  senderId: string,
  input: unknown,
): Promise<TransferResult> {
  const result = await sendTransfer(prismaTransferRepository, senderId, input);
  if (result.ok && !result.replayed) revalidateAfterTransfer();
  return result;
}
