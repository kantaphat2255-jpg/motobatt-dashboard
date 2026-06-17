'use client';

import { Suspense } from 'react';
import { useDashboard } from '@/hooks/useDashboard';
import DataFreshness from '@/components/layout/DataFreshness';
import SalesVsTargetChart from '@/components/charts/SalesVsTargetChart';
import TierStackedBar from '@/components/charts/TierStackedBar';
import ActiveDealersChart from '@/components/charts/ActiveDealersChart';
import ProgressBar from '@/components/ui/ProgressBar';
import { formatCurrency, formatCurrencyShort, formatNumber, getCurrentMonthYYYYMM } from '@/lib/utils';
import type { TierKnown } from '@/lib/types';

const TIERS: TierKnown[] = ['A', 'B', 'C', 'D'];
const TIER_COLORS: Record<TierKnown, string> = {
  A: 'text-[#F5C400]',
  B: 'text-blue-400',
  C: 'text-green-400',
  D: 'text-gray-400',
};
import { Loader2, AlertCircle } from 'lucide-react';

function TrendContent() {
  const { data, loading, error, refresh } = useDashboard();

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 size={24} className="animate-spin text-[#F5C400]" /><span className="ml-3 text-gray-400">กำลังโหลดข้อมูล...</span></div>;
  if (error || !data) return <div className="flex items-center gap-3 p-8 text-red-400"><AlertCircle size={20} /><span>{error || 'ไม่พบข้อมูล'}</span></div>;

  const { trend, meta } = data;
  const cumPct = trend.cumulativeTarget > 0 ? (trend.cumulativeSales / trend.cumulativeTarget) * 100 : 0;

  return (
    <>
      <DataFreshness meta={meta} onRefresh={refresh} loading={loading} />
      <div className="p-6 space-y-6">
        <h1 className="text-xl font-bold">แนวโน้ม 6 เดือนย้อนหลัง</h1>

        {/* Cumulative Progress */}
        <div className="bg-[#1C1C1C] border border-[#2A2A2A] rounded-xl p-5">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">ยอดขายสะสม เม.ย.–ธ.ค. 2569</p>
              <p className="text-3xl font-bold text-[#F5C400] tabular-nums">{formatCurrency(trend.cumulativeSales)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-400 mb-1">เป้าหมายรวม</p>
              <p className="text-lg font-semibold text-gray-300 tabular-nums">{formatCurrencyShort(trend.cumulativeTarget)}</p>
              <p className="text-sm text-gray-500">{cumPct.toFixed(1)}%</p>
            </div>
          </div>
          <ProgressBar current={trend.cumulativeSales} target={trend.cumulativeTarget} label="ความคืบหน้าสะสม" />
        </div>

        {/* Sales vs Target */}
        <div className="bg-[#1C1C1C] border border-[#2A2A2A] rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-300 mb-4">ยอดขายรายเดือน เทียบเป้าหมาย</h2>
          <SalesVsTargetChart months={trend.months} />
        </div>

        {/* Monthly Summary Table */}
        <div className="bg-[#1C1C1C] border border-[#2A2A2A] rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-300 mb-4">ตารางสรุปรายเดือน</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#2A2A2A] text-gray-400 text-xs">
                  <th className="text-left py-2 pr-4 font-medium">เดือน</th>
                  <th className="text-right py-2 px-3 font-medium">ยอดขาย</th>
                  <th className="text-right py-2 px-3 font-medium">เป้าหมาย</th>
                  <th className="text-right py-2 px-3 font-medium">% ทำได้</th>
                  <th className="text-right py-2 pl-3 font-medium">ดีลเลอร์</th>
                </tr>
              </thead>
              <tbody>
                {trend.months.map(m => {
                  const pct = m.target ? (m.sales / m.target) * 100 : null;
                  return (
                    <tr key={m.month} className="border-b border-[#1A1A1A] hover:bg-[#242424]">
                      <td className="py-2 pr-4 text-gray-300 font-medium">{m.label}</td>
                      <td className="py-2 px-3 text-right tabular-nums font-medium text-[#F5C400]">{formatCurrency(m.sales)}</td>
                      <td className="py-2 px-3 text-right tabular-nums text-gray-400">
                        {m.target ? formatCurrency(m.target) : '-'}
                      </td>
                      <td className={`py-2 px-3 text-right tabular-nums font-medium ${
                        pct === null ? 'text-gray-500' : pct >= 100 ? 'text-green-400' : 'text-gray-300'
                      }`}>
                        {pct !== null ? pct.toFixed(1) + '%' : '-'}
                      </td>
                      <td className="py-2 pl-3 text-right tabular-nums text-gray-400">{formatNumber(m.activeDealers)} ราย</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Tier Stacked Bar */}
        <div className="bg-[#1C1C1C] border border-[#2A2A2A] rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-300 mb-4">สัดส่วนยอดขายแยกตามเทียร์</h2>
          <TierStackedBar months={trend.months} />
        </div>

        {/* Tier Sales % Breakdown Table */}
        <div className="bg-[#1C1C1C] border border-[#2A2A2A] rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-300 mb-1">สัดส่วนยอดขายแต่ละเทียร์ (%) รายเดือน</h2>
          <p className="text-xs text-gray-500 mb-4">ยอดขายรวมต่อเดือน แบ่งเป็น % ของแต่ละเทียร์</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#2A2A2A] text-gray-400 text-xs">
                  <th className="text-left py-2 pr-4 font-medium">เดือน</th>
                  <th className="text-right py-2 px-3 font-medium">ยอดรวม</th>
                  {TIERS.map(t => (
                    <th key={t} className={`text-right py-2 px-3 font-medium ${TIER_COLORS[t]}`}>
                      Tier {t}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {trend.months.map(m => (
                  <tr key={m.month} className="border-b border-[#1A1A1A] hover:bg-[#242424]">
                    <td className="py-2 pr-4 text-gray-300 font-medium">{m.label}</td>
                    <td className="py-2 px-3 text-right tabular-nums text-[#F5C400] font-medium">{formatCurrency(m.sales)}</td>
                    {TIERS.map(t => {
                      const pct = m.tierSalesPct[t];
                      const sales = m.tierSales[t];
                      return (
                        <td key={t} className="py-2 px-3 text-right tabular-nums">
                          {pct != null && pct > 0 ? (
                            <div>
                              <span className={`font-medium ${TIER_COLORS[t]}`}>{pct.toFixed(1)}%</span>
                              <div className="text-xs text-gray-500">{formatCurrencyShort(sales ?? 0)}</div>
                            </div>
                          ) : (
                            <span className="text-gray-600">—</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Average Order Value Table */}
        <div className="bg-[#1C1C1C] border border-[#2A2A2A] rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-300 mb-1">ยอดสั่งซื้อเฉลี่ยต่อออเดอร์ (AOV) รายเดือน</h2>
          <p className="text-xs text-gray-500 mb-4">ยอดขาย ÷ จำนวนใบแจ้งหนี้ — รวมทั้งหมดและแยกตามเทียร์</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#2A2A2A] text-gray-400 text-xs">
                  <th className="text-left py-2 pr-4 font-medium">เดือน</th>
                  <th className="text-right py-2 px-3 font-medium">ออเดอร์</th>
                  <th className="text-right py-2 px-3 font-medium">AOV รวม</th>
                  {TIERS.map(t => (
                    <th key={t} className={`text-right py-2 px-3 font-medium ${TIER_COLORS[t]}`}>
                      Tier {t}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {trend.months.map(m => (
                  <tr key={m.month} className="border-b border-[#1A1A1A] hover:bg-[#242424]">
                    <td className="py-2 pr-4 text-gray-300 font-medium">{m.label}</td>
                    <td className="py-2 px-3 text-right tabular-nums text-gray-400">{formatNumber(m.invoiceCount)} ออเดอร์</td>
                    <td className="py-2 px-3 text-right tabular-nums text-[#F5C400] font-medium">{formatCurrency(m.avgOrderValue)}</td>
                    {TIERS.map(t => {
                      const aov = m.tierAvgOrderValue[t];
                      return (
                        <td key={t} className={`py-2 px-3 text-right tabular-nums font-medium ${aov ? TIER_COLORS[t] : 'text-gray-600'}`}>
                          {aov ? formatCurrency(aov) : '—'}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Active Dealers Chart */}
        <div className="bg-[#1C1C1C] border border-[#2A2A2A] rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-300 mb-4">จำนวนดีลเลอร์ที่ขาย (รายเดือน)</h2>
          <ActiveDealersChart months={trend.months} />
        </div>
      </div>
    </>
  );
}

export default function TrendPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64"><Loader2 size={24} className="animate-spin text-[#F5C400]" /></div>}>
      <TrendContent />
    </Suspense>
  );
}
