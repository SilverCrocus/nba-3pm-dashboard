import { useMemo } from 'react';
import { PaperTrade, KellyFraction, SizedSignal } from '@/types/database';

const SWEET_SPOT_MIN = 5;
const SWEET_SPOT_MAX = 15;
const MAX_RISK_PCT = 0.15;

export function isSweetSpot(edgePct: number): boolean {
  return edgePct >= SWEET_SPOT_MIN && edgePct <= SWEET_SPOT_MAX;
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

    // Calculate raw bets for sweet spot signals only
    const withRawBets = signals.map(s => {
      const sweet = isSweetSpot(s.edge_pct);
      const rawBet = sweet ? bankroll * s.kelly_stake * kellyFraction : 0;
      return { signal: s, sweet, rawBet };
    });

    // Sum pending risk (only unsettled bets)
    const rawTotal = withRawBets
      .filter(x => x.rawBet > 0 && !x.signal.outcome)
      .reduce((sum, x) => sum + x.rawBet, 0);

    // Scale down if over risk cap
    const maxRisk = bankroll * MAX_RISK_PCT;
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
