export const ASSUMED_MARGIN = 0.06;
export const CLV_NOISE_THRESHOLD = 1.5; // percentage points

export function computeNoVigProb(decimalOdds: number, assumedMargin: number = ASSUMED_MARGIN): number {
  const rawProb = 1.0 / decimalOdds;
  return rawProb / (1.0 + assumedMargin / 2.0);
}

export function computeClvImpliedPct(
  entryOdds: number,
  closingOddsFanduel: number,
  assumedMargin: number = ASSUMED_MARGIN,
): number {
  const entryProb = computeNoVigProb(entryOdds, assumedMargin);
  const closingProb = computeNoVigProb(closingOddsFanduel, assumedMargin);
  return (closingProb - entryProb) * 100.0;
}

export function classifyClvTier(clvPct: number): 'green' | 'gray' | 'red' {
  if (clvPct > CLV_NOISE_THRESHOLD) return 'green';
  if (clvPct < -CLV_NOISE_THRESHOLD) return 'red';
  return 'gray';
}
