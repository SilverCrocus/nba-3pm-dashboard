interface RecentResultsProps {
  dailyPnL: Record<string, number>;
  dailyRecords: Record<string, { wins: number; losses: number; pushes: number }>;
  loading: boolean;
}

interface DayData {
  date: string;
  pnl: number;
  wins: number;
  losses: number;
  winRate: number;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T12:00:00Z');
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
}

function formatUnits(value: number): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(1)}u`;
}

function isToday(dateStr: string): boolean {
  const todayET = new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
  return dateStr === todayET;
}

export function RecentResults({ dailyPnL, dailyRecords, loading }: RecentResultsProps) {
  if (loading) {
    return (
      <div className="rounded-2xl md:rounded-3xl p-4 md:p-6" style={{ background: 'linear-gradient(135deg, #ddd6fe 0%, #c4b5fd 100%)' }}>
        <div className="text-slate-700/50">Loading results...</div>
      </div>
    );
  }

  // Build day data sorted by date, limited to most recent 50 days
  const days: DayData[] = Object.keys(dailyPnL)
    .sort()
    .slice(-50)
    .map(date => {
      const record = dailyRecords[date] ?? { wins: 0, losses: 0 };
      const total = record.wins + record.losses;
      return {
        date,
        pnl: dailyPnL[date],
        wins: record.wins,
        losses: record.losses,
        winRate: total > 0 ? record.wins / total : 0,
      };
    });

  const totalWins = days.reduce((sum, d) => sum + d.wins, 0);
  const totalLosses = days.reduce((sum, d) => sum + d.losses, 0);
  const totalBets = totalWins + totalLosses;
  const totalProfit = days.reduce((sum, d) => sum + d.pnl, 0);
  const maxAbsPnL = Math.max(...days.map(d => Math.abs(d.pnl)), 1);

  return (
    <div className="rounded-2xl md:rounded-3xl p-4 md:p-6 overflow-hidden" style={{ background: 'linear-gradient(135deg, #ddd6fe 0%, #c4b5fd 100%)' }}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4 md:mb-6">
        <div>
          <h3 className="text-lg md:text-xl font-semibold text-slate-900">Daily Performance</h3>
          <p className="text-slate-600 text-xs md:text-sm">Last {days.length} days</p>
        </div>
        <div className="flex items-center gap-3 md:gap-4">
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
          <div className="bg-white/60 backdrop-blur-sm rounded-full px-2.5 md:px-3 py-1 md:py-1.5">
            <span className={`text-xs md:text-sm font-medium ${totalProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {formatUnits(totalProfit)} ({totalBets} bets)
            </span>
          </div>
        </div>
      </div>

      {/* Chart area with daily P&L bars */}
      <div className="overflow-x-auto">
        <div className="flex items-end gap-1 md:gap-1.5" style={{ minWidth: `${days.length * 28}px` }}>
          {days.map((day, i) => {
            const isProfitable = day.pnl >= 0;
            // Bar height based on P&L magnitude (scale to max)
            const barHeight = Math.max(15, (Math.abs(day.pnl) / maxAbsPnL) * 100);
            const winRatePercent = (day.winRate * 100).toFixed(0);
            return (
              <div
                key={day.date}
                className="flex-1 min-w-[20px] flex flex-col items-center group"
              >
                <div className="h-24 md:h-32 w-full flex items-end justify-center relative">
                  <div className="absolute -top-14 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-xs px-2.5 py-1.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10 flex flex-col items-center gap-0.5">
                    <span className={day.pnl >= 0 ? 'text-emerald-400 font-medium' : 'text-red-400 font-medium'}>
                      {formatUnits(day.pnl)}
                    </span>
                    <span className="text-white/70">{day.wins}W-{day.losses}L ({winRatePercent}%)</span>
                  </div>
                  <div
                    className={`w-3 md:w-4 rounded-t-sm transition-all duration-200 group-hover:scale-110 cursor-pointer ${isProfitable ? 'bg-emerald-500' : 'bg-orange-400'}`}
                    style={{
                      height: `${barHeight}%`,
                      opacity: 0.7 + (i / days.length) * 0.3,
                    }}
                  />
                </div>
                <div className="text-[10px] md:text-xs text-slate-600/70 mt-2 text-center whitespace-nowrap">
                  {isToday(day.date) ? 'Today' : formatDate(day.date)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
