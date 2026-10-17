import { useTranslation } from 'react-i18next';
import { useMeta } from '../app/data';
import { REPO_URL } from '../app/config';
import { Loading } from '../components/Badges';

export default function About() {
  const { t } = useTranslation();
  const meta = useMeta();
  return (
    <div className="mx-auto max-w-5xl space-y-5 px-4 py-6">
      <h1 className="text-3xl font-extrabold">{t('about.title')}</h1>
      <p>{t('about.lede')}</p>
      <section className="card space-y-2 border-beet p-5">
        <h2 className="section-title">{t('about.sample')}</h2>
        <p>{t('about.sampleBody')}</p>
      </section>
      <h2 className="section-title">{t('about.sources')}</h2>
      {!meta.data ? (
        <Loading />
      ) : (
        <>
          <p>{t('about.built', { date: new Date(meta.data.builtAt).toLocaleString() })}</p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[40rem] text-left text-sm">
              <thead>
                <tr className="border-b-2 border-ink">
                  <th className="py-2 pr-2">{t('about.sources')}</th>
                  <th className="py-2 pr-2">{t('about.status')}</th>
                  <th className="py-2 pr-2">{t('about.records')}</th>
                  <th className="py-2">{t('about.fetched')}</th>
                </tr>
              </thead>
              <tbody>
                {meta.data.sources.map((s) => (
                  <tr key={s.id} className="border-b border-line align-top">
                    <td className="py-2 pr-2">
                      {s.url.startsWith('http') ? (
                        <a href={s.url} target="_blank" rel="noreferrer">
                          {s.name}
                        </a>
                      ) : (
                        s.name
                      )}
                      {s.note && <span className="block text-ink-soft">{s.note}</span>}
                    </td>
                    <td className="py-2 pr-2 font-bold">{s.status}</td>
                    <td className="py-2 pr-2">{s.records.toLocaleString()}</td>
                    <td className="py-2">{s.fetchedAt ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      <p>
        <a href={`${REPO_URL}/blob/main/data/SOURCES.md`}>data/SOURCES.md</a> · <a href={REPO_URL}>GitHub</a>
      </p>
    </div>
  );
}
