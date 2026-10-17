import { useTranslation } from 'react-i18next';
import type { ProgramId } from '../types';
import { Icon } from './Icon';

export function SampleBadge({ long = false }: { long?: boolean }) {
  const { t } = useTranslation();
  return (
    <span
      className="inline-flex items-center gap-1 rounded border border-dashed border-beet bg-beet-light px-1.5 py-0.5 text-xs font-bold text-beet"
      title={t('vendor.sampleLong')}
    >
      <Icon name="info" size={12} />
      {long ? t('vendor.sampleLong') : t('common.sample')}
    </span>
  );
}

const PROGRAM_STYLE: Partial<Record<ProgramId, string>> = {
  snap: 'bg-sky text-ink border-sky',
  hip: 'bg-squash-light text-ink border-squash',
};

export function ProgramChip({ id }: { id: ProgramId }) {
  const { t } = useTranslation();
  return <span className={`chip ${PROGRAM_STYLE[id] ?? ''}`}>{t(`programs.${id}`)}</span>;
}

export function StaleNote({ date, compact = false }: { date: string; compact?: boolean }) {
  const { t } = useTranslation();
  if (compact)
    return (
      <span className="inline-flex items-center gap-1 text-sm text-ink-soft">
        <Icon name="warn" size={14} />
        {t('market.lastUpdated', { date })}
      </span>
    );
  return (
    <p className="flex items-start gap-2 rounded-lg bg-squash-light p-3 text-sm">
      <Icon name="warn" size={18} className="mt-0.5" />
      <span>
        {t('market.stale')} {t('market.lastUpdated', { date })}.
      </span>
    </p>
  );
}

export function Loading() {
  const { t } = useTranslation();
  return (
    <p className="p-6 text-ink-soft" role="status">
      {t('common.loading')}
    </p>
  );
}

export function ErrorState({ retry, message }: { retry?: () => void; message?: string }) {
  const { t } = useTranslation();
  return (
    <div className="m-4 rounded-lg border border-beet bg-beet-light p-4" role="alert">
      <p className="font-bold text-beet">{message ?? t('common.error')}</p>
      {retry && (
        <button className="btn-secondary mt-2" onClick={retry}>
          {t('common.retry')}
        </button>
      )}
    </div>
  );
}
