import { z } from "zod";

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
  amount: z.string().regex(/^-?\d+\.\d{2}$/),
  currency: z.string().length(3),
  reference: z.string(),
  occurredAt: z.iso.datetime(),
  card: z.object({ brand: z.enum(CARD_BRANDS), last4: z.string() }).nullable(),
});

export type MovementDto = z.infer<typeof movementDtoSchema>;

export function toMovementDto(movement: Movement): MovementDto {
  return { ...movement, occurredAt: movement.occurredAt.toISOString() };
}

/** Validates untrusted JSON and turns it back into a `Movement`. Throws on mismatch. */
export function parseMovementDto(json: unknown): Movement {
  const dto = movementDtoSchema.parse(json);
  return { ...dto, occurredAt: new Date(dto.occurredAt) };
}
