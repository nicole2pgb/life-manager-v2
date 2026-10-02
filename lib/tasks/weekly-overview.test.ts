import { describe, expect, it } from "vitest";
import { addDays } from "@/lib/dates/calendar-date";
import { summarizeWeek } from "./planning";
import type { RecurrenceRule } from "./recurrence";
import {
  adjacentWeeks,
  buildWeeklyOverview,
  resolveWeek,
  type WeeklyOverviewTaskInput,
} from "./weekly-overview";

// 2026-10-05 is a Monday; the week is 2026-10-05 .. 2026-10-11.
const MON = "2026-10-05";
const TUE = "2026-10-06";
const WED = "2026-10-07";
const THU = "2026-10-08";
const FRI = "2026-10-09";
const SUN = "2026-10-11";
const OLD = "2026-09-01";

const none: RecurrenceRule = { type: "none" };
const daily: RecurrenceRule = { type: "daily" };
const monThu: RecurrenceRule = { type: "weekdays", weekdays: [1, 4] };
const perWeek = (n: number): RecurrenceRule => ({ type: "times_per_week", timesPerWeek: n });

let nextId = 1;
function task(
  rule: RecurrenceRule,
  extra: Partial<Omit<WeeklyOverviewTaskInput, "rule" | "completionDates" | "id">> & { done?: string[] } = {},
): WeeklyOverviewTaskInput {
  const { done = [], ...rest } = extra;
  return {
    id: nextId++,
    title: `Task ${nextId}`,
    lifeArea: "Health",
    rule,
    scheduledDate: null,
    dueDate: null,
    createdOn: OLD,
    completionDates: new Set(done),
    ...rest,
  };
}

const dates = (overview: ReturnType<typeof buildWeeklyOverview>, id: number) =>
  overview.days.filter((d) => d.items.some((i) => i.id === id)).map((d) => d.date);

describe("resolveWeek", () => {
  const today = "2026-10-02"; // Friday, week 2026-09-28
  it("defaults to the current week", () => {
    expect(resolveWeek(undefined, today)).toBe("2026-09-28");
  });
  it("selects the week containing any valid date", () => {
    expect(resolveWeek("2026-10-07", today)).toBe(MON);
    expect(resolveWeek("2026-10-11", today)).toBe(MON); // Sunday
    expect(resolveWeek("2026-10-05", today)).toBe(MON);
  });
  it("falls back to the current week for invalid values", () => {
    for (const value of ["abc", "2026-02-30", "", "2026-13-01", ["2026-10-07", "2026-10-14"]]) {
      expect(resolveWeek(value, today)).toBe("2026-09-28");
    }
  });
  it("falls back for weeks not fully inside the supported range", () => {
    expect(resolveWeek("1000-01-01", today)).toBe("2026-09-28"); // its Monday is in year 999
    expect(resolveWeek("9999-12-31", today)).toBe("2026-09-28"); // its Sunday is in year 10000
    expect(resolveWeek("1000-01-06", today)).toBe("1000-01-06");
    expect(resolveWeek("9999-12-27", today)).toBe("2026-09-28"); // its Sunday is in year 10000
    expect(resolveWeek("9999-12-24", today)).toBe("9999-12-20");
  });
});

describe("adjacentWeeks", () => {
  it("moves by one week", () => {
    expect(adjacentWeeks(MON)).toEqual({ previous: "2026-09-28", next: "2026-10-12" });
  });
  it("offers nothing past the supported range", () => {
    expect(adjacentWeeks("1000-01-06").previous).toBeNull();
    expect(adjacentWeeks("1000-01-06").next).toBe("1000-01-13");
    expect(adjacentWeeks("9999-12-20").next).toBeNull();
    expect(adjacentWeeks("9999-12-20").previous).toBe("9999-12-13");
  });
});

