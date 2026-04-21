export function americanToDecimal(odds: number): number {
  if (odds > 0 && odds < 100) {
    return odds;
  }
  if (odds < 0) {
    return 1 + (100 / Math.abs(odds));
  } else {
    return 1 + (odds / 100);
  }
}
