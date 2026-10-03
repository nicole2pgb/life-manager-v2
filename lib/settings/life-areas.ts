import { LIFE_AREAS, type LifeArea } from "@/db/schema";

// The life areas the task form offers: the user's selected areas, plus the
// task's current area while editing (so a task whose area was deselected later
// can still be saved unchanged). Always in the canonical order.
export function areasForTask(selected: readonly LifeArea[], current?: LifeArea): LifeArea[] {
  return LIFE_AREAS.filter((area) => selected.includes(area) || area === current);
}

// Preselected area of a new task: Personal when selected, otherwise the first
// selected area in the canonical order.
export function defaultLifeArea(selected: readonly LifeArea[]): LifeArea {
  if (selected.includes("Personal")) return "Personal";
  return LIFE_AREAS.find((area) => selected.includes(area)) ?? "Personal";
}
