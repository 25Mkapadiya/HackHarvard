import { useTranslation } from 'react-i18next';
import type { ScoreCategory } from '../../lib/score';

export function ScoreBreakdown({ cats }: { cats: ScoreCategory[] }) {
  const { t } = useTranslation();
  return (
    <ul className="space-y-3">
      {cats.map((c) => (
        <li key={c.key}>
          <div className="flex justify-between font-bold">
            <span>{c.label}</span>
            <span>
              {c.earned} / {c.max}
            </span>
          </div>
          <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-kale-light" role="presentation">
            <div className="h-full rounded-full bg-kale" style={{ width: `${(c.earned / c.max) * 100}%` }} />
          </div>
          {c.lines.length > 0 && (
            <ul className="mt-1 text-sm text-ink-soft">
              {c.lines.map((l) => (
                <li key={l.label}>
                  +{l.points} {l.label}
                  {l.selfReported && (
                    <span className="ml-1 rounded bg-squash-light px-1 text-xs font-bold text-ink">
                      {t('vendor.selfReported')}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
          {c.improve && <p className="mt-1 text-sm">→ {c.improve}</p>}
        </li>
      ))}
    </ul>
  );
}
