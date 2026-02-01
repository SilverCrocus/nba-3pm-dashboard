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
  outcome: 'win' | 'loss' | 'push' | null;
  profit: number | null;
  created_at: string;
}

export interface DailyStats {
  date: string;
  bets: number;
  wins: number;
  losses: number;
  profit: number;
  cumulative_profit: number;
}
