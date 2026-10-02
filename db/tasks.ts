import "server-only";

import { and, asc, between, desc, eq, inArray, or, sql } from "drizzle-orm";
import { calendarDateOf, endOfWeek, startOfWeek, type CalendarDate } from "@/lib/dates/calendar-date";
import { buildDashboard, type Dashboard } from "@/lib/tasks/dashboard";
import type { LifeArea } from "./schema";
import { cappedWeekCount, isRelevantOn, type RecurrenceRule } from "@/lib/tasks/recurrence";
import type { TaskSchedule } from "@/lib/tasks/validation";
import { getDb, schema } from "./index";

const { tasks, recurrenceRules, taskCompletions } = schema;

// Every function takes the authenticated user's id first and filters by it in
// SQL. A task of another user is indistinguishable from a missing one. Rules
// and completions are only reached through the owner-filtered task row.
// "Today" is passed in by the caller (central calendar-date module); the data
// layer has no clock.

export type TaskRecord = {
  id: number;
  title: string;
  notes: string | null;
  lifeArea: LifeArea;
  // Only meaningful for one-time tasks; recurring tasks have no dates.
  schedule: TaskSchedule;
  rule: RecurrenceRule;
  // One-time: has been completed. Recurring: done today (never permanent).
  completed: boolean;
  // Recurring only: whether marking it done today would be accepted (or it is already done).
  canCompleteToday: boolean;
  // Times-per-week only: completion dates this calendar week, capped at the target.
  weekCount: number | null;
  // Any completion of any date exists.
  hasCompletionHistory: boolean;
  createdAt: Date;
};

export type TaskWriteInput = {
  title: string;
  notes: string | null;
  lifeArea: LifeArea;
  rule: RecurrenceRule;
  // Only used for one-time tasks. undefined (update only) = leave the dates as they are.
  schedule: TaskSchedule | undefined;
};

type DateColumns = { scheduledDate: CalendarDate | null; dueDate: CalendarDate | null };
const NO_DATES: DateColumns = { scheduledDate: null, dueDate: null };

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

type RuleColumns = {
  type: RecurrenceRule["type"] | null;
  weekdays: number[] | null;
  timesPerWeek: number | null;
};

function toRule(row: RuleColumns): RecurrenceRule {
  switch (row.type) {
    case "daily":
      return { type: "daily" };
    case "weekdays":
      return { type: "weekdays", weekdays: [...(row.weekdays ?? [])].sort((a, b) => a - b) };
    case "times_per_week":
      return { type: "times_per_week", timesPerWeek: row.timesPerWeek ?? 1 };
    default:
      return { type: "none" };
  }
}

function toRuleColumns(rule: RecurrenceRule) {
  return {
    type: rule.type,
    weekdays: rule.type === "weekdays" ? rule.weekdays : null,
    timesPerWeek: rule.type === "times_per_week" ? rule.timesPerWeek : null,
  };
}

const hasHistoryExpr = sql<number>`EXISTS (SELECT 1 FROM task_completions tc WHERE tc.task_id = ${sql.raw("`tasks`.`id`")})`;

const taskSelection = {
  id: tasks.id,
  title: tasks.title,
  notes: tasks.notes,
  lifeArea: tasks.lifeArea,
  scheduledDate: tasks.scheduledDate,
  dueDate: tasks.dueDate,
  createdAt: tasks.createdAt,
  hasHistory: hasHistoryExpr,
  ruleType: recurrenceRules.type,
  ruleWeekdays: recurrenceRules.weekdays,
  ruleTimesPerWeek: recurrenceRules.timesPerWeek,
};

type TaskRow = {
  id: number;
  title: string;
  notes: string | null;
  lifeArea: LifeArea;
  scheduledDate: CalendarDate | null;
  dueDate: CalendarDate | null;
  createdAt: Date;
  hasHistory: number | boolean;
  ruleType: RecurrenceRule["type"] | null;
  ruleWeekdays: number[] | null;
  ruleTimesPerWeek: number | null;
};

// Completion dates of the given tasks in the calendar week of `today`, grouped by task.
async function weekCompletions(taskIds: number[], today: CalendarDate): Promise<Map<number, Set<CalendarDate>>> {
  const byTask = new Map<number, Set<CalendarDate>>();
  if (taskIds.length === 0) return byTask;
  const rows = await getDb()
    .select({ taskId: taskCompletions.taskId, completedOn: taskCompletions.completedOn })
    .from(taskCompletions)
    .where(
      and(
        inArray(taskCompletions.taskId, taskIds),
        between(taskCompletions.completedOn, startOfWeek(today), endOfWeek(today)),
      ),
    );
  for (const row of rows) {
    const set = byTask.get(row.taskId) ?? new Set<CalendarDate>();
    set.add(row.completedOn);
    byTask.set(row.taskId, set);
  }
  return byTask;
}

