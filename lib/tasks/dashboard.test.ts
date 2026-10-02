import { describe, expect, it } from "vitest";
import { buildDashboard, type DashboardTaskInput } from "./dashboard";

const TODAY = "2026-10-06"; // Tuesday; week 2026-10-05 .. 2026-10-11
let nextId = 1;
const make = (extra: Partial<DashboardTaskInput> & { done?: string[] }): DashboardTaskInput => {
  const { done = [], ...rest } = extra;
  return {
    id: nextId++,
    title: `T${nextId}`,
    lifeArea: "Health",
    rule: { type: "none" },
    scheduledDate: null,
    dueDate: null,
    createdOn: "2026-09-01",
    completionDates: new Set(done),
    ...rest,
  };
};

describe("buildDashboard", () => {
  it("orders overdue, open, then done today, keeping the input order within a group", () => {
    const open1 = make({ title: "open1" });
    const done = make({ title: "done", done: [TODAY] });
    const open2 = make({ title: "open2", rule: { type: "daily" } });
    const overdue = make({ title: "overdue", dueDate: "2026-10-01" });
    const dash = buildDashboard([open1, done, open2, overdue], TODAY);
    expect(dash.items.map((i) => i.title)).toEqual(["overdue", "open1", "open2", "done"]);
    expect(dash).toMatchObject({ openCount: 3, doneCount: 1, hasTasks: true });
  });
  it("has tasks but no items when nothing is relevant today", () => {
    const dash = buildDashboard([make({ scheduledDate: "2026-10-07" })], TODAY);
    expect(dash).toMatchObject({ items: [], hasTasks: true, openCount: 0 });
  });
  it("reports a new user without tasks", () => {
    const dash = buildDashboard([], TODAY);
    expect(dash).toMatchObject({ items: [], hasTasks: false });
    expect(dash.week.percent).toBeNull();
  });
  it("caps and scopes the weekly count of times-per-week tasks", () => {
    const task = make({
      rule: { type: "times_per_week", timesPerWeek: 2 },
      done: ["2026-10-04", "2026-10-05", TODAY],
    });
    const dash = buildDashboard([task], TODAY);
    expect(dash.items[0]).toMatchObject({ weekCount: 2, done: true });
  });
  it("summarises the current week without counting Today-only tasks", () => {
    const dash = buildDashboard(
      [make({ rule: { type: "daily" }, done: [TODAY] }), make({}), make({ dueDate: "2026-09-20" })],
      TODAY,
    );
    expect(dash.items).toHaveLength(3);
    expect(dash.week).toMatchObject({ planned: 7, completed: 1, open: 6, percent: 14 });
  });
});
