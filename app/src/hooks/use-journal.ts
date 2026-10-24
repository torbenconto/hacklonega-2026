import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { api, type FishLog } from '@/lib/api';
import { useSession } from '@/lib/session';

export function useJournal() {
  const { username } = useSession();
  const [data, setData] = useState<{ username: string; logs: FishLog[] } | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const request = useRef<AbortController | null>(null);
  const load = useCallback(() => {
    const controller = new AbortController();
    request.current?.abort(); request.current = controller;
    setLoading(true); setError('');
    if (!username) { setLoading(false); return; }
    api<FishLog[]>('/catches', { signal: controller.signal }, username)
      .then(logs => { if (!controller.signal.aborted) setData({ username, logs }); })
      .catch((e: Error) => { if (!controller.signal.aborted) { setData(null); setError(e.message); } })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => request.current?.abort();
  }, [username]);
  useFocusEffect(load);
  return { logs: data?.username === username ? data.logs : null, loading, error, refresh: () => { load(); } };
}
