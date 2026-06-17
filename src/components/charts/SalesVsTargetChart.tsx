'use client';

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import type { TrendMonthData } from '@/lib/types';

interface Props {
  months: TrendMonthData[];
}

function formatM(v: number): string {
  if (v >= 1_000_000) return (v / 1_000_000).toFixed(1) + 'M';
  if (v >= 1_000) return (v / 1_000).toFixed(0) + 'K';
  return String(v);
}

export default function SalesVsTargetChart({ months }: Props) {
  const data = months.map(m => ({
    label: m.label,
    ยอดขาย: Math.round(m.sales),
    เป้าหมาย: m.target ?? undefined,
  }));

  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" />
        <XAxis dataKey="label" tick={{ fill: '#9CA3AF', fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis tickFormatter={formatM} tick={{ fill: '#9CA3AF', fontSize: 11 }} axisLine={false} tickLine={false} width={52} />
        <Tooltip
          contentStyle={{ background: '#1C1C1C', border: '1px solid #2A2A2A', borderRadius: 8, fontSize: 12 }}
          labelStyle={{ color: '#E5E7EB' }}
          formatter={(v: number) => [new Intl.NumberFormat('th-TH').format(v) + ' ฿', '']}
        />
        <Legend wrapperStyle={{ fontSize: 12, color: '#9CA3AF' }} />
        <Line
          type="monotone" dataKey="ยอดขาย"
          stroke="#F5C400" strokeWidth={2.5} dot={{ fill: '#F5C400', r: 4 }}
          activeDot={{ r: 6 }}
        />
        <Line
          type="monotone" dataKey="เป้าหมาย"
          stroke="#EF4444" strokeWidth={1.5} strokeDasharray="5 3"
          dot={false} connectNulls
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
