'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { PaperTrade, DailyStats, KellyFraction, BankrollData } from '@/types/database';
import { isSweetSpot } from './useBetSizing';

// Convert American odds to decimal odds
function americanToDecimal(americanOdds: number): number {
  if (americanOdds < 0) {
    // Negative odds (e.g., -128): bet $128 to win $100
    return 1 + (100 / Math.abs(americanOdds));
  } else {
    // Positive odds (e.g., +130): bet $100 to win $130
    return 1 + (americanOdds / 100);
  }
}

export function useLatestSignals() {
  const [signals, setSignals] = useState<PaperTrade[]>([]);
  const [signalDate, setSignalDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLatestSignals() {
      // Step 1: Find the latest date that has pending (unreconciled) signals
      const { data: pendingDates } = await supabase
        .from('paper_trades')
        .select('signal_date')
        .is('outcome', null)
        .order('signal_date', { ascending: false })
        .limit(1);

      let targetDate: string | null = null;

      if (pendingDates && pendingDates.length > 0) {
        targetDate = pendingDates[0].signal_date;
      } else {
        // No pending signals — fall back to the most recent signal date overall
        const { data: latestDates } = await supabase
          .from('paper_trades')
          .select('signal_date')
          .order('signal_date', { ascending: false })
          .limit(1);

        if (latestDates && latestDates.length > 0) {
          targetDate = latestDates[0].signal_date;
        }
      }

      if (!targetDate) {
        setLoading(false);
        return;
      }

      // Step 2: Fetch all signals for that date
      const { data, error } = await supabase
        .from('paper_trades')
        .select('*')
        .eq('signal_date', targetDate)
        .order('edge_pct', { ascending: false });

      if (!error && data) setSignals(data);
      setSignalDate(targetDate);
      setLoading(false);
    }

    fetchLatestSignals();
  }, []);

  return { signals, signalDate, loading };
}

export function usePerformanceStats() {
  const [stats, setStats] = useState({
    totalPnL: 0,
    winRate: 0,
    wins: 0,
    losses: 0,
    totalBets: 0,
    pendingBets: 0,
    voidedBets: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('paper_trades')
      .select('outcome, profit')
      .then(({ data, error }) => {
        if (!error && data) {
          const reconciled = data.filter(d => d.outcome && d.outcome !== 'voided');
          const pending = data.filter(d => !d.outcome);
          const voided = data.filter(d => d.outcome === 'voided').length;
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
            voidedBets: voided,
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
          const trades = data.filter(d => d.outcome !== 'voided');
          // Group by date
          const byDate = trades.reduce((acc, trade) => {
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
        if (!error && data) setResults(data.filter(d => d.outcome !== 'voided'));
        setLoading(false);
      });
  }, [limit]);

  return { results, loading };
}

export function useBankrollSimulation(kellyFraction: KellyFraction, startingBankroll: number = 1000) {
  const [bankrollData, setBankrollData] = useState<BankrollData[]>([]);
  const [currentBankroll, setCurrentBankroll] = useState(startingBankroll);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('paper_trades')
      .select('signal_date, outcome, odds, kelly_stake, edge_pct')
      .not('outcome', 'is', null)
      .order('signal_date', { ascending: true })
      .order('created_at', { ascending: true })
      .then(({ data, error }) => {
        if (!error && data) {
          const trades = data.filter(d => d.outcome !== 'voided');
          let bankroll = startingBankroll;
          const dailyBankrolls: Record<string, number> = {};

          for (const trade of trades) {
            if (!isSweetSpot(trade.edge_pct)) continue;
            const stake = bankroll * trade.kelly_stake * kellyFraction;
            const decimalOdds = americanToDecimal(trade.odds);

            if (trade.outcome === 'win') {
              bankroll += stake * (decimalOdds - 1);
            } else if (trade.outcome === 'loss') {
              bankroll -= stake;
            }
            // push: no change

            // Track end-of-day bankroll
            dailyBankrolls[trade.signal_date] = bankroll;
          }

          const bankrollTimeSeries: BankrollData[] = Object.entries(dailyBankrolls).map(
            ([date, bankroll]) => ({ date, bankroll })
          );

          setBankrollData(bankrollTimeSeries);
          setCurrentBankroll(bankroll);
        }
        setLoading(false);
      });
  }, [kellyFraction, startingBankroll]);

  return { bankrollData, currentBankroll, loading };
}
