interface ProgressBarProps {
  current: number;
  target: number;
  label?: string;
  showPct?: boolean;
  height?: number;
}

export default function ProgressBar({ current, target, label, showPct = true, height = 8 }: ProgressBarProps) {
  const pct = target > 0 ? Math.min((current / target) * 100, 100) : 0;
  const over = target > 0 && current > target;

  return (
    <div className="w-full">
      {(label || showPct) && (
        <div className="flex justify-between text-xs text-gray-400 mb-2">
          {label && <span>{label}</span>}
          {showPct && (
            <span className={over ? 'text-green-400 font-semibold' : 'text-gray-300'}>
              {pct.toFixed(1)}%
            </span>
          )}
        </div>
      )}
      <div
        className="w-full bg-[#0F1114] rounded-full overflow-hidden ring-1 ring-[#2A2F36] shadow-inner"
        style={{ height: `${height}px` }}
        role="progressbar"
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className={`h-full rounded-full transition-all duration-500 ${over ? 'bg-[#35D07F]' : 'bg-gradient-to-r from-[#F5C400] to-[#FFE06B]'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
