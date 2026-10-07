/**
 * Date formatting for the UI.
 *
 * Decision: dates are always rendered in Argentina's time zone, not the runtime's. Servers
 * (e.g. Vercel) run in UTC, so a movement made at 23:00 in Buenos Aires would otherwise
 * show up on the next day.
 */

export const APP_TIME_ZONE = "America/Argentina/Buenos_Aires";
const LOCALE = "es-AR";

const longDateFormat = new Intl.DateTimeFormat(LOCALE, {
  timeZone: APP_TIME_ZONE,
  day: "numeric",
  month: "long",
  year: "numeric",
});

const timeFormat = new Intl.DateTimeFormat(LOCALE, {
  timeZone: APP_TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/** "12 de septiembre de 2026". */
export function formatLongDate(date: Date): string {
  return longDateFormat.format(date);
}

/** "09:05" (24h). */
export function formatTime(date: Date): string {
  return timeFormat.format(date);
}

/* ---------------------------------------------------------------------------------------
 * Calendar days in the app's time zone ("YYYY-MM-DD"), for lists grouped by day.
 * ------------------------------------------------------------------------------------ */

const dayFormat = new Intl.DateTimeFormat("en-CA", {
  timeZone: APP_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

// Labels are built from a day key, not an instant: noon UTC of that date, read in UTC.
const dayMonthFormat = new Intl.DateTimeFormat(LOCALE, {
  timeZone: "UTC",
  day: "numeric",
  month: "long",
});

const dayMonthYearFormat = new Intl.DateTimeFormat(LOCALE, {
  timeZone: "UTC",
  day: "numeric",
  month: "long",
  year: "numeric",
});

/** "2026-10-05": the calendar day of `date` in Buenos Aires. */
export function dayOf(date: Date): string {
  const parts = dayFormat.formatToParts(date);
  const part = (type: string) => parts.find((p) => p.type === type)?.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}

function parseDay(day: string): { year: number; month: number; day: number } {
  const [year, month, dayOfMonth] = day.split("-").map(Number);
  return { year, month, day: dayOfMonth };
}

function dayBefore(day: string): string {
  const { year, month, day: dayOfMonth } = parseDay(day);
  // Date.UTC rolls day 0 back into the last day of the previous month (and year).
  return new Date(Date.UTC(year, month - 1, dayOfMonth - 1))
    .toISOString()
    .slice(0, 10);
}

/**
 * Header of a day in a list: "Hoy", "Ayer", "5 de octubre", or "31 de diciembre de 2025"
 * when the day is not in `today`'s year. Both are day keys (`dayOf`), so the result does
 * not depend on the runtime's time zone or clock.
 */
export function formatDayLabel(day: string, today: string): string {
  if (day === today) return "Hoy";
  if (day === dayBefore(today)) return "Ayer";
  const { year, month, day: dayOfMonth } = parseDay(day);
  const noon = Date.UTC(year, month - 1, dayOfMonth, 12);
  return year === parseDay(today).year
    ? dayMonthFormat.format(noon)
    : dayMonthYearFormat.format(noon);
}

/* ---------------------------------------------------------------------------------------
 * Calendar months in the app's time zone ("YYYY-MM"). A month starts at local midnight
 * of its 1st in Buenos Aires, which is 03:00 UTC: a UTC month would move movements made
 * after 21:00 on the last day into the next month.
 * ------------------------------------------------------------------------------------ */

const yearMonthFormat = new Intl.DateTimeFormat("en-CA", {
  timeZone: APP_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
});

const offsetFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: APP_TIME_ZONE,
  timeZoneName: "longOffset",
});

const monthNameFormat = new Intl.DateTimeFormat(LOCALE, {
  timeZone: "UTC",
  month: "long",
});

/** "2026-10": the calendar month of `date` in Buenos Aires. */
export function monthOf(date: Date): string {
  const parts = yearMonthFormat.formatToParts(date);
  const part = (type: string) => parts.find((p) => p.type === type)?.value;
  return `${part("year")}-${part("month")}`;
}

/** Offset of the app's zone from UTC at `instant`, in ms ("GMT-03:00" → -10_800_000). */
function zoneOffsetMs(instant: number): number {
  const name =
    offsetFormat
      .formatToParts(instant)
      .find((part) => part.type === "timeZoneName")?.value ?? "GMT";
  const match = /GMT([+-])(\d{2}):(\d{2})/.exec(name);
  if (!match) return 0; // "GMT": the zone is at UTC
  const minutes = Number(match[2]) * 60 + Number(match[3]);
  return (match[1] === "-" ? -1 : 1) * minutes * 60_000;
}

/** Instant of local midnight on the 1st of `year`/`month` (1-12) in the app's zone. */
function startOfMonth(year: number, month: number): Date {
  const utcMidnight = Date.UTC(year, month - 1, 1);
  // Measure the offset at the guess, then again at the corrected instant, in case a
  // daylight-saving change sits between them (Argentina has none today; this stays right if it does).
  const firstGuess = utcMidnight - zoneOffsetMs(utcMidnight);
  return new Date(utcMidnight - zoneOffsetMs(firstGuess));
}

function parseMonth(month: string): { year: number; month: number } {
  const [year, monthNumber] = month.split("-").map(Number);
  return { year, month: monthNumber };
}

/** `[from, to)` instants of a "YYYY-MM" month in the app's zone (`to` is exclusive). */
export function monthRange(month: string): { from: Date; to: Date } {
  const { year, month: monthNumber } = parseMonth(month);
  return {
    from: startOfMonth(year, monthNumber),
    // Date.UTC rolls month 13 over into January of the next year.
    to: startOfMonth(year, monthNumber + 1),
  };
}

/** "Octubre" for "2026-10". */
export function formatMonthName(month: string): string {
  const { year, month: monthNumber } = parseMonth(month);
  const name = monthNameFormat.format(Date.UTC(year, monthNumber - 1, 15));
  return name.charAt(0).toUpperCase() + name.slice(1);
}
