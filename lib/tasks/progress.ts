import { LIFE_AREAS, type LifeArea } from "@/db/schema";
import { addDays, isoWeekday, startOfWeek, type CalendarDate } from "@/lib/dates/calendar-date";
import { dayOccurrence, summarizeWeek, type PlanningTask, type WeekSummary } from "./planning";

// Builds the Progress screen from plain task data. Pure: no database, no clock,
// no time zone. Weekly numbers come from `summarizeWeek` and day placement from
// `dayOccurrence`, so Progress always agrees with the Dashboard and the Weekly
// Overview. Weeks run Monday to Sunday; the week start is deliberately not read
// from user settings (the Settings feature changes all week-based behavior
// together).

export type ProgressTaskInput = PlanningTask & {
  lifeArea: LifeArea;
};

// ---------- Streak ----------

// Consecutive calendar days with at least one completion, counted back from
// today when today has one, otherwise from yesterday (an unfinished today does
// not break the streak). Any completion of any of the user's tasks counts.
export function currentStreak(completionDates: Iterable<CalendarDate>, today: CalendarDate): number {
  const dates = new Set(completionDates);
  let day = dates.has(today) ? today : addDays(today, -1);
  let streak = 0;
  while (dates.has(day)) {
    streak += 1;
    day = addDays(day, -1);
  }
  return streak;
}

// ---------- Weekly change ----------

type WeekCounts = Pick<WeekSummary, "planned" | "completed">;

// Difference of the completion rates in percentage points, from the unrounded
// ratios; only the difference is rounded. Null when either week plans nothing.
export function weeklyChange(current: WeekCounts, previous: WeekCounts): number | null {
  if (current.planned === 0 || previous.planned === 0) return null;
  const change = Math.round((current.completed / current.planned - previous.completed / previous.planned) * 100);
  return change === 0 ? 0 : change; // never -0
}

export function formatPointChange(change: number | null): string {
  if (change === null) return "No comparison";
  if (change === 0) return "0% pts";
  return change < 0 ? `−${-change}% pts` : `+${change}% pts`;
}

// ---------- Progress ----------

export type ProgressDay = {
  date: CalendarDate;
  weekday: number; // ISO, Monday = 1
  isToday: boolean;
  isFuture: boolean;
  // Day-placed occurrences only; times-per-week tasks are not on any day.
  planned: number;
  completed: number;
};

export type LifeAreaProgress = {
  area: LifeArea;
  planned: number;
  completed: number;
  // Whole-number percentage; null when nothing is planned (never 0%).
  percent: number | null;
};

export type Progress = {
  today: CalendarDate;
  week: WeekSummary;
  previousWeek: WeekSummary;
  // Percentage points; null when either week plans nothing.
  change: number | null;
  streak: number;
  days: ProgressDay[];
  lifeAreas: LifeAreaProgress[];
  // The user has at least one task.
  hasTasks: boolean;
};

export function buildProgress(
  tasks: readonly ProgressTaskInput[],
  completionDates: Iterable<CalendarDate>,
  today: CalendarDate,
): Progress {
  const weekStart = startOfWeek(today);
  const week = summarizeWeek(tasks, weekStart);
  const previousWeek = summarizeWeek(tasks, addDays(weekStart, -7));

  const days: ProgressDay[] = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(weekStart, i);
    let planned = 0;
    let completed = 0;
    for (const task of tasks) {
      const occurrence = dayOccurrence(task, date);
      if (occurrence === null) continue;
      planned += 1;
      if (occurrence.done) completed += 1;
    }
    return { date, weekday: isoWeekday(date), isToday: date === today, isFuture: date > today, planned, completed };
  });

  const lifeAreas = LIFE_AREAS.map((area): LifeAreaProgress => {
    const { planned, completed, percent } = summarizeWeek(
      tasks.filter((task) => task.lifeArea === area),
      weekStart,
    );
    return { area, planned, completed, percent };
  });

  return {
    today,
    week,
    previousWeek,
    change: weeklyChange(week, previousWeek),
    streak: currentStreak(completionDates, today),
    days,
    lifeAreas,
    hasTasks: tasks.length > 0,
  };
}
