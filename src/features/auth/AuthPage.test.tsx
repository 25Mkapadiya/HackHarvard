import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import type { AuthChangeEvent, Session, SupabaseClient } from '@supabase/supabase-js';
import { vi } from 'vitest';
import i18n from '../../i18n';
import { getSupabaseClient, SupabaseClientError } from '../../lib/supabaseClient';
import { AuthProvider } from './AuthProvider';
import Signup from '../../routes/Signup';
import Login from '../../routes/Login';

vi.mock('../../lib/supabaseClient', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../lib/supabaseClient')>()),
  getSupabaseClient: vi.fn(),
}));

const session = { user: { id: 'test-user', email: 'shopper@example.test' } } as Session;
let emit: (event: AuthChangeEvent, value: Session | null) => void;
let signUp: ReturnType<typeof vi.fn>;
let signIn: ReturnType<typeof vi.fn>;
let signOut: ReturnType<typeof vi.fn>;
let getSession: ReturnType<typeof vi.fn>;

beforeEach(async () => {
  await i18n.changeLanguage('en');
  signUp = vi.fn().mockResolvedValue({ data: { user: session.user, session: null }, error: null });
  signIn = vi.fn().mockImplementation(async () => {
    emit('SIGNED_IN', session);
    return { data: { user: session.user, session }, error: null };
  });
  signOut = vi.fn().mockImplementation(async () => {
    emit('SIGNED_OUT', null);
    return { error: null };
  });
  getSession = vi.fn().mockResolvedValue({ data: { session: null }, error: null });
  const client = {
    auth: {
      signUp,
      signInWithPassword: signIn,
      signOut,
      getSession,
      onAuthStateChange: vi.fn((callback: typeof emit) => {
        emit = callback;
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      }),
    },
  } as unknown as SupabaseClient;
  vi.mocked(getSupabaseClient).mockReturnValue({ status: 'ready', client });
});

afterEach(cleanup);

async function open(path = '/signup') {
  const view = render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider>
        <Routes>
          <Route path="/signup" element={<Signup />} />
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<h1>Public home</h1>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
  await waitFor(() => expect(screen.queryByText('Checking your saved session…')).not.toBeInTheDocument());
  return view;
}

function fillSignup() {
  fireEvent.change(screen.getByLabelText('Display name'), { target: { value: ' Market Shopper ' } });
  fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'shopper@example.test' } });
  fireEvent.change(screen.getByLabelText('Password', { exact: true }), {
    target: { value: 'test-password-123' },
  });
  fireEvent.change(screen.getByLabelText('Confirm password'), { target: { value: 'test-password-123' } });
}

function fillLogin() {
  fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'shopper@example.test' } });
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'test-password-123' } });
}

