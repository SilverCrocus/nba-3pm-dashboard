# Odds Column & Bankroll Simulation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add odds display to Today's Signals table and implement a bankroll simulation feature with Kelly fraction toggles.

**Architecture:** Add Kelly fraction state to page.tsx and pass it down to both BankBalanceCard and PnLChart. Create a new hook to calculate compounding bankroll growth. Update SignalsTable to display the existing odds field.

**Tech Stack:** Next.js 16, React 19, TypeScript, Recharts, Supabase, Tailwind CSS

---

## Task 1: Add Odds Column to SignalsTable

**Files:**
- Modify: `src/components/SignalsTable.tsx`

**Step 1: Add ODDS column header to desktop table**

In `src/components/SignalsTable.tsx`, find the `<thead>` section (around line 53) and add the ODDS header after LINE:

```tsx
<tr className="text-white/40 text-xs uppercase tracking-wider border-b border-white/10">
  <th className="text-left pb-3">Player</th>
  <th className="text-left pb-3">Line</th>
  <th className="text-left pb-3">Odds</th>
  <th className="text-left pb-3">Edge</th>
  <th className="text-left pb-3">Book</th>
  <th className="text-right pb-3">Status</th>
</tr>
```

**Step 2: Add odds cell to desktop table rows**

Find the `<tbody>` section (around line 61) and add the odds cell after the LINE cell:

```tsx
<tr key={signal.signal_id} className="border-b border-white/5">
  <td className="py-3">
    <div>
      <div className="flex items-center gap-2">
        <p className="font-medium text-white">{signal.player_name}</p>
        {signal.team && (
          <span className="text-xs text-white/40 font-medium">{signal.team}</span>
        )}
      </div>
      <p className="text-xs text-white/40">{signal.side.toUpperCase()} {signal.line}</p>
    </div>
  </td>
  <td className="py-3 font-mono text-white/70">{signal.line}</td>
  <td className="py-3 font-mono text-white/70">{signal.odds.toFixed(2)}</td>
  <td className="py-3 text-green-400 font-medium">+{signal.edge_pct.toFixed(1)}%</td>
  <td className="py-3 text-white/50">{signal.bookmaker}</td>
  <td className="py-3 text-right">
    <StatusBadge outcome={signal.outcome} />
  </td>
</tr>
```

**Step 3: Add odds to mobile card layout**

Find the mobile card section (around line 27) and add odds display:

```tsx
<div key={signal.signal_id} className="bg-white/5 rounded-xl p-3">
  <div className="flex justify-between items-start mb-2">
    <div>
      <div className="flex items-center gap-2">
        <p className="font-medium text-white text-sm">{signal.player_name}</p>
        {signal.team && (
          <span className="text-[10px] text-white/50 font-medium">{signal.team}</span>
        )}
      </div>
      <p className="text-xs text-white/40">{signal.side.toUpperCase()} {signal.line} @ {signal.odds.toFixed(2)}</p>
    </div>
    <StatusBadge outcome={signal.outcome} />
  </div>
  <div className="flex justify-between text-xs">
    <span className="text-green-400 font-medium">+{signal.edge_pct.toFixed(1)}% edge</span>
    <span className="text-white/50">{signal.bookmaker}</span>
  </div>
</div>
```

**Step 4: Verify changes**

Run: `npm run dev`
Check: Open http://localhost:3000 and verify odds column appears in Today's Signals table

**Step 5: Commit**

```bash
git add src/components/SignalsTable.tsx
git commit -m "feat: add odds column to Today's Signals table"
```

---

## Task 2: Add Kelly Fraction Type

**Files:**
- Modify: `src/types/database.ts`

**Step 1: Add KellyFraction type**

At the end of `src/types/database.ts`, add:

```typescript
export type KellyFraction = 1 | 0.5 | 0.25;

export interface BankrollData {
  date: string;
  bankroll: number;
}
```

**Step 2: Commit**

