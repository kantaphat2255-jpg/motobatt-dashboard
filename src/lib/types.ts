export type Tier = 'A' | 'B' | 'C' | 'D' | 'Unknown';
export type TierKnown = 'A' | 'B' | 'C' | 'D';

export interface RawDataRow {
  INV_NO: string;
  INV_DATE: string;
  YYYYMM: string;
  ITEM_ID: string;
  ITEM_DESC: string;
  CATEGORY: string;
  QTY: number;
  NET_AMOUNT: number;
  CUSTOMER_ID: string;
  CUSTOMER_NAME: string;
  SALE_TYPE: string;
  SALE_TYPE1: string;
  ZONE_ID: string;
}

export interface DealerMaster {
  CUSTOMER_ID: string;
  CUSTOMER_NAME: string;
  Tier: TierKnown;
}

export interface NormalizedRow extends RawDataRow {
  Tier: Tier;
  cases: number;
}

export interface SheetRawData {
  dataRows: string[][];
  dealerRows: string[][];
}

export interface DataMeta {
  fetchedAt: string;
  totalRawRows: number;
  validRows: number;
  invalidRows: number;
  latestMonth: string;
  tierJoinFailCount: number;
  tierJoinFailIds: string[];
  availableMonths: string[];
  minDate: string;
  maxDate: string;
  rangeFrom: string;
  rangeTo: string;
}

export interface MonthlyOverviewData {
  fromDate: string;
  toDate: string;
  mtdSales: number;
  target: number | null;
  achievementPct: number | null;
  mtdUnits: number;
  mtdCases: number;
  activeDealers: number;
  invoiceCount: number;
  avgOrderValue: number;
  momPct: number | null;
  prevMonthSales: number;
  projectedMonthEnd: number;
  requiredDailyOrGap: number;
  isOngoing: boolean;
  daysElapsed: number;
  daysTotal: number;
  daysRemaining: number;
}

export interface TierSummary {
  tier: Tier;
  sales: number;
  salesPct: number;
  dealerCount: number;
  avgSalesPerDealer: number;
  belowAvgCount: number;
  atAvgCount: number;
  aboveAvgCount: number;
  dealers: TierDealerRow[];
  prevSales: number;
  salesMomPct: number | null;
  prevDealerCount: number;
  dealerCountMomPct: number | null;
  avgPrevSalesPerDealer: number;
  avgMomPct: number | null;
}

export interface TierDealerRow {
  customerId: string;
  customerName: string;
  sales: number;
}

export interface UnknownTierDealer {
  customerId: string;
  customerName: string;
  sales: number;
}

export interface OrderSizeRow {
  label: string;
  min: number;
  max: number;
  counts: Partial<Record<TierKnown, number>>;
  pcts: Partial<Record<TierKnown, number>>;
}

export interface TierAnalysisData {
  tiers: TierSummary[];
  orderSizeDistribution: OrderSizeRow[];
  totalSales: number;
  unknownDealers: UnknownTierDealer[];
}

export interface BillSizeRow {
  label: string;
  min: number;
  max: number;
  invoiceCount: number;
  invoiceCountPct: number;
  sales: number;
  salesPct: number;
  avgPerInvoice: number;
}

export interface BillSizeDistributionData {
  buckets: BillSizeRow[];
  totalInvoices: number;
  totalSales: number;
}

export interface SkuData {
  itemId: string;
  itemDesc: string;
  sales: number;
  units: number;
  cases: number;
  salesPct: number;
  momPct: number | null;
  prevSales: number | null;
}

export interface SkuBreakdownData {
  skus: SkuData[];
  top5: SkuData[];
  growing: SkuData[];
  declining: SkuData[];
}

export interface DealerSkuSummary {
  itemId: string;
  itemDesc: string;
  units: number;
  cases: number;
}

export interface DealerInfo {
  customerId: string;
  customerName: string;
  tier: Tier;
  sales: number;
  units: number;
  cases: number;
  invoiceCount: number;
  lastInvoiceDate: string | null;
  skus: DealerSkuSummary[];
}

