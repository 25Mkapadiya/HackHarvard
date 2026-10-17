import { BACKEND } from '../../app/config';
import { DemoStore } from './demo';
import { createSupabaseStore } from './supabase';
import type { Store } from './types';

export * from './types';

function create(): Store {
  if (BACKEND === 'supabase') {
    try {
      return createSupabaseStore();
    } catch (err) {
      console.warn(err);
    }
  }
  return new DemoStore();
}

export const store: Store = create();
