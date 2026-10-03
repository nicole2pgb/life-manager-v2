import { describe, expect, it } from "vitest";
import { startOfWeek } from "@/lib/dates/calendar-date";
import { buildDashboard, type DashboardTaskInput } from "./dashboard";
import { dayOccurrence, summarizeWeek, todayStatus, weekOccurrences } from "./planning";
import { buildProgress } from "./progress";
import type { RecurrenceRule } from "./recurrence";
import { adjacentWeeks, buildWeeklyOverview, resolveWeek } from "./weekly-overview";

// The user's week start only moves week boundaries. 2026-10-04 is a Sunday:
// Sunday start -> 2026-10-04 .. 2026-10-10; Monday start -> 2026-10-05 .. 2026-10-11.
const SUN = "2026-10-04";
const MON = "2026-10-05";
const TUE = "2026-10-06";
const WED = "2026-10-07";
const FRI = "2026-10-09";
const SAT = "2026-10-10";
const NEXT_SUN = "2026-10-11";
const OLD = "2026-09-01";

const perWeek = (n: number): RecurrenceRule => ({ type: "times_per_week", timesPerWeek: n });

let nextId = 1;
const make = (rule: RecurrenceRule, extra: Partial<DashboardTaskInput> & { done?: string[] } = {}): DashboardTaskInput => {
  const { done = [], ...rest } = extra;
  return {
    id: nextId++,
    title: `T${nextId}`,
    lifeArea: "Health",
    rule,
    scheduledDate: null,
    dueDate: null,
    createdOn: OLD,
    completionDates: new Set(done),
    ...rest,
  };
};

describe("week boundaries follow the week start", () => {
  it("startOfWeek", () => {
    expect(startOfWeek(WED, "Sunday")).toBe(SUN);
    expect(startOfWeek(SUN, "Sunday")).toBe(SUN);
    expect(startOfWeek(SAT, "Sunday")).toBe(SUN);
    expect(startOfWeek(SUN, "Monday")).toBe("2026-09-28");
    expect(startOfWeek(WED, "Monday")).toBe(MON);
  });

  it("resolveWeek selects the week containing the date, or the current week", () => {
    expect(resolveWeek("2026-10-07", WED, "Sunday")).toBe(SUN);
    expect(resolveWeek("2026-10-07", WED, "Monday")).toBe(MON);
    expect(resolveWeek(undefined, "2026-10-02", "Sunday")).toBe("2026-09-27");
    expect(resolveWeek("abc", "2026-10-02", "Sunday")).toBe("2026-09-27");
    expect(resolveWeek(["2026-10-07", "2026-10-07"], WED, "Sunday")).toBe(SUN);
  });

  it("adjacentWeeks moves by seven days", () => {
    expect(adjacentWeeks(SUN)).toEqual({ previous: "2026-09-27", next: NEXT_SUN });
  });
});

describe("times-per-week counting", () => {
  // Completions on Sunday 10-04 and Monday 10-05.
  const t = make(perWeek(3), { done: [SUN, MON] });

  it("counts both completions in one Sunday-start week", () => {
    expect(weekOccurrences(t, SUN)).toEqual({ planned: 3, completed: 2 });
    expect(dashboardCount(t, "Sunday")).toBe(2);
  });

  it("splits them across two Monday-start weeks", () => {
    expect(dashboardCount(t, "Monday")).toBe(1);
  });

  it("resets with the first day of the Sunday-start week", () => {
    const earlier = make(perWeek(2), { done: ["2026-10-02", "2026-10-03"] }); // Fri, Sat of the previous Sunday-start week
    expect(todayStatus(earlier, WED, "Sunday").listed).toBe(true); // last week's completions do not count
    expect(todayStatus(earlier, WED, "Monday").listed).toBe(true);
    const sameWeek = make(perWeek(2), { done: [FRI, SAT] });
    expect(todayStatus(sameWeek, SAT, "Sunday").listed).toBe(true); // done today
    const full = make(perWeek(2), { done: [MON, TUE] });
    expect(todayStatus(full, WED, "Sunday").listed).toBe(false); // target reached this week
    expect(todayStatus(full, NEXT_SUN, "Sunday").listed).toBe(true); // new week
    expect(todayStatus(full, NEXT_SUN, "Monday").listed).toBe(false); // still Monday-start week 10-05..10-11
  });

  function dashboardCount(task: DashboardTaskInput, weekStart: "Monday" | "Sunday") {
    const item = buildDashboard([task], WED, weekStart).items[0];
    return item.weekCount;
  }
});

