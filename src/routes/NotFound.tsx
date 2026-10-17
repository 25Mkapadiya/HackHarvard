import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';

export default function NotFound() {
  const { t } = useTranslation();
  return (
    <div className="mx-auto max-w-xl space-y-3 px-4 py-12">
      <h1 className="text-3xl font-extrabold">404</h1>
      <p>
        <Link to="/">{t('nav.home')}</Link> · <Link to="/explore">{t('nav.explore')}</Link>
      </p>
    </div>
  );
}
