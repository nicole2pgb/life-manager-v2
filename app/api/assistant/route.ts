import { getCurrentUser } from "@/lib/auth/session";
import { parseWorkflowResult, validateMessage } from "@/lib/assistant/result";

const TIMEOUT_MS = 30_000;
const headers = { "Cache-Control": "no-store" };

const fail = (status: number, code: string, message: string) =>
  Response.json({ code, message }, { status, headers });

// Forwards a chat message to the n8n workflow. The webhook URL stays on the
// server (N8N_WEBHOOK_URL) and is never part of any response. Only the message
// is sent: no user id, email or session. Nothing is saved to the database.
export async function POST(request: Request) {
  if (!(await getCurrentUser())) return fail(401, "unauthorized", "Please sign in again.");

  let webhookUrl: URL;
  try {
    webhookUrl = new URL(process.env.N8N_WEBHOOK_URL ?? "");
    if (webhookUrl.protocol !== "https:" && webhookUrl.protocol !== "http:") throw new Error("protocol");
  } catch {
    console.error("assistant: N8N_WEBHOOK_URL is missing or invalid");
    return fail(503, "not_configured", "The assistant is not configured.");
  }

  const body: unknown = await request.json().catch(() => null);
  const input = validateMessage((body as { message?: unknown } | null)?.message);
  if (!input.ok) return fail(400, "invalid_input", input.error);

  try {
    const upstream = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: input.message }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });
    if (!upstream.ok) {
      // Log the status only: the upstream body and URL may contain internals.
      console.error("assistant: workflow answered", upstream.status);
      return fail(502, "assistant_unavailable", "The assistant could not process your message. Please try again.");
    }
    const result = parseWorkflowResult(await upstream.json().catch(() => null));
    if (!result) {
      console.error("assistant: unexpected workflow response shape");
      return fail(502, "assistant_unavailable", "The assistant returned an unexpected answer. Please try again.");
    }
    return Response.json({ result }, { headers });
  } catch (error) {
    console.error("assistant: workflow request failed", (error as Error).name);
    return fail(502, "assistant_unavailable", "The assistant is not reachable right now. Please try again.");
  }
}
