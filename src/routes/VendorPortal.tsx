import { useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useMarkets, useVendors } from '../app/data';
import { useStoreState } from '../app/context';
import { store, type VendorPatch } from '../lib/store';
import { scoreBreakdown, PRACTICE_LABELS } from '../lib/score';
import { CATEGORY_LABELS } from '../lib/labels';
import { Loading, SampleBadge } from '../components/Badges';
import { ScoreBreakdown } from '../features/vendor/ScoreBreakdown';
import type { PracticeId, Unit } from '../types';

const TABS = ['products', 'markets', 'practices', 'surplus'] as const;
type Tab = (typeof TABS)[number];
const UNITS: Unit[] = [
  'lb',
  'each',
  'bunch',
  'dozen',
  'pint',
  'quart',
  'oz',
  'pint_jar',
  'loaf',
  'half_gallon',
];
const GRANTS = [
  ['USDA AMS grants (FMPP, LFPP)', 'https://www.ams.usda.gov/services/grants'],
  ['GusNIP nutrition incentives', 'https://www.nifa.usda.gov/grants/programs/gusnip'],
  [
    'NRCS EQIP conservation funding',
    'https://www.nrcs.usda.gov/programs-initiatives/eqip-environmental-quality-incentives',
  ],
  ['USDA Organic Integrity Database', 'https://organic.ams.usda.gov/integrity/'],
  ['Certified Naturally Grown', 'https://www.naturallygrown.org'],
] as const;