describe("buildWeeklyOverview day placement", () => {
  it("shows seven days from Monday with the weekday and today flag", () => {
    const o = buildWeeklyOverview([], MON, WED);
    expect(o.days.map((d) => d.date)).toEqual([MON, TUE, WED, THU, FRI, "2026-10-10", SUN]);
    expect(o.days.map((d) => d.weekday)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(o.days.map((d) => d.isToday)).toEqual([false, false, true, false, false, false, false]);
    expect(o.weekEnd).toBe(SUN);
  });

  it("flags no day as today in another week", () => {
    expect(buildWeeklyOverview([], MON, "2026-10-20").days.some((d) => d.isToday)).toBe(false);
  });

  it("puts a daily task on all seven days when created before the week", () => {
    const t = task(daily);
    expect(dates(buildWeeklyOverview([t], MON, MON), t.id)).toHaveLength(7);
  });

  it("starts a daily task on its creation date", () => {
    const t = task(daily, { createdOn: THU });
    expect(dates(buildWeeklyOverview([t], MON, MON), t.id)).toEqual([THU, FRI, "2026-10-10", SUN]);
  });

  it("omits a task created after the week", () => {
    const t = task(daily, { createdOn: "2026-10-12" });
    expect(dates(buildWeeklyOverview([t], MON, MON), t.id)).toEqual([]);
  });

  it("puts weekday tasks on their weekdays only", () => {
    const t = task(monThu);
    expect(dates(buildWeeklyOverview([t], MON, MON), t.id)).toEqual([MON, THU]);
  });

  it("limits a weekday task to weekdays on or after creation", () => {
    const t = task(monThu, { createdOn: TUE });
    expect(dates(buildWeeklyOverview([t], MON, MON), t.id)).toEqual([THU]);
  });

  it("puts a scheduled task on its date only, in that week only", () => {
    const t = task(none, { scheduledDate: WED });
    expect(dates(buildWeeklyOverview([t], MON, MON), t.id)).toEqual([WED]);
    expect(dates(buildWeeklyOverview([t], "2026-10-12", MON), t.id)).toEqual([]);
    expect(dates(buildWeeklyOverview([t], "2026-09-28", MON), t.id)).toEqual([]);
  });

  it("marks due-date tasks as due and places them once on the due date", () => {
    const t = task(none, { dueDate: FRI });
    const o = buildWeeklyOverview([t], MON, MON);
    expect(dates(o, t.id)).toEqual([FRI]);
    expect(o.days[4].items[0].kind).toBe("due");
    expect(buildWeeklyOverview([task(none, { scheduledDate: FRI })], MON, MON).days[4].items[0].kind).toBe("scheduled");
  });

  it("keeps an incomplete dated task on its original date (no carry-forward, no missed state)", () => {
    const t = task(none, { scheduledDate: "2026-09-29" });
    expect(dates(buildWeeklyOverview([t], "2026-09-28", "2026-10-06"), t.id)).toEqual(["2026-09-29"]);
    expect(dates(buildWeeklyOverview([t], MON, "2026-10-06"), t.id)).toEqual([]);
    expect(buildWeeklyOverview([t], "2026-09-28", "2026-10-06").days[1].items[0].done).toBe(false);
  });

  it("places a dated task before its creation date on that date", () => {
    const t = task(none, { scheduledDate: "2026-10-02", createdOn: TUE });
    expect(dates(buildWeeklyOverview([t], "2026-09-28", TUE), t.id)).toEqual(["2026-10-02"]);
  });

  it("never puts times-per-week or undated tasks in a column", () => {
    const a = task(perWeek(3));
    const b = task(none);
    const o = buildWeeklyOverview([a, b], MON, MON);
    expect(o.days.every((d) => d.items.length === 0)).toBe(true);
  });

  it("keeps the input order (newest first) within a day", () => {
    const a = task(daily);
    const b = task(daily);
    expect(buildWeeklyOverview([b, a], MON, MON).days[0].items.map((i) => i.id)).toEqual([b.id, a.id]);
  });

  it("reflects the current definition after an edit", () => {
    const t = task(monThu);
    expect(dates(buildWeeklyOverview([t], MON, MON), t.id)).toEqual([MON, THU]);
    const edited = { ...t, rule: daily };
    expect(dates(buildWeeklyOverview([edited], MON, MON), t.id)).toHaveLength(7);
  });
});

describe("buildWeeklyOverview done state", () => {
  it("marks a recurring occurrence done on the completed date only", () => {
    const t = task(daily, { done: [TUE] });
    const o = buildWeeklyOverview([t], MON, MON);
    expect(o.days.map((d) => d.items[0].done)).toEqual([false, true, false, false, false, false, false]);
  });

  it("ignores a completion on a day that is not planned", () => {
    const t = task(monThu, { done: [TUE] });
    const o = buildWeeklyOverview([t], MON, MON);
    expect(o.days[1].items).toHaveLength(0);
    expect(o.days.flatMap((d) => d.items).every((i) => !i.done)).toBe(true);
  });

  it("ignores a completion on a day before the creation date", () => {
    const t = task(daily, { createdOn: THU, done: [TUE] });
    expect(buildWeeklyOverview([t], MON, MON).days.flatMap((d) => d.items).some((i) => i.done)).toBe(false);
  });

  it("shows a dated task done on its own date whatever the completion date", () => {
    const t = task(none, { scheduledDate: WED, done: [FRI] });
    const o = buildWeeklyOverview([t], MON, MON);
    expect(o.days[2].items[0].done).toBe(true);
    expect(o.days[4].items).toHaveLength(0);
  });

  it("shows a dated task completed in a different week as done in its dated week", () => {
    const t = task(none, { dueDate: WED, done: ["2026-10-20"] });
    expect(buildWeeklyOverview([t], MON, MON).days[2].items[0].done).toBe(true);
  });

  it("shows a past completion under the new rule after a rule change", () => {
    const t = task(daily, { done: [TUE] }); // was weekday-based, now daily
    expect(buildWeeklyOverview([t], MON, MON).days[1].items[0].done).toBe(true);
  });
});

describe("buildWeeklyOverview weekly frequency", () => {
  it("lists times-per-week tasks with completed of planned", () => {
    const t = task(perWeek(5), { done: [MON, WED] });
    expect(buildWeeklyOverview([t], MON, MON).frequency).toEqual([
      { id: t.id, title: t.title, lifeArea: "Health", completed: 2, planned: 5 },
    ]);
  });

  it("shows 0 of N in a future week and the counts of a past week", () => {
    const t = task(perWeek(3), { done: [MON, TUE, WED] });
    expect(buildWeeklyOverview([t], "2026-10-12", MON).frequency[0]).toMatchObject({ completed: 0, planned: 3 });
    expect(buildWeeklyOverview([t], MON, "2026-10-20").frequency[0]).toMatchObject({ completed: 3, planned: 3 });
  });

  it("uses the reduced target in the creation week", () => {
    const t = task(perWeek(3), { createdOn: "2026-10-10" }); // Saturday
    expect(buildWeeklyOverview([t], MON, MON).frequency[0]).toMatchObject({ completed: 0, planned: 2 });
  });

  it("omits a task whose creation week is after the viewed week", () => {
    const t = task(perWeek(3), { createdOn: "2026-10-12" });
    expect(buildWeeklyOverview([t], MON, MON).frequency).toEqual([]);
  });

  it("never shows more than the target", () => {
    const t = task(perWeek(2), { done: [MON, TUE, WED] });
    expect(buildWeeklyOverview([t], MON, MON).frequency[0]).toMatchObject({ completed: 2, planned: 2 });
  });

  it("keeps the input order", () => {
    const a = task(perWeek(1));
    const b = task(perWeek(2));
    expect(buildWeeklyOverview([b, a], MON, MON).frequency.map((f) => f.id)).toEqual([b.id, a.id]);
  });
});

describe("buildWeeklyOverview open tasks", () => {
  it("lists incomplete undated one-time tasks in every week", () => {
    const t = task(none);
    for (const week of ["2026-09-28", MON, "2026-10-12"]) {
      expect(buildWeeklyOverview([t], week, MON).openTasks.map((o) => o.id)).toEqual([t.id]);
    }
  });

  it("excludes completed, dated and recurring tasks", () => {
    const tasks = [
      task(none, { done: [MON] }),
      task(none, { scheduledDate: WED }),
      task(none, { dueDate: WED }),
      task(daily),
      task(perWeek(2)),
    ];
    expect(buildWeeklyOverview(tasks, MON, MON).openTasks).toEqual([]);
  });

  it("reports whether the user has any task", () => {
    expect(buildWeeklyOverview([], MON, MON).hasTasks).toBe(false);
    expect(buildWeeklyOverview([task(none)], MON, MON).hasTasks).toBe(true);
  });
});

describe("consistency with the shared weekly planned-occurrence definition", () => {
  const mixed = () => [
    task(daily, { done: [MON, TUE, "2026-10-20"] }),
    task(daily, { createdOn: THU, done: [THU, MON] }),
    task(monThu, { done: [MON, TUE] }),
    task(monThu, { createdOn: FRI }),
    task(none, { dueDate: FRI, done: ["2026-10-30"] }),
    task(none, { scheduledDate: WED }),
    task(none, { scheduledDate: "2026-09-02", createdOn: WED }),
    task(none), // open task: contributes nothing
    task(none, { done: [TUE] }),
    task(perWeek(3), { done: [MON, WED] }),
    task(perWeek(2), { createdOn: "2026-10-10", done: ["2026-10-10", SUN] }),
    task(perWeek(4), { createdOn: "2026-10-14", done: ["2026-10-15"] }),
  ];

  for (const weekStart of ["2026-09-21", "2026-09-28", MON, "2026-10-12", "2026-12-28"]) {
    it(`adds up to summarizeWeek for the week of ${weekStart}`, () => {
      const tasks = mixed();
      const o = buildWeeklyOverview(tasks, weekStart, MON);
      const entries = o.days.flatMap((d) => d.items);
      const summary = summarizeWeek(tasks, weekStart);
      expect(entries.length + o.frequency.reduce((n, f) => n + f.planned, 0)).toBe(summary.planned);
      expect(entries.filter((i) => i.done).length + o.frequency.reduce((n, f) => n + f.completed, 0)).toBe(
        summary.completed,
      );
      expect(addDays(weekStart, 6)).toBe(o.weekEnd);
    });
  }

  it("is the 7 + 1 + 3 example of the spec", () => {
    const tasks = [task(daily), task(none, { dueDate: FRI }), task(perWeek(3), { done: [MON] })];
    const o = buildWeeklyOverview(tasks, MON, MON);
    const planned = o.days.flatMap((d) => d.items).length + o.frequency.reduce((n, f) => n + f.planned, 0);
    expect(planned).toBe(11);
  });
});
