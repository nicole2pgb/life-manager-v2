import { redirect } from "next/navigation";
import { ProgressView } from "@/components/progress/progress-view";
import { getProgress } from "@/db/tasks";
import { getCurrentUser } from "@/lib/auth/session";
import { getTodayFor, getUserTimeZone } from "@/lib/dates/time-zone";

export const metadata = { title: "Progress · Life Manager" };

export default async function ProgressPage() {
  // The layout already checks; repeat so the page never relies on it alone.
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const today = await getTodayFor(user.id);
  const progress = await getProgress(user.id, today, await getUserTimeZone(user.id));
  return <ProgressView progress={progress} />;
}
