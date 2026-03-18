'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { PaperTrade, PnLDataPoint } from '@/types/database';
import { americanToDecimal } from '@/lib/odds';

// --- Legacy helpers (used by live page + GameCard) ---

export function isSweetSpot(edgePct: number): boolean {
  if (edgePct < 5) return false;
  if (edgePct >= 25) return false;
  return true;
}

// --- Filters ---

export interface DateRange {
  start: string;
}

// --- useLatestSignals: ALWAYS unfiltered, shows latest date ---

export function useLatestSignals() {
  const [signals, setSignals] = useState<PaperTrade[]>([]);
  const [signalDate, setSignalDate] = useState<string | null>(null);
  const [noSignalsToday, setNoSignalsToday] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLatestSignals() {
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
        setNoSignalsToday(true);
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

// --- useSettledTrades: raw settled trades with strategy/date filtering ---
// Feeds: heatmap, drawdown, daily performance, KPI cards

export function useSettledTrades(strategy?: string, dateRange?: DateRange | null) {
  const [trades, setTrades] = useState<PaperTrade[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTrades() {
      setLoading(true);
      let query = supabase
        .from('paper_trades')
        .select('*')
        .not('outcome', 'is', null)
        .neq('outcome', 'voided')
        .order('signal_date', { ascending: true })
        .order('created_at', { ascending: true })
        .limit(10000);

      if (strategy) {
        query = query.eq('strategy', strategy);
      }
      if (dateRange?.start) {
        query = query.gte('signal_date', dateRange.start);
      }

      const { data, error } = await query;
      if (!error && data) setTrades(data);
      setLoading(false);
    }

    fetchTrades();
  }, [strategy, dateRange?.start]);

  return { trades, loading };
}

// --- useStrategies: fetch distinct strategy values ---

export function useStrategies() {
  const [strategies, setStrategies] = useState<string[]>([]);

  useEffect(() => {
    async function fetchStrategies() {
      const { data } = await supabase
        .from('paper_trades')
        .select('strategy')
        .not('outcome', 'is', null)
        .limit(10000);

      if (data) {
        const unique = [...new Set(data.map(d => d.strategy).filter(Boolean))].sort();
        setStrategies(unique);
      }
    }

    fetchStrategies();
  }, []);

  return strategies;
}

// --- Computed stats from settled trades ---

export interface ComputedStats {
  totalPnL: number;
  totalExpectedPnL: number;
  winRate: number;
  roi: number;
  wins: number;
  losses: number;
  settledCount: number;
  pendingCount: number;
  voidedCount: number;
  clvPct: number | null;
  pnlData: PnLDataPoint[];
  dailyPnL: Record<string, number>;
  dailyRecords: Record<string, { wins: number; losses: number; pushes: number }>;
  drawdownData: Array<{ date: string; drawdown: number }>;
  currentDrawdown: number;
}

export function computeStats(trades: PaperTrade[]): ComputedStats {
  const wins = trades.filter(t => t.outcome === 'win').length;
  const losses = trades.filter(t => t.outcome === 'loss').length;
  const settledCount = wins + losses; // pushes excluded from denominator
  const totalPnL = trades.reduce((sum, t) => sum + (t.profit || 0), 0);
  const winRate = settledCount > 0 ? wins / settledCount : 0;
  const roi = settledCount > 0 ? (totalPnL / settledCount) * 100 : 0;

  // CLV: percentage of trades where opening odds beat closing odds
  const tradesWithClosing = trades.filter(t => t.closing_odds != null);
  let clvPct: number | null = null;
  if (tradesWithClosing.length > 0) {
    const beatsClosing = tradesWithClosing.filter(t => {
      const openDec = americanToDecimal(t.odds);
      const closeDec = americanToDecimal(t.closing_odds!);
      return openDec > closeDec; // higher decimal = better for bettor
    }).length;
    clvPct = (beatsClosing / tradesWithClosing.length) * 100;
  }

  // Daily aggregation for PnL chart, heatmap, and daily performance
  const dayGroups = new Map<string, PaperTrade[]>();
  for (const trade of trades) {
    const group = dayGroups.get(trade.signal_date) ?? [];
    group.push(trade);
    dayGroups.set(trade.signal_date, group);
  }

  let cumProfit = 0;
  let maxCumProfit = 0;
  let cumExpectedProfit = 0;
  const pnlData: PnLDataPoint[] = [];
  const dailyPnL: Record<string, number> = {};
  const dailyRecords: Record<string, { wins: number; losses: number; pushes: number }> = {};
  const drawdownData: Array<{ date: string; drawdown: number }> = [];

  for (const [date, dayTrades] of dayGroups) {
    let dayProfit = 0;
    let dayExpectedPnL = 0;
    let dayWins = 0;
    let dayLosses = 0;
    let dayPushes = 0;

    for (const trade of dayTrades) {
      dayProfit += trade.profit || 0;
      if (trade.outcome === 'win') dayWins++;
      if (trade.outcome === 'loss') dayLosses++;
      if (trade.outcome === 'push') dayPushes++;

      // EV accumulation: skip pushes and null fields
      if (trade.outcome !== 'push' && trade.model_prob != null && trade.odds != null) {
        const dec = americanToDecimal(trade.odds);
        dayExpectedPnL += (trade.model_prob * (dec - 1)) - (1 - trade.model_prob);
      }
    }

    cumProfit += dayProfit;
    cumExpectedProfit += dayExpectedPnL;
    maxCumProfit = Math.max(maxCumProfit, cumProfit);
    const drawdown = cumProfit - maxCumProfit;

    pnlData.push({ date, cumProfit, cumExpectedProfit, dayPnl: dayProfit, wins: dayWins, losses: dayLosses });
    dailyPnL[date] = dayProfit;
    dailyRecords[date] = { wins: dayWins, losses: dayLosses, pushes: dayPushes };
    drawdownData.push({ date, drawdown });
  }

  const currentDrawdown = drawdownData.length > 0
    ? drawdownData[drawdownData.length - 1].drawdown
    : 0;

  return {
    totalPnL,
    totalExpectedPnL: cumExpectedProfit,
    winRate,
    roi,
    wins,
    losses,
    settledCount,
    pendingCount: 0, // caller can add pending from useLatestSignals
    voidedCount: 0,  // caller can compute separately if needed
    clvPct,
    pnlData,
    dailyPnL,
    dailyRecords,
    drawdownData,
    currentDrawdown,
  };
}
