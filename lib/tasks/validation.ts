import { LIFE_AREAS, type LifeArea } from "@/db/schema";
import { parseCalendarDate, type CalendarDate } from "@/lib/dates/calendar-date";

export const TITLE_MAX_LENGTH = 255;
export const NOTES_MAX_LENGTH = 5000;

export const DATE_KINDS = ["none", "scheduled", "due"] as const;
export type DateKind = (typeof DATE_KINDS)[number];

// A one-time task has no date, a scheduled date or a due date, never both.
export type TaskSchedule =
  | { kind: "none" }
  | { kind: "scheduled"; date: CalendarDate }
  | { kind: "due"; date: CalendarDate };

export type TaskFieldErrors = Partial<Record<"title" | "notes" | "lifeArea" | "date", string>>;

export type TaskInput = {
  title: string;
  notes: string;
  lifeArea: string;
  // null = the field was not submitted at all.
  dateKind: string | null;
  date: string | null;
};

export type ValidTask = {
  title: string;
  notes: string | null;
  lifeArea: LifeArea;
  // undefined (update only) = leave the task's dates unchanged.
  schedule: TaskSchedule | undefined;
};

function isLifeArea(value: string): value is LifeArea {
  return (LIFE_AREAS as readonly string[]).includes(value);
}

function isDateKind(value: string): value is DateKind {
  return (DATE_KINDS as readonly string[]).includes(value);
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
  options: { mode: "create" | "update" },
): { ok: true; value: ValidTask } | { ok: false; errors: TaskFieldErrors } {
  const errors: TaskFieldErrors = {};

  const title = input.title.trim();
  if (!title) errors.title = "Title is required.";
  else if (title.length > TITLE_MAX_LENGTH) errors.title = `Title must be at most ${TITLE_MAX_LENGTH} characters.`;

  const notes = input.notes.trim();
  if (notes.length > NOTES_MAX_LENGTH) errors.notes = `Notes must be at most ${NOTES_MAX_LENGTH} characters.`;

  if (!isLifeArea(input.lifeArea)) errors.lifeArea = "Choose a life area.";

  const schedule = validateSchedule(input.dateKind, input.date, options.mode);
  if ("error" in schedule) errors.date = schedule.error;

  if (Object.keys(errors).length > 0 || !isLifeArea(input.lifeArea) || "error" in schedule) {
    return { ok: false, errors };
  }
  return {
    ok: true,
    value: {
      title,
      notes: notes === "" ? null : notes,
      lifeArea: input.lifeArea,
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
