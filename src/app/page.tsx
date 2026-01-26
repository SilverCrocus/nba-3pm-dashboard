'use client';

import { Sidebar } from '@/components/Sidebar';
import { StatCard } from '@/components/StatCard';
import { SignalsTable } from '@/components/SignalsTable';
import { PnLChart } from '@/components/PnLChart';
import { RecentResults } from '@/components/RecentResults';
import { useTodaysSignals, usePerformanceStats, useDailyPnL, useRecentResults } from '@/hooks/useTrades';

export default function Dashboard() {
  const { signals, loading: signalsLoading } = useTodaysSignals();
  const { stats, loading: statsLoading } = usePerformanceStats();
  const { dailyData, loading: pnlLoading } = useDailyPnL();
  const { results, loading: resultsLoading } = useRecentResults(50);

  return (
    <div className="flex min-h-screen">
      <Sidebar />

      <main className="flex-1 p-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold text-white font-display">NBA 3PM Model</h1>
            <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-400">
              {statsLoading ? '...' : (stats.winRate * 100).toFixed(0) + '% win rate'}
            </span>
          </div>
          <p className="text-white/50">Track bets and maximize edge</p>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-6 mb-6">
          <StatCard
            title="Total PnL"
            value={statsLoading ? '...' : (stats.totalPnL >= 0 ? '+' : '') + (stats.totalPnL * 100).toFixed(1) + '%'}
            subtitle={stats.wins + 'W - ' + stats.losses + 'L'}
            trend={stats.totalPnL >= 0 ? 'up' : 'down'}
          />
          <StatCard
            title="Win Rate"
            value={statsLoading ? '...' : (stats.winRate * 100).toFixed(1) + '%'}
            subtitle={stats.totalBets + ' total bets'}
          />
          <StatCard
            title="Todays Bets"
            value={signalsLoading ? '...' : signals.length.toString()}
            subtitle={signals.filter(s => !s.outcome).length + ' pending'}
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-5 gap-6 mb-6">
          <div className="col-span-2">
            <PnLChart data={dailyData} loading={pnlLoading} />
          </div>
          <div className="col-span-3">
            <SignalsTable signals={signals} loading={signalsLoading} />
          </div>
        </div>

        {/* Recent Results */}
        <RecentResults results={results} loading={resultsLoading} />
      </main>
    </div>
  );
}
