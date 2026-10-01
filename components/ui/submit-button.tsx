"use client";

import { useFormStatus } from "react-dom";

export function SubmitButton({
  children,
  variant = "primary",
}: {
  children: React.ReactNode;
  variant?: "primary" | "secondary";
}) {
  const { pending } = useFormStatus();
  const styles =
    variant === "primary"
      ? "w-full bg-accent text-accent-foreground hover:brightness-110"
      : "border border-border bg-background hover:bg-surface";
  return (
    <button
      type="submit"
      disabled={pending}
      className={`inline-flex h-11 items-center justify-center rounded-lg px-4 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 disabled:opacity-60 ${styles}`}
    >
      {pending ? "Please wait…" : children}
    </button>
  );
}
