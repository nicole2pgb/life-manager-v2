import { describe, expect, it } from "vitest";
import {
  summarizeWeek,
  todayRank,
  todayStatus,
  weekOccurrences,
  type PlanningTask,
} from "./planning";
import type { RecurrenceRule } from "./recurrence";

// 2026-10-05 is a Monday; the week is 2026-10-05 .. 2026-10-11.
const MON = "2026-10-05";
const TUE = "2026-10-06";
const WED = "2026-10-07";
const THU = "2026-10-08";
const FRI = "2026-10-09";
const SAT = "2026-10-10";
const SUN = "2026-10-11";
const OLD = "2026-09-01";

const none: RecurrenceRule = { type: "none" };
const daily: RecurrenceRule = { type: "daily" };
const monThu: RecurrenceRule = { type: "weekdays", weekdays: [1, 4] };
const perWeek = (n: number): RecurrenceRule => ({ type: "times_per_week", timesPerWeek: n });

function task(rule: RecurrenceRule, extra: Partial<Omit<PlanningTask, "rule" | "completionDates">> & { done?: string[] } = {}): PlanningTask {
  const { done = [], ...rest } = extra;
  return { rule, scheduledDate: null, dueDate: null, createdOn: OLD, completionDates: new Set(done), ...rest };
}

describe("todayStatus: recurring tasks", () => {
  it("lists daily and only matching weekday tasks", () => {
    expect(todayStatus(task(daily), TUE).listed).toBe(true);
    expect(todayStatus(task(monThu), TUE).listed).toBe(false);
    expect(todayStatus(task(monThu), THU).listed).toBe(true);
  });
  it("hides a times-per-week task whose target was reached earlier in the week", () => {
    expect(todayStatus(task(perWeek(3), { done: [MON, TUE, WED] }), FRI).listed).toBe(false);
  });
  it("keeps a times-per-week task listed as done when the target is reached today", () => {
    const status = todayStatus(task(perWeek(3), { done: [MON, TUE, FRI] }), FRI);
    expect(status).toEqual({ listed: true, done: true, overdue: false });
  });
  it("lists an open times-per-week task below its target", () => {
    expect(todayStatus(task(perWeek(3), { done: [MON] }), FRI)).toEqual({ listed: true, done: false, overdue: false });
  });
  it("ignores completions of other weeks for the weekly count", () => {
    expect(todayStatus(task(perWeek(1), { done: ["2026-10-02"] }), FRI).listed).toBe(true);
  });
  it("keeps a task listed as done today even if its rule no longer makes it relevant", () => {
    expect(todayStatus(task(monThu, { done: [TUE] }), TUE)).toEqual({ listed: true, done: true, overdue: false });
  });
});

describe("todayStatus: one-time tasks", () => {
  it("lists a task scheduled today, in the past, but not in the future", () => {
    expect(todayStatus(task(none, { scheduledDate: TUE }), TUE).listed).toBe(true);
    expect(todayStatus(task(none, { scheduledDate: "2026-10-01" }), TUE).listed).toBe(true);
    expect(todayStatus(task(none, { scheduledDate: WED }), TUE).listed).toBe(false);
  });
  it("lists due-date tasks before and after the deadline, overdue only after", () => {
    expect(todayStatus(task(none, { dueDate: "2026-10-11" }), TUE)).toEqual({ listed: true, done: false, overdue: false });
    expect(todayStatus(task(none, { dueDate: TUE }), TUE).overdue).toBe(false);
    expect(todayStatus(task(none, { dueDate: MON }), TUE)).toEqual({ listed: true, done: false, overdue: true });
  });
  it("never marks a carried-over scheduled task overdue", () => {
    expect(todayStatus(task(none, { scheduledDate: "2026-09-28" }), TUE).overdue).toBe(false);
  });
  it("lists undated incomplete tasks", () => {
    expect(todayStatus(task(none), TUE)).toEqual({ listed: true, done: false, overdue: false });
  });
  it("lists a task completed today as done and hides one completed earlier", () => {
    expect(todayStatus(task(none, { done: [TUE] }), TUE)).toEqual({ listed: true, done: true, overdue: false });
    expect(todayStatus(task(none, { done: [MON] }), TUE).listed).toBe(false);
  });
  it("does not mark a completed overdue task overdue", () => {
    expect(todayStatus(task(none, { dueDate: MON, done: [TUE] }), TUE).overdue).toBe(false);
  });
});

