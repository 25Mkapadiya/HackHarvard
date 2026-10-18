import { cleanup, render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import '../i18n';
import App from './App';
import { getSupabaseClient, SupabaseClientError } from '../lib/supabaseClient';

vi.mock('../lib/supabaseClient', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../lib/supabaseClient')>()),
  getSupabaseClient: vi.fn(),
}));

// Stub expensive data/map screens, keeping the real app shell, provider and route table.
vi.mock('../routes/Home', () => ({ default: () => <h1>Public home</h1> }));
vi.mock('../routes/Explore', () => ({ default: () => <h1>Public explore</h1> }));
vi.mock('../routes/MarketDetail', () => ({ default: () => <h1>Public market</h1> }));
vi.mock('../routes/VendorDetail', () => ({ default: () => <h1>Public vendor detail</h1> }));
vi.mock('../routes/Search', () => ({ default: () => <h1>Public search</h1> }));
vi.mock('../routes/Seasonal', () => ({ default: () => <h1>Public seasonal</h1> }));
vi.mock('../routes/Benefits', () => ({ default: () => <h1>Public benefits</h1> }));
vi.mock('../routes/Rewards', () => ({ default: () => <h1>Public rewards</h1> }));
vi.mock('../routes/CheckIn', () => ({ default: () => <h1>Public checkin</h1> }));
vi.mock('../routes/VendorPortal', () => ({ default: () => <h1>Public vendor portal</h1> }));
vi.mock('../routes/Manager', () => ({ default: () => <h1>Public manager</h1> }));
vi.mock('../routes/HowScores', () => ({ default: () => <h1>Public scores</h1> }));
vi.mock('../routes/About', () => ({ default: () => <h1>Public about</h1> }));

beforeEach(() => {
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
  vi.mocked(getSupabaseClient).mockReturnValue({
    status: 'unavailable',
    error: new SupabaseClientError('missing_configuration', 'Missing configuration'),
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

it.each([
  ['/', 'home'],
  ['/explore', 'explore'],
  ['/market/example', 'market'],
  ['/vendors/example', 'vendor detail'],
  ['/search', 'search'],
  ['/seasonal', 'seasonal'],
  ['/benefits', 'benefits'],
  ['/rewards', 'rewards'],
  ['/checkin/example', 'checkin'],
  ['/vendor', 'vendor portal'],
  ['/manager', 'manager'],
  ['/how-scores-work', 'scores'],
  ['/about', 'about'],
])('preserves guest access to #%s when auth is unavailable', async (path, title) => {
  window.history.replaceState(null, '', `/#${path}`);
  render(<App />);
  expect(await screen.findByRole('heading', { name: `Public ${title}` })).toBeInTheDocument();
  expect(screen.queryByText(/Account access is currently unavailable/)).not.toBeInTheDocument();
});

it.each([
  ['/signup', 'Join Market Day'],
  ['/login', 'Welcome back'],
])('registers the account route #%s inside the provider', async (path, title) => {
  window.history.replaceState(null, '', `/#${path}`);
  render(<App />);
  expect(await screen.findByRole('heading', { name: title })).toBeInTheDocument();
  expect(screen.getByRole('alert')).toHaveTextContent('Account access is currently unavailable');
});
