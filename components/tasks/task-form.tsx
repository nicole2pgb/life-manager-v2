"use client";

import { startTransition, useActionState, useState, type FormEvent } from "react";
import Link from "next/link";
import type { TaskFormState } from "@/lib/tasks/form-state";
import { SubmitButton } from "@/components/ui/submit-button";

export type TaskFormValues = {
  title: string;
  notes: string;
  lifeArea: string;
  dateKind: "none" | "scheduled" | "due";
  date: string;
  recurrence: "none" | "daily" | "weekdays" | "times_per_week";
  // ISO weekday numbers as strings ("1" = Monday ... "7" = Sunday).
  weekdays: string[];
  timesPerWeek: string;
};

const inputClass =
  "w-full rounded-lg border border-border bg-background px-3 text-sm placeholder:text-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/40 aria-[invalid=true]:border-danger";

const pillClass =
  "inline-flex cursor-pointer items-center justify-center rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium transition peer-checked:border-accent peer-checked:bg-accent peer-checked:text-accent-foreground peer-focus-visible:ring-2 peer-focus-visible:ring-accent/60";

const DATE_OPTIONS = [
  { value: "none", label: "No date", hint: "Not tied to a day." },
  { value: "scheduled", label: "Scheduled for", hint: "Happens on this day." },
  { value: "due", label: "Due by", hint: "Deadline for this task." },
] as const;

const RECURRENCE_OPTIONS = [
  { value: "none", label: "Does not repeat", hint: "A one-time task." },
  { value: "daily", label: "Every day", hint: "Shows up daily." },
  { value: "weekdays", label: "Specific weekdays", hint: "Pick the days." },
  { value: "times_per_week", label: "Times per week", hint: "A weekly target, any days." },
] as const;

const WEEKDAY_OPTIONS = [
  { value: "1", short: "Mon", label: "Monday" },
  { value: "2", short: "Tue", label: "Tuesday" },
  { value: "3", short: "Wed", label: "Wednesday" },
  { value: "4", short: "Thu", label: "Thursday" },
  { value: "5", short: "Fri", label: "Friday" },
  { value: "6", short: "Sat", label: "Saturday" },
  { value: "7", short: "Sun", label: "Sunday" },
] as const;

function FieldError({ id, message }: { id: string; message?: string }) {
  return message ? (
    <p id={id} className="text-sm text-danger">
      {message}
    </p>
  ) : null;
}

