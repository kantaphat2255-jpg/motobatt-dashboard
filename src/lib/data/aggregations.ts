import type {
  NormalizedRow, RawDataRow, Tier, TierKnown,
  MonthlyOverviewData, TierAnalysisData, TierSummary, TierDealerRow, OrderSizeRow,
  BillSizeDistributionData, BillSizeRow,
  SkuBreakdownData, SkuData, DealerHealthData, DealerInfo,
  TrendData, TrendMonthData,
  MonthCompareData, MonthCompareSummary, DealerMovementRow, DealerMovementGroup, SkuMovementRow,
  DealerRfmRow, CycleStatus, PurchaseCycleRow,
  ReturnMonthData, ReturnSkuRow, ReturnDealerRow,
  DealerSalesData, DealerSaleRow, DealerSalesSummary,
  ZoneSalesData, ZoneBreakdownRow, OnlineChannelRow, ZoneDealerRow,
  TrendGranularity, ZoneTrendData, ZoneTrendRow, ZoneTrendPoint, ZoneTrendSkuRow,
  BatteryTypeKey, BatteryTypeData, BatteryTypeRow, BatteryTypeSku, BatteryTypeMonth, BatteryTypeChannelRow,
  OnlineSalesData, OnlineChannelSummary,
} from '../types';
import {
  MONTHLY_TARGETS, ORDER_SIZE_RANGES, BILL_SIZE_RANGES, CUMULATIVE_APR_DEC_2026_TARGET, CUMULATIVE_START_YYYYMM,
  CORE_ZONES, ONLINE_ZONE_LABELS, ONLINE_ZONE_IDS, THAI_MONTHS_SHORT, BATTERY_TYPES, BATTERY_TYPE_OTHER,
} from '../constants';
import { classifyBatteryType, batteryModelName } from './batteryType';
import {
  getBangkokDate, parseDate, formatMonthLabel,
} from '../utils';
import {
  addDaysISO, diffDaysISO, startOfMonthISO, endOfMonthISO, isoToYYYYMM, addMonthsPreserveDay,
} from '../dateRange';

/**
 * Sum monthly targets across [from, to], prorating partial months by
 * (days-in-range within that month / days in month). A whole month yields its
 * full target, so selecting a complete month matches the legacy behaviour.
 */
function proratedTarget(from: string, to: string): number | null {
  let total = 0;
  let any = false;
  let cursor = startOfMonthISO(from);
  while (cursor <= to) {
    const mStart = cursor;
    const mEnd = endOfMonthISO(cursor);
    const t = MONTHLY_TARGETS[isoToYYYYMM(mStart)];
    const overlapStart = from > mStart ? from : mStart;
    const overlapEnd = to < mEnd ? to : mEnd;
    if (t != null && overlapEnd >= overlapStart) {
      const daysInMonth = diffDaysISO(mStart, mEnd) + 1;
      const overlapDays = diffDaysISO(overlapStart, overlapEnd) + 1;
      total += t * (overlapDays / daysInMonth);
      any = true;
    }
    cursor = addDaysISO(mEnd, 1);
  }
  return any ? total : null;
}

export function aggregateMonthlyOverview(
  rows: NormalizedRow[],
  from: string,      // 'YYYY-MM-DD'
  to: string,        // 'YYYY-MM-DD'
  maxDate: string,   // latest INV_DATE available in the data
): MonthlyOverviewData {
  const rangeRows = rows.filter(r => r.INV_DATE >= from && r.INV_DATE <= to);
  const mtdSales = rangeRows.reduce((s, r) => s + r.NET_AMOUNT, 0);
  const mtdUnits = rangeRows.reduce((s, r) => s + r.QTY, 0);
  const mtdCases = rangeRows.reduce((s, r) => s + r.cases, 0);
  const activeDealers = new Set(rangeRows.map(r => r.CUSTOMER_ID)).size;
  const invoiceCount = new Set(rangeRows.map(r => r.INV_NO)).size;
  const avgOrderValue = invoiceCount > 0 ? mtdSales / invoiceCount : 0;

  // "Ongoing" = range sits inside a single month, runs up to the newest data,
  // and that month isn't over yet → project to month end (legacy MTD behaviour).
  const sameMonth = from.slice(0, 7) === to.slice(0, 7);
  const projectionEnd = endOfMonthISO(to);
  const isOngoing = sameMonth && to === maxDate && to < projectionEnd;

  // Target: full period target when ongoing (progress-to-target), else the
  // prorated target for the exact range selected.
  const target = isOngoing ? proratedTarget(from, projectionEnd) : proratedTarget(from, to);
  const achievementPct = target ? (mtdSales / target) * 100 : null;

  // Previous period: the same dates one month earlier (month-over-month).
  const prevFrom = addMonthsPreserveDay(from, -1);
  const prevTo = addMonthsPreserveDay(to, -1);
  const prevMonthSales = rows
    .filter(r => r.INV_DATE >= prevFrom && r.INV_DATE <= prevTo)
    .reduce((s, r) => s + r.NET_AMOUNT, 0);
  const momPct = prevMonthSales > 0 ? ((mtdSales - prevMonthSales) / prevMonthSales) * 100 : null;

  const elapsed = diffDaysISO(from, to) + 1;
  let daysTotal: number, daysElapsed: number, daysRemaining: number;
  let projectedMonthEnd: number, requiredDailyOrGap: number;
  if (isOngoing) {
    const full = diffDaysISO(from, projectionEnd) + 1;
    daysElapsed = elapsed;
    daysTotal = full;
    daysRemaining = Math.max(0, full - elapsed);
    projectedMonthEnd = elapsed > 0 ? (mtdSales / elapsed) * full : mtdSales;
    requiredDailyOrGap = target && daysRemaining > 0 ? (target - mtdSales) / daysRemaining : 0;
  } else {
    daysElapsed = elapsed;
    daysTotal = elapsed;
    daysRemaining = 0;
    projectedMonthEnd = mtdSales;
    requiredDailyOrGap = target ? mtdSales - target : 0;
  }

  return {
    fromDate: from, toDate: to,
    mtdSales, target, achievementPct,
    mtdUnits, mtdCases, activeDealers,
    invoiceCount, avgOrderValue,
    momPct, prevMonthSales,
    projectedMonthEnd, requiredDailyOrGap,
    isOngoing, daysElapsed, daysTotal, daysRemaining,
  };
}

