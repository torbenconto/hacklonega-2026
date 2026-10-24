import { useEffect, useState } from 'react';
import { api, type Species } from '@/lib/api';

export function useCatalog() {
  const [species, setSpecies] = useState<Species[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    api<{ species: Species[] }>('/species', { signal: controller.signal })
      .then(result => { if (!controller.signal.aborted) setSpecies(result.species); })
      .catch((e: Error) => { if (!controller.signal.aborted) setError(e.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [revision]);
  return { species, loading, error, refresh: () => { setLoading(true); setError(''); setRevision(value => value + 1); } };
}
