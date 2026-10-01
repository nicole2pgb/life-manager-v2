import "server-only";

import { and, desc, eq, sql } from "drizzle-orm";
import type { CalendarDate } from "@/lib/dates/calendar-date";
import type { LifeArea } from "./schema";
import type { TaskSchedule } from "@/lib/tasks/validation";
import { getDb, schema } from "./index";

const { tasks, recurrenceRules, taskCompletions } = schema;

// Every function takes the authenticated user's id first and filters by it in
// SQL. A task of another user is indistinguishable from a missing one.

export type TaskRecord = {
  id: number;
  title: string;
  notes: string | null;
  lifeArea: LifeArea;
  schedule: TaskSchedule;
  completed: boolean;
  createdAt: Date;
};

export type TaskWriteInput = {
  title: string;
  notes: string | null;
  lifeArea: LifeArea;
  // undefined (update only) = leave the dates as they are.
  schedule: TaskSchedule | undefined;
};

type DateColumns = { scheduledDate: CalendarDate | null; dueDate: CalendarDate | null };

function toColumns(schedule: TaskSchedule): DateColumns {
  return {
    scheduledDate: schedule.kind === "scheduled" ? schedule.date : null,
    dueDate: schedule.kind === "due" ? schedule.date : null,
  };
}

function toSchedule(row: DateColumns): TaskSchedule {
  if (row.scheduledDate) return { kind: "scheduled", date: row.scheduledDate };
  if (row.dueDate) return { kind: "due", date: row.dueDate };
  return { kind: "none" };
}

function sameSchedule(a: TaskSchedule, b: TaskSchedule): boolean {
  return a.kind === b.kind && (a.kind === "none" || (b.kind !== "none" && a.date === b.date));
}

// The outer column is written out (and the inner table aliased): drizzle drops
// table qualifiers in single-table selects, which would make `id` ambiguous.
const completedExpr = sql<number>`EXISTS (SELECT 1 FROM task_completions tc WHERE tc.task_id = ${sql.raw("`tasks`.`id`")})`;

const taskSelection = {
  id: tasks.id,
  title: tasks.title,
  notes: tasks.notes,
  lifeArea: tasks.lifeArea,
  scheduledDate: tasks.scheduledDate,
  dueDate: tasks.dueDate,
  createdAt: tasks.createdAt,
  completed: completedExpr,
};

function toRecord(row: {
  id: number;
  title: string;
  notes: string | null;
  lifeArea: LifeArea;
  scheduledDate: CalendarDate | null;
  dueDate: CalendarDate | null;
  createdAt: Date;
  completed: number | boolean;
}): TaskRecord {
  return {
    id: row.id,
    title: row.title,
    notes: row.notes,
    lifeArea: row.lifeArea,
    schedule: toSchedule(row),
    completed: Boolean(Number(row.completed)),
    createdAt: row.createdAt,
  };
}

// Incomplete tasks first, then newest first. Dates never affect the list.
export async function listTasks(userId: number): Promise<TaskRecord[]> {
  const rows = await getDb()
    .select(taskSelection)
    .from(tasks)
    .where(eq(tasks.userId, userId))
    .orderBy(completedExpr, desc(tasks.createdAt), desc(tasks.id));
  return rows.map(toRecord);
}

export async function getTask(userId: number, taskId: number): Promise<TaskRecord | null> {
  const [row] = await getDb()
    .select(taskSelection)
    .from(tasks)
    .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)))
    .limit(1);
  return row ? toRecord(row) : null;
}

// Creates a one-time task: the task and its recurrence rule of type "none".
export async function createTask(
  userId: number,
  input: Omit<TaskWriteInput, "schedule"> & { schedule: TaskSchedule },
): Promise<{ id: number }> {
  return getDb().transaction(async (tx) => {
    const [result] = await tx.insert(tasks).values({
      userId,
      title: input.title,
      notes: input.notes,
      lifeArea: input.lifeArea,
      ...toColumns(input.schedule),
    });
    await tx.insert(recurrenceRules).values({ taskId: result.insertId, type: "none" });
    return { id: result.insertId };
  });
}

type Tx = Parameters<Parameters<ReturnType<typeof getDb>["transaction"]>[0]>[0];

// Locks the task row (owner-filtered) so completing and editing serialize.
async function lockOwnTask(tx: Tx, userId: number, taskId: number) {
  const [row] = await tx
    .select({
      id: tasks.id,
      scheduledDate: tasks.scheduledDate,
      dueDate: tasks.dueDate,
      completed: completedExpr,
    })
    .from(tasks)
    .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)))
    .limit(1)
    .for("update");
  return row ?? null;
}

// While a task is completed its dates are locked: a different schedule
// returns "date_locked" and nothing is written.
export async function updateTask(
  userId: number,
  taskId: number,
  input: TaskWriteInput,
): Promise<"ok" | "not_found" | "date_locked"> {
  return getDb().transaction(async (tx) => {
    const current = await lockOwnTask(tx, userId, taskId);
    if (!current) return "not_found";

    const completed = Boolean(Number(current.completed));
    let dateColumns: DateColumns | undefined;
    if (input.schedule) {
      if (completed && !sameSchedule(input.schedule, toSchedule(current))) return "date_locked";
      if (!completed) dateColumns = toColumns(input.schedule);
    }

    await tx
      .update(tasks)
      .set({ title: input.title, notes: input.notes, lifeArea: input.lifeArea, ...dateColumns })
      .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)));
    return "ok";
  });
}

// Completion rows and the recurrence rule go with the task (foreign-key cascade).
export async function deleteTask(userId: number, taskId: number): Promise<"ok" | "not_found"> {
  const [result] = await getDb()
    .delete(tasks)
    .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)));
  return result.affectedRows > 0 ? "ok" : "not_found";
}

// Explicit, idempotent state (not a toggle). `completedOn` comes from the
// caller (central calendar-date module); it is unrelated to the task's dates.
export async function setTaskCompleted(
  userId: number,
  taskId: number,
  completed: boolean,
  completedOn: CalendarDate,
): Promise<"ok" | "not_found"> {
  return getDb().transaction(async (tx) => {
    const current = await lockOwnTask(tx, userId, taskId);
    if (!current) return "not_found";

    if (completed) {
      if (!Boolean(Number(current.completed))) {
        await tx
          .insert(taskCompletions)
          .values({ taskId, completedOn })
          .onDuplicateKeyUpdate({ set: { taskId } });
      }
    } else {
      await tx.delete(taskCompletions).where(eq(taskCompletions.taskId, taskId));
    }
    return "ok";
  });
}
