import { useTranslation } from 'react-i18next';
import { SCORE_RULES, PRACTICE_LABELS } from '../lib/score';
import type { PracticeId } from '../types';

const pts = (table: Partial<Record<string, number>>, labels: Record<string, string> = {}) =>
  Object.entries(table)
    .map(([k, v]) => `${labels[k] ?? k.toUpperCase()}: ${v}`)
    .join(' · ');

export default function HowScores() {
  const { t } = useTranslation();
  const R = SCORE_RULES;
  const rows: [string, number, string][] = [
    [
      'Certification',
      R.certification.max,
      `Verified certificate (USDA Organic, CNG, AWA…): ${R.certification.verified}. Self-reported, not yet verified: ${R.certification.selfReported}.`,
    ],
    ['Packaging', R.packaging.max, pts(R.packaging.points, PRACTICE_LABELS)],
    [
      'Food miles',
      R.foodMiles.max,
      R.foodMiles.bands.map((b) => `≤ ${b.upTo} mi: ${b.points}`).join(' · ') +
        ' · farther: 0. Average straight-line distance from farm to the markets the vendor attends.',
    ],
    ['Waste diversion', R.waste.max, pts(R.waste.points, PRACTICE_LABELS)],
    [
      'Growing practices',
      R.growing.max,
      `${R.growing.each} each: ${R.growing.practices.map((p: PracticeId) => PRACTICE_LABELS[p]).join(', ')}.`,
    ],
    [
      'Food-access programs',
      R.benefits.max,
      pts(R.benefits.points, { wic_fmnp: 'WIC coupons', sfmnp: 'Senior coupons' }),
    ],
  ];
  return (
    <div className="mx-auto max-w-4xl space-y-5 px-4 py-6">
      <h1 className="text-3xl font-extrabold">{t('scores.title')}</h1>
      <p>{t('scores.lede')}</p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[32rem] border-collapse text-left">
          <thead>
            <tr className="border-b-2 border-ink">
              <th className="py-2 pr-3">{t('scores.category')}</th>
              <th className="py-2 pr-3">{t('scores.max')}</th>
              <th className="py-2">{t('scores.rules')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([label, max, rule]) => (
              <tr key={label} className="border-b border-line align-top">
                <th scope="row" className="py-3 pr-3">
                  {label}
                </th>
                <td className="py-3 pr-3 font-bold">{max}</td>
                <td className="py-3">{rule}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-sm text-ink-soft">
        Each category is capped at its maximum. Source: src/lib/score/index.ts.
      </p>
    </div>
  );
}
