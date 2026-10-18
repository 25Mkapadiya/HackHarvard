import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getSupabaseClient } from '../../lib/supabaseClient';
import { useAuth } from '../auth/authContext';

export function useRemote<T>(load: () => Promise<T>) {
  const scope = useAuth().user?.id ?? '';
  const [data, setData] = useState<{ scope: string; value: T } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [version, setVersion] = useState(0);
  const reload = useCallback(() => setVersion((n) => n + 1), []);
  useEffect(() => {
    let active = true;
    Promise.resolve()
      .then(() => {
        if (active) setLoading(true);
        return load();
      })
      .then(
        (value) => {
          if (active) {
            setData({ scope, value });
            setError(null);
          }
        },
        (failure) => {
          if (active) setError(failure);
        },
      )
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [load, version, scope]);
  useEffect(() => {
    window.addEventListener('community:changed', reload);
    return () => window.removeEventListener('community:changed', reload);
  }, [reload]);
  return { data: data?.scope === scope ? data.value : null, loading, error, reload };
}
export function useTask() {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [failed, setFailed] = useState(false);
  const lock = useRef(false);
  async function run(action: () => Promise<unknown>, success = 'community.saved') {
    if (lock.current) return false;
    lock.current = true;
    setBusy(true);
    setMessage('');
    setFailed(false);
    try {
      await action();
      setMessage(success ? t(success) : '');
      return true;
    } catch (error) {
      let key = 'community.error';
      if (error && typeof error === 'object' && 'code' in error) {
        if (error.code === '42501') key = 'community.permission';
        if (error.code === '23505') key = 'community.duplicate';
        if (['42P01', 'PGRST202', 'PGRST205'].includes(String(error.code))) key = 'community.unavailable';
      }
      if (error instanceof Error && error.message === 'invalid_image') key = 'community.imageInvalid';
      if (error && typeof error === 'object' && 'message' in error && error.message === 'rate_limited')
        key = 'auth.rateLimited';
      setFailed(true);
      setMessage(t(key));
      return false;
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return { busy, message, failed, run };
}
// One application-level subscription refreshes visible cards after revocation/deletion.
export function useCommunityRealtime() {
  useEffect(() => {
    const state = getSupabaseClient();
    if (state.status !== 'ready') return;
    const notify = () => window.dispatchEvent(new Event('community:changed'));
    const channel = state.client.channel('community-public-updates');
    for (const table of ['community_posts', 'community_comments', 'community_public_updates'])
      channel.on('postgres_changes', { event: '*', schema: 'public', table }, notify);
    channel.subscribe();
    return () => {
      void state.client.removeChannel(channel);
    };
  }, []);
}