describe("todayRank", () => {
  it("orders overdue, open, then done", () => {
    expect(todayRank({ done: false, overdue: true })).toBeLessThan(todayRank({ done: false, overdue: false }));
    expect(todayRank({ done: false, overdue: false })).toBeLessThan(todayRank({ done: true, overdue: false }));
  });
});

describe("weekOccurrences: recurring", () => {
  it("plans 7 for a daily task created before the week", () => {
    expect(weekOccurrences(task(daily), MON).planned).toBe(7);
  });
  it("plans only from the creation date", () => {
    expect(weekOccurrences(task(daily, { createdOn: THU }), MON).planned).toBe(4);
    expect(weekOccurrences(task(daily, { createdOn: "2026-10-12" }), MON).planned).toBe(0);
    expect(weekOccurrences(task(daily, { createdOn: MON }), MON).planned).toBe(7);
  });
  it("plans selected weekdays on or after the creation date", () => {
    expect(weekOccurrences(task(monThu), MON).planned).toBe(2);
    expect(weekOccurrences(task(monThu, { createdOn: WED }), MON).planned).toBe(1);
    expect(weekOccurrences(task(monThu, { createdOn: FRI }), MON).planned).toBe(0);
  });
  it("counts only completions on planned days", () => {
    // Completed Tuesday, then switched to Monday/Thursday: Tuesday no longer counts.
    expect(weekOccurrences(task(monThu, { done: [TUE, THU] }), MON)).toEqual({ planned: 2, completed: 1 });
    expect(weekOccurrences(task(daily, { done: [MON, TUE] }), MON)).toEqual({ planned: 7, completed: 2 });
  });
  it("ignores completions before the creation date", () => {
    expect(weekOccurrences(task(daily, { createdOn: WED, done: [MON, WED] }), MON)).toEqual({ planned: 5, completed: 1 });
  });
  it("uses the full target in later weeks and a reduced one in the creation week", () => {
    expect(weekOccurrences(task(perWeek(3)), MON).planned).toBe(3);
    expect(weekOccurrences(task(perWeek(3), { createdOn: SAT }), MON).planned).toBe(2);
    expect(weekOccurrences(task(perWeek(3), { createdOn: SUN }), MON).planned).toBe(1);
    expect(weekOccurrences(task(perWeek(3), { createdOn: THU }), MON).planned).toBe(3);
    expect(weekOccurrences(task(perWeek(3), { createdOn: "2026-10-12" }), MON).planned).toBe(0);
  });
  it("caps times-per-week completions at the effective target", () => {
    expect(weekOccurrences(task(perWeek(2), { done: [MON, TUE, WED] }), MON)).toEqual({ planned: 2, completed: 2 });
    expect(weekOccurrences(task(perWeek(3), { createdOn: SAT, done: [SAT, SUN] }), MON)).toEqual({ planned: 2, completed: 2 });
  });
  it("counts only completions inside the evaluated week", () => {
    expect(weekOccurrences(task(perWeek(3), { done: ["2026-10-04", MON] }), MON).completed).toBe(1);
  });
});

