import type { LifeArea } from "@/db/schema";
import { startOfWeek, type CalendarDate } from "@/lib/dates/calendar-date";
import { summarizeWeek, todayRank, todayStatus, type PlanningTask, type WeekSummary } from "./planning";
import { cappedWeekCount } from "./recurrence";

// Assembles the Dashboard from plain task data. Pure: the data layer loads the
// tasks (owner-scoped) and converts creation instants to calendar dates.

export type DashboardTaskInput = PlanningTask & {
  id: number;
  title: string;
  lifeArea: LifeArea;
};

export type TodayItem = {
  id: number;
  title: string;
  lifeArea: LifeArea;
  rule: PlanningTask["rule"];
  scheduledDate: CalendarDate | null;
  dueDate: CalendarDate | null;
  done: boolean;
  overdue: boolean;
  // Times-per-week only: completions this week, capped at the target.
  weekCount: number | null;
};

export type Dashboard = {
  today: CalendarDate;
  items: TodayItem[];
  openCount: number;
  doneCount: number;
  // The user has at least one task, listed today or not.
  hasTasks: boolean;
  week: WeekSummary;
};

// `tasks` must be in the order they should keep within a group (newest created first).
export function buildDashboard(tasks: readonly DashboardTaskInput[], today: CalendarDate): Dashboard {
  const weekStart = startOfWeek(today);
  const items: TodayItem[] = [];
  for (const task of tasks) {
    const status = todayStatus(task, today);
    if (!status.listed) continue;
    const weekCount =
      task.rule.type === "times_per_week"
        ? cappedWeekCount(
            [...task.completionDates].filter((d) => startOfWeek(d) === weekStart).length,
            task.rule.timesPerWeek,
          )
        : null;
    items.push({
      id: task.id,
      title: task.title,
      lifeArea: task.lifeArea,
      rule: task.rule,
      scheduledDate: task.scheduledDate,
      dueDate: task.dueDate,
      done: status.done,
      overdue: status.overdue,
      weekCount,
    });
  }
  // Array.prototype.sort is stable.
  items.sort((a, b) => todayRank(a) - todayRank(b));
  const doneCount = items.filter((item) => item.done).length;
  return {
    today,
    items,
    openCount: items.length - doneCount,
    doneCount,
    hasTasks: tasks.length > 0,
    week: summarizeWeek(tasks, weekStart),
  };
}
