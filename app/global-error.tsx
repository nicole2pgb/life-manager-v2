"use client";

import "./globals.css";

// Replaces the root layout when it fails, so it brings its own document and styles.
export default function GlobalError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <title>Something went wrong · Life Manager</title>
        <main className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-8">
          <div role="alert" className="rounded-2xl border border-danger/40 bg-danger/10 p-6">
            <h1 className="text-lg font-semibold text-danger">Something went wrong</h1>
            <p className="mt-1 text-sm text-muted">Life Manager could not be loaded. Nothing was lost.</p>
            <button
              type="button"
              onClick={() => retry()}
              className="mt-4 inline-flex h-10 items-center rounded-lg border border-border px-4 text-sm font-semibold hover:bg-surface focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
            >
              Try again
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
