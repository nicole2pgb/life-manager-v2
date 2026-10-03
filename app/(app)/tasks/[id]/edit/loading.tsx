export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-xl px-4 py-10 sm:px-8" aria-busy="true">
      <div className="h-[28rem] animate-pulse rounded-2xl border border-border bg-surface" />
    </main>
  );
}
