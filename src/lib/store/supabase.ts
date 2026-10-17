import type { Store } from './types';

// Phase 6 (optional). A Supabase-backed store using the public anon key with Row Level Security
// on every table. Not wired up: no Supabase project was provided. To enable, add migrations in
// supabase/migrations/, implement these methods with @supabase/supabase-js, and build with
// VITE_BACKEND=supabase VITE_SUPABASE_URL=... VITE_SUPABASE_ANON_KEY=...
export function createSupabaseStore(): Store {
  throw new Error(
    'VITE_BACKEND=supabase is not implemented yet. See docs/DECISIONS.md and README "Supabase mode". Falling back to demo mode.',
  );
}
