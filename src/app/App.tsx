import { lazy, Suspense, useEffect, useState } from 'react';
import { HashRouter, NavLink, Route, Routes, useLocation } from 'react-router';
import { useTranslation } from 'react-i18next';
import { LocationProvider, NowProvider, StoreProvider, useNow } from './context';
import { store } from '../lib/store';
import { BACKEND } from './config';
import { Loading } from '../components/Badges';
import Home from '../routes/Home';

const Explore = lazy(() => import('../routes/Explore'));
const MarketDetail = lazy(() => import('../routes/MarketDetail'));
const VendorDetail = lazy(() => import('../routes/VendorDetail'));
const Search = lazy(() => import('../routes/Search'));
const Seasonal = lazy(() => import('../routes/Seasonal'));
const Benefits = lazy(() => import('../routes/Benefits'));
const Rewards = lazy(() => import('../routes/Rewards'));
const CheckIn = lazy(() => import('../routes/CheckIn'));
const VendorPortal = lazy(() => import('../routes/VendorPortal'));
const Manager = lazy(() => import('../routes/Manager'));
const HowScores = lazy(() => import('../routes/HowScores'));
const About = lazy(() => import('../routes/About'));
const NotFound = lazy(() => import('../routes/NotFound'));

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
    document.getElementById('main')?.focus({ preventScroll: true });
  }, [pathname]);
  return null;
}

const NAV = [
  ['/', 'nav.home'],
  ['/explore', 'nav.explore'],
  ['/search', 'nav.search'],
  ['/seasonal', 'nav.seasonal'],
  ['/benefits', 'nav.benefits'],
  ['/rewards', 'nav.rewards'],
] as const;

function Header() {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const link = ({ isActive }: { isActive: boolean }) =>
    `block rounded-lg px-3 py-2 font-bold no-underline ${isActive ? 'bg-kale text-white' : 'text-ink hover:bg-kale-light'}`;
  return (
    <header className="sticky top-0 z-[1000] border-b border-line bg-paper/95 backdrop-blur">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-white focus:p-2"
      >
        {t('app.skip')}
      </a>
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2">
        <NavLink to="/" className="flex items-center gap-2 text-ink no-underline">
          <img src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" width={36} height={36} />
          <span className="leading-tight">
            <span className="block font-display text-xl font-extrabold">{t('app.name')}</span>
            <span className="block text-xs text-ink-soft">{t('app.tagline')}</span>
          </span>
        </NavLink>
        <div className="flex items-center gap-1">
          <button
            className="btn-quiet px-3"
            onClick={() => i18n.changeLanguage(t('app.languageCode'))}
            lang={t('app.languageCode')}
          >
            {t('app.language')}
          </button>
          <button
            className="btn-secondary px-3 lg:hidden"
            aria-expanded={open}
            aria-controls="site-nav"
            onClick={() => setOpen((o) => !o)}
          >
            {t('nav.menu')}
          </button>
        </div>
      </div>
      <nav
        id="site-nav"
        aria-label="Main"
        className={`${open ? 'block' : 'hidden'} border-t border-line lg:block`}
      >
        <ul className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-2 lg:flex-row lg:flex-wrap">
          {NAV.map(([to, key]) => (
            <li key={to}>
              <NavLink to={to} end={to === '/'} className={link} onClick={() => setOpen(false)}>
                {t(key)}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}

function Footer() {
  const { t, i18n } = useTranslation();
  const { simulated, now } = useNow();
  const [cleared, setCleared] = useState(false);
  return (
    <footer className="mt-12 border-t border-line bg-white">
      <div className="mx-auto max-w-6xl space-y-3 px-4 py-6 text-sm">
        {BACKEND === 'demo' && store.mode === 'demo' && (
          <p className="flex flex-wrap items-center gap-2">
            <span className="font-bold">{t('app.demo')}</span>
            <button
              className="font-bold text-beet underline"
              onClick={async () => {
                await store.clearAll();
                setCleared(true);
              }}
            >
              {t('app.clearData')}
            </button>
            {cleared && <span role="status">{t('app.cleared')}</span>}
          </p>
        )}
        {simulated && (
          <p className="font-bold text-beet">
            {t('app.simulated', {
              time: now.toLocaleString(i18n.language, { timeZone: 'America/New_York' }),
            })}
          </p>
        )}
        <ul className="flex flex-wrap gap-x-4 gap-y-1">
          <li>
            <NavLink to="/vendor">{t('nav.vendor')}</NavLink>
          </li>
          <li>
            <NavLink to="/manager">{t('nav.manager')}</NavLink>
          </li>
          <li>
            <NavLink to="/how-scores-work">{t('nav.scores')}</NavLink>
          </li>
          <li>
            <NavLink to="/about">{t('nav.about')}</NavLink>
          </li>
        </ul>
        <p className="text-ink-soft">{t('app.credits')}</p>
      </div>
    </footer>
  );
}

export default function App() {
  return (
    <HashRouter>
      <StoreProvider>
        <NowProvider>
          <LocationProvider>
            <ScrollToTop />
            <Header />
            <main id="main" tabIndex={-1} className="outline-none">
              <Suspense fallback={<Loading />}>
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/explore" element={<Explore />} />
                  <Route path="/market/:id" element={<MarketDetail />} />
                  <Route path="/vendors/:id" element={<VendorDetail />} />
                  <Route path="/search" element={<Search />} />
                  <Route path="/seasonal" element={<Seasonal />} />
                  <Route path="/benefits" element={<Benefits />} />
                  <Route path="/rewards" element={<Rewards />} />
                  <Route path="/checkin/:marketId" element={<CheckIn />} />
                  <Route path="/vendor" element={<VendorPortal />} />
                  <Route path="/manager" element={<Manager />} />
                  <Route path="/how-scores-work" element={<HowScores />} />
                  <Route path="/about" element={<About />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </main>
            <Footer />
          </LocationProvider>
        </NowProvider>
      </StoreProvider>
    </HashRouter>
  );
}