export interface DealerHealthData {
  activeCount: number;
  newCount: number;
  returningCount: number;
  atRiskCount: number;
  lostCount: number;
  top10: DealerInfo[];
  atRisk: DealerInfo[];
  newDealers: DealerInfo[];
}

export interface TrendMonthData {
  month: string;
  label: string;
  sales: number;
  target: number | null;
  tierSales: Partial<Record<TierKnown, number>>;
  tierSalesPct: Partial<Record<TierKnown, number>>;
  activeDealers: number;
  invoiceCount: number;
  avgOrderValue: number;
  tierAvgOrderValue: Partial<Record<TierKnown, number>>;
}

export interface TrendData {
  months: TrendMonthData[];
  cumulativeSales: number;
  cumulativeTarget: number;
}

// --- Battery Type (MF / Quadflex / Pro LITHIUM) ---
export type BatteryTypeKey = 'mf' | 'quadflex' | 'lithium' | 'other';

export interface BatteryTypeSku {
  itemId: string;
  itemDesc: string;
  model: string;      // model code only, e.g. 'YTZ5S'
  sales: number;
  units: number;
  cases: number;
  salesPct: number;   // % of this type's sales
}

export interface BatteryTypeRow {
  key: BatteryTypeKey;
  label: string;
  color: string;
  sales: number;
  salesPct: number;        // % of all battery sales in range
  units: number;
  cases: number;
  invoiceCount: number;
  avgPerInvoice: number;
  dealerCount: number;     // distinct dealers who bought this type (overlaps across types)
  dealerPct: number;       // dealerCount / all active dealers in range
  prevSales: number;
  momPct: number | null;
  tierSales: Partial<Record<Tier, number>>;
  skus: BatteryTypeSku[];
}

export interface BatteryTypeMonth {
  month: string;
  label: string;
  total: number;
  sales: Record<BatteryTypeKey, number>;
  salesPct: Record<BatteryTypeKey, number>;
}

// One product line across sales channels: dealers (core zones) vs each online channel.
export interface BatteryTypeChannelRow {
  key: BatteryTypeKey;
  label: string;
  color: string;
  dealerSales: number;
  onlineSales: number;
  onlineUnits: number;
  totalSales: number;               // dealer + online
  totalPct: number;                 // share of the all-channel total
  onlinePct: number;                // online share within this line
  byChannel: Record<string, number>; // online channel label -> sales
}

// NET of returns/claims for every channel in this split (dealers included, so
// the columns never mix bases). dealerReturns/onlineReturns are the amounts that
// were deducted, shown as positive numbers.
export interface BatteryTypeChannelSplit {
  channels: string[];               // online channel labels, display order
  rows: BatteryTypeChannelRow[];
  dealerSales: number;
  onlineSales: number;
  totalSales: number;
  onlinePct: number;
  byChannel: Record<string, number>;
  dealerReturns: number;
  onlineReturns: number;
}

export interface BatteryTypeData {
  totalSales: number;            // dealer (core-zone) scope, same as Overview
  totalUnits: number;
  activeDealers: number;
  types: BatteryTypeRow[];       // mf, quadflex, lithium always; 'other' only if it has sales
  months: BatteryTypeMonth[];    // last 6 months of data (same window as the trend page)
  channelSplit: BatteryTypeChannelSplit;
}

// --- Online sales (Lazada / Shopee / TikTok / Facebook) ---
export interface OnlineChannelSummary extends OnlineChannelRow {
  prevSales: number;
  momPct: number | null;
}

// Online sales are always NET of returns/claims (user rule, 2026-09-24): sales
// and units include return rows (negative), returnAmount is what was deducted
// (positive). Order/buyer counts only look at real sale rows.
export interface OnlineSalesData {
  fromDate: string;
  toDate: string;
  totalSales: number;
  returnAmount: number;
  totalUnits: number;
  totalCases: number;
  orderCount: number;
  avgOrderValue: number;
  buyerCount: number;
  prevSales: number;               // same dates one month earlier
  momPct: number | null;
  channels: OnlineChannelSummary[]; // every channel, fixed order, zero-sales ones included
}

