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
