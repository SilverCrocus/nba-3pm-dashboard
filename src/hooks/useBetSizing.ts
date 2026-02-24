import { useMemo } from 'react';
import { PaperTrade, KellyFraction, SizedSignal, EdgeQuality } from '@/types/database';

export function getEdgeMultiplier(edgePct: number): { multiplier: number; quality: EdgeQuality } {
  if (edgePct < 3) return { multiplier: 0, quality: 'no-bet' };
  if (edgePct < 5) return { multiplier: 0.25, quality: 'low' };
  if (edgePct <= 15) return { multiplier: 1.0, quality: 'sweet-spot' };
  if (edgePct <= 25) return { multiplier: 0.5, quality: 'high' };
  return { multiplier: 0.25, quality: 'caution' };
}

export function useBetSizing(
  signals: PaperTrade[],
  bankroll: number | null,
  kellyFraction: KellyFraction
) {
  return useMemo(() => {
    if (!bankroll || bankroll <= 0) {
      const sizingSignals: SizedSignal[] = signals.map(s => {
        const { multiplier, quality } = getEdgeMultiplier(s.edge_pct);
        return {
          ...s,
          dollarBet: null,
          edgeMultiplier: multiplier,
          edgeQuality: quality,
        };
      });
      return { sizingSignals, totalRisk: 0, activeBets: 0 };
    }

    let totalRisk = 0;
    const sizingSignals: SizedSignal[] = signals.map(s => {
      const { multiplier, quality } = getEdgeMultiplier(s.edge_pct);
      const dollarBet = bankroll * s.kelly_stake * kellyFraction * multiplier;
      if (!s.outcome) totalRisk += dollarBet;
      return { ...s, dollarBet, edgeMultiplier: multiplier, edgeQuality: quality };
    });

    const activeBets = sizingSignals.filter(s => s.dollarBet !== null && s.dollarBet > 0 && !s.outcome).length;

    return { sizingSignals, totalRisk, activeBets };
  }, [signals, bankroll, kellyFraction]);
}