export interface DashboardApiResponse {
  meta: DataMeta;
  overview: MonthlyOverviewData;
  overviewCompare: MonthlyOverviewData | null;
  overviewNet: MonthlyOverviewData;
  overviewNetCompare: MonthlyOverviewData | null;
  online: OnlineSalesData;                 // always net of returns
  onlineCompare: OnlineSalesData | null;
  compareRange: { from: string; to: string } | null;
  tierAnalysis: TierAnalysisData;
  billSizeDistribution: BillSizeDistributionData;
  skuBreakdown: SkuBreakdownData;
  batteryTypes: BatteryTypeData;
  dealerHealth: DealerHealthData;
  trend: TrendData;
}

// --- Analytics shared meta ---
export interface AnalyticsMeta {
  fetchedAt: string;
  availableMonths: string[];
  minDate?: string;
  maxDate?: string;
}

// --- Month Compare ---
export interface MonthCompareSummary {
  totalSales: number;
  totalUnits: number;
  totalCases: number;
  invoiceCount: number;
  activeDealers: number;
  avgSalesPerInvoice: number;
  avgCasesPerInvoice: number;
}

export type DealerMovementGroup = 'increased' | 'decreased' | 'lost' | 'returned_new';

export interface DealerMovementRow {
  customerId: string;
  customerName: string;
  tier: Tier;
  baseSales: number;
  compareSales: number;
  diff: number;
  diffPct: number | null;
  baseCases: number;
  compareCases: number;
  group: DealerMovementGroup;
}

export interface SkuMovementRow {
  itemId: string;
  itemDesc: string;
  baseSales: number;
  compareSales: number;
  diff: number;
  diffPct: number | null;
  baseCases: number;
  compareCases: number;
}

export interface MonthCompareData {
  baseMonth: string;
  compareMonth: string;
  base: MonthCompareSummary;
  compare: MonthCompareSummary;
  dealerMovement: DealerMovementRow[];
  skuMovement: SkuMovementRow[];
}

export interface MonthCompareApiResponse {
  meta: AnalyticsMeta;
  data: MonthCompareData;
}

// --- Dealer RFM ---
export interface DealerRfmRow {
  customerId: string;
  customerName: string;
  tier: Tier;
  lastInvoiceDate: string | null;
  daysSinceLastPurchase: number | null;
  invoiceFrequency: number;
  totalMonetarySales: number;
  avgOrderValue: number;
  recencyScore: number;
  frequencyScore: number;
  monetaryScore: number;
  rfmScore: string;
  segment: string;
}

export interface DealerRfmApiResponse {
  meta: AnalyticsMeta;
  dealers: DealerRfmRow[];
  segmentCounts: Record<string, number>;
}

// --- Returns / Claims ---
export interface ReturnMonthData {
  month: string;
  label: string;
  returnAmount: number;
  returnUnits: number;
  returnInvoiceCount: number;
  grossSales: number;
  returnRate: number;
  tierReturnAmount: Partial<Record<TierKnown, number>>;
}

export interface ReturnSkuRow {
  itemId: string;
  itemDesc: string;
  returnAmount: number;
  returnUnits: number;
  returnCount: number;
}

export interface ReturnDealerRow {
  customerId: string;
  customerName: string;
  tier: Tier;
  returnAmount: number;
  returnUnits: number;
  returnCount: number;
}

export interface ReturnsApiResponse {
  meta: AnalyticsMeta;
  months: ReturnMonthData[];
  topReturnedSkus: ReturnSkuRow[];
  topReturningDealers: ReturnDealerRow[];
  totalReturnAmount: number;
  totalGrossSales: number;
  overallReturnRate: number;
}

// --- Purchase Cycle ---
export type CycleStatus = 'not_enough_data' | 'on_track' | 'due_soon' | 'overdue' | 'critical';

export interface PurchaseCycleRow {
  customerId: string;
  customerName: string;
  tier: Tier;
  invoiceCount: number;
  avgDaysBetween: number | null;
  medianDaysBetween: number | null;
  lastInvoiceDate: string | null;
  expectedNextDate: string | null;
  daysOverdue: number | null;
  status: CycleStatus;
}

