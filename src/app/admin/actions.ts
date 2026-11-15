"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { checkPassword, endSession, requireAdmin, startSession } from "@/lib/auth";
import { cancelBooking } from "@/lib/bookings";

export type AdminState = { error?: string; ok?: string } | undefined;

export async function loginAction(_: AdminState, form: FormData): Promise<AdminState> {
  if (!checkPassword(String(form.get("password") ?? ""))) return { error: "Wrong password." };
  await startSession();
  redirect("/admin");
}

export async function logoutAction() {
  await endSession();
  redirect("/admin/login");
}

export async function adminCancelBooking(form: FormData) {
  await requireAdmin();
  await cancelBooking(String(form.get("id")), { byAdmin: true });
  revalidatePath("/admin");
}
