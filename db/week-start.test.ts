import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { addDays, startOfWeek } from "@/lib/dates/calendar-date";

vi.mock("server-only", () => ({}));

// Writes to a real MySQL database (migrated schema); only runs when
// TEST_DATABASE_URL is set. Creates its own users and deletes them afterwards.
const url = process.env.TEST_DATABASE_URL;

type Tasks = typeof import("./tasks");
type Index = typeof import("./index");

describe.skipIf(!url)("week start across the data layer", () => {
  let t: Tasks;
  let db: ReturnType<Index["getDb"]>;
  let schema: Index["schema"];
  let user: number;
  const tag = `ws-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const TZ = "Europe/Berlin";

  // 2026-10-04 is a Sunday. Monday-start week: 10-05..10-11; Sunday-start: 10-04..10-10.
  const SUN = "2026-10-04";
  const MON = "2026-10-05";
  const WED = "2026-10-07";
  const OLD = "2026-08-01T10:00:00Z";
  const base = { title: "T", notes: null, lifeArea: "Health" as const };

  beforeAll(async () => {
    process.env.DATABASE_URL = url;
    const index = (await import("./index")) as Index;
    db = index.getDb();
    schema = index.schema;
    t = await import("./tasks");
    const [r] = await db.insert(schema.users).values({ name: "a", email: `${tag}-a@example.test`, passwordHash: "x" });
    user = r.insertId;
  });

  afterAll(async () => {
    if (!db) return;
    const { eq } = await import("drizzle-orm");
    await db.delete(schema.users).where(eq(schema.users.id, user));
  });

  const make = async (rule: Parameters<Tasks["createTask"]>[1]["rule"], schedule?: { kind: "scheduled"; date: string }) => {
    const { eq } = await import("drizzle-orm");
    const { id } = await t.createTask(user, { ...base, rule, schedule: schedule as never });
    await db.update(schema.tasks).set({ createdAt: new Date(OLD) }).where(eq(schema.tasks.id, id));
    return id;
  };
  const completeOn = async (taskId: number, date: string) => {
    await db.insert(schema.taskCompletions).values({ taskId, completedOn: date });
  };

  it("Dashboard, Weekly Overview and Progress cover the same week and numbers for both week starts", async () => {
    const daily = await make({ type: "daily" });
    await completeOn(daily, SUN);
    await completeOn(daily, WED);
    await make({ type: "times_per_week", timesPerWeek: 3 });
    const dated = await make({ type: "none" }, { kind: "scheduled", date: SUN });
    await completeOn(dated, SUN);

    for (const weekStartDay of ["Monday", "Sunday"] as const) {
      const weekStart = startOfWeek(WED, weekStartDay);
      const dashboard = await t.getDashboard(user, WED, TZ, weekStartDay);
      const overview = await t.getWeeklyOverview(user, weekStart, WED, TZ);
      const progress = await t.getProgress(user, WED, TZ, weekStartDay);

      expect(dashboard.week.weekStart).toBe(weekStart);
      expect(dashboard.week.weekEnd).toBe(addDays(weekStart, 6));
      expect(progress.week).toEqual(dashboard.week);
      expect(overview.weekStart).toBe(weekStart);
      expect(overview.days.map((d) => d.date)).toEqual(progress.days.map((d) => d.date));
    }

    // Daily + dated tasks: Sunday 10-04 belongs to the Sunday-start week only.
    const monday = await t.getDashboard(user, WED, TZ, "Monday");
    const sunday = await t.getDashboard(user, WED, TZ, "Sunday");
    expect(monday.week).toMatchObject({ planned: 7 + 3, completed: 1 }); // dated task (Sunday) is in last week
    expect(sunday.week).toMatchObject({ planned: 7 + 3 + 1, completed: 2 + 1 });
  });

  it("a times-per-week completion is accepted or refused according to the week start", async () => {
    const id = await make({ type: "times_per_week", timesPerWeek: 1 });
    await completeOn(id, SUN);
    // Sunday-start: Sunday and Monday share a week, the target of 1 is reached.
    expect(await t.setTaskCompleted(user, id, true, MON, "Sunday")).toBe("not_relevant");
    // Monday-start: Sunday belongs to the previous week.
    expect(await t.setTaskCompleted(user, id, true, MON, "Monday")).toBe("ok");
  });
});
