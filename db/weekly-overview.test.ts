import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

// Writes to a real MySQL database (migrated schema); only runs when
// TEST_DATABASE_URL is set. Creates its own users and deletes them (cascading
// to tasks, rules and completions) afterwards.
const url = process.env.TEST_DATABASE_URL;

type Tasks = typeof import("./tasks");
type Index = typeof import("./index");

describe.skipIf(!url)("weekly overview data layer", () => {
  let t: Tasks;
  let db: ReturnType<Index["getDb"]>;
  let schema: Index["schema"];
  let userA: number;
  let userB: number;
  let userC: number;
  const tag = `week-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const TZ = "Europe/Berlin";

  // 2026-10-06 is a Tuesday; the week is 2026-10-05 .. 2026-10-11.
  const PREV = "2026-09-28";
  const MON = "2026-10-05";
  const TUE = "2026-10-06";
  const WED = "2026-10-07";
  const FRI = "2026-10-09";
  const NEXT = "2026-10-12";
  const OLD = "2026-09-01T10:00:00Z";

  const base = { title: "T", notes: null, lifeArea: "Health" as const };
  const daily = { type: "daily" } as const;
  const oneTime = { type: "none" } as const;
  const perWeek = (n: number) => ({ type: "times_per_week", timesPerWeek: n }) as const;

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

  const make = async (
    user: number,
    title: string,
    rule: Parameters<Tasks["createTask"]>[1]["rule"],
    schedule?: { kind: "none" } | { kind: "due" | "scheduled"; date: string },
  ) => (await t.createTask(user, { ...base, title, rule, schedule: schedule as never })).id;

  // Creation instants come from the database clock; pin them so the week does
  // not depend on the day the tests run.
  const createdAt = async (id: number, instant: string) => {
    const { eq } = await import("drizzle-orm");
    await db.update(schema.tasks).set({ createdAt: new Date(instant) }).where(eq(schema.tasks.id, id));
  };
  // Test-only direct completion row, so past and future dates can be set up.
  const complete = async (taskId: number, date: string) => {
    await db.insert(schema.taskCompletions).values({ taskId, completedOn: date });
  };
  const titlesOn = (o: Awaited<ReturnType<Tasks["getWeeklyOverview"]>>, date: string) =>
    o.days.find((d) => d.date === date)?.items.map((i) => i.title) ?? [];

  it("returns a new user's empty overview", async () => {
    const o = await t.getWeeklyOverview(userB, MON, TUE, TZ);
    expect(o).toMatchObject({ hasTasks: false, frequency: [], openTasks: [] });
    expect(o.days).toHaveLength(7);
    expect(o.days.every((d) => d.items.length === 0)).toBe(true);
  });

  it("places tasks per day, in frequency and in open tasks, with completion state", async () => {
    const dailyId = await make(userA, "daily", daily);
    const scheduledId = await make(userA, "scheduled", oneTime, { kind: "scheduled", date: WED });
    const dueId = await make(userA, "due", oneTime, { kind: "due", date: FRI });
    const gymId = await make(userA, "gym", perWeek(3));
    const undatedId = await make(userA, "undated", oneTime);
    const completedUndatedId = await make(userA, "undated done", oneTime);
    for (const id of [dailyId, scheduledId, dueId, gymId, undatedId, completedUndatedId]) await createdAt(id, OLD);
    await complete(dailyId, TUE);
    await complete(gymId, MON);
    await complete(gymId, WED);
    // Dated task completed on another day: done on its own date.
    await complete(scheduledId, FRI);
    await complete(completedUndatedId, "2026-10-01");

    const o = await t.getWeeklyOverview(userA, MON, TUE, TZ);
    expect(titlesOn(o, MON)).toEqual(["daily"]);
    expect(titlesOn(o, WED).sort()).toEqual(["daily", "scheduled"]);
    expect(titlesOn(o, FRI).sort()).toEqual(["daily", "due"]);
    expect(o.days.find((d) => d.date === TUE)?.items[0]).toMatchObject({ title: "daily", done: true });
    expect(o.days.find((d) => d.date === WED)?.items.find((i) => i.title === "scheduled")).toMatchObject({ done: true, kind: "scheduled" });
    expect(o.days.find((d) => d.date === FRI)?.items.find((i) => i.title === "due")).toMatchObject({ done: false, kind: "due" });
    expect(o.days.find((d) => d.date === TUE)?.isToday).toBe(true);
    expect(o.frequency).toMatchObject([{ title: "gym", completed: 2, planned: 3 }]);
    expect(o.openTasks.map((x) => x.title)).toEqual(["undated"]);
    expect(o.hasTasks).toBe(true);

    // Same week as the Dashboard: planned and completed totals agree.
    const dash = await t.getDashboard(userA, TUE, TZ, "Monday");
    const entries = o.days.flatMap((d) => d.items);
    expect(entries.length + o.frequency.reduce((n, f) => n + f.planned, 0)).toBe(dash.week.planned);
    expect(entries.filter((i) => i.done).length + o.frequency.reduce((n, f) => n + f.completed, 0)).toBe(
      dash.week.completed,
    );
  });

  it("shows past and future weeks from stored data", async () => {
    // userA's gym task: 2 completions in the current week, none elsewhere.
    const past = await t.getWeeklyOverview(userA, PREV, TUE, TZ);
    expect(past.frequency).toMatchObject([{ title: "gym", completed: 0, planned: 3 }]);
    expect(titlesOn(past, PREV)).toEqual(["daily"]);
    const future = await t.getWeeklyOverview(userA, NEXT, TUE, TZ);
    expect(future.frequency).toMatchObject([{ title: "gym", completed: 0, planned: 3 }]);
    // A completion outside the viewed week does not count in it.
    expect(future.days.flatMap((d) => d.items).some((i) => i.title === "daily" && i.done)).toBe(false);
    // Open tasks are the same in every week.
    expect(past.openTasks.map((x) => x.title)).toEqual(["undated"]);
    expect(future.openTasks.map((x) => x.title)).toEqual(["undated"]);
    // Dated tasks only appear in their own week.
    expect(titlesOn(past, WED)).not.toContain("scheduled");
  });

  it("uses the creation date in the application time zone", async () => {
    // userC has no other tasks.
    const id = await make(userC, "midweek", daily);
    // 2026-10-05 22:30 UTC is already Tuesday 00:30 in Berlin: Tuesday to Sunday.
    await createdAt(id, "2026-10-05T22:30:00Z");
    const berlin = await t.getWeeklyOverview(userC, MON, TUE, "Europe/Berlin");
    expect(berlin.days.filter((d) => d.items.length > 0).map((d) => d.date)).toEqual([
      TUE, WED, "2026-10-08", FRI, "2026-10-10", "2026-10-11",
    ]);
    const utc = await t.getWeeklyOverview(userC, MON, TUE, "UTC");
    expect(utc.days.filter((d) => d.items.length > 0)).toHaveLength(7);
    await t.deleteTask(userC, id);
  });

  it("shows no task of another user and reflects edits and deletions", async () => {
    // userB sees nothing of userA's tasks.
    const other = await t.getWeeklyOverview(userB, MON, TUE, TZ);
    expect(other.hasTasks).toBe(false);
    expect(other.openTasks).toEqual([]);

    const id = await make(userB, "mine", daily);
    await createdAt(id, OLD);
    expect((await t.getWeeklyOverview(userB, MON, TUE, TZ)).days[0].items.map((i) => i.title)).toEqual(["mine"]);
    expect((await t.getWeeklyOverview(userA, MON, TUE, TZ)).days[0].items.map((i) => i.title)).not.toContain("mine");
    // Another user's completion never marks a task of this user.
    await t.setTaskCompleted(userB, id, true, TUE, "Monday");
    expect((await t.getWeeklyOverview(userA, MON, TUE, TZ)).days[1].items.some((i) => i.title === "mine")).toBe(false);
    expect((await t.getWeeklyOverview(userB, MON, TUE, TZ)).days[1].items[0].done).toBe(true);

    await t.updateTask(userB, id, { ...base, title: "mine", rule: { type: "weekdays", weekdays: [1] }, schedule: undefined } as never);
    expect((await t.getWeeklyOverview(userB, MON, TUE, TZ)).days.filter((d) => d.items.length > 0).map((d) => d.date)).toEqual([MON]);

    await t.deleteTask(userB, id);
    expect((await t.getWeeklyOverview(userB, MON, TUE, TZ)).hasTasks).toBe(false);
  });
});