describe("weekOccurrences: one-time", () => {
  it("plans one occurrence in the week of the scheduled date", () => {
    const t = task(none, { scheduledDate: FRI });
    expect(weekOccurrences(t, MON)).toEqual({ planned: 1, completed: 0 });
    expect(weekOccurrences(t, "2026-10-12").planned).toBe(0);
    expect(weekOccurrences(t, "2026-09-28").planned).toBe(0);
  });
  it("plans a due-date task once, not once per day", () => {
    expect(weekOccurrences(task(none, { dueDate: FRI }), MON)).toEqual({ planned: 1, completed: 0 });
  });
  it("counts a date before the creation date", () => {
    expect(weekOccurrences(task(none, { scheduledDate: MON, createdOn: WED }), MON).planned).toBe(1);
  });
  it("belongs to the past week when the date is in the past week", () => {
    const t = task(none, { scheduledDate: "2026-10-01", createdOn: TUE });
    expect(weekOccurrences(t, MON).planned).toBe(0);
    expect(weekOccurrences(t, "2026-09-28").planned).toBe(1);
  });
  it("counts completion in the dated week regardless of the completion date", () => {
    const t = task(none, { scheduledDate: "2026-10-01", done: [TUE] });
    expect(weekOccurrences(t, "2026-09-28")).toEqual({ planned: 1, completed: 1 });
    expect(weekOccurrences(t, MON)).toEqual({ planned: 0, completed: 0 });
  });
  it("plans nothing for undated tasks", () => {
    expect(weekOccurrences(task(none), MON)).toEqual({ planned: 0, completed: 0 });
    expect(weekOccurrences(task(none, { done: [MON] }), MON)).toEqual({ planned: 0, completed: 0 });
  });
});

describe("summarizeWeek", () => {
  it("rounds to a whole percentage", () => {
    const tasks = [task(perWeek(3), { done: [MON] })];
    expect(summarizeWeek(tasks, MON)).toMatchObject({ planned: 3, completed: 1, open: 2, percent: 33 });
  });
  it("matches the 12 of 33 example", () => {
    const tasks = [
      task(daily, { done: [MON, TUE, WED] }), // 3 of 7
      task(daily, { done: [MON, TUE, WED] }), // 3 of 7
      task(perWeek(5), { done: [MON, TUE] }), // 2 of 5
      task(perWeek(3), { done: [MON] }), // 1 of 3
      task(daily, { done: [MON, TUE, WED] }), // 3 of 7
      task(none, { scheduledDate: FRI }), // 0 of 1
      task(perWeek(3)), // 0 of 3 -> 33
    ];
    expect(summarizeWeek(tasks, MON)).toMatchObject({ planned: 33, completed: 12, open: 21, percent: 36 });
  });
  it("reports no percentage when nothing is planned", () => {
    expect(summarizeWeek([], MON).percent).toBeNull();
    expect(summarizeWeek([task(none), task(none, { done: [MON] })], MON)).toMatchObject({ planned: 0, percent: null });
  });
  it("adds nothing for carried-over or overdue tasks of past weeks", () => {
    const tasks = [task(none, { dueDate: "2026-10-01" }), task(none, { scheduledDate: "2026-09-28" })];
    expect(summarizeWeek(tasks, MON).planned).toBe(0);
  });
  it("includes the week range", () => {
    expect(summarizeWeek([], MON)).toMatchObject({ weekStart: MON, weekEnd: SUN });
  });
});

describe("completed <= planned", () => {
  const rules: RecurrenceRule[] = [none, daily, monThu, { type: "weekdays", weekdays: [1, 2, 3, 4, 5, 6, 7] }, perWeek(1), perWeek(3), perWeek(7)];
  const dates = ["2026-09-28", MON, TUE, WED, THU, FRI, SAT, SUN, "2026-10-12"];
  const weekDays = [MON, TUE, WED, THU, FRI, SAT, SUN];

  it("holds for every rule, creation date, dated one-time variant and completion pattern", () => {
    let checked = 0;
    for (const rule of rules) {
      for (const createdOn of dates) {
        const schedules = rule.type === "none"
          ? [{}, { scheduledDate: FRI }, { dueDate: SAT }, { scheduledDate: "2026-10-01" }, { dueDate: "2026-10-12" }]
          : [{}];
        for (const schedule of schedules) {
          // every subset of the week's days (and an out-of-week day) as completions
          for (let mask = 0; mask < 1 << 7; mask++) {
            const done = weekDays.filter((_, i) => mask & (1 << i));
            for (const extra of [[], ["2026-10-04"], ["2026-10-12"]]) {
              const t = task(rule, { createdOn, done: [...done, ...extra], ...schedule });
              const { planned, completed } = weekOccurrences(t, MON);
              expect(completed).toBeLessThanOrEqual(planned);
              expect(completed).toBeGreaterThanOrEqual(0);
              checked++;
            }
          }
        }
      }
    }
    expect(checked).toBeGreaterThan(10000);
  });
});
