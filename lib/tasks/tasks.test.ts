import { describe, expect, it } from "vitest";
import { LIFE_AREAS } from "@/db/schema";
import { parseTaskId, validateTaskInput, type TaskInput } from "./validation";

const base: TaskInput = {
  title: "Book dentist",
  notes: "",
  lifeArea: "Health",
  dateKind: "none",
  date: null,
  recurrence: "none",
  weekdays: [],
  timesPerWeek: null,
};

const create = (overrides: Partial<TaskInput> = {}) =>
  validateTaskInput({ ...base, ...overrides }, { mode: "create", allowedAreas: LIFE_AREAS });
const update = (overrides: Partial<TaskInput> = {}) =>
  validateTaskInput({ ...base, ...overrides }, { mode: "update", allowedAreas: LIFE_AREAS });

function errorsOf(result: ReturnType<typeof create>) {
  if (result.ok) throw new Error("expected validation errors");
  return result.errors;
}
function valueOf(result: ReturnType<typeof create>) {
  if (!result.ok) throw new Error(`expected valid input, got ${JSON.stringify(result.errors)}`);
  return result.value;
}

describe("dates on create", () => {
  it("accepts a task without a date", () => {
    expect(valueOf(create()).schedule).toEqual({ kind: "none" });
  });
  it("accepts scheduled for today, a future date and a past date", () => {
    // The validator has no clock: past, today and future are all just valid dates.
    for (const date of ["2026-10-01", "2026-10-02", "2031-05-17", "2020-01-01"]) {
      expect(valueOf(create({ dateKind: "scheduled", date })).schedule).toEqual({ kind: "scheduled", date });
    }
  });
  it("accepts a due date of today, in the future and in the past", () => {
    for (const date of ["2026-10-01", "2026-12-24", "2020-01-01"]) {
      expect(valueOf(create({ dateKind: "due", date })).schedule).toEqual({ kind: "due", date });
    }
  });
  it("keeps scheduled and due dates apart", () => {
    const scheduled = valueOf(create({ dateKind: "scheduled", date: "2026-10-10" })).schedule;
    const due = valueOf(create({ dateKind: "due", date: "2026-10-10" })).schedule;
    expect(scheduled).toEqual({ kind: "scheduled", date: "2026-10-10" });
    expect(due).toEqual({ kind: "due", date: "2026-10-10" });
  });
  it("requires a date for scheduled and due", () => {
    for (const dateKind of ["scheduled", "due"]) {
      for (const date of [null, "", "   "]) {
        expect(errorsOf(create({ dateKind, date })).date).toBeDefined();
      }
    }
  });
  it("rejects invalid and wrongly formatted dates", () => {
    for (const date of ["2026-02-30", "2026-13-01", "2026-1-5", "05.10.2026", "tomorrow", "2027-02-29"]) {
      expect(errorsOf(create({ dateKind: "due", date })).date).toBeDefined();
    }
  });
  it("accepts a leap day", () => {
    expect(valueOf(create({ dateKind: "scheduled", date: "2028-02-29" })).schedule).toEqual({
      kind: "scheduled",
      date: "2028-02-29",
    });
  });
  it("accepts the DATE limits and rejects dates outside them", () => {
    for (const date of ["1000-01-01", "9999-12-31"]) {
      expect(create({ dateKind: "due", date }).ok).toBe(true);
    }
    for (const date of ["0999-12-31", "10000-01-01"]) {
      expect(errorsOf(create({ dateKind: "due", date })).date).toBeDefined();
    }
  });
  it("ignores a leftover date when the choice is no date", () => {
    expect(valueOf(create({ dateKind: "none", date: "2026-10-10" })).schedule).toEqual({ kind: "none" });
    expect(valueOf(create({ dateKind: "none", date: "garbage" })).schedule).toEqual({ kind: "none" });
  });
  it("rejects an unknown or missing date choice on create", () => {
    expect(errorsOf(create({ dateKind: "overdue", date: "2026-10-10" })).date).toBeDefined();
    expect(errorsOf(create({ dateKind: null })).date).toBeDefined();
  });
});

