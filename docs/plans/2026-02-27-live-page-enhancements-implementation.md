# Live Page Enhancements Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a day summary scoreboard and visual energy animations to the live tracker page.

**Architecture:** Two independent features wired into the existing live page. The `DaySummary` component consumes enriched signals already available in the page. The `useSignalTransitions` hook tracks value changes between renders to trigger CSS animations on `GameCard` rows.

**Tech Stack:** React 19, TypeScript, Tailwind CSS 4, CSS @keyframes

---

### Task 1: Add CSS keyframe animations to globals.css

**Files:**
- Modify: `src/app/globals.css`

**Step 1: Add all four keyframe animations**

Add the following after the existing `@layer utilities` block in `src/app/globals.css`:

```css
@keyframes flash-hit {
  0% { background-color: rgba(74, 222, 128, 0.15); }
  100% { background-color: transparent; }
}

@keyframes flash-miss {
  0% { background-color: rgba(248, 113, 113, 0.15); }
  100% { background-color: transparent; }
}

@keyframes tick-3pm {
  0% { transform: scale(1); color: inherit; }
  50% { transform: scale(1.3); color: #4ade80; }
  100% { transform: scale(1); color: inherit; }
}

@keyframes tracking-pulse {
  0%, 100% { background-color: transparent; }
  50% { background-color: rgba(74, 222, 128, 0.03); }
}

@layer utilities {
  .animate-flash-hit {
    animation: flash-hit 1.5s ease-out forwards;
  }
  .animate-flash-miss {
    animation: flash-miss 1.5s ease-out forwards;
  }
  .animate-tick-3pm {
    animation: tick-3pm 0.4s ease-out;
  }
  .animate-tracking-pulse {
    animation: tracking-pulse 3s ease-in-out infinite;
  }
}
```

**Step 2: Verify build**

Run: `npm run build`
Expected: Build succeeds with no errors.

**Step 3: Commit**

```bash
git add src/app/globals.css
git commit -m "feat(live): add CSS keyframe animations for signal transitions"
```

---

### Task 2: Create useSignalTransitions hook

**Files:**
- Create: `src/hooks/useSignalTransitions.ts`

This hook tracks previous `signalStatus` and `liveThreePointersMade` per signal, and returns maps indicating which signals just transitioned or ticked.

**Step 1: Create the hook file**

Create `src/hooks/useSignalTransitions.ts` with the following content:

```typescript
'use client';

import { useRef, useState, useEffect } from 'react';
import { EnrichedSignal, SignalStatus } from '@/types/database';

export interface SignalTransitions {
  /** signal_id -> 'hit' | 'miss' for signals that just resolved */
  flashes: Map<string, 'hit' | 'miss'>;
  /** signal_id set for signals whose 3PM count just increased */
  ticks: Set<string>;
}

const FLASH_DURATION_MS = 1500;
const TICK_DURATION_MS = 400;

export function useSignalTransitions(signals: EnrichedSignal[]): SignalTransitions {
  const prevStatusRef = useRef<Map<string, SignalStatus>>(new Map());
  const prev3PMRef = useRef<Map<string, number>>(new Map());
  const [flashes, setFlashes] = useState<Map<string, 'hit' | 'miss'>>(new Map());
  const [ticks, setTicks] = useState<Set<string>>(new Set());

  useEffect(() => {
    const prevStatus = prevStatusRef.current;
    const prev3PM = prev3PMRef.current;
    const newFlashes = new Map<string, 'hit' | 'miss'>();
    const newTicks = new Set<string>();

    for (const signal of signals) {
      const id = signal.signal_id;
      const oldStatus = prevStatus.get(id);
      const newStatus = signal.signalStatus;

      // Detect status transition: tracking -> hit/miss
      if (oldStatus === 'tracking' && (newStatus === 'hit' || newStatus === 'miss')) {
        newFlashes.set(id, newStatus);
      }

      // Detect 3PM tick: value increased
      if (signal.liveThreePointersMade !== null) {
        const old3PM = prev3PM.get(id);
        if (old3PM !== undefined && signal.liveThreePointersMade > old3PM) {
          newTicks.add(id);
        }
        prev3PM.set(id, signal.liveThreePointersMade);
      }

      prevStatus.set(id, newStatus);
    }

    // Apply flashes
    if (newFlashes.size > 0) {
      setFlashes(prev => {
        const merged = new Map(prev);
        newFlashes.forEach((v, k) => merged.set(k, v));
        return merged;
      });
      // Auto-clear after animation duration
      const ids = [...newFlashes.keys()];
      setTimeout(() => {
        setFlashes(prev => {
          const next = new Map(prev);
          ids.forEach(id => next.delete(id));
          return next;
        });
      }, FLASH_DURATION_MS);
    }

    // Apply ticks
    if (newTicks.size > 0) {
      setTicks(prev => {
        const merged = new Set(prev);
        newTicks.forEach(id => merged.add(id));
        return merged;
      });
      // Auto-clear after animation duration
      const ids = [...newTicks];
      setTimeout(() => {
        setTicks(prev => {
          const next = new Set(prev);
          ids.forEach(id => next.delete(id));
          return next;
        });
      }, TICK_DURATION_MS);
    }
  }, [signals]);

  return { flashes, ticks };
}
```

