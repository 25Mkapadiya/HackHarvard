import { useTranslation } from 'react-i18next';
import type { Status } from '../lib/schedule/occurs';
import { statusText } from '../lib/format';
import { Icon } from './Icon';

// Status is always text + icon + color, never color alone.
const STYLE: Record<Status['state'], { cls: string; icon: string }> = {
  open: { cls: 'bg-kale text-white', icon: 'open' },
  closing_soon: { cls: 'bg-squash text-ink', icon: 'clock' },
  closed: { cls: 'bg-white text-ink border border-line', icon: 'closed' },
  unknown: { cls: 'bg-beet-light text-beet', icon: 'unknown' },
};

/** `short` shows just "Closed" when the next opening is already shown nearby. */
export function StatusBadge({
  status,
  now,
  onDark = false,
  short = false,
}: {
  status: Status;
  now: Date;
  onDark?: boolean;
  short?: boolean;
}) {
  const { t, i18n } = useTranslation();
  const s = STYLE[status.state];
  const cls = onDark && status.state === 'closed' ? 'bg-kale-dark text-white border border-white/30' : s.cls;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-sm font-bold ${cls}`}>
      {status.state === 'open' ? (
        <span className="pulse-dot inline-block h-2.5 w-2.5 rounded-full bg-squash" aria-hidden />
      ) : (
        <Icon name={s.icon} size={16} />
      )}
      {short && status.state === 'closed' ? t('status.closed') : statusText(status, now, t, i18n.language)}
    </span>
  );
}
