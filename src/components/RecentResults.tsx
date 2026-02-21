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
  const date = new Date(dateStr + 'T12:00:00Z');
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
}

function isToday(dateStr: string): boolean {
  const todayET = new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
  return dateStr === todayET;
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
      <div className="rounded-2xl md:rounded-3xl p-4 md:p-6" style={{ background: 'linear-gradient(135deg, #ddd6fe 0%, #c4b5fd 100%)' }}>
        <div className="text-slate-700/50">Loading results...</div>
      </div>
    );
  }

  const dailyData = aggregateByDay(results);
  const totalWins = dailyData.reduce((sum, d) => sum + d.wins, 0);
  const totalLosses = dailyData.reduce((sum, d) => sum + d.losses, 0);
  const totalBets = totalWins + totalLosses;
  const totalProfit = dailyData.reduce((sum, d) => sum + d.profit, 0) * 100;

  return (
    <div className="rounded-2xl md:rounded-3xl p-4 md:p-6" style={{ background: 'linear-gradient(135deg, #ddd6fe 0%, #c4b5fd 100%)' }}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4 md:mb-6">
        <div>
          <h3 className="text-lg md:text-xl font-semibold text-slate-900">Daily Performance</h3>
          <p className="text-slate-600 text-xs md:text-sm">Last {dailyData.length} days</p>
        </div>
        <div className="flex items-center gap-3 md:gap-4">
          {/* Legend - hidden on small mobile */}
          <div className="hidden sm:flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span className="text-slate-700 text-sm">Profit</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-orange-400" />
              <span className="text-slate-700 text-sm">Loss</span>
            </div>
          </div>
          {/* Overall stat badge */}
          <div className="bg-white/60 backdrop-blur-sm rounded-full px-2.5 md:px-3 py-1 md:py-1.5">
            <span className={`text-xs md:text-sm font-medium ${totalProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {totalProfit >= 0 ? '+' : ''}{totalProfit.toFixed(1)}% ({totalBets} bets)
            </span>
          </div>
        </div>
      </div>

      {/* Chart area with daily win rate bars */}
      <div className="flex items-end gap-1 md:gap-2">
        {dailyData.map((day, i) => {
          const isProfitable = day.profit >= 0;
          // Bar height based on win rate (50% = baseline, scale from 0-100%)
          const barHeight = Math.max(20, day.winRate * 100);
          const winRatePercent = (day.winRate * 100).toFixed(0);
          return (
            <div
              key={day.date}
              className="flex-1 flex flex-col items-center group"
            >
              {/* Bar container with fixed height */}
              <div className="h-24 md:h-32 w-full flex items-end justify-center relative">
                {/* Tooltip on hover */}
                <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-xs px-2.5 py-1.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10 flex flex-col items-center gap-0.5">
                  <span className="font-medium">{winRatePercent}% win rate</span>
                  <span className={day.profit >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                    {day.profit >= 0 ? '+' : ''}{(day.profit * 100).toFixed(1)}% profit
                  </span>
                </div>
                <div
                  className={`w-3 md:w-4 rounded-t-sm transition-all duration-200 group-hover:scale-110 group-hover:opacity-100 cursor-pointer ${isProfitable ? 'bg-emerald-500' : 'bg-orange-400'}`}
                  style={{
                    height: `${barHeight}%`,
                    opacity: 0.7 + (i / dailyData.length) * 0.3,
                  }}
                />
              </div>
              {/* Date label directly under bar */}
              <div className="text-[10px] md:text-xs text-slate-600/70 mt-2 text-center">
                {isToday(day.date) ? 'Today' : formatDate(day.date)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
