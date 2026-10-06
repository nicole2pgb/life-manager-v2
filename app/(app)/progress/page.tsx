import { ProgressView } from "@/components/progress/progress-view";
import { getUserSettings } from "@/db/settings";
import { getProgress } from "@/db/tasks";
import { requireUser } from "@/lib/auth/require-user";
import { getTodayFor, getUserTimeZone } from "@/lib/dates/time-zone";

export const metadata = { title: "Progress · Life Manager" };

export default async function ProgressPage() {
  // The layout already checks; repeat so the page never relies on it alone.
  const user = await requireUser();

  const today = await getTodayFor(user.id);
  const { weekStart } = await getUserSettings(user.id);
  const progress = await getProgress(user.id, today, await getUserTimeZone(user.id), weekStart);
  return <ProgressView progress={progress} />;
}
