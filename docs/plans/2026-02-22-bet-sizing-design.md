# Bet Sizing Calculator Design

## Summary

Add a bankroll-aware bet sizing feature to the signals table. Users enter their bankroll, and each signal shows the recommended dollar amount to bet based on Kelly criterion with guardrails for daily exposure and minimum bet thresholds.

## Context

- Each signal has a `kelly_stake` field (0.83% to 2.0%, hard-capped at 2% by the model)
- Existing Kelly fraction toggle: Full / Half / Quarter
- Research shows quarter Kelly is the industry default; daily exposure caps of 5-10% and minimum bet thresholds are standard practice
- No existing tool handles correlation or priority-based allocation well

## Staking Algorithm

```
Inputs: bankroll, kellyFraction, signals[], dailyCapPct = 0.10, minBet = 5

1. For each signal: raw_bet = bankroll * kelly_stake * kellyFraction
2. Sort signals by edge_pct descending
3. Walk through sorted signals:
   a. If raw_bet < minBet -> status = "skip_minimum"
   b. If running_total + raw_bet > bankroll * dailyCapPct -> status = "skip_cap"
   c. Otherwise -> status = "bet", running_total += raw_bet
4. Return signals with { dollarBet, skipReason } preserving original display order
```

Pure client-side computation. No new API calls.

## New Hook: `useBetSizing`

```typescript
useBetSizing(signals: PaperTrade[], bankroll: number | null, kellyFraction: KellyFraction)
  -> { sizingSignals: SizedSignal[], totalRisk: number, activeBets: number }
```

Where `SizedSignal` extends `PaperTrade` with:
- `dollarBet: number | null` (null when skipped)
- `skipReason: 'minimum' | 'cap' | null`

## UI Changes

### Bankroll Input (above signals table, inside same card)

Compact inline bar:
- Dollar input field with $ prefix, persisted to localStorage
- "Total Risk" summary: dollar amount + % of bankroll
- "Bets: X of Y" showing actionable vs total signals

### Signals Table: New "Bet" Column

Between Edge and Book columns.

**Before bankroll entered:** Shows Kelly % in muted text (e.g., "2.0%")
**After bankroll entered:**
- Allocated bets: green text with dollar amount (e.g., "$10.00")
- Skipped bets: orange "Skip" text with tooltip explaining reason

Mobile card layout gets the same treatment as an additional row per card.

### Unchanged
- BankBalanceCard stays as-is (historical simulation)
- Kelly fraction toggles stay on BankBalanceCard
- Kelly fraction affects both historical sim and new bet sizing

## Edge Cases

| Scenario | Behavior |
|----------|----------|
| Empty/zero bankroll | Show Kelly % only |
| Bankroll < $50 | Show amounts + warning message |
| All signals skipped | Message: "Bankroll too small. Try larger bankroll or higher Kelly fraction." |
| Negative/non-numeric input | Ignore, keep last valid value |
| No signals for today | Bankroll input visible, "No signals" as before |
| Kelly fraction changes | Immediate recalculation |
| Settled signals (win/loss) | Show bet amount but don't count toward daily cap |
| localStorage unavailable | Degrade to session-only |

## Files to Create/Modify

| File | Change |
|------|--------|
| `src/hooks/useBetSizing.ts` | **New** - bet sizing computation hook |
| `src/types/database.ts` | Add `SizedSignal` type |
| `src/components/SignalsTable.tsx` | Add bankroll input bar + Bet column + Skip badges |
| `src/app/page.tsx` | Wire up `useBetSizing` hook, manage bankroll state with localStorage |

## Out of Scope

- Correlation warnings (same-game signals)
- Configurable daily cap / minimum bet
- Eighth Kelly option
- Adjust-for-open-bets feature
- Bankroll history tracking
