'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { americanToDecimal } from '@/lib/odds';
import { computeClvImpliedPct, classifyClvTier } from '@/lib/clv';
import { PaperTrade, PnLDataPoint } from '@/types/database';

// --- Helpers ---

function normalCdf(x: number): number {
  const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741;
  const a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
  const sign = x < 0 ? -1 : 1;
  const t = 1.0 / (1.0 + p * Math.abs(x));
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x / 2);
  return 0.5 * (1.0 + sign * y);
}

// --- Legacy helpers (used by live page + GameCard) ---

export function isSweetSpot(edgePct: number): boolean {
  if (edgePct < 5) return false;
  if (edgePct >= 25) return false;
  return true;
}

// --- Filters ---

export type Phase = 'regular' | 'playoffs';
export type SubTab = 'all' | 'threes' | 'assists';

const PLAYOFF_START = '2026-04-19';

// --- useLatestSignals: shows latest pending signals for playoffs ---

export function useLatestSignals(phase: Phase, subTab: SubTab) {
  const [signals, setSignals] = useState<PaperTrade[]>([]);
  const [signalDate, setSignalDate] = useState<string | null>(null);
  const [noSignalsToday, setNoSignalsToday] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (phase === 'regular') {
      setSignals([]);
      setSignalDate(null);
      setNoSignalsToday(true);
      setLoading(false);
      return;
    }

    async function fetchLatestSignals() {
      setLoading(true);

      let pendingQuery = supabase
        .from('paper_trades')
        .select('signal_date')
        .is('outcome', null)
        .gte('signal_date', PLAYOFF_START)
        .order('signal_date', { ascending: false })
        .limit(1);

      if (subTab === 'threes') {
        pendingQuery = pendingQuery.or('prop_type.is.null,prop_type.eq.threes');
      } else if (subTab === 'assists') {
        pendingQuery = pendingQuery.eq('prop_type', 'assists');
      }

      const { data: pendingDates } = await pendingQuery;

      let targetDate: string | null = null;

      if (pendingDates && pendingDates.length > 0) {
        targetDate = pendingDates[0].signal_date;
      } else {
        setNoSignalsToday(true);
        let latestQuery = supabase
          .from('paper_trades')
          .select('signal_date')
          .gte('signal_date', PLAYOFF_START)
          .order('signal_date', { ascending: false })
          .limit(1);

        if (subTab === 'threes') {
          latestQuery = latestQuery.or('prop_type.is.null,prop_type.eq.threes');
        } else if (subTab === 'assists') {
          latestQuery = latestQuery.eq('prop_type', 'assists');
        }

        const { data: latestDates } = await latestQuery;

        if (latestDates && latestDates.length > 0) {
          targetDate = latestDates[0].signal_date;
        }
      }

      if (!targetDate) {
        setLoading(false);
        return;
      }

      let signalsQuery = supabase
        .from('paper_trades')
        .select('*')
        .eq('signal_date', targetDate)
        .gte('signal_date', PLAYOFF_START)
        .order('edge_pct', { ascending: false });

      if (subTab === 'threes') {
        signalsQuery = signalsQuery.or('prop_type.is.null,prop_type.eq.threes');
      } else if (subTab === 'assists') {
        signalsQuery = signalsQuery.eq('prop_type', 'assists');
      }

      const { data, error } = await signalsQuery;
      if (!error && data) setSignals(data);
      setSignalDate(targetDate);
      setLoading(false);
    }

    fetchLatestSignals();
  }, [phase, subTab]);

  return { signals, signalDate, noSignalsToday, loading };
}

// --- useSettledTrades: raw settled trades with phase/subTab filtering ---
// Feeds: heatmap, drawdown, daily performance, KPI cards

export function useSettledTrades(phase: Phase, subTab: SubTab) {
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

      if (phase === 'regular') {
        query = query.lt('signal_date', PLAYOFF_START);
      } else {
        query = query.gte('signal_date', PLAYOFF_START);
      }

      if (subTab === 'threes') {
        query = query.or('prop_type.is.null,prop_type.eq.threes');
      } else if (subTab === 'assists') {
        query = query.eq('prop_type', 'assists');
      }

      const { data, error } = await query;
      if (!error && data) setTrades(data);
      setLoading(false);
    }

    fetchTrades();
  }, [phase, subTab]);

  return { trades, loading };
}

// --- Computed stats from settled trades ---

export interface ComputedStats {
  totalPnL: number;
  winRate: number;
  roi: number;
  wins: number;
  losses: number;
  settledCount: number;
  pendingCount: number;
  voidedCount: number;
  clvPct: number | null;
  clvMeanPct: number | null;
  clvBeatingPct: number | null;
  clvMeaningfulPct: number | null;
  clvSignificant: boolean;
  clvTierCounts: { green: number; gray: number; red: number } | null;
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