describe("weekday rules keep ISO numbering", () => {
  it("a Monday task is placed on Mondays whatever the week start", () => {
    const monday = make({ type: "weekdays", weekdays: [1] });
    expect(dayOccurrence(monday, MON)).not.toBeNull();
    expect(dayOccurrence(monday, SUN)).toBeNull();
    expect(weekOccurrences(monday, SUN)).toEqual({ planned: 1, completed: 0 });
    expect(weekOccurrences(monday, MON)).toEqual({ planned: 1, completed: 0 });
  });
});

describe("screens agree for both week starts", () => {
  const tasks = (): DashboardTaskInput[] => [
    make({ type: "daily" }, { done: [SUN, MON, WED] }),
    make({ type: "weekdays", weekdays: [1, 4] }, { done: [MON] }),
    make(perWeek(3), { done: [SUN, MON] }),
    make({ type: "none" }, { scheduledDate: SUN, done: [SUN] }),
    make({ type: "none" }, { dueDate: SAT }),
    make({ type: "none" }),
  ];

  it.each(["Monday", "Sunday"] as const)("%s: dashboard, overview and progress cover the same week", (weekStartDay) => {
    const list = tasks();
    const weekStart = startOfWeek(WED, weekStartDay);
    const dashboard = buildDashboard(list, WED, weekStartDay);
    const overview = buildWeeklyOverview(list, weekStart, WED);
    const progress = buildProgress(list, [SUN, MON, WED], WED, weekStartDay);

    expect(dashboard.week.weekStart).toBe(weekStart);
    expect(progress.week.weekStart).toBe(weekStart);
    expect(overview.weekStart).toBe(weekStart);
    expect(overview.weekEnd).toBe(dashboard.week.weekEnd);
    expect(progress.week).toEqual(dashboard.week);
    expect(progress.week).toEqual(summarizeWeek(list, weekStart));

    // Same seven dates, in the same order, on all three screens.
    const dates = overview.days.map((d) => d.date);
    expect(dates[0]).toBe(weekStart);
    expect(progress.days.map((d) => d.date)).toEqual(dates);
    expect(progress.days.map((d) => [d.planned, d.completed])).toEqual(
      overview.days.map((d) => [d.items.length, d.items.filter((i) => i.done).length]),
    );
  });

  it("the week start changes the numbers only through boundaries, not stored data", () => {
    const list = tasks();
    const before = buildDashboard(list, WED, "Monday").week;
    buildDashboard(list, WED, "Sunday");
    expect(buildDashboard(list, WED, "Monday").week).toEqual(before);
    expect(list.map((t) => [...t.completionDates])).toEqual(tasks().map((t) => [...t.completionDates]));
  });

  it("the streak does not depend on the week start", () => {
    const list = tasks();
    expect(buildProgress(list, [SUN, MON, TUE, WED], WED, "Monday").streak).toBe(
      buildProgress(list, [SUN, MON, TUE, WED], WED, "Sunday").streak,
    );
  });

  it("a Sunday-start day column order starts on Sunday", () => {
    const overview = buildWeeklyOverview([], SUN, WED);
    expect(overview.days.map((d) => d.weekday)).toEqual([7, 1, 2, 3, 4, 5, 6]);
  });
});
