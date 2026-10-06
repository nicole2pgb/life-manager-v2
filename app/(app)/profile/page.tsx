import { SubmitButton } from "@/components/ui/submit-button";
import { requireUser } from "@/lib/auth/require-user";
import { logoutAction } from "../actions";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

export default async function ProfilePage() {
  // The layout already checks; repeat so the page never relies on it alone.
  const user = await requireUser();

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-10 sm:px-8">
      <p className="text-xs font-semibold uppercase tracking-wide text-accent">Account</p>
      <h1 className="mt-1 text-3xl font-bold">Profile</h1>
      <p className="mt-1 text-sm text-muted">Your account details.</p>

      <section className="mt-6 rounded-2xl border border-border bg-surface p-6">
        <div className="flex items-center gap-4">
          <div aria-hidden className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-accent text-xl font-bold text-accent-foreground">
            {initials(user.name)}
          </div>
          <div className="min-w-0">
            <p className="truncate text-lg font-semibold">{user.name}</p>
            <p className="truncate text-sm text-muted">{user.email}</p>
          </div>
        </div>
        <form action={logoutAction} className="mt-6">
          <SubmitButton variant="secondary">Log out</SubmitButton>
        </form>
      </section>
    </main>
  );
}
