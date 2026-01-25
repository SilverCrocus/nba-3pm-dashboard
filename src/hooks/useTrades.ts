'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { PaperTrade, DailyStats } from '@/types/database';

export function useTodaysSignals() {
  const [signals, setSignals] = useState<PaperTrade[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];

    supabase
      .from('paper_trades')
      .select('*')
      .eq('signal_date', today)
      .order('edge_pct', { ascending: false })
      .then(({ data, error }) => {
        if (!error && data) setSignals(data);
        setLoading(false);
      });
  }, []);

  return { signals, loading };
}

export function usePerformanceStats() {
  const [stats, setStats] = useState({
    totalPnL: 0,
    winRate: 0,
    wins: 0,
    losses: 0,
    totalBets: 0,
    pendingBets: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('paper_trades')
      .select('outcome, profit')
      .then(({ data, error }) => {
        if (!error && data) {
          const reconciled = data.filter(d => d.outcome);
          const pending = data.filter(d => !d.outcome);
          const wins = reconciled.filter(d => d.outcome === 'win').length;
          const losses = reconciled.filter(d => d.outcome === 'loss').length;
          const totalPnL = reconciled.reduce((sum, d) => sum + (d.profit || 0), 0);

          setStats({
            totalPnL,
            winRate: reconciled.length > 0 ? wins / (wins + losses) : 0,
            wins,
            losses,
            totalBets: reconciled.length,
            pendingBets: pending.length,
          });
        }
        setLoading(false);
      });
  }, []);

  return { stats, loading };
}

export function useDailyPnL() {
  const [dailyData, setDailyData] = useState<DailyStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('paper_trades')
      .select('signal_date, outcome, profit, kelly_stake')
      .not('outcome', 'is', null)
      .order('signal_date', { ascending: true })
      .then(({ data, error }) => {
        if (!error && data) {
          // Group by date
          const byDate = data.reduce((acc, trade) => {
            const date = trade.signal_date;
            if (!acc[date]) {
              acc[date] = { bets: 0, wins: 0, losses: 0, profit: 0 };
            }
            acc[date].bets++;
            if (trade.outcome === 'win') acc[date].wins++;
            if (trade.outcome === 'loss') acc[date].losses++;
            acc[date].profit += trade.profit || 0;
            return acc;
          }, {} as Record<string, { bets: number; wins: number; losses: number; profit: number }>);

          // Convert to array with cumulative
          let cumulative = 0;
          const dailyStats: DailyStats[] = Object.entries(byDate).map(([date, stats]) => {
            cumulative += stats.profit;
            return {
              date,
              ...stats,
              cumulative_profit: cumulative,
            };
          });

          setDailyData(dailyStats);
        }
        setLoading(false);
      });
  }, []);

  return { dailyData, loading };
}

export function useRecentResults(limit = 10) {
  const [results, setResults] = useState<PaperTrade[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('paper_trades')
      .select('*')
      .not('outcome', 'is', null)
      .order('signal_date', { ascending: false })
      .limit(limit)
      .then(({ data, error }) => {
        if (!error && data) setResults(data);
        setLoading(false);
      });
  }, [limit]);

  return { results, loading };
}
