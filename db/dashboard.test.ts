import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

// Writes to a real MySQL database (migrated schema); only runs when
// TEST_DATABASE_URL is set. Creates its own users and deletes them (cascading
// to tasks, rules and completions) afterwards.
const url = process.env.TEST_DATABASE_URL;

type Tasks = typeof import("./tasks");
type Index = typeof import("./index");

describe.skipIf(!url)("dashboard data layer", () => {
  let t: Tasks;
  let db: ReturnType<Index["getDb"]>;
  let schema: Index["schema"];
  let userA: number;
  let userB: number;
  let userC: number;
  const tag = `dash-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const TZ = "Europe/Berlin";

  // 2026-10-06 is a Tuesday; the week is 2026-10-05 .. 2026-10-11.
  const MON = "2026-10-05";
  const TUE = "2026-10-06";

  const base = { title: "T", notes: null, lifeArea: "Health" as const };
  const daily = { type: "daily" } as const;
  const oneTime = { type: "none" } as const;

  beforeAll(async () => {
    process.env.DATABASE_URL = url;
    const index = (await import("./index")) as Index;
    db = index.getDb();
    schema = index.schema;
    t = await import("./tasks");
    const insert = async (name: string) => {
      const [r] = await db
        .insert(schema.users)
        .values({ name, email: `${tag}-${name}@example.test`, passwordHash: "x" });
      return r.insertId;
    };
    userA = await insert("a");
    userB = await insert("b");
    userC = await insert("c");
  });

  afterAll(async () => {
    if (!db) return;
    const { inArray } = await import("drizzle-orm");
    await db.delete(schema.users).where(inArray(schema.users.id, [userA, userB, userC]));
  });

  const make = async (user: number, title: string, rule: Parameters<Tasks["createTask"]>[1]["rule"], schedule?: { kind: "none" } | { kind: "due" | "scheduled"; date: string }) =>
    (await t.createTask(user, { ...base, title, rule, schedule: schedule as never })).id;

  // Creation instants come from the database clock; pin them so the week's
  // planned occurrences do not depend on the day the tests run.
  const createdAt = async (id: number, instant: string) => {
    const { eq } = await import("drizzle-orm");
    await db.update(schema.tasks).set({ createdAt: new Date(instant) }).where(eq(schema.tasks.id, id));
  };
  const OLD = "2026-09-01T10:00:00Z";
  const titles = (dash: Awaited<ReturnType<Tasks["getDashboard"]>>) => dash.items.map((i) => i.title);

  it("returns a new user's empty dashboard", async () => {
    const dash = await t.getDashboard(userB, TUE, TZ);
    expect(dash).toMatchObject({ items: [], hasTasks: false });
    expect(dash.week.percent).toBeNull();
  });

  it("lists relevant tasks, tracks completions and computes exact weekly numbers", async () => {
    const dailyId = await make(userA, "daily", daily);
    const overdueId = await make(userA, "overdue", oneTime, { kind: "due", date: "2026-10-01" });
    const carriedId = await make(userA, "carried", oneTime, { kind: "scheduled", date: "2026-10-02" });
    const futureId = await make(userA, "future", oneTime, { kind: "scheduled", date: "2026-10-09" });
    const undatedId = await make(userA, "undated", oneTime);
    for (const id of [dailyId, overdueId, carriedId, futureId, undatedId]) await createdAt(id, OLD);
    await t.setTaskCompleted(userA, dailyId, true, TUE);

    const dash = await t.getDashboard(userA, TUE, TZ);
    // overdue first, then open in newest-created order, done last; "future" is not listed.
    expect(titles(dash).filter((x) => x !== "daily").sort()).toEqual(["carried", "overdue", "undated"]);
    expect(titles(dash)[0]).toBe("overdue");
    expect(titles(dash).at(-1)).toBe("daily");
    const byTitle = Object.fromEntries(dash.items.map((i) => [i.title, i]));
    expect(byTitle.overdue).toMatchObject({ done: false, overdue: true });
    expect(byTitle.carried).toMatchObject({ done: false, overdue: false });
    expect(byTitle.daily).toMatchObject({ done: true });
    // Week 2026-10-05..11: daily 7 + the scheduled-in-week "future" 1. Overdue/carried (past week)
    // and undated add nothing.
    expect(dash.week).toMatchObject({ planned: 8, completed: 1, open: 7, percent: 13 });
    expect(dash).toMatchObject({ openCount: 3, doneCount: 1 });

    // Completing the carried-over and overdue tasks changes Today but never this week's numbers.
    await t.setTaskCompleted(userA, overdueId, true, TUE);
    await t.setTaskCompleted(userA, carriedId, true, TUE);
    const after = await t.getDashboard(userA, TUE, TZ);
    expect(after.week).toMatchObject({ planned: 8, completed: 1 });
    expect(after.doneCount).toBe(3);

    // The next day only the open task and the recurring one remain.
    const wed = await t.getDashboard(userA, "2026-10-07", TZ);
    expect(titles(wed).sort()).toEqual(["daily", "undated"]);
    // Completing the scheduled task counts in its own week.
    await t.setTaskCompleted(userA, futureId, true, "2026-10-07");
    expect((await t.getDashboard(userA, "2026-10-07", TZ)).week).toMatchObject({ planned: 8, completed: 2 });
  });

  it("limits planned occurrences to the creation date, in the application time zone", async () => {
    // userC has no other tasks, so the week totals are exactly this task's.
    const midweek = await make(userC, "midweek", daily);
    // 2026-10-05 22:30 UTC is already Tuesday 2026-10-06 00:30 in Berlin: 6 days remain, not 7.
    await createdAt(midweek, "2026-10-05T22:30:00Z");
    expect((await t.getDashboard(userC, TUE, "Europe/Berlin")).week.planned).toBe(6);
    // The same instant in UTC is still Monday: all 7 days.
    expect((await t.getDashboard(userC, TUE, "UTC")).week.planned).toBe(7);
    await t.deleteTask(userC, midweek);

    const gym = await make(userC, "gym", { type: "times_per_week", timesPerWeek: 3 });
    await createdAt(gym, "2026-10-10T08:00:00Z"); // Saturday: min(3, 2 remaining days)
    expect((await t.getDashboard(userC, TUE, TZ)).week.planned).toBe(2);
    await createdAt(gym, "2026-10-06T08:00:00Z"); // Tuesday: min(3, 6)
    expect((await t.getDashboard(userC, TUE, TZ)).week.planned).toBe(3);
    await createdAt(gym, "2026-10-12T08:00:00Z"); // after the week
    expect((await t.getDashboard(userC, TUE, TZ)).week.planned).toBe(0);
    await t.deleteTask(userC, gym);
  });

  it("shows completed-today and hides completed-earlier one-time tasks", async () => {
    const id = await make(userA, "once", oneTime);
    await createdAt(id, OLD);
    await t.setTaskCompleted(userA, id, true, TUE);
    expect(titles(await t.getDashboard(userA, TUE, TZ))).toContain("once");
    expect(titles(await t.getDashboard(userA, "2026-10-07", TZ))).not.toContain("once");
    await t.setTaskCompleted(userA, id, false, "2026-10-07");
    expect(titles(await t.getDashboard(userA, "2026-10-07", TZ))).toContain("once");
  });

  it("hides a times-per-week task after its target and keeps it when reached today", async () => {
    const id = await make(userA, "twice", { type: "times_per_week", timesPerWeek: 2 });
    await createdAt(id, OLD);
    await t.setTaskCompleted(userA, id, true, "2026-10-05");
    await t.setTaskCompleted(userA, id, true, TUE);
    expect(await t.getDashboard(userA, TUE, TZ)).toMatchObject({ items: expect.arrayContaining([expect.objectContaining({ title: "twice", done: true, weekCount: 2 })]) });
    expect(titles(await t.getDashboard(userA, "2026-10-07", TZ))).not.toContain("twice");
    expect(titles(await t.getDashboard(userA, "2026-10-12", TZ))).toContain("twice");
  });

  it("never exposes or counts another user's tasks and reflects deletes", async () => {
    const own = await make(userB, "b-only", daily);
    await createdAt(own, OLD);
    await t.setTaskCompleted(userB, own, true, MON);
    expect(titles(await t.getDashboard(userA, TUE, TZ))).not.toContain("b-only");
    const b = await t.getDashboard(userB, TUE, TZ);
    expect(titles(b)).toEqual(["b-only"]);
    expect(b.week).toMatchObject({ planned: 7, completed: 1 });
    await t.deleteTask(userB, own);
    expect((await t.getDashboard(userB, TUE, TZ)).hasTasks).toBe(false);
  });
});
