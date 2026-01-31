import { PaperTrade } from '@/types/database';

interface RecentResultsProps {
  results: PaperTrade[];
  loading: boolean;
}

interface DailyAggregate {
  date: string;
  wins: number;
  losses: number;
  total: number;
  winRate: number;
  profit: number;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function isToday(dateStr: string): boolean {
  const date = new Date(dateStr);
  const today = new Date();
  return date.toDateString() === today.toDateString();
}

function aggregateByDay(results: PaperTrade[]): DailyAggregate[] {
  const byDate: Record<string, DailyAggregate> = {};

  for (const result of results) {
    const date = result.signal_date;
    if (!byDate[date]) {
      byDate[date] = { date, wins: 0, losses: 0, total: 0, winRate: 0, profit: 0 };
    }
    byDate[date].total++;
    if (result.outcome === 'win') byDate[date].wins++;
    if (result.outcome === 'loss') byDate[date].losses++;
    byDate[date].profit += result.profit || 0;
  }

  // Calculate win rates
  for (const day of Object.values(byDate)) {
    day.winRate = day.total > 0 ? day.wins / day.total : 0;
  }

  // Sort by date ascending and return
  return Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date));
}

export function RecentResults({ results, loading }: RecentResultsProps) {
  if (loading) {
    return (
      <div className="rounded-3xl p-6" style={{ background: 'linear-gradient(135deg, #ddd6fe 0%, #c4b5fd 100%)' }}>
        <div className="text-slate-700/50">Loading results...</div>
      </div>
    );
  }

  const dailyData = aggregateByDay(results);
  const totalWins = dailyData.reduce((sum, d) => sum + d.wins, 0);
  const totalLosses = dailyData.reduce((sum, d) => sum + d.losses, 0);
  const totalBets = totalWins + totalLosses;
  const overallWinRate = totalBets > 0 ? ((totalWins / totalBets) * 100).toFixed(1) : '0';
  const totalProfit = dailyData.reduce((sum, d) => sum + d.profit, 0) * 100;

  return (
    <div className="rounded-3xl p-6" style={{ background: 'linear-gradient(135deg, #ddd6fe 0%, #c4b5fd 100%)' }}>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h3 className="text-xl font-semibold text-slate-900">Daily Performance</h3>
          <p className="text-slate-600 text-sm">Last {dailyData.length} days</p>
        </div>
        <div className="flex items-center gap-4">
          {/* Legend */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span className="text-slate-700 text-sm">&gt;50%</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-orange-400" />
              <span className="text-slate-700 text-sm">&lt;50%</span>
            </div>
          </div>
          {/* Overall stat badge */}
          <div className="bg-white/60 backdrop-blur-sm rounded-full px-3 py-1.5">
            <span className={`text-sm font-medium ${totalProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {totalProfit >= 0 ? '+' : ''}{totalProfit.toFixed(1)}% ({totalBets} bets)
            </span>
          </div>
        </div>
      </div>

      {/* Chart area with daily win rate bars */}
      <div className="h-32 mb-4 flex items-end gap-1">
        {dailyData.map((day, i) => {
          const isWinning = day.winRate >= 0.5;
          // Bar height based on win rate (50% = baseline, scale from 0-100%)
          const barHeight = Math.max(20, day.winRate * 100);
          return (
            <div
              key={day.date}
              className="flex-1 flex flex-col items-center justify-end h-full"
            >
              <div
                className={`w-full max-w-6 rounded-t-sm ${isWinning ? 'bg-emerald-500' : 'bg-orange-400'}`}
                style={{
                  height: `${barHeight}%`,
                  opacity: 0.7 + (i / dailyData.length) * 0.3,
                }}
                title={`${formatDate(day.date)}: ${day.wins}W-${day.losses}L (${(day.winRate * 100).toFixed(0)}%) | ${(day.profit * 100).toFixed(1)}%`}
              />
            </div>
          );
        })}
      </div>

      {/* Date labels */}
      <div className="flex justify-between text-xs text-slate-600/70 border-t border-slate-400/20 pt-3">
        {dailyData.map((day, i) => {
          const showLabel = i === 0 || i === dailyData.length - 1 || i % Math.max(1, Math.floor(dailyData.length / 6)) === 0;
          if (!showLabel) return <span key={day.date} className="flex-1" />;
          return (
            <span key={day.date} className="flex-1 text-center first:text-left last:text-right">
              {isToday(day.date) ? 'Today' : formatDate(day.date)}
            </span>
          );
        })}
      </div>
    </div>
  );
}
