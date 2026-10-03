"use client";

import { ErrorState } from "@/components/ui/error-state";

export default function AppError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-8">
      <ErrorState retry={retry} />
    </main>
  );
}
