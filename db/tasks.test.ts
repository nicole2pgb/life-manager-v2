import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { RecurrenceRule } from "@/lib/tasks/recurrence";

vi.mock("server-only", () => ({}));

// These tests write to a real MySQL database (migrated schema). They only run
// when TEST_DATABASE_URL is set, create their own users with unique emails and
// delete them (cascading to tasks, rules and completions) afterwards.
const url = process.env.TEST_DATABASE_URL;

type Tasks = typeof import("./tasks");
type Index = typeof import("./index");

describe.skipIf(!url)("recurring tasks data layer", () => {
  let t: Tasks;
  let db: ReturnType<Index["getDb"]>;
  let schema: Index["schema"];
  let userA: number;
  let userB: number;
  const tag = `rt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  // 2026-10-05 is a Monday; the week is 2026-10-05 .. 2026-10-11.
  const MON = "2026-10-05";
  const TUE = "2026-10-06";
  const WED = "2026-10-07";
  const THU = "2026-10-08";
  const FRI = "2026-10-09";
  const SAT = "2026-10-10";
  const NEXT_MON = "2026-10-12";

  const base = { title: "T", notes: null, lifeArea: "Health" as const };
  const daily = { type: "daily" } as const;
  const monThu: RecurrenceRule = { type: "weekdays", weekdays: [1, 4] };
  const perWeek = (n: number) => ({ type: "times_per_week", timesPerWeek: n }) as const;
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
  });

  afterAll(async () => {
    if (!db) return;
    const { inArray } = await import("drizzle-orm");
    await db.delete(schema.users).where(inArray(schema.users.id, [userA, userB]));
  });

  const make = async (rule: Parameters<Tasks["createTask"]>[1]["rule"], schedule?: { kind: "none" } | { kind: "due"; date: string }) =>
    (await t.createTask(userA, { ...base, rule, schedule: schedule as never })).id;
  const get = async (id: number, today = MON) => (await t.getTask(userA, id, today))!;
  const completionDates = async (id: number) => {
    const { eq } = await import("drizzle-orm");
    const rows = await db.select().from(schema.taskCompletions).where(eq(schema.taskCompletions.taskId, id));
    return rows.map((r) => r.completedOn).sort();
  };
  const complete = (id: number, today: string) => t.setTaskCompleted(userA, id, true, today);
  const uncomplete = (id: number, today: string) => t.setTaskCompleted(userA, id, false, today);
  const update = (id: number, rule: Parameters<Tasks["updateTask"]>[2]["rule"], schedule?: Parameters<Tasks["updateTask"]>[2]["schedule"]) =>
    t.updateTask(userA, id, { ...base, rule, schedule });

  describe("create and read", () => {
    it("stores sorted weekdays, one rule row and no dates", async () => {
      const id = await make({ type: "weekdays", weekdays: [1, 4] });
      const task = await get(id);
      expect(task.rule).toEqual({ type: "weekdays", weekdays: [1, 4] });
      expect(task.schedule).toEqual({ kind: "none" });
      const { eq } = await import("drizzle-orm");
      const rules = await db.select().from(schema.recurrenceRules).where(eq(schema.recurrenceRules.taskId, id));
      expect(rules).toHaveLength(1);
    });
    it("keeps one-time tasks one-time with their date", async () => {
      const id = await make(oneTime, { kind: "due", date: "2026-10-10" });
      const task = await get(id);
      expect(task.rule).toEqual({ type: "none" });
      expect(task.schedule).toEqual({ kind: "due", date: "2026-10-10" });
      expect(task.completed).toBe(false);
    });
    it("shows a recurring task done today, open the next day, never permanently completed", async () => {
      const id = await make(daily);
      expect(await complete(id, MON)).toBe("ok");
      expect((await get(id, MON)).completed).toBe(true);
      expect((await get(id, TUE)).completed).toBe(false);
      expect((await get(id, TUE)).hasCompletionHistory).toBe(true);
    });
    it("lists a task done yesterday but not today among the incomplete tasks, newest first", async () => {
      const done = await make(daily);
      await complete(done, MON);
      const open = await make(daily);
      const list = await t.listTasks(userA, TUE);
      const ids = list.map((x) => x.id);
      expect(ids.indexOf(open)).toBeLessThan(ids.indexOf(done)); // both incomplete, newest first
      expect(list.find((x) => x.id === done)!.completed).toBe(false);
      // On the day it was completed it moves to the completed group.
      const listMon = await t.listTasks(userA, MON);
      expect(listMon.findIndex((x) => x.id === open)).toBeLessThan(listMon.findIndex((x) => x.id === done));
      expect(listMon.find((x) => x.id === done)!.completed).toBe(true);
    });
    it("counts times-per-week completions in the calendar week and resets on a new week", async () => {
      const id = await make(perWeek(3));
      await complete(id, MON);
      await complete(id, WED);
      expect((await get(id, THU)).weekCount).toBe(2);
      expect((await get(id, NEXT_MON)).weekCount).toBe(0);
      expect((await get(id, NEXT_MON)).canCompleteToday).toBe(true);
    });
  });

  describe("completing recurring tasks", () => {
    it("completes a weekday task on a selected day and rejects other days", async () => {
      const id = await make(monThu);
      expect(await complete(id, MON)).toBe("ok");
      expect(await complete(id, TUE)).toBe("not_relevant");
      expect(await completionDates(id)).toEqual([MON]);
      expect((await get(id, TUE)).canCompleteToday).toBe(false);
      expect((await get(id, THU)).canCompleteToday).toBe(true);
    });
    it("rejects the third day of a 2-times-per-week task but allows the first two", async () => {
      const id = await make(perWeek(2));
      expect(await complete(id, MON)).toBe("ok");
      expect(await complete(id, TUE)).toBe("ok");
      expect(await complete(id, WED)).toBe("not_relevant");
      expect(await completionDates(id)).toEqual([MON, TUE]);
      expect((await get(id, WED)).weekCount).toBe(2);
    });
    it("is idempotent on a double submit and when completing an already done day at the target", async () => {
      const id = await make(perWeek(1));
      expect(await complete(id, MON)).toBe("ok");
      expect(await complete(id, MON)).toBe("ok");
      expect(await completionDates(id)).toEqual([MON]);
    });
    it("un-completing removes only today's completion and re-opens the weekly slot", async () => {
      const id = await make(perWeek(2));
      await complete(id, MON);
      await complete(id, TUE);
      expect(await uncomplete(id, TUE)).toBe("ok");
      expect(await completionDates(id)).toEqual([MON]);
      expect(await complete(id, TUE)).toBe("ok");
      expect((await get(id, TUE)).weekCount).toBe(2);
    });
    it("un-complete is accepted when the task is no longer relevant", async () => {
      const id = await make(daily);
      await complete(id, TUE);
      expect(await update(id, monThu)).toBe("ok"); // Tuesday is not a Mon/Thu day
      expect(await uncomplete(id, TUE)).toBe("ok");
      expect(await completionDates(id)).toEqual([]);
    });
    it("never lets concurrent completions push a times-per-week task past its target", async () => {
      const id = await make(perWeek(2));
      await complete(id, MON);
      const results = await Promise.all([complete(id, TUE), complete(id, WED), complete(id, THU), complete(id, FRI)]);
      expect(results.filter((r) => r === "ok")).toHaveLength(1);
      expect((await completionDates(id)).length).toBe(2);
    });
    it("a double click for the same day yields exactly one completion", async () => {
      const id = await make(daily);
      await Promise.all([complete(id, MON), complete(id, MON), complete(id, MON)]);
      expect(await completionDates(id)).toEqual([MON]);
    });
    it("keeps one-time completion behavior unchanged", async () => {
      const id = await make(oneTime, { kind: "due", date: "2026-10-01" });
      expect(await complete(id, MON)).toBe("ok");
      expect(await complete(id, TUE)).toBe("ok");
      expect(await completionDates(id)).toEqual([MON]);
      expect((await get(id, SAT)).completed).toBe(true);
      expect(await uncomplete(id, SAT)).toBe("ok");
      expect((await get(id)).completed).toBe(false);
      expect((await get(id)).schedule).toEqual({ kind: "due", date: "2026-10-01" });
    });
  });

  describe("changing the recurrence", () => {
    it("keeps completions when switching between recurring types", async () => {
      const id = await make(daily);
      await complete(id, MON);
      await complete(id, TUE);
      expect(await update(id, perWeek(3))).toBe("ok");
      expect(await completionDates(id)).toEqual([MON, TUE]);
      expect((await get(id, WED)).rule).toEqual(perWeek(3));
      expect(await update(id, { type: "weekdays", weekdays: [2] })).toBe("ok");
      expect(await completionDates(id)).toEqual([MON, TUE]);
    });
    it("shows a lowered target capped while keeping every completion row", async () => {
      const id = await make(perWeek(3));
      await complete(id, MON);
      await complete(id, TUE);
      await complete(id, WED);
      expect(await update(id, perWeek(2))).toBe("ok");
      const task = await get(id, THU);
      expect(task.weekCount).toBe(2);
      expect(task.canCompleteToday).toBe(false);
      expect(await completionDates(id)).toEqual([MON, TUE, WED]);
      expect(await complete(id, THU)).toBe("not_relevant");
    });
    it("clears the date when an incomplete one-time task becomes recurring", async () => {
      const id = await make(oneTime, { kind: "due", date: "2026-10-10" });
      expect(await update(id, daily)).toBe("ok");
      const task = await get(id);
      expect(task.schedule).toEqual({ kind: "none" });
      expect(task.rule).toEqual(daily);
    });
    it("rejects a completed one-time task becoming recurring and writes nothing", async () => {
      const id = await make(oneTime, { kind: "due", date: "2026-10-10" });
      await complete(id, MON);
      expect(await update(id, daily)).toBe("recurrence_locked");
      const task = await get(id);
      expect(task.rule).toEqual(oneTime);
      expect(task.schedule).toEqual({ kind: "due", date: "2026-10-10" });
      expect(await completionDates(id)).toEqual([MON]);
      await uncomplete(id, MON);
      expect(await update(id, daily)).toBe("ok");
    });
    it("converts a recurring task without history to a one-time task using the date choice", async () => {
      const id = await make(daily);
      expect(await update(id, oneTime, { kind: "due", date: "2026-11-01" })).toBe("ok");
      const task = await get(id);
      expect(task.rule).toEqual(oneTime);
      expect(task.schedule).toEqual({ kind: "due", date: "2026-11-01" });
      expect(task.completed).toBe(false);
    });
    it("rejects converting a recurring task with any history and leaves rule and completions identical", async () => {
      const id = await make(monThu);
      await complete(id, MON);
      expect(await update(id, oneTime, { kind: "none" })).toBe("history_locked");
      expect((await get(id, TUE)).rule).toEqual(monThu);
      expect(await completionDates(id)).toEqual([MON]);
    });
    it("still rejects when only an older completion exists and none today", async () => {
      const id = await make(daily);
      await complete(id, MON);
      expect(await update(id, oneTime, { kind: "none" })).toBe("history_locked");
      expect(await uncomplete(id, TUE)).toBe("ok"); // nothing for TUE; the MON history stays
      expect(await update(id, oneTime, { kind: "none" })).toBe("history_locked");
    });
    it("still locks the date of a completed one-time task and allows other edits", async () => {
      const id = await make(oneTime, { kind: "due", date: "2026-10-10" });
      await complete(id, MON);
      expect(await update(id, oneTime, { kind: "due", date: "2026-10-11" })).toBe("date_locked");
      expect(await update(id, oneTime, { kind: "due", date: "2026-10-10" })).toBe("ok");
      expect(await update(id, oneTime, undefined)).toBe("ok");
      expect((await get(id)).schedule).toEqual({ kind: "due", date: "2026-10-10" });
    });
  });

  describe("ownership", () => {
    it("treats another user's task as not found for read, edit, convert, complete, uncomplete and delete", async () => {
      const id = await make(daily);
      await complete(id, MON);
      expect(await t.getTask(userB, id, MON)).toBeNull();
      expect(await t.updateTask(userB, id, { ...base, rule: perWeek(2), schedule: undefined })).toBe("not_found");
      expect(await t.updateTask(userB, id, { ...base, rule: oneTime, schedule: { kind: "none" } })).toBe("not_found");
      expect(await t.setTaskCompleted(userB, id, true, TUE)).toBe("not_found");
      expect(await t.setTaskCompleted(userB, id, false, MON)).toBe("not_found");
      expect(await t.deleteTask(userB, id)).toBe("not_found");
      expect((await get(id, TUE)).rule).toEqual(daily);
      expect(await completionDates(id)).toEqual([MON]);
      expect((await t.listTasks(userB, MON)).some((x) => x.id === id)).toBe(false);
    });
    it("deleting a recurring task removes its rule and completions and nothing else", async () => {
      const id = await make(daily);
      const other = await make(daily);
      await complete(id, MON);
      await complete(other, MON);
      expect(await t.deleteTask(userA, id)).toBe("ok");
      const { eq } = await import("drizzle-orm");
      expect(await db.select().from(schema.recurrenceRules).where(eq(schema.recurrenceRules.taskId, id))).toHaveLength(0);
      expect(await completionDates(id)).toEqual([]);
      expect(await completionDates(other)).toEqual([MON]);
    });
  });
});
