import type {
  NormalizedRow, RawDataRow, Tier, TierKnown,
  MonthlyOverviewData, TierAnalysisData, TierSummary, OrderSizeRow,
  SkuBreakdownData, SkuData, DealerHealthData, DealerInfo,
  TrendData, TrendMonthData,
  MonthCompareData, MonthCompareSummary, DealerMovementRow, DealerMovementGroup, SkuMovementRow,
  DealerRfmRow, CycleStatus, PurchaseCycleRow,
  ReturnMonthData, ReturnSkuRow, ReturnDealerRow,
} from '../types';
import {
  MONTHLY_TARGETS, ORDER_SIZE_RANGES, CUMULATIVE_APR_DEC_2026_TARGET, CUMULATIVE_START_YYYYMM,
} from '../constants';
import {
  getBangkokDate, getCurrentMonthYYYYMM, getDaysInMonth,
  getPrevMonth, getMonthStartEnd, parseDate, formatMonthLabel, shiftMonths,
} from '../utils';

export function aggregateMonthlyOverview(
  rows: NormalizedRow[],
  from: string,
  to: string
): MonthlyOverviewData {
  const currentMonth = getCurrentMonthYYYYMM();
  const isSingleMonth = from === to;
  const isCurrentMonth = isSingleMonth && to === currentMonth;

  // Enumerate months in range
  const monthsInRange: string[] = [];
  let m = from;
  while (m <= to) { monthsInRange.push(m); m = shiftMonths(m, 1); }

  const rangeRows = rows.filter(r => r.YYYYMM >= from && r.YYYYMM <= to);
  const mtdSales = rangeRows.reduce((s, r) => s + r.NET_AMOUNT, 0);
  const mtdUnits = rangeRows.reduce((s, r) => s + r.QTY, 0);
  const mtdCases = rangeRows.reduce((s, r) => s + r.cases, 0);
  const activeDealers = new Set(rangeRows.map(r => r.CUSTOMER_ID)).size;

  // Target: sum over range
  const target = monthsInRange.some(mo => MONTHLY_TARGETS[mo] != null)
    ? monthsInRange.reduce((s, mo) => s + (MONTHLY_TARGETS[mo] ?? 0), 0)
    : null;
  const achievementPct = target ? (mtdSales / target) * 100 : null;

  // Previous period: same number of months shifted back
  const nMonths = monthsInRange.length;
  const prevTo = shiftMonths(from, -1);
  const prevFrom = shiftMonths(from, -nMonths);
  const prevMonthSales = rows
    .filter(r => r.YYYYMM >= prevFrom && r.YYYYMM <= prevTo)
    .reduce((s, r) => s + r.NET_AMOUNT, 0);
  const momPct = prevMonthSales > 0 ? ((mtdSales - prevMonthSales) / prevMonthSales) * 100 : null;

  // Days: only meaningful for single-month
  const daysTotal = isSingleMonth ? getDaysInMonth(to) : 0;
  const daysElapsed = isCurrentMonth ? getBangkokDate().getDate() : daysTotal;
  const daysRemaining = Math.max(0, daysTotal - daysElapsed);

  let projectedMonthEnd: number;
  let requiredDailyOrGap: number;
  if (isCurrentMonth && daysElapsed > 0) {
    projectedMonthEnd = (mtdSales / daysElapsed) * daysTotal;
    const singleTarget = MONTHLY_TARGETS[to] ?? null;
    requiredDailyOrGap = singleTarget && daysRemaining > 0 ? (singleTarget - mtdSales) / daysRemaining : 0;
  } else {
    projectedMonthEnd = mtdSales;
    requiredDailyOrGap = target ? mtdSales - target : 0;
  }

  return {
    fromMonth: from, toMonth: to,
    mtdSales, target, achievementPct,
    mtdUnits, mtdCases, activeDealers,
    momPct, prevMonthSales,
    projectedMonthEnd, requiredDailyOrGap,
    isCurrentMonth, daysElapsed, daysTotal, daysRemaining,
  };
}