export function aggregateTierAnalysis(
  rows: NormalizedRow[],
  from: string,
  to: string,
  compareFrom?: string,
  compareTo?: string,
): TierAnalysisData {
  const monthRows = rows.filter(r => r.INV_DATE >= from && r.INV_DATE <= to);
  const totalSales = monthRows.reduce((s, r) => s + r.NET_AMOUNT, 0);

  const tierMap = new Map<Tier, { sales: number; dealers: Set<string> }>();
  const dealerSalesByTier = new Map<Tier, Map<string, { customerName: string; sales: number }>>();
  for (const r of monthRows) {
    if (!tierMap.has(r.Tier)) tierMap.set(r.Tier, { sales: 0, dealers: new Set() });
    const t = tierMap.get(r.Tier)!;
    t.sales += r.NET_AMOUNT;
    t.dealers.add(r.CUSTOMER_ID);
    if (!dealerSalesByTier.has(r.Tier)) dealerSalesByTier.set(r.Tier, new Map());
    const ds = dealerSalesByTier.get(r.Tier)!;
    const existing = ds.get(r.CUSTOMER_ID);
    if (existing) existing.sales += r.NET_AMOUNT;
    else ds.set(r.CUSTOMER_ID, { customerName: r.CUSTOMER_NAME, sales: r.NET_AMOUNT });
  }

  // Comparison period: an explicit range from the date picker when the user turned
  // "เปรียบเทียบ" on, otherwise the same dates one calendar month earlier by default
  // (mirrors aggregateMonthlyOverview's momPct), so every tier card always has a delta.
  const cmpFrom = compareFrom ?? addMonthsPreserveDay(from, -1);
  const cmpTo = compareTo ?? addMonthsPreserveDay(to, -1);
  const cmpRows = rows.filter(r => r.INV_DATE >= cmpFrom && r.INV_DATE <= cmpTo);
  const cmpTierMap = new Map<Tier, { sales: number; dealers: Set<string> }>();
  for (const r of cmpRows) {
    if (!cmpTierMap.has(r.Tier)) cmpTierMap.set(r.Tier, { sales: 0, dealers: new Set() });
    const t = cmpTierMap.get(r.Tier)!;
    t.sales += r.NET_AMOUNT;
    t.dealers.add(r.CUSTOMER_ID);
  }
  const pct = (cur: number, prev: number) => (prev > 0 ? ((cur - prev) / prev) * 100 : null);

  const tierOrder: Tier[] = ['A', 'B', 'C', 'D', 'Unknown'];
  const tiers: TierSummary[] = tierOrder
    // A tier with sales in the compare period but none in the primary period must
    // still show up (as a decline to zero) — filtering on tierMap alone would let
    // it silently vanish instead of reporting the drop.
    .filter(t => tierMap.has(t) || cmpTierMap.has(t))
    .map(t => {
      const { sales, dealers } = tierMap.get(t) ?? { sales: 0, dealers: new Set<string>() };
      const dealerCount = dealers.size;
      const avgSalesPerDealer = dealerCount > 0 ? sales / dealerCount : 0;
      const cmp = cmpTierMap.get(t);
      const prevSales = cmp?.sales ?? 0;
      const prevDealerCount = cmp?.dealers.size ?? 0;
      const avgPrevSalesPerDealer = prevDealerCount > 0 ? prevSales / prevDealerCount : 0;

      // How many dealers in this tier sold below/at/above the tier's own average —
      // shows whether the average is pulled up by a few big accounts or is broadly
      // representative. "At" uses whole-baht rounding so float division noise (e.g.
      // 1000.0000000002) doesn't split ties that are really equal into below/above.
      let belowAvgCount = 0;
      let atAvgCount = 0;
      let aboveAvgCount = 0;
      const dealerSales = dealerSalesByTier.get(t);
      const dealerRows: TierDealerRow[] = [];
      const roundedAvg = Math.round(avgSalesPerDealer);
      if (dealerSales && avgSalesPerDealer > 0) {
        for (const [customerId, d] of dealerSales) {
          const roundedSales = Math.round(d.sales);
          if (roundedSales < roundedAvg) belowAvgCount++;
          else if (roundedSales > roundedAvg) aboveAvgCount++;
          else atAvgCount++;
          dealerRows.push({ customerId, customerName: d.customerName, sales: d.sales });
        }
        dealerRows.sort((a, b) => b.sales - a.sales);
      }

      return {
        tier: t,
        sales,
        salesPct: totalSales > 0 ? (sales / totalSales) * 100 : 0,
        dealerCount,
        avgSalesPerDealer,
        belowAvgCount,
        atAvgCount,
        aboveAvgCount,
        dealers: dealerRows,
        prevSales,
        salesMomPct: pct(sales, prevSales),
        prevDealerCount,
        dealerCountMomPct: pct(dealerCount, prevDealerCount),
        avgPrevSalesPerDealer,
        avgMomPct: pct(avgSalesPerDealer, avgPrevSalesPerDealer),
      };
    });

  // Order size distribution: each dealer's typical monthly case volume (known tiers
  // only) = total cases ÷ number of distinct calendar months they actually bought in
  // within the selected range. This keeps the bucket meaning "cases per month" even
  // when a multi-month range (e.g. a quarter) is selected — a dealer active in only
  // 1 of the 3 months lands in the bucket for their real monthly total (e.g. "40 ลัง"),
  // instead of that total being diluted by dividing by all 3 months in the range
  // regardless of whether they bought anything in the other two.
  const dealerVolume = new Map<string, { tier: TierKnown; totalCases: number; months: Set<string> }>();
  for (const r of monthRows) {
    if (!['A', 'B', 'C', 'D'].includes(r.Tier)) continue;
    const tier = r.Tier as TierKnown;
    if (!dealerVolume.has(r.CUSTOMER_ID)) {
      dealerVolume.set(r.CUSTOMER_ID, { tier, totalCases: 0, months: new Set() });
    }
    const dv = dealerVolume.get(r.CUSTOMER_ID)!;
    dv.totalCases += r.cases;
    dv.months.add(r.YYYYMM);
  }

  // Tier totals for % calculation
  const tierTotals = new Map<TierKnown, number>();
  for (const { tier } of dealerVolume.values()) {
    tierTotals.set(tier, (tierTotals.get(tier) || 0) + 1);
  }

  const orderSizeDistribution: OrderSizeRow[] = ORDER_SIZE_RANGES.map(range => {
    const counts: Partial<Record<TierKnown, number>> = {};
    for (const { tier, totalCases, months } of dealerVolume.values()) {
      // Round to the nearest whole case so fractional averages (e.g. 40.1) still land
      // in a bucket — otherwise a dealer falls through the integer rows and the
      // per-tier column stops summing to 100%.
      const rounded = Math.round(totalCases / months.size);
      if (rounded >= range.min && rounded <= range.max) {
        counts[tier] = (counts[tier] || 0) + 1;
      }
    }
    const pcts: Partial<Record<TierKnown, number>> = {};
    for (const [t, cnt] of Object.entries(counts) as [TierKnown, number][]) {
      pcts[t] = ((cnt / (tierTotals.get(t) || 1)) * 100);
    }
    return { ...range, counts, pcts };
  });

  // Named dealers currently bucketed as "Unknown" tier in this range — lets the
  // page tell the user exactly which stores need a tier assigned, not just a count.
  const unknownMap = new Map<string, { customerName: string; sales: number }>();
  for (const r of monthRows) {
    if (r.Tier !== 'Unknown') continue;
    if (!unknownMap.has(r.CUSTOMER_ID)) unknownMap.set(r.CUSTOMER_ID, { customerName: r.CUSTOMER_NAME, sales: 0 });
    unknownMap.get(r.CUSTOMER_ID)!.sales += r.NET_AMOUNT;
  }
  const unknownDealers = Array.from(unknownMap.entries())
    .map(([customerId, v]) => ({ customerId, customerName: v.customerName, sales: v.sales }))
    .sort((a, b) => b.sales - a.sales);

  return { tiers, orderSizeDistribution, totalSales, unknownDealers };
}

