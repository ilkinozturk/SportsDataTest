// API Response Type Definitions

// Team Info Types
export interface TeamInfo {
  id: number;
  name: string;
  fullName?: string;
  englishName?: string;
  image?: string;
  country?: string;
  founded?: number;
  stadium?: string;
  capacity?: number;
  manager?: string;
  website?: string;
  aliases?: string[];
}

// Season Info Types
export interface SeasonInfo {
  id: number;
  name: string;
  year?: string;
  start_date?: string;
  end_date?: string;
}

// Statistics Types
export interface TeamStatistics {
  // Basic stats
  goalsScored?: number;
  goalsScored_overall?: number;
  goalsScored_home?: number;
  goalsScored_away?: number;

  goalsConceded?: number;
  goalsConceded_overall?: number;
  goalsConceded_home?: number;
  goalsConceded_away?: number;

  // Match stats
  matchesPlayed?: number;
  matchesPlayed_overall?: number;
  matchesPlayed_home?: number;
  matchesPlayed_away?: number;

  wins?: number;
  wins_overall?: number;
  wins_home?: number;
  wins_away?: number;

  draws?: number;
  draws_overall?: number;
  draws_home?: number;
  draws_away?: number;

  losses?: number;
  losses_overall?: number;
  losses_home?: number;
  losses_away?: number;

  // Cards stats
  cardsTotal?: number;
  cardsTotal_overall?: number;
  cardsTotal_home?: number;
  cardsTotal_away?: number;

  cardsFor?: number;
  cardsAgainst?: number;
  cardsForPerMatch?: number;
  cardsAgainstPerMatch?: number;

  // Cards percentages
  over05CardsPercentage?: number;
  over15CardsPercentage?: number;
  over25CardsPercentage?: number;
  over35CardsPercentage?: number;
  over45CardsPercentage?: number;

  // Corners stats
  cornersTotal?: number;
  cornersTotal_overall?: number;
  cornersFor?: number;
  cornersAgainst?: number;

  // Additional fields
  [key: string]: any;
}

// Match Types
export interface Match {
  id: number;
  homeID: number;
  awayID: number;
  home_name: string;
  away_name: string;
  score?: string;
  homeGoalCount?: number;
  awayGoalCount?: number;
  status?: string;
  date_unix?: number;
  competition_id?: number;
  season?: number;
}

// API Response Types
export interface TeamDataResponse {
  success: boolean;
  data?: {
    teamInfo: TeamInfo;
    seasonInfo?: SeasonInfo;
    statistics: TeamStatistics;
    matches?: Match[];
    position?: {
      current: number;
      total: number;
      points?: number;
      goalDifference?: number;
    };
  };
  error?: string;
}

export interface LeagueTeamsResponse {
  success: boolean;
  data?: Array<{
    id: number;
    name: string;
    english_name?: string;
    image?: string;
    stats?: TeamStatistics & {
      additional_info?: {
        cards_for?: number;
        cards_against?: number;
        cards_for_avg?: number;
        cards_against_avg?: number;
        [key: string]: any;
      };
    };
  }>;
  error?: string;
}

export interface ErrorResponse {
  success: false;
  error: {
    message: string;
    code?: string;
    stack?: string;
  };
}

// FootyStats API specific types
export interface FootyStatsApiResponse<T> {
  success: boolean;
  data: T;
  meta?: {
    count?: number;
    total?: number;
    page?: number;
    pages?: number;
  };
}

export interface ApiRequestOptions {
  params?: Record<string, any>;
  timeout?: number;
  headers?: Record<string, string>;
  retryCount?: number;
  cacheKey?: string;
  cacheTTL?: number;
}

export interface CacheOptions {
  ttl?: number;
  key?: string;
  tags?: string[];
  priority?: 'high' | 'medium' | 'low';
}

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: Date;
  retryAfter?: number;
}
