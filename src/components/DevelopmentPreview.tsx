import { useFeatureTranslation } from '../i18n/featureText';
/** Enabled only by the isolated preview build; ordinary Pages builds render nothing. */
export function DevelopmentPreview() {
  const { text } = useFeatureTranslation();
  if (import.meta.env.VITE_DEVELOPMENT_PREVIEW !== 'true') return null;
  return (
    <aside
      aria-label={text('Development preview')}
      className="border-b-2 border-amber-500 bg-amber-100 px-4 py-3 text-center text-sm text-slate-900"
    >
      <strong>{text('Development preview · feature/sustainability-metrics')}</strong>
      <p>
        {text(
          'For testing only. Purchases are temporary in this tab and are not saved to an account. Do not enter sensitive information.',
        )}
      </p>
    </aside>
  );
}
