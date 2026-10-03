import {
  LIFE_AREAS,
  THEME_COLORS,
  WEEK_STARTS,
  type LifeArea,
  type ThemeColor,
  type WeekStart,
} from "@/db/schema";

// The values a user can save in Settings. The check-in time is "HH:MM".
export type SettingsValues = {
  themeColor: ThemeColor;
  weekStart: WeekStart;
  dailyCheckInEnabled: boolean;
  dailyCheckInTime: string;
  lifeAreas: LifeArea[];
};

// Defaults of a user who never saved settings; they mirror the column defaults
// of `user_settings` (docs/data-model.md).
export const DEFAULT_SETTINGS: SettingsValues = {
  themeColor: "Pink",
  weekStart: "Monday",
  dailyCheckInEnabled: false,
  dailyCheckInTime: "09:00",
  lifeAreas: [...LIFE_AREAS],
};

export type SettingsFieldErrors = Partial<
  Record<"themeColor" | "weekStart" | "dailyCheckInEnabled" | "dailyCheckInTime" | "lifeAreas", string>
>;

// Raw submitted values; null = the field was not submitted at all.
export type SettingsInput = {
  themeColor: string | null;
  weekStart: string | null;
  dailyCheckInEnabled: string | null;
  dailyCheckInTime: string | null;
  lifeAreas: string[];
};

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

const isTheme = (value: string): value is ThemeColor => (THEME_COLORS as readonly string[]).includes(value);
const isWeekStart = (value: string): value is WeekStart => (WEEK_STARTS as readonly string[]).includes(value);
const isLifeArea = (value: string): value is LifeArea => (LIFE_AREAS as readonly string[]).includes(value);

// Pure. The time is validated and kept even while the check-in is off.
export function validateSettings(
  input: SettingsInput,
): { ok: true; value: SettingsValues } | { ok: false; errors: SettingsFieldErrors } {
  const errors: SettingsFieldErrors = {};

  const themeColor = input.themeColor ?? "";
  if (!isTheme(themeColor)) errors.themeColor = "Choose one of the theme colors.";

  const weekStart = input.weekStart ?? "";
  if (!isWeekStart(weekStart)) errors.weekStart = "Choose Monday or Sunday.";

  const enabled = input.dailyCheckInEnabled;
  if (enabled !== "true" && enabled !== "false") errors.dailyCheckInEnabled = "Choose whether the daily check-in is on or off.";

  const time = (input.dailyCheckInTime ?? "").trim();
  if (!TIME_PATTERN.test(time)) errors.dailyCheckInTime = "Enter a time like 09:00.";

  const submitted = input.lifeAreas;
  if (submitted.length === 0) errors.lifeAreas = "Select at least one life area.";
  else if (!submitted.every(isLifeArea)) errors.lifeAreas = "Choose only the listed life areas.";
  else if (new Set(submitted).size !== submitted.length) errors.lifeAreas = "Each life area can only be selected once.";

  if (Object.keys(errors).length > 0 || !isTheme(themeColor) || !isWeekStart(weekStart)) {
    return { ok: false, errors };
  }
  return {
    ok: true,
    value: {
      themeColor,
      weekStart,
      dailyCheckInEnabled: enabled === "true",
      dailyCheckInTime: time,
      // Canonical order, whatever order the form submitted.
      lifeAreas: LIFE_AREAS.filter((area) => submitted.includes(area)),
    },
  };
}
