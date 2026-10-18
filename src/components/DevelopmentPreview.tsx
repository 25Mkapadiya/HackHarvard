/** Enabled only by the isolated preview build; ordinary Pages builds render nothing. */
export function DevelopmentPreview() {
  if (import.meta.env.VITE_DEVELOPMENT_PREVIEW !== 'true') return null;
  return (
    <aside
      aria-label="Development preview"
      className="border-b-2 border-amber-500 bg-amber-100 px-4 py-3 text-center text-sm text-slate-900"
    >
      <strong>Development preview · feature/sustainability-metrics</strong>
      <p>
        For testing only. Purchases are temporary in this tab and are not saved to an account. Do not enter
        sensitive information.
      </p>
    </aside>
  );
}
