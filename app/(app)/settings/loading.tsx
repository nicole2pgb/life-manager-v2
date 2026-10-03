export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-8" aria-busy="true">
      <div className="h-9 w-56 animate-pulse rounded-lg bg-surface" />
      <div className="mt-8 flex flex-col gap-6">
        <div className="h-40 animate-pulse rounded-2xl border border-border bg-surface" />
        <div className="h-48 animate-pulse rounded-2xl border border-border bg-surface" />
        <div className="h-32 animate-pulse rounded-2xl border border-border bg-surface" />
      </div>
    </main>
  );
}
