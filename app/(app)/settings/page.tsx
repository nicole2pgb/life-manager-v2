import { redirect } from "next/navigation";
import { SettingsForm } from "@/components/settings/settings-form";
import { getUserSettings } from "@/db/settings";
import { getCurrentUser } from "@/lib/auth/session";
import { saveSettingsAction } from "./actions";

export const metadata = { title: "Settings · Life Manager" };

export default async function SettingsPage() {
  // The layout already checks; repeat so the page never relies on it alone.
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const settings = await getUserSettings(user.id);
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-8">
      <p className="text-xs font-semibold uppercase tracking-wide text-accent">Make it yours</p>
      <h1 className="mt-1 text-3xl font-bold">Settings</h1>
      <p className="mt-1 text-sm text-muted">Tune Life Manager to support the way you actually live.</p>
      <SettingsForm initial={settings} action={saveSettingsAction} />
    </main>
  );
}
