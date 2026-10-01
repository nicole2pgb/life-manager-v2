"use server";

import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { createTask, deleteTask, setTaskCompleted, updateTask } from "@/db/tasks";
import { todayFor } from "@/lib/dates/calendar-date";
import { getUserTimeZone } from "@/lib/dates/time-zone";
import { getCurrentUser } from "@/lib/auth/session";
import type { TaskFormState } from "@/lib/tasks/form-state";
import { parseTaskId, validateTaskInput, type TaskInput } from "@/lib/tasks/validation";

// Only whitelisted fields are read; a user id is never taken from the request.
const text = (data: FormData, key: string) => {
  const value = data.get(key);
  return typeof value === "string" ? value : "";
};
const optionalText = (data: FormData, key: string) => {
  const value = data.get(key);
  return typeof value === "string" ? value : null;
};

async function requireUserId(): Promise<number> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user.id;
}

function readTaskInput(data: FormData): TaskInput {
  return {
    title: text(data, "title"),
    notes: text(data, "notes"),
    lifeArea: text(data, "lifeArea"),
    dateKind: optionalText(data, "dateKind"),
    date: optionalText(data, "date"),
  };
}

const SAVE_FAILED = "Could not save the task. Please try again.";

export async function createTaskAction(_prev: TaskFormState, data: FormData): Promise<TaskFormState> {
  const userId = await requireUserId();
  const result = validateTaskInput(readTaskInput(data), { mode: "create" });
  if (!result.ok) return { errors: result.errors };

  try {
    const { schedule, ...rest } = result.value;
    await createTask(userId, { ...rest, schedule: schedule ?? { kind: "none" } });
  } catch (error) {
    console.error("createTask failed", error);
    return { errors: { form: SAVE_FAILED } };
  }
  revalidatePath("/tasks");
  redirect("/tasks");
}

export async function updateTaskAction(_prev: TaskFormState, data: FormData): Promise<TaskFormState> {
  const userId = await requireUserId();
  const taskId = parseTaskId(data.get("taskId"));
  if (taskId === null) notFound();

  const result = validateTaskInput(readTaskInput(data), { mode: "update" });
  if (!result.ok) return { errors: result.errors };

  let outcome: Awaited<ReturnType<typeof updateTask>>;
  try {
    outcome = await updateTask(userId, taskId, result.value);
  } catch (error) {
    console.error("updateTask failed", error);
    return { errors: { form: SAVE_FAILED } };
  }
  if (outcome === "not_found") notFound();
  if (outcome === "date_locked") {
    return {
      errors: { date: "A completed task's date can't be changed. Mark the task as incomplete first." },
    };
  }
  revalidatePath("/tasks");
  redirect("/tasks");
}

export async function deleteTaskAction(data: FormData): Promise<void> {
  const userId = await requireUserId();
  const taskId = parseTaskId(data.get("taskId"));
  if (taskId !== null) await deleteTask(userId, taskId);
  revalidatePath("/tasks");
  redirect("/tasks");
}

// The form submits the desired state, so repeated submits are idempotent.
export async function setTaskCompletedAction(data: FormData): Promise<void> {
  const userId = await requireUserId();
  const taskId = parseTaskId(data.get("taskId"));
  const desired = data.get("completed");
  if (taskId !== null && (desired === "true" || desired === "false")) {
    const completedOn = todayFor(await getUserTimeZone(userId));
    await setTaskCompleted(userId, taskId, desired === "true", completedOn);
  }
  revalidatePath("/tasks");
  redirect("/tasks");
}
