export interface PaperTrade {
  signal_id: string;
  signal_date: string;
  player_name: string;
  player_id: string;
  prediction: number;
  line: number;
  side: 'over' | 'under';
  odds: number;
  edge_pct: number;
  model_prob: number;
  implied_prob: number;
  kelly_stake: number;
  bookmaker: string;
  strategy: string;
  team: string | null;
  actual: number | null;
  outcome: 'win' | 'loss' | 'push' | 'voided' | null;
  profit: number | null;
  closing_odds: number | null;
  closing_line: number | null;
  closing_odds_fanduel: number | null;
  closing_line_fanduel: number | null;
  screening_tier: string | null;
  screening_haiku_decision: string | null;
  adversarial_verdict: string | null;
  adversarial_confirm_count: number | null;
  adversarial_votes: Array<{ role: string; vote: string }> | null;
  scenario_prob_under: number | null;
  portfolio_stake: number | null;
  pipeline_cost_usd: number | null;
  debate_verdict: string | null;
  debate_confirm_count: number | null;
  debate_summary: string | null;
  created_at: string;
}

export interface PnLDataPoint {
  date: string;
  cumProfit: number;
  dayPnl?: number;
  wins?: number;
  losses?: number;
}

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
