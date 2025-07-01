/**
 * Team-related type definitions
 */

export interface TeamInfo {
  id: number | string;
  name: string;
  country: string;
  founded?: number;
  stadium?: string;
  logo?: string;
  shortName?: string;
  alternativeNames?: string[];
}

export interface TeamStatistics {
  // Basic stats
  totalMatches: number;
  completedMatches: number;
  wins: number;
  draws: number;
  losses: number;
  points: number;
  pointsPerGame: number;

  // Goals
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  averageGoalsFor: number;
  averageGoalsAgainst: number;
  goalsForPerMatch: number;
  goalsAgainstPerMatch: number;
  avgMatchGoals: number;

  // Home/Away breakdowns
  homeMatches?: number;
  homeWins?: number;
  homeDraws?: number;
  homeLosses?: number;
  homeGoalsFor?: number;
  homeGoalsAgainst?: number;
  homePointsPerGame?: number;
  
  awayMatches?: number;
  awayWins?: number;
  awayDraws?: number;
  awayLosses?: number;
  awayGoalsFor?: number;
  awayGoalsAgainst?: number;
  awayPointsPerGame?: number;

  // Percentages
  winPercentage: number;
  drawPercentage: number;
  lossPercentage: number;
  homeWinPercentage?: number;
  awayWinPercentage?: number;

  // Clean sheets & BTTS
  cleanSheets: number;
  cleanSheetPercentage: number;
  bothTeamsScoredPercentage: number;
  failedToScore: number;
  failedToScorePercentage: number;

  // Over/Under
  over15GoalsPercentage: number;
  over25GoalsPercentage: number;
  over35GoalsPercentage: number;
  over45GoalsPercentage: number;

  // xG stats
  xgFor?: number;
  xgAgainst?: number;
  xgForPerMatch?: number;
  xgAgainstPerMatch?: number;
  xgDifferencePerMatch?: number;

  // Form
  recentForm: string;
  homeForm?: string;
  awayForm?: string;

  // Additional stats
  [key: string]: any; // Allow for additional fields
}

export interface LeagueInfo {
  id: number | string;
  name: string;
  country: string;
  season: string;
  startDate?: string;
  endDate?: string;
  isCurrent?: boolean;
}

export interface LeaguePosition {
  position: number;
  totalTeams: number;
  group?: string;
  stage?: string;
}

export interface TeamMatch {
  id: string | number;
  date: string;
  homeTeam: string;
  awayTeam: string;
  homeID: string | number;
  awayID: string | number;
  score?: {
    home: number;
    away: number;
  };
  status: string;
  competition?: string;
  isHome?: boolean;
  result?: 'W' | 'D' | 'L';
}

export interface TeamData {
  teamInfo: TeamInfo;
  leagueInfo: LeagueInfo;
  leaguePosition?: LeaguePosition;
  statistics: TeamStatistics;
  matches?: TeamMatch[];
  lastUpdated?: Date;
}