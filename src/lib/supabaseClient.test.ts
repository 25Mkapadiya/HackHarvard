import { vi } from 'vitest';

const { createClient } = vi.hoisted(() => ({ createClient: vi.fn() }));
vi.mock('@supabase/supabase-js', () => ({ createClient }));

beforeEach(() => {
  vi.resetModules();
  createClient.mockReset();
  vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co');
  vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', 'sb_publishable_test');
});

afterEach(() => vi.unstubAllEnvs());

describe('getSupabaseClient', () => {
  it.each(['VITE_SUPABASE_URL', 'VITE_SUPABASE_PUBLISHABLE_KEY'])(
    'returns a typed unavailable state when %s is missing',
    async (name) => {
      vi.stubEnv(name, '  ');
      const { getSupabaseClient, SupabaseClientError } = await import('./supabaseClient');
      const result = getSupabaseClient();
      expect(result.status).toBe('unavailable');
      if (result.status !== 'unavailable') throw new Error('Expected unavailable client');
      expect(result.error).toBeInstanceOf(SupabaseClientError);
      expect(result.error.code).toBe('missing_configuration');
      expect(createClient).not.toHaveBeenCalled();
    },
  );

  it('creates one persistent client lazily without enabling redirects', async () => {
    const client = {};
    createClient.mockReturnValue(client);
    const { getSupabaseClient } = await import('./supabaseClient');
    expect(createClient).not.toHaveBeenCalled();
    const result = getSupabaseClient();
    expect(result).toEqual({ status: 'ready', client });
    expect(getSupabaseClient()).toBe(result);
    expect(createClient).toHaveBeenCalledTimes(1);
    expect(createClient).toHaveBeenCalledWith('https://example.supabase.co', 'sb_publishable_test', {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
    });
  });

  it.each([
    ['not-a-url', 'sb_publishable_test'],
    ['https://https://example.supabase.co', 'sb_publishable_test'],
    ['https://example.supabase.co.supabase.co', 'sb_publishable_test'],
    ['https://supabase.com/dashboard', 'sb_publishable_test'],
    ['https://example.supabase.co/auth/v1', 'sb_publishable_test'],
    ['https://example.supabase.co/?apikey=private', 'sb_publishable_test'],
    ['https://example.supabase.co/#private', 'sb_publishable_test'],
    ['https://user:private@example.supabase.co', 'sb_publishable_test'],
    ['ftp://example.com', 'sb_publishable_test'],
    ['https://example.supabase.co', 'sb_secret_do-not-use'],
  ])('rejects invalid public configuration without exposing values', async (url, key) => {
    vi.stubEnv('VITE_SUPABASE_URL', url);
    vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', key);
    const { getSupabaseClient } = await import('./supabaseClient');
    const result = getSupabaseClient();
    expect(result.status).toBe('unavailable');
    if (result.status !== 'unavailable') throw new Error('Expected unavailable client');
    expect(result.error.code).toBe('invalid_configuration');
    expect(result.error.message).not.toContain(url);
    expect(result.error.message).not.toContain(key);
    expect(createClient).not.toHaveBeenCalled();
  });

  it('contains SDK initialization failures', async () => {
    createClient.mockImplementation(() => {
      throw new Error('Potentially sensitive SDK details');
    });
    const { getSupabaseClient } = await import('./supabaseClient');
    const result = getSupabaseClient();
    expect(result.status).toBe('unavailable');
    if (result.status !== 'unavailable') throw new Error('Expected unavailable client');
    expect(result.error.code).toBe('initialization_failed');
    expect(result.error.message).not.toContain('sensitive');
  });

  it.each(['http://localhost:54321', 'https://auth.example.org'])(
    'supports a valid local or custom root URL',
    async (url) => {
      vi.stubEnv('VITE_SUPABASE_URL', url);
      createClient.mockReturnValue({});
      const { getSupabaseClient } = await import('./supabaseClient');
      expect(getSupabaseClient().status).toBe('ready');
    },
  );
});
