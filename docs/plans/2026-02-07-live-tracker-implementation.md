# Live Tracker Page — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a `/live` page that shows today's signals alongside real-time NBA box score data, organized by game, with on/off court indicators and 10-second polling.

**Architecture:** Drop static export, add a Next.js API route (`/api/live-scores`) that proxies two NBA CDN endpoints (scoreboard + per-game boxscore), add a shared NavBar to the layout, and build a game-centric live tracker page using polling hooks.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, Supabase (read-only), NBA CDN Live Data API

**Design doc:** `docs/plans/2026-02-07-live-tracker-design.md`

**Worktree:** `.worktrees/feature-live-tracker` (branch `feature/live-tracker`)

**Important API discovery:** The NBA CDN live data endpoints (`cdn.nba.com/static/json/liveData/`) are preferable to `stats.nba.com` because they include `oncourt` status, require no special headers, and are not blocked from cloud servers. We use two CDN endpoints:
- Scoreboard: `https://cdn.nba.com/static/json/liveData/scoreboard/todaysScoreboard_00.json`
- Boxscore: `https://cdn.nba.com/static/json/liveData/boxscore/boxscore_{gameId}.json`

---

## Task 1: Config & Layout Changes

Remove static export and add the NavBar to the root layout.

**Files:**
- Modify: `next.config.ts`
- Modify: `src/app/layout.tsx`
- Create: `src/components/NavBar.tsx`

**Step 1: Remove static export from next.config.ts**

Open `next.config.ts`. Remove the `output: 'export'` line and the `images.unoptimized` setting (no longer needed without static export):

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {};

export default nextConfig;
```

**Step 2: Create NavBar component**

Create `src/components/NavBar.tsx`:

```tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function NavBar() {
  const pathname = usePathname();

  const links = [
    { href: '/', label: 'Dashboard' },
    { href: '/live', label: 'Live Tracker' },
  ];

  return (
    <nav className="sticky top-0 z-50 bg-[rgba(15,15,18,0.8)] backdrop-blur-md border-b border-white/[0.08]">
      <div className="max-w-6xl mx-auto px-4 md:px-8 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center text-sm">
            <span role="img" aria-label="basketball">&#127936;</span>
          </div>
          <span className="text-white font-semibold font-display text-sm">NBA 3PM</span>
        </div>
        <div className="flex gap-1">
          {links.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                pathname === href
                  ? 'bg-orange-500/20 text-orange-400'
                  : 'text-white/50 hover:text-white/80'
              }`}
            >
              {label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}
```

**Step 3: Add NavBar to layout.tsx**

Modify `src/app/layout.tsx` to import and render `NavBar` inside `<body>` above `{children}`:

```tsx
import type { Metadata } from "next";
import { DM_Sans, Space_Grotesk } from "next/font/google";
import { NavBar } from "@/components/NavBar";
import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
});

export const metadata: Metadata = {
  title: "NBA 3PM Model Dashboard",
  description: "Track bets and PnL for NBA 3-point predictions",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${dmSans.variable} ${spaceGrotesk.variable} font-sans antialiased`}>
        <NavBar />
        {children}
      </body>
    </html>
  );
}
```

**Step 4: Remove duplicate header from page.tsx**

The existing dashboard `page.tsx` has its own header block (the logo + title + subtitle from lines 27-40). With the NavBar now providing branding, remove the logo/title from `page.tsx` and replace it with a simpler section header. Modify the header section in `src/app/page.tsx`:

Replace the entire `{/* Header */}` div (lines 26-40) with:

```tsx
        {/* Header */}
        <div className="mb-6 md:mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-white font-display">Dashboard</h1>
          <p className="text-white/50 text-sm md:text-base">Track bets and maximize edge</p>
        </div>
