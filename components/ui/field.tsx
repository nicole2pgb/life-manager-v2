export function Field({
  label,
  name,
  type = "text",
  placeholder,
  autoComplete,
  defaultValue,
  error,
}: {
  label: string;
  name: string;
  type?: "text" | "email" | "password";
  placeholder?: string;
  autoComplete?: string;
  defaultValue?: string;
  error?: string;
}) {
  const errorId = `${name}-error`;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={name} className="text-sm font-medium">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        placeholder={placeholder}
        autoComplete={autoComplete}
        defaultValue={defaultValue}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm placeholder:text-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/40 aria-[invalid=true]:border-danger"
      />
      {error ? (
        <p id={errorId} className="text-sm text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
