"use server";

import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { getUserSettings } from "@/db/settings";
import { createTask, deleteTask, getTaskLifeArea, setTaskCompleted, updateTask } from "@/db/tasks";
import { getTodayFor } from "@/lib/dates/time-zone";
import { requireUser } from "@/lib/auth/require-user";
import { readText } from "@/lib/form-data";
import { NOT_RELEVANT_NOTICE, type TaskFormState } from "@/lib/tasks/form-state";
import { areasForTask } from "@/lib/settings/life-areas";
import { parseTaskId, validateTaskInput, type TaskInput } from "@/lib/tasks/validation";

const optionalText = (data: FormData, key: string) => {
  const value = data.get(key);
  return typeof value === "string" ? value : null;
};

// Only whitelisted fields are read; a user id is never taken from the request.
function readTaskInput(data: FormData): TaskInput {
  return {
    title: readText(data, "title"),
    notes: readText(data, "notes"),
    lifeArea: readText(data, "lifeArea"),
    dateKind: optionalText(data, "dateKind"),
    date: optionalText(data, "date"),
    recurrence: optionalText(data, "recurrence"),
    weekdays: data.getAll("weekdays").filter((value): value is string => typeof value === "string"),
    timesPerWeek: optionalText(data, "timesPerWeek"),
  };
}

// Task data shows on all of these pages, so every change refreshes them all.
function revalidateTaskPages() {
  revalidatePath("/tasks");
  revalidatePath("/dashboard");
  revalidatePath("/weekly-overview");
  revalidatePath("/progress");
}

// Pages a completion may return to. Only these literals are ever redirected
// to; request input is matched against them, never echoed into the redirect.
const RETURN_TARGETS = ["/tasks", "/dashboard"] as const;
function returnTarget(value: FormDataEntryValue | null): (typeof RETURN_TARGETS)[number] {
  return RETURN_TARGETS.find((target) => target === value) ?? "/tasks";
}

const SAVE_FAILED = "Could not save the task. Please try again.";

export async function createTaskAction(_prev: TaskFormState, data: FormData): Promise<TaskFormState> {
  const { id: userId } = await requireUser();
  const { lifeAreas } = await getUserSettings(userId);
  const result = validateTaskInput(readTaskInput(data), { mode: "create", allowedAreas: lifeAreas });
  if (!result.ok) return { errors: result.errors };

  try {
    await createTask(userId, result.value);
  } catch (error) {
    console.error("createTask failed", error);
    return { errors: { form: SAVE_FAILED } };
  }
  revalidateTaskPages();
  redirect("/tasks");
}

export async function updateTaskAction(_prev: TaskFormState, data: FormData): Promise<TaskFormState> {
  const { id: userId } = await requireUser();
  const taskId = parseTaskId(data.get("taskId"));
  if (taskId === null) notFound();

  // A task keeps its current area even if the user deselected it later.
  const currentArea = await getTaskLifeArea(userId, taskId);
  if (currentArea === null) notFound();
  const { lifeAreas } = await getUserSettings(userId);
  const result = validateTaskInput(readTaskInput(data), {
    mode: "update",
    allowedAreas: areasForTask(lifeAreas, currentArea),
  });
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
  if (outcome === "recurrence_locked") {
    return {
      errors: { recurrence: "A completed task can't become a repeating task. Mark the task as incomplete first." },
    };
  }
  if (outcome === "history_locked") {
    return {
      errors: {
        recurrence:
          "This task can't be converted to a one-time task because it already has recurring completion history. Create a new one-time task instead.",
      },
    };
  }
  revalidateTaskPages();
  redirect("/tasks");
}

export async function deleteTaskAction(data: FormData): Promise<void> {
  const { id: userId } = await requireUser();
  const taskId = parseTaskId(data.get("taskId"));
  if (taskId !== null) await deleteTask(userId, taskId);
  revalidateTaskPages();
  redirect("/tasks");
}

// The form submits the desired state, so repeated submits are idempotent.
export async function setTaskCompletedAction(data: FormData): Promise<void> {
  const { id: userId } = await requireUser();
  const taskId = parseTaskId(data.get("taskId"));
  const desired = data.get("completed");
  if (taskId !== null && (desired === "true" || desired === "false")) {
    // Only the current calendar date is ever used; a date in the request is ignored.
    const today = await getTodayFor(userId);
    const { weekStart } = await getUserSettings(userId);
    const outcome = await setTaskCompleted(userId, taskId, desired === "true", today, weekStart);
    if (outcome === "not_relevant") redirect(`${returnTarget(data.get("returnTo"))}?notice=${NOT_RELEVANT_NOTICE}`);
  }
  revalidateTaskPages();
  redirect(returnTarget(data.get("returnTo")));
}
