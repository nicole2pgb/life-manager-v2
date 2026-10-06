import { describe, expect, it } from "vitest";
import { readText } from "./form-data";

describe("readText", () => {
  it("returns a string field as is", () => {
    const data = new FormData();
    data.set("name", " Nicole ");
    expect(readText(data, "name")).toBe(" Nicole ");
  });
  it("returns an empty string for a missing field", () => {
    expect(readText(new FormData(), "name")).toBe("");
  });
  it("returns an empty string for a file upload", () => {
    const data = new FormData();
    data.set("name", new File(["x"], "x.txt"));
    expect(readText(data, "name")).toBe("");
  });
});
