import { formatWeekRange } from "@/lib/dates/calendar-date";
import type { WeekSummary } from "@/lib/tasks/planning";

const RADIUS = 52;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function WeeklyDonut({ week }: { week: WeekSummary }) {
  const percent = week.percent;
  return (
    <section aria-labelledby="weekly-completion" className="min-w-0 rounded-2xl border border-border bg-surface p-5 sm:p-6">
      <h2 id="weekly-completion" className="text-lg font-semibold">
        Weekly completion
      </h2>
      <p className="mt-1 text-sm text-muted">{formatWeekRange(week.weekStart, week.weekEnd)}</p>

      {percent === null ? (
        <div className="mt-6 rounded-xl border border-dashed border-border p-6 text-center">
          <p className="font-medium">Nothing is planned this week</p>
          <p className="mt-1 text-sm text-muted">Recurring tasks and dated tasks this week appear here.</p>
        </div>
      ) : (
        <div className="mt-6 flex justify-center">
          <div className="relative h-48 w-48">
            <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90" aria-hidden="true">
              <circle cx="60" cy="60" r={RADIUS} fill="none" strokeWidth="12" className="stroke-background" />
              <circle
                cx="60"
                cy="60"
                r={RADIUS}
                fill="none"
                strokeWidth="12"
                strokeLinecap="round"
                className="stroke-accent"
                strokeDasharray={`${(percent / 100) * CIRCUMFERENCE} ${CIRCUMFERENCE}`}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <p className="text-3xl font-bold">{percent}%</p>
              <p className="text-xs text-muted">
                {week.completed}/{week.planned} done
              </p>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
