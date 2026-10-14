// Shared by the /api/assistant route and the chat widget. Pure: no I/O.

export const MESSAGE_MAX_LENGTH = 500;

export const ASSISTANT_ROUTES = ["one_time", "daily", "times_per_week", "unclear"] as const;
export type AssistantRoute = (typeof ASSISTANT_ROUTES)[number];

export type AssistantTask = {
  title: string;
  type: Exclude<AssistantRoute, "unclear">;
  frequency: number | null;
  date: string | null;
};

// The n8n workflow's answer, reduced to the fields the widget shows.
// `created` is always false until task creation is integrated.
export type AssistantResult = {
  status: "ok" | "needs_clarification";
  route: AssistantRoute;
  created: boolean;
  task: AssistantTask | null;
  message: string | null;
};

export function validateMessage(value: unknown): { ok: true; message: string } | { ok: false; error: string } {
  if (typeof value !== "string") return { ok: false, error: "Message must be text." };
  const message = value.trim();
  if (!message) return { ok: false, error: "Message must not be empty." };
  if (message.length > MESSAGE_MAX_LENGTH) {
    return { ok: false, error: `Message must be at most ${MESSAGE_MAX_LENGTH} characters.` };
  }
  return { ok: true, message };
}

function isRoute(value: unknown): value is AssistantRoute {
  return typeof value === "string" && (ASSISTANT_ROUTES as readonly string[]).includes(value);
}

// Whitelists the workflow response (never forward it as is). null = unexpected shape.
export function parseWorkflowResult(data: unknown): AssistantResult | null {
  if (typeof data !== "object" || data === null) return null;
  const d = data as Record<string, unknown>;
  if ((d.status !== "ok" && d.status !== "needs_clarification") || !isRoute(d.route)) return null;

  let task: AssistantTask | null = null;
  if (d.task !== null && d.task !== undefined) {
    const t = d.task as Record<string, unknown>;
    if (typeof t !== "object" || typeof t.title !== "string" || !isRoute(t.type) || t.type === "unclear") return null;
    task = {
      title: t.title,
      type: t.type,
      frequency: typeof t.frequency === "number" ? t.frequency : null,
      date: typeof t.date === "string" ? t.date : null,
    };
  }
  if (d.status === "ok" && task === null) return null;

  return {
    status: d.status,
    route: d.route,
    created: d.created === true,
    task,
    message: typeof d.message === "string" ? d.message : null,
  };
}