describe('registration and login', () => {
  it('validates required fields and focuses the first invalid input', async () => {
    await open();
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));
    expect(screen.getByText('Enter your display name.')).toBeInTheDocument();
    expect(screen.getByText('Enter a valid email address.')).toBeInTheDocument();
    expect(screen.getByText('Enter your password.')).toBeInTheDocument();
    expect(screen.getByLabelText('Display name')).toHaveFocus();
    expect(signUp).not.toHaveBeenCalled();
  });

  it('rejects short passwords and mismatched confirmation', async () => {
    await open();
    fillSignup();
    fireEvent.change(screen.getByLabelText('Password', { exact: true }), { target: { value: 'short' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));
    expect(screen.getByText('Use at least 8 characters.')).toBeInTheDocument();
    expect(screen.getByText('Passwords must match.')).toBeInTheDocument();
    expect(signUp).not.toHaveBeenCalled();
  });

  it('submits credentials and display-name metadata, without treating a user as a session', async () => {
    await open();
    fillSignup();
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));
    await screen.findByText(/Check your email for a confirmation link/);
    expect(signUp).toHaveBeenCalledExactlyOnceWith({
      email: 'shopper@example.test',
      password: 'test-password-123',
      options: {
        emailRedirectTo: `${window.location.origin}${import.meta.env.BASE_URL}?flow=signup`,
        data: { display_name: 'Market Shopper', preferred_language: 'en' },
      },
    });
    expect(screen.queryByText(/You are signed in as/)).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Already have an account/ })).toHaveAttribute('href', '/login');
  });

  it('handles a registration that immediately returns a session', async () => {
    signUp.mockImplementationOnce(async () => {
      emit('SIGNED_IN', session);
      return { data: { user: session.user, session }, error: null };
    });
    await open();
    fillSignup();
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));
    await screen.findByText('Your account is ready and you are signed in.');
    expect(screen.queryByText(/Check your email/)).not.toBeInTheDocument();
  });

  it('prevents duplicate requests while signup is pending', async () => {
    let finish!: (result: { data: { session: null }; error: null }) => void;
    signUp.mockReturnValueOnce(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    await open();
    fillSignup();
    const button = screen.getByRole('button', { name: 'Create account' });
    fireEvent.click(button);
    expect(button).toBeDisabled();
    expect(button).toHaveTextContent('Please wait…');
    fireEvent.submit(button.closest('form')!);
    expect(signUp).toHaveBeenCalledTimes(1);
    await act(async () => finish({ data: { session: null }, error: null }));
  });

  it('reports signup errors and allows retry', async () => {
    signUp.mockResolvedValueOnce({ data: { session: null }, error: { code: 'weak_password' } });
    await open();
    fillSignup();
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));
    await screen.findByText(/Choose a stronger password/);
    expect(screen.getByRole('button', { name: 'Create account' })).toBeEnabled();
  });

  it.each([
    [{ code: 'email_address_not_authorized' }, 'Confirmation emails are not available for this address yet.'],
    [{ code: 'email_provider_disabled' }, 'Email registration is unavailable.'],
    [{ status: 401 }, 'Account access is misconfigured.'],
    [{ status: 503 }, "The account service couldn't complete your request."],
    [new TypeError('Failed to fetch'), "We couldn't reach the account service."],
  ])('displays useful registration errors without raw server details', async (error, message) => {
    signUp.mockResolvedValueOnce({ data: { session: null }, error });
    await open();
    fillSignup();
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));
    await screen.findByText(message, { exact: false });
    expect(screen.getByRole('button', { name: 'Create account' })).toBeEnabled();
    expect(signUp).toHaveBeenCalledTimes(1);
  });

  it('logs in and navigates to the public home route', async () => {
    await open('/login');
    fillLogin();
    fireEvent.click(screen.getByRole('button', { name: 'Log in' }));
    await screen.findByRole('heading', { name: 'Public home' });
    expect(signIn).toHaveBeenCalledExactlyOnceWith({
      email: 'shopper@example.test',
      password: 'test-password-123',
    });
  });

  it.each([
    ['invalid_credentials', 'The email or password is incorrect.'],
    ['email_not_confirmed', 'Please confirm your email before logging in.'],
  ])('keeps the login form available after %s', async (code, message) => {
    signIn.mockResolvedValueOnce({ data: { session: null }, error: { code } });
    await open('/login');
    fillLogin();
    fireEvent.click(screen.getByRole('button', { name: 'Log in' }));
    await screen.findByText(message, { exact: false });
    expect(screen.getByRole('button', { name: 'Log in' })).toBeEnabled();
    expect(screen.queryByRole('heading', { name: 'Public home' })).not.toBeInTheDocument();
  });

  it('handles network failures without displaying raw error details', async () => {
    signIn.mockRejectedValueOnce(new Error('Internal network details'));
    await open('/login');
    fillLogin();
    fireEvent.click(screen.getByRole('button', { name: 'Log in' }));
    await screen.findByText(/We couldn't log you in/);
    expect(screen.queryByText('Internal network details')).not.toBeInTheDocument();
  });

  it('restores a session after remount and logs out from the login route', async () => {
    getSession.mockResolvedValue({ data: { session }, error: null });
    const view = await open('/login');
    expect(screen.getByText(/You are signed in as shopper@example.test/)).toBeInTheDocument();
    view.unmount();
    await open('/login');
    fireEvent.click(screen.getByRole('button', { name: 'Log out' }));
    await screen.findByText('You have logged out of this browser.');
    expect(signOut).toHaveBeenCalledExactlyOnceWith({ scope: 'local' });
    expect(screen.getByRole('button', { name: 'Log in' })).toBeEnabled();
  });

  it('keeps the session visible when logout fails', async () => {
    getSession.mockResolvedValueOnce({ data: { session }, error: null });
    signOut.mockResolvedValueOnce({ error: new Error('Network error') });
    await open('/login');
    fireEvent.click(screen.getByRole('button', { name: 'Log out' }));
    await screen.findByText(/We couldn't log you out/);
    expect(screen.getByRole('button', { name: 'Log out' })).toBeEnabled();
  });

  it.each(['/signup', '/login'])(
    'disables account submission at %s with missing configuration',
    async (path) => {
      vi.mocked(getSupabaseClient).mockReturnValue({
        status: 'unavailable',
        error: new SupabaseClientError('missing_configuration', 'Missing configuration'),
      });
      await open(path);
      expect(screen.getByRole('alert')).toHaveTextContent('Account access is currently unavailable');
      expect(screen.getByRole('button')).toBeDisabled();
      expect(screen.getByRole('link', { name: 'Back to Market Day' })).toHaveAttribute('href', '/');
      expect(signUp).not.toHaveBeenCalled();
      expect(signIn).not.toHaveBeenCalled();
    },
  );

  it('renders and validates the form in Spanish', async () => {
    await i18n.changeLanguage('es');
    await open();
    expect(screen.getByRole('heading', { name: 'Únete a Market Day' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }));
    expect(screen.getByText('Escribe tu nombre para mostrar.')).toBeInTheDocument();
    expect(screen.getByLabelText('Correo electrónico')).toHaveAttribute('type', 'email');
  });
});
