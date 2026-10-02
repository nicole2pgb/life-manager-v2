import Link from "next/link";

export function NoTasksCard() {
  return (
    <section className="rounded-2xl border border-dashed border-border p-8 text-center">
      <p className="font-semibold">Nothing to show yet</p>
      <p className="mt-1 text-sm text-muted">Create a task and complete it to see your progress here.</p>
      <Link
        href="/tasks/new"
        className="mt-4 inline-flex h-11 items-center justify-center rounded-lg bg-accent px-4 text-sm font-semibold text-accent-foreground transition hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
      >
        Create a task
      </Link>
    </section>
  );
}
