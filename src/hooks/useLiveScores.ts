'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  LiveGame,
  LivePlayer,
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

function normalizePlayerName(name: string): string {
  return name.toLowerCase().replace(/[^a-z]/g, '');
}

export interface LiveSignalsResult {
  gamesWithSignals: GameWithSignals[];
  unmatchedSignals: EnrichedSignal[];
}

export function useLiveSignals(signals: PaperTrade[], games: LiveGame[]): LiveSignalsResult {
  return useMemo(() => {
    if (signals.length === 0) return { gamesWithSignals: [], unmatchedSignals: [] };

    // Build a lookup: normalized player name -> LiveGame + LivePlayer
    const playerNameMap = new Map<string, { game: LiveGame; player: LivePlayer }>();
    for (const game of games) {
      for (const player of game.players) {
        playerNameMap.set(normalizePlayerName(player.playerName), { game, player });
      }
    }

    // Group signals by game
    const gameSignalsMap = new Map<string, { game: LiveGame; signals: EnrichedSignal[] }>();
    const unmatchedSignals: EnrichedSignal[] = [];

    for (const signal of signals) {
      const normalizedName = normalizePlayerName(signal.player_name);
      const match = playerNameMap.get(normalizedName);

      if (match) {
        const { game, player: p } = match;
        const enriched: EnrichedSignal = {
          ...signal,
          // Backfill team from NBA API if signal has no team
          team: signal.team || p.teamTricode,
          liveThreePointersMade: p.threePointersMade,
          isOnCourt: p.isOnCourt,
          minutesPlayed: p.minutes,
          signalStatus: deriveSignalStatus(game.status, signal.side, signal.line, p.threePointersMade),
        };
        const key = game.gameId;
        if (!gameSignalsMap.has(key)) {
          gameSignalsMap.set(key, { game, signals: [] });
        }
        gameSignalsMap.get(key)!.signals.push(enriched);
      } else {
        // No game match — still show the signal
        unmatchedSignals.push({
          ...signal,
          liveThreePointersMade: null,
          isOnCourt: null,
          minutesPlayed: null,
          signalStatus: 'scheduled',
        });
      }
    }

    // Sort: live games first, then scheduled, then final
    const statusOrder: Record<GameStatus, number> = { live: 0, scheduled: 1, final: 2 };
    const gamesWithSignals = Array.from(gameSignalsMap.values())
      .sort((a, b) => statusOrder[a.game.status] - statusOrder[b.game.status]);

    return { gamesWithSignals, unmatchedSignals };
  }, [signals, games]);
}