function toRecord(row: TaskRow, week: ReadonlySet<CalendarDate>, today: CalendarDate): TaskRecord {
  const rule = toRule({ type: row.ruleType, weekdays: row.ruleWeekdays, timesPerWeek: row.ruleTimesPerWeek });
  const hasHistory = Boolean(Number(row.hasHistory));
  const base = {
    id: row.id,
    title: row.title,
    notes: row.notes,
    lifeArea: row.lifeArea,
    schedule: toSchedule(row),
    rule,
    hasCompletionHistory: hasHistory,
    createdAt: row.createdAt,
  };
  if (rule.type === "none") {
    return { ...base, completed: hasHistory, canCompleteToday: false, weekCount: null };
  }
  return {
    ...base,
    completed: week.has(today),
    canCompleteToday: isRelevantOn(rule, today, { completionDatesInWeek: week }),
    weekCount: rule.type === "times_per_week" ? cappedWeekCount(week.size, rule.timesPerWeek) : null,
  };
}

// Incomplete tasks first (recurring: not done today), then newest first.
// Dates and relevance never affect the list.
export async function listTasks(userId: number, today: CalendarDate): Promise<TaskRecord[]> {
  const rows = await getDb()
    .select(taskSelection)
    .from(tasks)
    .leftJoin(recurrenceRules, eq(recurrenceRules.taskId, tasks.id))
    .where(eq(tasks.userId, userId))
    .orderBy(desc(tasks.createdAt), desc(tasks.id));
  const weeks = await weekCompletions(
    rows.map((row) => row.id),
    today,
  );
  const records = rows.map((row) => toRecord(row, weeks.get(row.id) ?? new Set(), today));
  // Stable sort: the query already ordered each group newest first.
  return records.sort((a, b) => Number(a.completed) - Number(b.completed));
}

// Everything the Dashboard shows, for one user. Completions are loaded for the
// calendar week of `today`, plus every completion of one-time tasks (their
// single completion decides "completed today" and the dated week's progress
// whatever its date). `timeZone` only converts creation instants to calendar dates.
export async function getDashboard(userId: number, today: CalendarDate, timeZone: string): Promise<Dashboard> {
  const rows = await getDb()
    .select(taskSelection)
    .from(tasks)
    .leftJoin(recurrenceRules, eq(recurrenceRules.taskId, tasks.id))
    .where(eq(tasks.userId, userId))
    .orderBy(desc(tasks.createdAt), desc(tasks.id));
  const completions = new Map<number, Set<CalendarDate>>();
  if (rows.length > 0) {
    const oneTimeIds = rows.filter((row) => (row.ruleType ?? "none") === "none").map((row) => row.id);
    const inRange = between(taskCompletions.completedOn, startOfWeek(today), endOfWeek(today));
    const found = await getDb()
      .select({ taskId: taskCompletions.taskId, completedOn: taskCompletions.completedOn })
      .from(taskCompletions)
      .where(
        and(
          inArray(
            taskCompletions.taskId,
            rows.map((row) => row.id),
          ),
          oneTimeIds.length > 0 ? or(inRange, inArray(taskCompletions.taskId, oneTimeIds)) : inRange,
        ),
      );
    for (const row of found) {
      const set = completions.get(row.taskId) ?? new Set<CalendarDate>();
      set.add(row.completedOn);
      completions.set(row.taskId, set);
    }
  }
  return buildDashboard(
    rows.map((row) => ({
      id: row.id,
      title: row.title,
      lifeArea: row.lifeArea,
      rule: toRule({ type: row.ruleType, weekdays: row.ruleWeekdays, timesPerWeek: row.ruleTimesPerWeek }),
      scheduledDate: row.scheduledDate,
      dueDate: row.dueDate,
      createdOn: calendarDateOf(row.createdAt, timeZone),
      completionDates: completions.get(row.id) ?? new Set<CalendarDate>(),
    })),
    today,
  );
}

export async function getTask(userId: number, taskId: number, today: CalendarDate): Promise<TaskRecord | null> {
  const [row] = await getDb()
    .select(taskSelection)
    .from(tasks)
    .leftJoin(recurrenceRules, eq(recurrenceRules.taskId, tasks.id))
    .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)))
    .limit(1);
  if (!row) return null;
  const weeks = await weekCompletions([row.id], today);
  return toRecord(row, weeks.get(row.id) ?? new Set(), today);
}

// Creates a task and its recurrence rule. Recurring tasks never get dates.
export async function createTask(
  userId: number,
  input: Omit<TaskWriteInput, "schedule"> & { schedule: TaskSchedule | undefined },
): Promise<{ id: number }> {
  const dates = input.rule.type === "none" ? toColumns(input.schedule ?? { kind: "none" }) : NO_DATES;
  return getDb().transaction(async (tx) => {
    const [result] = await tx.insert(tasks).values({
      userId,
      title: input.title,
      notes: input.notes,
      lifeArea: input.lifeArea,
      ...dates,
    });
    await tx.insert(recurrenceRules).values({ taskId: result.insertId, ...toRuleColumns(input.rule) });
    return { id: result.insertId };
  });
}

type Tx = Parameters<Parameters<ReturnType<typeof getDb>["transaction"]>[0]>[0];

