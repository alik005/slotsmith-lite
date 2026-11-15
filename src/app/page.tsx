import Link from "next/link";
import { db, getSettings } from "@/lib/db";
import { formatMoney } from "@/lib/money";

export const dynamic = "force-dynamic";

export default async function Home() {
  const s = await getSettings();
  const services = await db.service.findMany({ where: { active: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] });

  return (
    <div className="space-y-10">
      <section className="space-y-3">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Book an appointment</h1>
        <p className="max-w-xl text-muted">{s.tagline}</p>
      </section>

      {services.length === 0 ? (
        <div className="card text-muted">No services yet. Add some in the admin dashboard.</div>
      ) : (
        <section className="grid gap-4 sm:grid-cols-2">
          {services.map((svc) => (
            <Link key={svc.id} href={`/book/${svc.slug}`} className="card group flex flex-col gap-3 transition hover:border-brand-500">
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-lg font-semibold">{svc.name}</h2>
                <span className="badge bg-brand-50 text-brand-700">{formatMoney(svc.priceCents, s.currency)}</span>
              </div>
              {svc.description && <p className="text-sm text-muted">{svc.description}</p>}
              <div className="mt-auto flex items-center justify-between text-sm">
                <span className="text-muted">{svc.durationMin} min</span>
                <span className="font-semibold text-brand-600 group-hover:underline">Book →</span>
              </div>
            </Link>
          ))}
        </section>
      )}
    </div>
  );
}
