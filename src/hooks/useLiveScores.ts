'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  LiveGame,
  LiveScoresResponse,
  PaperTrade,
  EnrichedSignal,
  GameWithSignals,
  SignalStatus,
  GameStatus,
} from '@/types/database';

const POLL_INTERVAL_MS = 10_000;

export function useLiveScores() {
  const [games, setGames] = useState<LiveGame[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const fetchScores = useCallback(async () => {
    try {
      const res = await fetch('/api/live-scores');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: LiveScoresResponse = await res.json();
      setGames(data.games);
      setLastUpdated(new Date(data.timestamp));
      setIsConnected(true);
    } catch {
      setIsConnected(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchScores();

    const interval = setInterval(() => {
      // Stop polling if all games are final or there are no games
      const allDone = games.length > 0 && games.every(g => g.status === 'final');
      if (!allDone) {
        fetchScores();
      }
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [fetchScores, games]);

  return { games, isLoading, lastUpdated, isConnected };
}

function deriveSignalStatus(gameStatus: GameStatus, side: 'over' | 'under', line: number, fg3m: number): SignalStatus {
  if (gameStatus === 'scheduled') return 'scheduled';
  if (gameStatus === 'live') return 'tracking';

  // Game is final — determine outcome
  if (side === 'over') {
    if (fg3m > line) return 'hit';
    if (fg3m < line) return 'miss';
    return 'push';
  } else {
    // under
    if (fg3m < line) return 'hit';
    if (fg3m > line) return 'miss';
    return 'push';
  }
}

export function useLiveSignals(signals: PaperTrade[], games: LiveGame[]): GameWithSignals[] {
  return useMemo(() => {
    if (games.length === 0 || signals.length === 0) return [];

    // Build a lookup: playerId -> LiveGame + LivePlayer
    const playerGameMap = new Map<number, { game: LiveGame; player: typeof games[0]['players'][0] }>();
    for (const game of games) {
      for (const player of game.players) {
        playerGameMap.set(player.playerId, { game, player });
      }
    }

    // Also build a lookup by team tricode -> game for scheduled games (no players yet)
    const teamGameMap = new Map<string, LiveGame>();
    for (const game of games) {
      teamGameMap.set(game.homeTeam.tricode, game);
      teamGameMap.set(game.awayTeam.tricode, game);
    }

    // Group signals by game
    const gameSignalsMap = new Map<string, { game: LiveGame; signals: EnrichedSignal[] }>();

    for (const signal of signals) {
      const playerId = parseInt(signal.player_id, 10);
      const match = playerGameMap.get(playerId);

      let game: LiveGame | undefined;
      let enriched: EnrichedSignal;

      if (match) {
        game = match.game;
        const p = match.player;
        enriched = {
          ...signal,
          liveThreePointersMade: p.threePointersMade,
          isOnCourt: p.isOnCourt,
          minutesPlayed: p.minutes,
          signalStatus: deriveSignalStatus(game.status, signal.side, signal.line, p.threePointersMade),
        };
      } else {
        // Try matching by team for scheduled games
        game = signal.team ? teamGameMap.get(signal.team) : undefined;
        enriched = {
          ...signal,
          liveThreePointersMade: null,
          isOnCourt: null,
          minutesPlayed: null,
          signalStatus: game ? (game.status === 'scheduled' ? 'scheduled' : 'tracking') : 'scheduled',
        };
      }

      if (game) {
        const key = game.gameId;
        if (!gameSignalsMap.has(key)) {
          gameSignalsMap.set(key, { game, signals: [] });
        }
        gameSignalsMap.get(key)!.signals.push(enriched);
      }
    }

    // Sort: live games first, then scheduled, then final
    const statusOrder: Record<GameStatus, number> = { live: 0, scheduled: 1, final: 2 };
    return Array.from(gameSignalsMap.values())
      .sort((a, b) => statusOrder[a.game.status] - statusOrder[b.game.status]);
  }, [signals, games]);
}