  // CLV: percentage of trades beating the sharp close (FanDuel preferred, same-book fallback)
  // Same line → compare odds; different line → compare line movement direction
  const toDecimal = (odds: number) =>
    odds > 0 && odds < 100 ? odds : odds < 0 ? 1 + 100 / Math.abs(odds) : 1 + odds / 100;

  const tradesWithClose = trades.filter(t =>
    (t.closing_line_fanduel != null && t.closing_odds_fanduel != null) ||
    (t.closing_line != null && t.closing_odds != null)
  );
  let clvPct: number | null = null;
  if (tradesWithClose.length > 0) {
    const beatsClosing = tradesWithClose.filter(t => {
      const hasFd = t.closing_line_fanduel != null && t.closing_odds_fanduel != null;
      const closeLine = hasFd ? t.closing_line_fanduel! : t.closing_line!;
      const closeOdds = hasFd ? t.closing_odds_fanduel! : t.closing_odds!;
      if (closeLine === t.line) return toDecimal(t.odds) > toDecimal(closeOdds);
      return t.side === 'under' ? closeLine < t.line : closeLine > t.line;
    }).length;
    clvPct = (beatsClosing / tradesWithClose.length) * 100;
  }

  // Implied probability CLV (FanDuel only)
  let clvMeanPct: number | null = null;
  let clvBeatingPct: number | null = null;
  let clvMeaningfulPct: number | null = null;
  let clvSignificant = false;
  let clvTierCounts: { green: number; gray: number; red: number } | null = null;

  const fdTrades = trades.filter(t => t.closing_odds_fanduel != null);
  if (fdTrades.length > 0) {
    const clvValues = fdTrades.map(t =>
      computeClvImpliedPct(americanToDecimal(t.odds), americanToDecimal(t.closing_odds_fanduel!))
    );
    const n = clvValues.length;
    const mean = clvValues.reduce((a, b) => a + b, 0) / n;
    clvMeanPct = mean;
    clvBeatingPct = (clvValues.filter(v => v > 0).length / n) * 100;
    clvMeaningfulPct = (clvValues.filter(v => v > 1.5).length / n) * 100;

    if (n > 1) {
      const variance = clvValues.reduce((sum, v) => sum + (v - mean) ** 2, 0) / (n - 1);
      const std = Math.sqrt(variance);
      if (std > 0) {
        const z = mean / (std / Math.sqrt(n));
        const p = 2 * (1 - normalCdf(Math.abs(z)));
        clvSignificant = p < 0.05;
      } else {
        clvSignificant = mean !== 0;
      }
    }

    const tiers = { green: 0, gray: 0, red: 0 };
    for (const v of clvValues) {
      tiers[classifyClvTier(v)]++;
    }
    clvTierCounts = tiers;
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
  const pnlData: PnLDataPoint[] = [];
  const dailyPnL: Record<string, number> = {};
  const dailyRecords: Record<string, { wins: number; losses: number; pushes: number }> = {};
  const drawdownData: Array<{ date: string; drawdown: number }> = [];

  for (const [date, dayTrades] of dayGroups) {
    let dayProfit = 0;
    let dayWins = 0;
    let dayLosses = 0;
    let dayPushes = 0;

    for (const trade of dayTrades) {
      dayProfit += trade.profit || 0;
      if (trade.outcome === 'win') dayWins++;
      if (trade.outcome === 'loss') dayLosses++;
      if (trade.outcome === 'push') dayPushes++;
    }

    cumProfit += dayProfit;
    maxCumProfit = Math.max(maxCumProfit, cumProfit);
    const drawdown = cumProfit - maxCumProfit;

    pnlData.push({ date, cumProfit, dayPnl: dayProfit, wins: dayWins, losses: dayLosses });
    dailyPnL[date] = dayProfit;
    dailyRecords[date] = { wins: dayWins, losses: dayLosses, pushes: dayPushes };
    drawdownData.push({ date, drawdown });
  }

  const currentDrawdown = drawdownData.length > 0
    ? drawdownData[drawdownData.length - 1].drawdown
    : 0;

  return {
    totalPnL,
    winRate,
    roi,
    wins,
    losses,
    settledCount,
    pendingCount: 0, // caller can add pending from useLatestSignals
    voidedCount: 0,  // caller can compute separately if needed
    clvPct,
    clvMeanPct,
    clvBeatingPct,
    clvMeaningfulPct,
    clvSignificant,
    clvTierCounts,
    pnlData,
    dailyPnL,
    dailyRecords,
    drawdownData,
    currentDrawdown,
  };
}
