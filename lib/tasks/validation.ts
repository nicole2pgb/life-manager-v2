import { LIFE_AREAS, type LifeArea } from "@/db/schema";
import { parseCalendarDate, type CalendarDate } from "@/lib/dates/calendar-date";
import type { RecurrenceRule } from "./recurrence";

export const TITLE_MAX_LENGTH = 255;
export const NOTES_MAX_LENGTH = 5000;

export const DATE_KINDS = ["none", "scheduled", "due"] as const;
export type DateKind = (typeof DATE_KINDS)[number];

// A one-time task has no date, a scheduled date or a due date, never both.
export type TaskSchedule =
  | { kind: "none" }
  | { kind: "scheduled"; date: CalendarDate }
  | { kind: "due"; date: CalendarDate };

export const RECURRENCE_CHOICES = ["none", "daily", "weekdays", "times_per_week"] as const;
export type RecurrenceChoice = (typeof RECURRENCE_CHOICES)[number];

export type TaskFieldErrors = Partial<
  Record<"title" | "notes" | "lifeArea" | "date" | "recurrence" | "weekdays" | "timesPerWeek", string>
>;

export type TaskInput = {
  title: string;
  notes: string;
  lifeArea: string;
  // null = the field was not submitted at all.
  dateKind: string | null;
  date: string | null;
  // null = the field was not submitted at all (an error: forms always send it).
  recurrence: string | null;
  // Raw submitted weekday values; only used for "weekdays".
  weekdays: string[];
  // Raw submitted target; only used for "times_per_week".
  timesPerWeek: string | null;
};

export type ValidTask = {
  title: string;
  notes: string | null;
  lifeArea: LifeArea;
  rule: RecurrenceRule;
  // Only meaningful when rule.type is "none": recurring tasks have no dates.
  // undefined (update only) = leave the task's dates unchanged.
  schedule: TaskSchedule | undefined;
};

function isLifeArea(value: string): value is LifeArea {
  return (LIFE_AREAS as readonly string[]).includes(value);
}

function isDateKind(value: string): value is DateKind {
  return (DATE_KINDS as readonly string[]).includes(value);
}

function isRecurrenceChoice(value: string): value is RecurrenceChoice {
  return (RECURRENCE_CHOICES as readonly string[]).includes(value);
}

const RECURRENCE_ERROR = "Choose how often this task repeats.";

type RuleResult = { rule: RecurrenceRule } | { error: string; field: "recurrence" | "weekdays" | "timesPerWeek" };

// Fields that do not belong to the chosen type are ignored, not stored.
function validateRule(input: TaskInput): RuleResult {
  const choice = input.recurrence;
  if (choice === null || !isRecurrenceChoice(choice)) return { field: "recurrence", error: RECURRENCE_ERROR };
  switch (choice) {
    case "none":
      return { rule: { type: "none" } };
    case "daily":
      return { rule: { type: "daily" } };
    case "weekdays": {
      const days = new Set<number>();
      for (const value of input.weekdays) {
        const trimmed = value.trim();
        if (!/^[1-7]$/.test(trimmed)) return { field: "weekdays", error: "Choose valid weekdays." };
        days.add(Number(trimmed));
      }
      if (days.size === 0) return { field: "weekdays", error: "Choose at least one weekday." };
      return { rule: { type: "weekdays", weekdays: [...days].sort((a, b) => a - b) } };
    }
    case "times_per_week": {
      const value = (input.timesPerWeek ?? "").trim();
      if (!/^[1-7]$/.test(value)) return { field: "timesPerWeek", error: "Enter a whole number from 1 to 7." };
      return { rule: { type: "times_per_week", timesPerWeek: Number(value) } };
    }
  }
}

function validateSchedule(
  dateKind: string | null,
  date: string | null,
  mode: "create" | "update",
): { schedule: TaskSchedule | undefined } | { error: string } {
  if (dateKind === null) {
    return mode === "update" ? { schedule: undefined } : { error: "Choose how this task relates to a date." };
  }
  if (!isDateKind(dateKind)) return { error: "Choose how this task relates to a date." };
  if (dateKind === "none") return { schedule: { kind: "none" } };

  const value = (date ?? "").trim();
  if (!value) return { error: "Choose a date." };
  const parsed = parseCalendarDate(value);
  if (!parsed) return { error: "Enter a valid date." };
  return { schedule: { kind: dateKind, date: parsed } };
}

// Pure and clock-free: a date in the past, today or the future is valid.
export function validateTaskInput(
  input: TaskInput,
  // `allowedAreas`: the life areas the task may be saved in (see lib/settings/life-areas.ts).
  options: { mode: "create" | "update"; allowedAreas: readonly LifeArea[] },
): { ok: true; value: ValidTask } | { ok: false; errors: TaskFieldErrors } {
  const errors: TaskFieldErrors = {};

  const title = input.title.trim();
  if (!title) errors.title = "Title is required.";
  else if (title.length > TITLE_MAX_LENGTH) errors.title = `Title must be at most ${TITLE_MAX_LENGTH} characters.`;

  const notes = input.notes.trim();
  if (notes.length > NOTES_MAX_LENGTH) errors.notes = `Notes must be at most ${NOTES_MAX_LENGTH} characters.`;

  if (!isLifeArea(input.lifeArea)) errors.lifeArea = "Choose a life area.";
  else if (!options.allowedAreas.includes(input.lifeArea)) errors.lifeArea = "Choose one of your selected life areas.";

  const rule = validateRule(input);
  if ("error" in rule) errors[rule.field] = rule.error;

  // Recurring tasks have no dates: a scheduled or due date with recurrence is
  // rejected; "no date" (or no date field at all) is fine.
  let schedule: { schedule: TaskSchedule | undefined } | { error: string } = { schedule: undefined };
  if ("rule" in rule && rule.rule.type !== "none") {
    if (input.dateKind === "scheduled" || input.dateKind === "due") {
      errors.recurrence = "Recurring tasks have no scheduled or due date. Choose \"Does not repeat\" to use a date.";
    }
  } else if ("rule" in rule) {
    schedule = validateSchedule(input.dateKind, input.date, options.mode);
    if ("error" in schedule) errors.date = schedule.error;
  }

  if (
    Object.keys(errors).length > 0 ||
    !isLifeArea(input.lifeArea) ||
    "error" in rule ||
    "error" in schedule
  ) {
    return { ok: false, errors };
  }
  return {
    ok: true,
    value: {
      title,
      notes: notes === "" ? null : notes,
      lifeArea: input.lifeArea,
      rule: rule.rule,
      schedule: schedule.schedule,
    },
  };
}

// Task ids come from forms and URLs; anything but a positive integer is "not found".
export function parseTaskId(value: unknown): number | null {
  if (typeof value !== "string" || !/^[1-9]\d*$/.test(value)) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) ? id : null;
}
