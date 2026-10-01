import type { FieldErrors } from "./validation";

// Returned by auth Server Actions. Holds only field errors and the
// non-secret values to re-display; never passwords.
export type AuthFormState = {
  errors?: FieldErrors & { form?: string };
  values?: { name?: string; email?: string };
} | null;
