// The only place that converts between instants and calendar dates.
// A CalendarDate is a day ("YYYY-MM-DD") without time of day or time zone.
// Time zones are IANA names and are always passed in explicitly; see
// time-zone.ts for how the MVP chooses one.

export type CalendarDate = string;

const MIN_YEAR = 1000; // limits of the MySQL DATE type
const MAX_YEAR = 9999;
const PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

const formatters = new Map<string, Intl.DateTimeFormat>();

function formatterFor(timeZone: string): Intl.DateTimeFormat {
  let formatter = formatters.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    formatters.set(timeZone, formatter);
  }
  return formatter;
}

// The date shown on a wall clock in `timeZone` at the given instant.
export function calendarDateOf(instant: Date, timeZone: string): CalendarDate {
  const parts = formatterFor(timeZone).formatToParts(instant);
  const part = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export function todayFor(timeZone: string, now: Date = new Date()): CalendarDate {
  return calendarDateOf(now, timeZone);
}

// Strict: exactly YYYY-MM-DD, a real calendar day, within the DATE range.
export function parseCalendarDate(value: string): CalendarDate | null {
  const match = PATTERN.exec(value);
  if (!match) return null;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  if (year < MIN_YEAR || year > MAX_YEAR || month < 1 || month > 12 || day < 1) return null;
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  if (day > daysInMonth) return null;
  return value;
}

// German display format, e.g. "2026-10-05" -> "05.10.2026". Pure string
// rearrangement, so it cannot shift by a day.
export function formatCalendarDate(date: CalendarDate): string {
  const [year, month, day] = date.split("-");
  return `${day}.${month}.${year}`;
}
