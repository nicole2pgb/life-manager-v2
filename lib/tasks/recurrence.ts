import { isoWeekday, type CalendarDate } from "@/lib/dates/calendar-date";

// The single definition of when a recurring task is relevant. Pure: no
// database, no clock. Screens and the completion check both call it; Today and
// Weekly Overview reuse it instead of redefining relevance.

export const WEEKDAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

// `weekdays` are ISO weekday numbers (Monday = 1 ... Sunday = 7), sorted and distinct.
export type RecurrenceRule =
  | { type: "none" }
  | { type: "daily" }
  | { type: "weekdays"; weekdays: number[] }
  | { type: "times_per_week"; timesPerWeek: number };

export type RelevanceContext = {
  // The task's completion dates within the calendar week of the evaluated date.
  completionDatesInWeek: ReadonlySet<CalendarDate>;
};

// A one-time task (type none) is not governed by recurrence; its dates keep
// the meaning defined by Task Management, so it is never "relevant" here.
export function isRelevantOn(
  rule: RecurrenceRule,
  date: CalendarDate,
  context: RelevanceContext,
): boolean {
  switch (rule.type) {
    case "none":
      return false;
    case "daily":
      return true;
    case "weekdays":
      return rule.weekdays.includes(isoWeekday(date));
    case "times_per_week":
      return (
        context.completionDatesInWeek.has(date) ||
        context.completionDatesInWeek.size < rule.timesPerWeek
      );
  }
}

export function formatRecurrence(rule: RecurrenceRule): string | null {
  switch (rule.type) {
    case "none":
      return null;
    case "daily":
      return "Every day";
    case "weekdays":
      return rule.weekdays.map((day) => WEEKDAY_NAMES[day - 1]).join(", ");
    case "times_per_week":
      return rule.timesPerWeek === 1 ? "1 time per week" : `${rule.timesPerWeek} times per week`;
  }
}

// Stored completions may exceed the target after the target was lowered; the
// shown count never does.
export function cappedWeekCount(count: number, target: number): number {
  return Math.min(count, target);
}

export function weekCountLabel(count: number, target: number): string {
  return `${cappedWeekCount(count, target)} of ${target} this week`;
}
