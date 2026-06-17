'use client';

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts';
import type { TierSummary } from '@/lib/types';
import { TIER_COLORS, TIER_LABELS } from '@/lib/constants';

interface Props {
  tiers: TierSummary[];
}

function formatM(v: number): string {
  if (v >= 1_000_000) return (v / 1_000_000).toFixed(1) + 'M';
  if (v >= 1_000) return (v / 1_000).toFixed(0) + 'K';
  return String(v);
}

export default function TierBarChart({ tiers }: Props) {
  const data = tiers
    .filter(t => t.tier !== 'Unknown')
    .map(t => ({
      tier: TIER_LABELS[t.tier] ?? t.tier,
      ยอดขาย: Math.round(t.sales),
      rawTier: t.tier,
    }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" vertical={false} />
        <XAxis dataKey="tier" tick={{ fill: '#9CA3AF', fontSize: 12 }} axisLine={false} tickLine={false} />
        <YAxis tickFormatter={formatM} tick={{ fill: '#9CA3AF', fontSize: 11 }} axisLine={false} tickLine={false} width={52} />
        <Tooltip
          contentStyle={{ background: '#1C1C1C', border: '1px solid #2A2A2A', borderRadius: 8, fontSize: 12 }}
          formatter={(v: number) => [new Intl.NumberFormat('th-TH').format(v) + ' ฿', 'ยอดขาย']}
        />
        <Bar dataKey="ยอดขาย" radius={[4, 4, 0, 0]}>
          {data.map(d => (
            <Cell key={d.rawTier} fill={TIER_COLORS[d.rawTier] ?? '#6B7280'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
