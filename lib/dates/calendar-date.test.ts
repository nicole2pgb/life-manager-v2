import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  addDays,
  calendarDateOf,
  endOfWeek,
  isoWeekday,
  startOfWeek,
  formatCalendarDate,
  formatLongCalendarDate,
  formatWeekRange,
  parseCalendarDate,
  todayFor,
} from "./calendar-date";
import { getApplicationTimeZone, getUserTimeZone } from "./time-zone";

const BERLIN = "Europe/Berlin";
const LA = "America/Los_Angeles";

describe("calendarDateOf", () => {
  it("is the next day for zones ahead of UTC late in the UTC evening", () => {
    expect(calendarDateOf(new Date("2026-10-01T23:30:00Z"), BERLIN)).toBe("2026-10-02");
    expect(calendarDateOf(new Date("2026-10-01T23:30:00Z"), "UTC")).toBe("2026-10-01");
  });
  it("is the previous day for zones behind UTC early in the UTC morning", () => {
    expect(calendarDateOf(new Date("2026-10-02T03:00:00Z"), LA)).toBe("2026-10-01");
    expect(calendarDateOf(new Date("2026-10-02T03:00:00Z"), "UTC")).toBe("2026-10-02");
  });
  it("switches at Berlin midnight in summer time (UTC+2)", () => {
    expect(calendarDateOf(new Date("2026-07-01T21:59:59Z"), BERLIN)).toBe("2026-07-01");
    expect(calendarDateOf(new Date("2026-07-01T22:00:00Z"), BERLIN)).toBe("2026-07-02");
  });
  it("switches at Berlin midnight in winter time (UTC+1)", () => {
    expect(calendarDateOf(new Date("2026-01-01T22:59:59Z"), BERLIN)).toBe("2026-01-01");
    expect(calendarDateOf(new Date("2026-01-01T23:00:00Z"), BERLIN)).toBe("2026-01-02");
  });
  it("handles the spring DST change (2026-03-29)", () => {
    // 01:59 CET (UTC+1) is still the 29th; the day is only 23 hours long.
    expect(calendarDateOf(new Date("2026-03-28T23:00:00Z"), BERLIN)).toBe("2026-03-29");
    expect(calendarDateOf(new Date("2026-03-29T21:59:59Z"), BERLIN)).toBe("2026-03-29");
    expect(calendarDateOf(new Date("2026-03-29T22:00:00Z"), BERLIN)).toBe("2026-03-30");
  });
  it("handles the autumn DST change (2026-10-25)", () => {
    // The day is 25 hours long: it ends at 23:00 UTC.
    expect(calendarDateOf(new Date("2026-10-24T22:00:00Z"), BERLIN)).toBe("2026-10-25");
    expect(calendarDateOf(new Date("2026-10-25T22:59:59Z"), BERLIN)).toBe("2026-10-25");
    expect(calendarDateOf(new Date("2026-10-25T23:00:00Z"), BERLIN)).toBe("2026-10-26");
  });
  it("handles a year boundary", () => {
    expect(calendarDateOf(new Date("2026-12-31T23:30:00Z"), BERLIN)).toBe("2027-01-01");
  });
});

describe("todayFor", () => {
  it("uses the injected instant", () => {
    expect(todayFor(BERLIN, new Date("2026-10-01T22:30:00Z"))).toBe("2026-10-02");
    expect(todayFor(LA, new Date("2026-10-01T22:30:00Z"))).toBe("2026-10-01");
  });
});

describe("parseCalendarDate", () => {
  it("accepts real dates, including leap day and the DATE limits", () => {
    for (const value of ["2026-10-05", "2028-02-29", "1000-01-01", "9999-12-31"]) {
      expect(parseCalendarDate(value)).toBe(value);
    }
  });
  it("rejects impossible dates and wrong formats", () => {
    for (const value of [
      "2027-02-29",
      "2026-02-30",
      "2026-13-01",
      "2026-00-10",
      "2026-10-00",
      "0999-12-31",
      "10000-01-01",
      "2026-1-5",
      "05.10.2026",
      "2026-10-05T00:00",
      " 2026-10-05",
      "",
      "   ",
    ]) {
      expect(parseCalendarDate(value)).toBeNull();
    }
  });
});

describe("formatCalendarDate", () => {
  it("uses the German day-first format", () => {
    expect(formatCalendarDate("2026-10-05")).toBe("05.10.2026");
  });
  it("does not depend on the process time zone", () => {
    const original = process.env.TZ;
    try {
      for (const tz of ["UTC", "Pacific/Kiritimati", "Pacific/Pago_Pago"]) {
        process.env.TZ = tz;
        expect(formatCalendarDate("2026-10-05")).toBe("05.10.2026");
      }
    } finally {
      if (original === undefined) delete process.env.TZ;
      else process.env.TZ = original;
    }
  });
});

