export const AUTH_UNEXPECTED_ERROR = "Something went wrong. Please try again.";

// Logs an unexpected auth failure without leaking secrets: driver and ORM
// errors can carry the failed SQL with its parameters (email, password hash),
// so only the error's name and code are logged, never its message.
export function logAuthFailure(action: string, error: unknown): void {
  const cause = (error as { cause?: unknown } | null)?.cause;
  const code = [error, cause]
    .map((e) => (e as { code?: unknown } | null)?.code)
    .find((c): c is string => typeof c === "string");
  console.error(`${action} failed`, { name: error instanceof Error ? error.name : typeof error, code });
}
