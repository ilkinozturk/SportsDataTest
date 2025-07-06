// Shared types for the application

export interface League {
  id: number;
  name: string;
  country: string;
  season: string;
  logo?: string;
}

export interface Team {
  id: number;
  name: string;
  logo?: string;
  founded?: number;
  country: string;
}

export interface Match {
  id: string;
  homeTeam: Team;
  awayTeam: Team;
  league: League;
  date: string;
  status: 'scheduled' | 'live' | 'finished' | 'postponed';
  homeScore?: number;
  awayScore?: number;
  round?: string;
  venue?: string;
}

export interface MatchStats {
  matchId: string;
  homeTeamStats: TeamMatchStats;
  awayTeamStats: TeamMatchStats;
  generalStats: GeneralMatchStats;
}

export interface TeamMatchStats {
  goals: number;
  shots: number;
  shotsOnTarget: number;
  possession: number;
  corners: number;
  fouls: number;
  yellowCards: number;
  redCards: number;
  offsides: number;
}

export interface GeneralMatchStats {
  totalGoals: number;
  halfTimeScore: {
    home: number;
    away: number;
  };
  btts: boolean; // Both teams to score
  over25: boolean;
  over35: boolean;
}

export interface TeamForm {
  teamId: number;
  matches: FormMatch[];
  winRate: number;
  drawRate: number;
  lossRate: number;
  averageGoalsScored: number;
  averageGoalsConceded: number;
  cleanSheetRate: number;
  bttsRate: number;
  over25Rate: number;
}

export interface FormMatch {
  matchId: string;
  opponent: Team;
  result: 'W' | 'D' | 'L';
  goalsFor: number;
  goalsAgainst: number;
  date: string;
  homeAway: 'home' | 'away';
}

export interface Prediction {
  matchId: string;
  match: Match;
  predictions: {
    result: ResultPrediction;
    goals: GoalsPrediction;
    specialBets: SpecialBetsPrediction;
  };
  confidence: number;
  algorithms: AlgorithmResult[];
  createdAt: string;
}

export interface ResultPrediction {
  homeWin: number;
  draw: number;
  awayWin: number;
  mostLikely: 'home' | 'draw' | 'away';
}

export interface GoalsPrediction {
  over25: number;
  under25: number;
  over35: number;
  under35: number;
  btts: number;
  noBtts: number;
  totalGoals: number;
}

export interface SpecialBetsPrediction {
  homeCleanSheet: number;
  awayCleanSheet: number;
  homeWinToNil: number;
  awayWinToNil: number;
  correctScore: CorrectScorePrediction[];
}

export interface CorrectScorePrediction {
  homeScore: number;
  awayScore: number;
  probability: number;
}

export interface AlgorithmResult {
  name: string;
  weight: number;
  result: any;
  confidence: number;
}

export interface LeagueStats {
  leagueId: number;
  season: string;
  averageGoalsPerGame: number;
  homeWinRate: number;
  awayWinRate: number;
  drawRate: number;
  bttsRate: number;
  over25Rate: number;
  over35Rate: number;
  cleanSheetRate: number;
}

export interface PredictionRequest {
  matchId?: string;
  homeTeamId: number;
  awayTeamId: number;
  leagueId: number;
  date: string;
  venue?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface CacheItem<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

export interface FootyStatsApiResponse {
  success: boolean;
  data: any;
  paging?: {
    current_page: number;
    total_pages: number;
    total_entries: number;
  };
}

export interface AnalysisConfig {
  formMatchesLimit: number;
  historicalMatchesLimit: number;
  confidenceThreshold: number;
  algorithms: {
    form: { enabled: boolean; weight: number };
    headToHead: { enabled: boolean; weight: number };
    homeAdvantage: { enabled: boolean; weight: number };
    goalTrends: { enabled: boolean; weight: number };
    leaguePosition: { enabled: boolean; weight: number };
    recentPerformance: { enabled: boolean; weight: number };
  };
}
