# Sweet-Spot Filtering for Bankroll Simulation & Stats

**Date:** 2026-02-26
**Status:** Approved

## Problem

`useBankrollSimulation` includes ALL non-voided trades in the bankroll calculation. But starting Feb 24, 2026, the user switched to only betting on sweet-spot signals (5-15% absolute edge). Non-sweet-spot trades were inflating the simulation.

On Feb 24 alone: 14 of 21 resolved trades were non-sweet-spot (10 wins, 4 losses), causing a large bankroll spike.

Overall: 157 non-sweet-spot trades were being counted in the simulation that shouldn't be (from Feb 24 onwards).

## Decision

Hybrid cutoff approach:
- **Before 2026-02-24**: All resolved trades count (user was betting on everything)
- **From 2026-02-24 onwards**: Only sweet-spot trades (5-15% edge) count

Applied to: bankroll simulation, P&L chart, performance stats, and recent results.

Signals table and live tracker remain unfiltered (for tracking purposes).

## Implementation

Shared `isActiveTrade()` filter in `useTrades.ts` using `isSweetSpot()` from `useBetSizing.ts`. Each hook adds `edge_pct` to its Supabase query and applies the filter after excluding voided trades.

Cutoff date hardcoded as `'2026-02-24'` — this is a historical fact, not a configurable setting.
