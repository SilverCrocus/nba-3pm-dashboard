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
