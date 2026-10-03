"use client";

import { startTransition, useActionState, useState, type FormEvent } from "react";
import { LIFE_AREAS, THEME_COLORS, WEEK_STARTS, type LifeArea, type ThemeColor, type WeekStart } from "@/db/schema";
import type { SettingsFormState } from "@/lib/settings/form-state";
import { THEME_SWATCHES } from "@/lib/settings/themes";
import type { SettingsValues } from "@/lib/settings/validation";
import { SubmitButton } from "@/components/ui/submit-button";

const cardClass = "rounded-2xl border border-border bg-surface p-6";
const choiceClass =
  "inline-flex w-full cursor-pointer items-center gap-3 rounded-lg border border-border bg-background px-4 py-3 text-sm font-medium transition peer-checked:border-accent peer-checked:bg-accent/10 peer-focus-visible:ring-2 peer-focus-visible:ring-accent/60";
const pillClass =
  "inline-flex cursor-pointer items-center justify-center rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium transition peer-checked:border-accent peer-checked:bg-accent peer-checked:text-accent-foreground peer-focus-visible:ring-2 peer-focus-visible:ring-accent/60";
const inputClass =
  "h-11 rounded-lg border border-border bg-background px-3 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/40 aria-[invalid=true]:border-danger";

function FieldError({ id, message }: { id: string; message?: string }) {
  return message ? (
    <p id={id} className="mt-2 text-sm text-danger">
      {message}
    </p>
  ) : null;
}

export function SettingsForm({
  initial,
  action,
}: {
  initial: SettingsValues;
  action: (prev: SettingsFormState, data: FormData) => Promise<SettingsFormState>;
}) {
  const [theme, setTheme] = useState<ThemeColor>(initial.themeColor);
  const [weekStart, setWeekStart] = useState<WeekStart>(initial.weekStart);
  const [checkInOn, setCheckInOn] = useState(initial.dailyCheckInEnabled);
  const [time, setTime] = useState(initial.dailyCheckInTime);
  const [areas, setAreas] = useState<LifeArea[]>(initial.lifeAreas);
  // The confirmation only describes the last save; any later edit hides it.
  const [dirty, setDirty] = useState(false);

  const [state, formAction, isPending] = useActionState(async (prev: SettingsFormState, data: FormData) => {
    const next = await action(prev, data);
    setDirty(false);
    return next;
  }, null);
  const errors = state?.errors;

  // Submitted through onSubmit instead of the form's `action` prop: React resets
  // a form after an `action` completes, which puts the controlled radios,
  // checkboxes and select back to their initial DOM state while the state
  // (and the saved theme) has moved on. Dispatching the action ourselves keeps
  // the controls showing what was just saved.
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    startTransition(() => formAction(data));
  };

  const toggleArea = (area: LifeArea) =>
    setAreas((current) => (current.includes(area) ? current.filter((a) => a !== area) : [...current, area]));

  return (
    <form onSubmit={handleSubmit} onChange={() => setDirty(true)} className="mt-6 flex flex-col gap-6">
      <section className={cardClass}>
        <fieldset aria-describedby={errors?.themeColor ? "themeColor-error" : undefined}>
          <legend className="text-lg font-semibold">Theme color</legend>
          <p className="mt-1 text-sm text-muted">Choose the accent used across Life Manager</p>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
            {THEME_COLORS.map((color) => (
              <label key={color} className="relative">
                <input
                  type="radio"
                  name="themeColor"
                  value={color}
                  checked={theme === color}
                  onChange={() => setTheme(color)}
                  className="peer sr-only"
                />
                <span className={choiceClass}>
                  <span
                    aria-hidden
                    className="h-4 w-4 shrink-0 rounded-full"
                    style={{ backgroundColor: THEME_SWATCHES[color] }}
                  />
                  {color}
                </span>
              </label>
            ))}
          </div>
          <FieldError id="themeColor-error" message={errors?.themeColor} />
        </fieldset>
      </section>

      <section className={cardClass}>
        <h2 className="text-lg font-semibold">Weekly rhythm</h2>
        <p className="mt-1 text-sm text-muted">Your planning preferences</p>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <label htmlFor="weekStart" className="text-sm font-semibold">
              Week starts on
            </label>
            <p className="text-xs text-muted">Used across Weekly overview and Progress</p>
          </div>
          <select
            id="weekStart"
            name="weekStart"
            value={weekStart}
            onChange={(event) => setWeekStart(event.target.value as WeekStart)}
            aria-invalid={errors?.weekStart ? true : undefined}
            aria-describedby={errors?.weekStart ? "weekStart-error" : undefined}
            className={`${inputClass} w-40`}
          >
            {WEEK_STARTS.map((day) => (
              <option key={day} value={day}>
                {day}
              </option>
            ))}
          </select>
        </div>
        <FieldError id="weekStart-error" message={errors?.weekStart} />

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5">
          <div>
            <label htmlFor="dailyCheckInTime" className="text-sm font-semibold">
              Daily check-in
            </label>
            <p id="checkin-note" className="text-xs text-muted">
              Preference only: the reminder is not actually delivered yet
            </p>
          </div>
          <div className="flex items-center gap-2">
            <input
              id="dailyCheckInTime"
              name="dailyCheckInTime"
              type="time"
              value={time}
              onChange={(event) => setTime(event.target.value)}
              aria-invalid={errors?.dailyCheckInTime ? true : undefined}
              aria-describedby={`checkin-note${errors?.dailyCheckInTime ? " dailyCheckInTime-error" : ""}`}
              className={`${inputClass} w-28 ${checkInOn ? "" : "opacity-60"}`}
            />
            <input type="hidden" name="dailyCheckInEnabled" value={checkInOn ? "true" : "false"} />
            <button
              type="button"
              role="switch"
              aria-checked={checkInOn}
              aria-label="Daily check-in"
              onClick={() => {
                setCheckInOn((on) => !on);
                setDirty(true);
              }}
              className={`inline-flex h-11 w-16 items-center justify-center rounded-lg border text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 ${
                checkInOn ? "border-accent bg-accent text-accent-foreground" : "border-border bg-background"
              }`}
            >
              {checkInOn ? "On" : "Off"}
            </button>
          </div>
        </div>
        <FieldError id="dailyCheckInTime-error" message={errors?.dailyCheckInTime} />
        <FieldError id="dailyCheckInEnabled-error" message={errors?.dailyCheckInEnabled} />
      </section>

      <section className={cardClass}>
        <fieldset aria-describedby={errors?.lifeAreas ? "lifeAreas-error" : undefined}>
          <legend className="text-lg font-semibold">Life areas</legend>
          <p className="mt-1 text-sm text-muted">Choose what you want to track</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {LIFE_AREAS.map((area) => (
              <label key={area} className="relative">
                <input
                  type="checkbox"
                  name="lifeAreas"
                  value={area}
                  checked={areas.includes(area)}
                  onChange={() => toggleArea(area)}
                  className="peer sr-only"
                />
                <span className={pillClass}>{area}</span>
              </label>
            ))}
          </div>
          <FieldError id="lifeAreas-error" message={errors?.lifeAreas} />
        </fieldset>
      </section>

      <div className="flex flex-wrap items-center justify-end gap-4">
        {errors?.form ? (
          <p role="alert" className="text-sm text-danger">
            {errors.form}
          </p>
        ) : null}
        {state?.saved && !dirty ? (
          <p role="status" className="text-sm text-accent">
            Settings saved.
          </p>
        ) : null}
        <div className="min-w-36">
          <SubmitButton pending={isPending}>Save settings</SubmitButton>
        </div>
      </div>
    </form>
  );
}
