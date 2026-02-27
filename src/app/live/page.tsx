'use client';

import { useMemo } from 'react';
import { useLatestSignals } from '@/hooks/useTrades';
import { useLiveScores, useLiveSignals } from '@/hooks/useLiveScores';
import { useSignalTransitions } from '@/hooks/useSignalTransitions';
import { isSweetSpot } from '@/hooks/useBetSizing';
import { LiveHeader } from '@/components/LiveHeader';
import { GameCard } from '@/components/GameCard';
import { DaySummary } from '@/components/DaySummary';
import { LiveStatusBadge } from '@/components/LiveStatusBadge';
import { EnrichedSignal } from '@/types/database';

function sortSignals(signals: EnrichedSignal[]): EnrichedSignal[] {
  return [...signals].sort((a, b) => {
    const aSweet = isSweetSpot(a.edge_pct) ? 0 : 1;
    const bSweet = isSweetSpot(b.edge_pct) ? 0 : 1;
    if (aSweet !== bSweet) return aSweet - bSweet;
    return b.edge_pct - a.edge_pct;
  });
}

export default function LiveTracker() {
  const { signals, signalDate, loading: signalsLoading } = useLatestSignals();
  const { games, isLoading: scoresLoading, lastUpdated, isConnected } = useLiveScores();
  const { gamesWithSignals, unmatchedSignals } = useLiveSignals(signals, games, signalDate);

  const allEnrichedSignals = useMemo(
    () => [...gamesWithSignals.flatMap(g => g.signals), ...unmatchedSignals],
    [gamesWithSignals, unmatchedSignals],
  );
  const transitions = useSignalTransitions(allEnrichedSignals);

  const isLoading = signalsLoading || scoresLoading;
  const hasActiveGames = games.some(g => g.status === 'live');
  const hasAnySignals = signals.length > 0;

  return (
    <div className="min-h-screen">
      <main className="p-4 md:p-8 max-w-6xl mx-auto">
        <LiveHeader
          lastUpdated={lastUpdated}
          isConnected={isConnected}
          isLoading={isLoading}
          hasActiveGames={hasActiveGames}
        />

        {isLoading ? (
          <div className="text-white/50 text-center py-20">Loading live data...</div>
        ) : !hasAnySignals ? (
          <div className="bg-[rgba(38,38,45,0.6)] backdrop-blur-md border border-white/[0.08] rounded-2xl md:rounded-3xl p-8 md:p-12 text-center">
            <p className="text-white/50 text-lg">No signals today</p>
            <p className="text-white/30 text-sm mt-2">Check back when today&apos;s signals are posted</p>
          </div>
        ) : (
          <div className="space-y-4 md:space-y-6">
            <DaySummary signals={allEnrichedSignals} />
            {gamesWithSignals.map(({ game, signals }) => (
              <GameCard key={game.gameId} game={game} signals={signals} transitions={transitions} />
            ))}

            {unmatchedSignals.length > 0 && (
              <div className="bg-[rgba(38,38,45,0.6)] backdrop-blur-md border border-white/[0.08] rounded-2xl md:rounded-3xl overflow-hidden">
                <div className="px-4 md:px-6 py-3 md:py-4 border-b border-white/[0.06] flex items-center justify-between">
                  <span className="text-white font-semibold font-display text-sm md:text-base">
                    {gamesWithSignals.length > 0 ? 'Other Signals' : 'Today\u0027s Signals'}
                  </span>
                  <LiveStatusBadge status="scheduled" />
                </div>

                {/* Mobile */}
                <div className="md:hidden p-3 space-y-2">
                  {sortSignals(unmatchedSignals).map((s) => {
                    const sweet = isSweetSpot(s.edge_pct);
                    return (
                      <div key={s.signal_id} className={`bg-white/5 rounded-xl p-3 ${sweet ? '' : 'opacity-40'}`}>
                        <div className="flex justify-between items-start mb-1.5">
                          <div>
                            <p className="font-medium text-white text-sm">{s.player_name}</p>
                            <p className="text-xs text-white/40">{s.side.toUpperCase()} {s.line}</p>
                          </div>
                          <LiveStatusBadge status={s.signalStatus} />
                        </div>
                        <div className="flex justify-between text-xs">
                          {sweet ? (
                            <span className="text-green-400 font-medium">+{s.edge_pct.toFixed(1)}%</span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded-full bg-white/10 text-white/50 text-[10px] font-medium">TRACKING ONLY</span>
                          )}
                          <span className="text-white/50">{s.bookmaker}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Desktop */}
                <table className="w-full hidden md:table">
                  <thead>
                    <tr className="text-white/40 text-xs uppercase tracking-wider border-b border-white/[0.06]">
                      <th className="text-left px-6 py-2.5">Player</th>
                      <th className="text-center px-3 py-2.5">Line</th>
                      <th className="text-center px-3 py-2.5">Side</th>
                      <th className="text-center px-3 py-2.5">Edge</th>
                      <th className="text-center px-3 py-2.5">Book</th>
                      <th className="text-right px-6 py-2.5">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortSignals(unmatchedSignals).map((s) => {
                      const sweet = isSweetSpot(s.edge_pct);
                      return (
                        <tr key={s.signal_id} className={`border-b border-white/[0.04] ${sweet ? '' : 'opacity-40'}`}>
                          <td className="px-6 py-3">
                            <p className="font-medium text-white">{s.player_name}</p>
                          </td>
                          <td className="px-3 py-3 text-center text-white/70 font-mono">{s.line}</td>
                          <td className="px-3 py-3 text-center">
                            <span className={`text-xs font-medium ${s.side === 'over' ? 'text-green-400' : 'text-red-400'}`}>
                              {s.side.toUpperCase()}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-center">
                            {sweet ? (
                              <span className="text-green-400 font-medium text-sm">+{s.edge_pct.toFixed(1)}%</span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full bg-white/10 text-white/50 text-[10px] font-medium">TRACKING ONLY</span>
                            )}
                          </td>
                          <td className="px-3 py-3 text-center text-white/50">{s.bookmaker}</td>
                          <td className="px-6 py-3 text-right">
                            <LiveStatusBadge status={s.signalStatus} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