```bash
git add src/types/database.ts
git commit -m "feat: add KellyFraction and BankrollData types"
```

---

## Task 3: Create Bankroll Calculation Hook

**Files:**
- Modify: `src/hooks/useTrades.ts`

**Step 1: Add useBankrollSimulation hook**

At the end of `src/hooks/useTrades.ts`, add:

```typescript
import { PaperTrade, DailyStats, KellyFraction, BankrollData } from '@/types/database';
```

Update the import at the top, then add this hook at the bottom:

```typescript
export function useBankrollSimulation(kellyFraction: KellyFraction, startingBankroll: number = 1000) {
  const [bankrollData, setBankrollData] = useState<BankrollData[]>([]);
  const [currentBankroll, setCurrentBankroll] = useState(startingBankroll);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('paper_trades')
      .select('signal_date, outcome, odds, kelly_stake')
      .not('outcome', 'is', null)
      .order('signal_date', { ascending: true })
      .order('created_at', { ascending: true })
      .then(({ data, error }) => {
        if (!error && data) {
          let bankroll = startingBankroll;
          const dailyBankrolls: Record<string, number> = {};

          for (const trade of data) {
            const stake = bankroll * trade.kelly_stake * kellyFraction;

            if (trade.outcome === 'win') {
              bankroll += stake * (trade.odds - 1);
            } else if (trade.outcome === 'loss') {
              bankroll -= stake;
            }
            // push: no change

            // Track end-of-day bankroll
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

**Step 2: Verify TypeScript compiles**

Run: `npm run build`
Expected: No TypeScript errors

**Step 3: Commit**

```bash
git add src/hooks/useTrades.ts
git commit -m "feat: add useBankrollSimulation hook with Kelly compounding"
```

---

## Task 4: Create BankBalanceCard Component

**Files:**
- Create: `src/components/BankBalanceCard.tsx`

**Step 1: Create the component file**

Create `src/components/BankBalanceCard.tsx`:

```typescript
import { KellyFraction } from '@/types/database';

interface BankBalanceCardProps {
  currentBankroll: number;
  startingBankroll: number;
  kellyFraction: KellyFraction;
  onKellyChange: (fraction: KellyFraction) => void;
  loading: boolean;
}