export function TaskForm({
  action,
  initial,
  lifeAreas,
  submitLabel,
  taskId,
  dateLocked,
  historyLocked,
}: {
  action: (prev: TaskFormState, data: FormData) => Promise<TaskFormState>;
  initial: TaskFormValues;
  // Passed in by the server page so this client component does not import the DB schema.
  lifeAreas: readonly string[];
  submitLabel: string;
  taskId?: number;
  // Completed tasks keep their date: it is shown read-only and not submitted.
  dateLocked?: { label: string | null };
  // A recurring task with completion history cannot become a one-time task.
  // Convenience only: the server enforces it independently.
  historyLocked?: boolean;
}) {
  const [state, formAction, isPending] = useActionState(action, null);
  const errors = state?.errors;

  const [title, setTitle] = useState(initial.title);
  const [notes, setNotes] = useState(initial.notes);
  const [lifeArea, setLifeArea] = useState(initial.lifeArea);
  const [dateKind, setDateKind] = useState<TaskFormValues["dateKind"]>(initial.dateKind);
  const [date, setDate] = useState(initial.date);
  const [recurrence, setRecurrence] = useState<TaskFormValues["recurrence"]>(initial.recurrence);
  const [weekdays, setWeekdays] = useState<string[]>(initial.weekdays);
  const [timesPerWeek, setTimesPerWeek] = useState(initial.timesPerWeek);

  // Submitted through onSubmit instead of the form's `action` prop: React resets
  // a form after an `action` completes, which would put the controlled radios
  // (recurrence, date choice, life area) back to their initial DOM state while
  // the component state, and the fields shown, have moved on.
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    startTransition(() => formAction(data));
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
      {taskId !== undefined ? <input type="hidden" name="taskId" value={taskId} /> : null}

      {errors?.form ? (
        <p role="alert" className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
          {errors.form}
        </p>
      ) : null}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="title" className="text-sm font-medium">
          Title
        </label>
        <input
          id="title"
          name="title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="What needs your attention?"
          autoComplete="off"
          autoFocus
          aria-invalid={errors?.title ? true : undefined}
          aria-describedby={errors?.title ? "title-error" : undefined}
          className={`${inputClass} h-11`}
        />
        <FieldError id="title-error" message={errors?.title} />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="notes" className="text-sm font-medium">
          Notes <span className="font-normal text-muted">(optional)</span>
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={4}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Add useful context"
          aria-invalid={errors?.notes ? true : undefined}
          aria-describedby={errors?.notes ? "notes-error" : undefined}
          className={`${inputClass} py-2`}
        />
        <FieldError id="notes-error" message={errors?.notes} />
      </div>

      <fieldset
        className="flex flex-col gap-2"
        aria-describedby={errors?.recurrence ? "recurrence-error" : undefined}
      >
        <legend className="text-sm font-medium">Repeats</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {RECURRENCE_OPTIONS.map((option) => {
            const disabled = option.value === "none" && historyLocked;
            return (
              <div key={option.value} className="flex flex-col gap-1">
                <label className={`relative flex flex-col ${disabled ? "opacity-50" : ""}`}>
                  <input
                    type="radio"
                    name="recurrence"
                    value={option.value}
                    checked={recurrence === option.value}
                    disabled={disabled}
                    onChange={() => setRecurrence(option.value)}
                    aria-describedby={`recurrence-${option.value}-hint`}
                    className="peer sr-only"
                  />
                  <span className={`${pillClass} ${disabled ? "cursor-not-allowed" : ""}`}>{option.label}</span>
                </label>
                <span id={`recurrence-${option.value}-hint`} className="px-1 text-xs text-muted">
                  {disabled
                    ? "Not available: this task can't be converted to one-time while recurring completion history exists. Create a new one-time task instead."
                    : option.hint}
                </span>
              </div>
            );
          })}
        </div>
        {recurrence === "weekdays" ? (
          <div className="flex flex-col gap-1.5">
            <span id="weekdays-label" className="text-sm font-medium">
              Days
            </span>
            <div
              role="group"
              aria-labelledby="weekdays-label"
              aria-describedby={errors?.weekdays ? "weekdays-error" : undefined}
              className="flex flex-wrap gap-2"
            >
              {WEEKDAY_OPTIONS.map((day) => (
                <label key={day.value} className="relative">
                  <input
                    type="checkbox"
                    name="weekdays"
                    value={day.value}
                    checked={weekdays.includes(day.value)}
                    onChange={(e) =>
                      setWeekdays((current) =>
                        e.target.checked ? [...current, day.value] : current.filter((v) => v !== day.value),
                      )
                    }
                    aria-label={day.label}
                    className="peer sr-only"
                  />
                  <span className={`${pillClass} min-w-12`}>{day.short}</span>
                </label>
              ))}
            </div>
            <FieldError id="weekdays-error" message={errors?.weekdays} />
          </div>
        ) : null}
        {recurrence === "times_per_week" ? (
          <div className="flex flex-col gap-1.5">
            <label htmlFor="timesPerWeek" className="text-sm font-medium">
              Times per week
            </label>
            <input
              id="timesPerWeek"
              name="timesPerWeek"
              type="number"
              inputMode="numeric"
              min={1}
              max={7}
              step={1}
              value={timesPerWeek}
              onChange={(e) => setTimesPerWeek(e.target.value)}
              aria-invalid={errors?.timesPerWeek ? true : undefined}
              aria-describedby={errors?.timesPerWeek ? "timesPerWeek-error" : undefined}
              className={`${inputClass} h-11 sm:w-32`}
            />
            <FieldError id="timesPerWeek-error" message={errors?.timesPerWeek} />
          </div>
        ) : null}
        <FieldError id="recurrence-error" message={errors?.recurrence} />
      </fieldset>

      {recurrence === "none" ? (
      <fieldset
        className="flex flex-col gap-2"
        aria-describedby={errors?.date ? "date-error" : undefined}
      >
        <legend className="text-sm font-medium">Date</legend>
        {dateLocked ? (
          <div>
            <p className="text-sm">{dateLocked.label ?? "No date"}</p>
            <p className="mt-1 text-xs text-muted">Mark the task as incomplete to change its date.</p>
            <FieldError id="date-error" message={errors?.date} />
          </div>
        ) : (
          <>
            <div className="grid gap-2 sm:grid-cols-3">
              {DATE_OPTIONS.map((option) => (
                <div key={option.value} className="flex flex-col gap-1">
                  <label className="relative flex flex-col">
                    <input
                      type="radio"
                      name="dateKind"
                      value={option.value}
                      checked={dateKind === option.value}
                      onChange={() => setDateKind(option.value)}
                      aria-describedby={`date-kind-${option.value}-hint`}
                      className="peer sr-only"
                    />
                    <span className={pillClass}>{option.label}</span>
                  </label>
                  <span id={`date-kind-${option.value}-hint`} className="px-1 text-xs text-muted">
                    {option.hint}
                  </span>
                </div>
              ))}
            </div>
            {dateKind !== "none" ? (
              <div className="flex flex-col gap-1.5">
                <label htmlFor="date" className="text-sm font-medium">
                  {dateKind === "scheduled" ? "Scheduled for" : "Due by"}
                </label>
                <input
                  id="date"
                  name="date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  aria-invalid={errors?.date ? true : undefined}
                  aria-describedby={errors?.date ? "date-error" : undefined}
                  className={`${inputClass} h-11 sm:w-56`}
                />
              </div>
            ) : null}
            <FieldError id="date-error" message={errors?.date} />
          </>
        )}
      </fieldset>
      ) : null}

      <fieldset
        className="flex flex-col gap-2"
        aria-describedby={errors?.lifeArea ? "lifeArea-error" : undefined}
      >
        <legend className="text-sm font-medium">Life area</legend>
        <div className="flex flex-wrap gap-2">
          {lifeAreas.map((area) => (
            <label key={area} className="relative">
              <input
                type="radio"
                name="lifeArea"
                value={area}
                checked={lifeArea === area}
                onChange={() => setLifeArea(area)}
                className="peer sr-only"
              />
              <span className={pillClass}>{area}</span>
            </label>
          ))}
        </div>
        <FieldError id="lifeArea-error" message={errors?.lifeArea} />
      </fieldset>

      <div className="flex items-center justify-end gap-3 pt-1">
        <Link href="/tasks" className="rounded-lg px-3 py-2 text-sm font-semibold hover:text-accent">
          Cancel
        </Link>
        <div className="min-w-36">
          <SubmitButton pending={isPending}>{submitLabel}</SubmitButton>
        </div>
      </div>
    </form>
  );
}
