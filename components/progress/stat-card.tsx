export function StatCard({ label, value, caption }: { label: string; value: string; caption: string }) {
  return (
    <div className="min-w-0 rounded-2xl border border-border bg-surface p-5">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-2 break-words text-3xl font-bold">{value}</p>
      <p className="mt-1 text-xs text-muted">{caption}</p>
    </div>
  );
}
