"use client";

export default function ProgressError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-8">
      <div role="alert" className="rounded-2xl border border-danger/40 bg-danger/10 p-6">
        <h1 className="text-lg font-semibold text-danger">Something went wrong</h1>
        <p className="mt-1 text-sm text-muted">Your progress could not be loaded. Nothing was lost.</p>
        <button
          type="button"
          onClick={() => retry()}
          className="mt-4 inline-flex h-10 items-center rounded-lg border border-border px-4 text-sm font-semibold hover:bg-surface focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
        >
          Try again
        </button>
      </div>
    </main>
  );
}