export function BankBalanceCard({
  currentBankroll,
  startingBankroll,
  kellyFraction,
  onKellyChange,
  loading,
}: BankBalanceCardProps) {
  const profit = currentBankroll - startingBankroll;
  const isPositive = profit >= 0;

  const fractions: { value: KellyFraction; label: string }[] = [
    { value: 1, label: 'Full' },
    { value: 0.5, label: '1/2' },
    { value: 0.25, label: '1/4' },
  ];

  return (
    <div className="bg-[rgba(38,38,45,0.6)] backdrop-blur-md border border-white/[0.08] rounded-2xl md:rounded-3xl p-3 md:p-6">
      <p className="text-white/50 text-xs md:text-sm font-medium mb-0.5 md:mb-1">Bank Balance</p>
      <p className="text-xl md:text-3xl font-bold text-white font-display">
        {loading ? '...' : `$${currentBankroll.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
      </p>
      <p className={`text-xs md:text-sm mt-0.5 md:mt-1 ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
        {loading ? '' : `${isPositive ? '+' : ''}$${profit.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} profit`}
      </p>

      {/* Kelly Fraction Toggles */}
      <div className="flex gap-1 mt-2 md:mt-3">
        {fractions.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => onKellyChange(value)}
            className={`px-2 md:px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              kellyFraction === value
                ? 'bg-orange-500/30 text-orange-400 border border-orange-500/50'
                : 'bg-white/5 text-white/50 border border-white/10 hover:bg-white/10'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
```

**Step 2: Verify TypeScript compiles**

Run: `npm run build`
Expected: No TypeScript errors

**Step 3: Commit**

```bash
git add src/components/BankBalanceCard.tsx
git commit -m "feat: add BankBalanceCard component with Kelly toggles"
```

---

## Task 5: Update PnLChart for Bankroll Display

**Files:**
- Modify: `src/components/PnLChart.tsx`

**Step 1: Update props interface and imports**

Replace the contents of `src/components/PnLChart.tsx`:

```typescript
'use client';

import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { BankrollData, KellyFraction } from '@/types/database';

interface PnLChartProps {
  data: BankrollData[];
  kellyFraction: KellyFraction;
  loading: boolean;
}

const kellyLabels: Record<KellyFraction, string> = {
  1: 'Full Kelly',
  0.5: '1/2 Kelly',
  0.25: '1/4 Kelly',
};

export function PnLChart({ data, kellyFraction, loading }: PnLChartProps) {
  if (loading) {
    return <div className="text-white/50">Loading chart...</div>;
  }

  return (
    <div className="bg-gradient-to-br from-green-600/80 to-green-800/80 rounded-2xl md:rounded-3xl p-4 md:p-6">
      <h3 className="text-lg md:text-xl font-semibold text-white mb-3 md:mb-4">
        Bankroll Growth ({kellyLabels[kellyFraction]})
      </h3>
      <div className="h-40 md:h-48">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="pnlGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#4ade80" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#4ade80" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="date"
              stroke="#ffffff50"
              tick={{ fill: '#ffffff80', fontSize: 10 }}
              tickFormatter={(value) => value.slice(5)}
            />
            <YAxis
              stroke="#ffffff50"
              tick={{ fill: '#ffffff80', fontSize: 10 }}
              tickFormatter={(value) => `$${value.toLocaleString()}`}
              domain={['dataMin - 50', 'dataMax + 50']}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(0,0,0,0.8)',
                border: 'none',
                borderRadius: '8px',
                color: 'white'
              }}
              formatter={(value) => [`$${(value as number).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`, 'Bankroll']}
            />
            <Area
              type="monotone"
              dataKey="bankroll"
              stroke="#4ade80"
              strokeWidth={2}
              fill="url(#pnlGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
```

**Step 2: Verify TypeScript compiles**

Run: `npm run build`
Expected: Build will fail because page.tsx needs updating (expected)

**Step 3: Commit**

```bash
git add src/components/PnLChart.tsx
git commit -m "feat: update PnLChart to display bankroll with Kelly label"
```

---

## Task 6: Wire Up Components in page.tsx

**Files:**
- Modify: `src/app/page.tsx`

**Step 1: Update imports and add state**

Replace the contents of `src/app/page.tsx`:

```typescript
'use client';

import { useState } from 'react';
import { StatCard } from '@/components/StatCard';
import { SignalsTable } from '@/components/SignalsTable';
import { PnLChart } from '@/components/PnLChart';
import { RecentResults } from '@/components/RecentResults';
import { BankBalanceCard } from '@/components/BankBalanceCard';
import { useTodaysSignals, usePerformanceStats, useRecentResults, useBankrollSimulation } from '@/hooks/useTrades';
import { KellyFraction } from '@/types/database';

const STARTING_BANKROLL = 1000;

export default function Dashboard() {
  const [kellyFraction, setKellyFraction] = useState<KellyFraction>(0.5);

  const { signals, loading: signalsLoading } = useTodaysSignals();
  const { stats, loading: statsLoading } = usePerformanceStats();
  const { bankrollData, currentBankroll, loading: bankrollLoading } = useBankrollSimulation(kellyFraction, STARTING_BANKROLL);
  const { results, loading: resultsLoading } = useRecentResults(50);

  return (
    <div className="min-h-screen">
      <main className="p-4 md:p-8 max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6 md:mb-8">
          <div className="flex items-center gap-3 mb-2">
            {/* Logo */}
            <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl md:rounded-2xl flex items-center justify-center text-xl md:text-2xl flex-shrink-0">
              <span role="img" aria-label="basketball">&#127936;</span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
              <h1 className="text-2xl md:text-3xl font-bold text-white font-display">NBA 3PM Model</h1>
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-400 w-fit">
                {statsLoading ? '...' : (stats.winRate * 100).toFixed(0) + '% win rate'}
              </span>
            </div>
          </div>
          <p className="text-white/50 text-sm md:text-base ml-13 md:ml-15">Track bets and maximize edge</p>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-3 md:gap-6 mb-4 md:mb-6">
          <BankBalanceCard
            currentBankroll={currentBankroll}
            startingBankroll={STARTING_BANKROLL}
            kellyFraction={kellyFraction}
            onKellyChange={setKellyFraction}
            loading={bankrollLoading}
          />
          <StatCard
            title="Win Rate"
            value={statsLoading ? '...' : (stats.winRate * 100).toFixed(1) + '%'}
            subtitle={stats.totalBets + ' total bets'}
          />
          <StatCard
            title="Todays Bets"
            value={signalsLoading ? '...' : signals.length.toString()}
            subtitle={signals.filter(s => !s.outcome).length + ' pending'}
          />
        </div>

        {/* Charts Row - stack on mobile */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 md:gap-6 mb-4 md:mb-6">
          <div className="lg:col-span-2">
            <PnLChart data={bankrollData} kellyFraction={kellyFraction} loading={bankrollLoading} />
          </div>
          <div className="lg:col-span-3">
            <SignalsTable signals={signals} loading={signalsLoading} />
          </div>
        </div>

        {/* Recent Results */}
        <RecentResults results={results} loading={resultsLoading} />
      </main>
    </div>
  );
}
```

**Step 2: Verify build passes**

Run: `npm run build`
Expected: Build succeeds with no errors

**Step 3: Test in browser**

Run: `npm run dev`
Check:
- Bank Balance card shows dollar amount with Kelly toggles
- Clicking toggles (Full, 1/2, 1/4) updates both the balance and the chart
- Chart title shows current Kelly selection
- Odds column appears in Today's Signals table

**Step 4: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: wire up bankroll simulation with Kelly toggles"
```

---

## Task 7: Final Verification and Cleanup

**Step 1: Run lint**

Run: `npm run lint`
Fix any linting errors if present

**Step 2: Run production build**

Run: `npm run build`
Expected: Build succeeds

**Step 3: Test all features**

Manual testing checklist:
- [ ] Odds column visible in desktop table
- [ ] Odds visible in mobile cards (format: "UNDER 2.5 @ 1.91")
- [ ] Bank Balance shows dollar amount (e.g., "$1,247")
- [ ] Profit/loss subtitle shows (e.g., "+$247 profit")
- [ ] Kelly toggles work (Full, 1/2, 1/4)
- [ ] Chart updates when Kelly toggle changes
- [ ] Chart title updates (e.g., "Bankroll Growth (1/2 Kelly)")
- [ ] Default Kelly is 1/2

**Step 4: Final commit (if any fixes needed)**

```bash
git add -A
git commit -m "fix: address any issues from final testing"
```

---

## Summary of Files Changed

| File | Change |
|------|--------|
| `src/components/SignalsTable.tsx` | Add odds column to desktop table and mobile cards |
| `src/types/database.ts` | Add KellyFraction and BankrollData types |
| `src/hooks/useTrades.ts` | Add useBankrollSimulation hook |
| `src/components/BankBalanceCard.tsx` | New component with Kelly toggles |
| `src/components/PnLChart.tsx` | Update to show bankroll instead of percentage |
| `src/app/page.tsx` | Wire up Kelly state and new components |

## Commit History (Expected)

1. `feat: add odds column to Today's Signals table`
2. `feat: add KellyFraction and BankrollData types`
3. `feat: add useBankrollSimulation hook with Kelly compounding`
4. `feat: add BankBalanceCard component with Kelly toggles`
5. `feat: update PnLChart to display bankroll with Kelly label`
6. `feat: wire up bankroll simulation with Kelly toggles`
