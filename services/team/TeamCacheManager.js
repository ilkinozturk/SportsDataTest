/**
 * TeamCacheManager - Handles all team-related caching
 */
class TeamCacheManager {
  constructor(cacheTTL = 15 * 60 * 1000) {
    this.teamCache = new Map();
    this.leagueTeamsCache = new Map();
    this.leagueTeamsCacheTime = new Map();
    this.seasonIdsCache = null;
    this.seasonIdsCacheTime = 0;
    this.CACHE_TTL = cacheTTL;
  }

  /**
   * Get cached team data
   */
  getTeamFromCache(teamId) {
    const cacheKey = `team_${teamId}`;
    const cached = this.teamCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data;
    }
    
    return null;
  }

  /**
   * Set team data in cache
   */
  setTeamInCache(teamId, data) {
    const cacheKey = `team_${teamId}`;
    this.teamCache.set(cacheKey, {
      data,
      timestamp: Date.now()
    });
  }

  /**
   * Get cached league teams
   */
  getLeagueTeamsFromCache(seasonId) {
    const cacheKey = `league_teams_${seasonId}`;
    const cached = this.leagueTeamsCache.get(cacheKey);
    const cacheTime = this.leagueTeamsCacheTime.get(cacheKey);
    
    if (cached && cacheTime && Date.now() - cacheTime < this.CACHE_TTL) {
      return cached;
    }
    
    return null;
  }

  /**
   * Set league teams in cache
   */
  setLeagueTeamsInCache(seasonId, teams) {
    const cacheKey = `league_teams_${seasonId}`;
    this.leagueTeamsCache.set(cacheKey, teams);
    this.leagueTeamsCacheTime.set(cacheKey, Date.now());
  }

  /**
   * Get cached season IDs
   */
  getSeasonIdsFromCache() {
    if (this.seasonIdsCache && Date.now() - this.seasonIdsCacheTime < this.CACHE_TTL) {
      return this.seasonIdsCache;
    }
    return null;
  }

  /**
   * Set season IDs in cache
   */
  setSeasonIdsInCache(seasonIds) {
    this.seasonIdsCache = seasonIds;
    this.seasonIdsCacheTime = Date.now();
  }

  /**
   * Clear all caches
   */
  clearAll() {
    this.teamCache.clear();
    this.leagueTeamsCache.clear();
    this.leagueTeamsCacheTime.clear();
    this.seasonIdsCache = null;
    this.seasonIdsCacheTime = 0;
  }
}

module.exports = TeamCacheManager;