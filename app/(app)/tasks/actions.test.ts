import { revalidatePath } from "next/cache";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

// Server Action tests against a real database; they only run with
// TEST_DATABASE_URL and clean up the users they create.
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

const session = { id: 0 };
vi.mock("@/lib/auth/session", () => ({ getCurrentUser: async () => (session.id ? { id: session.id } : null) }));
// 2026-10-06 is a Tuesday (calendar week 2026-10-05 .. 2026-10-11).
const clock = { today: "2026-10-06" };
vi.mock("@/lib/dates/time-zone", () => ({ getTodayFor: async () => clock.today }));

const form = (fields: Record<string, string | string[]>) => {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    for (const v of Array.isArray(value) ? value : [value]) data.append(key, v);
  }
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

describe.skipIf(!url)("task Server Actions with recurrence", () => {
  let actions: typeof import("./actions");
  let tasks: typeof import("@/db/tasks");
  let db: ReturnType<(typeof import("@/db"))["getDb"]>;
  let schema: (typeof import("@/db"))["schema"];
  let userA: number;
  let userB: number;
  const tag = `act-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const common = { title: "Gym", notes: "", lifeArea: "Fitness" };

  beforeAll(async () => {
    process.env.DATABASE_URL = url;
    const index = await import("@/db");
    db = index.getDb();
    schema = index.schema;
    actions = await import("./actions");
    tasks = await import("@/db/tasks");
    const add = async (name: string) =>
      (await db.insert(schema.users).values({ name, email: `${tag}-${name}@example.test`, passwordHash: "x" }))[0].insertId;
    userA = await add("a");
    userB = await add("b");
  });
  afterAll(async () => {
    if (!db) return;
    const { inArray } = await import("drizzle-orm");
    await db.delete(schema.users).where(inArray(schema.users.id, [userA, userB]));
  });
  beforeEach(() => {
    session.id = userA;
    clock.today = "2026-10-06";
  });

  const create = async (fields: Record<string, string | string[]>) => {
    const before = (await tasks.listTasks(userA, clock.today)).map((t) => t.id);
    const result = await actions
      .createTaskAction(null, form({ ...common, ...fields }))
      .then((r) => ({ state: r }))
      .catch((e: Error) => ({ redirect: e.message }));
    const after = await tasks.listTasks(userA, clock.today);
    return { result, created: after.find((t) => !before.includes(t.id)) };
  };
  const completions = async (id: number) => {
    const { eq } = await import("drizzle-orm");
    return (await db.select().from(schema.taskCompletions).where(eq(schema.taskCompletions.taskId, id))).map((r) => r.completedOn).sort();
  };

  it("creates daily, weekday and times-per-week tasks and rejects invalid recurrence", async () => {
    expect((await create({ recurrence: "daily" })).created?.rule).toEqual({ type: "daily" });
    expect((await create({ recurrence: "weekdays", weekdays: ["4", "1"] })).created?.rule).toEqual({ type: "weekdays", weekdays: [1, 4] });
    expect((await create({ recurrence: "times_per_week", timesPerWeek: "3" })).created?.rule).toEqual({ type: "times_per_week", timesPerWeek: 3 });
    const bad = await create({ recurrence: "weekdays" });
    expect(bad.created).toBeUndefined();
    expect(bad.result).toMatchObject({ state: { errors: { weekdays: expect.any(String) } } });
    const withDate = await create({ recurrence: "daily", dateKind: "due", date: "2026-10-10" });
    expect(withDate.created).toBeUndefined();
    expect(withDate.result).toMatchObject({ state: { errors: { recurrence: expect.any(String) } } });
  });

  it("ignores a forged user id on create", async () => {
    const { created } = await create({ recurrence: "daily", userId: String(userB) });
    expect(created).toBeDefined();
    expect(await tasks.getTask(userB, created!.id, clock.today)).toBeNull();
  });

  it("rejects completion on a non-relevant day, with a notice redirect and nothing written", async () => {
    const { created } = await create({ recurrence: "weekdays", weekdays: ["1", "4"] });
    const to = await redirected(actions.setTaskCompletedAction(form({ taskId: String(created!.id), completed: "true" })));
    expect(to).toBe("/tasks?notice=not-relevant");
    expect(await completions(created!.id)).toEqual([]);
  });

  it("rejects a completion beyond the weekly target the same way", async () => {
    const { created } = await create({ recurrence: "times_per_week", timesPerWeek: "2" });
    const id = String(created!.id);
    for (const today of ["2026-10-05", "2026-10-06"]) {
      clock.today = today;
      expect(await redirected(actions.setTaskCompletedAction(form({ taskId: id, completed: "true" })))).toBe("/tasks");
    }
    clock.today = "2026-10-07";
    expect(await redirected(actions.setTaskCompletedAction(form({ taskId: id, completed: "true" })))).toBe("/tasks?notice=not-relevant");
    expect(await completions(created!.id)).toEqual(["2026-10-05", "2026-10-06"]);
  });

  it("ignores a date or user id sent with a completion request", async () => {
    const { created } = await create({ recurrence: "daily" });
    const to = await redirected(
      actions.setTaskCompletedAction(form({ taskId: String(created!.id), completed: "true", completedOn: "2020-01-01", date: "2020-01-01", userId: String(userB) })),
    );
    expect(to).toBe("/tasks");
    expect(await completions(created!.id)).toEqual(["2026-10-06"]);
  });

  it("does not let another user complete, uncomplete, edit or convert a task", async () => {
    const { created } = await create({ recurrence: "daily" });
    const id = String(created!.id);
    await redirected(actions.setTaskCompletedAction(form({ taskId: id, completed: "true" })));
    session.id = userB;
    await redirected(actions.setTaskCompletedAction(form({ taskId: id, completed: "false" }))); // silently a no-op redirect
    await expect(actions.updateTaskAction(null, form({ ...common, taskId: id, recurrence: "none", dateKind: "none" }))).rejects.toThrow("NOT_FOUND");
    await expect(actions.updateTaskAction(null, form({ ...common, taskId: id, recurrence: "daily" }))).rejects.toThrow("NOT_FOUND");
    session.id = userA;
    expect(await completions(created!.id)).toEqual(["2026-10-06"]);
    expect((await tasks.getTask(userA, created!.id, clock.today))!.rule).toEqual({ type: "daily" });
  });

  it("rejects converting a recurring task with history to one-time, even when posted directly", async () => {
    const { created } = await create({ recurrence: "daily" });
    const id = String(created!.id);
    await redirected(actions.setTaskCompletedAction(form({ taskId: id, completed: "true" })));
    clock.today = "2026-10-07"; // none today, an older completion exists
    const state = await actions.updateTaskAction(null, form({ ...common, taskId: id, recurrence: "none", dateKind: "none" }));
    expect(state?.errors?.recurrence).toMatch(/recurring completion history/);
    expect((await tasks.getTask(userA, created!.id, clock.today))!.rule).toEqual({ type: "daily" });
    expect(await completions(created!.id)).toEqual(["2026-10-06"]);
  });

  it("rejects a completed one-time task becoming recurring and allows an incomplete one", async () => {
    const { created } = await create({ recurrence: "none", dateKind: "due", date: "2026-10-10" });
    const id = String(created!.id);
    await redirected(actions.setTaskCompletedAction(form({ taskId: id, completed: "true" })));
    const state = await actions.updateTaskAction(null, form({ ...common, taskId: id, recurrence: "daily" }));
    expect(state?.errors?.recurrence).toMatch(/incomplete/);
    await redirected(actions.setTaskCompletedAction(form({ taskId: id, completed: "false" })));
    expect(await redirected(actions.updateTaskAction(null, form({ ...common, taskId: id, recurrence: "daily" })))).toBe("/tasks");
    const task = (await tasks.getTask(userA, created!.id, clock.today))!;
    expect(task.rule).toEqual({ type: "daily" });
    expect(task.schedule).toEqual({ kind: "none" });
  });

  it("returns a completion to the dashboard when asked and revalidates both pages", async () => {
    const { created } = await create({ recurrence: "daily" });
    vi.mocked(revalidatePath).mockClear();
    const to = await redirected(
      actions.setTaskCompletedAction(form({ taskId: String(created!.id), completed: "true", returnTo: "/dashboard" })),
    );
    expect(to).toBe("/dashboard");
    expect(vi.mocked(revalidatePath).mock.calls.map(([path]) => path).sort()).toEqual(["/dashboard", "/tasks"]);
    expect(await completions(created!.id)).toEqual(["2026-10-06"]);
  });

  it("returns a rejected dashboard completion to the dashboard with the notice", async () => {
    const { created } = await create({ recurrence: "weekdays", weekdays: ["1", "4"] });
    const to = await redirected(
      actions.setTaskCompletedAction(form({ taskId: String(created!.id), completed: "true", returnTo: "/dashboard" })),
    );
    expect(to).toBe("/dashboard?notice=not-relevant");
    expect(await completions(created!.id)).toEqual([]);
  });

  it("falls back to the task list for any other return target", async () => {
    const { created } = await create({ recurrence: "daily" });
    for (const returnTo of ["https://evil.example", "//evil.example", "/profile", "/dashboard/../x", ""]) {
      expect(
        await redirected(actions.setTaskCompletedAction(form({ taskId: String(created!.id), completed: "true", returnTo }))),
      ).toBe("/tasks");
    }
    expect(await completions(created!.id)).toEqual(["2026-10-06"]);
  });

  it("revalidates the dashboard when tasks are created, edited and deleted", async () => {
    vi.mocked(revalidatePath).mockClear();
    const { created } = await create({ recurrence: "daily" });
    const paths = () => vi.mocked(revalidatePath).mock.calls.map(([path]) => path);
    expect(paths()).toEqual(expect.arrayContaining(["/tasks", "/dashboard"]));
    vi.mocked(revalidatePath).mockClear();
    await redirected(actions.updateTaskAction(null, form({ ...common, taskId: String(created!.id), recurrence: "daily" })));
    expect(paths()).toEqual(expect.arrayContaining(["/tasks", "/dashboard"]));
    vi.mocked(revalidatePath).mockClear();
    await redirected(actions.deleteTaskAction(form({ taskId: String(created!.id) })));
    expect(paths()).toEqual(expect.arrayContaining(["/tasks", "/dashboard"]));
  });
});
