# Kelly Compounding Bankroll Simulation — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace flat-stake bankroll simulation with true Kelly compounding where each trade sizes its bet off the current bankroll.

**Architecture:** Extract shared `americanToDecimal` util, rewrite `useBankrollSimulation` to compound per-trade using `kelly_stake * kellyFraction * currentBankroll` and derive P&L from odds + outcome instead of the flat `profit` column.

**Tech Stack:** Next.js, React hooks, Supabase, TypeScript

---

### Task 1: Extract `americanToDecimal` to shared util

**Files:**
- Create: `src/lib/odds.ts`
- Modify: `src/components/SignalsTable.tsx:1-10`

**Step 1: Create `src/lib/odds.ts`**

```ts
export function americanToDecimal(americanOdds: number): number {
  if (americanOdds < 0) {
    return 1 + (100 / Math.abs(americanOdds));
  } else {
    return 1 + (americanOdds / 100);
  }
}
```

**Step 2: Update `SignalsTable.tsx` to import from shared util**

Replace lines 1-10:

```ts
import { SizedSignal, KellyFraction } from '@/types/database';
import { americanToDecimal } from '@/lib/odds';
```

Remove the local `americanToDecimal` function (lines 3-10).

**Step 3: Verify build passes**

Run: `npm run build`
Expected: Build succeeds, no type errors.

**Step 4: Commit**

```bash
git add src/lib/odds.ts src/components/SignalsTable.tsx
git commit -m "refactor: extract americanToDecimal to shared lib/odds"
```

---

### Task 2: Rewrite `useBankrollSimulation` with true compounding

**Files:**
- Modify: `src/hooks/useTrades.ts:180-215`

**Step 1: Add `americanToDecimal` import to useTrades.ts**

At the top of `src/hooks/useTrades.ts`, add:

```ts
import { americanToDecimal } from '@/lib/odds';
```

**Step 2: Rewrite `useBankrollSimulation`**

Replace the function at lines 180-215 with:

```ts
export function useBankrollSimulation(kellyFraction: KellyFraction, startingBankroll: number = 1000) {
  const [bankrollData, setBankrollData] = useState<BankrollData[]>([]);
  const [currentBankroll, setCurrentBankroll] = useState(startingBankroll);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('paper_trades')
      .select('signal_date, outcome, profit, edge_pct, kelly_stake, odds')
      .not('outcome', 'is', null)
      .order('signal_date', { ascending: true })
      .order('created_at', { ascending: true })
      .then(({ data, error }) => {
        if (!error && data) {
          const trades = data.filter(d => d.outcome !== 'voided' && isActiveTrade(d));
          let bankroll = startingBankroll;
          const dailyBankrolls: Record<string, number> = {};

          for (const trade of trades) {
            const dollarBet = bankroll * trade.kelly_stake * kellyFraction;
            const decimalOdds = americanToDecimal(trade.odds);

            if (trade.outcome === 'win') {
              bankroll += dollarBet * (decimalOdds - 1);
            } else if (trade.outcome === 'loss') {
              bankroll -= dollarBet;
            }
            // push: no change

            dailyBankrolls[trade.signal_date] = bankroll;
          }

          const bankrollTimeSeries: BankrollData[] = Object.entries(dailyBankrolls).map(
            ([date, bankroll]) => ({ date, bankroll })
          );

          setBankrollData(bankrollTimeSeries);
          setCurrentBankroll(bankroll);
        }
        setLoading(false);
      });
  }, [kellyFraction, startingBankroll]);

  return { bankrollData, currentBankroll, loading };
}
```

Key changes from old version:
- Supabase select now includes `kelly_stake` and `odds`
- Per-trade: `dollarBet = bankroll * trade.kelly_stake * kellyFraction`
- Win: `bankroll += dollarBet * (decimalOdds - 1)`
- Loss: `bankroll -= dollarBet`
- Push: no change (implicit)
- Bankroll compounds — each subsequent trade uses the updated `bankroll`

**Step 3: Verify build passes**

Run: `npm run build`
Expected: Build succeeds, no type errors.

**Step 4: Smoke test locally**

Run: `npm run dev`
- Open localhost:3000
- Check the Bank Balance card shows a value (should differ from old flat-stake value)
- Toggle Kelly fraction (Full/Half/Quarter) — balance should change
- Chart should update with the compounding curve

**Step 5: Commit**

```bash
git add src/hooks/useTrades.ts
git commit -m "fix: use true Kelly compounding in bankroll simulation"
```