export function aggregateTierAnalysis(
  rows: NormalizedRow[],
  from: string,
  to: string
): TierAnalysisData {
  const monthRows = rows.filter(r => r.YYYYMM >= from && r.YYYYMM <= to);
  const totalSales = monthRows.reduce((s, r) => s + r.NET_AMOUNT, 0);

  const tierMap = new Map<Tier, { sales: number; dealers: Set<string> }>();
  for (const r of monthRows) {
    if (!tierMap.has(r.Tier)) tierMap.set(r.Tier, { sales: 0, dealers: new Set() });
    const t = tierMap.get(r.Tier)!;
    t.sales += r.NET_AMOUNT;
    t.dealers.add(r.CUSTOMER_ID);
  }

  const tierOrder: Tier[] = ['A', 'B', 'C', 'D', 'Unknown'];
  const tiers: TierSummary[] = tierOrder
    .filter(t => tierMap.has(t))
    .map(t => {
      const { sales, dealers } = tierMap.get(t)!;
      return {
        tier: t,
        sales,
        salesPct: totalSales > 0 ? (sales / totalSales) * 100 : 0,
        dealerCount: dealers.size,
        avgSalesPerDealer: dealers.size > 0 ? sales / dealers.size : 0,
      };
    });

  // Order size distribution: average cases per invoice per dealer (known tiers only)
  const dealerData = new Map<string, { tier: TierKnown; totalCases: number; invCount: number }>();
  const invCasesMap = new Map<string, number>(); // invKey -> cases

  for (const r of monthRows) {
    if (!['A', 'B', 'C', 'D'].includes(r.Tier)) continue;
    const tier = r.Tier as TierKnown;
    const invKey = `${r.CUSTOMER_ID}::${r.INV_NO}`;

    if (!dealerData.has(r.CUSTOMER_ID)) {
      dealerData.set(r.CUSTOMER_ID, { tier, totalCases: 0, invCount: 0 });
    }
    dealerData.get(r.CUSTOMER_ID)!.totalCases += r.cases;

    if (!invCasesMap.has(invKey)) {
      invCasesMap.set(invKey, 0);
      dealerData.get(r.CUSTOMER_ID)!.invCount++;
    }
    invCasesMap.set(invKey, (invCasesMap.get(invKey) || 0) + r.cases);
  }

  // Average order size per dealer
  const dealerAvg = new Map<string, { tier: TierKnown; avgCases: number }>();
  for (const [cid, { tier, totalCases, invCount }] of dealerData) {
    dealerAvg.set(cid, { tier, avgCases: invCount > 0 ? totalCases / invCount : 0 });
  }

  // Tier totals for % calculation
  const tierTotals = new Map<TierKnown, number>();
  for (const { tier } of dealerAvg.values()) {
    tierTotals.set(tier, (tierTotals.get(tier) || 0) + 1);
  }

  const orderSizeDistribution: OrderSizeRow[] = ORDER_SIZE_RANGES.map(range => {
    const counts: Partial<Record<TierKnown, number>> = {};
    for (const { tier, avgCases } of dealerAvg.values()) {
      if (avgCases >= range.min && avgCases <= range.max) {
        counts[tier] = (counts[tier] || 0) + 1;
      }
    }
    const pcts: Partial<Record<TierKnown, number>> = {};
    for (const [t, cnt] of Object.entries(counts) as [TierKnown, number][]) {
      pcts[t] = ((cnt / (tierTotals.get(t) || 1)) * 100);
    }
    return { ...range, counts, pcts };
  });

  return { tiers, orderSizeDistribution, totalSales };
}

