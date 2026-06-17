'use client';

import { useState, useEffect, Suspense } from 'react';
import { Loader2, AlertCircle, RotateCcw } from 'lucide-react';
import { formatCurrency, formatCurrencyShort, formatNumber, getCurrentMonthYYYYMM } from '@/lib/utils';
import MonthSelector from '@/components/ui/MonthSelector';
import type { ReturnsApiResponse } from '@/lib/types';
import type { TierKnown } from '@/lib/types';

const TIERS: TierKnown[] = ['A', 'B', 'C', 'D'];
const TIER_COLORS: Record<TierKnown, string> = {
  A: 'text-[#F5C400]',
  B: 'text-blue-400',
  C: 'text-green-400',
  D: 'text-purple-400',
};

function ReturnRateBadge({ rate }: { rate: number }) {
  const color = rate >= 5 ? 'text-red-400 bg-red-400/10' : rate >= 2 ? 'text-yellow-400 bg-yellow-400/10' : 'text-green-400 bg-green-400/10';
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${color}`}>
      {rate.toFixed(1)}%
    </span>
  );
}

function ReturnsContent() {
  const [data, setData] = useState<ReturnsApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const availableMonths = data?.meta.availableMonths ?? [];

  useEffect(() => {
    setLoading(true);
    const params = from && to ? `?from=${from}&to=${to}` : '';
    fetch(`/api/analytics/returns${params}`)
      .then(r => r.json())
      .then(d => {
        setData(d);
        if (!from && !to && d?.meta?.availableMonths?.length) {
          const latest = d.meta.availableMonths[d.meta.availableMonths.length - 1];
          setFrom(latest);
          setTo(latest);
        }
        setLoading(false);
      })
      .catch(e => { setError(e.message); setLoading(false); });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to]);

  function handleMonthChange(f: string, t: string) {
    setFrom(f);
    setTo(t);
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

  const hasReturns = data.totalReturnAmount > 0;

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <RotateCcw size={20} className="text-red-400" />
          คืนสินค้า / เคลม
        </h1>
        {availableMonths.length > 0 && from && to && (
          <MonthSelector
            availableMonths={availableMonths}
            from={from}
            to={to}
            onChange={handleMonthChange}
          />
        )}
      </div>

      {!hasReturns && (
        <div className="bg-[#1C1C1C] border border-[#2A2A2A] rounded-xl p-8 text-center text-gray-500">
          ไม่พบรายการคืนสินค้าในข้อมูล
        </div>
      )}

      {hasReturns && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-[#1C1C1C] border border-[#2A2A2A] rounded-xl p-5">
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">มูลค่าคืนรวม</p>
              <p className="text-2xl font-bold text-red-400 tabular-nums">{formatCurrency(data.totalReturnAmount)}</p>
              <p className="text-xs text-gray-500 mt-1">จากยอดขายรวม {formatCurrencyShort(data.totalGrossSales)}</p>
            </div>
            <div className="bg-[#1C1C1C] border border-[#2A2A2A] rounded-xl p-5">
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">อัตราคืน (Return Rate)</p>
              <p className="text-2xl font-bold tabular-nums text-white">{data.overallReturnRate.toFixed(2)}%</p>
              <p className="text-xs text-gray-500 mt-1">มูลค่าคืน ÷ ยอดขายรวม</p>
            </div>
            <div className="bg-[#1C1C1C] border border-[#2A2A2A] rounded-xl p-5">
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">จำนวน SKU ที่มีการคืน</p>
              <p className="text-2xl font-bold text-white tabular-nums">{data.topReturnedSkus.length} รายการ</p>
              <p className="text-xs text-gray-500 mt-1">ดีลเลอร์ที่คืน {data.topReturningDealers.length} ราย</p>
            </div>
          </div>

          {/* Monthly Return Table */}
          <div className="bg-[#1C1C1C] border border-[#2A2A2A] rounded-xl p-5">
            <h2 className="text-sm font-semibold text-gray-300 mb-1">รายการคืนรายเดือน</h2>
            <p className="text-xs text-gray-500 mb-4">มูลค่าและจำนวนลูกที่ถูกคืน/เคลม แยกตามเดือน</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#2A2A2A] text-gray-400 text-xs">
                    <th className="text-left py-2 pr-4 font-medium">เดือน</th>
                    <th className="text-right py-2 px-3 font-medium">มูลค่าคืน</th>
                    <th className="text-right py-2 px-3 font-medium">จำนวนลูก</th>
                    <th className="text-right py-2 px-3 font-medium">ออเดอร์คืน</th>
                    <th className="text-right py-2 px-3 font-medium">ยอดขาย (gross)</th>
                    <th className="text-right py-2 px-3 font-medium">Return Rate</th>
                    {TIERS.map(t => (
                      <th key={t} className={`text-right py-2 px-3 font-medium ${TIER_COLORS[t]}`}>คืน Tier {t}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.months.filter(m => m.returnAmount > 0).map(m => (
                    <tr key={m.month} className="border-b border-[#1A1A1A] hover:bg-[#242424]">
                      <td className="py-2 pr-4 text-gray-300 font-medium">{m.label}</td>
                      <td className="py-2 px-3 text-right tabular-nums text-red-400 font-medium">{formatCurrency(m.returnAmount)}</td>
                      <td className="py-2 px-3 text-right tabular-nums text-gray-300">{formatNumber(m.returnUnits)} ลูก</td>
                      <td className="py-2 px-3 text-right tabular-nums text-gray-400">{formatNumber(m.returnInvoiceCount)} ออเดอร์</td>
                      <td className="py-2 px-3 text-right tabular-nums text-gray-400">{formatCurrencyShort(m.grossSales)}</td>
                      <td className="py-2 px-3 text-right"><ReturnRateBadge rate={m.returnRate} /></td>
                      {TIERS.map(t => {
                        const amt = m.tierReturnAmount[t];
                        return (
                          <td key={t} className={`py-2 px-3 text-right tabular-nums text-sm ${amt ? TIER_COLORS[t] : 'text-gray-600'}`}>
                            {amt ? formatCurrencyShort(amt) : '—'}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Top Returned SKUs */}
          <div className="bg-[#1C1C1C] border border-[#2A2A2A] rounded-xl p-5">
            <h2 className="text-sm font-semibold text-gray-300 mb-1">SKU ที่ถูกคืนสูงสุด</h2>
            <p className="text-xs text-gray-500 mb-4">เรียงตามมูลค่าคืนรวมตลอดช่วงเวลา</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#2A2A2A] text-gray-400 text-xs">
                    <th className="text-left py-2 pr-4 font-medium">#</th>
                    <th className="text-left py-2 pr-4 font-medium">SKU</th>
                    <th className="text-right py-2 px-3 font-medium">มูลค่าคืน</th>
                    <th className="text-right py-2 px-3 font-medium">จำนวนลูก</th>
                    <th className="text-right py-2 pl-3 font-medium">ครั้ง</th>
                  </tr>
                </thead>
                <tbody>
                  {data.topReturnedSkus.map((sku, i) => (
                    <tr key={sku.itemId} className="border-b border-[#1A1A1A] hover:bg-[#242424]">
                      <td className="py-2 pr-4 text-gray-600 text-xs">{i + 1}</td>
                      <td className="py-2 pr-4">
                        <div className="text-gray-200 font-medium">{sku.itemDesc || sku.itemId}</div>
                        <div className="text-gray-600 text-xs">{sku.itemId}</div>
                      </td>
                      <td className="py-2 px-3 text-right tabular-nums text-red-400 font-medium">{formatCurrency(sku.returnAmount)}</td>
                      <td className="py-2 px-3 text-right tabular-nums text-gray-300">{formatNumber(sku.returnUnits)} ลูก</td>
                      <td className="py-2 pl-3 text-right tabular-nums text-gray-400">{formatNumber(sku.returnCount)} ครั้ง</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Top Returning Dealers */}
          <div className="bg-[#1C1C1C] border border-[#2A2A2A] rounded-xl p-5">
            <h2 className="text-sm font-semibold text-gray-300 mb-1">ดีลเลอร์ที่คืนสินค้าสูงสุด</h2>
            <p className="text-xs text-gray-500 mb-4">เรียงตามมูลค่าคืนรวม — ใช้ตรวจสอบปัญหาเฉพาะดีลเลอร์</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#2A2A2A] text-gray-400 text-xs">
                    <th className="text-left py-2 pr-4 font-medium">#</th>
                    <th className="text-left py-2 pr-4 font-medium">ดีลเลอร์</th>
                    <th className="text-right py-2 px-3 font-medium">Tier</th>
                    <th className="text-right py-2 px-3 font-medium">มูลค่าคืน</th>
                    <th className="text-right py-2 px-3 font-medium">จำนวนลูก</th>
                    <th className="text-right py-2 pl-3 font-medium">ครั้ง</th>
                  </tr>
                </thead>
                <tbody>
                  {data.topReturningDealers.map((d, i) => (
                    <tr key={d.customerId} className="border-b border-[#1A1A1A] hover:bg-[#242424]">
                      <td className="py-2 pr-4 text-gray-600 text-xs">{i + 1}</td>
                      <td className="py-2 pr-4">
                        <div className="text-gray-200 font-medium">{d.customerName}</div>
                        <div className="text-gray-600 text-xs">{d.customerId}</div>
                      </td>
                      <td className="py-2 px-3 text-right">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                          d.tier === 'A' ? 'bg-[#F5C400]/15 text-[#F5C400]' :
                          d.tier === 'B' ? 'bg-blue-400/15 text-blue-400' :
                          d.tier === 'C' ? 'bg-green-400/15 text-green-400' :
                          d.tier === 'D' ? 'bg-purple-400/15 text-purple-400' :
                          'bg-gray-700 text-gray-400'
                        }`}>{d.tier}</span>
                      </td>
                      <td className="py-2 px-3 text-right tabular-nums text-red-400 font-medium">{formatCurrency(d.returnAmount)}</td>
                      <td className="py-2 px-3 text-right tabular-nums text-gray-300">{formatNumber(d.returnUnits)} ลูก</td>
                      <td className="py-2 pl-3 text-right tabular-nums text-gray-400">{formatNumber(d.returnCount)} ครั้ง</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function ReturnsPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64"><Loader2 size={24} className="animate-spin text-[#F5C400]" /></div>}>
      <ReturnsContent />
    </Suspense>
  );
}
