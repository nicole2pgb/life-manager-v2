import "server-only";

import { todayFor, type CalendarDate } from "./calendar-date";

// MVP assumption: every user lives in one application-wide time zone.
// This is the single place that decides a user's time zone; making it
// per-user later only changes this function.
const DEFAULT_TIME_ZONE = "Europe/Berlin";

export function getApplicationTimeZone(): string {
  const configured = process.env.APP_TIME_ZONE?.trim();
  const timeZone = configured || DEFAULT_TIME_ZONE;
  try {
    new Intl.DateTimeFormat("en-CA", { timeZone });
  } catch {
    throw new Error(`APP_TIME_ZONE is not a valid IANA time zone: "${timeZone}".`);
  }
  return timeZone;
}

export async function getUserTimeZone(userId: number): Promise<string> {
  void userId; // not used until time zones become a per-user setting
  return getApplicationTimeZone();
}

// The current calendar date in the user's time zone; the only way callers
// obtain "today" for task relevance and completion.
export async function getTodayFor(userId: number): Promise<CalendarDate> {
  return todayFor(await getUserTimeZone(userId));
}
