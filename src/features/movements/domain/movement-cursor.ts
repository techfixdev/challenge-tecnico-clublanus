import { z } from "zod";

/**
 * Keyset (cursor) pagination position: the last row's `occurredAt` plus its `id` as a
 * tie-breaker. Encoded as opaque base64url JSON so clients treat it as a token and the
 * server never has to look another row up to resume (no cross-user cursor lookups).
 */
export type MovementCursor = { occurredAt: Date; id: string };

const cursorPayloadSchema = z.object({
  t: z.iso.datetime(),
  id: z.string().min(1).max(64),
});

export function encodeMovementCursor(position: MovementCursor): string {
  const payload = { t: position.occurredAt.toISOString(), id: position.id };
  return Buffer.from(JSON.stringify(payload)).toString("base64url");
}

/** Returns `null` for anything that is not a cursor we issued. */
export function decodeMovementCursor(raw: string): MovementCursor | null {
  try {
    const json: unknown = JSON.parse(
      Buffer.from(raw, "base64url").toString("utf8"),
    );
    const parsed = cursorPayloadSchema.safeParse(json);
    return parsed.success
      ? { occurredAt: new Date(parsed.data.t), id: parsed.data.id }
      : null;
  } catch {
    return null;
  }
}