// Invoice-value ("bill size") distribution — how big a typical order is in ฿,
// as opposed to orderSizeDistribution above which buckets by case count per
// dealer for the whole period. Buckets by NET_AMOUNT summed per INV_NO.
export function aggregateBillSizeDistribution(
  rows: NormalizedRow[],
  from: string,
  to: string
): BillSizeDistributionData {
  const monthRows = rows.filter(r => r.INV_DATE >= from && r.INV_DATE <= to);

  const invoiceTotals = new Map<string, number>();
  for (const r of monthRows) {
    invoiceTotals.set(r.INV_NO, (invoiceTotals.get(r.INV_NO) ?? 0) + r.NET_AMOUNT);
  }
  const invoiceValues = [...invoiceTotals.values()];
  const totalInvoices = invoiceValues.length;
  const totalSales = invoiceValues.reduce((s, v) => s + v, 0);

  const buckets: BillSizeRow[] = BILL_SIZE_RANGES.map(range => {
    const inBucket = invoiceValues.filter(v => v >= range.min && v < range.max);
    const sales = inBucket.reduce((s, v) => s + v, 0);
    return {
      label: range.label,
      min: range.min,
      max: range.max,
      invoiceCount: inBucket.length,
      invoiceCountPct: totalInvoices > 0 ? (inBucket.length / totalInvoices) * 100 : 0,
      sales,
      salesPct: totalSales > 0 ? (sales / totalSales) * 100 : 0,
      avgPerInvoice: inBucket.length > 0 ? sales / inBucket.length : 0,
    };
  });

  return { buckets, totalInvoices, totalSales };
}

