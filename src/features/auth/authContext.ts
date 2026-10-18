import { createContext, useContext } from 'react';
import type { Session, User } from '@supabase/supabase-js';

export type AuthState = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  status: 'loading' | 'ready' | 'error' | 'unavailable';
  error: Error | null;
};

export const AuthContext = createContext<AuthState | undefined>(undefined);

export function useAuth(): AuthState {
  const state = useContext(AuthContext);
  if (!state) throw new Error('useAuth must be used within an AuthProvider.');
  return state;
}