export function aggregateSkuBreakdown(
  rows: NormalizedRow[],
  from: string,
  to: string
): SkuBreakdownData {
  const monthRows = rows.filter(r => r.YYYYMM >= from && r.YYYYMM <= to);
  // Previous period: same number of months
  const monthsInRange: string[] = [];
  let m = from;
  while (m <= to) { monthsInRange.push(m); m = shiftMonths(m, 1); }
  const prevTo = shiftMonths(from, -1);
  const prevFrom = shiftMonths(from, -monthsInRange.length);
  const prevRows = rows.filter(r => r.YYYYMM >= prevFrom && r.YYYYMM <= prevTo);
  const totalSales = monthRows.reduce((s, r) => s + r.NET_AMOUNT, 0);

  const skuMap = new Map<string, { desc: string; sales: number; units: number; cases: number }>();
  for (const r of monthRows) {
    if (!skuMap.has(r.ITEM_ID)) skuMap.set(r.ITEM_ID, { desc: r.ITEM_DESC, sales: 0, units: 0, cases: 0 });
    const s = skuMap.get(r.ITEM_ID)!;
    s.sales += r.NET_AMOUNT;
    s.units += r.QTY;
    s.cases += r.cases;
  }

  const prevSkuMap = new Map<string, number>();
  for (const r of prevRows) {
    prevSkuMap.set(r.ITEM_ID, (prevSkuMap.get(r.ITEM_ID) || 0) + r.NET_AMOUNT);
  }

  const skus: SkuData[] = Array.from(skuMap.entries())
    .map(([itemId, data]) => {
      const prevSales = prevSkuMap.get(itemId) ?? null;
      const momPct = prevSales !== null && prevSales > 0
        ? ((data.sales - prevSales) / prevSales) * 100
        : null;
      return {
        itemId, itemDesc: data.desc,
        sales: data.sales, units: data.units, cases: data.cases,
        salesPct: totalSales > 0 ? (data.sales / totalSales) * 100 : 0,
        momPct, prevSales,
      };
    })
    .sort((a, b) => b.sales - a.sales);

  return {
    skus,
    top5: skus.slice(0, 5),
    growing: skus.filter(s => s.momPct !== null && s.momPct > 0)
      .sort((a, b) => (b.momPct ?? 0) - (a.momPct ?? 0)),
    declining: skus.filter(s => s.momPct !== null && s.momPct < 0)
      .sort((a, b) => (a.momPct ?? 0) - (b.momPct ?? 0)),
  };
}

