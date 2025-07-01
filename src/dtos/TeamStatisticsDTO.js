/**
 * Data Transfer Object for Team Statistics
 * Maps and sanitizes raw API data for client consumption
 */

class TeamStatisticsDTO {
  constructor(rawData) {
    // Handle empty or invalid data
    if (!rawData) {
      this.teamInfo = null;
      this.statistics = null;
      this.leaguePosition = null;
      return;
    }

    // Map the data while preserving the original structure
    this.teamInfo = this.mapTeamInfo(rawData.teamInfo || rawData.team);
    this.statistics = this.mapStatistics(rawData.statistics || rawData.stats);
    this.leaguePosition = rawData.leaguePosition || rawData.position || null;
    
    // Include any additional data that might be present
    if (rawData.recentMatches) {
      this.recentMatches = rawData.recentMatches;
    }
    if (rawData.upcomingMatches) {
      this.upcomingMatches = rawData.upcomingMatches;
    }
    
    // Remove sensitive data
    this.removeApiKeys();
  }

  mapTeamInfo(info) {
    if (!info) return null;
    
    return {
      id: info.id || info.team_id,
      name: info.name || info.team_name,
      logo: info.image || info.logo || info.badge_url,
      season: info.season || info.current_season,
      league: info.league || info.league_name,
      country: info.country
    };
  }

  mapStatistics(stats) {
    if (!stats) return null;
    
    // Preserve all existing statistics while organizing them
    return {
      // Summary statistics
      summary: {
        totalMatches: stats.totalMatches || stats.matches || stats.completedMatches || 0,
        wins: stats.wins || 0,
        draws: stats.draws || 0,
        losses: stats.losses || 0,
        goalsFor: stats.goalsFor || stats.goals_for || 0,
        goalsAgainst: stats.goalsAgainst || stats.goals_against || 0,
        goalDifference: stats.goalDifference || stats.goal_difference || 0,
        points: stats.points || 0,
        pointsPerGame: stats.pointsPerGame || stats.ppg || 0,
        winPercentage: stats.winPercentage || stats.win_percentage || 0
      },
      
      // Home statistics
      home: {
        matches: stats.homeMatches || stats.home_matches || 0,
        wins: stats.homeWins || stats.home_wins || 0,
        draws: stats.homeDraws || stats.home_draws || 0,
        losses: stats.homeLosses || stats.home_losses || 0,
        goalsFor: stats.homeGoalsFor || stats.home_goals_for || 0,
        goalsAgainst: stats.homeGoalsAgainst || stats.home_goals_against || 0,
        pointsPerGame: stats.homePointsPerGame || stats.home_ppg || 0
      },
      
      // Away statistics
      away: {
        matches: stats.awayMatches || stats.away_matches || 0,
        wins: stats.awayWins || stats.away_wins || 0,
        draws: stats.awayDraws || stats.away_draws || 0,
        losses: stats.awayLosses || stats.away_losses || 0,
        goalsFor: stats.awayGoalsFor || stats.away_goals_for || 0,
        goalsAgainst: stats.awayGoalsAgainst || stats.away_goals_against || 0,
        pointsPerGame: stats.awayPointsPerGame || stats.away_ppg || 0
      },
      
      // Goals statistics
      goals: {
        scored: {
          total: stats.goalsFor || stats.goals_for || 0,
          home: stats.homeGoalsFor || stats.home_goals_for || 0,
          away: stats.awayGoalsFor || stats.away_goals_for || 0,
          average: stats.goalsForAverage || stats.goals_for_avg || 0
        },
        conceded: {
          total: stats.goalsAgainst || stats.goals_against || 0,
          home: stats.homeGoalsAgainst || stats.home_goals_against || 0,
          away: stats.awayGoalsAgainst || stats.away_goals_against || 0,
          average: stats.goalsAgainstAverage || stats.goals_against_avg || 0
        }
      },
      
      // Cards statistics (if available)
      cards: stats.cards || stats.cardsData || {
        yellow: stats.yellowCards || stats.yellow_cards || 0,
        red: stats.redCards || stats.red_cards || 0,
        total: stats.totalCards || stats.total_cards || 0
      },
      
      // Corners statistics (if available)
      corners: stats.corners || stats.cornersData || {
        for: stats.cornersFor || stats.corners_for || 0,
        against: stats.cornersAgainst || stats.corners_against || 0,
        total: stats.cornersTotal || stats.corners_total || 0
      },
      
      // Preserve all other statistics in a detailed object
      // This ensures we don't lose any data that the frontend might need
      detailed: {
        ...stats
      }
    };
  }

  removeApiKeys() {
    // Remove sensitive information
    delete this.apiKey;
    delete this.api_key;
    delete this.internalId;
    delete this._id;
    delete this.__v;
    delete this.createdAt;
    delete this.updatedAt;
    
    // Remove from nested objects
    if (this.statistics && this.statistics.detailed) {
      delete this.statistics.detailed.apiKey;
      delete this.statistics.detailed.api_key;
      delete this.statistics.detailed._id;
      delete this.statistics.detailed.__v;
    }
  }

  static fromRawData(rawData) {
    return new TeamStatisticsDTO(rawData);
  }

  static fromArray(rawDataArray) {
    if (!Array.isArray(rawDataArray)) {
      return [];
    }
    return rawDataArray.map(data => new TeamStatisticsDTO(data));
  }

  // Method to check if the DTO has valid data
  hasValidData() {
    return this.teamInfo !== null && this.statistics !== null;
  }
}

module.exports = TeamStatisticsDTO;