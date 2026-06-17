'use client';

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer,
} from 'recharts';
import type { TrendMonthData } from '@/lib/types';
import { TIER_COLORS } from '@/lib/constants';

interface Props {
  months: TrendMonthData[];
}

function formatM(v: number): string {
  if (v >= 1_000_000) return (v / 1_000_000).toFixed(1) + 'M';
  if (v >= 1_000) return (v / 1_000).toFixed(0) + 'K';
  return String(v);
}

const TIERS = ['A', 'B', 'C', 'D'] as const;
const TIER_NAMES = { A: 'เทียร์ A', B: 'เทียร์ B', C: 'เทียร์ C', D: 'เทียร์ D' };

export default function TierStackedBar({ months }: Props) {
  const data = months.map(m => ({
    label: m.label,
    'เทียร์ A': Math.round(m.tierSales.A ?? 0),
    'เทียร์ B': Math.round(m.tierSales.B ?? 0),
    'เทียร์ C': Math.round(m.tierSales.C ?? 0),
    'เทียร์ D': Math.round(m.tierSales.D ?? 0),
  }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" vertical={false} />
        <XAxis dataKey="label" tick={{ fill: '#9CA3AF', fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis tickFormatter={formatM} tick={{ fill: '#9CA3AF', fontSize: 11 }} axisLine={false} tickLine={false} width={52} />
        <Tooltip
          contentStyle={{ background: '#1C1C1C', border: '1px solid #2A2A2A', borderRadius: 8, fontSize: 12 }}
          formatter={(v: number) => [new Intl.NumberFormat('th-TH').format(v) + ' ฿', '']}
        />
        <Legend wrapperStyle={{ fontSize: 12, color: '#9CA3AF' }} />
        {TIERS.map(t => (
          <Bar key={t} dataKey={TIER_NAMES[t]} stackId="tier" fill={TIER_COLORS[t]} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
