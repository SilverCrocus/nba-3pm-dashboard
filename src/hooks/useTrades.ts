'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { PaperTrade, PnLDataPoint } from '@/types/database';

export function getEdgeMultiplier(edgePct: number): { multiplier: number; label: string } {
  if (edgePct < 5) return { multiplier: 0, label: 'Skip' };
  if (edgePct < 10) return { multiplier: 1.0, label: 'Core' };
  if (edgePct < 25) return { multiplier: 0.5, label: 'Reduced' };
  return { multiplier: 0.25, label: 'Caution' };
}

// From this date onwards, only sweet-spot trades (5-15% edge) count in stats/simulation.
// Before this date, all trades count (user was betting on everything).
const SWEET_SPOT_CUTOFF = '2026-02-24';

function isActiveTrade(trade: { signal_date: string; edge_pct: number }): boolean {
  if (trade.signal_date < SWEET_SPOT_CUTOFF) return true;
  return getEdgeMultiplier(trade.edge_pct).multiplier > 0;
}

export function useLatestSignals() {
  const [signals, setSignals] = useState<PaperTrade[]>([]);
  const [signalDate, setSignalDate] = useState<string | null>(null);
  const [noSignalsToday, setNoSignalsToday] = useState(false);
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
        // No pending signals — model found no qualifying bets today
        setNoSignalsToday(true);

        // Fall back to the most recent signal date overall
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

  return { signals, signalDate, noSignalsToday, loading };
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
      .select('outcome, profit, signal_date, edge_pct')
      .then(({ data, error }) => {
        if (!error && data) {
          const reconciled = data.filter(d => d.outcome && d.outcome !== 'voided' && isActiveTrade(d));
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


export function useRecentResults(limit = 10) {
  const [results, setResults] = useState<PaperTrade[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('paper_trades')
      .select('*')
      .not('outcome', 'is', null)
      .order('signal_date', { ascending: false })
      .limit(limit * 2) // fetch extra to account for filtered-out non-sweet-spot trades
      .then(({ data, error }) => {
        if (!error && data) setResults(data.filter(d => d.outcome !== 'voided' && isActiveTrade(d)).slice(0, limit));
        setLoading(false);
      });
  }, [limit]);

  return { results, loading };
}

export function usePnL() {
  const [pnlData, setPnlData] = useState<PnLDataPoint[]>([]);
  const [dailyPnL, setDailyPnL] = useState<Record<string, number>>({});
  const [totalProfit, setTotalProfit] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('paper_trades')
      .select('signal_date, outcome, profit, edge_pct')
      .not('outcome', 'is', null)
      .order('signal_date', { ascending: true })
      .order('created_at', { ascending: true })
      .limit(10000)
      .then(({ data, error }) => {
        if (!error && data) {
          const trades = data.filter(d => d.outcome !== 'voided' && isActiveTrade(d));

          // Group trades by signal_date
          const dayGroups = new Map<string, typeof trades>();
          for (const trade of trades) {
            const group = dayGroups.get(trade.signal_date) ?? [];
            group.push(trade);
            dayGroups.set(trade.signal_date, group);
          }

          let cumProfit = 0;
          const timeSeries: PnLDataPoint[] = [];
          const changes: Record<string, number> = {};

          for (const [date, dayTrades] of dayGroups) {
            let dayProfit = 0;
            for (const trade of dayTrades) {
              if (trade.profit != null) {
                cumProfit += trade.profit;
                dayProfit += trade.profit;
              }
            }
            timeSeries.push({ date, cumProfit });
            changes[date] = dayProfit;
          }

          setPnlData(timeSeries);
          setDailyPnL(changes);
          setTotalProfit(cumProfit);
        }
        setLoading(false);
      });
  }, []);

  return { pnlData, totalProfit, dailyPnL, loading };
}
