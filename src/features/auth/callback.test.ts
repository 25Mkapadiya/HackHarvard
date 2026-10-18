import { vi } from 'vitest';
import { captureAuthCallback, takeAuthCallback, hasAuthCallback } from './callback';
afterEach(() => takeAuthCallback());
describe('callback capture before HashRouter', () => {
  it('leaves public hash routes alone', () => {
    const replaceState = vi.fn();
    expect(
      captureAuthCallback(
        { search: '', hash: '#/market/test?now=2026-07-11', pathname: '/HackHarvard/' },
        { replaceState },
      ),
    ).toBe(false);
    expect(replaceState).not.toHaveBeenCalled();
  });
  it.each(['signup', 'recovery', 'email'] as const)(
    'captures cross-device token hashes for %s and scrubs history',
    (type) => {
      const replaceState = vi.fn();
      captureAuthCallback(
        { search: `?token_hash=private-token&type=${type}`, hash: '', pathname: '/HackHarvard/' },
        { replaceState },
      );
      expect(replaceState).toHaveBeenCalledExactlyOnceWith(null, '', '/HackHarvard/#/auth/callback');
      expect(takeAuthCallback()).toEqual({ kind: 'token', token: 'private-token', type });
      expect(hasAuthCallback()).toBe(false);
    },
  );
  it('supports existing implicit email callbacks without putting tokens in router paths', () => {
    const replaceState = vi.fn();
    captureAuthCallback(
      {
        search: '',
        hash: '#access_token=private-access&refresh_token=private-refresh&type=recovery',
        pathname: '/HackHarvard/',
      },
      { replaceState },
    );
    expect(takeAuthCallback()).toEqual({
      kind: 'implicit',
      access: 'private-access',
      refresh: 'private-refresh',
      type: 'recovery',
    });
    expect(JSON.stringify(replaceState.mock.calls)).not.toContain('private-');
  });
  it('captures a PKCE code once, including the recovery flow marker', () => {
    captureAuthCallback(
      { search: '?code=private-code&flow=recovery', hash: '', pathname: '/HackHarvard/' },
      { replaceState: vi.fn() },
    );
    expect(takeAuthCallback()).toEqual({ kind: 'code', code: 'private-code', type: 'recovery' });
    expect(takeAuthCallback()).toBeNull();
  });
  it.each([
    '?token_hash=private&type=admin',
    '?error=access_denied&error_description=private',
    '?error_code=otp_expired',
    '?access_token=missing-refresh',
  ])('fails closed for malformed or expired callbacks', (search) => {
    const replaceState = vi.fn();
    captureAuthCallback({ search, hash: '', pathname: '/HackHarvard/' }, { replaceState });
    expect(takeAuthCallback()).toEqual({ kind: 'invalid' });
    expect(JSON.stringify(replaceState.mock.calls)).not.toContain('private');
  });
});
