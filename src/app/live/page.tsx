'use client';

import { useLatestSignals } from '@/hooks/useTrades';
import { useLiveScores, useLiveSignals } from '@/hooks/useLiveScores';
import { LiveHeader } from '@/components/LiveHeader';
import { GameCard } from '@/components/GameCard';
import { LiveStatusBadge } from '@/components/LiveStatusBadge';

export default function LiveTracker() {
  const { signals, signalDate, loading: signalsLoading } = useLatestSignals();
  const { games, isLoading: scoresLoading, lastUpdated, isConnected } = useLiveScores();
  const { gamesWithSignals, unmatchedSignals } = useLiveSignals(signals, games, signalDate);

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
            {gamesWithSignals.map(({ game, signals }) => (
              <GameCard key={game.gameId} game={game} signals={signals} />
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
                  {unmatchedSignals.map((s) => (
                    <div key={s.signal_id} className="bg-white/5 rounded-xl p-3">
                      <div className="flex justify-between items-start mb-1.5">
                        <div>
                          <p className="font-medium text-white text-sm">{s.player_name}</p>
                          <p className="text-xs text-white/40">{s.side.toUpperCase()} {s.line}</p>
                        </div>
                        <LiveStatusBadge status={s.signalStatus} />
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-green-400 font-medium">+{s.edge_pct.toFixed(1)}%</span>
                        <span className="text-white/50">{s.bookmaker}</span>
                      </div>
                    </div>
                  ))}
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
                    {unmatchedSignals.map((s) => (
                      <tr key={s.signal_id} className="border-b border-white/[0.04]">
                        <td className="px-6 py-3">
                          <p className="font-medium text-white">{s.player_name}</p>
                        </td>
                        <td className="px-3 py-3 text-center text-white/70 font-mono">{s.line}</td>
                        <td className="px-3 py-3 text-center">
                          <span className={`text-xs font-medium ${s.side === 'over' ? 'text-green-400' : 'text-red-400'}`}>
                            {s.side.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-center text-green-400 font-medium text-sm">+{s.edge_pct.toFixed(1)}%</td>
                        <td className="px-3 py-3 text-center text-white/50">{s.bookmaker}</td>
                        <td className="px-6 py-3 text-right">
                          <LiveStatusBadge status={s.signalStatus} />
                        </td>
                      </tr>
                    ))}
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
