import { sql } from "drizzle-orm";
import { getDb } from "@/db";

// Public liveness/readiness probe for uptime monitors. It reports only
// whether the app is up and can reach MySQL; nothing about the environment,
// versions or error details ever goes into the response.
export async function GET() {
  const timestamp = new Date().toISOString();
  const headers = { "Cache-Control": "no-store" };

  try {
    await getDb().execute(sql`select 1`);
    return Response.json({ status: "ok", database: "up", timestamp }, { headers });
  } catch (error) {
    // Log only the driver error code (drizzle may wrap it) - messages can contain hosts.
    const code =
      (error as { code?: string }).code ?? (error as { cause?: { code?: string } }).cause?.code;
    console.error("health check: database unreachable", code ?? "unknown");
    return Response.json(
      { status: "degraded", database: "down", timestamp },
      { status: 503, headers },
    );
  }
}
