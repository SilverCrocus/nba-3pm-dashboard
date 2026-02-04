'use client';

import { useState } from 'react';
import { StatCard } from '@/components/StatCard';
import { SignalsTable } from '@/components/SignalsTable';
import { PnLChart } from '@/components/PnLChart';
import { RecentResults } from '@/components/RecentResults';
import { BankBalanceCard } from '@/components/BankBalanceCard';
import { useTodaysSignals, usePerformanceStats, useRecentResults, useBankrollSimulation } from '@/hooks/useTrades';
import { KellyFraction } from '@/types/database';

const STARTING_BANKROLL = 1000;

export default function Dashboard() {
  const [kellyFraction, setKellyFraction] = useState<KellyFraction>(0.5);

  const { signals, loading: signalsLoading } = useTodaysSignals();
  const { stats, loading: statsLoading } = usePerformanceStats();
  const { bankrollData, currentBankroll, loading: bankrollLoading } = useBankrollSimulation(kellyFraction, STARTING_BANKROLL);
  const { results, loading: resultsLoading } = useRecentResults(50);

  return (
    <div className="min-h-screen">
      <main className="p-4 md:p-8 max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6 md:mb-8">
          <div className="flex items-center gap-3 mb-2">
            {/* Logo */}
            <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl md:rounded-2xl flex items-center justify-center text-xl md:text-2xl flex-shrink-0">
              <span role="img" aria-label="basketball">&#127936;</span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
              <h1 className="text-2xl md:text-3xl font-bold text-white font-display">NBA 3PM Model</h1>
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-400 w-fit">
                {statsLoading ? '...' : (stats.winRate * 100).toFixed(0) + '% win rate'}
              </span>
            </div>
          </div>
          <p className="text-white/50 text-sm md:text-base ml-13 md:ml-15">Track bets and maximize edge</p>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-3 md:gap-6 mb-4 md:mb-6">
          <BankBalanceCard
            currentBankroll={currentBankroll}
            startingBankroll={STARTING_BANKROLL}
            kellyFraction={kellyFraction}
            onKellyChange={setKellyFraction}
            loading={bankrollLoading}
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

        {/* Charts Row - stack on mobile */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 md:gap-6 mb-4 md:mb-6">
          <div className="lg:col-span-2">
            <PnLChart data={bankrollData} kellyFraction={kellyFraction} loading={bankrollLoading} />
          </div>
          <div className="lg:col-span-3">
            <SignalsTable signals={signals} loading={signalsLoading} />
          </div>
        </div>

        {/* Recent Results */}
        <RecentResults results={results} loading={resultsLoading} />
      </main>
    </div>
  );
}
