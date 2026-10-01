export function Logo() {
  return (
    <div className="flex items-center gap-3">
      <div
        aria-hidden
        className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent text-lg font-bold text-accent-foreground shadow-[0_0_20px_rgba(236,106,171,0.35)]"
      >
        ✦
      </div>
      <div className="leading-tight">
        <p className="font-semibold">Life Manager</p>
        <p className="text-xs text-muted">Personal OS</p>
      </div>
    </div>
  );
}
