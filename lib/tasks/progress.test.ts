import { describe, expect, it } from "vitest";
import { buildDashboard, type DashboardTaskInput } from "./dashboard";
import { summarizeWeek } from "./planning";
import { buildProgress, currentStreak, formatPointChange, weeklyChange } from "./progress";
import { buildWeeklyOverview } from "./weekly-overview";

const TODAY = "2026-10-07"; // Wednesday; week 2026-10-05 .. 2026-10-11
const WEEK = "2026-10-05";
let nextId = 1;
const make = (extra: Partial<DashboardTaskInput> & { done?: string[] }): DashboardTaskInput => {
  const { done = [], ...rest } = extra;
  return {
    id: nextId++,
    title: `T${nextId}`,
    lifeArea: "Health",
    rule: { type: "none" },
    scheduledDate: null,
    dueDate: null,
    createdOn: "2026-09-01",
    completionDates: new Set(done),
    ...rest,
  };
};

describe("currentStreak", () => {
  it("ends today when today has a completion", () => {
    expect(currentStreak(["2026-09-29", "2026-09-30", "2026-10-01", "2026-10-02"], "2026-10-02")).toBe(4);
  });
  it("continues from yesterday while today is still open", () => {
    expect(currentStreak(["2026-09-29", "2026-09-30", "2026-10-01"], "2026-10-02")).toBe(3);
  });
  it("breaks on a fully elapsed day without a completion", () => {
    expect(currentStreak(["2026-09-28", "2026-10-01"], "2026-10-02")).toBe(1);
  });
  it("is 0 when neither today nor yesterday has a completion", () => {
    expect(currentStreak(["2026-09-30"], "2026-10-02")).toBe(0);
    expect(currentStreak([], "2026-10-02")).toBe(0);
  });
  it("spans week, month and year boundaries", () => {
    const week = ["2026-09-24", "2026-09-25", "2026-09-26", "2026-09-27", "2026-09-28", "2026-09-29", "2026-09-30"];
    expect(currentStreak(week, "2026-09-30")).toBe(7);
    expect(currentStreak(["2026-12-30", "2026-12-31", "2027-01-01"], "2027-01-01")).toBe(3);
  });
  it("counts a single day and ignores duplicates and order", () => {
    expect(currentStreak(["2026-10-02"], "2026-10-02")).toBe(1);
    expect(currentStreak(["2026-10-02", "2026-10-01", "2026-10-02", "2026-10-01"], "2026-10-02")).toBe(2);
  });
});

describe("weeklyChange", () => {
  it("uses the unrounded ratios", () => {
    // 1/6 = 16.67% (shown 17%), 1/3 = 33.33% (shown 33%): -16.67 -> -17, not -16.
    expect(weeklyChange({ planned: 6, completed: 1 }, { planned: 3, completed: 1 })).toBe(-17);
  });
  it("reports a decrease and an increase", () => {
    expect(weeklyChange({ planned: 33, completed: 12 }, { planned: 20, completed: 9 })).toBe(-9);
    expect(weeklyChange({ planned: 10, completed: 8 }, { planned: 10, completed: 0 })).toBe(80);
  });
  it("normalises a change that rounds to zero", () => {
    // 301/1000 vs 30/100: 0.1 points; 299/1000 vs 30/100: -0.1 points.
    expect(Object.is(weeklyChange({ planned: 1000, completed: 299 }, { planned: 100, completed: 30 }), 0)).toBe(true);
    expect(Object.is(weeklyChange({ planned: 1000, completed: 301 }, { planned: 100, completed: 30 }), 0)).toBe(true);
  });
  it("has no value when either week plans nothing", () => {
    expect(weeklyChange({ planned: 0, completed: 0 }, { planned: 2, completed: 1 })).toBeNull();
    expect(weeklyChange({ planned: 2, completed: 1 }, { planned: 0, completed: 0 })).toBeNull();
  });
  it("rounds exact halves with Math.round (toward +infinity)", () => {
    // 1/8 = 12.5% exactly, so the difference is an exact half.
    expect(weeklyChange({ planned: 8, completed: 0 }, { planned: 8, completed: 1 })).toBe(-12);
    expect(weeklyChange({ planned: 8, completed: 1 }, { planned: 8, completed: 0 })).toBe(13);
  });
});

describe("formatPointChange", () => {
  it("formats sign, unit and the neutral states", () => {
    expect(formatPointChange(-8)).toBe("−8% pts");
    expect(formatPointChange(8)).toBe("+8% pts");
    expect(formatPointChange(0)).toBe("0% pts");
    expect(formatPointChange(null)).toBe("No comparison");
  });
});

