import { useMemo } from 'react';
import { PaperTrade, KellyFraction, SizedSignal } from '@/types/database';

const DAILY_CAP_PCT = 0.10;
const MIN_BET = 0;

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
        skipReason: null,
      }));
      return { sizingSignals, totalRisk: 0, activeBets: 0 };
    }

    const dailyCap = bankroll * DAILY_CAP_PCT;

    const withRawBets = signals.map(s => ({
      signal: s,
      rawBet: bankroll * s.kelly_stake * kellyFraction,
      isPending: !s.outcome,
    }));

    const pendingByEdge = withRawBets
      .filter(s => s.isPending)
      .sort((a, b) => b.signal.edge_pct - a.signal.edge_pct);

    let runningTotal = 0;
    const allocationMap = new Map<string, { dollarBet: number | null; skipReason: 'minimum' | 'cap' | null }>();

    for (const item of pendingByEdge) {
      if (item.rawBet < MIN_BET) {
        allocationMap.set(item.signal.signal_id, { dollarBet: null, skipReason: 'minimum' });
      } else if (runningTotal + item.rawBet > dailyCap) {
        allocationMap.set(item.signal.signal_id, { dollarBet: null, skipReason: 'cap' });
      } else {
        runningTotal += item.rawBet;
        allocationMap.set(item.signal.signal_id, { dollarBet: item.rawBet, skipReason: null });
      }
    }

    const sizingSignals: SizedSignal[] = signals.map(s => {
      if (s.outcome) {
        const rawBet = bankroll * s.kelly_stake * kellyFraction;
        return { ...s, dollarBet: rawBet >= MIN_BET ? rawBet : null, skipReason: rawBet < MIN_BET ? 'minimum' as const : null };
      }
      const allocation = allocationMap.get(s.signal_id);
      return {
        ...s,
        dollarBet: allocation?.dollarBet ?? null,
        skipReason: allocation?.skipReason ?? null,
      };
    });

    const activeBets = sizingSignals.filter(s => s.dollarBet !== null && !s.outcome).length;

    return { sizingSignals, totalRisk: runningTotal, activeBets };
  }, [signals, bankroll, kellyFraction]);
}