describe("dates on update", () => {
  it("leaves the dates unchanged when no date choice is submitted", () => {
    expect(valueOf(update({ dateKind: null, date: null })).schedule).toBeUndefined();
  });
  it("still rejects an unknown date choice", () => {
    expect(errorsOf(update({ dateKind: "overdue" })).date).toBeDefined();
  });
  it("can change a date, switch between scheduled and due, and remove a date", () => {
    expect(valueOf(update({ dateKind: "scheduled", date: "2026-11-01" })).schedule).toEqual({
      kind: "scheduled",
      date: "2026-11-01",
    });
    expect(valueOf(update({ dateKind: "due", date: "2026-11-01" })).schedule).toEqual({
      kind: "due",
      date: "2026-11-01",
    });
    expect(valueOf(update({ dateKind: "none" })).schedule).toEqual({ kind: "none" });
  });
  it("accepts a date in the past", () => {
    expect(update({ dateKind: "due", date: "2020-02-02" }).ok).toBe(true);
  });
});

describe("allowed life areas", () => {
  const only = (areas: (typeof LIFE_AREAS)[number][], mode: "create" | "update", lifeArea: string) =>
    validateTaskInput({ ...base, lifeArea }, { mode, allowedAreas: areas });

  it("rejects a known area that is not allowed", () => {
    const result = only(["Health", "Learning"], "create", "Finance");
    if (result.ok) throw new Error("expected validation errors");
    expect(result.errors.lifeArea).toMatch(/selected life areas/);
  });
  it("accepts an allowed area", () => {
    expect(only(["Health", "Learning"], "create", "Learning").ok).toBe(true);
  });
  it("still reports unknown values as invalid", () => {
    const result = only(["Health"], "update", "Hobbies");
    if (result.ok) throw new Error("expected validation errors");
    expect(result.errors.lifeArea).toBe("Choose a life area.");
  });
  it("accepts an unchanged area on edit when the caller allows it", () => {
    expect(only(["Health", "Finance"], "update", "Finance").ok).toBe(true);
  });
});

describe("title, notes and life area", () => {
  it("trims the title and notes", () => {
    const value = valueOf(create({ title: "  Call mom  ", notes: "  hi  " }));
    expect(value.title).toBe("Call mom");
    expect(value.notes).toBe("hi");
  });
  it("rejects a blank title", () => {
    for (const title of ["", "   "]) expect(errorsOf(create({ title })).title).toBeDefined();
  });
  it("limits the title to 255 characters", () => {
    expect(create({ title: "a".repeat(255) }).ok).toBe(true);
    expect(errorsOf(create({ title: "a".repeat(256) })).title).toBeDefined();
  });
  it("limits notes to 5000 characters and stores blank notes as null", () => {
    expect(create({ notes: "a".repeat(5000) }).ok).toBe(true);
    expect(errorsOf(create({ notes: "a".repeat(5001) })).notes).toBeDefined();
    expect(valueOf(create({ notes: "   \n " })).notes).toBeNull();
  });
  it("accepts every life area and rejects others", () => {
    for (const lifeArea of LIFE_AREAS) expect(create({ lifeArea }).ok).toBe(true);
    for (const lifeArea of ["", "Hobbies", "health"]) {
      expect(errorsOf(create({ lifeArea })).lifeArea).toBeDefined();
    }
  });
  it("reports several errors at once", () => {
    const errors = errorsOf(create({ title: "", lifeArea: "x", dateKind: "due", date: null }));
    expect(Object.keys(errors).sort()).toEqual(["date", "lifeArea", "title"]);
  });
});

