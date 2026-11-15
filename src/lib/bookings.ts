import { randomBytes } from "node:crypto";
import { db, getSettings } from "./db";
import { getSlotsForDay, PAYMENT_HOLD_MIN } from "./availability";
import { dayKey } from "./time";
import { sendBookingCancelled, sendBookingConfirmed } from "./mail";

export class BookingError extends Error {}

const withRelations = { service: true, staff: true } as const;

async function staffIsFree(
  tx: Pick<typeof db, "booking" | "timeOff">,
  staffId: string,
  start: Date,
  end: Date,
  bufferMin: number,
) {
  const s = new Date(start.getTime() - bufferMin * 60_000);
  const e = new Date(end.getTime() + bufferMin * 60_000);
  const holdCutoff = new Date(Date.now() - PAYMENT_HOLD_MIN * 60_000);
  const clash = await tx.booking.count({
    where: {
      staffId,
      startsAt: { lt: e },
      endsAt: { gt: s },
      OR: [{ status: "CONFIRMED" }, { status: "PENDING_PAYMENT", createdAt: { gt: holdCutoff } }],
    },
  });
  if (clash) return false;
  const off = await tx.timeOff.count({ where: { staffId, startsAt: { lt: end }, endsAt: { gt: start } } });
  return off === 0;
}

export async function createBooking(input: {
  serviceId: string;
  staffId?: string | null;
  start: string; // ISO
  name: string;
  email: string;
  phone?: string;
  notes?: string;
}) {
  const settings = await getSettings();
  const start = new Date(input.start);
  if (Number.isNaN(start.getTime())) throw new BookingError("Invalid time.");

  const service = await db.service.findFirst({ where: { id: input.serviceId, active: true } });
  if (!service) throw new BookingError("This service is no longer available.");

  const slots = await getSlotsForDay({
    serviceId: service.id,
    staffId: input.staffId,
    day: dayKey(start, settings.timezone),
  });
  const slot = slots.find((s) => s.start.getTime() === start.getTime());
  if (!slot) throw new BookingError("Sorry, that time was just taken. Please pick another.");

  const end = new Date(start.getTime() + service.durationMin * 60_000);

  const booking = await db.$transaction(async (tx) => {
    for (const staffId of slot.staffIds) {
      if (!(await staffIsFree(tx, staffId, start, end, settings.bufferMin))) continue;
      return tx.booking.create({
        data: {
          serviceId: service.id,
          staffId,
          customerName: input.name.trim(),
          customerEmail: input.email.trim().toLowerCase(),
          customerPhone: (input.phone ?? "").trim(),
          notes: (input.notes ?? "").trim(),
          startsAt: start,
          endsAt: end,
          priceCents: service.priceCents,
          status: "CONFIRMED",
          manageToken: randomBytes(18).toString("base64url"),
        },
        include: withRelations,
      });
    }
    throw new BookingError("Sorry, that time was just taken. Please pick another.");
  });

  await sendBookingConfirmed(booking);
  return booking;
}

export async function getBookingByToken(token: string) {
  return db.booking.findUnique({ where: { manageToken: token }, include: withRelations });
}

export function canCustomerChange(b: { startsAt: Date; status: string }, cutoffHours: number, now = new Date()) {
  return b.status !== "CANCELLED" && b.startsAt.getTime() - now.getTime() > cutoffHours * 3600_000;
}

export async function cancelBooking(id: string, opts: { byAdmin?: boolean } = {}) {
  const settings = await getSettings();
  const b = await db.booking.findUnique({ where: { id }, include: withRelations });
  if (!b) throw new BookingError("Booking not found.");
  if (b.status === "CANCELLED") return b;
  if (!opts.byAdmin && !canCustomerChange(b, settings.cancelCutoffHours)) {
    throw new BookingError(`Bookings can't be cancelled less than ${settings.cancelCutoffHours} hours ahead. Please contact us.`);
  }
  const updated = await db.booking.update({ where: { id }, data: { status: "CANCELLED" }, include: withRelations });
  await sendBookingCancelled(updated);
  return updated;
}
