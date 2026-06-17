'use client';

import {
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Area, AreaChart,
} from 'recharts';
import type { TrendMonthData } from '@/lib/types';

interface Props {
  months: TrendMonthData[];
}

export default function ActiveDealersChart({ months }: Props) {
  const data = months.map(m => ({ label: m.label, 'ดีลเลอร์ active': m.activeDealers }));

  return (
    <ResponsiveContainer width="100%" height={180}>
      <AreaChart data={data} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
        <defs>
          <linearGradient id="dealerGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#F5C400" stopOpacity={0.3} />
            <stop offset="100%" stopColor="#F5C400" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" />
        <XAxis dataKey="label" tick={{ fill: '#9CA3AF', fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: '#9CA3AF', fontSize: 11 }} axisLine={false} tickLine={false} width={32} />
        <Tooltip
          contentStyle={{ background: '#1C1C1C', border: '1px solid #2A2A2A', borderRadius: 8, fontSize: 12 }}
          formatter={(v: number) => [`${v} ราย`, 'ดีลเลอร์']}
        />
        <Area
          type="monotone" dataKey="ดีลเลอร์ active"
          stroke="#F5C400" strokeWidth={2} fill="url(#dealerGrad)"
          dot={{ fill: '#F5C400', r: 3 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
