import { LifeAreaBadge } from "@/components/tasks/life-area-badge";
import { TaskTitleLink } from "@/components/weekly-overview/task-title-link";
import type { FrequencyItem } from "@/lib/tasks/weekly-overview";

export function FrequencyRow({ item }: { item: FrequencyItem }) {
  const percent = Math.round((item.completed / item.planned) * 100);
  return (
    <li className="py-3 first:pt-0 last:pb-0">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <TaskTitleLink id={item.id} title={item.title} />
          <div className="mt-1">
            <LifeAreaBadge area={item.lifeArea} />
          </div>
        </div>
        <p className="shrink-0 text-sm text-muted">
          {item.completed} of {item.planned}
        </p>
      </div>
      <div
        role="progressbar"
        aria-label={`${item.title}: ${item.completed} of ${item.planned} this week`}
        aria-valuemin={0}
        aria-valuemax={item.planned}
        aria-valuenow={item.completed}
        className="mt-2 h-2 overflow-hidden rounded-full bg-background"
      >
        <div className="h-full rounded-full bg-accent" style={{ width: `${percent}%` }} />
      </div>
    </li>
  );
}
