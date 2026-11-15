import nodemailer from "nodemailer";
import type { Booking, Service, Staff } from "@prisma/client";
import { getSettings } from "./db";
import { formatDay, formatTime } from "./time";
import { appUrl } from "./url";

type FullBooking = Booking & { service: Service; staff: Staff };

let transport: nodemailer.Transporter | null = null;
function getTransport() {
  if (!process.env.SMTP_URL) return null;
  transport ??= nodemailer.createTransport(process.env.SMTP_URL);
  return transport;
}

export async function sendMail(msg: { to: string; subject: string; text: string }) {
  const from = process.env.MAIL_FROM || "Slotsmith <no-reply@example.com>";
  const t = getTransport();
  if (!t) {
    // Dev mode: no SMTP configured, so print the email instead of sending it.
    console.log(`\n[mail] To: ${msg.to}\n[mail] Subject: ${msg.subject}\n${msg.text}\n`);
    return;
  }
  await t.sendMail({ from, ...msg });
}

async function describe(b: FullBooking) {
  const s = await getSettings();
  const when = `${formatDay(b.startsAt, s.timezone)} at ${formatTime(b.startsAt, s.timezone)} (${s.timezone})`;
  const link = appUrl(`/booking/${b.manageToken}`);
  return { s, when, link };
}

export async function sendBookingConfirmed(b: FullBooking) {
  const { s, when, link } = await describe(b);
  await sendMail({
    to: b.customerEmail,
    subject: `Confirmed: ${b.service.name} on ${formatDay(b.startsAt, s.timezone)}`,
    text: `Hi ${b.customerName},\n\nYour booking is confirmed.\n\n${b.service.name} with ${b.staff.name}\n${when}\n\nView or cancel: ${link}\n\n${s.businessName}`,
  });
  const notify = b.staff.email || s.contactEmail;
  if (notify) {
    await sendMail({
      to: notify,
      subject: `New booking: ${b.service.name}, ${when}`,
      text: `${b.customerName} <${b.customerEmail}> ${b.customerPhone}\n${b.service.name} with ${b.staff.name}\n${when}\nNotes: ${b.notes || "-"}`,
    });
  }
}

export async function sendBookingCancelled(b: FullBooking) {
  const { s, when } = await describe(b);
  await sendMail({
    to: b.customerEmail,
    subject: `Cancelled: ${b.service.name}`,
    text: `Hi ${b.customerName},\n\nYour booking for ${b.service.name} on ${when} has been cancelled.\n\nBook again any time: ${appUrl("/")}\n\n${s.businessName}`,
  });
  const notify = b.staff.email || s.contactEmail;
  if (notify) {
    await sendMail({ to: notify, subject: `Cancelled: ${b.service.name}, ${when}`, text: `${b.customerName} cancelled.` });
  }
}
