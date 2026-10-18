import { useTranslation } from 'react-i18next';
import english from './features.en.json';

// Existing calculation engines emit English diagnostic strings. Match only cataloged
// templates at the presentation boundary; their inputs and results remain unchanged.
const diagnosticTemplates = Object.keys(english)
  .filter((key) => key.includes('{{') && key.replace(/\{\{\w+\}\}/g, '').length >= 20)
  .map((key) => {
    const names = [...key.matchAll(/\{\{(\w+)\}\}/g)].map((match) => match[1]);
    const parts = key.split(/\{\{\w+\}\}/).map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    return { key, names, pattern: new RegExp(`^${parts.join('([\\s\\S]*?)')}$`) };
  });

/** Feature presentation only: never rewrite stored products, evidence or calculation inputs. */
export function useFeatureTranslation() {
  const { t, i18n } = useTranslation('features');
  const language = i18n?.resolvedLanguage ?? i18n?.language ?? 'en';
  function text(message: unknown, values: Record<string, unknown> = {}, depth = 0): string {
    if (message === undefined || message === null) return '';
    const source = String(message);
    const translate = (key: string, params = values) =>
      String(t(key, { ...params, keySeparator: false, nsSeparator: false, defaultValue: key }));
    if (Object.hasOwn(english, source) || !language.startsWith('es') || depth > 4) return translate(source);
    for (const { key, names, pattern } of diagnosticTemplates) {
      const match = source.match(pattern);
      if (match)
        return translate(
          key,
          Object.fromEntries(names.map((name, i) => [name, text(match[i + 1], {}, depth + 1)])),
        );
    }
    // Engine diagnostics prefix a date/product; keep that recorded label verbatim.
    const diagnostic = source.match(/^(\d{4}-\d{2}-\d{2}(?: · .+)?): (.+)$/);
    if (diagnostic) return `${diagnostic[1]}: ${text(diagnostic[2], {}, depth + 1)}`;
    if (source.includes(' · '))
      return source
        .split(' · ')
        .map((part) => text(part, {}, depth + 1))
        .join(' · ');
    return translate(source);
  }
  return { language, text };
}
