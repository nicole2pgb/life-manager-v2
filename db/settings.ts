import "server-only";

import { eq } from "drizzle-orm";
import { cache } from "react";
import { DEFAULT_SETTINGS, type SettingsValues } from "@/lib/settings/validation";
import { getDb, schema } from "./index";

const { userSettings } = schema;

// "09:00:00" (TIME column) -> "09:00".
const toHourMinute = (time: string) => time.slice(0, 5);

// The user's settings, or the documented defaults when they never saved any.
// Registration does not create a row, so every caller gets a complete value.
// Cached per request so the layout and the page share one query.
export const getUserSettings = cache(async function getUserSettings(userId: number): Promise<SettingsValues> {
  const [row] = await getDb().select().from(userSettings).where(eq(userSettings.userId, userId)).limit(1);
  if (!row) return { ...DEFAULT_SETTINGS, lifeAreas: [...DEFAULT_SETTINGS.lifeAreas] };
  return {
    themeColor: row.themeColor,
    weekStart: row.weekStart,
    dailyCheckInEnabled: row.dailyCheckInEnabled,
    dailyCheckInTime: toHourMinute(row.dailyCheckInTime),
    lifeAreas: row.lifeAreas,
  };
});

// Creates the user's single settings row on the first save, updates it later.
export async function saveUserSettings(userId: number, values: SettingsValues): Promise<void> {
  const columns = {
    themeColor: values.themeColor,
    weekStart: values.weekStart,
    dailyCheckInEnabled: values.dailyCheckInEnabled,
    dailyCheckInTime: `${values.dailyCheckInTime}:00`,
    lifeAreas: values.lifeAreas,
  };
  await getDb()
    .insert(userSettings)
    .values({ userId, ...columns })
    .onDuplicateKeyUpdate({ set: columns });
}
