import { PaperTrade } from '@/types/database';

interface RecentResultsProps {
  results: PaperTrade[];
  loading: boolean;
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

export function RecentResults({ results, loading }: RecentResultsProps) {
  if (loading) {
    return (
      <div className="rounded-3xl p-6" style={{ background: 'linear-gradient(135deg, #ddd6fe 0%, #c4b5fd 100%)' }}>
        <div className="text-slate-700/50">Loading results...</div>
      </div>
    );
  }

  const displayResults = results.slice(0, 20).reverse();
  const wins = displayResults.filter(r => r.outcome === 'win').length;
  const total = displayResults.length;
  const winRate = total > 0 ? ((wins / total) * 100).toFixed(1) : '0';
  const batchProfit = displayResults.reduce((sum, r) => sum + (r.profit || 0), 0) * 100;

  return (
    <div className="rounded-3xl p-6" style={{ background: 'linear-gradient(135deg, #ddd6fe 0%, #c4b5fd 100%)' }}>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h3 className="text-xl font-semibold text-slate-900">Recent Results</h3>
          <p className="text-slate-600 text-sm">Last {displayResults.length} bets</p>
        </div>
        <div className="flex items-center gap-4">
          {/* Legend */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span className="text-slate-700 text-sm">Win</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-orange-400" />
              <span className="text-slate-700 text-sm">Loss</span>
            </div>
          </div>
          {/* Batch stat badge */}
          <div className="bg-white/60 backdrop-blur-sm rounded-full px-3 py-1.5">
            <span className={`text-sm font-medium ${batchProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {batchProfit >= 0 ? '+' : ''}{batchProfit.toFixed(1)}% ({displayResults.length} bets)
            </span>
          </div>
        </div>
      </div>

      {/* Chart area with win/loss bars */}
      <div className="h-32 mb-4 flex items-center gap-1">
        {displayResults.map((result, i) => {
          const isWin = result.outcome === 'win';
          const barHeight = Math.abs((result.profit || 0.01) * 800) + 20;
          return (
            <div
              key={result.signal_id}
              className="flex-1 flex items-center justify-center h-full"
            >
              <div
                className={`w-full max-w-3 rounded-sm ${isWin ? 'bg-emerald-500' : 'bg-orange-400'}`}
                style={{
                  height: `${Math.min(barHeight, 100)}%`,
                  opacity: 0.7 + (i / displayResults.length) * 0.3,
                }}
                title={`${result.player_name}: ${result.outcome} (${((result.profit || 0) * 100).toFixed(1)}%)`}
              />
            </div>
          );
        })}
      </div>

      {/* Date labels */}
      <div className="flex justify-between text-xs text-slate-600/70 border-t border-slate-400/20 pt-3">
        {displayResults.map((result, i) => {
          const showLabel = i === 0 || i === displayResults.length - 1 || i % Math.max(1, Math.floor(displayResults.length / 8)) === 0;
          if (!showLabel) return <span key={result.signal_id} className="flex-1" />;
          return (
            <span key={result.signal_id} className="flex-1 text-center first:text-left last:text-right">
              {isToday(result.signal_date) ? 'Today' : formatDate(result.signal_date)}
            </span>
          );
        })}
      </div>
    </div>
  );
}
