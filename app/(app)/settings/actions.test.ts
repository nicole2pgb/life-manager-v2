import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: (to: string) => {
    throw new Error(`REDIRECT:${to}`);
  },
}));

const session = { id: 0 };
vi.mock("@/lib/auth/session", () => ({ getCurrentUser: async () => (session.id ? { id: session.id } : null) }));
const saveUserSettings = vi.fn();
vi.mock("@/db/settings", () => ({ saveUserSettings: (...args: unknown[]) => saveUserSettings(...args) }));

import { revalidatePath } from "next/cache";
import { saveSettingsAction } from "./actions";

const form = (fields: Record<string, string | string[]>) => {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    for (const v of Array.isArray(value) ? value : [value]) data.append(key, v);
  }
  return data;
};

const valid = {
  themeColor: "Green",
  weekStart: "Sunday",
  dailyCheckInEnabled: "true",
  dailyCheckInTime: "20:00",
  lifeAreas: ["Career", "Fitness"],
};

beforeEach(() => {
  session.id = 7;
  saveUserSettings.mockReset();
  vi.mocked(revalidatePath).mockClear();
});

describe("saveSettingsAction", () => {
  it("redirects an unauthenticated caller and stores nothing", async () => {
    session.id = 0;
    await expect(saveSettingsAction(null, form(valid))).rejects.toThrow("REDIRECT:/login");
    expect(saveUserSettings).not.toHaveBeenCalled();
  });

  it("stores nothing and returns field errors for invalid input", async () => {
    const state = await saveSettingsAction(null, form({ ...valid, themeColor: "Orange", dailyCheckInTime: "25:99", lifeAreas: [] }));
    expect(state?.errors).toMatchObject({ themeColor: expect.any(String), dailyCheckInTime: expect.any(String), lifeAreas: expect.any(String) });
    expect(state?.saved).toBeUndefined();
    expect(saveUserSettings).not.toHaveBeenCalled();
  });

  it("saves valid input for the session user and reports success", async () => {
    const state = await saveSettingsAction(null, form(valid));
    expect(state).toEqual({ saved: true });
    expect(saveUserSettings).toHaveBeenCalledWith(7, {
      themeColor: "Green",
      weekStart: "Sunday",
      dailyCheckInEnabled: true,
      dailyCheckInTime: "20:00",
      lifeAreas: ["Career", "Fitness"],
    });
    expect(revalidatePath).toHaveBeenCalledWith("/", "layout");
  });

  it("ignores a user id posted with the form", async () => {
    await saveSettingsAction(null, form({ ...valid, userId: "999", user_id: "999" }));
    expect(saveUserSettings.mock.calls[0][0]).toBe(7);
  });

  it("keeps a time submitted while the check-in is off", async () => {
    await saveSettingsAction(null, form({ ...valid, dailyCheckInEnabled: "false", dailyCheckInTime: "18:30" }));
    expect(saveUserSettings.mock.calls[0][1]).toMatchObject({ dailyCheckInEnabled: false, dailyCheckInTime: "18:30" });
  });

  it("returns a form error when saving fails", async () => {
    saveUserSettings.mockRejectedValueOnce(new Error("db down"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    const state = await saveSettingsAction(null, form(valid));
    expect(state?.errors?.form).toBeDefined();
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
