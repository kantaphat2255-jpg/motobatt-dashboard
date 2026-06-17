'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense } from 'react';
import { useDashboard } from '@/hooks/useDashboard';
import DataFreshness from '@/components/layout/DataFreshness';
import MonthSelector from '@/components/ui/MonthSelector';
import TrendBadge from '@/components/ui/TrendBadge';
import { formatCurrency, formatNumber, getCurrentMonthYYYYMM } from '@/lib/utils';
import { Loader2, AlertCircle, TrendingUp, TrendingDown } from 'lucide-react';

function SkuContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const defaultMonth = getCurrentMonthYYYYMM();
  const from = searchParams.get('from') || searchParams.get('month') || defaultMonth;
  const to = searchParams.get('to') || searchParams.get('month') || from;
  const { data, loading, error, refresh } = useDashboard(from, to);

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 size={24} className="animate-spin text-[#F5C400]" /><span className="ml-3 text-gray-400">กำลังโหลดข้อมูล...</span></div>;
  if (error || !data) return <div className="flex items-center gap-3 p-8 text-red-400"><AlertCircle size={20} /><span>{error || 'ไม่พบข้อมูล'}</span></div>;

  const { skuBreakdown: sb, meta } = data;

  return (
    <>
      <DataFreshness meta={meta} onRefresh={refresh} loading={loading} />
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">สินค้า / SKU</h1>
          <MonthSelector availableMonths={meta.availableMonths} from={from} to={to} onChange={(f, t) => router.push(`/sku?from=${f}&to=${t}`)} />
        </div>

        {/* Top 5 */}
        <div className="bg-[#1C1C1C] border border-[#2A2A2A] rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-300 mb-4">
            Top 5 สินค้าขายดี (ยอดขาย)
          </h2>
          <div className="space-y-3">
            {sb.top5.map((sku, i) => (
              <div key={sku.itemId} className="flex items-center gap-3">
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${i === 0 ? 'bg-[#F5C400] text-[#111111]' : 'bg-[#2A2A2A] text-gray-400'}`}>
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white font-medium truncate">{sku.itemDesc}</p>
                  <p className="text-xs text-gray-500">{sku.itemId}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold tabular-nums">{formatCurrency(sku.sales)}</p>
                  <p className="text-xs text-gray-500 tabular-nums">{sku.salesPct.toFixed(1)}%</p>
                </div>
                <div className="w-16 text-right">
                  <TrendBadge pct={sku.momPct} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Growing / Declining */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-[#1C1C1C] border border-green-500/20 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-green-400 mb-3 flex items-center gap-2">
              <TrendingUp size={14} /> สินค้าที่เติบโต ({sb.growing.length})
            </h2>
            {sb.growing.length === 0 ? (
              <p className="text-gray-500 text-sm">ไม่มีข้อมูลเดือนก่อนเปรียบเทียบ</p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {sb.growing.slice(0, 8).map(sku => (
                  <div key={sku.itemId} className="flex items-center justify-between text-sm">
                    <span className="text-gray-300 truncate flex-1 mr-2">{sku.itemDesc}</span>
                    <TrendBadge pct={sku.momPct} />
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="bg-[#1C1C1C] border border-red-500/20 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-red-400 mb-3 flex items-center gap-2">
              <TrendingDown size={14} /> สินค้าที่ลดลง ({sb.declining.length})
            </h2>
            {sb.declining.length === 0 ? (
              <p className="text-gray-500 text-sm">ไม่มีข้อมูลเดือนก่อนเปรียบเทียบ</p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {sb.declining.slice(0, 8).map(sku => (
                  <div key={sku.itemId} className="flex items-center justify-between text-sm">
                    <span className="text-gray-300 truncate flex-1 mr-2">{sku.itemDesc}</span>
                    <TrendBadge pct={sku.momPct} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Full SKU Table */}
        <div className="bg-[#1C1C1C] border border-[#2A2A2A] rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-300 mb-4">สินค้าทั้งหมด ({sb.skus.length} รายการ)</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#2A2A2A] text-gray-400 text-xs">
                  <th className="text-left py-2 pr-3 font-medium">รหัสสินค้า</th>
                  <th className="text-left py-2 pr-3 font-medium">ชื่อสินค้า</th>
                  <th className="text-right py-2 px-3 font-medium">ยอดขาย (฿)</th>
                  <th className="text-right py-2 px-3 font-medium">สัดส่วน</th>
                  <th className="text-right py-2 px-3 font-medium">หน่วย</th>
                  <th className="text-right py-2 px-3 font-medium">ลัง</th>
                  <th className="text-right py-2 pl-3 font-medium">MoM</th>
                </tr>
              </thead>
              <tbody>
                {sb.skus.map(sku => (
                  <tr key={sku.itemId} className="border-b border-[#1A1A1A] hover:bg-[#242424]">
                    <td className="py-2 pr-3 text-gray-400 tabular-nums text-xs">{sku.itemId}</td>
                    <td className="py-2 pr-3 text-white">{sku.itemDesc}</td>
                    <td className="py-2 px-3 text-right tabular-nums font-medium">{formatCurrency(sku.sales)}</td>
                    <td className="py-2 px-3 text-right tabular-nums text-gray-400">{sku.salesPct.toFixed(1)}%</td>
                    <td className="py-2 px-3 text-right tabular-nums">{formatNumber(sku.units)}</td>
                    <td className="py-2 px-3 text-right tabular-nums">{formatNumber(sku.cases, 1)}</td>
                    <td className="py-2 pl-3 text-right"><TrendBadge pct={sku.momPct} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}

export default function SkuPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64"><Loader2 size={24} className="animate-spin text-[#F5C400]" /></div>}>
      <SkuContent />
    </Suspense>
  );
}
