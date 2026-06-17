'use client';

import { useState, useEffect, useCallback } from 'react';
import type { DashboardApiResponse } from '@/lib/types';
import { getCurrentMonthYYYYMM } from '@/lib/utils';

const clientCache = new Map<string, DashboardApiResponse>();
const clientInflight = new Map<string, Promise<void>>();

export function useDashboard(from?: string, to?: string) {
  const defaultMonth = getCurrentMonthYYYYMM();
  const f = from || defaultMonth;
  const t = to || f;
  const cacheKey = `${f}__${t}`;

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
    const url = `/api/data?from=${f}&to=${t}${refresh ? '&refresh=1' : ''}`;
    const p: Promise<void> = fetch(url)
      .then(r => r.json())
      .then((d: DashboardApiResponse & { error?: string }) => {
        if (d.error) throw new Error(d.error);
        clientCache.set(cacheKey, d);
        setData(d);
      })
      .catch(e => setError(e.message || 'เกิดข้อผิดพลาด'))
      .finally(() => { clientInflight.delete(cacheKey); setLoading(false); });
    clientInflight.set(cacheKey, p);
  }, [cacheKey, f, t]);

  useEffect(() => { load(); }, [load]);

  const refresh = useCallback(() => {
    clientCache.delete(cacheKey);
    load(true);
  }, [cacheKey, load]);

  return { data, loading, error, refresh };
}
