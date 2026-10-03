import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

// The MVP core flow against a real database: register → create tasks → Today →
// complete → Weekly Overview and Progress → log out → log in → data persisted,
// plus isolation between two users. Runs only with TEST_DATABASE_URL (use a
// disposable database); the users it creates are removed afterwards.
const url = process.env.TEST_DATABASE_URL;

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: (to: string) => {
    throw new Error(`REDIRECT:${to}`);
  },
  notFound: () => {
    throw new Error("NOT_FOUND");
  },
}));

// A one-cookie jar standing in for the browser, so register/login/logout run for real.
const jar = new Map<string, string>();
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => (jar.has(name) ? { name, value: jar.get(name)! } : undefined),
    set: (name: string, value: string) => void jar.set(name, value),
    delete: (name: string) => void jar.delete(name),
  }),
}));

// 2026-10-06 is a Tuesday (calendar week 2026-10-05 .. 2026-10-11).
const TODAY = "2026-10-06";
const WEEK_START = "2026-10-05";
const ZONE = "Europe/Berlin";
vi.mock("@/lib/dates/time-zone", () => ({ getTodayFor: async () => "2026-10-06" }));

const form = (fields: Record<string, string>) => {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.append(key, value);
  return data;
};

async function redirected(promise: Promise<unknown>): Promise<string> {
  try {
    await promise;
  } catch (error) {
    const message = (error as Error).message;
    if (message.startsWith("REDIRECT:")) return message.slice("REDIRECT:".length);
    throw error;
  }
  throw new Error("expected a redirect");
}

