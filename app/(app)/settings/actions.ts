"use server";

import { revalidatePath } from "next/cache";
import { saveUserSettings } from "@/db/settings";
import { requireUser } from "@/lib/auth/require-user";
import type { SettingsFormState } from "@/lib/settings/form-state";
import { validateSettings } from "@/lib/settings/validation";

// Only whitelisted fields are read; a user id is never taken from the request.
const optionalText = (data: FormData, key: string) => {
  const value = data.get(key);
  return typeof value === "string" ? value : null;
};

export async function saveSettingsAction(_prev: SettingsFormState, data: FormData): Promise<SettingsFormState> {
  const user = await requireUser();

  const result = validateSettings({
    themeColor: optionalText(data, "themeColor"),
    weekStart: optionalText(data, "weekStart"),
    dailyCheckInEnabled: optionalText(data, "dailyCheckInEnabled"),
    dailyCheckInTime: optionalText(data, "dailyCheckInTime"),
    lifeAreas: data.getAll("lifeAreas").filter((value): value is string => typeof value === "string"),
  });
  if (!result.ok) return { errors: result.errors };

  try {
    await saveUserSettings(user.id, result.value);
  } catch (error) {
    console.error("saveUserSettings failed", error);
    return { errors: { form: "Could not save your settings. Please try again." } };
  }
  // Theme, week start and life areas show up on every protected page.
  revalidatePath("/", "layout");
  return { saved: true };
}
