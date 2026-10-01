export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-8" aria-busy="true">
      <div className="h-9 w-40 animate-pulse rounded-lg bg-surface" />
      <div className="mt-8 flex flex-col gap-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded-2xl border border-border bg-surface" />
        ))}
      </div>
    </main>
  );
}
