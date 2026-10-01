import type { TaskFieldErrors } from "./validation";

// Returned by the create/update Server Actions. The form keeps the entered
// values itself (controlled inputs), so only the errors travel back.
export type TaskFormState = {
  errors?: TaskFieldErrors & { form?: string };
} | null;
