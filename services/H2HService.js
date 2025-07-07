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
      
      // Get recent matches for both teams
      const [team1Matches, team2Matches] = await Promise.all([
        this.getTeamMatches(teamId1, { limit: 100 }),
        this.getTeamMatches(teamId2, { limit: 100 })
      ]);
      
      // Filter H2H matches
      const h2hMatches = [];
      const processedMatchIds = new Set();
      
      // Process all matches to find H2H encounters
      const allMatches = [...team1Matches, ...team2Matches];
      
      allMatches.forEach(match => {
        // Check if this is a match between the two teams
        const isH2HMatch = 
          (match.homeID === teamId1 && match.awayID === teamId2) ||
          (match.homeID === teamId2 && match.awayID === teamId1);
          
        if (isH2HMatch && !processedMatchIds.has(match.id)) {
          processedMatchIds.add(match.id);
          
          // Normalize match data to ensure consistent structure
          const normalizedMatch = {
            id: match.id,
            date: match.date,
            date_unix: match.date_unix,
            status: match.status || 'complete',
            homeID: match.homeID,
            awayID: match.awayID,
            home_name: match.home_name,
            away_name: match.away_name,
            homeGoalCount: match.homeGoalCount || match.home_scored || 0,
            awayGoalCount: match.awayGoalCount || match.away_scored || 0,
            home_image: match.home_image,
            away_image: match.away_image,
            league_name: match.league_name || match.competition_name,
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
      // Use matchesService if available
      if (this.matchesService && typeof this.matchesService.getTeamMatches === 'function') {
        return await this.matchesService.getTeamMatches(teamId, { limit });
      }
      
      // Fallback to direct API call - use FootyStats matches endpoint
      const response = await this.apiClient.get('/matches', {
        params: {
          team_id: teamId,
          page: 1,
          page_size: limit,
          status: 'complete'
        }
      });
      
      return response.data?.data || [];
      
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