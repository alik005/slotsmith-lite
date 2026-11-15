export function FormStatus({ state }: { state?: { error?: string; ok?: string } }) {
  if (state?.error) return <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>;
  if (state?.ok) return <p className="rounded-xl bg-brand-50 px-3 py-2 text-sm text-brand-700">{state.ok}</p>;
  return null;
}