export function aggregateDealerHealth(
  filteredRows: NormalizedRow[],
  allBatteryDomesticRows: RawDataRow[],
  from: string,
  to: string
): DealerHealthData {
  const { start: monthStart } = getMonthStartEnd(from);
  const { end: monthEnd } = getMonthStartEnd(to);
  const prevMonth = getPrevMonth(from);

  const monthRows = filteredRows.filter(r => r.YYYYMM >= from && r.YYYYMM <= to);
  const activeDealers = new Set(monthRows.map(r => r.CUSTOMER_ID));

  // New: earliest ever INV_DATE (battery+domestic all history) falls in range
  const earliestDateMap = new Map<string, Date>();
  for (const r of allBatteryDomesticRows) {
    const d = parseDate(r.INV_DATE);
    if (!d) continue;
    const ex = earliestDateMap.get(r.CUSTOMER_ID);
    if (!ex || d < ex) earliestDateMap.set(r.CUSTOMER_ID, d);
  }

  const newDealerIds = new Set<string>();
  for (const [cid, firstDate] of earliestDateMap) {
    if (firstDate >= monthStart && firstDate <= monthEnd) newDealerIds.add(cid);
  }

  // Returning: active + no invoice in prev month + not new
  const prevMonthDealers = new Set(filteredRows.filter(r => r.YYYYMM === prevMonth).map((r: NormalizedRow) => r.CUSTOMER_ID));
  const returningDealers = new Set<string>();
  for (const cid of activeDealers) {
    if (!newDealerIds.has(cid) && !prevMonthDealers.has(cid)) returningDealers.add(cid);
  }

  // At risk: invoice in [monthStart-60d, monthStart-1d], no invoice in selected month
  const atRiskWindowStart = new Date(monthStart);
  atRiskWindowStart.setDate(atRiskWindowStart.getDate() - 60);
  const atRiskWindowEnd = new Date(monthStart);
  atRiskWindowEnd.setDate(atRiskWindowEnd.getDate() - 1);

  const inAtRiskWindow = new Set<string>();
  for (const r of filteredRows) {
    const d = parseDate(r.INV_DATE);
    if (d && d >= atRiskWindowStart && d <= atRiskWindowEnd) inAtRiskWindow.add(r.CUSTOMER_ID);
  }
  const atRiskDealers = new Set([...inAtRiskWindow].filter(cid => !activeDealers.has(cid)));

  // Lost: no invoice in selected month + latest invoice > 90 days before monthEnd
  const latestDateMap = new Map<string, Date>();
  for (const r of filteredRows) {
    const d = parseDate(r.INV_DATE);
    if (!d) continue;
    const ex = latestDateMap.get(r.CUSTOMER_ID);
    if (!ex || d > ex) latestDateMap.set(r.CUSTOMER_ID, d);
  }

  const lostThreshold = new Date(monthEnd);
  lostThreshold.setDate(lostThreshold.getDate() - 90);

  const lostDealers = new Set<string>();
  for (const [cid, lastDate] of latestDateMap) {
    if (!activeDealers.has(cid) && lastDate < lostThreshold) lostDealers.add(cid);
  }

  // Build dealer info map for current month
  const currentMonthDealerMap = new Map<string, {
    name: string; tier: Tier; sales: number; units: number;
    cases: number; invoices: Set<string>; lastDate: Date | null;
    skuMap: Map<string, { desc: string; units: number; cases: number }>;
  }>();
  for (const r of monthRows) {
    if (!currentMonthDealerMap.has(r.CUSTOMER_ID)) {
      currentMonthDealerMap.set(r.CUSTOMER_ID, {
        name: r.CUSTOMER_NAME, tier: r.Tier,
        sales: 0, units: 0, cases: 0,
        invoices: new Set(), lastDate: null,
        skuMap: new Map(),
      });
    }
    const d = currentMonthDealerMap.get(r.CUSTOMER_ID)!;
    d.sales += r.NET_AMOUNT;
    d.units += r.QTY;
    d.cases += r.cases;
    d.invoices.add(r.INV_NO);
    const invDate = parseDate(r.INV_DATE);
    if (invDate && (!d.lastDate || invDate > d.lastDate)) d.lastDate = invDate;
    const sku = d.skuMap.get(r.ITEM_ID);
    if (sku) {
      sku.units += r.QTY;
      sku.cases += r.cases;
    } else {
      d.skuMap.set(r.ITEM_ID, { desc: r.ITEM_DESC, units: r.QTY, cases: r.cases });
    }
  }

  // Fallback dealer lookup from all filtered rows
  const allDealerRows = new Map<string, NormalizedRow>();
  for (const r of filteredRows) {
    if (!allDealerRows.has(r.CUSTOMER_ID)) allDealerRows.set(r.CUSTOMER_ID, r);
  }

  const makeDealerInfo = (cid: string): DealerInfo => {
    const curr = currentMonthDealerMap.get(cid);
    if (curr) {
      const skus = Array.from(curr.skuMap.entries())
        .map(([itemId, s]) => ({ itemId, itemDesc: s.desc, units: s.units, cases: s.cases }))
        .sort((a, b) => b.cases - a.cases);
      return {
        customerId: cid, customerName: curr.name, tier: curr.tier,
        sales: curr.sales, units: curr.units, cases: curr.cases,
        invoiceCount: curr.invoices.size, lastInvoiceDate: curr.lastDate ? curr.lastDate.toISOString().slice(0, 10) : null,
        skus,
      };
    }
    const fallback = allDealerRows.get(cid);
    const lastDate = latestDateMap.get(cid);
    return {
      customerId: cid,
      customerName: fallback?.CUSTOMER_NAME ?? cid,
      tier: (fallback?.Tier ?? 'Unknown') as Tier,
      sales: 0, units: 0, cases: 0, invoiceCount: 0,
      lastInvoiceDate: lastDate ? lastDate.toISOString().slice(0, 10) : null,
      skus: [],
    };
  };

  const top10 = [...currentMonthDealerMap.entries()]
    .sort((a, b) => b[1].sales - a[1].sales)
    .slice(0, 10)
    .map(([cid]) => makeDealerInfo(cid));

  const newDealerList = [...newDealerIds]
    .filter(cid => activeDealers.has(cid))
    .map(makeDealerInfo)
    .sort((a, b) => b.sales - a.sales);

  const atRiskList = [...atRiskDealers]
    .map(makeDealerInfo)
    .sort((a, b) => (b.lastInvoiceDate ?? '').localeCompare(a.lastInvoiceDate ?? ''))
    .slice(0, 20);

  return {
    activeCount: activeDealers.size,
    newCount: newDealerList.length,
    returningCount: returningDealers.size,
    atRiskCount: atRiskDealers.size,
    lostCount: lostDealers.size,
    top10, atRisk: atRiskList, newDealers: newDealerList,
  };
}

