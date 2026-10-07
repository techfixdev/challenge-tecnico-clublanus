/**
 * When a demo movement happened: `daysAgo` days before `now`, at `hour` local time, but
 * never after `now`. A movement seeded for later today would otherwise sit in the future,
 * above every movement made after seeding in the newest-first lists, until that hour came.
 */
export function seedDate(
  daysAgo: number,
  hour: number,
  now = new Date(),
): Date {
  const date = new Date(now);
  date.setDate(date.getDate() - daysAgo);
  date.setHours(hour, 0, 0, 0);
  return date.getTime() > now.getTime() ? new Date(now) : date;
}
