import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const execute = vi.fn();
vi.mock("@/db", () => ({ getDb: () => ({ execute }) }));

import { GET } from "./route";

describe("GET /api/health", () => {
  beforeEach(() => {
    execute.mockReset();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("reports ok when the database answers", async () => {
    execute.mockResolvedValue([]);
    const res = await GET();
    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    const body = await res.json();
    expect(body).toMatchObject({ status: "ok", database: "up" });
    expect(Number.isNaN(Date.parse(body.timestamp))).toBe(false);
  });

  it("reports 503 without leaking error details when the database fails", async () => {
    execute.mockRejectedValue(
      Object.assign(new Error("connect ECONNREFUSED altaria.proxy.rlwy.net:45438"), {
        code: "ECONNREFUSED",
      }),
    );
    const res = await GET();
    expect(res.status).toBe(503);
    const text = JSON.stringify(await res.json());
    expect(text).toContain('"status":"degraded"');
    expect(text).toContain('"database":"down"');
    expect(text).not.toMatch(/ECONNREFUSED|rlwy|45438/);
  });
});
