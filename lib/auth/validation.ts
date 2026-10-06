export const PASSWORD_MIN_BYTES = 8;
// bcrypt ignores everything past 72 bytes, so longer passwords are rejected.
export const PASSWORD_MAX_BYTES = 72;
const MAX_FIELD_LENGTH = 255;

// Pragmatic check, not full RFC 5322: some local part, then a domain made of
// at least two dot-separated labels, none of them empty (rejects "a@b..c", "a@b.c.").
const EMAIL_PATTERN = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;

export type FieldErrors = Partial<
  Record<"name" | "email" | "password" | "confirmPassword", string>
>;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function passwordByteLength(password: string): number {
  return new TextEncoder().encode(password).length;
}

export function validatePassword(password: string): string | undefined {
  const bytes = passwordByteLength(password);
  if (bytes < PASSWORD_MIN_BYTES || bytes > PASSWORD_MAX_BYTES) {
    return `Password must be ${PASSWORD_MIN_BYTES}–${PASSWORD_MAX_BYTES} bytes (UTF-8). Most characters are 1 byte; emoji and many non-Latin characters take 2–4.`;
  }
}

export function validateEmail(email: string): string | undefined {
  const value = normalizeEmail(email);
  if (!value) return "Email is required.";
  if (value.length > MAX_FIELD_LENGTH || !EMAIL_PATTERN.test(value)) {
    return "Enter a valid email address.";
  }
}

export function validateRegistration(input: {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}): FieldErrors {
  const errors: FieldErrors = {};
  const name = input.name.trim();
  if (!name) errors.name = "Name is required.";
  else if (name.length > MAX_FIELD_LENGTH) errors.name = "Name is too long.";

  const emailError = validateEmail(input.email);
  if (emailError) errors.email = emailError;

  const passwordError = validatePassword(input.password);
  if (passwordError) errors.password = passwordError;
  else if (input.password !== input.confirmPassword) {
    errors.confirmPassword = "Passwords do not match.";
  }
  return errors;
}
