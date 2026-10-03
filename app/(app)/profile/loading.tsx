export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-10 sm:px-8" aria-busy="true">
      <div className="h-9 w-40 animate-pulse rounded-lg bg-surface" />
      <div className="mt-6 h-40 animate-pulse rounded-2xl border border-border bg-surface" />
    </main>
  );
}
