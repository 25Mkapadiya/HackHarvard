import { StrictMode } from 'react';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import type { AuthChangeEvent, Session, SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseClient, SupabaseClientError } from '../../lib/supabaseClient';
import { AuthProvider } from './AuthProvider';
import { useAuth } from './authContext';

vi.mock('../../lib/supabaseClient', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../lib/supabaseClient')>()),
  getSupabaseClient: vi.fn(),
}));

type SessionResult = { data: { session: Session | null }; error: Error | null };
let finishRestore: (result: SessionResult) => void;
let emit: (event: AuthChangeEvent, session: Session | null) => void;
let getSession: ReturnType<typeof vi.fn>;
let unsubscribers: ReturnType<typeof vi.fn>[];
let listeners: number;

// Only fields consumed by the provider are needed; no tokens or network requests.
const session = { user: { id: 'user-1' } } as Session;

function Probe() {
  const auth = useAuth();
  return (
    <>
      <span data-testid="status">{auth.status}</span>
      <span data-testid="loading">{String(auth.loading)}</span>
      <span data-testid="user">{auth.user?.id ?? 'guest'}</span>
      <span data-testid="session">{auth.session ? 'present' : 'absent'}</span>
      <span data-testid="error">{auth.error?.message}</span>
    </>
  );
}

beforeEach(() => {
  listeners = 0;
  unsubscribers = [];
  getSession = vi.fn(
    () =>
      new Promise<SessionResult>((resolve) => {
        finishRestore = resolve;
      }),
  );
  const client = {
    auth: {
      getSession,
      onAuthStateChange: vi.fn((callback: typeof emit) => {
        emit = callback;
        listeners++;
        const unsubscribe = vi.fn(() => {
          listeners--;
        });
        unsubscribers.push(unsubscribe);
        return { data: { subscription: { unsubscribe } } };
      }),
    },
  } as unknown as SupabaseClient;
  vi.mocked(getSupabaseClient).mockReturnValue({ status: 'ready', client });
});

afterEach(cleanup);

describe('AuthProvider', () => {
  it('exposes missing configuration without attempting session restoration', () => {
    vi.mocked(getSupabaseClient).mockReturnValue({
      status: 'unavailable',
      error: new SupabaseClientError('missing_configuration', 'Missing public Supabase configuration.'),
    });
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );
    expect(screen.getByTestId('status')).toHaveTextContent('unavailable');
    expect(screen.getByTestId('loading')).toHaveTextContent('false');
    expect(screen.getByTestId('error')).toHaveTextContent('Missing public Supabase configuration.');
    expect(getSession).not.toHaveBeenCalled();
    expect(listeners).toBe(0);
  });

  it.each([session, null])('restores an initial session or guest state', async (initial) => {
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );
    expect(screen.getByTestId('status')).toHaveTextContent('loading');
    expect(screen.getByTestId('loading')).toHaveTextContent('true');
    await act(async () => finishRestore({ data: { session: initial }, error: null }));
    expect(screen.getByTestId('status')).toHaveTextContent('ready');
    expect(screen.getByTestId('loading')).toHaveTextContent('false');
    expect(screen.getByTestId('user')).toHaveTextContent(initial ? 'user-1' : 'guest');
    expect(screen.getByTestId('session')).toHaveTextContent(initial ? 'present' : 'absent');
  });

  it('tracks sign-in, token refresh, user updates and sign-out', async () => {
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );
    await act(async () => finishRestore({ data: { session: null }, error: null }));
    for (const event of ['SIGNED_IN', 'TOKEN_REFRESHED', 'USER_UPDATED'] as const) {
      act(() => emit(event, session));
      expect(screen.getByTestId('user')).toHaveTextContent('user-1');
      expect(screen.getByTestId('session')).toHaveTextContent('present');
    }
    act(() => emit('SIGNED_OUT', null));
    expect(screen.getByTestId('user')).toHaveTextContent('guest');
    expect(screen.getByTestId('session')).toHaveTextContent('absent');
  });

  it('does not overwrite a newer sign-out with a stale restoration result', async () => {
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );
    act(() => emit('SIGNED_OUT', null));
    await act(async () => finishRestore({ data: { session }, error: null }));
    expect(screen.getByTestId('user')).toHaveTextContent('guest');
  });

  it('surfaces restoration errors and recovers on a later auth event', async () => {
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );
    await act(async () => finishRestore({ data: { session: null }, error: new Error('Session expired') }));
    expect(screen.getByTestId('status')).toHaveTextContent('error');
    expect(screen.getByTestId('error')).toHaveTextContent('Session expired');
    expect(screen.getByTestId('loading')).toHaveTextContent('false');
    act(() => emit('SIGNED_IN', session));
    expect(screen.getByTestId('status')).toHaveTextContent('ready');
    expect(screen.getByTestId('error')).toBeEmptyDOMElement();
  });

  it('handles a rejected session request', async () => {
    getSession.mockRejectedValueOnce(new Error('Network unavailable'));
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('error'));
    expect(screen.getByTestId('error')).toHaveTextContent('Network unavailable');
  });

  it('unsubscribes on unmount and ignores late callbacks and restoration', async () => {
    const { unmount } = render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );
    unmount();
    expect(unsubscribers[0]).toHaveBeenCalledTimes(1);
    expect(listeners).toBe(0);
    await act(async () => {
      emit('SIGNED_IN', session);
      finishRestore({ data: { session }, error: null });
    });
  });

  it('keeps only one live subscription during StrictMode and rerenders', () => {
    const { rerender, unmount } = render(
      <StrictMode>
        <AuthProvider>
          <Probe />
        </AuthProvider>
      </StrictMode>,
    );
    expect(listeners).toBe(1);
    rerender(
      <StrictMode>
        <AuthProvider>
          <Probe />
        </AuthProvider>
      </StrictMode>,
    );
    expect(listeners).toBe(1);
    expect(unsubscribers).toHaveLength(2);
    unmount();
    expect(listeners).toBe(0);
    unsubscribers.forEach((unsubscribe) => expect(unsubscribe).toHaveBeenCalledTimes(1));
  });

  it('rejects useAuth outside its provider', () => {
    expect(() => render(<Probe />)).toThrow('useAuth must be used within an AuthProvider.');
  });
});
