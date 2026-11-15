import { notFound } from "next/navigation";
import { getSettings } from "@/lib/db";
import { canCustomerChange, getBookingByToken } from "@/lib/bookings";
import { formatMoney } from "@/lib/money";
import { formatDay, formatTime } from "@/lib/time";
import { ManageBooking } from "./ManageBooking";

export const dynamic = "force-dynamic";
export const metadata = { title: "Your booking", robots: { index: false } };

export default async function BookingPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { token } = await params;
  const sp = await searchParams;
  const s = await getSettings();
  const b = await getBookingByToken(token);
  if (!b) notFound();

  const changeable = canCustomerChange(b, s.cancelCutoffHours);

  const banner =
    b.status === "CANCELLED"
      ? { tone: "bg-red-50 text-red-800", text: "This booking has been cancelled." }
      : sp.new
        ? { tone: "bg-brand-50 text-brand-700", text: "You're booked! A confirmation email is on its way." }
        : null;

  return (
    <div className="mx-auto min-w-0 max-w-2xl space-y-6">
      {banner && <div className={`rounded-2xl px-4 py-3 text-sm font-medium ${banner.tone}`}>{banner.text}</div>}
      <div className="card space-y-4">
        <h1 className="text-2xl font-bold">{b.service.name}</h1>
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted">When</dt>
            <dd className="font-medium">
              {formatDay(b.startsAt, s.timezone)}, {formatTime(b.startsAt, s.timezone)}–{formatTime(b.endsAt, s.timezone)}
            </dd>
          </div>
          <div>
            <dt className="text-muted">With</dt>
            <dd className="font-medium">{b.staff.name}</dd>
          </div>
          <div>
            <dt className="text-muted">Name</dt>
            <dd className="font-medium">{b.customerName}</dd>
          </div>
          <div>
            <dt className="text-muted">Price</dt>
            <dd className="font-medium">
              {formatMoney(b.priceCents, s.currency)}
              {b.depositCents > 0 && b.paymentStatus === "PAID" && ` (deposit ${formatMoney(b.depositCents, s.currency)} paid)`}
            </dd>
          </div>
        </dl>
      </div>

      <ManageBooking
        token={token}
        status={b.status}
        changeable={changeable}
        cutoffHours={s.cancelCutoffHours}
        contactEmail={s.contactEmail}
      />
    </div>
  );
}
