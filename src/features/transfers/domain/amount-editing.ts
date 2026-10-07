/**
 * Live formatting of the amount field: every keystroke rewrites the text the Argentine
 * way ("12500,5" → "12.500,5") and says where the caret goes, so the dots appear while
 * typing without the caret jumping. Only the look changes: whatever comes out reads as
 * the same amount through `parseAmount` (the parser of the send form and the server's
 * schema), and text it would refuse (three decimals) stays for the field to flag.
 *
 * A dot the user types after the digits stays open ("12." , "12.4") until what follows
 * decides it, the way `parseAmount` does: up to 2 digits after it make it the decimal
 * point ("12.30"), 3 make it a thousands dot ("12.400", regrouped). Anywhere else it is
 * ignored. Every other dot in the result groups thousands, and a comma is the decimal one.
 */

export type EditedAmount = { value: string; caret: number };

/** Thousands grouping of a run of integer digits: "1234567" → "1.234.567". */
function groupThousands(digits: string): string {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

/** Where `previous` and `next` differ: the start of the change and what was inserted. */
function diff(previous: string, next: string) {
  let start = 0;
  const shortest = Math.min(previous.length, next.length);
  while (start < shortest && previous[start] === next[start]) start += 1;
  let end = 0;
  while (
    end < shortest - start &&
    previous[previous.length - 1 - end] === next[next.length - 1 - end]
  ) {
    end += 1;
  }
  return {
    start,
    inserted: next.slice(start, next.length - end),
    removed: previous.slice(start, previous.length - end),
  };
}

/** A dot with at most 2 digits after it, at the end and with no comma: "12.", "12.3". */
const OPEN_DOT_DECIMAL = /^[^,]*\.\d{0,2}$/;

/**
 * Whether the dot at `index` of a field `editAmount` wrote is still open (a candidate
 * decimal point). Grouping always leaves 3 digits after a dot, so only the last dot, with
 * at most 2 digits after it and no comma, can be open.
 */
function isOpenDot(field: string, index: number): boolean {
  return OPEN_DOT_DECIMAL.test(field) && index === field.lastIndexOf(".");
}

/**
 * The field's new text and caret, from its text before the edit (`previous`, as this
 * function wrote it) and the raw text and caret the browser reports after it.
 */
export function editAmount(
  previous: string,
  next: string,
  caret: number,
): EditedAmount {
  let text = next;
  let at = caret;

  // Backspace over a grouping dot deletes the digit before it, as in a banking app;
  // otherwise the dot would come straight back and the caret would not move. An open
  // dot is not a grouping one: deleting it just removes the dot ("12.|" → "12|").
  const change = diff(previous, text);
  const deletedGroupingDot =
    change.inserted === "" &&
    change.removed === "." &&
    change.start > 0 &&
    !isOpenDot(previous, change.start);
  if (deletedGroupingDot) {
    text = text.slice(0, change.start - 1) + text.slice(change.start);
    at = change.start - 1;
  }

  // Drop anything that is not a digit or a separator, moving the caret with it.
  let sanitized = "";
  let sanitizedCaret = 0;
  for (let index = 0; index < text.length; index += 1) {
    if (/[\d.,]/.test(text[index])) sanitized += text[index];
    if (index === at - 1) sanitizedCaret = sanitized.length;
  }
  if (at <= 0) sanitizedCaret = 0;

  const decimalIndex = findDecimalSeparator(previous, sanitized);
  const separator = decimalIndex === -1 ? "" : sanitized[decimalIndex];

  // Split into integer digits and decimals, counting the significant characters (digits
  // and the decimal separator) before the caret, which is what the caret is anchored to.
  let integer = "";
  let fraction = "";
  let significantBefore = 0;
  for (let index = 0; index < sanitized.length; index += 1) {
    const char = sanitized[index];
    const isDecimal = index === decimalIndex;
    if (!isDecimal && !/\d/.test(char)) continue;
    if (index < sanitizedCaret) significantBefore += 1;
    if (isDecimal) continue;
    if (decimalIndex === -1 || index < decimalIndex) integer += char;
    else fraction += char;
  }

  // No leading zeros ("05" → "5"), and a decimal never starts bare (",5" → "0,5").
  const stripped = integer.replace(/^0+(?=\d)/, "");
  significantBefore -= Math.min(
    integer.length - stripped.length,
    significantBefore,
  );
  integer = stripped;
  if (separator && integer === "") {
    integer = "0";
    if (significantBefore > 0) significantBefore += 1;
  }

  const grouped = groupThousands(integer);
  // A dot after a number that already has thousands dots can only be the decimal one:
  // it is written as the comma ("1.234." → "1.234,"), which reads the same.
  const decimal = separator === "." && grouped.includes(".") ? "," : separator;
  const value = decimal ? `${grouped}${decimal}${fraction}` : grouped;
  const decimalAt = decimal ? grouped.length : -1;

  // The caret goes right after the same number of significant characters.
  let newCaret = 0;
  let seen = 0;
  while (newCaret < value.length && seen < significantBefore) {
    if (newCaret === decimalAt || /\d/.test(value[newCaret])) seen += 1;
    newCaret += 1;
  }
  return { value, caret: newCaret };
}

/**
 * Index of the decimal separator in the sanitized text, or -1. The first comma is one.
 * Without a comma, the last dot is one when it has at most 2 digits after it and the
 * user put it there: this edit added text (a typed or pasted dot, or a digit after one)
 * or the field already had such a dot. Deleting a digit after a grouping dot ("1.234" →
 * "1.23") regroups the number instead ("123"): that dot was never typed as a decimal.
 * While open, the dot stays a dot, since "12.400" still turns it into a thousands dot,
 * exactly as `parseAmount` reads it.
 */
function findDecimalSeparator(previous: string, sanitized: string): number {
  const comma = sanitized.indexOf(",");
  if (comma !== -1) return comma;
  if (!OPEN_DOT_DECIMAL.test(sanitized)) return -1;
  const added = diff(previous, sanitized).inserted !== "";
  const hadOpenDot = OPEN_DOT_DECIMAL.test(previous);
  return added || hadOpenDot ? sanitized.lastIndexOf(".") : -1;
}
