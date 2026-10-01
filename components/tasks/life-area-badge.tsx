import type { LifeArea } from "@/db/schema";

const TINTS: Record<LifeArea, string> = {
  Career: "bg-indigo-500/15 text-indigo-300",
  Fitness: "bg-green-500/15 text-green-300",
  Health: "bg-rose-500/15 text-rose-300",
  Learning: "bg-amber-500/15 text-amber-300",
  Personal: "bg-violet-500/15 text-violet-300",
  Finance: "bg-teal-500/15 text-teal-300",
};

export function LifeAreaBadge({ area }: { area: LifeArea }) {
  return (
    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ${TINTS[area]}`}>
      {area}
    </span>
  );
}
