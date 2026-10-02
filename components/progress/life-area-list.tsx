import type { LifeAreaProgress } from "@/lib/tasks/progress";

export function LifeAreaList({ areas }: { areas: readonly LifeAreaProgress[] }) {
  return (
    <section aria-labelledby="life-areas" className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
      <h2 id="life-areas" className="text-lg font-semibold">
        Life areas
      </h2>
      <p className="mt-1 text-sm text-muted">A balanced view of where your energy went this week</p>

      <ul className="mt-5 grid gap-x-8 gap-y-5 sm:grid-cols-2">
        {areas.map((area) => (
          <li key={area.area} className="min-w-0">
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="font-medium">{area.area}</span>
              <span className="shrink-0 tabular-nums text-muted">
                {area.percent === null ? "Nothing planned" : `${area.completed}/${area.planned}`}
              </span>
            </div>
            <div
              role={area.percent === null ? undefined : "progressbar"}
              aria-label={area.percent === null ? undefined : `${area.area} completion`}
              aria-valuemin={area.percent === null ? undefined : 0}
              aria-valuemax={area.percent === null ? undefined : 100}
              aria-valuenow={area.percent ?? undefined}
              aria-hidden={area.percent === null ? true : undefined}
              className="mt-2 h-2 overflow-hidden rounded-full bg-background"
            >
              {area.percent === null ? null : (
                <div className="h-full rounded-full bg-accent" style={{ width: `${area.percent}%` }} />
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