describe("buildProgress: days", () => {
  it("places only day-bound occurrences and marks today and future days", () => {
    const tasks = [
      make({ rule: { type: "daily" }, done: ["2026-10-05", "2026-10-06"] }),
      make({ rule: { type: "weekdays", weekdays: [1, 3, 5] }, done: ["2026-10-05"] }),
      make({ scheduledDate: "2026-10-06", done: ["2026-10-08"] }),
      make({ rule: { type: "times_per_week", timesPerWeek: 3 }, done: ["2026-10-05", "2026-10-07"] }),
      make({ title: "undated" }),
    ];
    const { days } = buildProgress(tasks, [], TODAY);
    expect(days.map((d) => [d.planned, d.completed])).toEqual([
      [2, 2], // Mon: daily + weekday
      [2, 2], // Tue: daily + dated one-time (completed on Thursday)
      [2, 0], // Wed (today): daily + weekday
      [1, 0], // Thu: daily; the dated task is not on Thursday
      [2, 0], // Fri: daily + weekday
      [1, 0],
      [1, 0],
    ]);
    expect(days.map((d) => d.isToday)).toEqual([false, false, true, false, false, false, false]);
    expect(days.map((d) => d.isFuture)).toEqual([false, false, false, true, true, true, true]);
    expect(days[0].weekday).toBe(1);
  });
  it("leaves days without day-bound occurrences at 0 planned", () => {
    const { days } = buildProgress([make({ rule: { type: "weekdays", weekdays: [2] } })], [], TODAY);
    expect(days.map((d) => d.planned)).toEqual([0, 1, 0, 0, 0, 0, 0]);
  });
  it("respects the creation date", () => {
    const { days } = buildProgress([make({ rule: { type: "daily" }, createdOn: "2026-10-07" })], [], TODAY);
    expect(days.map((d) => d.planned)).toEqual([0, 0, 1, 1, 1, 1, 1]);
  });
  it("daily sums plus times-per-week equal the weekly totals", () => {
    const tasks = [
      make({ rule: { type: "daily" }, done: ["2026-10-05", "2026-10-07"] }),
      make({ scheduledDate: "2026-10-09", done: ["2026-10-07"] }),
      make({ rule: { type: "times_per_week", timesPerWeek: 4 }, done: ["2026-10-05", "2026-10-06"] }),
      make({ rule: { type: "times_per_week", timesPerWeek: 2 }, createdOn: "2026-10-09" }),
    ];
    const progress = buildProgress(tasks, [], TODAY);
    const perWeek = summarizeWeek(tasks.filter((t) => t.rule.type === "times_per_week"), WEEK);
    const dailyPlanned = progress.days.reduce((n, d) => n + d.planned, 0);
    const dailyCompleted = progress.days.reduce((n, d) => n + d.completed, 0);
    expect(dailyPlanned + perWeek.planned).toBe(progress.week.planned);
    expect(dailyCompleted + perWeek.completed).toBe(progress.week.completed);
    expect(perWeek.planned).toBeGreaterThan(0);
  });
});

describe("buildProgress: life areas, weeks, streak", () => {
  it("lists all six areas in order and adds up to the weekly totals", () => {
    const tasks = [
      make({ lifeArea: "Fitness", rule: { type: "times_per_week", timesPerWeek: 3 }, done: ["2026-10-05"] }),
      make({ lifeArea: "Career", rule: { type: "daily" }, done: ["2026-10-05"] }),
      make({ lifeArea: "Career", dueDate: "2026-10-10" }),
    ];
    const { lifeAreas, week } = buildProgress(tasks, [], TODAY);
    expect(lifeAreas.map((a) => a.area)).toEqual(["Career", "Fitness", "Health", "Learning", "Personal", "Finance"]);
    expect(lifeAreas.find((a) => a.area === "Finance")).toEqual({ area: "Finance", planned: 0, completed: 0, percent: null });
    expect(lifeAreas.find((a) => a.area === "Fitness")).toMatchObject({ planned: 3, completed: 1, percent: 33 });
    expect(lifeAreas.reduce((n, a) => n + a.planned, 0)).toBe(week.planned);
    expect(lifeAreas.reduce((n, a) => n + a.completed, 0)).toBe(week.completed);
  });
  it("lists every area for a user without tasks", () => {
    const progress = buildProgress([], [], TODAY);
    expect(progress.lifeAreas).toHaveLength(6);
    expect(progress.lifeAreas.every((a) => a.planned === 0 && a.percent === null)).toBe(true);
    expect(progress).toMatchObject({ hasTasks: false, change: null, streak: 0 });
    expect(progress.week.percent).toBeNull();
  });
  it("uses current definitions for the previous week", () => {
    const tasks = [
      make({ rule: { type: "daily" }, createdOn: "2026-10-05" }), // created this week: nothing last week
      make({ scheduledDate: "2026-09-30", done: ["2026-10-06"] }), // dated last week, completed this week
    ];
    const { previousWeek, week } = buildProgress(tasks, [], TODAY);
    expect(previousWeek).toMatchObject({ weekStart: "2026-09-28", planned: 1, completed: 1 });
    expect(week.planned).toBe(7); // the daily task's seven days; the dated task adds nothing this week
  });
  it("passes the streak through", () => {
    expect(buildProgress([], ["2026-10-07", "2026-10-06"], TODAY).streak).toBe(2);
  });
});

describe("buildProgress agrees with Dashboard and Weekly Overview", () => {
  const tasks = [
    make({ rule: { type: "daily" }, done: ["2026-10-05", "2026-10-06", "2026-10-07"] }),
    make({ rule: { type: "weekdays", weekdays: [2, 4] }, createdOn: "2026-10-06", done: ["2026-10-06"] }),
    make({ scheduledDate: "2026-10-08" }),
    make({ dueDate: "2026-10-05", done: ["2026-10-07"] }),
    make({ rule: { type: "times_per_week", timesPerWeek: 3 }, done: ["2026-10-05"] }),
    make({ title: "undated" }),
  ];
  it("has the Dashboard's weekly numbers", () => {
    expect(buildProgress(tasks, [], TODAY).week).toEqual(buildDashboard(tasks, TODAY).week);
  });
  it("has the Weekly Overview's day counts", () => {
    const overview = buildWeeklyOverview(tasks, WEEK, TODAY);
    const { days } = buildProgress(tasks, [], TODAY);
    expect(days.map((d) => [d.planned, d.completed])).toEqual(
      overview.days.map((d) => [d.items.length, d.items.filter((i) => i.done).length]),
    );
  });
});
