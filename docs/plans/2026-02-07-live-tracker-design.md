# Live Tracker Page — Design Document

Date: 2026-02-07

## Summary

A new `/live` page that shows today's signals alongside real-time NBA box score data, organized by game. Players' live 3PM counts are polled every 10 seconds via a Next.js API route that proxies the NBA stats API. Display-only — no write-back to Supabase.

## Architecture Changes

### Static export removal

Remove `output: 'export'` from `next.config.ts` to enable server-side API routes. The app will need a Node.js host (Vercel handles this natively).

### New routes

| Route | File | Purpose |
|-------|------|---------|
| `/live` | `src/app/live/page.tsx` | Live tracker page |
| `/api/live-scores` | `src/app/api/live-scores/route.ts` | Proxy — calls NBA API, caches 10s server-side |

### Data flow

```
Browser (polls /api/live-scores every 10s)
    |
    v
Next.js API Route (10s in-memory cache, calls NBA API)
    |
    v
nba.com/stats endpoints (scoreboard + boxscore)
    |
    v
Response merged client-side with today's signals from Supabase
    |
    v
Rendered as game-centric cards with live 3PM counts
```

## NavBar Component

Added to `layout.tsx`, renders on all pages.

- Left: app title
- Right: "Dashboard" (`/`) and "Live Tracker" (`/live`) links
- Active link highlighted with orange accent
- Sticky, dark glassmorphism style consistent with existing design
- Mobile: two links side by side (no hamburger needed)
- Uses Next.js `<Link>` and `usePathname()` for active state

## Live Tracker Page Layout

The page shows a stack of game cards. Only games with at least one signal are displayed.

### Page header

- Title: "Live Tracker"
- Subtitle: current date (ET) + connection status (green dot = polling, grey = no active games)
- Auto-refresh countdown badge

### Game card structure

```
+------------------------------------------------------+
|  GSW 87 - 92 LAL          Q3  4:32     * LIVE        |
|------------------------------------------------------|
|                                                       |
|  Player        3PM   Line   Side   Status    Signal   |
|  --------------------------------------------------- |
|  S. Curry       2    2.5    Over   On-court  Tracking |
|  K. Thompson    1    1.5    Over   Bench     Tracking |
|                                                       |
+------------------------------------------------------+
```

### Game card header

- Team abbreviations, live score, quarter/period, game clock
- Status badge: LIVE (pulsing green), FINAL (grey), SCHEDULED (orange)

### Signal rows

- Player name
- Current 3PM count (live)
- Line from signal
- Side (over/under)
- On/off court indicator (green = on court, grey = bench)
- Signal status: Scheduled, Tracking, Hit (green), Miss (red), Push (grey)

### Game states

- **Scheduled**: card shows game start time, signals listed, no live data
- **Live**: full live data, polling active
- **Final**: final 3PM counts, signals marked hit/miss/push
- **No games today**: empty state message

## API Route: `/api/live-scores`

### NBA API calls

1. **Scoreboard** (`todaysscoreboard`) — all games today with scores, clock, period, status
2. **Box scores** (`boxscoretraditionalv2`) — per-player stats for live/final games, including `fg3m` and on-court status

### Server-side caching

Stores last response in memory with a timestamp. Returns cached response if less than 10 seconds old.

### Required NBA API headers

Set server-side: `Referer`, `User-Agent` — required for NBA stats endpoints to respond.

### Response shape

```typescript
interface LiveScoresResponse {
  games: LiveGame[];
  timestamp: string;
}

interface LiveGame {
  gameId: string;
  homeTeam: { abbreviation: string; score: number };
  awayTeam: { abbreviation: string; score: number };
  period: number;
  clock: string;
  status: 'scheduled' | 'live' | 'final';
  startTime: string;
  players: LivePlayer[];
}

interface LivePlayer {
  playerId: string;
  playerName: string;
  teamAbbreviation: string;
  fg3m: number;
  isOnCourt: boolean;
  minutes: string;
}
```

## Client-Side Hooks

### `useLiveScores()`

In `src/hooks/useLiveScores.ts`.

- Polls `/api/live-scores` every 10 seconds via `setInterval`
- Returns `{ games, isLoading, lastUpdated, isConnected }`
- Stops polling when all games are final
- Cleans up interval on unmount

### `useLiveSignals()`

In `src/hooks/useLiveScores.ts`. Combines signals with live data.

- Takes `signals[]` and `liveGames[]` as input
- Groups signals by gameId (matched via player_id)
- Enriches each signal with: live fg3m, on-court status, minutes played, derived status
- Returns `GameWithSignals[]`

### Derived signal status logic

- Game scheduled -> `"scheduled"`
- Game live -> `"tracking"`
- Game final + fg3m beats line on correct side -> `"hit"`
- Game final + fg3m doesn't beat line -> `"miss"`
- Game final + fg3m equals line -> `"push"`

## New Components

All in `src/components/` (flat structure).

| Component | Purpose |
|-----------|---------|
| `NavBar.tsx` | Shared navigation bar with Dashboard / Live Tracker links |
| `GameCard.tsx` | Single game card with header + signal rows table |
| `LiveStatusBadge.tsx` | Badge for game/signal states (LIVE, FINAL, SCHEDULED, HIT, MISS, PUSH) |
| `CourtStatus.tsx` | On/off court indicator with minutes on hover |
| `LiveHeader.tsx` | Page header with title, date, polling status, refresh countdown |

## Existing file modifications

| File | Change |
|------|--------|
| `next.config.ts` | Remove `output: 'export'` |
| `src/app/layout.tsx` | Add `NavBar` component |

All existing dashboard components and the `/` page remain untouched.

## Out of scope

- Writing results back to Supabase (reconciliation stays in the Python repo's CI)
- Automated reconciliation via Edge Functions (future consideration)
- Games without signals (not displayed)
- Historical live tracking (this is today-only)
