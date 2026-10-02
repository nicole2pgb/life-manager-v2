import { setTaskCompletedAction } from "@/app/(app)/tasks/actions";
import { LifeAreaBadge } from "@/components/tasks/life-area-badge";
import { dateLabel } from "@/components/tasks/task-card";
import type { TodayItem } from "@/lib/tasks/dashboard";
import { formatRecurrence, weekCountLabel } from "@/lib/tasks/recurrence";

function detail(item: TodayItem): string | null {
  const parts: string[] = [];
  const recurrence = formatRecurrence(item.rule);
  if (recurrence) parts.push(recurrence);
  if (item.rule.type === "times_per_week" && item.weekCount !== null) {
    parts.push(weekCountLabel(item.weekCount, item.rule.timesPerWeek));
  }
  // A carried-over scheduled task keeps its original date; it is not overdue.
  const date = item.scheduledDate
    ? dateLabel({ kind: "scheduled", date: item.scheduledDate })
    : item.dueDate
      ? dateLabel({ kind: "due", date: item.dueDate })
      : null;
  if (date) parts.push(date);
  if (item.done) parts.push("Done today");
  return parts.length > 0 ? parts.join(" · ") : null;
}

export function TodayRow({ item }: { item: TodayItem }) {
  const recurring = item.rule.type !== "none";
  const ariaLabel = recurring
    ? item.done
      ? `Mark as not done today: ${item.title}`
      : `Mark as done today: ${item.title}`
    : item.done
      ? `Mark as incomplete: ${item.title}`
      : `Mark as completed: ${item.title}`;
  const text = detail(item);
  return (
    <li className="flex items-start gap-3 py-4 first:pt-0 last:pb-0 sm:gap-4">
      <form action={setTaskCompletedAction} className="pt-0.5">
        <input type="hidden" name="taskId" value={item.id} />
        <input type="hidden" name="completed" value={item.done ? "false" : "true"} />
        <input type="hidden" name="returnTo" value="/dashboard" />
        <button
          type="submit"
          aria-label={ariaLabel}
          className={`flex h-6 w-6 items-center justify-center rounded-full border-2 text-xs font-bold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 ${
            item.done ? "border-accent bg-accent text-accent-foreground" : "border-border hover:border-accent"
          }`}
        >
          {item.done ? "✓" : null}
        </button>
      </form>
      <div className="min-w-0 flex-1">
        <p className={`break-words font-medium ${item.done ? "text-muted line-through" : ""}`}>{item.title}</p>
        {text ? <p className="mt-1 text-xs text-muted">{text}</p> : null}
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1.5">
        <LifeAreaBadge area={item.lifeArea} />
        {item.overdue ? (
          <span className="rounded-md bg-danger/15 px-2 py-0.5 text-xs font-semibold text-danger">Overdue</span>
        ) : null}
      </div>
    </li>
  );
}
