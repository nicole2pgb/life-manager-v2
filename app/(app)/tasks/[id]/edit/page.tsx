import { notFound } from "next/navigation";
import { TaskForm } from "@/components/tasks/task-form";
import { dateLabel } from "@/components/tasks/task-card";
import { getUserSettings } from "@/db/settings";
import { getTask } from "@/db/tasks";
import { requireUser } from "@/lib/auth/require-user";
import { getTodayFor } from "@/lib/dates/time-zone";
import { areasForTask } from "@/lib/settings/life-areas";
import { parseTaskId } from "@/lib/tasks/validation";
import { updateTaskAction } from "../../actions";

export const metadata = { title: "Edit task · Life Manager" };

export default async function EditTaskPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();

  // A malformed id, a missing task and another user's task all look the same.
  const taskId = parseTaskId((await params).id);
  if (taskId === null) notFound();
  const { weekStart, lifeAreas } = await getUserSettings(user.id);
  const task = await getTask(user.id, taskId, await getTodayFor(user.id), weekStart);
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
            lifeAreas={areasForTask(lifeAreas, task.lifeArea)}
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
