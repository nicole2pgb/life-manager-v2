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

// English long form for headings, e.g. "2026-10-02" -> "Friday 2 October". Built
// from the date's UTC parts, so it cannot shift with the server's time zone.
export function formatLongCalendarDate(date: CalendarDate): string {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString("en-GB", {
    timeZone: "UTC",
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

// German long form of a week range, e.g. "28. September – 4. Oktober 2026". The
// year is written once when both dates share it, otherwise after each date.
// Built from the dates' UTC parts, so it cannot shift with the server's time zone.
export function formatWeekRange(start: CalendarDate, end: CalendarDate): string {
  const part = (date: CalendarDate) => {
    const [year, month, day] = date.split("-").map(Number);
    const monthName = new Date(Date.UTC(year, month - 1, day)).toLocaleDateString("de-DE", {
      timeZone: "UTC",
      month: "long",
    });
    return { year, text: `${day}. ${monthName}` };
  };
  const from = part(start);
  const to = part(end);
  return from.year === to.year
    ? `${from.text} – ${to.text} ${to.year}`
    : `${from.text} ${from.year} – ${to.text} ${to.year}`;
}

// Day arithmetic works on the parts of the calendar date through Date.UTC
// only, never through local time, so it cannot shift with the server's time
// zone or a daylight-saving change. Inputs must already be valid calendar dates.

function toUtcMs(date: CalendarDate): number {
  const [year, month, day] = date.split("-").map(Number);
  return Date.UTC(year, month - 1, day);
}

function fromUtcMs(ms: number): CalendarDate {
  const d = new Date(ms);
  const pad = (n: number, width: number) => String(n).padStart(width, "0");
  return `${pad(d.getUTCFullYear(), 4)}-${pad(d.getUTCMonth() + 1, 2)}-${pad(d.getUTCDate(), 2)}`;
}

// ISO weekday: Monday = 1 ... Sunday = 7 (the numbers stored in recurrence rules).
export function isoWeekday(date: CalendarDate): number {
  const day = new Date(toUtcMs(date)).getUTCDay(); // 0 = Sunday
  return day === 0 ? 7 : day;
}

export function addDays(date: CalendarDate, days: number): CalendarDate {
  return fromUtcMs(toUtcMs(date) + days * 86_400_000);
}

export type WeekStartDay = "Monday" | "Sunday";

// Application code passes the user's week start (user_settings.week_start);
// the Monday default only serves callers that do not depend on the setting.
export function startOfWeek(date: CalendarDate, weekStart: WeekStartDay = "Monday"): CalendarDate {
  const weekday = isoWeekday(date);
  const offset = weekStart === "Monday" ? weekday - 1 : weekday % 7;
  return addDays(date, -offset);
}

export function endOfWeek(date: CalendarDate, weekStart: WeekStartDay = "Monday"): CalendarDate {
  return addDays(startOfWeek(date, weekStart), 6);
}
