import Link from "next/link";

// Read-only navigation to the existing edit page; it never changes completion.
export function TaskTitleLink({ id, title, done }: { id: number; title: string; done?: boolean }) {
  return (
    <Link
      href={`/tasks/${id}/edit`}
      className={`wrap-anywhere font-medium hover:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 ${
        done ? "text-muted line-through" : ""
      }`}
    >
      {title}
    </Link>
  );
}