**Step 2: Verify build**

Run: `npm run build`
Expected: Build succeeds. Hook is not yet wired up so no visual change.

**Step 3: Commit**

```bash
git add src/hooks/useSignalTransitions.ts
git commit -m "feat(live): add useSignalTransitions hook for detecting status changes and 3PM ticks"
```

---

### Task 3: Create DaySummary component

**Files:**
- Create: `src/components/DaySummary.tsx`

**Step 1: Create the component file**

Create `src/components/DaySummary.tsx` with the following content:

```typescript
import { EnrichedSignal, SignalStatus } from '@/types/database';

interface DaySummaryProps {
  signals: EnrichedSignal[];
}

const chipConfig: Record<string, { label: string; bg: string; text: string }> = {
  hit: { label: 'HIT', bg: 'bg-green-500/20', text: 'text-green-400' },
  miss: { label: 'MISS', bg: 'bg-red-500/20', text: 'text-red-400' },
  tracking: { label: 'TRACKING', bg: 'bg-green-500/20', text: 'text-green-400' },
  scheduled: { label: 'SCHED', bg: 'bg-orange-500/20', text: 'text-orange-400' },
};

export function DaySummary({ signals }: DaySummaryProps) {
  // Count by live-derived signalStatus
  const counts: Record<string, number> = { hit: 0, miss: 0, tracking: 0, scheduled: 0 };
  for (const s of signals) {
    if (s.signalStatus in counts) {
      counts[s.signalStatus]++;
    }
  }

  // P&L from Supabase-confirmed outcomes only
  const confirmedPnL = signals.reduce((sum, s) => {
    if (s.outcome && s.outcome !== 'voided' && s.profit !== null) {
      return sum + s.profit;
    }
    return sum;
  }, 0);
  const hasConfirmedResults = signals.some(s => s.outcome && s.outcome !== 'voided');

  // Only show if there are signals
  if (signals.length === 0) return null;

  const visibleChips = (Object.keys(chipConfig) as string[]).filter(key => counts[key] > 0);

  return (
    <div className="mb-4 md:mb-6">
      <div className="flex flex-wrap items-center gap-2 md:gap-3">
        {visibleChips.map(key => {
          const { label, bg, text } = chipConfig[key];
          return (
            <span
              key={key}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${bg} ${text}`}
            >
              <span className="font-mono">{counts[key]}</span>
              {label}
            </span>
          );
        })}

        {hasConfirmedResults && (
          <>
            <span className="text-white/20 hidden md:inline">|</span>
            <span
              className={`text-sm font-semibold font-mono ${
                confirmedPnL >= 0 ? 'text-green-400' : 'text-red-400'
              }`}
            >
              {confirmedPnL >= 0 ? '+' : ''}{confirmedPnL.toFixed(2)}u
            </span>
          </>
        )}
      </div>
    </div>
  );
}
```

**Step 2: Verify build**

Run: `npm run build`
Expected: Build succeeds. Component is not yet wired into the page.

**Step 3: Commit**

```bash
git add src/components/DaySummary.tsx
git commit -m "feat(live): add DaySummary scoreboard component"
```

---

### Task 4: Wire DaySummary into the live page

**Files:**
- Modify: `src/app/live/page.tsx`

**Step 1: Add import and collect all enriched signals**

In `src/app/live/page.tsx`, add the import at the top (after the existing imports around line 8):

```typescript
import { DaySummary } from '@/components/DaySummary';
```

Then inside the `LiveTracker` component (after line 23 where `useLiveSignals` is called), add:

```typescript
const allEnrichedSignals = [
  ...gamesWithSignals.flatMap(g => g.signals),
  ...unmatchedSignals,
];
```

**Step 2: Add DaySummary to the JSX**

Insert the `DaySummary` component inside the signals-loaded branch, right before the game cards. Replace the `<div className="space-y-4 md:space-y-6">` block (line 47) so it becomes:

```tsx
<div className="space-y-4 md:space-y-6">
  <DaySummary signals={allEnrichedSignals} />
  {gamesWithSignals.map(({ game, signals }) => (
```

(Everything else stays the same — just add the `<DaySummary>` line before the map.)

**Step 3: Verify build**

Run: `npm run build`
Expected: Build succeeds.

**Step 4: Visual verification**

Run: `npm run dev`
Visit `http://localhost:3000/live`. Verify:
- Colored pill chips appear between the header and the game cards
- Chips only show for categories with count > 0
- P&L shows only if there are Supabase-confirmed outcomes

**Step 5: Commit**

```bash
git add src/app/live/page.tsx
git commit -m "feat(live): wire DaySummary scoreboard into live page"
```

---

### Task 5: Wire animations into GameCard

**Files:**
- Modify: `src/components/GameCard.tsx`

This is the most involved task. We need to:
1. Accept transition data as props
2. Apply flash animation classes to signal rows
3. Apply tick animation to 3PM counter
4. Apply tracking-pulse to tracking signal rows

**Step 1: Update GameCard props**

The `GameCard` currently takes `GameWithSignals` (destructured as `{ game, signals }`). We need to also accept the transitions. Update the component signature:

In `src/components/GameCard.tsx`, add the import at the top:

```typescript
import { SignalTransitions } from '@/hooks/useSignalTransitions';
```

Change the component signature from:

```typescript
export function GameCard({ game, signals }: GameWithSignals) {
```

to:

```typescript
interface GameCardProps extends GameWithSignals {
  transitions: SignalTransitions;
}

export function GameCard({ game, signals, transitions }: GameCardProps) {
```

**Step 2: Apply tracking-pulse to signal rows**

For the **desktop table** rows (around line 116), change the `<tr>` className from:

```tsx
<tr key={s.signal_id} className={`border-b border-white/[0.04] ${sweet ? '' : 'opacity-40'}`}>
```

to:

```tsx
<tr key={s.signal_id} className={`border-b border-white/[0.04] ${sweet ? '' : 'opacity-40'} ${s.signalStatus === 'tracking' ? 'animate-tracking-pulse' : ''} ${transitions.flashes.has(s.signal_id) ? (transitions.flashes.get(s.signal_id) === 'hit' ? 'animate-flash-hit' : 'animate-flash-miss') : ''}`}>
```

For the **mobile card** rows (around line 70), change the `<div>` className from:

```tsx
<div key={s.signal_id} className={`bg-white/5 rounded-xl p-3 ${sweet ? '' : 'opacity-40'}`}>
```

to:

```tsx
<div key={s.signal_id} className={`bg-white/5 rounded-xl p-3 ${sweet ? '' : 'opacity-40'} ${s.signalStatus === 'tracking' ? 'animate-tracking-pulse' : ''} ${transitions.flashes.has(s.signal_id) ? (transitions.flashes.get(s.signal_id) === 'hit' ? 'animate-flash-hit' : 'animate-flash-miss') : ''}`}>
```

**Step 3: Apply tick animation to 3PM counter**

For the **desktop** 3PM number (around line 125), change:

```tsx
<span className="text-white font-mono text-lg font-bold">{s.liveThreePointersMade}</span>
```

to:

```tsx
<span className={`text-white font-mono text-lg font-bold ${transitions.ticks.has(s.signal_id) ? 'animate-tick-3pm' : ''}`}>{s.liveThreePointersMade}</span>
```

For the **mobile** 3PM number (around line 83), change:

```tsx
<span className="text-lg font-bold">{s.liveThreePointersMade}</span>
```

to:

```tsx
<span className={`text-lg font-bold ${transitions.ticks.has(s.signal_id) ? 'animate-tick-3pm' : ''}`}>{s.liveThreePointersMade}</span>
```

**Step 4: Verify build**

Run: `npm run build`
Expected: Build fails — `GameCard` now expects `transitions` prop but the live page doesn't pass it yet. That's expected; we'll fix in the next task.

**Step 5: Commit**

```bash
git add src/components/GameCard.tsx
git commit -m "feat(live): add animation classes to GameCard signal rows"
```

---

### Task 6: Wire useSignalTransitions into the live page

**Files:**
- Modify: `src/app/live/page.tsx`

**Step 1: Add imports and call the hook**

In `src/app/live/page.tsx`, add the import:

```typescript
import { useSignalTransitions } from '@/hooks/useSignalTransitions';
```

After the `allEnrichedSignals` line added in Task 4, add:

```typescript
const transitions = useSignalTransitions(allEnrichedSignals);
```

**Step 2: Pass transitions to GameCard**

Change the GameCard call from:

```tsx
<GameCard key={game.gameId} game={game} signals={signals} />
```

to:

```tsx
<GameCard key={game.gameId} game={game} signals={signals} transitions={transitions} />
```

**Step 3: Verify build**

Run: `npm run build`
Expected: Build succeeds with no errors.

**Step 4: Visual verification**

Run: `npm run dev`
Visit `http://localhost:3000/live`. Verify:
- Tracking signals have a subtle green breathing pulse on their row
- The 3PM counter animates when a player makes a three (wait for live data or manually test by temporarily modifying data)
- When a game goes final, the signal rows flash green (hit) or red (miss)

**Step 5: Commit**

```bash
git add src/app/live/page.tsx
git commit -m "feat(live): wire signal transitions into live page for animations"
```

---

### Task 7: Final build verification and lint

**Files:** None (verification only)

**Step 1: Run lint**

Run: `npm run lint`
Expected: No errors. Fix any warnings.

**Step 2: Run production build**

Run: `npm run build`
Expected: Build succeeds cleanly.

**Step 3: Visual smoke test**

Run: `npm run dev`
Visit `http://localhost:3000/live` and verify:
1. Day summary scoreboard shows pill chips with correct counts
2. P&L only appears for Supabase-confirmed outcomes
3. Tracking rows pulse subtly
4. Page still works with no signals (shows "No signals today")
5. Mobile layout is correct (pills wrap, cards look good)

**Step 4: Commit (if any lint fixes needed)**

```bash
git add -A
git commit -m "chore: lint fixes for live page enhancements"
```
