import { db, getSettings } from "./db";
import { computeSlots, type Slot, type StaffSchedule } from "./slots";
import { localTime, weekdayOf } from "./time";

/** Pending-payment bookings hold their slot for this long before being ignored. */
export const PAYMENT_HOLD_MIN = 30;

export async function getSlotsForDay(opts: {
  serviceId: string;
  staffId?: string | null; // null/undefined = any staff
  day: string;
  excludeBookingId?: string; // used when rescheduling
  now?: Date;
}): Promise<Slot[]> {
  const settings = await getSettings();
  const tz = settings.timezone;
  const now = opts.now ?? new Date();

  const service = await db.service.findFirst({
    where: { id: opts.serviceId, active: true },
    include: { staff: { include: { staff: true } } },
  });
  if (!service) return [];

  let staff = service.staff.map((s) => s.staff).filter((s) => s.active);
  if (opts.staffId) staff = staff.filter((s) => s.id === opts.staffId);
  if (staff.length === 0) return [];

  const weekday = weekdayOf(opts.day, tz);
  const dayStart = localTime(opts.day, 0, tz);
  const dayEnd = localTime(opts.day, 24 * 60, tz);
  // widen the window so buffers around midnight are respected
  const from = new Date(dayStart.getTime() - 24 * 3600_000);
  const to = new Date(dayEnd.getTime() + 24 * 3600_000);
  const holdCutoff = new Date(now.getTime() - PAYMENT_HOLD_MIN * 60_000);
  const staffIds = staff.map((s) => s.id);

  const [availability, bookings, timeOff] = await Promise.all([
    db.availability.findMany({ where: { staffId: { in: staffIds }, weekday } }),
    db.booking.findMany({
      where: {
        staffId: { in: staffIds },
        startsAt: { lt: to },
        endsAt: { gt: from },
        id: opts.excludeBookingId ? { not: opts.excludeBookingId } : undefined,
        OR: [
          { status: "CONFIRMED" },
          { status: "PENDING_PAYMENT", createdAt: { gt: holdCutoff } },
        ],
      },
      select: { staffId: true, startsAt: true, endsAt: true },
    }),
    db.timeOff.findMany({
      where: { staffId: { in: staffIds }, startsAt: { lt: to }, endsAt: { gt: from } },
    }),
  ]);

  const schedules: StaffSchedule[] = staff.map((s) => ({
    id: s.id,
    windows: availability
      .filter((a) => a.staffId === s.id)
      .map((a) => ({ startMin: a.startMin, endMin: a.endMin })),
    busy: [
      ...bookings.filter((b) => b.staffId === s.id).map((b) => ({ start: b.startsAt, end: b.endsAt })),
      ...timeOff.filter((t) => t.staffId === s.id).map((t) => ({ start: t.startsAt, end: t.endsAt })),
    ],
  }));

  return computeSlots(
    {
      day: opts.day,
      tz,
      durationMin: service.durationMin,
      intervalMin: settings.slotIntervalMin,
      bufferMin: settings.bufferMin,
      minNoticeMin: settings.minNoticeHours * 60,
      maxDaysAhead: settings.maxDaysAhead,
      now,
    },
    schedules,
  );
}
