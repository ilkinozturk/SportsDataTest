const BaseRepository = require('./BaseRepository');
const { NotFoundError } = require('../errors/AppError');

class TeamRepositorySimple extends BaseRepository {
  constructor() {
    super();
    // Reference to existing teamDataService for compatibility
    this.teamDataService = null;
  }

  setTeamDataService(service) {
    this.teamDataService = service;
  }

  async findById(teamId) {
    const cacheKey = this.getCacheKey('team', teamId);
    const cached = this.getFromCache(cacheKey);
    
    if (cached) return cached;
    
    try {
      const data = await this.makeRequest(`/teams/${teamId}`);
      this.setCache(cacheKey, data, 60); // Cache 1 hour
      return data;
    } catch (error) {
      if (error.originalError?.response?.status === 404) {
        throw new NotFoundError('Team');
      }
      throw error;
    }
  }
  
  async findMatches(teamId, options = {}) {
    const { limit = 15, status = 'FINISHED' } = options;
    const cacheKey = this.getCacheKey('matches', teamId, limit, status);
    const cached = this.getFromCache(cacheKey);
    
    if (cached) return cached;
    
    const data = await this.makeRequest(`/teams/${teamId}/matches`, {
      params: { limit, status }
    });
    
    this.setCache(cacheKey, data.matches, 30); // Cache 30 min
    return data.matches;
  }
  
  // ÖNEMLI: Mevcut business logic'i buraya taşı
  async getTeamStatistics(teamId) {
    // Use existing teamDataService for backward compatibility
    if (this.teamDataService) {
      const cacheKey = this.getCacheKey('team-stats', teamId);
      const cached = this.getFromCache(cacheKey);
      
      if (cached) {
        console.log(`Repository cache hit for team stats: ${teamId}`);
        return cached;
      }
      
      // Call existing service
      const data = await this.teamDataService.getTeamData(teamId);
      
      // Cache the result
      this.setCache(cacheKey, data, 30); // Cache 30 minutes
      
      return data;
    }
    
    // Fallback to simple implementation if no service
    const team = await this.findById(teamId);
    const matches = await this.findMatches(teamId);
    
    return {
      teamInfo: team,
      statistics: {}, // Simplified
      allMatches: matches,
      leaguePosition: null
    };
  }
  
  // Helper method to clear cache for a team
  clearTeamCache(teamId) {
    const patterns = [
      this.getCacheKey('team', teamId),
      this.getCacheKey('matches', teamId),
      this.getCacheKey('team-stats', teamId)
    ];
    
    patterns.forEach(key => {
      this.cache.delete(key);
    });
    
    console.log(`Cleared cache for team ${teamId}`);
  }
  
  // Get cache statistics
  getCacheStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

module.exports = new TeamRepositorySimple(); // Singleton