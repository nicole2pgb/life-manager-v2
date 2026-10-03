import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS, validateSettings, type SettingsInput } from "./validation";

const valid: SettingsInput = {
  themeColor: "Green",
  weekStart: "Sunday",
  dailyCheckInEnabled: "true",
  dailyCheckInTime: "20:00",
  lifeAreas: ["Fitness", "Career"],
};

const errorsOf = (input: SettingsInput) => {
  const result = validateSettings(input);
  if (result.ok) throw new Error("expected validation to fail");
  return result.errors;
};

describe("validateSettings", () => {
  it("accepts valid input and orders life areas canonically", () => {
    expect(validateSettings(valid)).toEqual({
      ok: true,
      value: {
        themeColor: "Green",
        weekStart: "Sunday",
        dailyCheckInEnabled: true,
        dailyCheckInTime: "20:00",
        lifeAreas: ["Career", "Fitness"],
      },
    });
  });

  it("has the documented defaults", () => {
    expect(DEFAULT_SETTINGS).toEqual({
      themeColor: "Pink",
      weekStart: "Monday",
      dailyCheckInEnabled: false,
      dailyCheckInTime: "09:00",
      lifeAreas: ["Career", "Fitness", "Health", "Learning", "Personal", "Finance"],
    });
  });

  it.each(["Orange", "pink", "", null])("rejects theme %j", (themeColor) => {
    expect(errorsOf({ ...valid, themeColor }).themeColor).toBeDefined();
  });

  it.each(["Friday", "", null])("rejects week start %j", (weekStart) => {
    expect(errorsOf({ ...valid, weekStart }).weekStart).toBeDefined();
  });

  it.each(["yes", "", null])("rejects check-in switch %j", (dailyCheckInEnabled) => {
    expect(errorsOf({ ...valid, dailyCheckInEnabled }).dailyCheckInEnabled).toBeDefined();
  });

  it.each(["25:99", "8am", "", "24:00", "9:00", "09:00:00", null])("rejects time %j", (dailyCheckInTime) => {
    expect(errorsOf({ ...valid, dailyCheckInTime }).dailyCheckInTime).toBeDefined();
  });

  it("requires at least one life area", () => {
    expect(errorsOf({ ...valid, lifeAreas: [] }).lifeAreas).toMatch(/at least one/i);
  });

  it("rejects unknown and duplicate life areas", () => {
    expect(errorsOf({ ...valid, lifeAreas: ["Career", "Hobbies"] }).lifeAreas).toBeDefined();
    expect(errorsOf({ ...valid, lifeAreas: ["Career", "Career"] }).lifeAreas).toBeDefined();
  });

  it("keeps a valid time while the check-in is off", () => {
    const result = validateSettings({ ...valid, dailyCheckInEnabled: "false", dailyCheckInTime: "18:30" });
    expect(result).toMatchObject({ ok: true, value: { dailyCheckInEnabled: false, dailyCheckInTime: "18:30" } });
  });

  it("still validates the time while the check-in is off", () => {
    expect(errorsOf({ ...valid, dailyCheckInEnabled: "false", dailyCheckInTime: "99:99" }).dailyCheckInTime).toBeDefined();
  });

  it("reports every invalid field at once", () => {
    const errors = errorsOf({ themeColor: "x", weekStart: "x", dailyCheckInEnabled: "x", dailyCheckInTime: "x", lifeAreas: [] });
    expect(Object.keys(errors).sort()).toEqual(["dailyCheckInEnabled", "dailyCheckInTime", "lifeAreas", "themeColor", "weekStart"]);
  });
});
