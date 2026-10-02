import Link from "next/link";
import { formatCalendarDate } from "@/lib/dates/calendar-date";
import type { WeekSummary } from "@/lib/tasks/planning";

export function WeeklyProgress({ week }: { week: WeekSummary }) {
  const range = `${formatCalendarDate(week.weekStart)} – ${formatCalendarDate(week.weekEnd)}`;
  return (
    <section aria-labelledby="weekly-progress" className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
      <h2 id="weekly-progress" className="text-lg font-semibold">
        Weekly progress
      </h2>
      <p className="mt-1 text-sm text-muted">{range}</p>

      {week.percent === null ? (
        <div className="mt-5">
          <p className="font-medium">Nothing is planned this week</p>
          <p className="mt-1 text-sm text-muted">
            Recurring tasks and tasks with a scheduled or due date this week appear here.
          </p>
          <Link href="/tasks/new" className="mt-3 inline-block text-sm font-semibold text-accent hover:underline">
            Create a task
          </Link>
        </div>
      ) : (
        <div className="mt-4">
          <p className="text-4xl font-bold">{week.percent}%</p>
          <p className="mt-1 text-sm text-muted">
            {week.completed} of {week.planned} completed
          </p>
          <div
            role="progressbar"
            aria-label="Weekly completion"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={week.percent}
            className="mt-4 h-2 overflow-hidden rounded-full bg-background"
          >
            <div className="h-full rounded-full bg-accent" style={{ width: `${week.percent}%` }} />
          </div>
          <p className="mt-3 text-sm text-accent">
            {week.open === 0
              ? "All planned occurrences are done this week."
              : `${week.open} planned ${week.open === 1 ? "occurrence" : "occurrences"} still open this week.`}
          </p>
        </div>
      )}
    </section>
  );
}
