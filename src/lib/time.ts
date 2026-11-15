import { TZDate } from "@date-fns/tz";

/** Parse "YYYY-MM-DD" into numbers. Throws on bad input. */
export function parseDay(day: string): { y: number; m: number; d: number } {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day);
  if (!m) throw new Error(`Invalid day: ${day}`);
  return { y: Number(m[1]), m: Number(m[2]), d: Number(m[3]) };
}

/** The instant of local wall-clock time `minutes` after midnight on `day` in `tz`. DST-safe. */
export function localTime(day: string, minutes: number, tz: string): Date {
  const { y, m, d } = parseDay(day);
  const t = new TZDate(y, m - 1, d, Math.floor(minutes / 60), minutes % 60, 0, tz);
  return new Date(t.getTime());
}

/** Weekday (0 = Sunday) of a calendar day in `tz`. */
export function weekdayOf(day: string, tz: string): number {
  const { y, m, d } = parseDay(day);
  return new TZDate(y, m - 1, d, 12, 0, 0, tz).getDay();
}

/** "YYYY-MM-DD" for an instant, as seen in `tz`. */
export function dayKey(date: Date, tz: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
  return parts; // en-CA formats as YYYY-MM-DD
}

/** Next `count` calendar days starting today in `tz`. */
export function upcomingDays(count: number, tz: string, from = new Date()): string[] {
  const out: string[] = [];
  const { y, m, d } = parseDay(dayKey(from, tz));
  for (let i = 0; i < count; i++) {
    const t = new TZDate(y, m - 1, d + i, 12, 0, 0, tz);
    out.push(dayKey(new Date(t.getTime()), tz));
  }
  return out;
}

export function formatTime(date: Date, tz: string): string {
  return new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "numeric", minute: "2-digit" }).format(date);
}

export function formatDay(date: Date, tz: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export function formatDayShort(day: string, tz: string): { weekday: string; label: string } {
  const date = localTime(day, 12 * 60, tz);
  return {
    weekday: new Intl.DateTimeFormat("en-US", { timeZone: tz, weekday: "short" }).format(date),
    label: new Intl.DateTimeFormat("en-US", { timeZone: tz, month: "short", day: "numeric" }).format(date),
  };
}

export function minutesToLabel(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function labelToMinutes(label: string): number {
  const m = /^(\d{1,2}):(\d{2})$/.exec(label.trim());
  if (!m) throw new Error(`Invalid time: ${label}`);
  const v = Number(m[1]) * 60 + Number(m[2]);
  if (v < 0 || v > 24 * 60) throw new Error(`Invalid time: ${label}`);
  return v;
}
