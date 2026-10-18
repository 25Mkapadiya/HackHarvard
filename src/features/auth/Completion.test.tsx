import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { vi } from 'vitest';
import '../../i18n';
import { getSupabaseClient } from '../../lib/supabaseClient';
import { captureAuthCallback, takeAuthCallback } from './callback';
import AuthCallback from './AuthCallback';
import AuthEmail from './AuthEmail';
import ResetPassword, { PasswordForm } from './PasswordForm';
import { useAuth } from './authContext';
vi.mock('../../lib/supabaseClient', () => ({ getSupabaseClient: vi.fn() }));
vi.mock('./authContext', () => ({ useAuth: vi.fn() }));
const verify = vi.fn(),
  reset = vi.fn(),
  resend = vi.fn(),
  update = vi.fn(),
  signin = vi.fn();
beforeEach(() => {
  const api = {
    verifyOtp: verify,
    resetPasswordForEmail: reset,
    resend,
    updateUser: update,
    signInWithPassword: signin,
    getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u' } }, error: null }),
  };
  vi.mocked(getSupabaseClient).mockReturnValue({
    status: 'ready',
    client: { auth: api } as unknown as Extract<
      ReturnType<typeof getSupabaseClient>,
      { status: 'ready' }
    >['client'],
  });
  vi.mocked(useAuth).mockReturnValue({
    user: { id: 'u', email: 'test@example.test' } as NonNullable<ReturnType<typeof useAuth>['user']>,
    session: null,
    status: 'ready',
    loading: false,
    error: null,
  });
  verify.mockReset().mockResolvedValue({ data: { session: { user: { id: 'u' } } }, error: null });
  reset.mockReset().mockResolvedValue({ error: null });
  resend.mockReset().mockResolvedValue({ error: null });
  update.mockReset().mockResolvedValue({ error: null });
  signin.mockReset().mockResolvedValue({ error: null });
});
afterEach(() => {
  cleanup();
  takeAuthCallback();
});
function renderCallback(type = 'signup') {
  captureAuthCallback(
    { search: `?token_hash=private&type=${type}`, hash: '', pathname: '/HackHarvard/' },
    { replaceState: vi.fn() },
  );
  render(
    <MemoryRouter>
      <Routes>
        <Route path="/" element={<AuthCallback />} />
        <Route path="/reset-password" element={<ResetPassword />} />
      </Routes>
    </MemoryRouter>,
  );
}
it('verifies a token only after explicit confirmation, once', async () => {
  renderCallback();
  expect(verify).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Verify email link' }));
  await screen.findByText(/Email confirmed. You can now/);
  expect(verify).toHaveBeenCalledExactlyOnceWith({ token_hash: 'private', type: 'signup' });
});
it('handles expired tokens without displaying server secrets', async () => {
  verify.mockResolvedValueOnce({ data: { session: null }, error: { message: 'private backend detail' } });
  renderCallback();
  fireEvent.click(screen.getByRole('button', { name: 'Verify email link' }));
  await screen.findByRole('alert');
  expect(screen.queryByText('private backend detail')).not.toBeInTheDocument();
});
it('shows a known callback error immediately without attempting verification', () => {
  captureAuthCallback(
    { search: '?error=access_denied&error_description=private', hash: '', pathname: '/HackHarvard/' },
    { replaceState: vi.fn() },
  );
  render(
    <MemoryRouter>
      <AuthCallback />
    </MemoryRouter>,
  );
  expect(screen.getByRole('alert')).toHaveTextContent('This link is missing, expired, or already used.');
  expect(verify).not.toHaveBeenCalled();
});
it('requires a verified recovery session before showing the new-password form', async () => {
  renderCallback('recovery');
  fireEvent.click(screen.getByRole('button', { name: 'Verify email link' }));
  await screen.findByLabelText('New password');
});
it('does not expose a reset form through a direct link without recovery state', () => {
  render(
    <MemoryRouter>
      <ResetPassword />
    </MemoryRouter>,
  );
  expect(screen.queryByLabelText('New password')).not.toBeInTheDocument();
  expect(screen.getByRole('alert')).toBeInTheDocument();
});
it.each([false, true])(
  'requests recovery/resend once and uses enumeration-safe messaging',
  async (isResend) => {
    render(
      <MemoryRouter>
        <AuthEmail resend={isResend} />
      </MemoryRouter>,
    );
    fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'test@example.test' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send email' }));
    await screen.findByText(/If this address is eligible/);
    expect(isResend ? resend : reset).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button')).toBeDisabled();
  },
);
it('reauthenticates before account password changes and clears password fields', async () => {
  render(
    <MemoryRouter>
      <PasswordForm />
    </MemoryRouter>,
  );
  fireEvent.change(screen.getByLabelText('Current password'), { target: { value: 'old-test-password' } });
  fireEvent.change(screen.getByLabelText('New password'), { target: { value: 'new-test-password' } });
  fireEvent.change(screen.getByLabelText('Confirm password'), { target: { value: 'new-test-password' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save' }));
  await waitFor(() => expect(update).toHaveBeenCalledExactlyOnceWith({ password: 'new-test-password' }));
  expect(signin).toHaveBeenCalledTimes(1);
  await screen.findByText(/Password updated/);
  expect(screen.getByLabelText('New password')).toHaveValue('');
});
