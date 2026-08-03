'use client';

import { useState, useEffect, useCallback } from 'react';
import type { MonthCompareApiResponse, DealerRfmApiResponse, PurchaseCycleApiResponse, DealerSalesApiResponse, ZoneSalesApiResponse } from '@/lib/types';

const compareCache = new Map<string, MonthCompareApiResponse>();
const compareInflight = new Map<string, Promise<void>>();
let rfmCache: DealerRfmApiResponse | null = null;
let rfmInflight = false;
let cycleCache: PurchaseCycleApiResponse | null = null;
let cycleInflight = false;
const dealerSalesCache = new Map<string, DealerSalesApiResponse>();
const dealerSalesInflight = new Map<string, Promise<void>>();
const zoneSalesCache = new Map<string, ZoneSalesApiResponse>();
const zoneSalesInflight = new Map<string, Promise<void>>();

export function useMonthCompare(base: string, compare: string) {
  const cacheKey = `${base}__${compare}`;
  const [data, setData] = useState<MonthCompareApiResponse | null>(() => compareCache.get(cacheKey) ?? null);
  const [loading, setLoading] = useState(!compareCache.has(cacheKey));
  const [error, setError] = useState<string | null>(null);

  const load = useCallback((refresh = false) => {
    if (!refresh && compareCache.has(cacheKey)) {
      setData(compareCache.get(cacheKey)!);
      setLoading(false);
      return;
    }
    if (!refresh && compareInflight.has(cacheKey)) return;
    setLoading(true);
    setError(null);
    const p: Promise<void> = fetch(`/api/analytics/month-compare?base=${base}&compare=${compare}${refresh ? '&refresh=1' : ''}`)
      .then(r => r.json())
      .then((d: MonthCompareApiResponse & { error?: string }) => {
        if (d.error) throw new Error(d.error);
        compareCache.set(cacheKey, d);
        setData(d);
      })
      .catch(e => setError(e.message || 'เกิดข้อผิดพลาด'))
      .finally(() => { compareInflight.delete(cacheKey); setLoading(false); });
    compareInflight.set(cacheKey, p);
  }, [base, compare, cacheKey]);

  useEffect(() => { load(); }, [load]);

  const refresh = useCallback(() => {
    compareCache.delete(cacheKey);
    load(true);
  }, [cacheKey, load]);

  return { data, loading, error, refresh };
}

