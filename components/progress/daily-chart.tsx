import { WEEKDAY_NAMES } from "@/lib/tasks/recurrence";
import type { ProgressDay } from "@/lib/tasks/progress";

// Completed versus planned per day. Only occurrences that belong to a specific
// day are counted, so times-per-week tasks are not in these bars.
export function DailyChart({ days }: { days: readonly ProgressDay[] }) {
  return (
    <section aria-labelledby="daily-completion" className="min-w-0 rounded-2xl border border-border bg-surface p-5 sm:p-6">
      <h2 id="daily-completion" className="text-lg font-semibold">
        Daily completion
      </h2>
      <p className="mt-1 text-sm text-muted">Completed versus planned each day this week</p>

      <ul className="mt-6 grid grid-cols-7 gap-1.5 sm:gap-3">
        {days.map((day) => {
          const hasPlan = day.planned > 0;
          const fill = hasPlan ? Math.round((day.completed / day.planned) * 100) : 0;
          return (
            <li
              key={day.date}
              aria-current={day.isToday ? "date" : undefined}
              className="flex min-w-0 flex-col items-center gap-2"
            >
              <div aria-hidden="true" className="flex h-36 w-full max-w-12 flex-col justify-end overflow-hidden rounded-md bg-background">
                <div className="w-full bg-accent" style={{ height: `${fill}%` }} />
              </div>
              <span className={`text-xs ${day.isToday ? "font-semibold text-accent" : "text-muted"}`}>
                {WEEKDAY_NAMES[day.weekday - 1]}
              </span>
              <span className="text-xs tabular-nums text-muted">
                {hasPlan ? (
                  <>
                    <span className="sr-only">{day.completed} of {day.planned} completed</span>
                    <span aria-hidden="true">
                      {day.completed}/{day.planned}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="sr-only">No planned occurrences</span>
                    <span aria-hidden="true">–</span>
                  </>
                )}
              </span>
            </li>
          );
        })}
      </ul>
      <p className="mt-4 border-t border-border pt-3 text-xs text-muted">
        – means nothing planned that day. Times-per-week tasks count in the weekly totals, not on a day.
      </p>
    </section>
  );
}
