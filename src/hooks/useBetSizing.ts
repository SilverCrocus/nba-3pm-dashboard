import { useMemo } from 'react';
import { PaperTrade, KellyFraction, SizedSignal } from '@/types/database';

export const MAX_BET_PCT = 0.05;   // Per-bet cap: no single trade risks more than 5%
export const MAX_RISK_PCT = 0.15;  // Daily exposure cap: 15% of bankroll

export function getEdgeMultiplier(edgePct: number): { multiplier: number; label: string } {
  if (edgePct < 5) return { multiplier: 0, label: 'Skip' };
  if (edgePct < 10) return { multiplier: 1.0, label: 'Core' };
  if (edgePct < 25) return { multiplier: 0.5, label: 'Reduced' };
  return { multiplier: 0.25, label: 'Caution' };
}

export function isSweetSpot(edgePct: number): boolean {
  return getEdgeMultiplier(edgePct).multiplier > 0;
}

export function useBetSizing(
  signals: PaperTrade[],
  bankroll: number | null,
  kellyFraction: KellyFraction
) {
  return useMemo(() => {
    if (!bankroll || bankroll <= 0) {
      const sizingSignals: SizedSignal[] = signals.map(s => ({
        ...s,
        dollarBet: null,
        isSweetSpot: isSweetSpot(s.edge_pct),
      }));
      return { sizingSignals, totalRisk: 0, activeBets: 0 };
    }

    // Calculate raw bets using edge multiplier and per-bet cap
    const withRawBets = signals.map(s => {
      const sweet = isSweetSpot(s.edge_pct);
      const { multiplier } = getEdgeMultiplier(s.edge_pct);
      const cappedStake = Math.min(s.kelly_stake, MAX_BET_PCT);
      const rawBet = multiplier > 0 ? bankroll * cappedStake * kellyFraction * multiplier : 0;
      return { signal: s, sweet, rawBet };
    });

    // Sum pending risk (only unsettled bets)
    const rawTotal = withRawBets
      .filter(x => x.rawBet > 0 && !x.signal.outcome)
      .reduce((sum, x) => sum + x.rawBet, 0);

    // Scale down if over daily risk cap
    const maxRisk = bankroll * MAX_RISK_PCT * kellyFraction;
    const scale = rawTotal > maxRisk ? maxRisk / rawTotal : 1;

    let totalRisk = 0;
    const sizingSignals: SizedSignal[] = withRawBets.map(({ signal, sweet, rawBet }) => {
      const dollarBet = rawBet > 0 ? rawBet * scale : null;
      if (dollarBet && !signal.outcome) totalRisk += dollarBet;
      return { ...signal, dollarBet, isSweetSpot: sweet };
    });

    const activeBets = sizingSignals.filter(s => s.dollarBet !== null && !s.outcome).length;
    return { sizingSignals, totalRisk, activeBets };
  }, [signals, bankroll, kellyFraction]);
}
