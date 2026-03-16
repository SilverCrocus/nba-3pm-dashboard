'use client';

import { StatCard } from '@/components/StatCard';
import { SignalsTable } from '@/components/SignalsTable';
import { PnLChart } from '@/components/PnLChart';
import { RecentResults } from '@/components/RecentResults';
import { BankBalanceCard } from '@/components/BankBalanceCard';
import { useLatestSignals, usePerformanceStats, useRecentResults, usePnL } from '@/hooks/useTrades';
import { usePlayerTeams } from '@/hooks/useLiveScores';

export default function Dashboard() {
  const { signals: rawSignals, signalDate, noSignalsToday, loading: signalsLoading } = useLatestSignals();
  const signals = usePlayerTeams(rawSignals);
  const { stats, loading: statsLoading } = usePerformanceStats();
  const { pnlData, totalProfit, dailyPnL, loading: pnlLoading } = usePnL();
  const { results, loading: resultsLoading } = useRecentResults(50);

  return (
    <div className="min-h-screen">
      <main className="p-4 md:p-8 max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6 md:mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-white font-display">Dashboard</h1>
          <p className="text-white/50 text-sm md:text-base">Track bets and maximize edge</p>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-3 md:gap-6 mb-4 md:mb-6">
          <BankBalanceCard
            totalProfit={totalProfit}
            totalBets={stats.totalBets}
            loading={pnlLoading}
          />
          <StatCard
            title="Win Rate"
            value={statsLoading ? '...' : (stats.winRate * 100).toFixed(1) + '%'}
            subtitle={stats.totalBets + ' total bets'}
          />
          <StatCard
            title={noSignalsToday ? 'Today' : signalDate ? new Date(signalDate + 'T12:00:00Z').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' }) : 'Bets'}
            value={signalsLoading ? '...' : noSignalsToday ? '0' : signals.length.toString()}
            subtitle={noSignalsToday ? 'no edge found' : signals.filter(s => !s.outcome).length + ' pending'}
          />
        </div>

        {/* Charts Row - stack on mobile */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 md:gap-6 mb-4 md:mb-6">
          <div className="lg:col-span-2">
            <PnLChart data={pnlData} loading={pnlLoading} />
          </div>
          <div className="lg:col-span-3">
            <SignalsTable
              signals={sizingSignals}
              loading={signalsLoading}
              bankroll={bankroll}
              onBankrollChange={handleBankrollChange}
              totalRisk={totalRisk}
              activeBets={activeBets}
              kellyFraction={kellyFraction}
              noSignalsToday={noSignalsToday}
              signalDate={signalDate}
            />
          </div>
        </div>

        {/* Recent Results */}
        <RecentResults results={results} loading={resultsLoading} dailyPnL={dailyChanges} />
      </main>
    </div>
  );
}
