import { NextResponse } from "next/server";
import { getSlotsForDay } from "@/lib/availability";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const serviceId = url.searchParams.get("serviceId");
  const day = url.searchParams.get("day");
  const staffId = url.searchParams.get("staffId") || null;
  const exclude = url.searchParams.get("exclude") || undefined;
  if (!serviceId || !day || !/^\d{4}-\d{2}-\d{2}$/.test(day)) {
    return NextResponse.json({ error: "serviceId and day (YYYY-MM-DD) are required" }, { status: 400 });
  }
  const slots = await getSlotsForDay({ serviceId, staffId, day, excludeBookingId: exclude });
  return NextResponse.json({ slots: slots.map((s) => ({ start: s.start.toISOString(), staffIds: s.staffIds })) });
}
