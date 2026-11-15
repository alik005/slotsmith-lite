import Link from "next/link";
import { notFound } from "next/navigation";
import { db, getSettings } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { formatDayShort, upcomingDays } from "@/lib/time";
import { BookingForm } from "./BookingForm";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const svc = await db.service.findUnique({ where: { slug } });
  return { title: svc ? `Book ${svc.name}` : "Book" };
}

export default async function BookPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const s = await getSettings();
  const service = await db.service.findFirst({
    where: { slug, active: true },
    include: { staff: { include: { staff: true } } },
  });
  if (!service) notFound();

  const staff = service.staff.map((x) => x.staff).filter((x) => x.active).map((x) => ({ id: x.id, name: x.name }));
  const days = upcomingDays(Math.min(s.maxDaysAhead, 21), s.timezone).map((key) => ({ key, ...formatDayShort(key, s.timezone) }));
  const deposit = false; // deposits are a Slotsmith Pro feature

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
      <div className="min-w-0 space-y-6">
        <Link href="/" className="text-sm text-muted hover:text-ink">
          ← All services
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">{service.name}</h1>
        <BookingForm serviceId={service.id} staff={staff} days={days} tz={s.timezone} deposit={deposit} />
      </div>
      <aside className="card h-fit space-y-3">
        <h2 className="font-semibold">Summary</h2>
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted">Duration</dt>
            <dd>{service.durationMin} min</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted">Price</dt>
            <dd>{formatMoney(service.priceCents, s.currency)}</dd>
          </div>
          {deposit && (
            <div className="flex justify-between">
              <dt className="text-muted">Deposit due now</dt>
              <dd>{formatMoney(service.depositCents, s.currency)}</dd>
            </div>
          )}
        </dl>
        {service.description && <p className="border-t border-line pt-3 text-sm text-muted">{service.description}</p>}
        <p className="border-t border-line pt-3 text-xs text-muted">
          Free cancellation up to {s.cancelCutoffHours} hours before your appointment.
        </p>
      </aside>
    </div>
  );
}
