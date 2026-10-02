export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-8" aria-busy="true">
      <div className="h-9 w-56 animate-pulse rounded-lg bg-surface" />
      <div className="mt-6 h-12 animate-pulse rounded-lg bg-surface" />
      <div className="mt-6 h-72 animate-pulse rounded-2xl border border-border bg-surface" />
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="h-48 animate-pulse rounded-2xl border border-border bg-surface" />
        <div className="h-48 animate-pulse rounded-2xl border border-border bg-surface" />
      </div>
    </main>
  );
}