// Locks the task row (owner-filtered) so completing and editing serialize, then
// reads the rule and history. The locking read has no subquery on purpose: the
// consistent reads that follow must start after the lock is held, so they see
// everything an earlier transaction committed.
async function lockOwnTask(tx: Tx, userId: number, taskId: number) {
  const [row] = await tx
    .select({ id: tasks.id, scheduledDate: tasks.scheduledDate, dueDate: tasks.dueDate })
    .from(tasks)
    .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)))
    .limit(1)
    .for("update");
  if (!row) return null;
  const [ruleRow] = await tx
    .select({ type: recurrenceRules.type, weekdays: recurrenceRules.weekdays, timesPerWeek: recurrenceRules.timesPerWeek })
    .from(recurrenceRules)
    .where(eq(recurrenceRules.taskId, taskId))
    .limit(1);
  const [history] = await tx
    .select({ id: taskCompletions.id })
    .from(taskCompletions)
    .where(eq(taskCompletions.taskId, taskId))
    .limit(1);
  return {
    schedule: toSchedule(row),
    rule: toRule(ruleRow ?? { type: null, weekdays: null, timesPerWeek: null }),
    hasHistory: history !== undefined,
  };
}

export type UpdateOutcome = "ok" | "not_found" | "date_locked" | "recurrence_locked" | "history_locked";

// Decided from the locked state:
// - one-time -> one-time: dates are locked while the task is completed.
// - one-time -> recurring: rejected while completed; otherwise dates are cleared.
// - recurring -> recurring: rule rewritten, completions untouched.
// - recurring -> one-time: rejected when ANY completion exists; history is never
//   deleted or migrated by an edit.
export async function updateTask(
  userId: number,
  taskId: number,
  input: TaskWriteInput,
): Promise<UpdateOutcome> {
  return getDb().transaction(async (tx) => {
    const current = await lockOwnTask(tx, userId, taskId);
    if (!current) return "not_found";

    const wasOneTime = current.rule.type === "none";
    const becomesOneTime = input.rule.type === "none";
    let dateColumns: DateColumns | undefined;

    if (becomesOneTime && wasOneTime) {
      if (input.schedule) {
        if (current.hasHistory && !sameSchedule(input.schedule, current.schedule)) return "date_locked";
        if (!current.hasHistory) dateColumns = toColumns(input.schedule);
      }
    } else if (becomesOneTime) {
      if (current.hasHistory) return "history_locked";
      dateColumns = toColumns(input.schedule ?? { kind: "none" });
    } else {
      if (wasOneTime && current.hasHistory) return "recurrence_locked";
      dateColumns = NO_DATES;
    }

    await tx
      .update(tasks)
      .set({ title: input.title, notes: input.notes, lifeArea: input.lifeArea, ...dateColumns })
      .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)));

    const ruleColumns = toRuleColumns(input.rule);
    await tx
      .insert(recurrenceRules)
      .values({ taskId, ...ruleColumns })
      .onDuplicateKeyUpdate({ set: ruleColumns });
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

// Explicit, idempotent state (not a toggle). `today` comes from the caller
// (central calendar-date module); it is unrelated to the task's own dates.
//
// One-time tasks: a single completion, as before.
// Recurring tasks: a completion for `today` only. Marking done is accepted
// only while the rule makes the task relevant today (or it is already done:
// no-op); un-completing removes only today's completion and is never rejected.
export async function setTaskCompleted(
  userId: number,
  taskId: number,
  completed: boolean,
  today: CalendarDate,
): Promise<"ok" | "not_found" | "not_relevant"> {
  return getDb().transaction(async (tx) => {
    const current = await lockOwnTask(tx, userId, taskId);
    if (!current) return "not_found";

    if (current.rule.type === "none") {
      if (completed) {
        if (!current.hasHistory) {
          await tx
            .insert(taskCompletions)
            .values({ taskId, completedOn: today })
            .onDuplicateKeyUpdate({ set: { taskId } });
        }
      } else {
        await tx.delete(taskCompletions).where(eq(taskCompletions.taskId, taskId));
      }
      return "ok";
    }

    if (!completed) {
      await tx
        .delete(taskCompletions)
        .where(and(eq(taskCompletions.taskId, taskId), eq(taskCompletions.completedOn, today)));
      return "ok";
    }

    // The row lock above serializes requests for this task, so the week read
    // below cannot race another completion of the same task.
    const rows = await tx
      .select({ completedOn: taskCompletions.completedOn })
      .from(taskCompletions)
      .where(
        and(
          eq(taskCompletions.taskId, taskId),
          between(taskCompletions.completedOn, startOfWeek(today), endOfWeek(today)),
        ),
      )
      .orderBy(asc(taskCompletions.completedOn));
    const week = new Set(rows.map((row) => row.completedOn));
    if (week.has(today)) return "ok";
    if (!isRelevantOn(current.rule, today, { completionDatesInWeek: week })) return "not_relevant";
    await tx.insert(taskCompletions).values({ taskId, completedOn: today });
    return "ok";
  });
}

