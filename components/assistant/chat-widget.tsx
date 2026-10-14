"use client";

import { useState } from "react";
import { MESSAGE_MAX_LENGTH, type AssistantResult } from "@/lib/assistant/result";

type NewEntry =
  | { kind: "user"; text: string }
  | { kind: "result"; result: AssistantResult }
  | { kind: "error"; text: string };
type Entry = NewEntry & { id: number };

const TYPE_LABELS = { one_time: "One-time task", daily: "Daily task" } as const;

function typeLabel(task: NonNullable<AssistantResult["task"]>) {
  return task.type === "times_per_week" ? `${task.frequency ?? "?"}× per week` : TYPE_LABELS[task.type];
}

function ResultBubble({ result }: { result: AssistantResult }) {
  if (!result.task) return <p>{result.message ?? "Could you rephrase that?"}</p>;
  const { task } = result;
  return (
    <div className="flex flex-col gap-1">
      <p className="font-semibold">{task.title}</p>
      <p className="text-muted">
        {typeLabel(task)}
        {task.date ? ` · ${task.date}` : ""}
      </p>
      {!result.created && <p className="text-xs text-muted">Preview only, not saved yet.</p>}
    </div>
  );
}

// Floating assistant: sends the message to /api/assistant (server-side proxy to
// n8n) and shows the classification. It never creates tasks yet.
export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [pending, setPending] = useState(false);
  const [entries, setEntries] = useState<Entry[]>([]);

  const add = (entry: NewEntry) => setEntries((all) => [...all, { ...entry, id: all.length }]);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const message = text.trim();
    if (!message || pending) return;
    add({ kind: "user", text: message });
    setText("");
    setPending(true);
    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      const data: { result?: AssistantResult; message?: string } | null = await res.json().catch(() => null);
      if (res.ok && data?.result) add({ kind: "result", result: data.result });
      else add({ kind: "error", text: data?.message ?? "Something went wrong. Please try again." });
    } catch {
      add({ kind: "error", text: "Could not reach the server. Please try again." });
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-3">
      {open && (
        <section
          aria-label="AI task assistant"
          className="flex h-[26rem] w-[calc(100vw-2rem)] max-w-sm flex-col rounded-2xl border border-border bg-surface shadow-xl"
        >
          <header className="border-b border-border px-4 py-3 text-sm font-semibold">Task assistant</header>
          <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-4 text-sm" aria-live="polite">
            {entries.length === 0 && (
              <p className="text-muted">Try “Go to the gym tomorrow” or “Take vitamins every day”.</p>
            )}
            {entries.map((entry) =>
              entry.kind === "user" ? (
                <p key={entry.id} className="max-w-[85%] self-end rounded-xl bg-accent px-3 py-2 text-accent-foreground">
                  {entry.text}
                </p>
              ) : (
                <div
                  key={entry.id}
                  className={`max-w-[85%] self-start rounded-xl border px-3 py-2 ${
                    entry.kind === "error" ? "border-danger text-danger" : "border-border bg-background"
                  }`}
                  role={entry.kind === "error" ? "alert" : undefined}
                >
                  {entry.kind === "error" ? entry.text : <ResultBubble result={entry.result} />}
                </div>
              ),
            )}
            {pending && <p className="self-start text-muted">Thinking…</p>}
          </div>
          <form onSubmit={onSubmit} className="flex gap-2 border-t border-border p-3">
            <input
              value={text}
              onChange={(event) => setText(event.target.value)}
              maxLength={MESSAGE_MAX_LENGTH}
              placeholder="Describe a task…"
              aria-label="Message"
              disabled={pending}
              className="h-11 min-w-0 flex-1 rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={pending || !text.trim()}
              className="h-11 rounded-lg bg-accent px-4 text-sm font-semibold text-accent-foreground transition hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 disabled:opacity-60"
            >
              Send
            </button>
          </form>
        </section>
      )}
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label={open ? "Close task assistant" : "Open task assistant"}
        aria-expanded={open}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-accent text-accent-foreground shadow-lg transition hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
      >
        <svg aria-hidden width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12Z" />
        </svg>
      </button>
    </div>
  );
}
