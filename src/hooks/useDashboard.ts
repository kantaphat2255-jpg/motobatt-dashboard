'use client';

import { useState, useEffect, useCallback } from 'react';
import type { DashboardApiResponse } from '@/lib/types';

const clientCache = new Map<string, DashboardApiResponse>();
const clientInflight = new Map<string, Promise<void>>();

export function useDashboard(
  from?: string,
  to?: string,
  compareFrom?: string | null,
  compareTo?: string | null,
) {
  const hasCompare = !!(compareFrom && compareTo);
  const cacheKey = `${from ?? ''}__${to ?? ''}__${hasCompare ? `${compareFrom}_${compareTo}` : ''}`;

  const buildUrl = (refresh: boolean) => {
    const p = new URLSearchParams();
    if (from) p.set('from', from);
    if (to) p.set('to', to);
    if (hasCompare) { p.set('cfrom', compareFrom!); p.set('cto', compareTo!); }
    if (refresh) p.set('refresh', '1');
    const qs = p.toString();
    return `/api/data${qs ? `?${qs}` : ''}`;
  };

  const [data, setData] = useState<DashboardApiResponse | null>(() => clientCache.get(cacheKey) ?? null);
  const [loading, setLoading] = useState(!clientCache.has(cacheKey));
  const [error, setError] = useState<string | null>(null);

  const load = useCallback((refresh = false) => {
    if (!refresh && clientCache.has(cacheKey)) {
      setData(clientCache.get(cacheKey)!);
      setLoading(false);
      return;
    }
    if (!refresh && clientInflight.has(cacheKey)) return;
    setLoading(true);
    setError(null);
    const p: Promise<void> = fetch(buildUrl(refresh))
      .then(r => r.json())
      .then((d: DashboardApiResponse & { error?: string }) => {
        if (d.error) throw new Error(d.error);
        clientCache.set(cacheKey, d);
        setData(d);
      })
      .catch(e => setError(e.message || 'เกิดข้อผิดพลาด'))
      .finally(() => { clientInflight.delete(cacheKey); setLoading(false); });
    clientInflight.set(cacheKey, p);
  }, [cacheKey]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);

  const refresh = useCallback(() => {
    clientCache.delete(cacheKey);
    load(true);
  }, [cacheKey, load]);

  return { data, loading, error, refresh };
}