export function aggregateMonthCompare(
  rows: NormalizedRow[],
  baseMonth: string,
  compareMonth: string,
): MonthCompareData {
  const baseRows = rows.filter(r => r.YYYYMM === baseMonth);
  const compareRows = rows.filter(r => r.YYYYMM === compareMonth);

  function summarize(monthRows: NormalizedRow[]): MonthCompareSummary {
    const invoices = new Set(monthRows.map(r => r.INV_NO));
    const dealers = new Set(monthRows.map(r => r.CUSTOMER_ID));
    const totalSales = monthRows.reduce((s, r) => s + r.NET_AMOUNT, 0);
    const totalUnits = monthRows.reduce((s, r) => s + r.QTY, 0);
    const totalCases = monthRows.reduce((s, r) => s + r.cases, 0);
    const invoiceCount = invoices.size;
    return {
      totalSales, totalUnits, totalCases,
      invoiceCount, activeDealers: dealers.size,
      avgSalesPerInvoice: invoiceCount > 0 ? totalSales / invoiceCount : 0,
      avgCasesPerInvoice: invoiceCount > 0 ? totalCases / invoiceCount : 0,
    };
  }

  // Build per-dealer summaries for each month
  function buildDealerMap(monthRows: NormalizedRow[]) {
    const m = new Map<string, { name: string; tier: Tier; sales: number; cases: number }>();
    for (const r of monthRows) {
      if (!m.has(r.CUSTOMER_ID)) m.set(r.CUSTOMER_ID, { name: r.CUSTOMER_NAME, tier: r.Tier, sales: 0, cases: 0 });
      const d = m.get(r.CUSTOMER_ID)!;
      d.sales += r.NET_AMOUNT;
      d.cases += r.cases;
    }
    return m;
  }

  const baseDealerMap = buildDealerMap(baseRows);
  const compareDealerMap = buildDealerMap(compareRows);
  const allDealerIds = new Set([...baseDealerMap.keys(), ...compareDealerMap.keys()]);

  const dealerMovement: DealerMovementRow[] = [];
  for (const cid of allDealerIds) {
    const base = baseDealerMap.get(cid);
    const compare = compareDealerMap.get(cid);
    const name = (compare?.name ?? base?.name) ?? cid;
    const tier = (compare?.tier ?? base?.tier) ?? 'Unknown';
    const baseSales = base?.sales ?? 0;
    const compareSales = compare?.sales ?? 0;
    const diff = compareSales - baseSales;
    const diffPct = baseSales > 0 ? (diff / baseSales) * 100 : null;
    let group: DealerMovementGroup;
    if (!base) group = 'returned_new';
    else if (!compare) group = 'lost';
    else if (diff >= 0) group = 'increased';
    else group = 'decreased';
    dealerMovement.push({
      customerId: cid, customerName: name, tier,
      baseSales, compareSales, diff, diffPct,
      baseCases: base?.cases ?? 0,
      compareCases: compare?.cases ?? 0,
      group,
    });
  }

  // Build per-SKU summaries
  function buildSkuMap(monthRows: NormalizedRow[]) {
    const m = new Map<string, { desc: string; sales: number; cases: number }>();
    for (const r of monthRows) {
      if (!m.has(r.ITEM_ID)) m.set(r.ITEM_ID, { desc: r.ITEM_DESC, sales: 0, cases: 0 });
      const s = m.get(r.ITEM_ID)!;
      s.sales += r.NET_AMOUNT;
      s.cases += r.cases;
    }
    return m;
  }

  const baseSkuMap = buildSkuMap(baseRows);
  const compareSkuMap = buildSkuMap(compareRows);
  const allSkuIds = new Set([...baseSkuMap.keys(), ...compareSkuMap.keys()]);

  const skuMovement: SkuMovementRow[] = [];
  for (const itemId of allSkuIds) {
    const base = baseSkuMap.get(itemId);
    const compare = compareSkuMap.get(itemId);
    const desc = (compare?.desc ?? base?.desc) ?? itemId;
    const baseSales = base?.sales ?? 0;
    const compareSales = compare?.sales ?? 0;
    const diff = compareSales - baseSales;
    const diffPct = baseSales > 0 ? (diff / baseSales) * 100 : null;
    skuMovement.push({
      itemId, itemDesc: desc,
      baseSales, compareSales, diff, diffPct,
      baseCases: base?.cases ?? 0,
      compareCases: compare?.cases ?? 0,
    });
  }
  skuMovement.sort((a, b) => b.compareSales - a.compareSales);

  return {
    baseMonth, compareMonth,
    base: summarize(baseRows),
    compare: summarize(compareRows),
    dealerMovement,
    skuMovement,
  };
}

function quintileScore(values: number[], target: number, lowerIsBetter: boolean): number {
  if (values.length === 0) return 3;
  const below = values.filter(v => v < target).length;
  const equal = values.filter(v => v === target).length;
  const rankPct = (below + equal / 2) / values.length;
  const score = lowerIsBetter ? 1 - rankPct : rankPct;
  if (score >= 0.8) return 5;
  if (score >= 0.6) return 4;
  if (score >= 0.4) return 3;
  if (score >= 0.2) return 2;
  return 1;
}

