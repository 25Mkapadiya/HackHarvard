import { useTranslation } from 'react-i18next';
import type { Filters, When } from '../../lib/filters';
import { DEFAULT_FILTERS, activeFilterCount } from '../../lib/filters';
import { CATEGORY_LABELS, PAYMENT_LABELS } from '../../lib/labels';
import type { PaymentMethodId, ProductCategoryId, ProgramId } from '../../types';
import { dayName } from '../../lib/format';

const PROGRAMS: ProgramId[] = ['snap', 'hip', 'wic_fmnp', 'sfmnp', 'city_coupon'];
const DISTANCES_MI = [1, 3, 5, 10, 25];
const POPULAR: ProductCategoryId[] = [
  'vegetables',
  'fruits',
  'eggs',
  'meat',
  'seafood',
  'baked_goods',
  'cheese',
  'dairy',
  'honey',
  'mushrooms',
  'prepared_foods',
  'flowers',
];

function toggle<T>(list: T[], v: T) {
  return list.includes(v) ? list.filter((x) => x !== v) : [...list, v];
}

export function FilterPanel({
  f,
  onChange,
  hasLocation,
}: {
  f: Filters;
  onChange: (f: Filters) => void;
  hasLocation: boolean;
}) {
  const { t, i18n } = useTranslation();
  const whenOptions: { v: When; label: string }[] = [
    { v: 'any', label: t('filters.any') },
    { v: 'now', label: t('filters.now') },
    { v: 'today', label: t('filters.today') },
    { v: 'week', label: t('filters.week') },
  ];
  // A fixed Sunday-based week to label the weekday picker.
  const days = [0, 1, 2, 3, 4, 5, 6].map((d) => ({
    v: `day${d}` as When,
    label: dayName({ y: 2026, m: 10, d: 18 + d }, i18n.language),
  }));

  return (
    <div className="space-y-5">
      <fieldset>
        <legend className="label">{t('filters.when')}</legend>
        <div className="flex flex-wrap gap-2">
          {whenOptions.map((o) => (
            <label key={o.v} className="toggle">
              <input
                type="radio"
                name="when"
                checked={f.when === o.v}
                onChange={() => onChange({ ...f, when: o.v })}
              />
              {o.label}
            </label>
          ))}
        </div>
        <label className="mt-2 block">
          <span className="sr-only">{t('filters.onDay')}</span>
          <select
            className="field"
            value={f.when.startsWith('day') ? f.when : ''}
            onChange={(e) => onChange({ ...f, when: (e.target.value || 'any') as When })}
          >
            <option value="">{t('filters.onDay')}…</option>
            {days.map((d) => (
              <option key={d.v} value={d.v} className="capitalize">
                {d.label}
              </option>
            ))}
          </select>
        </label>
      </fieldset>

      <fieldset>
        <legend className="label">{t('filters.programs')}</legend>
        <div className="flex flex-wrap gap-2">
          {PROGRAMS.map((p) => (
            <label key={p} className="toggle">
              <input
                type="checkbox"
                checked={f.programs.includes(p)}
                onChange={() => onChange({ ...f, programs: toggle(f.programs, p) })}
              />
              {t(`programs.${p}`)}
            </label>
          ))}
        </div>
      </fieldset>

      <label className="block">
        <span className="label">{t('filters.distance')}</span>
        <select
          className="field"
          value={f.maxKm ? String(Math.round(f.maxKm / 1.60934)) : ''}
          onChange={(e) =>
            onChange({ ...f, maxKm: e.target.value ? Number(e.target.value) * 1.60934 : undefined })
          }
          aria-describedby={hasLocation ? undefined : 'dist-help'}
        >
          <option value="">{t('filters.anyDistance')}</option>
          {DISTANCES_MI.map((mi) => (
            <option key={mi} value={mi}>
              {t('filters.within', { n: mi })}
            </option>
          ))}
        </select>
        {!hasLocation && (
          <span id="dist-help" className="mt-1 block text-sm text-ink-soft">
            {t('home.nearDefault')}
          </span>
        )}
      </label>

      <fieldset>
        <legend className="label">{t('filters.products')}</legend>
        <div className="flex flex-wrap gap-2">
          {POPULAR.map((p) => (
            <label key={p} className="toggle text-sm">
              <input
                type="checkbox"
                checked={f.products.includes(p)}
                onChange={() => onChange({ ...f, products: toggle(f.products, p) })}
              />
              {t(`categories.${p}`, CATEGORY_LABELS[p])}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="label">{t('filters.pay')}</legend>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(PAYMENT_LABELS) as PaymentMethodId[])
            .filter((p) => p !== 'check')
            .map((p) => (
              <label key={p} className="toggle text-sm">
                <input
                  type="checkbox"
                  checked={f.pay.includes(p)}
                  onChange={() => onChange({ ...f, pay: toggle(f.pay, p) })}
                />
                {t(`pay.${p}`)}
              </label>
            ))}
        </div>
        <p className="mt-1 text-sm text-ink-soft">{t('filters.sampleNote')}</p>
      </fieldset>

      <fieldset>
        <legend className="label">{t('filters.more')}</legend>
        <div className="flex flex-wrap gap-2">
          <label className="toggle text-sm">
            <input
              type="checkbox"
              checked={!!f.winter}
              onChange={() => onChange({ ...f, winter: !f.winter || undefined })}
            />
            {t('filters.winter')}
          </label>
          <label className="toggle text-sm">
            <input
              type="checkbox"
              checked={!!f.indoor}
              onChange={() => onChange({ ...f, indoor: !f.indoor || undefined })}
            />
            {t('filters.indoor')}
          </label>
          <label className="toggle text-sm">
            <input
              type="checkbox"
              checked={!!f.minScore}
              onChange={() => onChange({ ...f, minScore: f.minScore ? undefined : 60 })}
            />
            {t('filters.sustainable')}
          </label>
        </div>
      </fieldset>

      {activeFilterCount(f) > 0 && (
        <button className="btn-quiet" onClick={() => onChange({ ...DEFAULT_FILTERS, lila: f.lila })}>
          {t('explore.clear')}
        </button>
      )}
    </div>
  );
}
