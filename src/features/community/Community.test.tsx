import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { vi } from 'vitest';
import '../../i18n';
import { useAuth } from '../auth/authContext';
import { affiliations, client, command, workspace, type Identity, type Post } from './api';
import { Composer, PostCard, FeedStream } from './Feed';
import Account from './Account';
import { RequireUser } from './Common';
import { LocationProvider } from '../../app/context';

vi.mock('../auth/authContext', () => ({ useAuth: vi.fn() }));
vi.mock('./api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./api')>()),
  client: vi.fn(),
  command: vi.fn(),
  affiliations: vi.fn(),
  workspace: vi.fn(),
  imageUrl: () => undefined,
}));
const customer = {
  id: 'customer',
  kind: 'customer',
  display_name: 'Local Shopper',
  description: '',
  location: '',
  details: '',
  image_path: null,
  source_market_id: null,
  created_at: '2026-01-01',
} as Identity;
const vendor = { ...customer, id: 'vendor', kind: 'vendor', display_name: 'Test Farm' } as Identity;
const market = { ...customer, id: 'market', kind: 'market', display_name: 'Test Market' } as Identity;
const post = {
  id: 'post',
  author_id: 'vendor',
  author: vendor,
  body: '<script>alert("unsafe")</script>',
  category: 'offer',
  market_id: 'market',
  market,
  expires_at: '2020-01-01T00:00:00Z',
  image_path: null,
  created_at: '2026-01-01',
  like_count: 2,
  comment_count: 0,
  liked: false,
  saved: false,
  following: false,
  verified: true,
  expired: true,
} as Post;
const rpc = vi.fn();
const select = vi.fn();
beforeEach(() => {
  vi.mocked(useAuth).mockReturnValue({
    user: { id: 'u', email: 'test@example.test', email_confirmed_at: '2026-01-01' } as NonNullable<
      ReturnType<typeof useAuth>['user']
    >,
    session: null,
    status: 'ready',
    loading: false,
    error: null,
  });
  vi.mocked(command).mockReset().mockResolvedValue({ id: 'created' });
  vi.mocked(affiliations).mockResolvedValue([
    { id: 'a', vendor_id: 'vendor', market_id: 'market', status: 'approved', market },
  ]);
  vi.mocked(workspace).mockResolvedValue({
    profile: { id: 'u', display_name: 'Shopper', preferred_language: 'en' },
    identities: [customer, vendor],
    claims: [],
    admin: false,
  });
  rpc.mockReset().mockResolvedValue({ data: [post], error: null });
  const query = {
    select,
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue({ data: [], error: null }),
  };
  select.mockReturnValue(query);
  vi.mocked(client).mockReturnValue({ rpc, from: () => query } as unknown as ReturnType<typeof client>);
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
function open(node: React.ReactNode) {
  return render(
    <MemoryRouter>
      <LocationProvider>{node}</LocationProvider>
    </MemoryRouter>,
  );
}
it('shows explicit expired-offer and market-specific participation labels and safely renders text', () => {
  open(<PostCard post={post} identities={[]} />);
  expect(screen.getByText('Expired offer')).toBeInTheDocument();
  expect(screen.getByText('Verified at Test Market')).toBeInTheDocument();
  expect(screen.getByText('<script>alert("unsafe")</script>')).toBeInTheDocument();
  expect(document.querySelector('article script')).toBeNull();
});
it.each([
  ['Like (2)', 'like'],
  ['Save post', 'save'],
  ['Follow', 'follow'],
])('implements %s through the checked API', async (label, action) => {
  open(<PostCard post={post} identities={[]} />);
  fireEvent.click(screen.getByRole('button', { name: label }));
  await waitFor(() =>
    expect(command).toHaveBeenCalledWith(action, {
      id: action === 'follow' ? 'vendor' : 'post',
      enabled: true,
    }),
  );
});
it('does not show edit/delete controls for another identity', () => {
  open(<PostCard post={post} identities={[customer]} />);
  expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument();
});
it('publishes with a selected authorized identity and approved market only', async () => {
  open(<Composer identities={[vendor]} />);
  await screen.findByRole('option', { name: 'Test Market' });
  fireEvent.change(screen.getByLabelText('What would you like to share?'), {
    target: { value: 'Fresh carrots today' },
  });
  fireEvent.change(screen.getByLabelText('Market association (approved affiliations only)'), {
    target: { value: 'market' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Publish' }));
  await waitFor(() =>
    expect(command).toHaveBeenCalledWith(
      'post_save',
      expect.objectContaining({ author_id: 'vendor', market_id: 'market', body: 'Fresh carrots today' }),
    ),
  );
});
it('submits private reports without inventing automated review', async () => {
  open(<PostCard post={post} identities={[]} />);
  fireEvent.click(screen.getByRole('button', { name: 'Report' }));
  fireEvent.change(screen.getByLabelText(/Reason \(5/), { target: { value: 'Test report reason' } });
  fireEvent.click(screen.getByRole('button', { name: 'Submit request' }));
  await screen.findByText(/No automatic moderation is promised/);
  expect(command).toHaveBeenCalledWith('report', {
    id: 'post',
    target_kind: 'post',
    reason: 'Test report reason',
  });
});
it('creates a personal comment and preserves the public author boundary', async () => {
  open(<PostCard post={post} identities={[customer]} />);
  fireEvent.click(screen.getByRole('button', { name: 'Comments (0)' }));
  fireEvent.change(await screen.findByLabelText('Write a comment (up to 1,000 characters)'), {
    target: { value: 'Test comment' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Publish' }));
  await waitFor(() =>
    expect(command).toHaveBeenCalledWith(
      'comment_save',
      expect.objectContaining({ post_id: 'post', body: 'Test comment' }),
    ),
  );
});
it('updates account name/language using the secure profile command', async () => {
  open(<Account />);
  fireEvent.change(await screen.findByLabelText('Display name'), { target: { value: 'New Shopper' } });
  fireEvent.click(screen.getAllByRole('button', { name: 'Save' })[0]);
  await waitFor(() =>
    expect(command).toHaveBeenCalledWith('profile_save', {
      display_name: 'New Shopper',
      preferred_language: 'en',
    }),
  );
});
it('guards account content for guests and shows useful service failures', async () => {
  vi.mocked(useAuth).mockReturnValue({
    user: null,
    session: null,
    status: 'ready',
    loading: false,
    error: null,
  });
  open(
    <RequireUser>
      <span>Private account</span>
    </RequireUser>,
  );
  expect(screen.queryByText('Private account')).not.toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Log in' })).toBeInTheDocument();
});
it('handles missing community infrastructure without fake data or broken public navigation', async () => {
  rpc.mockResolvedValueOnce({ data: null, error: { code: 'PGRST202' } });
  open(<FeedStream showComposer={false} />);
  await screen.findByText(/community service is unavailable/);
  expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
});
