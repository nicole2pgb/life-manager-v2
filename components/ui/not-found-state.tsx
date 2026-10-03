import Link from "next/link";

// Shared not-found message: the same text for an unknown page and for a task
// that is missing, malformed or owned by someone else.
export function NotFoundState({ href, label }: { href: string; label: string }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-6">
      <h1 className="text-lg font-semibold">Page not found</h1>
      <p className="mt-1 text-sm text-muted">The page or task you are looking for does not exist.</p>
      <Link
        href={href}
        className="mt-4 inline-flex h-10 items-center rounded-lg border border-border px-4 text-sm font-semibold hover:bg-background focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
      >
        {label}
      </Link>
    </div>
  );
}
