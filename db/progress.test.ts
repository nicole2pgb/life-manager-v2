import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

// Writes to a real MySQL database (migrated schema); only runs when
// TEST_DATABASE_URL is set. Creates its own users and deletes them (cascading
// to tasks, rules and completions) afterwards.
const url = process.env.TEST_DATABASE_URL;

type Tasks = typeof import("./tasks");
type Index = typeof import("./index");

describe.skipIf(!url)("progress data layer", () => {
  let t: Tasks;
  let db: ReturnType<Index["getDb"]>;
  let schema: Index["schema"];
  let userA: number;
  let userB: number;
  let userC: number;
  const tag = `progress-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const TZ = "Europe/Berlin";

  // 2026-10-07 is a Wednesday; the week is 2026-10-05 .. 2026-10-11.
  const TODAY = "2026-10-07";
  const OLD = "2026-08-01T10:00:00Z";

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
    extra: { lifeArea?: "Fitness" | "Career" | "Health"; schedule?: { kind: "due" | "scheduled"; date: string } } = {},
  ) =>
    (
      await t.createTask(user, {
        ...base,
        title,
        rule,
        lifeArea: extra.lifeArea ?? base.lifeArea,
        schedule: extra.schedule as never,
      })
    ).id;
  // Creation instants come from the database clock; pin them.
  const createdAt = async (id: number, instant: string) => {
    const { eq } = await import("drizzle-orm");
    await db.update(schema.tasks).set({ createdAt: new Date(instant) }).where(eq(schema.tasks.id, id));
  };
  // Test-only direct completion row, so past dates can be set up.
  const complete = async (taskId: number, date: string) => {
    await db.insert(schema.taskCompletions).values({ taskId, completedOn: date });
  };

  it("returns a new user's empty progress", async () => {
    const p = await t.getProgress(userB, TODAY, TZ, "Monday");
    expect(p).toMatchObject({ hasTasks: false, streak: 0, change: null });
    expect(p.week.percent).toBeNull();
    expect(p.days).toHaveLength(7);
    expect(p.lifeAreas).toHaveLength(6);
  });

  it("matches the Dashboard's weekly numbers and calculates both weeks, days and areas", async () => {
    const dailyId = await make(userA, "daily", daily, { lifeArea: "Career" });
    const gymId = await make(userA, "gym", perWeek(3), { lifeArea: "Fitness" });
    const datedId = await make(userA, "dated", oneTime, { schedule: { kind: "scheduled", date: "2026-10-06" } });
    const lastWeekId = await make(userA, "last week", oneTime, { schedule: { kind: "due", date: "2026-09-30" } });
    for (const id of [dailyId, gymId, datedId, lastWeekId]) await createdAt(id, OLD);
    await complete(dailyId, "2026-10-05");
    await complete(dailyId, "2026-10-06");
    await complete(dailyId, "2026-09-29");
    await complete(gymId, "2026-10-05");
    await complete(gymId, "2026-10-07");
    await complete(datedId, "2026-10-07"); // dated Tuesday, completed Wednesday
    await complete(lastWeekId, "2026-10-06"); // due last week, completed this week

    const p = await t.getProgress(userA, TODAY, TZ, "Monday");
    const dash = await t.getDashboard(userA, TODAY, TZ, "Monday");
    expect(p.week).toEqual(dash.week);
    expect(p.week).toMatchObject({ planned: 7 + 3 + 1, completed: 2 + 2 + 1 });
    // Last week: 7 daily days (1 done), the gym target 3 (0 done), the due task (done).
    expect(p.previousWeek).toMatchObject({ planned: 7 + 3 + 1, completed: 1 + 0 + 1 });
    expect(p.change).not.toBeNull();
    // Day placement: gym is not on any day; the dated task is on Tuesday and done.
    expect(p.days.map((d) => [d.planned, d.completed])).toEqual([
      [1, 1],
      [2, 2],
      [1, 0],
      [1, 0],
      [1, 0],
      [1, 0],
      [1, 0],
    ]);
    expect(p.lifeAreas.find((a) => a.area === "Fitness")).toMatchObject({ planned: 3, completed: 2 });
    expect(p.lifeAreas.find((a) => a.area === "Career")).toMatchObject({ planned: 7, completed: 2 });
    expect(p.lifeAreas.reduce((n, a) => n + a.planned, 0)).toBe(p.week.planned);
  });

  it("counts the streak from any completion, across weeks, and continues from yesterday", async () => {
    // userA completed on 09-29, 10-05, 10-06, 10-07, 10-07 above: 10-05..10-07 is 3 days;
    // 10-04 is missing.
    expect((await t.getProgress(userA, TODAY, TZ, "Monday")).streak).toBe(3);
    // Today is open: the streak continues from yesterday.
    expect((await t.getProgress(userA, "2026-10-08", TZ, "Monday")).streak).toBe(3);
    // Two elapsed days without a completion break it.
    expect((await t.getProgress(userA, "2026-10-09", TZ, "Monday")).streak).toBe(0);

    const undated = await make(userC, "undated", oneTime);
    const rule = await make(userC, "weekdays", { type: "weekdays", weekdays: [1] });
    await createdAt(undated, OLD);
    await createdAt(rule, OLD);
    // 09-30 (undated task), 10-01 .. 10-03 (a rule that no longer plans these days), 10-04 (undated).
    for (const d of ["2026-09-30", "2026-10-04"]) await complete(undated, d);
    for (const d of ["2026-10-01", "2026-10-02", "2026-10-03"]) await complete(rule, d);
    expect((await t.getProgress(userC, "2026-10-04", TZ, "Monday")).streak).toBe(5);
  });

  it("shortens the streak when a task with its completions is deleted", async () => {
    // userC has completions on 09-30 .. 10-04 (streak 5). A task completed on 10-05 extends it.
    const gone = await make(userC, "gone", oneTime);
    await complete(gone, "2026-10-05");
    expect((await t.getProgress(userC, "2026-10-05", TZ, "Monday")).streak).toBe(6);
    expect(await t.deleteTask(userC, gone)).toBe("ok");
    // Its completion went with it: today has none yet, the streak continues from 10-04.
    expect((await t.getProgress(userC, "2026-10-05", TZ, "Monday")).streak).toBe(5);
  });

  it("uses the creation date in the application time zone", async () => {
    const id = await make(userB, "midweek", daily);
    // 2026-10-05 22:30 UTC is already Tuesday 00:30 in Berlin: Tuesday to Sunday.
    await createdAt(id, "2026-10-05T22:30:00Z");
    const berlin = await t.getProgress(userB, TODAY, "Europe/Berlin", "Monday");
    expect(berlin.days.map((d) => d.planned)).toEqual([0, 1, 1, 1, 1, 1, 1]);
    const utc = await t.getProgress(userB, TODAY, "UTC", "Monday");
    expect(utc.days.map((d) => d.planned)).toEqual([1, 1, 1, 1, 1, 1, 1]);
    await t.deleteTask(userB, id);
  });

  it("never mixes users and reflects edits and deletions on the next call", async () => {
    const id = await make(userB, "mine", daily);
    await createdAt(id, OLD);
    await complete(id, "2026-10-06");
    await complete(id, "2026-10-07");
    const mine = await t.getProgress(userB, TODAY, TZ, "Monday");
    expect(mine.streak).toBe(2);
    expect(mine.week.planned).toBe(7);
    // userA's numbers do not include userB's task or completions.
    const a = await t.getProgress(userA, TODAY, TZ, "Monday");
    expect(a.week.planned).toBe(11);
    expect(a.days[1].completed).toBe(2);

    await t.updateTask(userB, id, { ...base, title: "mine", rule: { type: "weekdays", weekdays: [1] }, schedule: undefined } as never);
    expect((await t.getProgress(userB, TODAY, TZ, "Monday")).week.planned).toBe(1);

    await t.deleteTask(userB, id);
    const after = await t.getProgress(userB, TODAY, TZ, "Monday");
    expect(after).toMatchObject({ hasTasks: false, streak: 0 });
  });
});
