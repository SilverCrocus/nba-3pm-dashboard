interface StatCardProps {
  title: string;
  value: string;
  subtitle?: string;
  trend?: 'up' | 'down' | 'neutral';
}

export function StatCard({ title, value, subtitle, trend }: StatCardProps) {
  const trendColor = trend === 'up' ? 'text-green-400' : trend === 'down' ? 'text-red-400' : 'text-white/50';

  return (
    <div className="bg-[rgba(38,38,45,0.6)] backdrop-blur-md border border-white/[0.08] rounded-3xl p-6">
      <p className="text-white/50 text-sm font-medium mb-1">{title}</p>
      <p className="text-3xl font-bold text-white font-display">{value}</p>
      {subtitle && (
        <p className={`text-sm mt-1 ${trendColor}`}>{subtitle}</p>
      )}
    </div>
  );
}
