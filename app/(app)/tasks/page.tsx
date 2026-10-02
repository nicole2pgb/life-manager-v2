import Link from "next/link";
import { redirect } from "next/navigation";
import { listTasks } from "@/db/tasks";
import { TaskCard } from "@/components/tasks/task-card";
import { getCurrentUser } from "@/lib/auth/session";
import { getTodayFor } from "@/lib/dates/time-zone";
import { TASK_NOTICES } from "@/lib/tasks/form-state";

export const metadata = { title: "Tasks · Life Manager" };

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  // The layout already checks; repeat so the page never relies on it alone.
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const tasks = await listTasks(user.id, await getTodayFor(user.id));
  const noticeKey = (await searchParams).notice;
  const notice = typeof noticeKey === "string" && Object.hasOwn(TASK_NOTICES, noticeKey) ? TASK_NOTICES[noticeKey] : null;

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-accent">Organize</p>
          <h1 className="mt-1 text-3xl font-bold">Tasks</h1>
          <p className="mt-1 text-sm text-muted">Your commitments, gathered in one clear place.</p>
        </div>
        <Link
          href="/tasks/new"
          className="inline-flex h-11 items-center justify-center rounded-lg bg-accent px-4 text-sm font-semibold text-accent-foreground transition hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
        >
          + New task
        </Link>
      </div>

      {notice ? (
        <p role="alert" className="mt-6 rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
          {notice}
        </p>
      ) : null}

      {tasks.length === 0 ? (
        <section className="mt-8 rounded-2xl border border-dashed border-border bg-surface p-8 text-center">
          <h2 className="text-lg font-semibold">No tasks yet</h2>
          <p className="mt-1 text-sm text-muted">Create your first task to get started.</p>
          <Link
            href="/tasks/new"
            className="mt-4 inline-flex h-11 items-center justify-center rounded-lg bg-accent px-4 text-sm font-semibold text-accent-foreground transition hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
          >
            Create a task
          </Link>
        </section>
      ) : (
        <ul className="mt-8 flex flex-col gap-3">
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} />
          ))}
        </ul>
      )}
    </main>
  );
}
