import Link from "next/link";
import { LifeAreaBadge } from "@/components/tasks/life-area-badge";
import { DayColumn } from "@/components/weekly-overview/day-column";
import { FrequencyRow } from "@/components/weekly-overview/frequency-row";
import { TaskTitleLink } from "@/components/weekly-overview/task-title-link";
import { getUserSettings } from "@/db/settings";
import { getWeeklyOverview } from "@/db/tasks";
import { requireUser } from "@/lib/auth/require-user";
import { startOfWeek, formatWeekRange } from "@/lib/dates/calendar-date";
import { getTodayFor, getUserTimeZone } from "@/lib/dates/time-zone";
import { adjacentWeeks, resolveWeek } from "@/lib/tasks/weekly-overview";

export const metadata = { title: "Weekly Overview · Life Manager" };

const primaryLink =
  "inline-flex h-11 items-center justify-center rounded-lg bg-accent px-4 text-sm font-semibold text-accent-foreground transition hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/60";
const navControl =
  "inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border text-lg transition hover:border-accent hover:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/60";
const disabledControl = `${navControl} cursor-not-allowed opacity-40 hover:border-border hover:text-inherit`;

const weekHref = (weekStart: string) => `/weekly-overview?week=${weekStart}`;

export default async function WeeklyOverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  // The layout already checks; repeat so the page never relies on it alone.
  const user = await requireUser();

  const today = await getTodayFor(user.id);
  const { weekStart: weekStartDay } = await getUserSettings(user.id);
  const currentWeek = startOfWeek(today, weekStartDay);
  const weekStart = resolveWeek((await searchParams).week, today, weekStartDay);
  const overview = await getWeeklyOverview(user.id, weekStart, today, await getUserTimeZone(user.id));
  const { previous, next } = adjacentWeeks(weekStart);
  const isCurrentWeek = weekStart === currentWeek;

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-8">
      <p className="text-xs font-semibold uppercase tracking-wide text-accent">Plan with perspective</p>
      <h1 className="mt-1 text-3xl font-bold">Weekly overview</h1>
      <p className="mt-1 text-sm text-muted">See fixed commitments and flexible routines without overloading each day.</p>

      <div className="mt-6 flex items-center justify-between gap-3">
        {previous ? (
          <Link href={weekHref(previous)} aria-label="Previous week" className={navControl}>
            ‹
          </Link>
        ) : (
          <span aria-hidden="true" className={disabledControl}>
            ‹
          </span>
        )}
        <div className="min-w-0 text-center">
          <h2 className="text-base font-semibold sm:text-lg">{formatWeekRange(overview.weekStart, overview.weekEnd)}</h2>
          <p className="mt-0.5 text-xs text-muted">
            {isCurrentWeek ? "This week · " : null}Weeks start on {weekStartDay}
          </p>
          {isCurrentWeek ? null : (
            <Link href="/weekly-overview" className="mt-1 inline-block text-sm font-semibold text-accent hover:underline">
              This week
            </Link>
          )}
        </div>
        {next ? (
          <Link href={weekHref(next)} aria-label="Next week" className={navControl}>
            ›
          </Link>
        ) : (
          <span aria-hidden="true" className={disabledControl}>
            ›
          </span>
        )}
      </div>

      {!overview.hasTasks ? (
        <div className="mt-6 rounded-2xl border border-dashed border-border p-8 text-center">
          <p className="font-semibold">No tasks yet</p>
          <p className="mt-1 text-sm text-muted">Create a task to see it in your week.</p>
          <Link href="/tasks/new" className={`${primaryLink} mt-4`}>
            Create a task
          </Link>
        </div>
      ) : null}

      <ol
        aria-label="Days of the week"
        className="mt-6 grid grid-cols-1 divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface lg:grid-cols-7 lg:divide-x lg:divide-y-0"
      >
        {overview.days.map((day) => (
          <DayColumn key={day.date} day={day} />
        ))}
      </ol>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section aria-labelledby="weekly-frequency" className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
          <h2 id="weekly-frequency" className="text-lg font-semibold">
            Weekly frequency
          </h2>
          <p className="mt-1 text-sm text-muted">Complete these when they fit best</p>
          {overview.frequency.length === 0 ? (
            <p className="mt-4 text-sm text-muted">No weekly-frequency tasks are planned this week.</p>
          ) : (
            <ul className="mt-4 flex flex-col divide-y divide-border">
              {overview.frequency.map((item) => (
                <FrequencyRow key={item.id} item={item} />
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="open-tasks" className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
          <h2 id="open-tasks" className="text-lg font-semibold">
            Open tasks
          </h2>
          <p className="mt-1 text-sm text-muted">One-time tasks without a date</p>
          {overview.openTasks.length === 0 ? (
            <p className="mt-4 text-sm text-muted">There are no open tasks without a date.</p>
          ) : (
            <ul className="mt-4 flex flex-col divide-y divide-border">
              {overview.openTasks.map((task) => (
                <li key={task.id} className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <TaskTitleLink id={task.id} title={task.title} />
                    <p className="mt-0.5 text-xs text-muted">Open · no date</p>
                  </div>
                  <LifeAreaBadge area={task.lifeArea} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
