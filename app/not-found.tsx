import { NotFoundState } from "@/components/ui/not-found-state";
import { getCurrentUser } from "@/lib/auth/session";

// Unknown paths. The route proxy sends visitors without a session cookie to
// /login first, so this mostly serves signed-in users.
export default async function NotFound() {
  const signedIn = Boolean(await getCurrentUser());
  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-8">
      <NotFoundState href={signedIn ? "/dashboard" : "/login"} label={signedIn ? "Go to dashboard" : "Go to login"} />
    </main>
  );
}
