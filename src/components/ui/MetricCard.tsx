interface MetricCardProps {
  title: string;
  value: string;
  subtitle?: string;
  badge?: React.ReactNode;
  highlight?: boolean;
  className?: string;
}

export default function MetricCard({
  title, value, subtitle, badge, highlight, className = '',
}: MetricCardProps) {
  return (
    <div
      className={`rounded-lg p-4 border shadow-[0_18px_40px_rgba(0,0,0,0.16)] transition-colors duration-150 ${
        highlight
          ? 'bg-[#F5C400]/12 border-[#F5C400]/35'
          : 'bg-[#17191C]/92 border-[#2A2F36] hover:border-[#3B424C]'
      } ${className}`}
    >
      <p className="text-xs text-gray-400 mb-2 uppercase tracking-[0.08em] leading-snug">{title}</p>
      <p className={`text-[1.65rem] font-bold tabular-nums leading-tight ${highlight ? 'text-[#F5C400]' : 'text-white'}`}>
        {value}
      </p>
      {(subtitle || badge) && (
        <div className="mt-2 flex items-center gap-2">
          {subtitle && <p className="text-xs text-gray-500 leading-snug">{subtitle}</p>}
          {badge}
        </div>
      )}
    </div>
  );
}
