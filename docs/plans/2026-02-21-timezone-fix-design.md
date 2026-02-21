# Timezone Fix Design

## Problem

The dashboard determines "today's signals" using the ET (Eastern Time) date. For a user in AEDT (UTC+11), the local date is ~16 hours ahead of ET. This means on a Saturday morning in Sydney, the dashboard shows Friday's reconciled results as "Today's Bets" instead of Saturday's upcoming signals.

## Solution: Timezone-Agnostic "Latest Pending" Query

Instead of computing "today" in any timezone, query for the **latest signal_date with pending (unreconciled) signals**. Fall back to the latest signal_date overall if all signals are reconciled.

This is timezone-agnostic — it always shows the most relevant signals regardless of where the user is.

## Changes

### Dashboard (nba-3pm-dashboard)

#### 1. `src/hooks/useTrades.ts` — Replace `useTodaysSignals()` with `useLatestSignals()`

**Current:** Computes ET date, queries `signal_date = today_et`.

**New:** Two-step query:
1. Query for signals where `outcome IS NULL`, ordered by `signal_date DESC`, limit 1 to get the latest pending date.
2. Query all signals for that date.
3. Fallback: if no pending signals exist, query the most recent `signal_date` overall.

Return the `signalDate` string alongside signals so the UI can display it.

#### 2. `src/components/RecentResults.tsx` — Fix timezone bugs

**`isToday()` (line 22-26):** Uses `new Date()` without timezone, causing wrong "Today" label for non-UTC users. Fix: compare raw `signal_date` string against ET-formatted today, or remove "Today" label in favor of always showing the date.

**`formatDate()` (line 17-20):** Uses `new Date(dateStr)` which parses as UTC midnight, causing off-by-one for users west of UTC. Fix: add `timeZone: 'America/New_York'` to `toLocaleDateString`.

#### 3. `src/app/page.tsx` — Update label

Change "Todays Bets" to show the actual signal date (e.g., "Sat Feb 21") so it's contextually accurate regardless of timezone.

### Model Repo (nba-3pm-model)

#### 4. `src/data/game_results.py` line 334 — ET-aware future guard

Change `datetime.now().date()` to `datetime.now(pytz.timezone("US/Eastern")).date()`.

#### 5. `src/betting/signals.py` line 436 — ET-aware pipeline date

Change `datetime.now().strftime(...)` to `datetime.now(pytz.timezone("US/Eastern")).strftime(...)`.

#### 6. `scripts/sync_player_stats.py` lines 49-53 — ET-aware season detection

Change `datetime.now()` to `datetime.now(pytz.timezone("US/Eastern"))`.

## Non-Goals

- Multi-user timezone support (single-user dashboard)
- Changing how `signal_date` is assigned in signal generation (already correct)
- Changing the CI cron schedule
