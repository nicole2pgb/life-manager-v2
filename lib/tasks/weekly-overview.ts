import type { LifeArea } from "@/db/schema";
import { addDays, endOfWeek, isoWeekday, parseCalendarDate, startOfWeek, type CalendarDate } from "@/lib/dates/calendar-date";
import { weekOccurrences, type PlanningTask } from "./planning";

// Builds the Weekly Overview from plain task data. Pure: no database, no clock,
// no time zone. Day placement uses the same conditions as `weekOccurrences`
// (creation date, dated one-time tasks in the week of their date), so the
// entries here always add up to the planned occurrences of the Dashboard's
// weekly progress. Weeks run Monday to Sunday; the week start is deliberately
// not read from user settings (the Settings feature changes all week-based
// behavior together).

export type WeeklyOverviewTaskInput = PlanningTask & {
  id: number;
  title: string;
  lifeArea: LifeArea;
};

// ---------- Week selection ----------

// A week is usable when all seven of its days are supported calendar dates.
function isSupportedWeek(weekStart: CalendarDate): boolean {
  return parseCalendarDate(weekStart) !== null && parseCalendarDate(addDays(weekStart, 6)) !== null;
}

// The Monday of the week selected by the `week` query value; the current week
// for a missing, repeated or invalid value or a week outside the supported range.
export function resolveWeek(param: string | string[] | undefined, today: CalendarDate): CalendarDate {
  if (typeof param === "string") {
    const date = parseCalendarDate(param);
    if (date !== null) {
      const weekStart = startOfWeek(date);
      if (isSupportedWeek(weekStart)) return weekStart;
    }
  }
  return startOfWeek(today);
}

// The Mondays of the previous and next week; null where that week would not be
// fully inside the supported date range.
export function adjacentWeeks(weekStart: CalendarDate): { previous: CalendarDate | null; next: CalendarDate | null } {
  const previous = addDays(weekStart, -7);
  const next = addDays(weekStart, 7);
  return {
    previous: isSupportedWeek(previous) ? previous : null,
    next: isSupportedWeek(next) ? next : null,
  };
}

// ---------- Week view ----------

export type DayItem = {
  id: number;
  title: string;
  lifeArea: LifeArea;
  done: boolean;
  kind: "recurring" | "scheduled" | "due";
};

export type OverviewDay = {
  date: CalendarDate;
  weekday: number; // ISO, Monday = 1
  isToday: boolean;
  items: DayItem[];
};

export type FrequencyItem = {
  id: number;
  title: string;
  lifeArea: LifeArea;
  completed: number;
  planned: number;
};

export type OpenTaskItem = {
  id: number;
  title: string;
  lifeArea: LifeArea;
};

export type WeeklyOverview = {
  weekStart: CalendarDate;
  weekEnd: CalendarDate;
  days: OverviewDay[];
  frequency: FrequencyItem[];
  openTasks: OpenTaskItem[];
  // The user has at least one task, shown on this page or not.
  hasTasks: boolean;
};

// `tasks` must be in the order they should keep within a group (newest created first).
export function buildWeeklyOverview(
  tasks: readonly WeeklyOverviewTaskInput[],
  weekStart: CalendarDate,
  today: CalendarDate,
): WeeklyOverview {
  const days: OverviewDay[] = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(weekStart, i);
    return { date, weekday: isoWeekday(date), isToday: date === today, items: [] };
  });
  const frequency: FrequencyItem[] = [];
  const openTasks: OpenTaskItem[] = [];

  for (const task of tasks) {
    const { id, title, lifeArea, rule, completionDates } = task;
    switch (rule.type) {
      case "daily":
      case "weekdays":
        for (const day of days) {
          if (day.date < task.createdOn) continue;
          if (rule.type === "weekdays" && !rule.weekdays.includes(day.weekday)) continue;
          day.items.push({ id, title, lifeArea, done: completionDates.has(day.date), kind: "recurring" });
        }
        break;
      case "times_per_week": {
        const { planned, completed } = weekOccurrences(task, weekStart);
        if (planned > 0) frequency.push({ id, title, lifeArea, completed, planned });
        break;
      }
      case "none": {
        const date = task.scheduledDate ?? task.dueDate;
        const done = completionDates.size > 0;
        if (date === null) {
          if (!done) openTasks.push({ id, title, lifeArea });
          break;
        }
        // The task's own date decides the column, whatever its completion date.
        const day = days.find((d) => d.date === date);
        if (day) day.items.push({ id, title, lifeArea, done, kind: task.scheduledDate !== null ? "scheduled" : "due" });
        break;
      }
    }
  }

  return { weekStart, weekEnd: endOfWeek(weekStart), days, frequency, openTasks, hasTasks: tasks.length > 0 };
}
