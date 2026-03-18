'use client';

import { useState, useMemo } from 'react';
import { StatCard, getSignificanceBadge } from '@/components/StatCard';
import { SignalsTable } from '@/components/SignalsTable';
import { PnLChart } from '@/components/PnLChart';
import { DrawdownChart } from '@/components/DrawdownChart';
import { MonthlyHeatmap } from '@/components/MonthlyHeatmap';
import { RecentResults } from '@/components/RecentResults';
import { StrategyFilter } from '@/components/StrategyFilter';
import { DateRangeFilter } from '@/components/DateRangeFilter';
import {
  useLatestSignals,
  useSettledTrades,
  useStrategies,
  computeStats,
  DateRange,
} from '@/hooks/useTrades';
import { usePlayerTeams } from '@/hooks/useLiveScores';

type DatePreset = '7d' | '30d' | 'season' | 'all';

export default function Dashboard() {
  // Filter state
  const [strategy, setStrategy] = useState<string | null>(null);
  const [datePreset, setDatePreset] = useState<DatePreset>('all');
  const [dateRange, setDateRange] = useState<DateRange | null>(null);

  // Data hooks
  const { signals: rawSignals, signalDate, noSignalsToday, loading: signalsLoading } = useLatestSignals();
  const signals = usePlayerTeams(rawSignals);
  const strategies = useStrategies();
  const { trades, loading: tradesLoading } = useSettledTrades(strategy ?? undefined, dateRange);

  // Compute all stats from settled trades
  const stats = useMemo(() => computeStats(trades), [trades]);

  // Format helpers
  const formatPnL = (v: number) => `${v >= 0 ? '+' : ''}${v.toFixed(1)}u`;
  const formatPct = (v: number) => `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`;

  return (
    <div className="min-h-screen">
      <main className="p-4 md:p-8 max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6 md:mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-white font-display">Dashboard</h1>
          <p className="text-white/50 text-sm md:text-base">Track bets and maximize edge</p>
        </div>

        {/* Strategy Filter */}
        <StrategyFilter
          strategies={strategies}
          selected={strategy}
          onSelect={setStrategy}
        />

        {/* KPI Cards — 4 columns */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-4 md:mb-6">
          <StatCard
            title="Total P&L"
            value={tradesLoading ? '...' : formatPnL(stats.totalPnL)}
            subtitle={tradesLoading ? '' : `${stats.settledCount} bets settled`}
            valueColor={stats.totalPnL >= 0 ? 'green' : 'red'}
          />
          <StatCard
            title="ROI %"
            value={tradesLoading ? '...' : formatPct(stats.roi)}
            subtitle="profit / units wagered"
            valueColor={stats.roi >= 0 ? 'green' : 'red'}
          />
          <StatCard
            title="Win Rate"
            value={tradesLoading ? '...' : `${(stats.winRate * 100).toFixed(1)}%`}
            badge={tradesLoading ? undefined : getSignificanceBadge(stats.settledCount)}
          />
          <StatCard
            title="CLV %"
            value={tradesLoading || stats.clvPct === null ? 'N/A' : `${stats.clvPct.toFixed(0)}%`}
            subtitle="beating closing line"
            valueColor={stats.clvPct !== null ? (stats.clvPct > 50 ? 'green' : 'red') : 'neutral'}
          />
        </div>

        {/* Date Range Filter */}
        <div className="flex justify-end mb-3">
          <DateRangeFilter
            selected={datePreset}
            onSelect={(preset, range) => {
              setDatePreset(preset);
              setDateRange(range);
            }}
          />
        </div>

        {/* Equity Curve */}
        <div className="mb-4 md:mb-6">
          <PnLChart data={stats.pnlData} loading={tradesLoading} />
        </div>

        {/* Drawdown */}
        <div className="mb-4 md:mb-6">
          <DrawdownChart
            data={stats.drawdownData}
            currentDrawdown={stats.currentDrawdown}
            loading={tradesLoading}
          />
        </div>

        {/* Monthly Heatmap */}
        <div className="mb-4 md:mb-6">
          <MonthlyHeatmap
            dailyPnL={stats.dailyPnL}
            dailyRecords={stats.dailyRecords}
            loading={tradesLoading}
          />
        </div>

        {/* Daily Performance */}
        <div className="mb-4 md:mb-6">
          <RecentResults
            dailyPnL={stats.dailyPnL}
            dailyRecords={stats.dailyRecords}
            loading={tradesLoading}
          />
        </div>

        {/* Today's Signals (unfiltered) */}
        <SignalsTable
          signals={signals}
          loading={signalsLoading}
          noSignalsToday={noSignalsToday}
          signalDate={signalDate}
        />
      </main>
    </div>
  );
}
