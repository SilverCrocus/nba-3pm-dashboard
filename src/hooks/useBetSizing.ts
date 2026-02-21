import { useMemo } from 'react';
import { PaperTrade, KellyFraction, SizedSignal } from '@/types/database';

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
              }));
      return { sizingSignals, totalRisk: 0, activeBets: 0 };
    }

    let totalRisk = 0;
    const sizingSignals: SizedSignal[] = signals.map(s => {
      const dollarBet = bankroll * s.kelly_stake * kellyFraction;
      if (!s.outcome) totalRisk += dollarBet;
      return { ...s, dollarBet, skipReason: null };
    });

    const activeBets = sizingSignals.filter(s => s.dollarBet !== null && !s.outcome).length;

    return { sizingSignals, totalRisk, activeBets };
  }, [signals, bankroll, kellyFraction]);
}
