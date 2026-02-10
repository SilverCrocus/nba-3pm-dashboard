'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
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

export function usePlayerTeams(signals: PaperTrade[]): PaperTrade[] {
  const [teamMap, setTeamMap] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    // Step 1: Try NBA live scores API (covers players whose teams play today)
    fetch('/api/live-scores')
      .then(res => res.ok ? res.json() : null)
      .then((data: LiveScoresResponse | null) => {
        const map = new Map<string, string>();
        if (data) {
          for (const game of data.games) {
            for (const player of game.players) {
              map.set(normalizePlayerName(player.playerName), player.teamTricode);
            }
          }
        }

        // Step 2: Find players still missing teams, look up from game_results
        const missing = signals.filter(s => {
          if (s.team && s.team.trim()) return false;
          return !map.has(normalizePlayerName(s.player_name));
        });

        if (missing.length === 0) {
          setTeamMap(map);
          return;
        }

        const names = missing.map(s => s.player_name);
        supabase
          .from('game_results')
          .select('player_name, team, game_date')
          .in('player_name', names)
          .order('game_date', { ascending: false })
          .then(({ data: rows }) => {
            if (rows) {
              for (const row of rows) {
                const key = normalizePlayerName(row.player_name);
                if (!map.has(key) && row.team) {
                  map.set(key, row.team);
                }
              }
            }
            setTeamMap(new Map(map));
          });
      })
      .catch(() => {});
  }, [signals]);

  return useMemo(() => {
    if (teamMap.size === 0) return signals;
    return signals.map(s => {
      if (s.team && s.team.trim()) return s;
      const tricode = teamMap.get(normalizePlayerName(s.player_name));
      return tricode ? { ...s, team: tricode } : s;
    });
  }, [signals, teamMap]);
}

function normalizePlayerName(name: string): string {
  return name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z]/g, '');
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
          team: (signal.team && signal.team.trim()) ? signal.team : p.teamTricode,
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
