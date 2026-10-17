import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import type { MarketView } from '../../lib/filters';
import { marketStatus, occurrencesOn, localNow, type Status } from '../../lib/schedule/occurs';
import { hours, relativeDay } from '../../lib/format';
import { distanceKm, type LatLng } from '../../lib/geo';
import { ProgramChip, StaleNote } from '../../components/Badges';
import { StatusBadge } from '../../components/StatusBadge';
import { Icon } from '../../components/Icon';

const BENEFIT_ORDER = ['snap', 'hip', 'wic_fmnp', 'sfmnp'] as const;

export function headline(m: MarketView, status: Status, now: Date) {
  if (status.state === 'open' || status.state === 'closing_soon') {
    const occ = occurrencesOn(m.schedules, localNow(now), m.closures).find(
      (o) => o.closeTime === status.closesAt,
    );
    return occ ? { day: occ.day, occ } : null;
  }
  if (status.state === 'closed' && status.next) return { day: status.next.day, occ: status.next };
  return null;
}

/** A market as a stall sign: the day and hours are the loudest thing on the card. */
export function MarketCard({
  m,
  now,
  origin,
  compact = false,
}: {
  m: MarketView;
  now: Date;
  origin?: LatLng;
  compact?: boolean;
}) {
  const { t, i18n } = useTranslation();
  const status = marketStatus(m.schedules, m.scheduleParsed, now, m.closures);
  const h = headline(m, status, now);
  const km = origin ? distanceKm(origin, m.geo) : undefined;
  const benefitPrograms = BENEFIT_ORDER.filter((p) => m.programs.includes(p));

  return (
    <article className="card overflow-hidden shadow-sm">
      <div className="stall-sign px-4 pt-3 pb-3 text-white">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            {h ? (
              <>
                <p className="font-display text-2xl leading-tight font-extrabold capitalize sm:text-3xl">
                  {relativeDay(h.day, now, t, i18n.language)}
                </p>
                <p className="font-display text-xl font-semibold text-squash">
                  {hours(h.occ, i18n.language)}
                </p>
              </>
            ) : (
              <p className="font-display text-xl font-semibold">{t('status.unknown')}</p>
            )}
          </div>
          <StatusBadge status={status} now={now} onDark short={!!h} />
        </div>
      </div>
      <div className="h-1.5 bg-squash" aria-hidden />
      <div className="space-y-2 p-4">
        <h3 className="text-xl font-extrabold">
          <Link to={`/market/${m.id}`} className="text-ink no-underline hover:underline">
            {m.name}
          </Link>
        </h3>
        <p className="flex flex-wrap items-center gap-x-3 text-ink-soft">
          <span className="inline-flex items-center gap-1">
            <Icon name="pin" size={16} />
            {m.city}
          </span>
          {km !== undefined && <span>{t('common.miles', { n: (km * 0.621371).toFixed(1) })}</span>}
          {m.winter && <span className="chip">{t('filters.winter')}</span>}
        </p>
        {!compact && benefitPrograms.length > 0 && (
          <ul className="flex flex-wrap gap-1.5" aria-label={t('market.programs')}>
            {benefitPrograms.map((p) => (
              <li key={p}>
                <ProgramChip id={p} />
              </li>
            ))}
          </ul>
        )}
        {!compact && !m.scheduleParsed && m.scheduleRaw && (
          <p className="text-sm text-ink-soft">{m.scheduleRaw}</p>
        )}
        {!compact && m.stale && <StaleNote date={m.lastUpdated} compact />}
      </div>
    </article>
  );
}
