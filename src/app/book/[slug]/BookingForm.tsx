"use client";

import { useActionState, useState } from "react";
import { createBookingAction } from "@/app/actions";
import { SlotPicker } from "@/components/SlotPicker";

type Day = { key: string; weekday: string; label: string };

export function BookingForm(props: {
  serviceId: string;
  staff: { id: string; name: string }[];
  days: Day[];
  tz: string;
  deposit: boolean;
}) {
  const [staffId, setStaffId] = useState<string | null>(props.staff.length === 1 ? props.staff[0].id : null);
  const [start, setStart] = useState<string | null>(null);
  const [state, action, pending] = useActionState(createBookingAction, undefined);

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="serviceId" value={props.serviceId} />
      <input type="hidden" name="staffId" value={staffId ?? ""} />
      <input type="hidden" name="start" value={start ?? ""} />

      {props.staff.length > 1 && (
        <section className="card space-y-3">
          <h2 className="font-semibold">1. Who would you like?</h2>
          <div className="flex flex-wrap gap-2">
            <button type="button" className={`chip ${staffId === null ? "chip-on" : ""}`} onClick={() => { setStaffId(null); setStart(null); }}>
              Anyone available
            </button>
            {props.staff.map((p) => (
              <button
                key={p.id}
                type="button"
                className={`chip ${staffId === p.id ? "chip-on" : ""}`}
                onClick={() => { setStaffId(p.id); setStart(null); }}
              >
                {p.name}
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="card space-y-3">
        <h2 className="font-semibold">{props.staff.length > 1 ? "2." : "1."} Pick a time</h2>
        <SlotPicker serviceId={props.serviceId} staffId={staffId} days={props.days} tz={props.tz} value={start} onChange={setStart} />
      </section>

      <section className="card space-y-4">
        <h2 className="font-semibold">{props.staff.length > 1 ? "3." : "2."} Your details</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="name">Name</label>
            <input id="name" name="name" required className="input" autoComplete="name" />
          </div>
          <div>
            <label className="label" htmlFor="email">Email</label>
            <input id="email" name="email" type="email" required className="input" autoComplete="email" />
          </div>
          <div>
            <label className="label" htmlFor="phone">Phone (optional)</label>
            <input id="phone" name="phone" className="input" autoComplete="tel" />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="notes">Anything we should know? (optional)</label>
          <textarea id="notes" name="notes" rows={3} className="input" />
        </div>
        {state?.error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>}
        <button className="btn w-full sm:w-auto" disabled={!start || pending}>
          {pending ? "Booking…" : props.deposit ? "Continue to pay deposit" : "Confirm booking"}
        </button>
      </section>
    </form>
  );
}