export function aggregateSkuBreakdown(
  rows: NormalizedRow[],
  from: string,
  to: string
): SkuBreakdownData {
  const monthRows = rows.filter(r => r.INV_DATE >= from && r.INV_DATE <= to);
  // Previous period: the same dates one month earlier (month-over-month)
  const prevFrom = addMonthsPreserveDay(from, -1);
  const prevTo = addMonthsPreserveDay(to, -1);
  const prevRows = rows.filter(r => r.INV_DATE >= prevFrom && r.INV_DATE <= prevTo);
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

/**
 * Sales split by battery product line (MF / Quadflex / Pro LITHIUM). Input is
 * the same gross, core-zone rowset every other page uses, so the type totals
 * add up to the Overview page's sales figure for the same range.
 */
export function aggregateBatteryTypes(
  rows: NormalizedRow[],
  from: string,
  to: string,
  // Return-inclusive rowsets feeding the dealer-vs-online split (which is net).
  net: { dealerRows: NormalizedRow[]; onlineRows: NormalizedRow[] },
): BatteryTypeData {
  const keys: BatteryTypeKey[] = [...BATTERY_TYPES.map(t => t.key), BATTERY_TYPE_OTHER.key];
  const meta = new Map<BatteryTypeKey, { label: string; color: string }>([
    ...BATTERY_TYPES.map(t => [t.key, { label: t.label, color: t.color }] as const),
    [BATTERY_TYPE_OTHER.key, { label: BATTERY_TYPE_OTHER.label, color: BATTERY_TYPE_OTHER.color }],
  ]);

  const rangeRows = rows.filter(r => r.INV_DATE >= from && r.INV_DATE <= to);
  // Previous period: same dates one month earlier (same convention as the SKU page)
  const prevFrom = addMonthsPreserveDay(from, -1);
  const prevTo = addMonthsPreserveDay(to, -1);
  const prevRows = rows.filter(r => r.INV_DATE >= prevFrom && r.INV_DATE <= prevTo);

  const totalSales = rangeRows.reduce((s, r) => s + r.NET_AMOUNT, 0);
  const totalUnits = rangeRows.reduce((s, r) => s + r.QTY, 0);
  const activeDealers = new Set(rangeRows.map(r => r.CUSTOMER_ID)).size;

  const groupByType = (list: NormalizedRow[]) => {
    const g = new Map<BatteryTypeKey, NormalizedRow[]>(keys.map(k => [k, []]));
    for (const r of list) g.get(classifyBatteryType(r.ITEM_DESC))!.push(r);
    return g;
  };
  const rangeByType = groupByType(rangeRows);
  const prevByType = groupByType(prevRows);

  const types: BatteryTypeRow[] = keys.map(key => {
    const tr = rangeByType.get(key)!;
    const sales = tr.reduce((s, r) => s + r.NET_AMOUNT, 0);
    const units = tr.reduce((s, r) => s + r.QTY, 0);
    const invoiceCount = new Set(tr.map(r => r.INV_NO)).size;
    const dealerCount = new Set(tr.map(r => r.CUSTOMER_ID)).size;
    const prevSales = prevByType.get(key)!.reduce((s, r) => s + r.NET_AMOUNT, 0);

    const tierSales: Partial<Record<Tier, number>> = {};
    const skuMap = new Map<string, { desc: string; sales: number; units: number; cases: number }>();
    for (const r of tr) {
      tierSales[r.Tier] = (tierSales[r.Tier] ?? 0) + r.NET_AMOUNT;
      const s = skuMap.get(r.ITEM_ID) ?? { desc: r.ITEM_DESC, sales: 0, units: 0, cases: 0 };
      s.sales += r.NET_AMOUNT;
      s.units += r.QTY;
      s.cases += r.cases;
      skuMap.set(r.ITEM_ID, s);
    }
    const skus: BatteryTypeSku[] = [...skuMap.entries()]
      .map(([itemId, s]) => ({
        itemId, itemDesc: s.desc, model: batteryModelName(s.desc),
        sales: s.sales, units: s.units, cases: s.cases,
        salesPct: sales > 0 ? (s.sales / sales) * 100 : 0,
      }))
      .sort((a, b) => b.sales - a.sales);

    return {
      key, label: meta.get(key)!.label, color: meta.get(key)!.color,
      sales,
      salesPct: totalSales > 0 ? (sales / totalSales) * 100 : 0,
      units,
      cases: tr.reduce((s, r) => s + r.cases, 0),
      invoiceCount,
      avgPerInvoice: invoiceCount > 0 ? sales / invoiceCount : 0,
      dealerCount,
      dealerPct: activeDealers > 0 ? (dealerCount / activeDealers) * 100 : 0,
      prevSales,
      momPct: prevSales > 0 ? ((sales - prevSales) / prevSales) * 100 : null,
      tierSales,
      skus,
    };
  }).filter(t => t.key !== 'other' || t.sales > 0);

  // Monthly mix — same 6-month window as the trend page.
  const last6 = [...new Set(rows.map(r => r.YYYYMM))].sort().slice(-6);
  const months: BatteryTypeMonth[] = last6.map(yyyymm => {
    const sales = Object.fromEntries(keys.map(k => [k, 0])) as Record<BatteryTypeKey, number>;
    let total = 0;
    for (const r of rows) {
      if (r.YYYYMM !== yyyymm) continue;
      sales[classifyBatteryType(r.ITEM_DESC)] += r.NET_AMOUNT;
      total += r.NET_AMOUNT;
    }
    const salesPct = Object.fromEntries(
      keys.map(k => [k, total > 0 ? (sales[k] / total) * 100 : 0]),
    ) as Record<BatteryTypeKey, number>;
    return { month: yyyymm, label: formatMonthLabel(yyyymm), total, sales, salesPct };
  });

  // Dealer (core zones) vs online, per product line — NET of returns on both
  // sides, so the columns and the total share one basis (the top of the page is
  // gross; the page labels this section). Every line with any activity in either
  // channel gets a row, so nothing is dropped from the all-channel total.
  const channels = Object.values(ONLINE_ZONE_LABELS);
  const inRange = (r: NormalizedRow) => r.INV_DATE >= from && r.INV_DATE <= to;
  const dealerNetRows = net.dealerRows.filter(inRange);
  const onlineNetRows = net.onlineRows.filter(inRange);
  const dealerNetByType = groupByType(dealerNetRows);
  const onlineNetByType = groupByType(onlineNetRows);

  const splitRows: BatteryTypeChannelRow[] = keys.map(key => {
    const dr = dealerNetByType.get(key)!;
    const or = onlineNetByType.get(key)!;
    const byChannel: Record<string, number> = Object.fromEntries(channels.map(c => [c, 0]));
    for (const r of or) byChannel[ONLINE_ZONE_LABELS[r.ZONE_ID]] += r.NET_AMOUNT;
    const onlineSales = or.reduce((s, r) => s + r.NET_AMOUNT, 0);
    const dealerSales = dr.reduce((s, r) => s + r.NET_AMOUNT, 0);
    const total = dealerSales + onlineSales;
    return {
      key, label: meta.get(key)!.label, color: meta.get(key)!.color,
      dealerSales, onlineSales,
      onlineUnits: or.reduce((s, r) => s + r.QTY, 0),
      totalSales: total,
      totalPct: 0, // filled below once the all-channel total is known
      onlinePct: total > 0 ? (onlineSales / total) * 100 : 0,
      byChannel,
    };
    // 'other' can be negative here (e.g. returns of discontinued GEL stock), so keep it whenever non-zero.
  }).filter(r => r.key !== 'other' || r.totalSales !== 0);

  const splitDealer = splitRows.reduce((s, r) => s + r.dealerSales, 0);
  const splitOnline = splitRows.reduce((s, r) => s + r.onlineSales, 0);
  const splitTotal = splitDealer + splitOnline;
  for (const r of splitRows) r.totalPct = splitTotal > 0 ? (r.totalSales / splitTotal) * 100 : 0;
  const splitByChannel: Record<string, number> = Object.fromEntries(
    channels.map(c => [c, splitRows.reduce((s, r) => s + r.byChannel[c], 0)]),
  );

  return {
    totalSales, totalUnits, activeDealers, types, months,
    channelSplit: {
      channels, rows: splitRows,
      dealerSales: splitDealer, onlineSales: splitOnline, totalSales: splitTotal,
      onlinePct: splitTotal > 0 ? (splitOnline / splitTotal) * 100 : 0,
      byChannel: splitByChannel,
      dealerReturns: sumReturns(dealerNetRows),
      onlineReturns: sumReturns(onlineNetRows),
    },
  };
}

// A "real sale" row — the only rows that count toward orders/buyers/dealers.
// Everything else in a return-inclusive rowset is a return/claim (or a zero-value
// freebie line).
const isSaleRow = (r: NormalizedRow) => r.QTY > 0 && r.NET_AMOUNT > 0;

/** Amount deducted by returns/claims in a return-inclusive rowset, as a positive number. */
function sumReturns(rows: NormalizedRow[]): number {
  return -rows.filter(r => !isSaleRow(r)).reduce((s, r) => s + r.NET_AMOUNT, 0);
}

/**
 * Online-channel sales (Lazada / Shopee / TikTok / Facebook) for [from, to],
 * ALWAYS NET of returns/claims (user rule, 2026-09-24): pass the return-inclusive
 * online rowset. Sales/units/cases sum every row given, so returns come off the
 * month they are booked in; returnAmount reports what was deducted. Order and
 * buyer counts only look at real sale rows, so a return invoice never inflates
 * "orders" — same "counts never net" rule as the dealer counts elsewhere.
 */
export function aggregateOnlineSales(
  rows: NormalizedRow[],
  from: string,
  to: string,
): OnlineSalesData {
  const prevFrom = addMonthsPreserveDay(from, -1);
  const prevTo = addMonthsPreserveDay(to, -1);
  const inRange = rows.filter(r => r.INV_DATE >= from && r.INV_DATE <= to);
  const prevRows = rows.filter(r => r.INV_DATE >= prevFrom && r.INV_DATE <= prevTo);
  const isSale = isSaleRow;
  const sumSales = (list: NormalizedRow[]) => list.reduce((s, r) => s + r.NET_AMOUNT, 0);

  const totalSales = sumSales(inRange);
  const prevSales = sumSales(prevRows);

  const channels: OnlineChannelSummary[] = Object.entries(ONLINE_ZONE_LABELS).map(([zoneId, channel]) => {
    const cr = inRange.filter(r => r.ZONE_ID === zoneId);
    const sales = sumSales(cr);
    const chPrev = sumSales(prevRows.filter(r => r.ZONE_ID === zoneId));
    const saleRows = cr.filter(isSale);
    return {
      zoneId, channel, sales,
      returnAmount: sumReturns(cr),
      salesPct: totalSales > 0 ? (sales / totalSales) * 100 : 0,
      units: cr.reduce((s, r) => s + r.QTY, 0),
      cases: cr.reduce((s, r) => s + r.cases, 0),
      orderCount: new Set(saleRows.map(r => r.INV_NO)).size,
      buyerCount: new Set(saleRows.map(r => r.CUSTOMER_ID)).size,
      prevSales: chPrev,
      momPct: chPrev > 0 ? ((sales - chPrev) / chPrev) * 100 : null,
    };
  });

  const saleRows = inRange.filter(isSale);
  const orderCount = new Set(saleRows.map(r => r.INV_NO)).size;
  return {
    fromDate: from, toDate: to,
    totalSales,
    returnAmount: sumReturns(inRange),
    totalUnits: inRange.reduce((s, r) => s + r.QTY, 0),
    totalCases: inRange.reduce((s, r) => s + r.cases, 0),
    orderCount,
    avgOrderValue: orderCount > 0 ? totalSales / orderCount : 0,
    buyerCount: new Set(saleRows.map(r => r.CUSTOMER_ID)).size,
    prevSales,
    momPct: prevSales > 0 ? ((totalSales - prevSales) / prevSales) * 100 : null,
    channels,
  };
}

export function aggregateDealerHealth(
  filteredRows: NormalizedRow[],
  allBatteryDomesticRows: RawDataRow[],
  from: string,
  to: string
): DealerHealthData {
  // Window bounds as UTC-midnight Dates (INV_DATE is ISO, parseDate uses new Date()).
  const monthStart = new Date(from);
  const monthEnd = new Date(to);

  const monthRows = filteredRows.filter(r => r.INV_DATE >= from && r.INV_DATE <= to);
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

  // Returning: active + no invoice in the same dates one month earlier + not new
  const prevFrom = addMonthsPreserveDay(from, -1);
  const prevTo = addMonthsPreserveDay(to, -1);
  const prevMonthDealers = new Set(
    filteredRows.filter(r => r.INV_DATE >= prevFrom && r.INV_DATE <= prevTo).map((r: NormalizedRow) => r.CUSTOMER_ID)
  );
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

// Dealer-level sales with per-SKU breakdown, restricted to known tiers A/B/C
// (Tier D and Unknown are excluded from this view entirely).
export function aggregateDealerSales(
  rows: NormalizedRow[],
  from: string,
  to: string
): DealerSalesData {
  const monthRows = rows.filter(r =>
    r.INV_DATE >= from && r.INV_DATE <= to &&
    (r.Tier === 'A' || r.Tier === 'B' || r.Tier === 'C')
  );

  const dealerMap = new Map<string, {
    name: string; tier: TierKnown;
    sales: number; units: number; cases: number;
    lastDate: string | null;
    skuMap: Map<string, { desc: string; qty: number; cases: number; net: number }>;
  }>();

  for (const r of monthRows) {
    if (!dealerMap.has(r.CUSTOMER_ID)) {
      dealerMap.set(r.CUSTOMER_ID, {
        name: r.CUSTOMER_NAME, tier: r.Tier as TierKnown,
        sales: 0, units: 0, cases: 0, lastDate: null,
        skuMap: new Map(),
      });
    }
    const d = dealerMap.get(r.CUSTOMER_ID)!;
    d.sales += r.NET_AMOUNT;
    d.units += r.QTY;
    d.cases += r.cases;
    if (!d.lastDate || r.INV_DATE > d.lastDate) d.lastDate = r.INV_DATE;

    const sku = d.skuMap.get(r.ITEM_ID);
    if (sku) {
      sku.qty += r.QTY;
      sku.cases += r.cases;
      sku.net += r.NET_AMOUNT;
    } else {
      d.skuMap.set(r.ITEM_ID, { desc: r.ITEM_DESC, qty: r.QTY, cases: r.cases, net: r.NET_AMOUNT });
    }
  }

  const dealers: DealerSaleRow[] = Array.from(dealerMap.entries())
    .map(([customerId, d]) => ({
      customerId,
      customerName: d.name,
      tier: d.tier,
      totalSales: d.sales,
      totalUnits: d.units,
      totalCases: d.cases,
      skuCount: d.skuMap.size,
      lastInvoiceDate: d.lastDate,
      skus: Array.from(d.skuMap.entries())
        .map(([itemId, s]) => ({ itemId, itemDesc: s.desc, qty: s.qty, cases: s.cases, netAmount: s.net }))
        .sort((a, b) => b.netAmount - a.netAmount),
    }))
    .sort((a, b) => b.totalSales - a.totalSales);

  const dealerCountByTier: Partial<Record<TierKnown, number>> = {};
  for (const d of dealers) {
    dealerCountByTier[d.tier] = (dealerCountByTier[d.tier] || 0) + 1;
  }

  const summary: DealerSalesSummary = {
    activeDealers: dealers.length,
    totalSales: dealers.reduce((s, d) => s + d.totalSales, 0),
    totalUnits: dealers.reduce((s, d) => s + d.totalUnits, 0),
    totalCases: dealers.reduce((s, d) => s + d.totalCases, 0),
    dealerCountByTier,
  };

  return { summary, dealers };
}

// Per-dealer, per-month breakdown for a single zone's rows — powers the
// drill-down under each zone row: how many customers, and each customer's
// units/sales per month within the selected range.
function buildZoneDealers(zoneRows: NormalizedRow[]): ZoneDealerRow[] {
  const dealerMap = new Map<string, {
    name: string; tier: Tier;
    sales: number; units: number; cases: number;
    invoices: Set<string>; lastDate: string | null;
    monthMap: Map<string, { sales: number; units: number; cases: number; invoices: Set<string> }>;
  }>();

  for (const r of zoneRows) {
    if (!dealerMap.has(r.CUSTOMER_ID)) {
      dealerMap.set(r.CUSTOMER_ID, {
        name: r.CUSTOMER_NAME, tier: r.Tier,
        sales: 0, units: 0, cases: 0, invoices: new Set(), lastDate: null,
        monthMap: new Map(),
      });
    }
    const d = dealerMap.get(r.CUSTOMER_ID)!;
    d.sales += r.NET_AMOUNT;
    d.units += r.QTY;
    d.cases += r.cases;
    d.invoices.add(r.INV_NO);
    if (!d.lastDate || r.INV_DATE > d.lastDate) d.lastDate = r.INV_DATE;

    if (!d.monthMap.has(r.YYYYMM)) d.monthMap.set(r.YYYYMM, { sales: 0, units: 0, cases: 0, invoices: new Set() });
    const m = d.monthMap.get(r.YYYYMM)!;
    m.sales += r.NET_AMOUNT;
    m.units += r.QTY;
    m.cases += r.cases;
    m.invoices.add(r.INV_NO);
  }

  return Array.from(dealerMap.entries())
    .map(([customerId, d]) => ({
      customerId,
      customerName: d.name,
      tier: d.tier,
      totalSales: d.sales,
      totalUnits: d.units,
      totalCases: d.cases,
      invoiceCount: d.invoices.size,
      lastInvoiceDate: d.lastDate,
      months: Array.from(d.monthMap.entries())
        .map(([month, m]) => ({
          month,
          label: formatMonthLabel(month),
          sales: m.sales,
          units: m.units,
          cases: m.cases,
          invoiceCount: m.invoices.size,
        }))
        .sort((a, b) => a.month.localeCompare(b.month)),
    }))
    .sort((a, b) => b.totalSales - a.totalSales);
}

// Sales broken down by ZONE_ID: core dealer zones the user manages directly,
// vs. online channels (Lazada/Shopee/TikTok/Facebook), vs. everything else
// (other teams' territory, unmapped zones).
//
// `rows` is the gross all-zone rowset (total / core / other stay gross, as they
// always were). Online channels are reported NET of returns, from `onlineNetRows`
// (return-inclusive, online zones only) — see aggregateOnlineSales. Because the
// two bases differ, the online figures are never expressed as a % of the gross
// total.
export function aggregateZoneSales(
  rows: NormalizedRow[],
  from: string,
  to: string,
  onlineNetRows: NormalizedRow[],
): ZoneSalesData {
  const monthRows = rows.filter(r => r.INV_DATE >= from && r.INV_DATE <= to);
  const totalSales = monthRows.reduce((s, r) => s + r.NET_AMOUNT, 0);

  const zoneMap = new Map<string, { sales: number; units: number; cases: number; dealers: Set<string>; invoices: Set<string> }>();
  for (const r of monthRows) {
    const zone = r.ZONE_ID;
    if (!zoneMap.has(zone)) zoneMap.set(zone, { sales: 0, units: 0, cases: 0, dealers: new Set(), invoices: new Set() });
    const z = zoneMap.get(zone)!;
    z.sales += r.NET_AMOUNT;
    z.units += r.QTY;
    z.cases += r.cases;
    z.dealers.add(r.CUSTOMER_ID);
    z.invoices.add(r.INV_NO);
  }

  const zones: ZoneBreakdownRow[] = CORE_ZONES
    .filter(z => zoneMap.has(z))
    .map(z => {
      const d = zoneMap.get(z)!;
      return {
        zoneId: z,
        sales: d.sales,
        salesPct: totalSales > 0 ? (d.sales / totalSales) * 100 : 0,
        units: d.units,
        cases: d.cases,
        dealerCount: d.dealers.size,
        invoiceCount: d.invoices.size,
        dealers: buildZoneDealers(monthRows.filter(r => r.ZONE_ID === z)),
      };
    })
    .sort((a, b) => b.sales - a.sales);

  // Online, net of returns. Only channels with any activity in the range are listed.
  const online = aggregateOnlineSales(onlineNetRows, from, to);
  const onlineChannels: OnlineChannelRow[] = online.channels
    .filter(c => c.sales !== 0 || c.returnAmount !== 0 || c.orderCount > 0)
    .sort((a, b) => b.sales - a.sales);

  const coreZoneSales = zones.reduce((s, z) => s + z.sales, 0);
  // "Other" = whatever is in the gross total that is neither core nor online.
  // Subtract the GROSS online amount here — subtracting the net one would leak
  // the online returns into "other".
  const onlineGross = ONLINE_ZONE_IDS.reduce((s, z) => s + (zoneMap.get(z)?.sales ?? 0), 0);
  const otherSales = totalSales - coreZoneSales - onlineGross;

  return {
    totalSales, coreZoneSales, otherSales,
    onlineSales: online.totalSales,
    onlineReturns: online.returnAmount,
    zones, onlineChannels,
  };
}

// Per-zone trend across a whole year, bucketed by month or quarter — lets the
// user see whether a zone's sales/dealer count is growing or shrinking over
// time, plus its top-selling SKUs for the whole selected period. Core zones
// only (same scope as the "เขตหลักที่ดูแล" table in aggregateZoneSales).
export function aggregateZoneTrend(
  rows: NormalizedRow[],
  year: number,
  granularity: TrendGranularity
): ZoneTrendData {
  const yearRows = rows.filter(r => r.YYYYMM.startsWith(String(year)) && CORE_ZONES.includes(r.ZONE_ID));

  function periodOf(r: NormalizedRow): { key: string; label: string } {
    const m = Number(r.YYYYMM.slice(4, 6));
    if (granularity === 'month') {
      return { key: r.YYYYMM, label: THAI_MONTHS_SHORT[m - 1] };
    }
    const q = Math.floor((m - 1) / 3) + 1;
    return { key: `${year}-Q${q}`, label: `Q${q}` };
  }

  const periodLabels = new Map<string, string>();
  for (const r of yearRows) {
    const { key, label } = periodOf(r);
    periodLabels.set(key, label);
  }
  const periods = [...periodLabels.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([period, label]) => ({ period, label }));

  const zoneIds = CORE_ZONES.filter(z => yearRows.some(r => r.ZONE_ID === z));

  const zones: ZoneTrendRow[] = zoneIds.map(zoneId => {
    const zoneRows = yearRows.filter(r => r.ZONE_ID === zoneId);

    const periodMap = new Map<string, { sales: number; units: number; cases: number; dealers: Set<string> }>();
    for (const r of zoneRows) {
      const { key } = periodOf(r);
      if (!periodMap.has(key)) periodMap.set(key, { sales: 0, units: 0, cases: 0, dealers: new Set() });
      const p = periodMap.get(key)!;
      p.sales += r.NET_AMOUNT;
      p.units += r.QTY;
      p.cases += r.cases;
      p.dealers.add(r.CUSTOMER_ID);
    }

    const points: ZoneTrendPoint[] = periods.map(({ period, label }) => {
      const p = periodMap.get(period);
      return {
        period, label,
        sales: p?.sales ?? 0,
        dealerCount: p?.dealers.size ?? 0,
        units: p?.units ?? 0,
        cases: p?.cases ?? 0,
      };
    });

    const totalSales = zoneRows.reduce((s, r) => s + r.NET_AMOUNT, 0);
    const periodDealerCount = new Set(zoneRows.map(r => r.CUSTOMER_ID)).size;

    // Trend: average sales of the second half of periods vs. the first half
    // (middle point dropped when the count is odd) — smooths single-month
    // noise better than a first-vs-last comparison.
    const n = points.length;
    const half = Math.floor(n / 2);
    let trendPct: number | null = null;
    if (n >= 2) {
      const firstHalf = points.slice(0, half);
      const secondHalf = points.slice(n - half);
      const avgFirst = firstHalf.reduce((s, p) => s + p.sales, 0) / firstHalf.length;
      const avgSecond = secondHalf.reduce((s, p) => s + p.sales, 0) / secondHalf.length;
      trendPct = avgFirst > 0 ? ((avgSecond - avgFirst) / avgFirst) * 100 : null;
    }

    const skuMap = new Map<string, { desc: string; sales: number; cases: number }>();
    for (const r of zoneRows) {
      if (!skuMap.has(r.ITEM_ID)) skuMap.set(r.ITEM_ID, { desc: r.ITEM_DESC, sales: 0, cases: 0 });
      const s = skuMap.get(r.ITEM_ID)!;
      s.sales += r.NET_AMOUNT;
      s.cases += r.cases;
    }
    const topSkus: ZoneTrendSkuRow[] = Array.from(skuMap.entries())
      .map(([itemId, d]) => ({ itemId, itemDesc: d.desc, sales: d.sales, cases: d.cases }))
      .sort((a, b) => b.sales - a.sales)
      .slice(0, 3);

    return { zoneId, points, totalSales, periodDealerCount, trendPct, topSkus };
  }).sort((a, b) => b.totalSales - a.totalSales);

  return { year, granularity, periods, zones };
}