export function useDealerRfm() {
  const [data, setData] = useState<DealerRfmApiResponse | null>(rfmCache);
  const [loading, setLoading] = useState(rfmCache === null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback((refresh = false) => {
    if (!refresh && rfmCache !== null) {
      setData(rfmCache);
      setLoading(false);
      return;
    }
    if (!refresh && rfmInflight) return;
    rfmInflight = true;
    setLoading(true);
    setError(null);
    fetch(`/api/analytics/dealer-rfm${refresh ? '?refresh=1' : ''}`)
      .then(r => r.json())
      .then((d: DealerRfmApiResponse & { error?: string }) => {
        if (d.error) throw new Error(d.error);
        rfmCache = d;
        setData(d);
      })
      .catch(e => setError(e.message || 'เกิดข้อผิดพลาด'))
      .finally(() => { rfmInflight = false; setLoading(false); });
  }, []);

  useEffect(() => { load(); }, [load]);

  const refresh = useCallback(() => {
    rfmCache = null;
    load(true);
  }, [load]);

  return { data, loading, error, refresh };
}

export function usePurchaseCycle() {
  const [data, setData] = useState<PurchaseCycleApiResponse | null>(cycleCache);
  const [loading, setLoading] = useState(cycleCache === null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback((refresh = false) => {
    if (!refresh && cycleCache !== null) {
      setData(cycleCache);
      setLoading(false);
      return;
    }
    if (!refresh && cycleInflight) return;
    cycleInflight = true;
    setLoading(true);
    setError(null);
    fetch(`/api/analytics/purchase-cycle${refresh ? '?refresh=1' : ''}`)
      .then(r => r.json())
      .then((d: PurchaseCycleApiResponse & { error?: string }) => {
        if (d.error) throw new Error(d.error);
        cycleCache = d;
        setData(d);
      })
      .catch(e => setError(e.message || 'เกิดข้อผิดพลาด'))
      .finally(() => { cycleInflight = false; setLoading(false); });
  }, []);

  useEffect(() => { load(); }, [load]);

  const refresh = useCallback(() => {
    cycleCache = null;
    load(true);
  }, [load]);

  return { data, loading, error, refresh };
}

export function useDealerSales(from?: string, to?: string) {
  const cacheKey = `${from ?? ''}__${to ?? ''}`;

  const buildUrl = (refresh: boolean) => {
    const p = new URLSearchParams();
    if (from) p.set('from', from);
    if (to) p.set('to', to);
    if (refresh) p.set('refresh', '1');
    const qs = p.toString();
    return `/api/analytics/dealer-sales${qs ? `?${qs}` : ''}`;
  };

  const [data, setData] = useState<DealerSalesApiResponse | null>(() => dealerSalesCache.get(cacheKey) ?? null);
  const [loading, setLoading] = useState(!dealerSalesCache.has(cacheKey));
  const [error, setError] = useState<string | null>(null);

  const load = useCallback((refresh = false) => {
    if (!refresh && dealerSalesCache.has(cacheKey)) {
      setData(dealerSalesCache.get(cacheKey)!);
      setLoading(false);
      return;
    }
    if (!refresh && dealerSalesInflight.has(cacheKey)) return;
    setLoading(true);
    setError(null);
    const p: Promise<void> = fetch(buildUrl(refresh))
      .then(r => r.json())
      .then((d: DealerSalesApiResponse & { error?: string }) => {
        if (d.error) throw new Error(d.error);
        dealerSalesCache.set(cacheKey, d);
        setData(d);
      })
      .catch(e => setError(e.message || 'เกิดข้อผิดพลาด'))
      .finally(() => { dealerSalesInflight.delete(cacheKey); setLoading(false); });
    dealerSalesInflight.set(cacheKey, p);
  }, [cacheKey]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);

  const refresh = useCallback(() => {
    dealerSalesCache.delete(cacheKey);
    load(true);
  }, [cacheKey, load]);

  return { data, loading, error, refresh };
}

export function useZoneSales(from?: string, to?: string, compareFrom?: string | null, compareTo?: string | null) {
  const hasCompare = !!(compareFrom && compareTo);
  const cacheKey = `${from ?? ''}__${to ?? ''}__${hasCompare ? `${compareFrom}_${compareTo}` : ''}`;

  const buildUrl = (refresh: boolean) => {
    const p = new URLSearchParams();
    if (from) p.set('from', from);
    if (to) p.set('to', to);
    if (hasCompare) { p.set('cfrom', compareFrom!); p.set('cto', compareTo!); }
    if (refresh) p.set('refresh', '1');
    const qs = p.toString();
    return `/api/analytics/zone-sales${qs ? `?${qs}` : ''}`;
  };

  const [data, setData] = useState<ZoneSalesApiResponse | null>(() => zoneSalesCache.get(cacheKey) ?? null);
  const [loading, setLoading] = useState(!zoneSalesCache.has(cacheKey));
  const [error, setError] = useState<string | null>(null);

  const load = useCallback((refresh = false) => {
    if (!refresh && zoneSalesCache.has(cacheKey)) {
      setData(zoneSalesCache.get(cacheKey)!);
      setLoading(false);
      return;
    }
    if (!refresh && zoneSalesInflight.has(cacheKey)) return;
    setLoading(true);
    setError(null);
    const p: Promise<void> = fetch(buildUrl(refresh))
      .then(r => r.json())
      .then((d: ZoneSalesApiResponse & { error?: string }) => {
        if (d.error) throw new Error(d.error);
        zoneSalesCache.set(cacheKey, d);
        setData(d);
      })
      .catch(e => setError(e.message || 'เกิดข้อผิดพลาด'))
      .finally(() => { zoneSalesInflight.delete(cacheKey); setLoading(false); });
    zoneSalesInflight.set(cacheKey, p);
  }, [cacheKey]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);

  const refresh = useCallback(() => {
    zoneSalesCache.delete(cacheKey);
    load(true);
  }, [cacheKey, load]);

  return { data, loading, error, refresh };
}
