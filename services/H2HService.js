const Logger = require('../utils/logger');

/**
 * Service for handling H2H (Head to Head) match data
 * Modular service that works with existing FootyStats API
 */
class H2HService {
  constructor(apiClient, matchesService) {
    this.logger = new Logger('H2HService');
    this.apiClient = apiClient;
    this.matchesService = matchesService;
    this.cache = new Map();
    this.CACHE_TTL = 10 * 60 * 1000; // 10 minutes
  }

  /**
   * Get H2H matches between two teams
   * @param {number} teamId1 - First team ID
   * @param {number} teamId2 - Second team ID
   * @param {Object} options - Options for filtering
   * @returns {Promise<Array>} H2H matches
   */
  async getH2HMatches(teamId1, teamId2, options = {}) {
    const { limit = 10 } = options;
    const cacheKey = `h2h_${teamId1}_${teamId2}_${limit}`;
    
    // Check cache first
    const cached = this.getCached(cacheKey);
    if (cached) {
      this.logger.info(`💾 H2H cache hit for teams ${teamId1} vs ${teamId2}`);
      return cached;
    }
    
    try {
      this.logger.info(`🌐 Fetching H2H matches for teams ${teamId1} vs ${teamId2}`);
      
      // Try direct H2H endpoint first
      try {
        const h2hResponse = await this.apiClient.get(`/h2h/${teamId1}/${teamId2}`, {
          params: { limit }
        });
        
        if (h2hResponse.data?.data?.matches && h2hResponse.data.data.matches.length > 0) {
          const h2hMatches = h2hResponse.data.data.matches;
          this.setCached(cacheKey, h2hMatches);
          this.logger.info(`✅ Found ${h2hMatches.length} H2H matches from direct endpoint`);
          return h2hMatches;
        }
      } catch (error) {
        this.logger.info(`Direct H2H endpoint failed, trying alternative method...`);
      }
      
      // Fallback: Get recent matches for both teams
      // Use higher limit to find older H2H matches
      const [team1Matches, team2Matches] = await Promise.all([
        this.getTeamMatches(teamId1, { limit: 200 }),
        this.getTeamMatches(teamId2, { limit: 200 })
      ]);
      
      // Filter H2H matches
      const h2hMatches = [];
      const processedMatchIds = new Set();
      
      // Process all matches to find H2H encounters
      const allMatches = [...team1Matches, ...team2Matches];
      
      allMatches.forEach(match => {
        // Check if this is a match between the two teams
        const homeId = match.homeID || match.homeTeam?.id;
        const awayId = match.awayID || match.awayTeam?.id;
        
        const isH2HMatch = 
          (homeId === teamId1 && awayId === teamId2) ||
          (homeId === teamId2 && awayId === teamId1);
          
        if (isH2HMatch && !processedMatchIds.has(match.id)) {
          processedMatchIds.add(match.id);
          
          // Normalize match data to ensure consistent structure
          const normalizedMatch = {
            id: match.id,
            date: match.date,
            date_unix: match.date_unix || (match.date ? new Date(match.date).getTime() / 1000 : null),
            status: match.status || 'complete',
            homeID: homeId,
            awayID: awayId,
            home_name: match.home_name || match.homeTeam?.name,
            away_name: match.away_name || match.awayTeam?.name,
            homeGoalCount: match.homeGoalCount || match.homeScore || match.home_scored || 0,
            awayGoalCount: match.awayGoalCount || match.awayScore || match.away_scored || 0,
            home_image: match.home_image || match.homeTeam?.logo,
            away_image: match.away_image || match.awayTeam?.logo,
            league_name: match.league_name || match.competition_name || match.competition,
            league_id: match.league_id || match.competition_id
          };
          
          h2hMatches.push(normalizedMatch);
        }
      });
      
      // Sort by date (newest first)
      h2hMatches.sort((a, b) => {
        const dateA = a.date_unix || new Date(a.date).getTime() / 1000;
        const dateB = b.date_unix || new Date(b.date).getTime() / 1000;
        return dateB - dateA;
      });
      
      // Limit results
      const limitedMatches = h2hMatches.slice(0, limit);
      
      // Cache the results
      this.setCached(cacheKey, limitedMatches);
      
      this.logger.info(`✅ Found ${limitedMatches.length} H2H matches`);
      return limitedMatches;
      
    } catch (error) {
      this.logger.error(`❌ Error fetching H2H matches: ${error.message}`);
      return [];
    }
  }

  /**
   * Calculate H2H summary statistics
   * @param {Array} h2hMatches - H2H matches
   * @param {number} teamId - Team ID to calculate wins for
   * @returns {Object} H2H summary
   */
  calculateH2HSummary(h2hMatches, homeTeamId, _awayTeamId) {
    const summary = {
      homeWins: 0,
      awayWins: 0,
      draws: 0,
      totalMatches: h2hMatches.length
    };
    
    h2hMatches.forEach(match => {
      const homeScore = match.homeGoalCount || 0;
      const awayScore = match.awayGoalCount || 0;
      
      if (homeScore > awayScore) {
        // Home team won this match
        if (match.homeID === homeTeamId) {
          summary.homeWins++;
        } else {
          summary.awayWins++;
        }
      } else if (awayScore > homeScore) {
        // Away team won this match
        if (match.awayID === homeTeamId) {
          summary.homeWins++;
        } else {
          summary.awayWins++;
        }
      } else {
        // Draw
        summary.draws++;
      }
    });
    
    return summary;
  }

  /**
   * Get team matches with caching
   * @param {number} teamId - Team ID
   * @param {Object} options - Options
   * @returns {Promise<Array>} Team matches
   */
  async getTeamMatches(teamId, options = {}) {
    const { limit = 50 } = options;
    
    try {
      // Try to get from teamDataService if available
      if (this.teamDataService && typeof this.teamDataService.getTeamData === 'function') {
        const teamData = await this.teamDataService.getTeamData(teamId);
        if (teamData && teamData.allMatches && teamData.allMatches.length > 0) {
          this.logger.info(`Got ${teamData.allMatches.length} matches from teamDataService`);
          return teamData.allMatches.slice(0, limit);
        }
      }
      
      // Try internal API endpoint as fallback
      const axios = require('axios');
      const teamResponse = await axios.get(`http://localhost:${process.env.PORT || 3005}/api/teams/data`, {
        params: { teamId }
      });
      
      if (teamResponse.data?.success && teamResponse.data?.data?.allMatches) {
        this.logger.info(`Got ${teamResponse.data.data.allMatches.length} matches from team data API`);
        return teamResponse.data.data.allMatches.slice(0, limit);
      }
      
      // Fallback to matchesService
      if (this.matchesService && typeof this.matchesService.getTeamMatches === 'function') {
        return await this.matchesService.getTeamMatches(teamId, { limit });
      }
      
      return [];
      
    } catch (error) {
      this.logger.error(`Error fetching team matches: ${error.message}`);
      return [];
    }
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
      timestamp: Date.now()
    });
  }

  clearCache() {
    this.cache.clear();
    this.logger.info('🧹 H2H cache cleared');
  }
}

module.exports = H2HService;