describe.skipIf(!url)("core user flow", () => {
  const tag = `core-flow-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const email = (who: string) => `${tag}-${who}@example.test`;
  const password = "correct horse battery";

  let register: typeof import("@/app/(auth)/register/actions");
  let login: typeof import("@/app/(auth)/login/actions");
  let appActions: typeof import("@/app/(app)/actions");
  let taskActions: typeof import("@/app/(app)/tasks/actions");
  let session: typeof import("@/lib/auth/session");
  let tasks: typeof import("@/db/tasks");
  let db: ReturnType<(typeof import("@/db"))["getDb"]>;
  let schema: (typeof import("@/db"))["schema"];

  beforeAll(async () => {
    process.env.DATABASE_URL = url;
    const index = await import("@/db");
    db = index.getDb();
    schema = index.schema;
    register = await import("@/app/(auth)/register/actions");
    login = await import("@/app/(auth)/login/actions");
    appActions = await import("@/app/(app)/actions");
    taskActions = await import("@/app/(app)/tasks/actions");
    session = await import("@/lib/auth/session");
    tasks = await import("@/db/tasks");
  });

  afterAll(async () => {
    if (!db) return;
    const { like } = await import("drizzle-orm");
    // Cascades remove the users' sessions, settings, tasks, rules and completions.
    await db.delete(schema.users).where(like(schema.users.email, `${tag}-%@example.test`));
  });

  const signUp = (who: string) =>
    redirected(
      register.registerAction(null, form({ name: `Flow ${who}`, email: email(who), password, confirmPassword: password })),
    );
  const create = (fields: Record<string, string>) =>
    redirected(taskActions.createTaskAction(null, form({ notes: "", lifeArea: "Fitness", ...fields })));
  const me = async () => {
    const user = await session.getCurrentUser();
    expect(user).not.toBeNull();
    return user!.id;
  };

  let userA = 0;
  let dailyId = 0;
  let oneTimeId = 0;

  it("registers and lands on the dashboard with a session", async () => {
    expect(await signUp("a")).toBe("/dashboard");
    userA = await me();
    expect((await session.getCurrentUser())?.email).toBe(email("a"));
  });

  it("creates a one-time and a daily task", async () => {
    await create({ title: "Flow one-time", recurrence: "none", dateKind: "scheduled", date: TODAY });
    await create({ title: "Flow daily", recurrence: "daily" });
    const list = await tasks.listTasks(userA, TODAY, "Monday");
    oneTimeId = list.find((t) => t.title === "Flow one-time")!.id;
    dailyId = list.find((t) => t.title === "Flow daily")!.id;
    expect(list).toHaveLength(2);
  });

  it("shows both tasks as relevant today", async () => {
    const dashboard = await tasks.getDashboard(userA, TODAY, ZONE, "Monday");
    expect(dashboard.items.map((i) => i.title).sort()).toEqual(["Flow daily", "Flow one-time"]);
    expect(dashboard.doneCount).toBe(0);
    expect(dashboard.openCount).toBe(2);
  });

  it("completes the daily task from the dashboard", async () => {
    expect(await redirected(taskActions.setTaskCompletedAction(form({ taskId: String(dailyId), completed: "true", returnTo: "/dashboard" })))).toBe(
      "/dashboard",
    );
    const dashboard = await tasks.getDashboard(userA, TODAY, ZONE, "Monday");
    expect(dashboard.items.find((i) => i.id === dailyId)?.done).toBe(true);
    expect(dashboard.items.find((i) => i.id === oneTimeId)?.done).toBe(false);
  });

  const expectCompletionShown = async () => {
    const overview = await tasks.getWeeklyOverview(userA, WEEK_START, TODAY, ZONE);
    const tuesday = overview.days.find((d) => d.date === TODAY)!;
    expect(tuesday.items.find((i) => i.id === dailyId)?.done).toBe(true);
    expect(tuesday.items.find((i) => i.id === oneTimeId)?.done).toBe(false);

    const progress = await tasks.getProgress(userA, TODAY, ZONE, "Monday");
    expect(progress.week.completed).toBe(1);
    expect(progress.week.planned).toBeGreaterThanOrEqual(2);
    expect(progress.streak).toBe(1);
    expect(progress.days.find((d) => d.date === TODAY)?.completed).toBe(1);
  };

  it("shows the completion in the Weekly Overview and Progress", expectCompletionShown);

  it("logs out and the old session no longer works", async () => {
    const oldToken = jar.get("session")!;
    expect(await redirected(appActions.logoutAction())).toBe("/login");
    expect(jar.has("session")).toBe(false);
    expect(await session.getCurrentUser()).toBeNull();
    jar.set("session", oldToken);
    expect(await session.getCurrentUser()).toBeNull();
    jar.delete("session");
  });

  it("logs in again and finds the same tasks and completion", async () => {
    expect(await redirected(login.loginAction(null, form({ email: email("a"), password })))).toBe("/dashboard");
    expect(await me()).toBe(userA);
    expect(await tasks.listTasks(userA, TODAY, "Monday")).toHaveLength(2);
    await expectCompletionShown();
  });

  it("rejects a wrong password", async () => {
    jar.delete("session");
    const state = await login.loginAction(null, form({ email: email("a"), password: "not the password" }));
    expect(state?.errors?.form).toBeDefined();
    expect(jar.has("session")).toBe(false);
  });

  it("keeps a second user's data separate", async () => {
    expect(await signUp("b")).toBe("/dashboard");
    const userB = await me();
    expect(userB).not.toBe(userA);
    expect(await tasks.listTasks(userB, TODAY, "Monday")).toEqual([]);
    expect((await tasks.getDashboard(userB, TODAY, ZONE, "Monday")).hasTasks).toBe(false);
    const progress = await tasks.getProgress(userB, TODAY, ZONE, "Monday");
    expect(progress.week.completed).toBe(0);
    expect(progress.streak).toBe(0);
    expect((await tasks.getWeeklyOverview(userB, WEEK_START, TODAY, ZONE)).hasTasks).toBe(false);

    // B can neither read nor complete A's task, and A's completion is untouched.
    expect(await tasks.getTask(userB, dailyId, TODAY, "Monday")).toBeNull();
    await redirected(taskActions.setTaskCompletedAction(form({ taskId: String(oneTimeId), completed: "true" })));
    jar.delete("session");
    await redirected(login.loginAction(null, form({ email: email("a"), password })));
    expect(await me()).toBe(userA);
    const dashboard = await tasks.getDashboard(userA, TODAY, ZONE, "Monday");
    expect(dashboard.items.find((i) => i.id === oneTimeId)?.done).toBe(false);
    expect(dashboard.items.find((i) => i.id === dailyId)?.done).toBe(true);
  });
});
