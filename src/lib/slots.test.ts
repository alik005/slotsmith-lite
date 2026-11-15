import { describe, expect, it } from "vitest";
import { computeSlots, type SlotRules } from "./slots";
import { localTime, upcomingDays, weekdayOf } from "./time";

const tz = "America/New_York";
const base: SlotRules = {
  day: "2026-03-10", // a Tuesday
  tz,
  durationMin: 60,
  intervalMin: 30,
  bufferMin: 0,
  minNoticeMin: 0,
  maxDaysAhead: 365,
  now: new Date("2026-03-01T00:00:00Z"),
};
const nineToFive = [{ startMin: 9 * 60, endMin: 17 * 60 }];
const hhmm = (d: Date) =>
  new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit" }).format(d);

describe("computeSlots", () => {
  it("fills a working day with interval-spaced slots that fit the duration", () => {
    const slots = computeSlots(base, [{ id: "a", windows: nineToFive, busy: [] }]);
    expect(slots.map((s) => hhmm(s.start))[0]).toBe("09:00");
    expect(slots.map((s) => hhmm(s.start)).at(-1)).toBe("16:00");
    expect(slots).toHaveLength(15);
  });

  it("removes slots that overlap an existing booking", () => {
    const busy = [{ start: localTime(base.day, 10 * 60, tz), end: localTime(base.day, 11 * 60, tz) }];
    const times = computeSlots(base, [{ id: "a", windows: nineToFive, busy }]).map((s) => hhmm(s.start));
    expect(times).not.toContain("09:30");
    expect(times).not.toContain("10:00");
    expect(times).not.toContain("10:30");
    expect(times).toContain("09:00");
    expect(times).toContain("11:00");
  });

  it("applies buffers on both sides of existing bookings", () => {
    const busy = [{ start: localTime(base.day, 10 * 60, tz), end: localTime(base.day, 11 * 60, tz) }];
    const times = computeSlots({ ...base, bufferMin: 15 }, [{ id: "a", windows: nineToFive, busy }]).map((s) =>
      hhmm(s.start),
    );
    expect(times).not.toContain("09:00"); // ends 10:00, +15 buffer clashes
    expect(times).not.toContain("11:00"); // starts 11:00, -15 buffer clashes
    expect(times).toContain("11:30");
  });

  it("respects minimum notice", () => {
    const now = localTime(base.day, 12 * 60, tz);
    const times = computeSlots({ ...base, now, minNoticeMin: 120 }, [{ id: "a", windows: nineToFive, busy: [] }]).map(
      (s) => hhmm(s.start),
    );
    expect(times[0]).toBe("14:00");
  });

  it("returns nothing beyond the booking horizon", () => {
    const slots = computeSlots({ ...base, maxDaysAhead: 3 }, [{ id: "a", windows: nineToFive, busy: [] }]);
    expect(slots).toHaveLength(0);
  });

  it("merges staff: a slot lists every staff member free at that time", () => {
    const busy = [{ start: localTime(base.day, 9 * 60, tz), end: localTime(base.day, 10 * 60, tz) }];
    const slots = computeSlots(base, [
      { id: "a", windows: nineToFive, busy },
      { id: "b", windows: nineToFive, busy: [] },
    ]);
    expect(slots[0].staffIds).toEqual(["b"]);
    expect(slots.find((s) => hhmm(s.start) === "12:00")?.staffIds.sort()).toEqual(["a", "b"]);
  });

  it("handles split shifts", () => {
    const windows = [
      { startMin: 9 * 60, endMin: 12 * 60 },
      { startMin: 13 * 60, endMin: 15 * 60 },
    ];
    const times = computeSlots(base, [{ id: "a", windows, busy: [] }]).map((s) => hhmm(s.start));
    expect(times).not.toContain("11:30");
    expect(times).not.toContain("12:30");
    expect(times).toContain("13:00");
    expect(times.at(-1)).toBe("14:00");
  });

  it("is DST-safe: 09:00 local stays 09:00 local across the spring-forward day", () => {
    const before = computeSlots({ ...base, day: "2026-03-07" }, [{ id: "a", windows: nineToFive, busy: [] }]);
    const after = computeSlots({ ...base, day: "2026-03-09" }, [{ id: "a", windows: nineToFive, busy: [] }]);
    expect(hhmm(before[0].start)).toBe("09:00");
    expect(hhmm(after[0].start)).toBe("09:00");
    expect(after[0].start.getUTCHours()).toBe(before[0].start.getUTCHours() - 1);
  });
});

describe("time helpers", () => {
  it("computes weekdays in the business timezone", () => {
    expect(weekdayOf("2026-03-10", tz)).toBe(2);
    expect(weekdayOf("2026-03-15", "Asia/Dhaka")).toBe(0);
  });
  it("lists upcoming days", () => {
    const days = upcomingDays(3, tz, new Date("2026-12-31T15:00:00Z"));
    expect(days).toEqual(["2026-12-31", "2027-01-01", "2027-01-02"]);
  });
});
