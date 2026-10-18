import { useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { getSupabaseClient } from '../../lib/supabaseClient';
import { AuthContext, type AuthState } from './authContext';

const restored = (session: Session | null): AuthState => ({
  session,
  user: session?.user ?? null,
  loading: false,
  status: 'ready',
  error: null,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [clientState] = useState(getSupabaseClient);
  const [state, setState] = useState<AuthState>(() => ({
    session: null,
    user: null,
    loading: clientState.status === 'ready',
    status: clientState.status === 'ready' ? 'loading' : 'unavailable',
    error: clientState.status === 'unavailable' ? clientState.error : null,
  }));

  useEffect(() => {
    if (clientState.status !== 'ready') return;
    const { client } = clientState;
    let active = true;
    let changed = false;

    // Subscribe before reading storage so a concurrent sign-out cannot be lost.
    const { data } = client.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      changed = true;
      setState(restored(session));
    });

    async function restore() {
      try {
        const { data, error } = await client.auth.getSession();
        if (!active || changed) return;
        if (error) throw error;
        setState(restored(data.session));
      } catch (error) {
        if (!active || changed) return;
        setState({
          session: null,
          user: null,
          loading: false,
          status: 'error',
          error: error instanceof Error ? error : new Error('Unable to restore the authentication session.'),
        });
      }
    }
    void restore();

    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, [clientState]);

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}
