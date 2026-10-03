import type { SettingsFieldErrors } from "./validation";

// Returned by the Settings Server Action. The form keeps the entered values
// itself (controlled inputs), so only errors and the saved flag travel back.
export type SettingsFormState = {
  errors?: SettingsFieldErrors & { form?: string };
  saved?: boolean;
} | null;
