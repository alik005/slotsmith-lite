"use client";

import { useActionState, useState } from "react";
import { cancelByCustomerAction } from "@/app/actions";

export function ManageBooking(props: {
  token: string;
  status: string;
  changeable: boolean;
  cutoffHours: number;
  contactEmail: string;
}) {
  const [confirming, setConfirming] = useState(false);
  const [state, action, pending] = useActionState(cancelByCustomerAction, undefined);

  if (props.status === "CANCELLED") return null;

  if (!props.changeable) {
    return (
      <div className="card text-sm text-muted">
        Need to change this booking? It&apos;s less than {props.cutoffHours} hours away, so please email{" "}
        <a className="font-medium text-brand-600" href={`mailto:${props.contactEmail}`}>{props.contactEmail}</a>.
      </div>
    );
  }

  return (
    <div className="card space-y-4">
      {!confirming ? (
        <button type="button" className="btn-danger" onClick={() => setConfirming(true)}>
          Cancel booking
        </button>
      ) : (
        <form action={action} className="space-y-3">
          <input type="hidden" name="token" value={props.token} />
          <p className="text-sm">Are you sure? This can&apos;t be undone.</p>
          {state?.error && <p className="text-sm text-red-700">{state.error}</p>}
          <div className="flex gap-2">
            <button className="btn-danger" disabled={pending}>{pending ? "Cancelling…" : "Yes, cancel it"}</button>
            <button type="button" className="btn-ghost" onClick={() => setConfirming(false)}>Keep it</button>
          </div>
        </form>
      )}
    </div>
  );
}
