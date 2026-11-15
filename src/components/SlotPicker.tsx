"use client";

import { useEffect, useState } from "react";

type Day = { key: string; weekday: string; label: string };

export function SlotPicker(props: {
  serviceId: string;
  staffId: string | null;
  days: Day[];
  tz: string;
  excludeBookingId?: string;
  value: string | null;
  onChange: (iso: string | null) => void;
}) {
  const { serviceId, staffId, days, tz, excludeBookingId, value, onChange } = props;
  const [day, setDay] = useState(days[0]?.key);
  // Results are tagged with the exact query they answer, so stale data is never shown or acted on.
  const [result, setResult] = useState<{ key: string; slots: string[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Until the customer picks a day themselves, skip ahead past fully booked days.
  const [auto, setAuto] = useState(true);

  const queryKey = `${serviceId}|${staffId ?? ""}|${day}|${excludeBookingId ?? ""}`;
  const slots = result?.key === queryKey ? result.slots : null;

  useEffect(() => {
    if (!auto || slots === null || slots.length > 0) return;
    const i = days.findIndex((d) => d.key === day);
    if (i >= 0 && i < days.length - 1) setDay(days[i + 1].key);
    else setAuto(false);
  }, [auto, slots, day, days]);

  useEffect(() => {
    if (!day) return;
    let cancelled = false;
    setError(null);
    const q = new URLSearchParams({ serviceId, day });
    if (staffId) q.set("staffId", staffId);
    if (excludeBookingId) q.set("exclude", excludeBookingId);
    fetch(`/api/slots?${q}`)
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) setResult({ key: queryKey, slots: (d.slots ?? []).map((s: { start: string }) => s.start) });
      })
      .catch(() => !cancelled && setError("Couldn't load times. Please try again."));
    return () => {
      cancelled = true;
    };
  }, [serviceId, staffId, day, excludeBookingId, queryKey]);

  const fmt = (iso: string) =>
    new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "numeric", minute: "2-digit" }).format(new Date(iso));

  return (
    <div className="space-y-4">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {days.map((d) => (
          <button
            key={d.key}
            type="button"
            onClick={() => {
              setAuto(false);
              setDay(d.key);
              onChange(null);
            }}
            className={`chip min-w-[4.5rem] shrink-0 text-center ${day === d.key ? "chip-on" : ""}`}
          >
            <div className="text-xs opacity-80">{d.weekday}</div>
            <div>{d.label}</div>
          </button>
        ))}
      </div>

      <div>
        {error && <p className="text-sm text-red-700">{error}</p>}
        {!error && slots === null && <p className="text-sm text-muted">Loading times…</p>}
        {slots && slots.length === 0 && <p className="text-sm text-muted">No times left on this day. Try another day.</p>}
        {slots && slots.length > 0 && (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
            {slots.map((iso) => (
              <button
                key={iso}
                type="button"
                onClick={() => onChange(iso)}
                className={`chip ${value === iso ? "chip-on" : ""}`}
              >
                {fmt(iso)}
              </button>
            ))}
          </div>
        )}
      </div>
      <p className="text-xs text-muted">Times shown in {tz}.</p>
    </div>
  );
}
