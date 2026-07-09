'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { Fragment, Suspense, useState, useMemo } from 'react';
import { useDealerSales } from '@/hooks/useAnalytics';
import DataFreshness from '@/components/layout/DataFreshness';
import WarningBanner from '@/components/ui/WarningBanner';
import DateRangePicker from '@/components/ui/DateRangePicker';
import MetricCard from '@/components/ui/MetricCard';
import { formatCurrency, formatNumber, formatDateThai } from '@/lib/utils';
import { TIER_COLORS, TIER_LABELS } from '@/lib/constants';
import type { DealerSaleRow, TierKnown } from '@/lib/types';
import { Loader2, AlertCircle, ChevronDown, ChevronRight, Search } from 'lucide-react';

const KNOWN_TIERS: TierKnown[] = ['A', 'B', 'C'];

function TierBadge({ tier }: { tier: string }) {
  return (
    <span
      className="inline-block px-2 py-0.5 rounded text-xs font-medium"
      style={{ background: (TIER_COLORS[tier] ?? '#6B7280') + '22', color: TIER_COLORS[tier] ?? '#6B7280' }}
    >
      {TIER_LABELS[tier] ?? tier}
    </span>
  );
}

function DealerSkuTable({ skus }: { skus: DealerSaleRow['skus'] }) {
  if (skus.length === 0) return <p className="text-gray-500 text-xs py-2">ไม่มีข้อมูลสินค้า</p>;
  return (
    <table className="w-full text-xs">
      <thead>
        <tr className="text-gray-500">
          <th className="text-left py-1 pr-3 font-medium">รหัสสินค้า</th>
          <th className="text-left py-1 pr-3 font-medium">ชื่อสินค้า</th>
          <th className="text-right py-1 px-3 font-medium">จำนวนหน่วย</th>
          <th className="text-right py-1 px-3 font-medium">ลัง</th>
          <th className="text-right py-1 pl-3 font-medium">ยอดขาย</th>
        </tr>
      </thead>
      <tbody>
        {skus.map(s => (
          <tr key={s.itemId} className="border-t border-[#222]">
            <td className="py-1.5 pr-3 text-gray-500 tabular-nums">{s.itemId}</td>
            <td className="py-1.5 pr-3 text-gray-300">{s.itemDesc}</td>
            <td className="py-1.5 px-3 text-right tabular-nums text-gray-400">{formatNumber(s.qty)}</td>
            <td className="py-1.5 px-3 text-right tabular-nums text-gray-400">{formatNumber(s.cases, 1)}</td>
            <td className="py-1.5 pl-3 text-right tabular-nums text-gray-300">{formatCurrency(s.netAmount)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function DealerSalesContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const from = searchParams.get('from') || searchParams.get('month') || undefined;
  const to = searchParams.get('to') || searchParams.get('month') || undefined;
  const { data, loading, error, refresh } = useDealerSales(from, to);

  const [search, setSearch] = useState('');
  const [tierFilter, setTierFilter] = useState<string>('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const dealers = data?.data.dealers ?? [];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return dealers.filter(d => {
      if (tierFilter && d.tier !== tierFilter) return false;
      if (!q) return true;
      if (d.customerId.toLowerCase().includes(q)) return true;
      if (d.customerName.toLowerCase().includes(q)) return true;
      return d.skus.some(s => s.itemId.toLowerCase().includes(q) || s.itemDesc.toLowerCase().includes(q));
    });
  }, [dealers, tierFilter, search]);

  function toggleExpand(customerId: string) {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(customerId)) next.delete(customerId); else next.add(customerId);
      return next;
    });
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 size={24} className="animate-spin text-[#F5C400]" />
      <span className="ml-3 text-gray-400">กำลังโหลดข้อมูล...</span>
    </div>
  );
  if (error || !data) return (
    <div className="flex items-center gap-3 p-8 text-red-400">
      <AlertCircle size={20} /><span>{error || 'ไม่พบข้อมูล'}</span>
    </div>
  );

  const { meta, data: ds } = data;

  return (
    <>
      <DataFreshness meta={meta} onRefresh={refresh} loading={loading} />
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">Dealer Sales</h1>
          <DateRangePicker
            minDate={meta.minDate}
            maxDate={meta.maxDate}
            from={meta.rangeFrom}
            to={meta.rangeTo}
            onChange={(f, t) => router.push(`/dealer-sales?from=${f}&to=${t}`)}
          />
        </div>

        <WarningBanner count={meta.tierJoinFailCount} ids={meta.tierJoinFailIds} />

        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <MetricCard title="ดีลเลอร์ที่ซื้อ" value={formatNumber(ds.summary.activeDealers) + ' ราย'} highlight />
          <MetricCard title="ยอดขายรวม" value={formatCurrency(ds.summary.totalSales)} />
          <MetricCard title="จำนวนหน่วยรวม" value={formatNumber(ds.summary.totalUnits) + ' ก้อน'} />
          <MetricCard title="จำนวนลังรวม" value={formatNumber(ds.summary.totalCases, 1) + ' ลัง'} />
        </div>

        {/* Dealer count by tier */}
        <div className="grid grid-cols-3 gap-3">
          {KNOWN_TIERS.map(t => (
            <div
              key={t}
              className="bg-[#1C1C1C] border border-[#2A2A2A] rounded-xl p-4"
              style={{ borderLeftColor: TIER_COLORS[t], borderLeftWidth: 3 }}
            >
              <p className="text-xs text-gray-400 mb-1 uppercase tracking-wide" style={{ color: TIER_COLORS[t] }}>
                {TIER_LABELS[t]}
              </p>
              <p className="text-xl font-bold tabular-nums">{formatNumber(ds.summary.dealerCountByTier[t] ?? 0)} ราย</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              placeholder="ค้นหา รหัส / ชื่อร้าน / รหัสสินค้า / ชื่อสินค้า"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-72 bg-[#1C1C1C] border border-[#3A3A3A] text-white text-xs rounded-lg pl-8 pr-3 py-1.5 focus:outline-none focus:border-[#F5C400] transition-colors"
            />
          </div>
          <span className="text-xs text-gray-500">กรอง:</span>
          <select
            value={tierFilter}
            onChange={e => setTierFilter(e.target.value)}
            className="appearance-none bg-[#1C1C1C] border border-[#3A3A3A] text-white text-xs rounded-lg pl-2 pr-6 py-1.5 cursor-pointer hover:border-[#F5C400] focus:outline-none focus:border-[#F5C400] transition-colors"
          >
            <option value="">ทุกเทียร์</option>
            {KNOWN_TIERS.map(t => (
              <option key={t} value={t}>{TIER_LABELS[t]}</option>
            ))}
          </select>
          {(search || tierFilter) && (
            <button
              onClick={() => { setSearch(''); setTierFilter(''); }}
              className="text-xs text-gray-500 hover:text-white transition-colors"
            >
              ล้างตัวกรอง
            </button>
          )}
          <span className="text-xs text-gray-500 ml-auto">{filtered.length} รายการ</span>
        </div>

        {/* Main table */}
        <div className="bg-[#1C1C1C] border border-[#2A2A2A] rounded-xl p-5">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#2A2A2A] text-gray-400 text-xs">
                  <th className="py-2 pl-1 w-6" />
                  <th className="text-left py-2 pr-3 font-medium">รหัส</th>
                  <th className="text-left py-2 pr-3 font-medium">ชื่อดีลเลอร์</th>
                  <th className="text-center py-2 px-2 font-medium">เทียร์</th>
                  <th className="text-right py-2 px-3 font-medium">ยอดขาย</th>
                  <th className="text-right py-2 px-3 font-medium">จำนวนหน่วย</th>
                  <th className="text-right py-2 px-3 font-medium">ลัง</th>
                  <th className="text-center py-2 px-2 font-medium">SKU</th>
                  <th className="text-right py-2 pl-2 pr-1 font-medium">ล่าสุด</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(d => {
                  const isOpen = expanded.has(d.customerId);
                  return (
                    <Fragment key={d.customerId}>
                      <tr
                        onClick={() => toggleExpand(d.customerId)}
                        className="border-b border-[#1A1A1A] hover:bg-[#242424] cursor-pointer"
                      >
                        <td className="py-2 pl-1 text-gray-500">
                          {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        </td>
                        <td className="py-2 pr-3 text-gray-400 tabular-nums text-xs">{d.customerId}</td>
                        <td className="py-2 pr-3 text-white">{d.customerName}</td>
                        <td className="py-2 px-2 text-center"><TierBadge tier={d.tier} /></td>
                        <td className="py-2 px-3 text-right tabular-nums font-medium">{formatCurrency(d.totalSales)}</td>
                        <td className="py-2 px-3 text-right tabular-nums text-gray-300">{formatNumber(d.totalUnits)}</td>
                        <td className="py-2 px-3 text-right tabular-nums text-gray-300">{formatNumber(d.totalCases, 1)}</td>
                        <td className="py-2 px-2 text-center tabular-nums text-gray-400">{d.skuCount}</td>
                        <td className="py-2 pl-2 pr-1 text-right text-xs text-gray-400 tabular-nums">{formatDateThai(d.lastInvoiceDate)}</td>
                      </tr>
                      {isOpen && (
                        <tr className="bg-[#161616] border-b border-[#1A1A1A]">
                          <td colSpan={9} className="px-4 py-3">
                            <DealerSkuTable skus={d.skus} />
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <p className="text-gray-500 text-sm py-6 text-center">ไม่มีข้อมูลตามตัวกรองที่เลือก</p>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

export default function DealerSalesPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64"><Loader2 size={24} className="animate-spin text-[#F5C400]" /></div>}>
      <DealerSalesContent />
    </Suspense>
  );
}
