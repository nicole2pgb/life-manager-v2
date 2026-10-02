import type { TaskFieldErrors } from "./validation";

// Returned by the create/update Server Actions. The form keeps the entered
// values itself (controlled inputs), so only the errors travel back.
export type TaskFormState = {
  errors?: TaskFieldErrors & { form?: string };
} | null;

// Notice keys the task list accepts in `?notice=`; fixed keys, never free text.
export const NOT_RELEVANT_NOTICE = "not-relevant";
export const TASK_NOTICES: Record<string, string> = {
  [NOT_RELEVANT_NOTICE]:
    "That task can't be completed today: it isn't scheduled for today, or its weekly target is already reached.",
};
