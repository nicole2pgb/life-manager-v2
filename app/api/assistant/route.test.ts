import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { getCurrentUser } = vi.hoisted(() => ({ getCurrentUser: vi.fn() }));
vi.mock("@/lib/auth/session", () => ({ getCurrentUser }));

import { POST } from "./route";

const WEBHOOK = "https://n8n.example.test/webhook/secret-path";
const post = (body: unknown) =>
  POST(new Request("http://localhost/api/assistant", { method: "POST", body: JSON.stringify(body) }));

const workflowOk = {
  status: "ok",
  route: "times_per_week",
  action: "create_weekly_task",
  created: false,
  task: { title: "Go to the gym", type: "times_per_week", frequency: 3, date: null },
};

describe("POST /api/assistant", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    getCurrentUser.mockReset().mockResolvedValue({ id: 1, name: "A", email: "a@example.com" });
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    vi.stubEnv("N8N_WEBHOOK_URL", WEBHOOK);
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("rejects requests without a session and never calls n8n", async () => {
    getCurrentUser.mockResolvedValue(null);
    const res = await post({ message: "hi" });
    expect(res.status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns 503 when the webhook URL is not configured", async () => {
    vi.stubEnv("N8N_WEBHOOK_URL", "");
    expect((await post({ message: "hi" })).status).toBe(503);
  });

  it.each([{}, { message: "" }, { message: "   " }, { message: 5 }, { message: "x".repeat(501) }])(
    "rejects invalid input %j",
    async (body) => {
      expect((await post(body)).status).toBe(400);
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );

  it("forwards only the message and returns the whitelisted result", async () => {
    fetchMock.mockResolvedValue(Response.json({ ...workflowOk, secret: "leak" }));
    const res = await post({ message: "  Go to the gym 3 times a week ", userId: 99 });
    expect(res.status).toBe(200);
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toBe(WEBHOOK);
    expect(JSON.parse(init.body)).toEqual({ message: "Go to the gym 3 times a week" });
    const text = await res.text();
    expect(JSON.parse(text).result).toMatchObject({ status: "ok", route: "times_per_week", created: false });
    expect(text).not.toContain("leak");
    expect(text).not.toContain("n8n.example.test");
  });

  it("returns a clarification result", async () => {
    fetchMock.mockResolvedValue(
      Response.json({ status: "needs_clarification", route: "unclear", created: false, task: null, message: "Which period?" }),
    );
    const body = await (await post({ message: "gym 3 times" })).json();
    expect(body.result).toMatchObject({ status: "needs_clarification", task: null, message: "Which period?" });
  });

  it("maps upstream failures to 502 without leaking details", async () => {
    fetchMock.mockResolvedValue(new Response("boom at n8n.example.test", { status: 500 }));
    const res = await post({ message: "hi" });
    expect(res.status).toBe(502);
    expect(await res.text()).not.toContain("n8n.example.test");
  });

  it("maps network errors and unexpected shapes to 502", async () => {
    fetchMock.mockRejectedValueOnce(new Error("ECONNREFUSED n8n.example.test"));
    expect((await post({ message: "hi" })).status).toBe(502);
    fetchMock.mockResolvedValueOnce(Response.json({ hello: "world" }));
    expect((await post({ message: "hi" })).status).toBe(502);
  });
});
