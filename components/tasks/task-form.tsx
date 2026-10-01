"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import type { TaskFormState } from "@/lib/tasks/form-state";
import { SubmitButton } from "@/components/ui/submit-button";

export type TaskFormValues = {
  title: string;
  notes: string;
  lifeArea: string;
  dateKind: "none" | "scheduled" | "due";
  date: string;
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
}: {
  action: (prev: TaskFormState, data: FormData) => Promise<TaskFormState>;
  initial: TaskFormValues;
  // Passed in by the server page so this client component does not import the DB schema.
  lifeAreas: readonly string[];
  submitLabel: string;
  taskId?: number;
  // Completed tasks keep their date: it is shown read-only and not submitted.
  dateLocked?: { label: string | null };
}) {
  const [state, formAction] = useActionState(action, null);
  const errors = state?.errors;

  const [title, setTitle] = useState(initial.title);
  const [notes, setNotes] = useState(initial.notes);
  const [lifeArea, setLifeArea] = useState(initial.lifeArea);
  const [dateKind, setDateKind] = useState<TaskFormValues["dateKind"]>(initial.dateKind);
  const [date, setDate] = useState(initial.date);

  return (
    <form action={formAction} className="flex flex-col gap-5" noValidate>
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
          <SubmitButton>{submitLabel}</SubmitButton>
        </div>
      </div>
    </form>
  );
}
