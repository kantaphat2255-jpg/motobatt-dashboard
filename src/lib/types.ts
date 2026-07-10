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

export interface DashboardApiResponse {
  meta: DataMeta;
  overview: MonthlyOverviewData;
  overviewCompare: MonthlyOverviewData | null;
  compareRange: { from: string; to: string } | null;
  tierAnalysis: TierAnalysisData;
  billSizeDistribution: BillSizeDistributionData;
  skuBreakdown: SkuBreakdownData;
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
export interface ZoneBreakdownRow {
  zoneId: string;
  sales: number;
  salesPct: number;
  units: number;
  cases: number;
  dealerCount: number;
  invoiceCount: number;
}

export interface OnlineChannelRow {
  zoneId: string;
  channel: string;
  sales: number;
  salesPct: number;
  units: number;
  cases: number;
  orderCount: number;
  buyerCount: number;
}

export interface ZoneSalesData {
  totalSales: number;
  coreZoneSales: number;
  onlineSales: number;
  otherSales: number;
  onlinePctOfTotal: number;
  zones: ZoneBreakdownRow[];
  onlineChannels: OnlineChannelRow[];
}

export interface ZoneSalesApiResponse {
  meta: DataMeta;
  data: ZoneSalesData;
}
