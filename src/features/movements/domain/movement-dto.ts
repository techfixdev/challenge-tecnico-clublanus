// zod/mini: the same validation with a tree-shakable API, so the browser (which loads this
// module on demand, for "Cargar más") downloads a few KB instead of the full zod bundle.
import * as z from "zod/mini";

import { CARD_BRANDS } from "@/features/account/domain/card";

import { MOVEMENT_STATUSES, MOVEMENT_TYPES, type Movement } from "./movement";

/**
 * JSON contract of a movement in the REST API: dates as ISO 8601 strings and money as
 * decimal strings ("125.00"), so no precision is lost to floats on the way.
 * The same schema validates responses on the client ("Cargar más").
 */
export const movementDtoSchema = z.object({
  id: z.string(),
  counterparty: z.string(),
  description: z.string(),
  type: z.enum(MOVEMENT_TYPES),
  status: z.enum(MOVEMENT_STATUSES),
  amount: z.string().check(z.regex(/^-?\d+\.\d{2}$/)),
  currency: z.string().check(z.length(3)),
  reference: z.string(),
  occurredAt: z.iso.datetime(),
  card: z.nullable(z.object({ brand: z.enum(CARD_BRANDS), last4: z.string() })),
});

export type MovementDto = z.infer<typeof movementDtoSchema>;

/** One page of `GET /api/movements`. */
const movementPageSchema = z.object({
  data: z.array(movementDtoSchema),
  nextCursor: z.nullable(z.string()),
});

export function toMovementDto(movement: Movement): MovementDto {
  return { ...movement, occurredAt: movement.occurredAt.toISOString() };
}

function fromDto(dto: MovementDto): Movement {
  return { ...dto, occurredAt: new Date(dto.occurredAt) };
}

/** Validates untrusted JSON and turns it back into a `Movement`. Throws on mismatch. */
export function parseMovementDto(json: unknown): Movement {
  return fromDto(movementDtoSchema.parse(json));
}

/** Validates a page of the list API. Throws on mismatch (a contract drift). */
export function parseMovementPage(json: unknown): {
  movements: Movement[];
  nextCursor: string | null;
} {
  const page = movementPageSchema.parse(json);
  return { movements: page.data.map(fromDto), nextCursor: page.nextCursor };
}
