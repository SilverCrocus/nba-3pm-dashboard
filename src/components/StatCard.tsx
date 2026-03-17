interface StatCardProps {
  title: string;
  value: string;
  subtitle?: string;
  valueColor?: 'green' | 'red' | 'neutral';
  badge?: {
    color: 'red' | 'yellow' | 'green';
    label: string;
    tooltip: string;
  };
}

const VALUE_COLORS = {
  green: 'text-[#22c55e]',
  red: 'text-[#ef4444]',
  neutral: 'text-white',
};

const BADGE_COLORS = {
  red: 'bg-red-500/20 text-red-400',
  yellow: 'bg-yellow-500/20 text-yellow-400',
  green: 'bg-green-500/20 text-green-400',
};

const BADGE_DOTS = {
  red: 'bg-red-400',
  yellow: 'bg-yellow-400',
  green: 'bg-green-400',
};

export function StatCard({ title, value, subtitle, valueColor = 'neutral', badge }: StatCardProps) {
  return (
    <div className="bg-[rgba(38,38,45,0.6)] backdrop-blur-md border border-white/[0.08] rounded-2xl md:rounded-3xl p-3 md:p-6">
      <p className="text-white/50 text-xs md:text-sm font-medium mb-0.5 md:mb-1">{title}</p>
      <p className={`text-xl md:text-3xl font-bold font-display ${VALUE_COLORS[valueColor]}`}>
        {value}
      </p>
      <div className="flex items-center gap-2 mt-0.5 md:mt-1">
        {subtitle && (
          <p className="text-white/50 text-xs md:text-sm">{subtitle}</p>
        )}
        {badge && (
          <span
            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium ${BADGE_COLORS[badge.color]}`}
            title={badge.tooltip}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${BADGE_DOTS[badge.color]}`} />
            {badge.label}
          </span>
        )}
      </div>
    </div>
  );
}

// Helper to determine significance badge based on bet count
export function getSignificanceBadge(settledCount: number): StatCardProps['badge'] {
  if (settledCount < 100) {
    return {
      color: 'red',
      label: 'Early',
      tooltip: `${settledCount} settled bets — too early for statistical significance. Need 500+.`,
    };
  }
  if (settledCount <= 500) {
    return {
      color: 'yellow',
      label: 'Building',
      tooltip: `${settledCount} settled bets — approaching statistical significance. Need ~800+ for high confidence.`,
    };
  }
  return {
    color: 'green',
    label: 'Significant',
    tooltip: `${settledCount} settled bets — statistically significant sample size.`,
  };
}
