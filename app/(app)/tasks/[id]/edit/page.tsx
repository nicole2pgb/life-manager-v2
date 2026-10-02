import { notFound, redirect } from "next/navigation";
import { LIFE_AREAS } from "@/db/schema";
import { TaskForm } from "@/components/tasks/task-form";
import { dateLabel } from "@/components/tasks/task-card";
import { getTask } from "@/db/tasks";
import { getCurrentUser } from "@/lib/auth/session";
import { getTodayFor } from "@/lib/dates/time-zone";
import { parseTaskId } from "@/lib/tasks/validation";
import { updateTaskAction } from "../../actions";

export const metadata = { title: "Edit task · Life Manager" };

export default async function EditTaskPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // A malformed id, a missing task and another user's task all look the same.
  const taskId = parseTaskId((await params).id);
  if (taskId === null) notFound();
  const task = await getTask(user.id, taskId, await getTodayFor(user.id));
  if (!task) notFound();

  const { schedule } = task;
  return (
    <main className="mx-auto w-full max-w-xl px-4 py-10 sm:px-8">
      <section className="rounded-2xl border border-border bg-surface p-6 sm:p-7">
        <h1 className="text-2xl font-semibold">Edit task</h1>
        <p className="mt-1 text-sm text-muted">Make it clear, achievable, and easy to place in your week.</p>
        <div className="mt-6">
          <TaskForm
            action={updateTaskAction}
            lifeAreas={LIFE_AREAS}
            submitLabel="Save changes"
            taskId={task.id}
            dateLocked={task.rule.type === "none" && task.completed ? { label: dateLabel(schedule) } : undefined}
            historyLocked={task.rule.type !== "none" && task.hasCompletionHistory}
            initial={{
              title: task.title,
              notes: task.notes ?? "",
              lifeArea: task.lifeArea,
              dateKind: schedule.kind,
              date: schedule.kind === "none" ? "" : schedule.date,
              recurrence: task.rule.type,
              weekdays: task.rule.type === "weekdays" ? task.rule.weekdays.map(String) : [],
              timesPerWeek: task.rule.type === "times_per_week" ? String(task.rule.timesPerWeek) : "",
            }}
          />
        </div>
      </section>
    </main>
  );
}
