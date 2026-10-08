/**
 * When a demo movement happened: `daysAgo` days before `now`, at `hour` o'clock local time,
 * but never after `now`.
 *
 * The rule at the boundary: a seeded time at or before `now` is kept as is (exactly `now`,
 * or minutes into the current hour, still counts as already happened); only a later one
 * is moved back to `now`. A movement seeded for later today would otherwise sit in the
 * future, above every movement made after seeding in the newest-first lists, until that
 * hour came. Movements moved back to `now` in the same instant tie on `occurredAt`; the
 * lists break that tie by `id`.
 */
export function seedDate(
  daysAgo: number,
  hour: number,
  now = new Date(),
): Date {
  const date = new Date(now);
  date.setDate(date.getDate() - daysAgo);
  date.setHours(hour, 0, 0, 0);
  const isInTheFuture = date.getTime() > now.getTime();
  return isInTheFuture ? new Date(now) : date;
}
