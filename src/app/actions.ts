"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { BookingError, cancelBooking, createBooking, getBookingByToken } from "@/lib/bookings";

export type ActionState = { error?: string } | undefined;

const bookingSchema = z.object({
  serviceId: z.string().min(1),
  staffId: z.string().optional().nullable(),
  start: z.string().min(1, "Please choose a time."),
  name: z.string().trim().min(2, "Please enter your name.").max(100),
  email: z.string().trim().email("Please enter a valid email."),
  phone: z.string().trim().max(40).optional(),
  notes: z.string().trim().max(1000).optional(),
});

export async function createBookingAction(_: ActionState, form: FormData): Promise<ActionState> {
  const parsed = bookingSchema.safeParse({
    serviceId: form.get("serviceId"),
    staffId: form.get("staffId") || null,
    start: form.get("start"),
    name: form.get("name"),
    email: form.get("email"),
    phone: form.get("phone") || undefined,
    notes: form.get("notes") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Please check the form." };

  let token: string;
  try {
    token = (await createBooking(parsed.data)).manageToken;
  } catch (e) {
    if (e instanceof BookingError) return { error: e.message };
    console.error(e);
    return { error: "Something went wrong. Please try again." };
  }
  redirect(`/booking/${token}?new=1`);
}

export async function cancelByCustomerAction(_: ActionState, form: FormData): Promise<ActionState> {
  const token = String(form.get("token") ?? "");
  const b = await getBookingByToken(token);
  if (!b) return { error: "Booking not found." };
  try {
    await cancelBooking(b.id);
  } catch (e) {
    if (e instanceof BookingError) return { error: e.message };
    throw e;
  }
  redirect(`/booking/${token}`);
}
