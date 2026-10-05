import { z } from "zod";

import { ROUTES } from "@/shared/lib/routes";

import type { MovementType } from "./movement";
import { decodeMovementCursor, type MovementCursor } from "./movement-cursor";

/**
 * Search and quick filters live in the URL (`/movimientos?q=adobe&type=recibido`), so a
 * filtered list is shareable, survives a reload and works with the back button.
 * The URL uses readable Spanish slugs; the domain uses the enum values.
 */

const MOVEMENT_TYPE_SLUGS = {
  debito: "SUBSCRIPTION",
  recibido: "RECEIVED",
  enviado: "SENT",
} as const satisfies Record<string, MovementType>;

type MovementTypeSlug = keyof typeof MOVEMENT_TYPE_SLUGS;

const SLUG_BY_TYPE: Record<MovementType, MovementTypeSlug> = {
  SUBSCRIPTION: "debito",
  RECEIVED: "recibido",
  SENT: "enviado",
};

export const SEARCH_MAX_LENGTH = 50;

export type MovementFilters = { query?: string; type?: MovementType };

const FILTER_MESSAGES = {
  queryTooLong: `La búsqueda admite hasta ${SEARCH_MAX_LENGTH} caracteres`,
  invalidType: "El tipo debe ser debito, recibido o enviado",
  invalidCursor: "El cursor de paginación no es válido",
} as const;

const querySchema = z
  .string()
  .trim()
  .max(SEARCH_MAX_LENGTH, FILTER_MESSAGES.queryTooLong)
  .transform((query) => query || undefined);

const typeSchema = z
  .enum(Object.keys(MOVEMENT_TYPE_SLUGS) as [MovementTypeSlug], {
    error: FILTER_MESSAGES.invalidType,
  })
  .transform((slug) => MOVEMENT_TYPE_SLUGS[slug]);

const cursorSchema = z.string().transform((raw, context) => {
  const cursor = decodeMovementCursor(raw);
  if (!cursor) {
    context.addIssue({
      code: "custom",
      message: FILTER_MESSAGES.invalidCursor,
    });
    return z.NEVER;
  }
  return cursor;
});

type RawSearchParams = Record<string, string | string[] | undefined>;

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function withoutUndefined(filters: MovementFilters): MovementFilters {
  return Object.fromEntries(
    Object.entries(filters).filter(([, value]) => value !== undefined),
  );
}

/**
 * Page variant (lenient): each param is validated on its own and an invalid one is simply
 * ignored, so a hand-edited or stale URL still shows a sensible list instead of an error.
 */
export function parseMovementFilters(
  searchParams: RawSearchParams,
): MovementFilters {
  const query = querySchema.safeParse(firstValue(searchParams.q) ?? "");
  const type = typeSchema.safeParse(firstValue(searchParams.type));
  return withoutUndefined({
    query: query.success ? query.data : undefined,
    type: type.success ? type.data : undefined,
  });
}

const listParamsSchema = z.object({
  q: querySchema.optional(),
  type: typeSchema.optional(),
  cursor: cursorSchema.optional(),
});

export type MovementListParams = {
  filters: MovementFilters;
  cursor: MovementCursor | undefined;
};

export type MovementListParamsResult =
  | { success: true; data: MovementListParams }
  | { success: false; fieldErrors: Record<string, string[]> };

/** REST variant (strict): invalid params are a client error the caller must hear about. */
export function parseMovementListParams(
  searchParams: URLSearchParams,
): MovementListParamsResult {
  const parsed = listParamsSchema.safeParse({
    q: searchParams.get("q") ?? undefined,
    type: searchParams.get("type") ?? undefined,
    cursor: searchParams.get("cursor") ?? undefined,
  });
  if (!parsed.success) {
    return {
      success: false,
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    };
  }
  const { q, type, cursor } = parsed.data;
  return {
    success: true,
    data: { filters: withoutUndefined({ query: q, type }), cursor },
  };
}

function typeToSlug(type: MovementType): MovementTypeSlug {
  return SLUG_BY_TYPE[type];
}

/** Query string for the given filters (`q`, `type` as a slug), without the leading "?". */
export function toMovementSearchParams(
  filters: MovementFilters,
): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.query) params.set("q", filters.query);
  if (filters.type) params.set("type", typeToSlug(filters.type));
  return params;
}

/** `/movimientos` with the filters applied, e.g. `/movimientos?q=adobe&type=debito`. */
export function buildMovementsHref(filters: MovementFilters): string {
  const search = toMovementSearchParams(filters).toString();
  return search ? `${ROUTES.movements}?${search}` : ROUTES.movements;
}

export function hasActiveFilters(filters: MovementFilters): boolean {
  return Boolean(filters.query || filters.type);
}

/** Query string for detail links opened from Home, so "Volver" goes back there. */
export const DETAIL_FROM_HOME = "from=home";

/**
 * Where "Volver" on a movement detail leads: Home, or the list with the filters the detail
 * was opened from. Built only from validated values, never from a raw URL (no open redirect).
 */
export function detailBackHref(searchParams: RawSearchParams): string {
  if (firstValue(searchParams.from) === "home") return ROUTES.home;
  return buildMovementsHref(parseMovementFilters(searchParams));
}
