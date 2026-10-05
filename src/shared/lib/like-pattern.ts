/**
 * Helpers for SQL `LIKE` / `ILIKE` patterns. The search term is always sent as a bound
 * parameter (never concatenated into SQL), but inside a pattern `%` and `_` are still
 * wildcards: without escaping, searching "%" would match every row. The escape character
 * is the backslash, which the query declares explicitly with `ESCAPE '\'`.
 */

export const LIKE_ESCAPE_CHAR = "\\";

/** Escapes `\`, `%` and `_` so the term matches literally inside a LIKE pattern. */
export function escapeLikePattern(term: string): string {
  return term.replace(/[\\%_]/g, (char) => `${LIKE_ESCAPE_CHAR}${char}`);
}

/** `%term%` with the term escaped: a literal "contains" match. */
export function containsPattern(term: string): string {
  return `%${escapeLikePattern(term)}%`;
}
