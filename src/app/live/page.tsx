'use client';

import { useTodaysSignals } from '@/hooks/useTrades';
import { useLiveScores, useLiveSignals } from '@/hooks/useLiveScores';
import { LiveHeader } from '@/components/LiveHeader';
import { GameCard } from '@/components/GameCard';

export default function LiveTracker() {
  const { signals, loading: signalsLoading } = useTodaysSignals();
  const { games, isLoading: scoresLoading, lastUpdated, isConnected } = useLiveScores();
  const gamesWithSignals = useLiveSignals(signals, games);

  const isLoading = signalsLoading || scoresLoading;
  const hasActiveGames = games.some(g => g.status === 'live');

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
        ) : gamesWithSignals.length === 0 ? (
          <div className="bg-[rgba(38,38,45,0.6)] backdrop-blur-md border border-white/[0.08] rounded-2xl md:rounded-3xl p-8 md:p-12 text-center">
            <p className="text-white/50 text-lg">No games with signals today</p>
            <p className="text-white/30 text-sm mt-2">Check back when today&apos;s signals are posted</p>
          </div>
        ) : (
          <div className="space-y-4 md:space-y-6">
            {gamesWithSignals.map(({ game, signals }) => (
              <GameCard key={game.gameId} game={game} signals={signals} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
