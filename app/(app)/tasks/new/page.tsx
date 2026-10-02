import { redirect } from "next/navigation";
import { LIFE_AREAS } from "@/db/schema";
import { TaskForm } from "@/components/tasks/task-form";
import { getCurrentUser } from "@/lib/auth/session";
import { createTaskAction } from "../actions";

export const metadata = { title: "New task · Life Manager" };

export default async function NewTaskPage() {
  if (!(await getCurrentUser())) redirect("/login");
  return (
    <main className="mx-auto w-full max-w-xl px-4 py-10 sm:px-8">
      <section className="rounded-2xl border border-border bg-surface p-6 sm:p-7">
        <h1 className="text-2xl font-semibold">Create a task</h1>
        <p className="mt-1 text-sm text-muted">Make it clear, achievable, and easy to place in your week.</p>
        <div className="mt-6">
          <TaskForm
            action={createTaskAction}
            lifeAreas={LIFE_AREAS}
            submitLabel="Create task"
            initial={{
              title: "",
              notes: "",
              lifeArea: "Personal",
              dateKind: "none",
              date: "",
              recurrence: "none",
              weekdays: [],
              timesPerWeek: "3",
            }}
          />
        </div>
      </section>
    </main>
  );
}