```

**Step 5: Verify build**

Run: `npm run build` from the worktree directory.
Expected: Build succeeds (the `/live` route doesn't exist yet, that's fine).

**Step 6: Commit**

```bash
git add next.config.ts src/components/NavBar.tsx src/app/layout.tsx src/app/page.tsx
git commit -m "feat: add NavBar and remove static export for API route support"
```

---

## Task 2: Types & API Route

Add the shared types for live data and build the API proxy route.

**Files:**
- Modify: `src/types/database.ts` (add live data types)
- Create: `src/app/api/live-scores/route.ts`

**Step 1: Add live data types to database.ts**

Append the following to `src/types/database.ts`:

```typescript
// Live tracker types

export type GameStatus = 'scheduled' | 'live' | 'final';

export type SignalStatus = 'scheduled' | 'tracking' | 'hit' | 'miss' | 'push';

export interface LivePlayer {
  playerId: number;
  playerName: string;
  teamTricode: string;
  threePointersMade: number;
  isOnCourt: boolean;
  minutes: string;
}

export interface LiveGame {
  gameId: string;
  homeTeam: { tricode: string; score: number };
  awayTeam: { tricode: string; score: number };
  period: number;
  clock: string;
  status: GameStatus;
  startTimeUTC: string;
  players: LivePlayer[];
}

export interface LiveScoresResponse {
  games: LiveGame[];
  timestamp: string;
}

export interface EnrichedSignal extends PaperTrade {
  liveThreePointersMade: number | null;
  isOnCourt: boolean | null;
  minutesPlayed: string | null;
  signalStatus: SignalStatus;
}

export interface GameWithSignals {
  game: LiveGame;
  signals: EnrichedSignal[];
}
```

**Step 2: Create the API route**

Create `src/app/api/live-scores/route.ts`:

```typescript
import { NextResponse } from 'next/server';
import { LiveGame, LivePlayer, GameStatus } from '@/types/database';

const SCOREBOARD_URL = 'https://cdn.nba.com/static/json/liveData/scoreboard/todaysScoreboard_00.json';
const BOXSCORE_URL = (gameId: string) =>
  `https://cdn.nba.com/static/json/liveData/boxscore/boxscore_${gameId}.json`;

// In-memory cache
let cachedResponse: { data: { games: LiveGame[]; timestamp: string }; fetchedAt: number } | null = null;
const CACHE_TTL_MS = 10_000;