function rfmSegment(r: number, f: number, m: number, freq: number): string {
  if (freq <= 2 && r >= 3) return 'New';
  if (r >= 4 && f >= 4 && m >= 4) return 'VIP';
  if (r >= 4 && f >= 3) return 'Loyal';
  if (r >= 3 && m >= 3) return 'Potential';
  if (r === 2) return 'At Risk';
  if (r === 1) return 'Lost';
  return 'Normal';
}

export function aggregateDealerRfm(rows: NormalizedRow[]): {
  dealers: DealerRfmRow[];
  segmentCounts: Record<string, number>;
} {
  const today = getBangkokDate();

  const dealerMap = new Map<string, {
    name: string; tier: Tier;
    lastDate: Date | null;
    invoiceIds: Set<string>;
    totalSales: number;
  }>();

  for (const r of rows) {
    if (!dealerMap.has(r.CUSTOMER_ID)) {
      dealerMap.set(r.CUSTOMER_ID, { name: r.CUSTOMER_NAME, tier: r.Tier, lastDate: null, invoiceIds: new Set(), totalSales: 0 });
    }
    const d = dealerMap.get(r.CUSTOMER_ID)!;
    d.invoiceIds.add(r.INV_NO);
    d.totalSales += r.NET_AMOUNT;
    const date = parseDate(r.INV_DATE);
    if (date && (!d.lastDate || date > d.lastDate)) d.lastDate = date;
  }

  const rawMetrics = Array.from(dealerMap.entries()).map(([cid, d]) => ({
    customerId: cid,
    customerName: d.name,
    tier: d.tier,
    lastInvoiceDate: d.lastDate ? d.lastDate.toISOString().slice(0, 10) : null,
    daysSinceLastPurchase: d.lastDate
      ? Math.floor((today.getTime() - d.lastDate.getTime()) / 86400000)
      : null,
    invoiceFrequency: d.invoiceIds.size,
    totalMonetarySales: d.totalSales,
    avgOrderValue: d.invoiceIds.size > 0 ? d.totalSales / d.invoiceIds.size : 0,
  }));

  const validRecency = rawMetrics.filter(m => m.daysSinceLastPurchase !== null).map(m => m.daysSinceLastPurchase!);
  const allFreq = rawMetrics.map(m => m.invoiceFrequency);
  const allMonetary = rawMetrics.map(m => m.totalMonetarySales);

  const dealers: DealerRfmRow[] = rawMetrics.map(m => {
    const recencyScore = m.daysSinceLastPurchase !== null
      ? quintileScore(validRecency, m.daysSinceLastPurchase, true)
      : 1;
    const frequencyScore = quintileScore(allFreq, m.invoiceFrequency, false);
    const monetaryScore = quintileScore(allMonetary, m.totalMonetarySales, false);
    return {
      ...m,
      recencyScore, frequencyScore, monetaryScore,
      rfmScore: `${recencyScore}${frequencyScore}${monetaryScore}`,
      segment: rfmSegment(recencyScore, frequencyScore, monetaryScore, m.invoiceFrequency),
    };
  });

  dealers.sort((a, b) => b.totalMonetarySales - a.totalMonetarySales);

  const segmentCounts: Record<string, number> = {};
  for (const d of dealers) segmentCounts[d.segment] = (segmentCounts[d.segment] || 0) + 1;

  return { dealers, segmentCounts };
}

