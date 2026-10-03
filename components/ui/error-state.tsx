import Link from "next/link";

const button =
  "inline-flex h-10 items-center rounded-lg border border-border px-4 text-sm font-semibold hover:bg-surface focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/60";

// Generic failure message shared by the error boundaries. It never shows
// error details; the caller only supplies the retry function.
export function ErrorState({ retry, dashboardLink = true }: { retry: () => void; dashboardLink?: boolean }) {
  return (
    <div role="alert" className="rounded-2xl border border-danger/40 bg-danger/10 p-6">
      <h1 className="text-lg font-semibold text-danger">Something went wrong</h1>
      <p className="mt-1 text-sm text-muted">This page could not be loaded or changed. Nothing was lost.</p>
      <div className="mt-4 flex flex-wrap gap-3">
        <button type="button" onClick={() => retry()} className={button}>
          Try again
        </button>
        {dashboardLink ? (
          <Link href="/dashboard" className={button}>
            Go to dashboard
          </Link>
        ) : null}
      </div>
    </div>
  );
}
