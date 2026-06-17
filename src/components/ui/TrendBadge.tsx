import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { formatPct } from '@/lib/utils';

interface TrendBadgeProps {
  pct: number | null;
  size?: 'sm' | 'md';
}

export default function TrendBadge({ pct, size = 'sm' }: TrendBadgeProps) {
  if (pct === null) return <span className="text-gray-500 text-xs">-</span>;

  const isUp = pct > 0;
  const isFlat = pct === 0;
  const textSize = size === 'sm' ? 'text-xs' : 'text-sm';
  const iconSize = size === 'sm' ? 12 : 14;

  if (isFlat) {
    return (
      <span className={`inline-flex items-center gap-0.5 ${textSize} text-gray-400`}>
        <Minus size={iconSize} /> 0%
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center gap-0.5 ${textSize} ${isUp ? 'text-green-400' : 'text-red-400'}`}>
      {isUp ? <TrendingUp size={iconSize} /> : <TrendingDown size={iconSize} />}
      {formatPct(pct)}
    </span>
  );
}