export function aggregatePurchaseCycle(rows: NormalizedRow[]): PurchaseCycleRow[] {
  const today = getBangkokDate();

  const dealerMap = new Map<string, {
    name: string; tier: Tier;
    invoiceIds: Set<string>;
    datesByDay: Map<string, Date>;
  }>();

  for (const r of rows) {
    if (!dealerMap.has(r.CUSTOMER_ID)) {
      dealerMap.set(r.CUSTOMER_ID, { name: r.CUSTOMER_NAME, tier: r.Tier, invoiceIds: new Set(), datesByDay: new Map() });
    }
    const d = dealerMap.get(r.CUSTOMER_ID)!;
    d.invoiceIds.add(r.INV_NO);
    const date = parseDate(r.INV_DATE);
    if (date) {
      const dayKey = date.toISOString().slice(0, 10);
      if (!d.datesByDay.has(dayKey)) d.datesByDay.set(dayKey, date);
    }
  }

  const result: PurchaseCycleRow[] = [];

  for (const [cid, { name, tier, invoiceIds, datesByDay }] of dealerMap) {
    const invoiceCount = invoiceIds.size;
    const sortedDates = [...datesByDay.values()].sort((a, b) => a.getTime() - b.getTime());

    if (sortedDates.length < 2) {
      result.push({
        customerId: cid, customerName: name, tier,
        invoiceCount, avgDaysBetween: null, medianDaysBetween: null,
        lastInvoiceDate: sortedDates[0]?.toISOString().slice(0, 10) ?? null,
        expectedNextDate: null, daysOverdue: null,
        status: 'not_enough_data',
      });
      continue;
    }

    const gaps: number[] = [];
    for (let i = 1; i < sortedDates.length; i++) {
      gaps.push(Math.round((sortedDates[i].getTime() - sortedDates[i - 1].getTime()) / 86400000));
    }

    const avgDaysBetween = Math.round(gaps.reduce((a, b) => a + b, 0) / gaps.length);
    const sorted = [...gaps].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    const medianDaysBetween = sorted.length % 2 === 0
      ? Math.round((sorted[mid - 1] + sorted[mid]) / 2)
      : sorted[mid];

    const lastDate = sortedDates[sortedDates.length - 1];
    const expectedNext = new Date(lastDate.getTime() + avgDaysBetween * 86400000);
    const msUntil = expectedNext.getTime() - today.getTime();
    const daysUntil = Math.round(msUntil / 86400000);
    const daysOverdue = daysUntil < 0 ? -daysUntil : 0;

    let status: CycleStatus;
    if (daysOverdue > 14) status = 'critical';
    else if (daysOverdue > 0) status = 'overdue';
    else if (daysUntil <= 7) status = 'due_soon';
    else status = 'on_track';

    result.push({
      customerId: cid, customerName: name, tier,
      invoiceCount, avgDaysBetween, medianDaysBetween,
      lastInvoiceDate: lastDate.toISOString().slice(0, 10),
      expectedNextDate: expectedNext.toISOString().slice(0, 10),
      daysOverdue,
      status,
    });
  }

  return result;
}

export function aggregateTrend(rows: NormalizedRow[]): TrendData {
  const allMonths = [...new Set(rows.map(r => r.YYYYMM))].sort();
  const last6 = allMonths.slice(-6);

  const months: TrendMonthData[] = last6.map(yyyymm => {
    const monthRows = rows.filter(r => r.YYYYMM === yyyymm);
    const sales = monthRows.reduce((s, r) => s + r.NET_AMOUNT, 0);

    const tierSales: Partial<Record<TierKnown, number>> = {};
    const tierInvoices: Partial<Record<TierKnown, Set<string>>> = {};
    for (const r of monthRows) {
      if (!['A', 'B', 'C', 'D'].includes(r.Tier)) continue;
      const t = r.Tier as TierKnown;
      tierSales[t] = (tierSales[t] || 0) + r.NET_AMOUNT;
      if (!tierInvoices[t]) tierInvoices[t] = new Set();
      tierInvoices[t]!.add(r.INV_NO);
    }

    const tierSalesPct: Partial<Record<TierKnown, number>> = {};
    for (const t of Object.keys(tierSales) as TierKnown[]) {
      tierSalesPct[t] = sales > 0 ? ((tierSales[t] ?? 0) / sales) * 100 : 0;
    }

    const tierAvgOrderValue: Partial<Record<TierKnown, number>> = {};
    for (const t of Object.keys(tierSales) as TierKnown[]) {
      const invCount = tierInvoices[t]?.size ?? 0;
      tierAvgOrderValue[t] = invCount > 0 ? (tierSales[t] ?? 0) / invCount : 0;
    }

    const invoiceCount = new Set(monthRows.map(r => r.INV_NO)).size;
    const avgOrderValue = invoiceCount > 0 ? sales / invoiceCount : 0;

    return {
      month: yyyymm,
      label: formatMonthLabel(yyyymm),
      sales,
      target: MONTHLY_TARGETS[yyyymm] ?? null,
      tierSales,
      tierSalesPct,
      activeDealers: new Set(monthRows.map(r => r.CUSTOMER_ID)).size,
      invoiceCount,
      avgOrderValue,
      tierAvgOrderValue,
    };
  });

  const cumulativeSales = rows
    .filter(r => r.YYYYMM >= CUMULATIVE_START_YYYYMM)
    .reduce((s, r) => s + r.NET_AMOUNT, 0);

  return { months, cumulativeSales, cumulativeTarget: CUMULATIVE_APR_DEC_2026_TARGET };
}

