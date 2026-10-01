"use client";

import { useState } from "react";
import Link from "next/link";
import { deleteTaskAction } from "@/app/(app)/tasks/actions";

const iconButton =
  "rounded-lg p-2 text-muted transition focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/60";

// Edit link and delete control. A single click never deletes: the trash icon
// opens an explicit confirmation row. Rendered as siblings inside the task
// card's wrapping flex row so the confirmation gets its own line on small screens.
export function TaskActions({ taskId, title }: { taskId: number; title: string }) {
  const [confirming, setConfirming] = useState(false);

  return (
    <>
      <div className="flex shrink-0 items-center gap-1">
        <Link href={`/tasks/${taskId}/edit`} aria-label={`Edit task: ${title}`} className={`${iconButton} hover:text-foreground`}>
          <svg aria-hidden width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
          </svg>
        </Link>
        <button
          type="button"
          onClick={() => setConfirming(true)}
          aria-label={`Delete task: ${title}`}
          aria-expanded={confirming}
          className={`${iconButton} hover:text-danger`}
        >
          <svg aria-hidden width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6" />
          </svg>
        </button>
      </div>
      {confirming ? (
        <form
          action={deleteTaskAction}
          role="group"
          aria-label="Confirm delete"
          className="flex basis-full items-center justify-end gap-2 border-t border-border pt-3"
        >
          <input type="hidden" name="taskId" value={taskId} />
          <span className="mr-auto text-sm text-muted">Delete this task?</span>
          <button
            type="button"
            onClick={() => setConfirming(false)}
            className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium hover:bg-background focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
          >
            Cancel
          </button>
          <button
            type="submit"
            autoFocus
            className="rounded-lg bg-danger px-3 py-1.5 text-sm font-semibold text-background hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-danger/60"
          >
            Delete
          </button>
        </form>
      ) : null}
    </>
  );
}
