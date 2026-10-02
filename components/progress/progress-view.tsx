import type { Progress } from "@/lib/tasks/progress";
import { formatPointChange } from "@/lib/tasks/progress";
import { DailyChart } from "./daily-chart";
import { LifeAreaList } from "./life-area-list";
import { NoTasksCard } from "./no-tasks-card";
import { StatCard } from "./stat-card";
import { WeeklyDonut } from "./weekly-donut";

export function ProgressView({ progress }: { progress: Progress }) {
  const { week, streak, change } = progress;

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-8">
      <p className="text-xs font-semibold uppercase tracking-wide text-accent">Build consistency</p>
      <h1 className="mt-1 text-3xl font-bold">Progress</h1>
      <p className="mt-1 text-sm text-muted">A useful signal, not a score. Notice what helps you keep moving.</p>

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        <StatCard
          label="Weekly completion"
          value={week.percent === null ? "–" : `${week.percent}%`}
          caption={week.percent === null ? "Nothing planned this week" : `${week.completed} of ${week.planned} planned`}
        />
        <StatCard
          label="Current streak"
          value={`${streak} ${streak === 1 ? "day" : "days"}`}
          caption="days with at least one completion"
        />
        <StatCard
          label="Weekly change"
          value={formatPointChange(change)}
          caption={change === null ? "Needs planned tasks in both weeks" : "vs. last week"}
        />
      </div>

      {progress.hasTasks ? (
        <div className="mt-6 flex flex-col gap-6">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <DailyChart days={progress.days} />
            <WeeklyDonut week={week} />
          </div>
          <LifeAreaList areas={progress.lifeAreas} />
        </div>
      ) : (
        <div className="mt-6">
          <NoTasksCard />
        </div>
      )}
    </main>
  );
}
