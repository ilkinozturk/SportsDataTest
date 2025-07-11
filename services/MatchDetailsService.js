const axios = require('axios');
const Logger = require('../utils/logger');

/**
 * Service for fetching detailed match information including goal scorers and timings
 */
class MatchDetailsService {
  constructor(apiKey, baseUrl) {
    this.logger = new Logger('MatchDetailsService');
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
    this.cache = new Map();
    this.CACHE_TTL = 30 * 60 * 1000; // 30 minutes
  }

  /**
   * Get detailed match information including goal scorers
   * @param {number} matchId - The match ID
   * @returns {Object|null} Match details or null if not found
   */
  async getMatchDetails(matchId) {
    // Check cache first
    const cacheKey = `match_${matchId}`;
    const cached = this.getCached(cacheKey);
    if (cached) {
      this.logger.info(`💾 Match details cache hit for ID: ${matchId}`);
      return cached;
    }

    try {
      this.logger.info(`🌐 Fetching match details for ID: ${matchId}`);

      const response = await axios.get(`${this.baseUrl}/match`, {
        params: {
          key: this.apiKey,
          match_id: matchId,
        },
        timeout: 10000,
      });

      if (response.data.success && response.data.data) {
        const match = response.data.data;

        // Process and structure the data
        const details = {
          id: match.id,
          status: match.status || 'unknown',
          date: match.date_unix ? new Date(match.date_unix * 1000).toISOString() : match.date,
          homeTeam: {
            id: match.homeID,
            name: match.home_name,
            logo: match.home_image || match.homeImage || `teams/t${match.homeID}.png`,
            goals: match.homeGoalCount,
            homeForm: match.home_form || match.homeForm || null,
            homePPG: match.home_ppg || match.homePPG || match.homePointsPerGame || null,
            goalDetails: this.processGoalDetails(
              match.team_a_goal_details,
              match.lineups?.team_a,
              match.bench?.team_a
            ),
          },
          awayTeam: {
            id: match.awayID,
            name: match.away_name,
            logo: match.away_image || match.awayImage || `teams/t${match.awayID}.png`,
            goals: match.awayGoalCount,
            awayForm: match.away_form || match.awayForm || null,
            awayPPG: match.away_ppg || match.awayPPG || match.awayPointsPerGame || null,
            goalDetails: this.processGoalDetails(
              match.team_b_goal_details,
              match.lineups?.team_b,
              match.bench?.team_b
            ),
          },
          goalTimings: {
            home: match.homeGoals_timings || [],
            away: match.awayGoals_timings || [],
          },
          halfTime: {
            home: match.ht_goals_team_a,
            away: match.ht_goals_team_b,
          },
          stats: {
            possession: {
              home: match.team_a_possession,
              away: match.team_b_possession,
            },
            corners: {
              home: match.team_a_corners,
              away: match.team_b_corners,
            },
            cards: {
              home: {
                yellow: match.team_a_yellow_cards,
                red: match.team_a_red_cards,
                total: match.team_a_cards_num,
              },
              away: {
                yellow: match.team_b_yellow_cards,
                red: match.team_b_red_cards,
                total: match.team_b_cards_num,
              },
            },
            shots: {
              home: {
                total: match.team_a_shots,
                onTarget: match.team_a_shotsOnTarget,
                offTarget: match.team_a_shotsOffTarget,
              },
              away: {
                total: match.team_b_shots,
                onTarget: match.team_b_shotsOnTarget,
                offTarget: match.team_b_shotsOffTarget,
              },
            },
            fouls: {
              home: match.team_a_fouls,
              away: match.team_b_fouls,
            },
            offsides: {
              home: match.team_a_offsides,
              away: match.team_b_offsides,
            },
            xg: {
              home: match.team_a_xg,
              away: match.team_b_xg,
            },
          },
          stadium: match.stadium_name,
          referee: match.refereeID,
          attendance: match.attendance,
          weather: match.weather,
          league: {
            id: match.competition_id || match.league_id,
            name: match.competition_name || match.league_name || 'Unknown League',
            logo: match.competition_logo || match.league_logo || `leagues/l${match.competition_id || match.league_id}.png`
          },
          h2h: match.h2h || null,
          trends: match.trends || null,
          lineups: match.lineups || null,
          bench: match.bench || null,
        };

        // Cache the result
        this.setCached(cacheKey, details);

        this.logger.info(`✅ Match details fetched successfully`);
        return details;
      }

      this.logger.info(`⚠️ No match details found for ID: ${matchId}`);
      return null;
    } catch (error) {
      this.logger.error(`❌ Error fetching match details: ${error.message}`);
      return null;
    }
  }

  /**
   * Process goal details to include scorer names and assist information
   * @param {Array} goalDetails - Array of goal details from API
   * @param {Array} lineup - Starting lineup
   * @param {Array} bench - Bench players
   * @returns {Array} Processed goal details
   */
  processGoalDetails(goalDetails, _lineup = [], _bench = []) {
    if (!goalDetails || !Array.isArray(goalDetails)) {
      return [];
    }

    return goalDetails.map(goal => ({
      scorerId: goal.player_id,
      minute: goal.time,
      assistId: goal.assist_player_id || null,
      extra: goal.extra || null,
      // Note: Player names would need to be fetched from a separate player database
      // For now, we just return the IDs
    }));
  }

  /**
   * Get formatted goal summary for tooltip display
   * @param {Object} matchDetails - Match details from getMatchDetails
   * @returns {Object} Formatted goal summary
   */
  getGoalSummary(matchDetails) {
    if (!matchDetails) {
      return null;
    }

    return {
      home: matchDetails.homeTeam.goalDetails.map(goal => ({
        minute: goal.minute,
        scorerId: goal.scorerId,
        assistId: goal.assistId,
      })),
      away: matchDetails.awayTeam.goalDetails.map(goal => ({
        minute: goal.minute,
        scorerId: goal.scorerId,
        assistId: goal.assistId,
      })),
    };
  }

  /**
   * Check if match has detailed data available
   * @param {Object} match - Basic match object
   * @returns {boolean} True if detailed data might be available
   */
  hasDetailedData(match) {
    // Only completed matches have detailed data
    return match.status === 'complete' && match.id;
  }

  getCached(key) {
    const item = this.cache.get(key);
    if (item && Date.now() - item.timestamp < this.CACHE_TTL) {
      return item.data;
    }
    this.cache.delete(key);
    return null;
  }

  setCached(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  clearCache() {
    this.cache.clear();
    this.logger.info('🧹 Match details cache cleared');
  }
}

module.exports = MatchDetailsService;
