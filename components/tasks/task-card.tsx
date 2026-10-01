import { setTaskCompletedAction } from "@/app/(app)/tasks/actions";
import type { TaskRecord } from "@/db/tasks";
import { formatCalendarDate } from "@/lib/dates/calendar-date";
import { LifeAreaBadge } from "./life-area-badge";
import { TaskActions } from "./task-actions";

export function dateLabel(schedule: TaskRecord["schedule"]): string | null {
  if (schedule.kind === "scheduled") return `Scheduled for ${formatCalendarDate(schedule.date)}`;
  if (schedule.kind === "due") return `Due by ${formatCalendarDate(schedule.date)}`;
  return null;
}

export function TaskCard({ task }: { task: TaskRecord }) {
  const label = dateLabel(task.schedule);
  return (
    <li className="flex flex-wrap items-start gap-3 rounded-2xl border border-border bg-surface p-4 sm:gap-4 sm:p-5">
      <form action={setTaskCompletedAction} className="pt-0.5">
        <input type="hidden" name="taskId" value={task.id} />
        <input type="hidden" name="completed" value={task.completed ? "false" : "true"} />
        <button
          type="submit"
          aria-label={task.completed ? `Mark as incomplete: ${task.title}` : `Mark as completed: ${task.title}`}
          className={`flex h-6 w-6 items-center justify-center rounded-full border-2 text-xs font-bold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 ${
            task.completed
              ? "border-accent bg-accent text-accent-foreground"
              : "border-border hover:border-accent"
          }`}
        >
          {task.completed ? "✓" : null}
        </button>
      </form>

      <div className="min-w-0 flex-1 basis-40">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className={`break-words font-semibold ${task.completed ? "text-muted line-through" : ""}`}>
            {task.title}
          </h2>
          <LifeAreaBadge area={task.lifeArea} />
        </div>
        {task.notes ? <p className="mt-1 whitespace-pre-line break-words text-sm text-muted">{task.notes}</p> : null}
        {label ? <p className="mt-2 text-xs text-muted">{label}</p> : null}
      </div>

      <TaskActions taskId={task.id} title={task.title} />
    </li>
  );
}
