import type { RawDataRow, DealerMaster, NormalizedRow, Tier } from '../types';

export function joinDealerTier(
  rows: RawDataRow[],
  dealers: DealerMaster[]
): { rows: NormalizedRow[]; failedIds: string[] } {
  const tierMap = new Map<string, Tier>();
  for (const d of dealers) {
    tierMap.set(d.CUSTOMER_ID, d.Tier);
  }

  const failedSet = new Set<string>();
  const normalized: NormalizedRow[] = rows.map(r => {
    const tier = tierMap.get(r.CUSTOMER_ID) ?? 'Unknown';
    if (tier === 'Unknown') failedSet.add(r.CUSTOMER_ID);
    return { ...r, Tier: tier, cases: r.QTY / 10 };
  });

  return { rows: normalized, failedIds: Array.from(failedSet) };
}
