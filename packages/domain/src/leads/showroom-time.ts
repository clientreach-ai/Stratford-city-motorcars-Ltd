/**
 * Dates and times as the showroom in London sees them.
 *
 * Customers pick a calendar date and a time band in London time, whatever the
 * server's or browser's own zone is. UTC is not a stand-in: from 00:00 to 01:00
 * London time in summer, UTC is still on yesterday's date.
 *
 * Kept free of any Zod or Node import so the enquiry form in the browser can
 * share it with the server's validation.
 */

export const SHOWROOM_TIME_ZONE = "Europe/London";

const wallClock = new Intl.DateTimeFormat("en-CA", {
  timeZone: SHOWROOM_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

/** London's wall-clock reading of an instant, as numbers. */
function londonParts(instant: number) {
  const parts: Record<string, number> = {};
  for (const part of wallClock.formatToParts(instant)) {
    if (part.type !== "literal") parts[part.type] = Number(part.value);
  }
  return parts as Record<"year" | "month" | "day" | "hour" | "minute" | "second", number>;
}

/** Today's date in London, as "YYYY-MM-DD". */
export function londonToday(now: number | Date = Date.now()): string {
  const { year, month, day } = londonParts(Number(now));
  return [String(year).padStart(4, "0"), String(month).padStart(2, "0"), String(day).padStart(2, "0")].join("-");
}

/** A "YYYY-MM-DD" date moved by whole days. Calendar arithmetic, so clock changes don't matter. */
export function addDays(date: string, days: number): string {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year!, month! - 1, day! + days)).toISOString().slice(0, 10);
}

/** How far ahead of UTC London is at an instant, in milliseconds: an hour in summer, none in winter. */
function londonOffset(instant: number): number {
  const { year, month, day, hour, minute, second } = londonParts(instant);
  const wall = Date.UTC(year, month - 1, day, hour, minute, second);
  return wall - Math.floor(instant / 1000) * 1000;
}

/**
 * A "YYYY-MM-DD" date and "HH:MM" London time as a real instant, or null when
 * either is malformed.
 *
 * Around a clock change the offset either side of the requested time is tried.
 * In the October repeated hour both fit and the earlier (still summer time) is
 * taken; in the March hour that never happens (01:00–02:00) neither fits, and
 * the time is read with the winter offset, landing an hour later on the clock —
 * the same choice Temporal and most calendars make.
 */
export function londonDateTime(date: string, time: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) return null;
  const wall = Date.parse(`${date}T${time}:00Z`);
  if (Number.isNaN(wall)) return null;

  const DAY = 86_400_000;
  const before = londonOffset(wall - DAY);
  const after = londonOffset(wall + DAY);
  const fits = [before, after].map((offset) => wall - offset).filter((instant) => wall - londonOffset(instant) === instant);
  return new Date(fits.length ? Math.min(...fits) : wall - before);
}
