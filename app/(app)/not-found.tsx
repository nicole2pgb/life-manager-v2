import { NotFoundState } from "@/components/ui/not-found-state";

export default function AppNotFound() {
  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-8">
      <NotFoundState href="/dashboard" label="Go to dashboard" />
    </main>
  );
}
