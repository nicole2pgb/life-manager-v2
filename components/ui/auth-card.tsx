import { Logo } from "./logo";

export function AuthCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-10">
      <Logo />
      <section className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 sm:p-7">
        <h1 className="text-2xl font-semibold">{title}</h1>
        <p className="mt-1 text-sm text-muted">{subtitle}</p>
        <div className="mt-6">{children}</div>
      </section>
    </main>
  );
}
