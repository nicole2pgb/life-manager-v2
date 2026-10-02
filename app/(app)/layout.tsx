import Link from "next/link";
import { redirect } from "next/navigation";
import { AppNav } from "@/components/app-nav";
import { Logo } from "@/components/ui/logo";
import { getCurrentUser } from "@/lib/auth/session";

// Authoritative session check for every protected page in this group.
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  if (!(await getCurrentUser())) redirect("/login");
  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-border">
        <div className="mx-auto flex w-full max-w-4xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-8">
          <Link
            href="/dashboard"
            aria-label="Life Manager, go to dashboard"
            className="rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
          >
            <Logo />
          </Link>
          <AppNav />
        </div>
      </header>
      {children}
    </div>
  );
}
