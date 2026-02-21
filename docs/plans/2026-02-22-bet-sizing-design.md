# Bet Sizing Calculator Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a bankroll-aware bet sizing feature that shows recommended dollar amounts per signal with Kelly criterion guardrails.

**Architecture:** Pure client-side computation via a `useBetSizing` hook. No new API calls. Bankroll persisted to localStorage. Signals table gets a bankroll input bar and new Bet column. Priority-based allocation with daily exposure cap (10%) and minimum bet threshold ($5).

**Tech Stack:** React 19, TypeScript, Next.js 16 App Router, Tailwind CSS 4. No test runner — verify via `npm run build` + `npm run lint`.

---

## Design Reference

### Staking Algorithm

```
Inputs: bankroll, kellyFraction, signals[], dailyCapPct = 0.10, minBet = 5

1. For each signal: raw_bet = bankroll * kelly_stake * kellyFraction
2. Sort signals by edge_pct descending (highest priority first)
3. Walk through sorted signals:
   a. If raw_bet < minBet -> status = "skip_minimum"
   b. If running_total + raw_bet > bankroll * dailyCapPct -> status = "skip_cap"
   c. Otherwise -> status = "bet", running_total += raw_bet
4. Return signals with { dollarBet, skipReason } preserving original display order
```

### Edge Cases

| Scenario | Behavior |
|----------|----------|
| Empty/zero bankroll | Show Kelly % only (no dollar amounts) |
| Bankroll < $50 | Show amounts + warning: "Bankroll may be too small for Kelly sizing" |
| All signals skipped | Message: "Bankroll too small. Try larger bankroll or higher Kelly fraction." |
| Negative/non-numeric input | Ignore, keep last valid value |
| No signals for today | Bankroll input visible, "No signals" message as before |
| Kelly fraction changes | Immediate recalculation |
| Settled signals (win/loss) | Show bet amount but don't count toward daily cap |
| localStorage unavailable | Degrade to session-only (no persistence) |

---

## Task 1: Add SizedSignal Type

**Files:**
- Modify: `src/types/database.ts:32` (after `KellyFraction` type)

**Step 1: Add the type**

Add after line 32 (`export type KellyFraction = 1 | 0.5 | 0.25;`):

```typescript
export interface SizedSignal extends PaperTrade {
  dollarBet: number | null;
  skipReason: 'minimum' | 'cap' | null;
}
```

**Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add src/types/database.ts
git commit -m "feat: add SizedSignal type for bet sizing"
```

---

## Task 2: Create useBetSizing Hook

**Files:**
- Create: `src/hooks/useBetSizing.ts`

**Step 1: Create the hook file**

```typescript
import { useMemo } from 'react';
import { PaperTrade, KellyFraction, SizedSignal } from '@/types/database';

const DAILY_CAP_PCT = 0.10;
const MIN_BET = 5;