describe("time zone resolver", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("defaults to Europe/Berlin", async () => {
    vi.stubEnv("APP_TIME_ZONE", "");
    expect(getApplicationTimeZone()).toBe("Europe/Berlin");
    expect(await getUserTimeZone(1)).toBe("Europe/Berlin");
  });
  it("can be overridden with APP_TIME_ZONE", async () => {
    vi.stubEnv("APP_TIME_ZONE", "America/New_York");
    expect(await getUserTimeZone(1)).toBe("America/New_York");
  });
  it("fails with an error naming the variable when invalid", () => {
    vi.stubEnv("APP_TIME_ZONE", "Not/AZone");
    expect(() => getApplicationTimeZone()).toThrow(/APP_TIME_ZONE/);
  });
});

describe("isoWeekday", () => {
  it("numbers Monday 1 to Sunday 7", () => {
    expect(isoWeekday("2026-10-05")).toBe(1);
    expect(isoWeekday("2026-10-06")).toBe(2);
    expect(isoWeekday("2026-10-11")).toBe(7);
  });
  it("handles leap day, year boundary and the DATE limits", () => {
    expect(isoWeekday("2028-02-29")).toBe(2);
    expect(isoWeekday("2026-12-31")).toBe(4);
    expect(isoWeekday("2027-01-01")).toBe(5);
    expect(isoWeekday("9999-12-31")).toBe(5);
    expect(isoWeekday("1000-01-01")).toBe(3);
  });
});

describe("addDays", () => {
  it("rolls over months, years and leap days", () => {
    expect(addDays("2026-10-31", 1)).toBe("2026-11-01");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
    expect(addDays("2027-02-28", 1)).toBe("2027-03-01");
    expect(addDays("2026-01-01", -1)).toBe("2025-12-31");
  });
  it("counts whole calendar days across daylight-saving changes", () => {
    expect(addDays("2026-03-28", 1)).toBe("2026-03-29");
    expect(addDays("2026-03-29", 1)).toBe("2026-03-30");
    expect(addDays("2026-10-24", 1)).toBe("2026-10-25");
    expect(addDays("2026-10-25", 1)).toBe("2026-10-26");
  });
});

describe("startOfWeek / endOfWeek", () => {
  it("runs Monday to Sunday by default", () => {
    expect(startOfWeek("2026-10-05")).toBe("2026-10-05");
    expect(startOfWeek("2026-10-11")).toBe("2026-10-05");
    expect(endOfWeek("2026-10-07")).toBe("2026-10-11");
    expect(startOfWeek("2026-10-12")).toBe("2026-10-12");
  });
  it("can start on Sunday", () => {
    expect(startOfWeek("2026-10-11", "Sunday")).toBe("2026-10-11");
    expect(startOfWeek("2026-10-10", "Sunday")).toBe("2026-10-04");
    expect(endOfWeek("2026-10-10", "Sunday")).toBe("2026-10-10");
  });
  it("crosses month and year boundaries", () => {
    expect(startOfWeek("2027-01-01")).toBe("2026-12-28");
    expect(endOfWeek("2027-01-01")).toBe("2027-01-03");
  });
  it("is stable across daylight-saving weeks", () => {
    expect(startOfWeek("2026-03-29")).toBe("2026-03-23");
    expect(endOfWeek("2026-10-25")).toBe("2026-10-25");
  });
  it("does not depend on the process time zone", () => {
    const original = process.env.TZ;
    try {
      for (const tz of ["UTC", "Pacific/Kiritimati", "Pacific/Pago_Pago"]) {
        process.env.TZ = tz;
        expect(isoWeekday("2026-10-05")).toBe(1);
        expect(addDays("2026-10-25", 1)).toBe("2026-10-26");
        expect(startOfWeek("2026-10-11")).toBe("2026-10-05");
      }
    } finally {
      if (original === undefined) delete process.env.TZ;
      else process.env.TZ = original;
    }
  });
});

describe("formatLongCalendarDate", () => {
  it("names the weekday, day and month", () => {
    expect(formatLongCalendarDate("2026-10-02")).toBe("Friday 2 October");
    expect(formatLongCalendarDate("2026-12-31")).toBe("Thursday 31 December");
  });
});

describe("formatWeekRange", () => {
  it("writes the year once when both dates share it", () => {
    expect(formatWeekRange("2026-09-28", "2026-10-04")).toBe("28. September – 4. Oktober 2026");
  });

  it("writes both years across a year boundary", () => {
    expect(formatWeekRange("2026-12-28", "2027-01-03")).toBe("28. Dezember 2026 – 3. Januar 2027");
  });

  it("repeats the month inside one month and keeps single-digit days unpadded", () => {
    expect(formatWeekRange("2026-10-05", "2026-10-11")).toBe("5. Oktober – 11. Oktober 2026");
  });

  it("uses German month names with umlauts", () => {
    expect(formatWeekRange("2026-03-02", "2026-03-08")).toBe("2. März – 8. März 2026");
  });
});