export default function VendorPortal() {
  const { t } = useTranslation();
  const vendors = useVendors();
  const markets = useMarkets();
  const state = useStoreState();
  const [vendorId, setVendorId] = useState('v-hollow-oak');
  const [tab, setTab] = useState<Tab>('products');
  const [saved, setSaved] = useState(false);

  const v = vendors.data?.find((x) => x.id === vendorId);
  const [attState, setAttState] = useState('MA');
  const states = useMemo(() => [...new Set((markets.data ?? []).map((m) => m.state))].sort(), [markets.data]);
  const names = useMemo(
    () => new Map((markets.data ?? []).map((m) => [m.id, `${m.name} (${m.state})`])),
    [markets.data],
  );
  // Markets in the chosen state, with the ones this vendor already attends listed first.
  const attendable = useMemo(
    () =>
      (markets.data ?? [])
        .filter((m) => m.state === attState || v?.marketIds.includes(m.id))
        .sort(
          (a, b) =>
            Number(!!v?.marketIds.includes(b.id)) - Number(!!v?.marketIds.includes(a.id)) ||
            a.name.localeCompare(b.name),
        ),
    [markets.data, attState, v?.marketIds],
  );
  if (!vendors.data || !v) return <Loading />;

  const patch = state.vendorPatches[v.id] ?? {};
  const save = async (p: VendorPatch) => {
    await store.saveVendorPatch(v.id, { ...patch, ...p });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };
  const productPatch = (pid: string, p: NonNullable<VendorPatch['products']>[string]) =>
    save({ products: { ...patch.products, [pid]: { ...patch.products?.[pid], ...p } } });

  return (
    <div className="mx-auto max-w-3xl space-y-5 px-4 py-6">
      <h1 className="text-3xl font-extrabold">{t('portal.title')}</h1>
      <p>{t('portal.lede')}</p>
      <SampleBadge long />
      <label className="block">
        <span className="label">{t('portal.pick')}</span>
        <select className="field" value={vendorId} onChange={(e) => setVendorId(e.target.value)}>
          {vendors.data.map((x) => (
            <option key={x.id} value={x.id}>
              {x.name} — {x.town}
            </option>
          ))}
        </select>
      </label>
      <p>
        <Link to={`/vendors/${v.id}`}>{v.name} →</Link> · {t('vendor.score')}:{' '}
        <strong>{v.sustainabilityScore}/100</strong>
      </p>

      <div
        role="tablist"
        aria-label={t('portal.title')}
        className="flex gap-1 overflow-x-auto border-b border-line"
      >
        {TABS.map((k) => (
          <button
            key={k}
            role="tab"
            id={`tab-${k}`}
            aria-selected={tab === k}
            aria-controls={`panel-${k}`}
            className={`min-h-11 px-4 font-bold ${tab === k ? 'border-b-4 border-kale text-kale' : 'text-ink-soft'}`}
            onClick={() => setTab(k)}
          >
            {t(`portal.tab${k[0].toUpperCase()}${k.slice(1)}`)}
          </button>
        ))}
      </div>
      {saved && (
        <p className="rounded bg-kale-light p-2 font-bold" role="status">
          {t('portal.saved')}
        </p>
      )}

      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
        {tab === 'products' && (
          <ProductsTab
            v={v}
            onProduct={productPatch}
            onAdd={(a) => save({ addedProducts: [...(patch.addedProducts ?? []), a] })}
          />
        )}
        {tab === 'markets' && (
          <fieldset className="space-y-2">
            <legend className="label">{t('portal.attendance')}</legend>
            <label className="block max-w-xs">
              <span className="label">{t('filters.state')}</span>
              <select className="field" value={attState} onChange={(e) => setAttState(e.target.value)}>
                {states.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
            <ul className="max-h-[28rem] space-y-1 overflow-auto">
              {attendable.map((m) => (
                <li key={m.id}>
                  <label className="flex min-h-11 items-center gap-2">
                    <input
                      type="checkbox"
                      className="h-5 w-5"
                      checked={v.marketIds.includes(m.id)}
                      onChange={(e) =>
                        save({
                          marketIds: e.target.checked
                            ? [...v.marketIds, m.id]
                            : v.marketIds.filter((x) => x !== m.id),
                        })
                      }
                    />
                    {m.name} <span className="text-ink-soft">· {m.city}</span>
                  </label>
                </li>
              ))}
            </ul>
          </fieldset>
        )}
        {tab === 'practices' && (
          <div className="space-y-4">
            <fieldset>
              <legend className="label">{t('portal.assessment')}</legend>
              <p className="mb-2 text-sm text-ink-soft">{t('portal.assessmentHelp')}</p>
              <ul className="grid gap-1 sm:grid-cols-2">
                {(Object.keys(PRACTICE_LABELS) as PracticeId[]).map((pid) => {
                  const has = v.practices.find((p) => p.id === pid);
                  return (
                    <li key={pid}>
                      <label className="flex min-h-11 items-center gap-2">
                        <input
                          type="checkbox"
                          className="h-5 w-5"
                          checked={!!has}
                          onChange={(e) =>
                            save({
                              practices: e.target.checked
                                ? [...v.practices, { id: pid, selfReported: true }]
                                : v.practices.filter((p) => p.id !== pid),
                            })
                          }
                        />
                        {PRACTICE_LABELS[pid]}
                        {has?.selfReported && (
                          <span className="text-xs text-ink-soft">
                            ({t('vendor.selfReported').toLowerCase()})
                          </span>
                        )}
                      </label>
                    </li>
                  );
                })}
              </ul>
            </fieldset>
            <ScoreBreakdown cats={scoreBreakdown(v)} />
            <h2 className="font-bold">{t('portal.resources')}</h2>
            <ul className="list-inside list-disc">
              {GRANTS.map(([label, href]) => (
                <li key={href}>
                  <a href={href} target="_blank" rel="noreferrer">
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
        {tab === 'surplus' && <SurplusTab vendorId={v.id} marketIds={v.marketIds} names={names} />}
      </div>
    </div>
  );
}

function ProductsTab({
  v,
  onProduct,
  onAdd,
}: {
  v: NonNullable<ReturnType<typeof useVendors>['data']>[number];
  onProduct: (pid: string, p: { inStock?: boolean; price?: { amount: number; unit: Unit } }) => void;
  onAdd: (a: { id: string; name: string; category: string; price: number; unit: Unit }) => void;
}) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [cat, setCat] = useState('vegetables');
  const [price, setPrice] = useState('');
  const [unit, setUnit] = useState<Unit>('lb');
  const add = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !Number(price)) return;
    onAdd({
      id: `${v.id}-x${Date.now().toString(36)}`,
      name: name.trim(),
      category: cat,
      price: Number(price),
      unit,
    });
    setName('');
    setPrice('');
  };
  return (
    <div className="space-y-4">
      <ul className="divide-y divide-line">
        {v.products.map((p) => {
          const pr = v.prices[p.id];
          return (
            <li key={p.id} className="flex flex-wrap items-center gap-3 py-3">
              <span className="min-w-36 flex-1 font-bold">{p.name}</span>
              <label className="flex items-center gap-1">
                <span className="sr-only">
                  {t('vendor.price')} {p.name}
                </span>
                $
                <input
                  className="field w-24"
                  type="number"
                  min={0}
                  step={0.25}
                  inputMode="decimal"
                  defaultValue={pr?.amount}
                  onBlur={(e) =>
                    Number(e.target.value) > 0 &&
                    Number(e.target.value) !== pr?.amount &&
                    onProduct(p.id, { price: { amount: Number(e.target.value), unit: pr?.unit ?? 'each' } })
                  }
                />
                <span className="text-ink-soft">/ {pr ? t(`units.${pr.unit}`) : ''}</span>
              </label>
              <label className="toggle text-sm">
                <input
                  type="checkbox"
                  checked={p.inStock}
                  onChange={(e) => onProduct(p.id, { inStock: e.target.checked })}
                />
                {p.inStock ? t('vendor.inStock') : t('vendor.outOfStock')}
              </label>
            </li>
          );
        })}
      </ul>
      <form onSubmit={add} className="card grid gap-3 p-4 sm:grid-cols-2">
        <h2 className="font-bold sm:col-span-2">{t('portal.addProduct')}</h2>
        <label>
          <span className="label">{t('portal.productName')}</span>
          <input className="field" value={name} onChange={(e) => setName(e.target.value)} required />
        </label>
        <label>
          <span className="label">{t('portal.category')}</span>
          <select className="field" value={cat} onChange={(e) => setCat(e.target.value)}>
            {Object.keys(CATEGORY_LABELS).map((c) => (
              <option key={c} value={c}>
                {t(`categories.${c}`)}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="label">{t('vendor.price')} ($)</span>
          <input
            className="field"
            type="number"
            min={0.25}
            step={0.25}
            inputMode="decimal"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            required
          />
        </label>
        <label>
          <span className="label">{t('portal.unit')}</span>
          <select className="field" value={unit} onChange={(e) => setUnit(e.target.value as Unit)}>
            {UNITS.map((u) => (
              <option key={u} value={u}>
                {t(`units.${u}`)}
              </option>
            ))}
          </select>
        </label>
        <button className="btn-primary sm:col-span-2" type="submit">
          {t('portal.add')}
        </button>
      </form>
    </div>
  );
}

function SurplusTab({
  vendorId,
  marketIds,
  names,
}: {
  vendorId: string;
  marketIds: string[];
  names: Map<string, string>;
}) {
  const { t } = useTranslation();
  const { surplus } = useStoreState();
  const mine = surplus.filter((s) => s.vendorId === vendorId);
  const [marketId, setMarketId] = useState(marketIds[0] ?? '');
  const [item, setItem] = useState('');
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [donate, setDonate] = useState(false);
  const post = async (e: FormEvent) => {
    e.preventDefault();
    if (!item.trim() || !marketId) return;
    await store.postSurplus({
      vendorId,
      marketId,
      item: item.trim(),
      quantity: quantity.trim(),
      price: donate ? undefined : Number(price) || undefined,
      donate,
    });
    setItem('');
    setQuantity('');
    setPrice('');
  };
  return (
    <div className="space-y-4">
      <p>{t('portal.surplusHelp')}</p>
      <form onSubmit={post} className="card grid gap-3 p-4 sm:grid-cols-2">
        <label className="sm:col-span-2">
          <span className="label">{t('manager.pick')}</span>
          <select className="field" value={marketId} onChange={(e) => setMarketId(e.target.value)} required>
            {marketIds.map((id) => (
              <option key={id} value={id}>
                {names.get(id) ?? id}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="label">{t('portal.item')}</span>
          <input className="field" value={item} onChange={(e) => setItem(e.target.value)} required />
        </label>
        <label>
          <span className="label">{t('portal.quantity')}</span>
          <input
            className="field"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="10 lb"
          />
        </label>
        <label>
          <span className="label">{t('portal.salePrice')}</span>
          <input
            className="field"
            type="number"
            min={0}
            step={0.25}
            value={price}
            disabled={donate}
            onChange={(e) => setPrice(e.target.value)}
          />
        </label>
        <label className="flex items-center gap-2 self-end">
          <input
            type="checkbox"
            className="h-5 w-5"
            checked={donate}
            onChange={(e) => setDonate(e.target.checked)}
          />
          {t('portal.donate')}
        </label>
        <button className="btn-primary sm:col-span-2" type="submit">
          {t('portal.post')}
        </button>
      </form>
      {mine.length > 0 && (
        <>
          <h2 className="font-bold">{t('portal.posted')}</h2>
          <ul className="divide-y divide-line">
            {mine.map((s) => (
              <li key={s.id} className="flex items-center justify-between py-2">
                <span>
                  {s.item} {s.quantity && `· ${s.quantity}`} · {names.get(s.marketId)}
                </span>
                <button className="btn-quiet" onClick={() => store.removeSurplus(s.id)}>
                  {t('portal.remove')}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
