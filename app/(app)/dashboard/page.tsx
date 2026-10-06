import Link from "next/link";
import { TodayRow } from "@/components/dashboard/today-row";
import { WeeklyProgress } from "@/components/dashboard/weekly-progress";
import { getUserSettings } from "@/db/settings";
import { getDashboard } from "@/db/tasks";
import { requireUser } from "@/lib/auth/require-user";
import { formatLongCalendarDate } from "@/lib/dates/calendar-date";
import { getTodayFor, getUserTimeZone } from "@/lib/dates/time-zone";
import { TASK_NOTICES } from "@/lib/tasks/form-state";

export const metadata = { title: "Dashboard · Life Manager" };

const primaryLink =
  "inline-flex h-11 items-center justify-center rounded-lg bg-accent px-4 text-sm font-semibold text-accent-foreground transition hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/60";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  // The layout already checks; repeat so the page never relies on it alone.
  const user = await requireUser();

  const today = await getTodayFor(user.id);
  const { weekStart } = await getUserSettings(user.id);
  const dashboard = await getDashboard(user.id, today, await getUserTimeZone(user.id), weekStart);
  const noticeKey = (await searchParams).notice;
  const notice = typeof noticeKey === "string" && Object.hasOwn(TASK_NOTICES, noticeKey) ? TASK_NOTICES[noticeKey] : null;

  const { items, openCount, doneCount } = dashboard;
  const firstName = user.name.trim().split(/\s+/)[0] || user.name;

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-accent">{formatLongCalendarDate(today)}</p>
          <h1 className="mt-1 wrap-anywhere text-3xl font-bold">Hello, {firstName}</h1>
          <p className="mt-1 text-sm text-muted">
            {openCount === 0
              ? "No priorities left today."
              : `You have ${openCount} ${openCount === 1 ? "priority" : "priorities"} left today.`}
          </p>
        </div>
        <Link href="/tasks/new" className={primaryLink}>
          + Quick add task
        </Link>
      </div>

      {notice ? (
        <p role="alert" className="mt-6 rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
          {notice}
        </p>
      ) : null}

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section aria-labelledby="todays-tasks" className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 id="todays-tasks" className="text-lg font-semibold">
                Today&apos;s tasks
              </h2>
              <p className="mt-1 text-sm text-muted">
                {doneCount}/{items.length} done today
              </p>
            </div>
            <Link href="/tasks" className="shrink-0 text-sm font-semibold hover:text-accent">
              View all →
            </Link>
          </div>

          {!dashboard.hasTasks ? (
            <div className="mt-6 rounded-xl border border-dashed border-border p-6 text-center">
              <p className="font-semibold">No tasks yet</p>
              <p className="mt-1 text-sm text-muted">Create your first task to plan your day.</p>
              <Link href="/tasks/new" className={`${primaryLink} mt-4`}>
                Create a task
              </Link>
            </div>
          ) : items.length === 0 ? (
            <div className="mt-6 rounded-xl border border-dashed border-border p-6 text-center">
              <p className="font-semibold">Nothing planned for today</p>
              <p className="mt-1 text-sm text-muted">Enjoy the free time, or add something you want to get done.</p>
              <Link href="/tasks/new" className={`${primaryLink} mt-4`}>
                Add a task
              </Link>
            </div>
          ) : (
            <>
              {openCount === 0 ? (
                <p role="status" className="mt-5 rounded-lg bg-accent/10 px-3 py-2 text-sm font-medium text-accent">
                  Everything for today is done. Nice work!
                </p>
              ) : null}
              <ul className="mt-5 flex flex-col divide-y divide-border">
                {items.map((item) => (
                  <TodayRow key={item.id} item={item} />
                ))}
              </ul>
            </>
          )}
        </section>

        <WeeklyProgress week={dashboard.week} />
      </div>
    </main>
  );
}