export function aggregateReturns(
  returnRows: NormalizedRow[],
  salesRows: NormalizedRow[],
): {
  months: ReturnMonthData[];
  topReturnedSkus: ReturnSkuRow[];
  topReturningDealers: ReturnDealerRow[];
  totalReturnAmount: number;
  totalGrossSales: number;
  overallReturnRate: number;
} {
  const allMonths = [...new Set([
    ...returnRows.map(r => r.YYYYMM),
    ...salesRows.map(r => r.YYYYMM),
  ])].sort();

  const months: ReturnMonthData[] = allMonths.map(yyyymm => {
    const monthReturns = returnRows.filter(r => r.YYYYMM === yyyymm);
    const monthSales = salesRows.filter(r => r.YYYYMM === yyyymm);

    const returnAmount = monthReturns.reduce((s, r) => s + Math.abs(r.NET_AMOUNT), 0);
    const returnUnits = monthReturns.reduce((s, r) => s + Math.abs(r.QTY), 0);
    const returnInvoiceCount = new Set(monthReturns.map(r => r.INV_NO)).size;
    const grossSales = monthSales.reduce((s, r) => s + r.NET_AMOUNT, 0);
    const returnRate = grossSales > 0 ? (returnAmount / grossSales) * 100 : 0;

    const tierReturnAmount: Partial<Record<TierKnown, number>> = {};
    for (const r of monthReturns) {
      if (!['A', 'B', 'C', 'D'].includes(r.Tier)) continue;
      const t = r.Tier as TierKnown;
      tierReturnAmount[t] = (tierReturnAmount[t] ?? 0) + Math.abs(r.NET_AMOUNT);
    }

    return {
      month: yyyymm,
      label: formatMonthLabel(yyyymm),
      returnAmount,
      returnUnits,
      returnInvoiceCount,
      grossSales,
      returnRate,
      tierReturnAmount,
    };
  });

  // Top returned SKUs
  const skuMap = new Map<string, { desc: string; amount: number; units: number; count: number }>();
  for (const r of returnRows) {
    if (!skuMap.has(r.ITEM_ID)) skuMap.set(r.ITEM_ID, { desc: r.ITEM_DESC, amount: 0, units: 0, count: 0 });
    const s = skuMap.get(r.ITEM_ID)!;
    s.amount += Math.abs(r.NET_AMOUNT);
    s.units += Math.abs(r.QTY);
    s.count++;
  }
  const topReturnedSkus: ReturnSkuRow[] = Array.from(skuMap.entries())
    .map(([itemId, d]) => ({ itemId, itemDesc: d.desc, returnAmount: d.amount, returnUnits: d.units, returnCount: d.count }))
    .sort((a, b) => b.returnAmount - a.returnAmount)
    .slice(0, 10);

  // Top returning dealers
  const dealerMap = new Map<string, { name: string; tier: Tier; amount: number; units: number; count: number }>();
  for (const r of returnRows) {
    if (!dealerMap.has(r.CUSTOMER_ID)) dealerMap.set(r.CUSTOMER_ID, { name: r.CUSTOMER_NAME, tier: r.Tier, amount: 0, units: 0, count: 0 });
    const d = dealerMap.get(r.CUSTOMER_ID)!;
    d.amount += Math.abs(r.NET_AMOUNT);
    d.units += Math.abs(r.QTY);
    d.count++;
  }
  const topReturningDealers: ReturnDealerRow[] = Array.from(dealerMap.entries())
    .map(([customerId, d]) => ({ customerId, customerName: d.name, tier: d.tier, returnAmount: d.amount, returnUnits: d.units, returnCount: d.count }))
    .sort((a, b) => b.returnAmount - a.returnAmount)
    .slice(0, 20);

  const totalReturnAmount = returnRows.reduce((s, r) => s + Math.abs(r.NET_AMOUNT), 0);
  const totalGrossSales = salesRows.reduce((s, r) => s + r.NET_AMOUNT, 0);
  const overallReturnRate = totalGrossSales > 0 ? (totalReturnAmount / totalGrossSales) * 100 : 0;

  return { months, topReturnedSkus, topReturningDealers, totalReturnAmount, totalGrossSales, overallReturnRate };
}
