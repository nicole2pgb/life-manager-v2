import { describe, expect, it } from "vitest";
import { areasForTask, defaultLifeArea } from "./life-areas";

describe("areasForTask", () => {
  it("offers only the selected areas", () => {
    expect(areasForTask(["Learning", "Health"])).toEqual(["Health", "Learning"]);
  });
  it("adds the task's current area when it was deselected", () => {
    expect(areasForTask(["Health"], "Finance")).toEqual(["Health", "Finance"]);
  });
  it("does not duplicate a selected current area", () => {
    expect(areasForTask(["Health"], "Health")).toEqual(["Health"]);
  });
});

describe("defaultLifeArea", () => {
  it("prefers Personal when selected", () => {
    expect(defaultLifeArea(["Career", "Personal"])).toBe("Personal");
  });
  it("otherwise uses the first selected area in canonical order", () => {
    expect(defaultLifeArea(["Health", "Career"])).toBe("Career");
  });
});