export function useBetSizing(
  signals: PaperTrade[],
  bankroll: number | null,
  kellyFraction: KellyFraction
) {
  return useMemo(() => {
    // No bankroll → return signals with null sizing
    if (!bankroll || bankroll <= 0) {
      const sizingSignals: SizedSignal[] = signals.map(s => ({
        ...s,
        dollarBet: null,
        skipReason: null,
      }));
      return { sizingSignals, totalRisk: 0, activeBets: 0 };
    }

    const dailyCap = bankroll * DAILY_CAP_PCT;

    // Step 1: Compute raw bets for each signal
    const withRawBets = signals.map(s => ({
      signal: s,
      rawBet: bankroll * s.kelly_stake * kellyFraction,
      isPending: !s.outcome, // Only pending signals count toward daily cap
    }));

    // Step 2: Sort by edge descending for priority allocation (pending only)
    const pendingByEdge = withRawBets
      .filter(s => s.isPending)
      .sort((a, b) => b.signal.edge_pct - a.signal.edge_pct);

    // Step 3: Allocate within daily cap using priority ranking
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

    // Step 4: Build result preserving original order, settled signals get bet amount but don't count toward cap
    const sizingSignals: SizedSignal[] = signals.map(s => {
      if (s.outcome) {
        // Settled signal: show what the bet would have been
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
```

**Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add src/hooks/useBetSizing.ts
git commit -m "feat: add useBetSizing hook with priority allocation"
```

---

## Task 3: Add Bankroll State to page.tsx

**Files:**
- Modify: `src/app/page.tsx`

**Step 1: Add bankroll state with localStorage**

Add imports at top:
```typescript
import { useEffect } from 'react'; // add useEffect to existing useState import
import { useBetSizing } from '@/hooks/useBetSizing';
```

Add state after the existing `kellyFraction` state (line 16):
```typescript
const [bankroll, setBankroll] = useState<number | null>(null);

// Load bankroll from localStorage on mount
useEffect(() => {
  try {
    const saved = localStorage.getItem('nba3pm_bankroll');
    if (saved) {
      const parsed = parseFloat(saved);
      if (!isNaN(parsed) && parsed > 0) setBankroll(parsed);
    }
  } catch {
    // localStorage unavailable, stay with null
  }
}, []);
```

**Step 2: Add useBetSizing call**

After the existing `usePlayerTeams` call (line 19), add:
```typescript
const { sizingSignals, totalRisk, activeBets } = useBetSizing(signals, bankroll, kellyFraction);
```

**Step 3: Add bankroll change handler**

After the hooks section, add:
```typescript
function handleBankrollChange(value: number | null) {
  setBankroll(value);
  try {
    if (value && value > 0) {
      localStorage.setItem('nba3pm_bankroll', value.toString());
    } else {
      localStorage.removeItem('nba3pm_bankroll');
    }
  } catch {
    // localStorage unavailable
  }
}
```

**Step 4: Update SignalsTable props**

Change the `<SignalsTable>` call from:
```tsx
<SignalsTable signals={signals} loading={signalsLoading} />
```
to:
```tsx
<SignalsTable
  signals={sizingSignals}
  loading={signalsLoading}
  bankroll={bankroll}
  onBankrollChange={handleBankrollChange}
  totalRisk={totalRisk}
  activeBets={activeBets}
  kellyFraction={kellyFraction}
/>
```

**Step 5: Verify**

Run: `npx tsc --noEmit`
Expected: Errors about SignalsTable props (expected, fixed in Task 4)

**Step 6: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: wire bankroll state and bet sizing into dashboard"
```

---

## Task 4: Update SignalsTable Component

**Files:**
- Modify: `src/components/SignalsTable.tsx`

This is the largest task. It updates props, adds the bankroll input bar, adds the Bet column to desktop table, and adds bet amounts to mobile cards.

**Step 1: Update imports and props interface**

Replace the existing imports and interface (lines 1-15):

```typescript
import { SizedSignal, KellyFraction } from '@/types/database';

// Convert American odds to decimal odds for display
function americanToDecimal(americanOdds: number): number {
  if (americanOdds < 0) {
    return 1 + (100 / Math.abs(americanOdds));
  } else {
    return 1 + (americanOdds / 100);
  }
}

interface SignalsTableProps {
  signals: SizedSignal[];
  loading: boolean;
  bankroll: number | null;
  onBankrollChange: (value: number | null) => void;
  totalRisk: number;
  activeBets: number;
  kellyFraction: KellyFraction;
}
```

**Step 2: Update function signature**

Replace line 17:
```typescript
export function SignalsTable({ signals, loading, bankroll, onBankrollChange, totalRisk, activeBets, kellyFraction }: SignalsTableProps) {
```

**Step 3: Add bankroll input bar**

Inside the main card div, between the `<h3>` title and the mobile card layout, add:

```tsx
{/* Bankroll Input Bar */}
<div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mb-4 pb-4 border-b border-white/10">
  <div className="flex items-center gap-2">
    <label className="text-white/50 text-xs font-medium whitespace-nowrap">Your Bankroll:</label>
    <div className="relative">
      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/40 text-sm">$</span>
      <input
        type="text"
        inputMode="numeric"
        value={bankroll ?? ''}
        onChange={(e) => {
          const raw = e.target.value.replace(/[^0-9.]/g, '');
          if (raw === '') {
            onBankrollChange(null);
          } else {
            const parsed = parseFloat(raw);
            if (!isNaN(parsed)) onBankrollChange(parsed);
          }
        }}
        placeholder="500"
        className="w-28 bg-white/5 border border-white/10 rounded-lg pl-6 pr-2 py-1.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/20"
      />
    </div>
  </div>
  {bankroll && bankroll > 0 && (
    <div className="flex gap-3 text-xs">
      <span className="text-white/50">
        Total Risk: <span className="text-orange-400 font-medium">${totalRisk.toFixed(0)} ({((totalRisk / bankroll) * 100).toFixed(1)}%)</span>
      </span>
      <span className="text-white/50">
        Bets: <span className="text-white/70 font-medium">{activeBets} of {signals.filter(s => !s.outcome).length}</span>
      </span>
    </div>
  )}
  {bankroll !== null && bankroll > 0 && bankroll < 50 && (
    <span className="text-yellow-400/70 text-xs">Bankroll may be too small for Kelly sizing</span>
  )}
</div>

{/* All signals skipped warning */}
{bankroll && bankroll > 0 && signals.filter(s => !s.outcome).length > 0 && activeBets === 0 && (
  <div className="mb-4 px-3 py-2 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-yellow-400 text-xs">
    Bankroll too small for any signals at current Kelly fraction. Try a larger bankroll or higher Kelly fraction.
  </div>
)}
```

**Step 4: Add BetCell helper component**

Add this before the `StatusBadge` function at the bottom of the file:

```typescript
function BetCell({ signal, bankroll, kellyFraction }: { signal: SizedSignal; bankroll: number | null; kellyFraction: KellyFraction }) {
  // No bankroll → show Kelly %
  if (!bankroll || bankroll <= 0) {
    return <span className="text-white/40 font-mono text-sm">{(signal.kelly_stake * kellyFraction * 100).toFixed(1)}%</span>;
  }

  // Skipped
  if (signal.dollarBet === null) {
    const reason = signal.skipReason === 'minimum' ? 'Below $5 minimum' : 'Daily cap reached';
    return (
      <span className="text-orange-400/60 text-xs font-medium cursor-help" title={reason}>
        Skip
      </span>
    );
  }

  // Dollar amount
  return (
    <span className="text-green-400 font-medium font-mono text-sm">
      ${signal.dollarBet.toFixed(2)}
    </span>
  );
}
```

**Step 5: Add Bet column to desktop table**

In the desktop `<thead>`, add after the Edge `<th>`:
```tsx
<th className="text-left pb-3">Bet</th>
```

In the desktop `<tbody>` rows, add after the Edge `<td>`:
```tsx
<td className="py-3">
  <BetCell signal={signal} bankroll={bankroll} kellyFraction={kellyFraction} />
</td>
```

**Step 6: Add bet amount to mobile cards**

In each mobile card, add a new row between the edge/bookmaker row and the closing `</div>`:

```tsx
<div className="flex justify-between text-xs mt-1">
  <span className="text-white/40">Bet:</span>
  <BetCell signal={signal} bankroll={bankroll} kellyFraction={kellyFraction} />
</div>
```

**Step 7: Verify**

Run: `npm run build`
Expected: Build succeeds

Run: `npm run lint`
Expected: No errors

**Step 8: Commit**

```bash
git add src/components/SignalsTable.tsx
git commit -m "feat: add bankroll input and bet sizing to signals table"
```

---

## Task 5: Final Verification

**Step 1: Full build**

Run: `npm run build`
Expected: Build succeeds with no errors

**Step 2: Lint**

Run: `npm run lint`
Expected: No lint errors

**Step 3: Manual smoke test**

Run: `npm run dev`

Test these scenarios in the browser:
1. Page loads — signals table shows Kelly % in Bet column (no bankroll)
2. Type 500 in bankroll input — bet amounts appear in green
3. Type 50 — warning about small bankroll appears
4. Type 25 — most/all signals show "Skip", yellow warning banner appears
5. Clear input — reverts to Kelly % display
6. Refresh page — bankroll value persists from localStorage
7. Change Kelly fraction on BankBalanceCard — bet amounts update

**Step 4: Commit any fixes from smoke test**

---

## Parallelization Guide (for agent teams)

These tasks can be parallelized:

```
Task 1 (type) ──────────┐
                         ├──> Task 3 (page.tsx) ──> Task 5 (verify)
Task 2 (hook) ──────────┤
                         └──> Task 4 (SignalsTable)
```

- **Tasks 1 and 2** are independent — can run in parallel
- **Tasks 3 and 4** depend on Tasks 1+2 but are independent of each other — can run in parallel after 1+2
- **Task 5** depends on all prior tasks

## Out of Scope

- Correlation warnings (same-game signals)
- Configurable daily cap / minimum bet
- Eighth Kelly option
- Adjust-for-open-bets feature
- Bankroll history tracking
