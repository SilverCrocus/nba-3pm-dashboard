# Odds Column & Bankroll Simulation Feature

## Overview

Add odds display to Today's Signals table and implement a bankroll simulation feature showing hypothetical returns using Kelly criterion staking.

## Feature 1: Odds Column in Today's Signals

### Changes
- Add "ODDS" column after LINE in the SignalsTable component
- Display decimal format (e.g., 1.91, 2.10)
- Include in both desktop table and mobile card layouts

### Table Layout
```
PLAYER          LINE    ODDS    EDGE     BOOK        STATUS
Ryan Rollins    2.5     1.91    +33.0%   sportsbet   [Pending]
UNDER
```

### Data
- `odds` field already exists in `PaperTrade` type
- Already fetched from Supabase (query uses `select('*')`)
- Just needs to be rendered

## Feature 2: Bank Balance Stat Card with Kelly Toggles

### Changes
- Replace "Total PnL" stat card with "Bank Balance"
- Show dollar value starting from $1,000 hypothetical bankroll
- Add toggle buttons for Kelly fractions: Full, ½, ¼
- Default to ½ Kelly (industry standard recommendation)

### UI Layout
```
┌─────────────────────────┐
│ Bank Balance            │
│ $1,247                  │
│ +$247 profit            │
│ [Full] [½] [¼]          │
└─────────────────────────┘
```

### Calculation Logic
```
starting_bankroll = $1,000
fraction = 1.0 | 0.5 | 0.25 (based on toggle)

for each resolved trade (chronological order):
    stake = current_bankroll × kelly_stake × fraction
    if win:
        bankroll += stake × (odds - 1)
    if loss:
        bankroll -= stake

display final bankroll
```

## Feature 3: PnL Chart Syncs with Kelly Selection

### Changes
- Chart Y-axis changes from percentage to dollar values
- Shows bankroll growth trajectory starting from $1,000
- Updates when user toggles Kelly fraction
- Title reflects selection (e.g., "Bankroll Growth (½ Kelly)")

### Data Flow
```
page.tsx (state: kellyFraction)
    │
    ├──► BankBalanceStatCard (receives kellyFraction, displays balance)
    │
    └──► PnLChart (receives kellyFraction, displays growth trajectory)
```

## Files to Modify

1. `src/app/page.tsx` - Add Kelly fraction state, pass to components
2. `src/components/SignalsTable.tsx` - Add odds column
3. `src/components/StatCard.tsx` - May need variant for Kelly toggles or create new component
4. `src/components/PnLChart.tsx` - Update to show dollar values, accept Kelly fraction
5. `src/hooks/useTrades.ts` - Add hook for bankroll calculation with Kelly compounding

## Data Validation

- All 131 trades have `kelly_stake` values (verified via SQL query)
- No fallback handling needed for missing data
