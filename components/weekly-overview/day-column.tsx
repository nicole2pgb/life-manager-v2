import { LifeAreaBadge } from "@/components/tasks/life-area-badge";
import { TaskTitleLink } from "@/components/weekly-overview/task-title-link";
import { formatCalendarDate } from "@/lib/dates/calendar-date";
import { WEEKDAY_NAMES } from "@/lib/tasks/recurrence";
import type { OverviewDay } from "@/lib/tasks/weekly-overview";

export function DayColumn({ day }: { day: OverviewDay }) {
  const dayOfMonth = Number(day.date.slice(8, 10));
  const weekday = WEEKDAY_NAMES[day.weekday - 1];
  return (
    <li
      aria-current={day.isToday ? "date" : undefined}
      aria-label={`${weekday} ${formatCalendarDate(day.date)}`}
      className={`min-w-0 p-3 ${day.isToday ? "bg-accent/10" : ""}`}
    >
      <div
        className={`flex items-center justify-between rounded-lg px-2.5 py-2 text-sm font-semibold ${
          day.isToday ? "bg-accent text-accent-foreground" : ""
        }`}
      >
        <span>{weekday}</span>
        <span className="text-base">{dayOfMonth}</span>
      </div>
      {day.items.length === 0 ? (
        <p className="mt-3 px-1 text-xs text-muted">Nothing planned</p>
      ) : (
        <ul className="mt-3 flex flex-col gap-2">
          {day.items.map((item) => (
            <li
              key={item.id}
              className={`rounded-lg border p-2.5 text-sm ${
                item.done ? "border-accent/40 bg-accent/10" : "border-border bg-background"
              }`}
            >
              <TaskTitleLink id={item.id} title={item.title} done={item.done} />
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                <LifeAreaBadge area={item.lifeArea} />
                {item.kind === "due" ? (
                  <span className="rounded-md bg-surface px-2 py-0.5 text-xs font-semibold text-muted">Due</span>
                ) : null}
                {item.done ? (
                  <span className="rounded-md bg-accent/15 px-2 py-0.5 text-xs font-semibold text-accent">✓ Done</span>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}