export interface PurchaseCycleApiResponse {
  meta: AnalyticsMeta;
  dealers: PurchaseCycleRow[];
}

// --- Dealer Sales ---
export interface DealerSaleSku {
  itemId: string;
  itemDesc: string;
  qty: number;
  cases: number;
  netAmount: number;
}

export interface DealerSaleRow {
  customerId: string;
  customerName: string;
  tier: TierKnown;
  totalSales: number;
  totalUnits: number;
  totalCases: number;
  skuCount: number;
  lastInvoiceDate: string | null;
  skus: DealerSaleSku[];
}

export interface DealerSalesSummary {
  activeDealers: number;
  totalSales: number;
  totalUnits: number;
  totalCases: number;
  dealerCountByTier: Partial<Record<TierKnown, number>>;
}

export interface DealerSalesData {
  summary: DealerSalesSummary;
  dealers: DealerSaleRow[];
}

export interface DealerSalesApiResponse {
  meta: DataMeta;
  data: DealerSalesData;
}

// --- Zone Sales ---
export interface ZoneDealerMonthRow {
  month: string;   // 'YYYYMM'
  label: string;   // 'ม.ค. 2026'
  sales: number;
  units: number;
  cases: number;
  invoiceCount: number;
}

export interface ZoneDealerRow {
  customerId: string;
  customerName: string;
  tier: Tier;
  totalSales: number;
  totalUnits: number;
  totalCases: number;
  invoiceCount: number;
  lastInvoiceDate: string | null;
  months: ZoneDealerMonthRow[];
}

export interface ZoneBreakdownRow {
  zoneId: string;
  sales: number;
  salesPct: number;
  units: number;
  cases: number;
  dealerCount: number;
  invoiceCount: number;
  dealers: ZoneDealerRow[];
}

// Online channels are NET of returns: sales/units/cases include return rows,
// returnAmount is the (positive) amount deducted, salesPct is the share of the
// online net total. orderCount/buyerCount only count real sale rows.
export interface OnlineChannelRow {
  zoneId: string;
  channel: string;
  sales: number;
  returnAmount: number;
  salesPct: number;
  units: number;
  cases: number;
  orderCount: number;
  buyerCount: number;
}

// totalSales / coreZoneSales / otherSales are gross, as before. onlineSales is
// NET of returns (onlineReturns = what was deducted), so it is deliberately not
// expressed as a % of totalSales — that would divide a net figure by a gross one.
export interface ZoneSalesData {
  totalSales: number;
  coreZoneSales: number;
  onlineSales: number;
  onlineReturns: number;
  otherSales: number;
  zones: ZoneBreakdownRow[];
  onlineChannels: OnlineChannelRow[];
}

export interface ZoneSalesApiResponse {
  meta: DataMeta;
  data: ZoneSalesData;
  dataCompare: ZoneSalesData | null;
  compareRange: { from: string; to: string } | null;
}

// --- Zone Trend ---
export type TrendGranularity = 'month' | 'quarter';

export interface ZoneTrendSkuRow {
  itemId: string;
  itemDesc: string;
  sales: number;
  cases: number;
}

export interface ZoneTrendPoint {
  period: string;   // '202601' (month) | '2026-Q1' (quarter)
  label: string;     // 'ม.ค.' | 'Q1'
  sales: number;
  dealerCount: number;
  units: number;
  cases: number;
}

export interface ZoneTrendRow {
  zoneId: string;
  points: ZoneTrendPoint[];
  totalSales: number;
  periodDealerCount: number;   // distinct dealers across the whole selected period
  trendPct: number | null;     // avg(2nd half points) vs avg(1st half points)
  topSkus: ZoneTrendSkuRow[];  // top 3 by sales, whole period
}

export interface ZoneTrendData {
  year: number;
  granularity: TrendGranularity;
  periods: { period: string; label: string }[];
  zones: ZoneTrendRow[];
}

export interface ZoneTrendApiResponse {
  meta: DataMeta;
  availableYears: number[];
  data: ZoneTrendData;
}