describe("parseTaskId", () => {
  it("accepts positive integers", () => {
    expect(parseTaskId("1")).toBe(1);
    expect(parseTaskId("42")).toBe(42);
  });
  it("rejects everything else", () => {
    for (const value of ["0", "-3", "abc", "1.5", "", "01", " 1", "1e3", "99999999999999999999", null, undefined, 1]) {
      expect(parseTaskId(value)).toBeNull();
    }
  });
});

describe("recurrence rules", () => {
  it("keeps one-time tasks one-time", () => {
    expect(valueOf(create()).rule).toEqual({ type: "none" });
  });
  it("accepts daily and ignores stray weekdays and target", () => {
    const value = valueOf(create({ recurrence: "daily", weekdays: ["1", "2"], timesPerWeek: "3" }));
    expect(value.rule).toEqual({ type: "daily" });
    expect(value.schedule).toBeUndefined();
  });
  it("accepts weekdays, normalizing to sorted distinct ISO numbers", () => {
    expect(valueOf(create({ recurrence: "weekdays", weekdays: ["4", "1", "1"] })).rule).toEqual({
      type: "weekdays",
      weekdays: [1, 4],
    });
    expect(valueOf(create({ recurrence: "weekdays", weekdays: ["7"], timesPerWeek: "9" })).rule).toEqual({
      type: "weekdays",
      weekdays: [7],
    });
  });
  it("rejects weekdays without a selection or with invalid values", () => {
    expect(errorsOf(create({ recurrence: "weekdays", weekdays: [] })).weekdays).toBeDefined();
    for (const bad of ["0", "8", "abc", "", "1.5", "-1", "01"]) {
      expect(errorsOf(create({ recurrence: "weekdays", weekdays: ["1", bad] })).weekdays).toBeDefined();
    }
  });
  it("accepts times per week from 1 to 7 and ignores stray weekdays", () => {
    for (const n of [1, 2, 7]) {
      expect(valueOf(create({ recurrence: "times_per_week", timesPerWeek: String(n), weekdays: ["1"] })).rule).toEqual({
        type: "times_per_week",
        timesPerWeek: n,
      });
    }
  });
  it("rejects a malformed or out-of-range weekly target", () => {
    for (const bad of ["0", "8", "2.5", "two", "", "  ", "-1", "10", null]) {
      expect(errorsOf(create({ recurrence: "times_per_week", timesPerWeek: bad })).timesPerWeek).toBeDefined();
    }
  });
  it("rejects an unknown or missing recurrence type on create and update", () => {
    for (const recurrence of ["monthly", "", "DAILY", null]) {
      expect(errorsOf(create({ recurrence })).recurrence).toBeDefined();
      expect(errorsOf(update({ recurrence })).recurrence).toBeDefined();
    }
  });
  it("rejects recurrence combined with a scheduled or due date", () => {
    for (const recurrence of ["daily", "weekdays", "times_per_week"]) {
      for (const dateKind of ["scheduled", "due"]) {
        const errors = errorsOf(
          create({ recurrence, dateKind, date: "2026-10-10", weekdays: ["1"], timesPerWeek: "3" }),
        );
        expect(errors.recurrence).toBeDefined();
      }
    }
  });
  it("accepts recurrence with 'no date' or no date field", () => {
    expect(valueOf(create({ recurrence: "daily", dateKind: "none" })).rule).toEqual({ type: "daily" });
    expect(valueOf(update({ recurrence: "daily", dateKind: null })).rule).toEqual({ type: "daily" });
  });
  it("does not use the date for recurring tasks, even an invalid one with no date choice", () => {
    expect(valueOf(create({ recurrence: "daily", dateKind: "none", date: "nonsense" })).rule).toEqual({ type: "daily" });
  });
  it("still validates the other fields for recurring tasks", () => {
    const errors = errorsOf(create({ recurrence: "daily", title: " ", lifeArea: "x" }));
    expect(errors.title).toBeDefined();
    expect(errors.lifeArea).toBeDefined();
  });
});
