import { requireAdmin } from "@/lib/auth";
import { logoutAction } from "../actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin", robots: { index: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold">Bookings</h1>
        <form action={logoutAction}>
          <button className="text-sm text-muted hover:text-ink">Log out</button>
        </form>
      </div>
      {children}
      <p className="text-xs text-muted">
        Services, staff and hours are set in <code>prisma/seed.ts</code>. Slotsmith Pro adds a full admin editor,
        rescheduling, Stripe deposits, reminder emails and calendar invites.
      </p>
    </div>
  );
}
