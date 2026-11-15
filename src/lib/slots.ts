import { localTime, weekdayOf } from "./time";

export type Interval = { start: Date; end: Date };

export type StaffSchedule = {
  id: string;
  /** Working windows for the requested day, minutes after local midnight. */
  windows: { startMin: number; endMin: number }[];
  /** Existing bookings and time off that block this staff member. */
  busy: Interval[];
};

export type SlotRules = {
  day: string; // YYYY-MM-DD in business timezone
  tz: string;
  durationMin: number;
  intervalMin: number;
  bufferMin: number;
  minNoticeMin: number;
  maxDaysAhead: number;
  now: Date;
};

export type Slot = { start: Date; end: Date; staffIds: string[] };

const MIN = 60_000;

export function overlaps(a: Interval, b: Interval): boolean {
  return a.start < b.end && b.start < a.end;
}

/**
 * Pure slot calculator. Returns every start time on `day` where at least one
 * staff member can take a booking of `durationMin`, respecting working hours,
 * buffers, existing bookings, time off, minimum notice and the booking horizon.
 */
export function computeSlots(rules: SlotRules, staff: StaffSchedule[]): Slot[] {
  const { day, tz, durationMin, intervalMin, bufferMin, minNoticeMin, maxDaysAhead, now } = rules;
  if (durationMin <= 0 || intervalMin <= 0) return [];

  const earliest = new Date(now.getTime() + minNoticeMin * MIN);
  const horizon = new Date(now.getTime() + maxDaysAhead * 24 * 60 * MIN);
  const dayStart = localTime(day, 0, tz);
  if (dayStart > horizon) return [];

  const byStart = new Map<number, Slot>();

  for (const s of staff) {
    for (const w of s.windows) {
      for (let t = w.startMin; t + durationMin <= w.endMin; t += intervalMin) {
        const start = localTime(day, t, tz);
        const end = new Date(start.getTime() + durationMin * MIN);
        if (start < earliest || start > horizon) continue;
        const padded: Interval = {
          start: new Date(start.getTime() - bufferMin * MIN),
          end: new Date(end.getTime() + bufferMin * MIN),
        };
        if (s.busy.some((b) => overlaps(padded, b))) continue;
        const key = start.getTime();
        const slot = byStart.get(key);
        if (slot) slot.staffIds.push(s.id);
        else byStart.set(key, { start, end, staffIds: [s.id] });
      }
    }
  }

  return [...byStart.values()].sort((a, b) => a.start.getTime() - b.start.getTime());
}

export { weekdayOf };
