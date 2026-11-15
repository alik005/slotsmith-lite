import Link from "next/link";
import { db, getSettings } from "@/lib/db";
import { formatDay, formatTime } from "@/lib/time";
import { adminCancelBooking } from "../actions";

const VIEWS = {
  upcoming: "Upcoming",
  past: "Past",
  cancelled: "Cancelled",
} as const;
type View = keyof typeof VIEWS;

const STATUS_TONE: Record<string, string> = {
  CONFIRMED: "bg-brand-50 text-brand-700",
  PENDING_PAYMENT: "bg-amber-50 text-amber-800",
  CANCELLED: "bg-red-50 text-red-700",
};

export default async function AdminBookings({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const s = await getSettings();
  const view: View = ((await searchParams).view as View) in VIEWS ? ((await searchParams).view as View) : "upcoming";
  const now = new Date();
  const weekAhead = new Date(now.getTime() + 7 * 24 * 3600_000);
  const monthAgo = new Date(now.getTime() - 30 * 24 * 3600_000);

  const where =
    view === "upcoming"
      ? { status: { not: "CANCELLED" }, endsAt: { gte: now } }
      : view === "past"
        ? { status: { not: "CANCELLED" }, endsAt: { lt: now } }
        : { status: "CANCELLED" };

  const [bookings, upcomingWeek, last30, revenue] = await Promise.all([
    db.booking.findMany({
      where,
      include: { service: true, staff: true },
      orderBy: { startsAt: view === "upcoming" ? "asc" : "desc" },
      take: 200,
    }),
    db.booking.count({ where: { status: "CONFIRMED", startsAt: { gte: now, lt: weekAhead } } }),
    db.booking.count({ where: { status: { not: "CANCELLED" }, createdAt: { gte: monthAgo } } }),
    db.booking.aggregate({
      _sum: { priceCents: true },
      where: { status: "CONFIRMED", startsAt: { gte: monthAgo, lt: now } },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Booked next 7 days" value={String(upcomingWeek)} />
        <Stat label="New bookings, last 30 days" value={String(last30)} />
        <Stat
          label="Completed value, last 30 days"
          value={new Intl.NumberFormat("en-US", { style: "currency", currency: s.currency }).format((revenue._sum.priceCents ?? 0) / 100)}
        />
      </div>

      <div className="flex gap-2">
        {(Object.keys(VIEWS) as View[]).map((v) => (
          <Link key={v} href={`/admin?view=${v}`} className={`chip ${v === view ? "chip-on" : ""}`}>
            {VIEWS[v]}
          </Link>
        ))}
      </div>

      <div className="card overflow-x-auto p-0">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-line text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-4 py-3">When</th>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Service</th>
              <th className="px-4 py-3">Staff</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {bookings.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted">No bookings here yet.</td>
              </tr>
            )}
            {bookings.map((b) => (
              <tr key={b.id} className="border-b border-line last:border-0">
                <td className="whitespace-nowrap px-4 py-3">
                  <div className="font-medium">{formatDay(b.startsAt, s.timezone)}</div>
                  <div className="text-muted">{formatTime(b.startsAt, s.timezone)}–{formatTime(b.endsAt, s.timezone)}</div>
                </td>
                <td className="px-4 py-3">
                  <div className="font-medium">{b.customerName}</div>
                  <div className="text-muted">{b.customerEmail}{b.customerPhone && ` · ${b.customerPhone}`}</div>
                  {b.notes && <div className="mt-1 max-w-xs text-xs text-muted">“{b.notes}”</div>}
                </td>
                <td className="px-4 py-3">{b.service.name}</td>
                <td className="px-4 py-3">{b.staff.name}</td>
                <td className="px-4 py-3">
                  <span className={`badge ${STATUS_TONE[b.status] ?? ""}`}>{b.status.replace("_", " ").toLowerCase()}</span>
                  {b.paymentStatus === "PAID" && <span className="badge ml-1 bg-brand-50 text-brand-700">deposit paid</span>}
                </td>
                <td className="px-4 py-3 text-right">
                  {b.status !== "CANCELLED" && b.endsAt > now && (
                    <form action={adminCancelBooking}>
                      <input type="hidden" name="id" value={b.id} />
                      <button className="text-sm font-medium text-red-700 hover:underline">Cancel</button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="card">
      <div className="text-sm text-muted">{label}</div>
      <div className="mt-1 text-2xl font-bold">{value}</div>
    </div>
  );
}
