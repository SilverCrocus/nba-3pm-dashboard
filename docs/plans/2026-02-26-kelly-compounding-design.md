# Kelly Compounding Bankroll Simulation

## Problem

The bankroll simulation uses flat-stake math:

```ts
bankroll += (trade.profit || 0) * startingBankroll * kellyFraction;
```

Every trade bets off `startingBankroll`, not the current bankroll. This means the simulation doesn't compound — a $1000 starting bankroll always risks the same dollar amount whether the bankroll has grown to $1500 or shrunk to $700.

## Solution

Replace flat-stake with true Kelly compounding. Each trade sizes its bet as a fraction of the current bankroll at that point in time.

### Per-trade logic

```
dollarBet = currentBankroll * kelly_stake * kellyFraction
if win:  bankroll += dollarBet * (decimalOdds - 1)
if loss: bankroll -= dollarBet
if push: no change
```

### Design decisions

- **No daily risk cap in simulation.** The 15% cap exists for real-time risk management in `useBetSizing`. The simulation is theoretical — kelly_stake values are small enough (2-5%) that daily risk rarely exceeds 15% even with multiple bets.
- **Existing filters stay.** `isActiveTrade()` still applies — pre-Feb-24 all trades, post-Feb-24 sweet spot only.
- **No UI changes.** BankBalanceCard, Kelly toggle, and PnL chart all stay the same — they receive more accurate numbers.

## Code Changes

### 1. Extract `americanToDecimal` to shared location

Currently lives in `SignalsTable.tsx`. Move to `src/lib/odds.ts` so both `SignalsTable` and `useBankrollSimulation` can use it.

### 2. Rewrite `useBankrollSimulation` in `useTrades.ts`

- Add `kelly_stake` and `odds` to the Supabase select query
- Replace flat-stake formula with compounding logic
- Keep chronological ordering and daily bucketing

### 3. Import shared `americanToDecimal` in `SignalsTable.tsx`

Replace the local function with the shared import.
