# CLAUDE.md

## Project Overview

Next.js dashboard for the NBA 3PM betting model. Displays daily signals, live game tracking, performance stats, and bankroll simulation. Reads all data from Supabase.

Live: https://nba-3pm-dashboard.onrender.com

## Commands

```bash
npm install          # Install dependencies
npm run dev          # Dev server (localhost:3000)
npm run build        # Production build
npm run lint         # ESLint
```

## Architecture

**Next.js 16 App Router** with React 19, TypeScript, Tailwind CSS 4, deployed on Render.

```
src/
├── app/
│   ├── page.tsx              # Home: stats, signals table, PnL chart, bankroll sim
│   ├── live/page.tsx         # Live tracker: game cards with real-time 3PM tracking
│   ├── api/live-scores/route.ts  # Proxy to NBA CDN API (avoids CORS)
│   └── layout.tsx            # Root layout with NavBar
├── components/
│   ├── SignalsTable.tsx       # Today's signals with StatusBadge (win/loss/push/voided/pending)
│   ├── GameCard.tsx           # Live game card with player signals
│   ├── PnLChart.tsx           # Cumulative P&L line chart
│   ├── BankBalanceCard.tsx    # Bankroll simulation with Kelly fraction selector
│   ├── StatCard.tsx           # Stat display card
│   ├── RecentResults.tsx      # Recent reconciled trades
│   ├── LiveHeader.tsx         # Live page header with connection status
│   ├── LiveStatusBadge.tsx    # Signal status badge for live tracker
│   ├── CourtStatus.tsx        # On-court indicator
│   └── NavBar.tsx             # Top navigation
├── hooks/
│   ├── useTrades.ts           # Supabase data hooks (signals, stats, PnL, bankroll)
│   └── useLiveScores.ts       # NBA API polling, team resolution, live signal matching
├── lib/
│   └── supabase.ts            # Supabase client (uses NEXT_PUBLIC_ env vars)
└── types/
    └── database.ts            # All TypeScript types (PaperTrade, LiveGame, etc.)
```

## Key Hooks

### `useTrades.ts`

| Hook | Purpose |
|------|---------|
| `useLatestSignals()` | Fetch latest signals — picks the most recent `signal_date` with pending outcomes, falls back to latest date overall. Timezone-agnostic. Returns `{ signals, signalDate, loading }`. |
| `usePerformanceStats()` | Win rate, total P&L, wins/losses/voided counts |
| `useDailyPnL()` | Daily profit grouped by date with cumulative total |
| `useRecentResults(limit)` | Last N reconciled trades |
| `useBankrollSimulation(kellyFraction, startingBankroll)` | Simulates bankroll growth with Kelly criterion |

All hooks **exclude voided trades** from stats and calculations.

### `useLiveScores.ts`

| Hook/Function | Purpose |
|---------------|---------|
| `useLiveScores()` | Polls `/api/live-scores` every 10s, stops when all games final |
| `usePlayerTeams(signals)` | Resolves team tricodes for signals (2-step: NBA API then Supabase fallback) |
| `useLiveSignals(signals, games)` | Matches signals to live games, enriches with 3PM/minutes/court status |
| `normalizePlayerName()` | Unicode NFD decomposition + lowercase + strip non-alpha |

## Team Name Resolution

Signals from CI often have empty team fields. Resolution is multi-layered:

1. **CI signal generation** (`nba-3pm-model`): Looks up team from `game_results` table
2. **NBA live API** (`usePlayerTeams`): Matches player names from today's live games
3. **Supabase fallback** (`usePlayerTeams`): For players whose teams aren't playing today, queries `game_results` for most recent team
4. **Live signal matching** (`useLiveSignals`): Backfills team from NBA API player data

Player name matching uses `normalizePlayerName()` which handles accented characters (e.g., Doncic/Doncic) via Unicode NFD decomposition.

## Outcome Types

| Outcome | Badge Color | Included in Stats? |
|---------|-------------|-------------------|
| `null` (pending) | Orange | No |
| `win` | Green | Yes |
| `loss` | Red | Yes |
| `push` | Yellow | Yes |
| `voided` | Gray | No |

Voided = player DNP (0 minutes) or no game on signal date.

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

## Supabase Tables Used

| Table | Usage |
|-------|-------|
| `paper_trades` | All signals, outcomes, profit — primary data source |
| `game_results` | Team name fallback for players not in today's games |

## Timezone Conventions

- **All `signal_date` values are ET dates** (America/New_York). NBA games are organized by ET date.
- **`useLatestSignals()`** is timezone-agnostic — queries by pending status, not by "today" in any timezone. Works correctly regardless of user location.
- **Display dates** in components use `timeZone: 'America/New_York'` for consistency (LiveHeader, GameCard, RecentResults).
- **Never use `new Date(dateStr)` without timezone** for date-only strings — it parses as UTC midnight which causes off-by-one errors. Use `new Date(dateStr + 'T12:00:00')` with explicit timezone, or compare raw YYYY-MM-DD strings directly.

## Danger Zones

1. **Supabase anon key is public**: `NEXT_PUBLIC_` prefix means it's in client bundle. Row-level security must be configured in Supabase.
2. **NBA CDN API is unofficial**: `cdn.nba.com/static/json/liveData/` has no SLA or docs. Can change without notice.
3. **Polling interval**: 10s in `useLiveScores`. Don't decrease — NBA CDN may rate limit.
4. **Empty string vs null for team**: CI writes `team: ""` not `null`. Always check with `s.team && s.team.trim()`.
5. **useLiveScores re-render loop**: The `useEffect` depends on `games` state. The `allDone` check prevents infinite fetching when all games are final, but modifying the dependency array carelessly can cause loops.
