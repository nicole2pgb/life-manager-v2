import { describe, expect, it } from "vitest";
import { todayFor } from "@/lib/dates/calendar-date";
import {
  cappedWeekCount,
  formatRecurrence,
  isRelevantOn,
  weekCountLabel,
  type RecurrenceRule,
} from "./recurrence";

const none = new Set<string>();
const days = (...dates: string[]) => ({ completionDatesInWeek: new Set(dates) });

const monThu: RecurrenceRule = { type: "weekdays", weekdays: [1, 4] };
const daily: RecurrenceRule = { type: "daily" };
const gym3: RecurrenceRule = { type: "times_per_week", timesPerWeek: 3 };

describe("isRelevantOn", () => {
  it("never governs a one-time task", () => {
    expect(isRelevantOn({ type: "none" }, "2026-10-05", { completionDatesInWeek: none })).toBe(false);
  });
  it("daily is relevant on every date", () => {
    for (const date of ["2026-10-05", "2026-10-06", "2026-10-11", "2026-12-31", "2028-02-29"]) {
      expect(isRelevantOn(daily, date, { completionDatesInWeek: none })).toBe(true);
    }
  });
  it("weekdays are relevant only on the selected days", () => {
    const ctx = { completionDatesInWeek: none };
    expect(isRelevantOn(monThu, "2026-10-05", ctx)).toBe(true); // Monday
    expect(isRelevantOn(monThu, "2026-10-06", ctx)).toBe(false); // Tuesday
    expect(isRelevantOn(monThu, "2026-10-08", ctx)).toBe(true); // Thursday
    expect(isRelevantOn(monThu, "2026-10-11", ctx)).toBe(false); // Sunday
  });
  it("a Sunday-only task is relevant on Sundays", () => {
    expect(isRelevantOn({ type: "weekdays", weekdays: [7] }, "2026-10-11", { completionDatesInWeek: none })).toBe(true);
  });
  it("times per week is relevant at 0, 1 and 2 of 3", () => {
    expect(isRelevantOn(gym3, "2026-10-07", days())).toBe(true);
    expect(isRelevantOn(gym3, "2026-10-07", days("2026-10-05"))).toBe(true);
    expect(isRelevantOn(gym3, "2026-10-08", days("2026-10-05", "2026-10-07"))).toBe(true);
  });
  it("times per week is not relevant on days without a completion once the target is reached", () => {
    const done = days("2026-10-05", "2026-10-07", "2026-10-09");
    expect(isRelevantOn(gym3, "2026-10-10", done)).toBe(false);
    expect(isRelevantOn(gym3, "2026-10-11", done)).toBe(false);
  });
  it("a completed occurrence stays relevant on its own day", () => {
    expect(isRelevantOn(gym3, "2026-10-09", days("2026-10-05", "2026-10-07", "2026-10-09"))).toBe(true);
  });
  it("a new week starts counting again", () => {
    // The caller passes only the new week's completions.
    expect(isRelevantOn(gym3, "2026-10-12", days())).toBe(true);
  });
  it("a lowered target below the stored count is reached", () => {
    const rule: RecurrenceRule = { type: "times_per_week", timesPerWeek: 2 };
    const done = days("2026-10-05", "2026-10-06", "2026-10-07");
    expect(isRelevantOn(rule, "2026-10-08", done)).toBe(false);
  });
  it("judges the Berlin day, not the UTC day", () => {
    // 2026-10-01 22:30 UTC is already Friday 2026-10-02 in Berlin.
    const today = todayFor("Europe/Berlin", new Date("2026-10-01T22:30:00Z"));
    expect(today).toBe("2026-10-02");
    expect(isRelevantOn({ type: "weekdays", weekdays: [5] }, today, { completionDatesInWeek: none })).toBe(true);
    expect(isRelevantOn({ type: "weekdays", weekdays: [4] }, today, { completionDatesInWeek: none })).toBe(false);
  });
  it("does not depend on creation time (the signature has no creation input)", () => {
    expect(isRelevantOn.length).toBe(3);
  });
});

describe("formatRecurrence and week counts", () => {
  it("words each rule", () => {
    expect(formatRecurrence({ type: "none" })).toBeNull();
    expect(formatRecurrence(daily)).toBe("Every day");
    expect(formatRecurrence(monThu)).toBe("Mon, Thu");
    expect(formatRecurrence(gym3)).toBe("3 times per week");
    expect(formatRecurrence({ type: "times_per_week", timesPerWeek: 1 })).toBe("1 time per week");
  });
  it("never shows a count above the target", () => {
    expect(cappedWeekCount(3, 2)).toBe(2);
    expect(weekCountLabel(3, 2)).toBe("2 of 2 this week");
    expect(weekCountLabel(0, 3)).toBe("0 of 3 this week");
    expect(weekCountLabel(2, 3)).toBe("2 of 3 this week");
  });
});