function parseGameClock(clock: string): string {
  // NBA CDN uses ISO 8601 duration: "PT05M42.00S" -> "5:42"
  if (!clock || clock === '') return '';
  const match = clock.match(/PT(\d+)M([\d.]+)S/);
  if (!match) return clock;
  const minutes = parseInt(match[1], 10);
  const seconds = Math.floor(parseFloat(match[2]));
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function parseMinutes(minutes: string): string {
  // "PT34M12.00S" -> "34:12"
  if (!minutes || minutes === '') return '0:00';
  const match = minutes.match(/PT(\d+)M([\d.]+)S/);
  if (!match) return minutes;
  const m = parseInt(match[1], 10);
  const s = Math.floor(parseFloat(match[2]));
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function mapGameStatus(statusNum: number): GameStatus {
  if (statusNum === 1) return 'scheduled';
  if (statusNum === 2) return 'live';
  return 'final'; // 3
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractPlayers(teamData: any): LivePlayer[] {
  if (!teamData?.players) return [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return teamData.players.map((p: any) => ({
    playerId: p.personId,
    playerName: `${p.firstName} ${p.familyName}`,
    teamTricode: teamData.teamTricode,
    threePointersMade: p.statistics?.threePointersMade ?? 0,
    isOnCourt: p.oncourt === '1',
    minutes: parseMinutes(p.statistics?.minutes ?? ''),
  }));
}

async function fetchLiveScores(): Promise<{ games: LiveGame[]; timestamp: string }> {
  // Fetch scoreboard
  const scoreboardRes = await fetch(SCOREBOARD_URL, { next: { revalidate: 0 } });
  if (!scoreboardRes.ok) {
    throw new Error(`Scoreboard fetch failed: ${scoreboardRes.status}`);
  }
  const scoreboardData = await scoreboardRes.json();
  const rawGames = scoreboardData?.scoreboard?.games ?? [];

  // Fetch boxscores for live and final games in parallel
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const games: LiveGame[] = await Promise.all(rawGames.map(async (g: any) => {
    const status = mapGameStatus(g.gameStatus);
    let players: LivePlayer[] = [];

    if (status !== 'scheduled') {
      try {
        const boxRes = await fetch(BOXSCORE_URL(g.gameId), { next: { revalidate: 0 } });
        if (boxRes.ok) {
          const boxData = await boxRes.json();
          const home = boxData?.game?.homeTeam;
          const away = boxData?.game?.awayTeam;
          players = [...extractPlayers(home), ...extractPlayers(away)];
        }
      } catch {
        // If boxscore fetch fails, continue with empty players
      }
    }

    return {
      gameId: g.gameId,
      homeTeam: { tricode: g.homeTeam?.teamTricode ?? '', score: g.homeTeam?.score ?? 0 },
      awayTeam: { tricode: g.awayTeam?.teamTricode ?? '', score: g.awayTeam?.score ?? 0 },
      period: g.period ?? 0,
      clock: parseGameClock(g.gameClock ?? ''),
      status,
      startTimeUTC: g.gameTimeUTC ?? '',
      players,
    };
  }));

  return { games, timestamp: new Date().toISOString() };
}

export async function GET() {
  try {
    const now = Date.now();

    if (cachedResponse && (now - cachedResponse.fetchedAt) < CACHE_TTL_MS) {
      return NextResponse.json(cachedResponse.data);
    }

    const data = await fetchLiveScores();
    cachedResponse = { data, fetchedAt: now };

    return NextResponse.json(data);
  } catch (error) {
    console.error('Live scores fetch error:', error);
    // Return cached data if available, even if stale
    if (cachedResponse) {
      return NextResponse.json(cachedResponse.data);
    }
    return NextResponse.json({ games: [], timestamp: new Date().toISOString() }, { status: 502 });
  }
}
```

**Step 3: Verify the API route builds**

Run: `npm run build`
Expected: Build succeeds. The `/api/live-scores` route should appear in the build output.

**Step 4: Commit**

```bash
git add src/types/database.ts src/app/api/live-scores/route.ts
git commit -m "feat: add live scores API proxy route and live data types"
```

---

## Task 3: Client-Side Hooks

Build the polling hook and the signal-matching logic.

**Files:**
- Create: `src/hooks/useLiveScores.ts`

**Step 1: Create useLiveScores.ts**

Create `src/hooks/useLiveScores.ts`:

```typescript
'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  LiveGame,
  LiveScoresResponse,
  PaperTrade,
  EnrichedSignal,
  GameWithSignals,
  SignalStatus,
  GameStatus,
} from '@/types/database';

const POLL_INTERVAL_MS = 10_000;

export function useLiveScores() {
  const [games, setGames] = useState<LiveGame[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const fetchScores = useCallback(async () => {
    try {
      const res = await fetch('/api/live-scores');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: LiveScoresResponse = await res.json();
      setGames(data.games);
      setLastUpdated(new Date(data.timestamp));
      setIsConnected(true);
    } catch {
      setIsConnected(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchScores();

    const interval = setInterval(() => {
      // Stop polling if all games are final or there are no games
      const allDone = games.length > 0 && games.every(g => g.status === 'final');
      if (!allDone) {
        fetchScores();
      }
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [fetchScores, games]);

  return { games, isLoading, lastUpdated, isConnected };
}

function deriveSignalStatus(gameStatus: GameStatus, side: 'over' | 'under', line: number, fg3m: number): SignalStatus {
  if (gameStatus === 'scheduled') return 'scheduled';
  if (gameStatus === 'live') return 'tracking';

  // Game is final — determine outcome
  if (side === 'over') {
    if (fg3m > line) return 'hit';
    if (fg3m < line) return 'miss';
    return 'push'; // fg3m === line (e.g., 3 vs 3.0 — though lines are usually .5)
  } else {
    // under
    if (fg3m < line) return 'hit';
    if (fg3m > line) return 'miss';
    return 'push';
  }
}

export function useLiveSignals(signals: PaperTrade[], games: LiveGame[]): GameWithSignals[] {
  return useMemo(() => {
    if (games.length === 0 || signals.length === 0) return [];

    // Build a lookup: playerId -> LiveGame + LivePlayer
    const playerGameMap = new Map<number, { game: LiveGame; player: typeof games[0]['players'][0] }>();
    for (const game of games) {
      for (const player of game.players) {
        playerGameMap.set(player.playerId, { game, player });
      }
    }

    // Also build a lookup by team tricode -> game for scheduled games (no players yet)
    const teamGameMap = new Map<string, LiveGame>();
    for (const game of games) {
      teamGameMap.set(game.homeTeam.tricode, game);
      teamGameMap.set(game.awayTeam.tricode, game);
    }

    // Group signals by game
    const gameSignalsMap = new Map<string, { game: LiveGame; signals: EnrichedSignal[] }>();

    for (const signal of signals) {
      const playerId = parseInt(signal.player_id, 10);
      const match = playerGameMap.get(playerId);

      let game: LiveGame | undefined;
      let enriched: EnrichedSignal;

      if (match) {
        game = match.game;
        const p = match.player;
        enriched = {
          ...signal,
          liveThreePointersMade: p.threePointersMade,
          isOnCourt: p.isOnCourt,
          minutesPlayed: p.minutes,
          signalStatus: deriveSignalStatus(game.status, signal.side, signal.line, p.threePointersMade),
        };
      } else {
        // Try matching by team for scheduled games
        game = signal.team ? teamGameMap.get(signal.team) : undefined;
        enriched = {
          ...signal,
          liveThreePointersMade: null,
          isOnCourt: null,
          minutesPlayed: null,
          signalStatus: game ? (game.status === 'scheduled' ? 'scheduled' : 'tracking') : 'scheduled',
        };
      }

      if (game) {
        const key = game.gameId;
        if (!gameSignalsMap.has(key)) {
          gameSignalsMap.set(key, { game, signals: [] });
        }
        gameSignalsMap.get(key)!.signals.push(enriched);
      }
    }

    // Sort: live games first, then scheduled, then final
    const statusOrder: Record<GameStatus, number> = { live: 0, scheduled: 1, final: 2 };
    return Array.from(gameSignalsMap.values())
      .sort((a, b) => statusOrder[a.game.status] - statusOrder[b.game.status]);
  }, [signals, games]);
}
```

**Step 2: Verify build**

Run: `npm run build`
Expected: Build succeeds. The hook file is not imported yet so it won't affect runtime, but TypeScript should compile it.

**Step 3: Commit**

```bash
git add src/hooks/useLiveScores.ts
git commit -m "feat: add useLiveScores polling hook and useLiveSignals matching logic"
```

---

## Task 4: LiveStatusBadge & CourtStatus Components

Small reusable components used by the GameCard.

**Files:**
- Create: `src/components/LiveStatusBadge.tsx`
- Create: `src/components/CourtStatus.tsx`

**Step 1: Create LiveStatusBadge**

Create `src/components/LiveStatusBadge.tsx`:

```tsx
import { GameStatus, SignalStatus } from '@/types/database';

type BadgeType = GameStatus | SignalStatus;

const config: Record<BadgeType, { label: string; bg: string; text: string; pulse?: boolean }> = {
  live: { label: 'LIVE', bg: 'bg-green-500/20', text: 'text-green-400', pulse: true },
  scheduled: { label: 'SCHEDULED', bg: 'bg-orange-500/20', text: 'text-orange-400' },
  final: { label: 'FINAL', bg: 'bg-white/10', text: 'text-white/50' },
  tracking: { label: 'TRACKING', bg: 'bg-green-500/20', text: 'text-green-400', pulse: true },
  hit: { label: 'HIT', bg: 'bg-green-500/20', text: 'text-green-400' },
  miss: { label: 'MISS', bg: 'bg-red-500/20', text: 'text-red-400' },
  push: { label: 'PUSH', bg: 'bg-white/10', text: 'text-white/50' },
};

export function LiveStatusBadge({ status }: { status: BadgeType }) {
  const { label, bg, text, pulse } = config[status];

  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${bg} ${text}`}>
      {pulse && (
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-green-400" />
        </span>
      )}
      {label}
    </span>
  );
}
```

**Step 2: Create CourtStatus**

Create `src/components/CourtStatus.tsx`:

```tsx
interface CourtStatusProps {
  isOnCourt: boolean | null;
  minutes: string | null;
}

export function CourtStatus({ isOnCourt, minutes }: CourtStatusProps) {
  if (isOnCourt === null) {
    return <span className="text-xs text-white/30">—</span>;
  }

  return (
    <span className="inline-flex items-center gap-1.5 group relative">
      <span
        className={`inline-block h-2 w-2 rounded-full ${
          isOnCourt ? 'bg-green-400' : 'bg-white/30'
        }`}
      />
      <span className={`text-xs ${isOnCourt ? 'text-green-400' : 'text-white/40'}`}>
        {isOnCourt ? 'On' : 'Off'}
      </span>
      {minutes && (
        <span className="absolute -top-7 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded bg-[rgba(20,20,25,0.95)] text-[10px] text-white/70 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
          {minutes} min
        </span>
      )}
    </span>
  );
}
```

**Step 3: Commit**

```bash
git add src/components/LiveStatusBadge.tsx src/components/CourtStatus.tsx
git commit -m "feat: add LiveStatusBadge and CourtStatus components"
```

---

## Task 5: GameCard Component

The main card that renders a single game with its signals.

**Files:**
- Create: `src/components/GameCard.tsx`

**Step 1: Create GameCard**

Create `src/components/GameCard.tsx`:

```tsx
import { GameWithSignals } from '@/types/database';
import { LiveStatusBadge } from './LiveStatusBadge';
import { CourtStatus } from './CourtStatus';

function formatStartTime(utc: string): string {
  if (!utc) return '';
  const date = new Date(utc);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'America/New_York',
  }) + ' ET';
}

function formatPeriod(period: number): string {
  if (period <= 4) return `Q${period}`;
  return `OT${period - 4}`;
}

export function GameCard({ game, signals }: GameWithSignals) {
  const isScheduled = game.status === 'scheduled';

  return (
    <div className="bg-[rgba(38,38,45,0.6)] backdrop-blur-md border border-white/[0.08] rounded-2xl md:rounded-3xl overflow-hidden">
      {/* Game Header */}
      <div className="px-4 md:px-6 py-3 md:py-4 border-b border-white/[0.06] flex items-center justify-between">
        <div className="flex items-center gap-3 md:gap-4">
          <div className="flex items-center gap-2 md:gap-3">
            <span className="text-white font-semibold font-display text-sm md:text-base">{game.awayTeam.tricode}</span>
            {!isScheduled && (
              <span className="text-white/70 font-mono text-sm md:text-base">{game.awayTeam.score}</span>
            )}
          </div>
          <span className="text-white/30 text-xs">@</span>
          <div className="flex items-center gap-2 md:gap-3">
            <span className="text-white font-semibold font-display text-sm md:text-base">{game.homeTeam.tricode}</span>
            {!isScheduled && (
              <span className="text-white/70 font-mono text-sm md:text-base">{game.homeTeam.score}</span>
            )}
          </div>
          {game.status === 'live' && game.clock && (
            <span className="text-white/40 text-xs font-mono ml-1">
              {formatPeriod(game.period)} {game.clock}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isScheduled && (
            <span className="text-white/40 text-xs">{formatStartTime(game.startTimeUTC)}</span>
          )}
          <LiveStatusBadge status={game.status} />
        </div>
      </div>

      {/* Signal Rows - Mobile */}
      <div className="md:hidden p-3 space-y-2">
        {signals.map((s) => (
          <div key={s.signal_id} className="bg-white/5 rounded-xl p-3">
            <div className="flex justify-between items-start mb-1.5">
              <div>
                <p className="font-medium text-white text-sm">{s.player_name}</p>
                <p className="text-xs text-white/40">{s.side.toUpperCase()} {s.line}</p>
              </div>
              <LiveStatusBadge status={s.signalStatus} />
            </div>
            <div className="flex justify-between items-center text-xs">
              <div className="flex items-center gap-3">
                {s.liveThreePointersMade !== null && (
                  <span className="text-white font-mono">
                    <span className="text-white/40">3PM: </span>
                    <span className="text-lg font-bold">{s.liveThreePointersMade}</span>
                  </span>
                )}
                <CourtStatus isOnCourt={s.isOnCourt} minutes={s.minutesPlayed} />
              </div>
              <span className="text-green-400 font-medium">+{s.edge_pct.toFixed(1)}%</span>
            </div>
          </div>
        ))}
      </div>

      {/* Signal Rows - Desktop Table */}
      <table className="w-full hidden md:table">
        <thead>
          <tr className="text-white/40 text-xs uppercase tracking-wider border-b border-white/[0.06]">
            <th className="text-left px-6 py-2.5">Player</th>
            <th className="text-center px-3 py-2.5">3PM</th>
            <th className="text-center px-3 py-2.5">Line</th>
            <th className="text-center px-3 py-2.5">Side</th>
            <th className="text-center px-3 py-2.5">Edge</th>
            <th className="text-center px-3 py-2.5">Court</th>
            <th className="text-right px-6 py-2.5">Status</th>
          </tr>
        </thead>
        <tbody>
          {signals.map((s) => (
            <tr key={s.signal_id} className="border-b border-white/[0.04]">
              <td className="px-6 py-3">
                <p className="font-medium text-white">{s.player_name}</p>
              </td>
              <td className="px-3 py-3 text-center">
                {s.liveThreePointersMade !== null ? (
                  <span className="text-white font-mono text-lg font-bold">{s.liveThreePointersMade}</span>
                ) : (
                  <span className="text-white/30">—</span>
                )}
              </td>
              <td className="px-3 py-3 text-center text-white/70 font-mono">{s.line}</td>
              <td className="px-3 py-3 text-center">
                <span className={`text-xs font-medium ${s.side === 'over' ? 'text-green-400' : 'text-red-400'}`}>
                  {s.side.toUpperCase()}
                </span>
              </td>
              <td className="px-3 py-3 text-center text-green-400 font-medium text-sm">+{s.edge_pct.toFixed(1)}%</td>
              <td className="px-3 py-3 text-center">
                <CourtStatus isOnCourt={s.isOnCourt} minutes={s.minutesPlayed} />
              </td>
              <td className="px-6 py-3 text-right">
                <LiveStatusBadge status={s.signalStatus} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/GameCard.tsx
git commit -m "feat: add GameCard component with game header and signal rows"
```

---

## Task 6: LiveHeader Component

The page header showing title, date, polling status, and refresh countdown.

**Files:**
- Create: `src/components/LiveHeader.tsx`

**Step 1: Create LiveHeader**

Create `src/components/LiveHeader.tsx`:

```tsx
'use client';

import { useEffect, useState } from 'react';

interface LiveHeaderProps {
  lastUpdated: Date | null;
  isConnected: boolean;
  isLoading: boolean;
  hasActiveGames: boolean;
}

export function LiveHeader({ lastUpdated, isConnected, isLoading, hasActiveGames }: LiveHeaderProps) {
  const [secondsAgo, setSecondsAgo] = useState(0);

  useEffect(() => {
    if (!lastUpdated) return;
    setSecondsAgo(0);
    const interval = setInterval(() => {
      setSecondsAgo(Math.floor((Date.now() - lastUpdated.getTime()) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [lastUpdated]);

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    timeZone: 'America/New_York',
  });

  return (
    <div className="mb-6 md:mb-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white font-display">Live Tracker</h1>
          <p className="text-white/50 text-sm md:text-base">{today}</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Connection status */}
          <div className="flex items-center gap-1.5">
            <span
              className={`inline-block h-2 w-2 rounded-full ${
                !isConnected ? 'bg-red-400' :
                hasActiveGames ? 'bg-green-400' : 'bg-white/30'
              }`}
            />
            <span className="text-xs text-white/40">
              {isLoading ? 'Loading...' :
               !isConnected ? 'Disconnected' :
               hasActiveGames ? 'Live' : 'No active games'}
            </span>
          </div>
          {/* Refresh countdown */}
          {isConnected && hasActiveGames && (
            <span className="text-xs text-white/30 font-mono tabular-nums">
              {secondsAgo}s ago
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/LiveHeader.tsx
git commit -m "feat: add LiveHeader component with polling status indicator"
```

---

## Task 7: Live Page

Wire everything together in the `/live` route.

**Files:**
- Create: `src/app/live/page.tsx`

**Step 1: Create the live page**

Create `src/app/live/page.tsx`:

```tsx
'use client';

import { useTodaysSignals } from '@/hooks/useTrades';
import { useLiveScores, useLiveSignals } from '@/hooks/useLiveScores';
import { LiveHeader } from '@/components/LiveHeader';
import { GameCard } from '@/components/GameCard';

export default function LiveTracker() {
  const { signals, loading: signalsLoading } = useTodaysSignals();
  const { games, isLoading: scoresLoading, lastUpdated, isConnected } = useLiveScores();
  const gamesWithSignals = useLiveSignals(signals, games);

  const isLoading = signalsLoading || scoresLoading;
  const hasActiveGames = games.some(g => g.status === 'live');

  return (
    <div className="min-h-screen">
      <main className="p-4 md:p-8 max-w-6xl mx-auto">
        <LiveHeader
          lastUpdated={lastUpdated}
          isConnected={isConnected}
          isLoading={isLoading}
          hasActiveGames={hasActiveGames}
        />

        {isLoading ? (
          <div className="text-white/50 text-center py-20">Loading live data...</div>
        ) : gamesWithSignals.length === 0 ? (
          <div className="bg-[rgba(38,38,45,0.6)] backdrop-blur-md border border-white/[0.08] rounded-2xl md:rounded-3xl p-8 md:p-12 text-center">
            <p className="text-white/50 text-lg">No games with signals today</p>
            <p className="text-white/30 text-sm mt-2">Check back when today&apos;s signals are posted</p>
          </div>
        ) : (
          <div className="space-y-4 md:space-y-6">
            {gamesWithSignals.map(({ game, signals }) => (
              <GameCard key={game.gameId} game={game} signals={signals} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
```

**Step 2: Verify full build**

Run: `npm run build`
Expected: Build succeeds with both `/` and `/live` routes visible in the output.

**Step 3: Manual smoke test**

Run: `npm run dev`
- Visit `http://localhost:3000` — existing dashboard should work with the new NavBar
- Visit `http://localhost:3000/live` — live tracker page should render (will show "No games with signals today" if no NBA games are active, or show game cards if games are on)
- NavBar should highlight the active link on each page
- Click between Dashboard and Live Tracker — client-side navigation should work

**Step 4: Commit**

```bash
git add src/app/live/page.tsx
git commit -m "feat: add live tracker page with game cards and polling"
```

---

## Task 8: Final Polish & Verification

Run the full build one more time, verify no lint errors, and confirm everything works.

**Step 1: Run lint**

Run: `npm run lint`
Expected: No errors (warnings are acceptable).

**Step 2: Run build**

Run: `npm run build`
Expected: Clean build with `/`, `/live`, and `/api/live-scores` routes.

**Step 3: Fix any issues**

If lint or build fails, fix the issues.

**Step 4: Final commit (if any fixes were needed)**

```bash
git add -A
git commit -m "fix: address lint and build issues"
```
