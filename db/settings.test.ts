import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { SettingsValues } from "@/lib/settings/validation";

vi.mock("server-only", () => ({}));

// Writes to a real MySQL database (migrated schema); only runs when
// TEST_DATABASE_URL is set. Creates its own users and deletes them afterwards.
const url = process.env.TEST_DATABASE_URL;

type Index = typeof import("./index");
type Settings = typeof import("./settings");

describe.skipIf(!url)("user settings data layer", () => {
  let s: Settings;
  let db: ReturnType<Index["getDb"]>;
  let schema: Index["schema"];
  let userA: number;
  let userB: number;
  const tag = `st-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const blue: SettingsValues = {
    themeColor: "Blue",
    weekStart: "Sunday",
    dailyCheckInEnabled: true,
    dailyCheckInTime: "07:30",
    lifeAreas: ["Health", "Learning"],
  };

  beforeAll(async () => {
    process.env.DATABASE_URL = url;
    const index = (await import("./index")) as Index;
    db = index.getDb();
    schema = index.schema;
    s = await import("./settings");
    const insert = async (name: string) => {
      const [r] = await db.insert(schema.users).values({ name, email: `${tag}-${name}@example.test`, passwordHash: "x" });
      return r.insertId;
    };
    userA = await insert("a");
    userB = await insert("b");
  });

  afterAll(async () => {
    if (!db) return;
    const { inArray } = await import("drizzle-orm");
    await db.delete(schema.users).where(inArray(schema.users.id, [userA, userB]));
  });

  const rowCount = async (userId: number) => {
    const { eq } = await import("drizzle-orm");
    return (await db.select().from(schema.userSettings).where(eq(schema.userSettings.userId, userId))).length;
  };

  it("returns the defaults for a user without a row", async () => {
    expect(await s.getUserSettings(userA)).toEqual({
      themeColor: "Pink",
      weekStart: "Monday",
      dailyCheckInEnabled: false,
      dailyCheckInTime: "09:00",
      lifeAreas: ["Career", "Fitness", "Health", "Learning", "Personal", "Finance"],
    });
    expect(await rowCount(userA)).toBe(0);
  });

  it("creates one row on the first save and updates it on the second", async () => {
    await s.saveUserSettings(userA, blue);
    expect(await rowCount(userA)).toBe(1);
    expect(await s.getUserSettings(userA)).toEqual(blue);

    const green: SettingsValues = { ...blue, themeColor: "Green", weekStart: "Monday", dailyCheckInEnabled: false, dailyCheckInTime: "18:30" };
    await s.saveUserSettings(userA, green);
    expect(await rowCount(userA)).toBe(1);
    expect(await s.getUserSettings(userA)).toEqual(green);
  });

  it("keeps users independent", async () => {
    await s.saveUserSettings(userA, blue);
    expect((await s.getUserSettings(userB)).themeColor).toBe("Pink");
    expect(await rowCount(userB)).toBe(0);
  });
});
