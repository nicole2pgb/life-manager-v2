import { addDays, endOfWeek, startOfWeek, isoWeekday, type CalendarDate } from "@/lib/dates/calendar-date";
import { isRelevantOn, type RecurrenceRule } from "./recurrence";

// Today membership and weekly planned occurrences. Pure like recurrence.ts: no
// database, no clock, no time zone. Callers pass calendar dates (the creation
// instant is converted to a calendar date by the data layer). Weekly Overview
// and Progress reuse these definitions instead of redefining them.

export type PlanningTask = {
  rule: RecurrenceRule;
  // One-time tasks only; at most one is set. Recurring tasks have neither.
  scheduledDate: CalendarDate | null;
  dueDate: CalendarDate | null;
  // Calendar date of the task's creation instant in the application time zone.
  createdOn: CalendarDate;
  // Recurring: its completion dates (at least those of the evaluated week).
  // One-time: its single completion date, or empty while incomplete.
  completionDates: ReadonlySet<CalendarDate>;
};

function inWeek(date: CalendarDate, weekStart: CalendarDate): boolean {
  return date >= weekStart && date <= addDays(weekStart, 6);
}

function weekDates(weekStart: CalendarDate): CalendarDate[] {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
}

// ---------- Today ----------

export type TodayStatus = {
  listed: boolean;
  done: boolean; // done/completed today
  overdue: boolean; // incomplete due-date task whose deadline is before today
};

const NOT_LISTED: TodayStatus = { listed: false, done: false, overdue: false };

export function todayStatus(task: PlanningTask, today: CalendarDate): TodayStatus {
  const { rule } = task;
  if (rule.type !== "none") {
    const done = task.completionDates.has(today);
    const weekStart = startOfWeek(today);
    const completionDatesInWeek = new Set([...task.completionDates].filter((d) => inWeek(d, weekStart)));
    const listed = done || isRelevantOn(rule, today, { completionDatesInWeek });
    return listed ? { listed, done, overdue: false } : NOT_LISTED;
  }

  if (task.completionDates.size > 0) {
    // A task completed on an earlier day is not listed any more.
    return task.completionDates.has(today) ? { listed: true, done: true, overdue: false } : NOT_LISTED;
  }
  if (task.scheduledDate !== null && task.scheduledDate > today) return NOT_LISTED;
  return { listed: true, done: false, overdue: task.dueDate !== null && task.dueDate < today };
}

// Open tasks first (overdue first among them), tasks done today last. Use with
// a stable sort so the caller's order (newest created first) holds within a group.
export function todayRank(status: Pick<TodayStatus, "done" | "overdue">): number {
  if (status.done) return 2;
  return status.overdue ? 0 : 1;
}

// ---------- Weekly planned occurrences ----------

export type WeekOccurrences = { planned: number; completed: number };

// Planned and completed occurrences of one task in the Monday-Sunday week that
// starts at `weekStart`, using the task's current definition. completed <= planned.
export function weekOccurrences(task: PlanningTask, weekStart: CalendarDate): WeekOccurrences {
  const { rule, createdOn, completionDates } = task;
  const days = weekDates(weekStart);
  // Day-based recurring occurrences never exist before the creation date.
  const daysFromCreation = days.filter((d) => d >= createdOn);

  switch (rule.type) {
    case "none": {
      const date = task.scheduledDate ?? task.dueDate;
      if (date === null || !inWeek(date, weekStart)) return { planned: 0, completed: 0 };
      return { planned: 1, completed: completionDates.size > 0 ? 1 : 0 };
    }
    case "daily":
      return countDays(daysFromCreation, completionDates);
    case "weekdays":
      return countDays(
        daysFromCreation.filter((d) => rule.weekdays.includes(isoWeekday(d))),
        completionDates,
      );
    case "times_per_week": {
      // Full target in any week after the creation week; in the creation week at
      // most one occurrence per remaining day, so the first week is reachable.
      const planned = createdOn < weekStart ? rule.timesPerWeek : Math.min(rule.timesPerWeek, daysFromCreation.length);
      const done = days.filter((d) => d >= createdOn && completionDates.has(d)).length;
      return { planned, completed: Math.min(done, planned) };
    }
  }
}

function countDays(planned: CalendarDate[], completionDates: ReadonlySet<CalendarDate>): WeekOccurrences {
  return { planned: planned.length, completed: planned.filter((d) => completionDates.has(d)).length };
}

export type WeekSummary = {
  weekStart: CalendarDate;
  weekEnd: CalendarDate;
  planned: number;
  completed: number;
  open: number;
  // Whole-number percentage; null when nothing is planned (never 0% or NaN).
  percent: number | null;
};

export function summarizeWeek(tasks: readonly PlanningTask[], weekStart: CalendarDate): WeekSummary {
  let planned = 0;
  let completed = 0;
  for (const task of tasks) {
    const occurrences = weekOccurrences(task, weekStart);
    planned += occurrences.planned;
    completed += occurrences.completed;
  }
  return {
    weekStart,
    weekEnd: endOfWeek(weekStart),
    planned,
    completed,
    open: planned - completed,
    percent: planned === 0 ? null : Math.round((completed / planned) * 100),
  };
}
