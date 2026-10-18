import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export class SupabaseClientError extends Error {
  readonly code: 'missing_configuration' | 'invalid_configuration' | 'initialization_failed';

  constructor(code: SupabaseClientError['code'], message: string) {
    super(message);
    this.name = 'SupabaseClientError';
    this.code = code;
  }
}

export type SupabaseClientState =
  { status: 'ready'; client: SupabaseClient } | { status: 'unavailable'; error: SupabaseClientError };

let cached: SupabaseClientState | undefined;

// Lazy so importing this module does not start auth in the existing demo application.
export function getSupabaseClient(): SupabaseClientState {
  if (cached) return cached;

  const url = import.meta.env.VITE_SUPABASE_URL?.trim();
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();
  if (!url || !key) {
    cached = {
      status: 'unavailable',
      error: new SupabaseClientError(
        'missing_configuration',
        'Account authentication requires VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.',
      ),
    };
    return cached;
  }

  try {
    const parsed = new URL(url);
    const local = ['localhost', '127.0.0.1', '[::1]'].includes(parsed.hostname);
    if (
      !['https:', 'http:'].includes(parsed.protocol) ||
      (!local && !parsed.hostname.includes('.')) ||
      parsed.hostname === 'supabase.com' ||
      /(?:\.supabase\.co){2,}$/.test(parsed.hostname) ||
      parsed.pathname !== '/' ||
      parsed.search ||
      parsed.hash ||
      parsed.username ||
      parsed.password ||
      !key.startsWith('sb_publishable_')
    ) {
      throw new Error('Invalid public configuration');
    }
  } catch {
    cached = {
      status: 'unavailable',
      error: new SupabaseClientError(
        'invalid_configuration',
        'Account authentication requires the project root URL (one https:// prefix, no dashboard or API path) and an sb_publishable_ public key.',
      ),
    };
    return cached;
  }

  try {
    cached = {
      status: 'ready',
      client: createClient(url, key, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          // Callback handling is reserved for a later milestone; preserve HashRouter URLs.
          detectSessionInUrl: false,
        },
      }),
    };
  } catch {
    // Do not forward SDK initialization errors that could contain configuration values.
    cached = {
      status: 'unavailable',
      error: new SupabaseClientError('initialization_failed', 'Account authentication could not initialize.'),
    };
  }
  return cached;
}
