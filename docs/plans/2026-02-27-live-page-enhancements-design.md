# Live Page Enhancements Design

**Date**: 2026-02-27
**Status**: Approved

## Goal

Improve the live tracker page with two features:
1. A day summary scoreboard showing hit/miss/tracking counts and confirmed P&L
2. Visual energy animations (flash on resolution, 3PM tick, tracking pulse)

## Feature 1: Day Summary Scoreboard

### Component: `DaySummary`

A compact horizontal row of colored pill chips between the `LiveHeader` and the first `GameCard`.

**Layout:**
```
[3 HIT]  [1 MISS]  [5 TRACKING]  [2 SCHED]   +2.73u
 green     red       green/pulse    orange      green/red
```

### Data Sources

- **Outcome counts**: Derived from `signalStatus` on `EnrichedSignal` — real-time from live data. Categories: HIT, MISS, TRACKING, SCHEDULED. No PUSH category (all lines are half-point).
- **P&L**: Sum of `profit` field for signals where `outcome !== null && outcome !== 'voided'` — confirmed from Supabase only. Shown as "+X.XXu".

Counts update instantly when games go final (live 3PM data). P&L only appears after CI reconciliation writes to Supabase.

### Behavior

- Chips only appear if count > 0
- P&L number: green if positive, red if negative, hidden if no confirmed results yet
- On mobile: chips wrap to 2 rows if needed, P&L on its own line below

### Data Flow

No new queries. The live page already has all `PaperTrade[]` signals (with `profit`/`outcome` from Supabase) and all `EnrichedSignal[]` via `gamesWithSignals` + `unmatchedSignals`. Collect all enriched signals into one array and pass to `DaySummary`, along with the raw signals for P&L calculation.

## Feature 2: Visual Energy Animations

### 2a. Hit/Miss Flash on Resolution

When a signal's `signalStatus` changes from `tracking` to `hit`/`miss`:
- **HIT**: Green background flash (`rgba(74, 222, 128, 0.15)` -> transparent) over 1.5s
- **MISS**: Red background flash (`rgba(248, 113, 113, 0.15)` -> transparent) over 1.5s

Implementation: `useSignalTransitions(signals)` hook stores previous `signalStatus` per `signal_id` in a `useRef`. Returns a transition map. Component applies a CSS animation class that auto-removes after 1.5s.

### 2b. 3PM Counter Tick Animation

When `liveThreePointersMade` increases:
- Number scales up to 1.3x
- Flashes green
- Settles back over 0.4s

Implementation: Same ref-based comparison. CSS `@keyframes tick` animation.

### 2c. Tracking Signal Row Pulse

Signals with `signalStatus === 'tracking'` get a subtle row background pulse:
- Light green (`rgba(74, 222, 128, 0.03)`) breathing every 3s
- Pure CSS, no JS state needed

## File Changes

### New Files

| File | Purpose |
|------|---------|
| `src/components/DaySummary.tsx` | Scoreboard component |
| `src/hooks/useSignalTransitions.ts` | Detects status changes & 3PM counter ticks |

### Modified Files

| File | Change |
|------|--------|
| `src/app/live/page.tsx` | Add DaySummary, collect all enriched signals |
| `src/components/GameCard.tsx` | Wire up flash/tick/pulse CSS classes |
| `src/app/globals.css` | Add `@keyframes` for flash-hit, flash-miss, tick, tracking-pulse |

## Decisions

- No push category — all lines are half-point, pushes impossible
- P&L is Supabase-confirmed only, not estimated from live data
- Outcome counts use live-derived `signalStatus` for real-time awareness
- Animations are CSS-only with JS only for detecting value changes
