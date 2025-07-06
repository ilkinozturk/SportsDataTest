/**
 * Team Service Module
 * Handles team data fetching and caching
 */

(function(global) {
  'use strict';

  class TeamService {
    constructor() {
      this.name = 'TeamService';
      this.version = '1.0.0';
      this.cache = new Map();
      this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
      this.baseUrl = '/api/teams';
    }

    /**
     * Get APIClient instance
     */
    get apiClient() {
      return global.TeamStatsAPIClient;
    }

    /**
     * Get team data
     */
    async getTeamData(teamId) {
      if (!teamId) {
        throw new Error('Team ID is required');
      }

      // Check cache first
      const cacheKey = `team_${teamId}`;
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        console.log(`[TeamService] Returning cached data for team ${teamId}`);
        return cached;
      }

      try {
        console.log(`[TeamService] Fetching data for team ${teamId}`);
        
        // Use APIClient if available
        if (this.apiClient && this.apiClient.getTeamData) {
          // Use APIClient's getTeamData method which handles the response properly
          const teamData = await this.apiClient.getTeamData(teamId);
          
          // Transform the data to expected format
          const data = this.transformApiResponse(teamData);
          
          // Cache the data
          this.setCache(cacheKey, data);
          
          return data;
        } else if (this.apiClient) {
          // Fallback to generic get method
          const response = await this.apiClient.get(`/teams/data`, { params: { teamId } });
          // APIClient returns the data directly, not wrapped in response object
          const rawData = response;
          
          // Transform the data to expected format
          const data = this.transformApiResponse(rawData);
          
          // Cache the data
          this.setCache(cacheKey, data);
          
          return data;
        } else {
          // Fallback to direct fetch
          const response = await fetch(`${this.baseUrl}/data?teamId=${teamId}`);
          
          if (!response.ok) {
            throw new Error(`HTTP Error ${response.status}: ${response.statusText}`);
          }
          
          const responseData = await response.json();
          
          // Transform the data to expected format
          const data = this.transformApiResponse(responseData);
          
          // Cache the data
          this.setCache(cacheKey, data);
          
          return data;
        }
      } catch (error) {
        console.error('[TeamService] Error fetching team data:', error);
        throw error;
      }
    }

    /**
     * Get team statistics
     */
    async getTeamStatistics(teamId, options = {}) {
      const teamData = await this.getTeamData(teamId);
      return teamData.stats || {};
    }

    /**
     * Get team info
     */
    async getTeamInfo(teamId) {
      const teamData = await this.getTeamData(teamId);
      return {
        id: teamData.teamId,
        name: teamData.teamName,
        logo: teamData.teamLogo,
        league: teamData.leagueName,
        country: teamData.country
      };
    }

    /**
     * Get recent matches
     */
    async getRecentMatches(teamId, limit = 10) {
      const teamData = await this.getTeamData(teamId);
      const matches = teamData.stats?.recentMatches || [];
      return matches.slice(0, limit);
    }

    /**
     * Get from cache
     */
    getFromCache(key) {
      const cached = this.cache.get(key);
      if (!cached) return null;
      
      const { data, timestamp } = cached;
      const age = Date.now() - timestamp;
      
      if (age > this.cacheTimeout) {
        this.cache.delete(key);
        return null;
      }
      
      return data;
    }

    /**
     * Set cache
     */
    setCache(key, data) {
      this.cache.set(key, {
        data,
        timestamp: Date.now()
      });
    }

    /**
     * Clear cache
     */
    clearCache() {
      this.cache.clear();
      console.log('[TeamService] Cache cleared');
    }

    /**
     * Clear team cache
     */
    clearTeamCache(teamId) {
      const cacheKey = `team_${teamId}`;
      this.cache.delete(cacheKey);
      console.log(`[TeamService] Cache cleared for team ${teamId}`);
    }

    /**
     * Transform API response to expected format
     */
    transformApiResponse(rawData) {
      // APIClient returns the data directly (already extracted from success/data wrapper)
      // Check if we have teamInfo and statistics directly
      if (rawData.teamInfo && rawData.statistics) {
        return {
          teamId: rawData.teamInfo?.id,
          teamName: rawData.teamInfo?.name,
          teamLogo: rawData.teamInfo?.image,
          fullName: rawData.teamInfo?.fullName,
          englishName: rawData.teamInfo?.englishName,
          country: rawData.teamInfo?.country,
          founded: rawData.teamInfo?.founded,
          season: rawData.teamInfo?.season,
          leagueName: rawData.league?.name,
          leagueId: rawData.league?.id,
          stats: rawData.statistics || {},
          leaguePosition: rawData.leaguePosition,
          allMatches: rawData.allMatches || [],
          recentMatches: rawData.allMatches?.filter(m => m.status === 'complete').slice(0, 10) || []
        };
      }
      
      // Handle the wrapped API response structure (for direct fetch)
      if (rawData.success && rawData.data) {
        const apiData = rawData.data;
        
        return {
          teamId: apiData.teamInfo?.id,
          teamName: apiData.teamInfo?.name,
          teamLogo: apiData.teamInfo?.image,
          fullName: apiData.teamInfo?.fullName,
          englishName: apiData.teamInfo?.englishName,
          country: apiData.teamInfo?.country,
          founded: apiData.teamInfo?.founded,
          season: apiData.teamInfo?.season,
          leagueName: apiData.league?.name,
          leagueId: apiData.league?.id,
          stats: apiData.statistics || {},
          leaguePosition: apiData.leaguePosition,
          allMatches: apiData.allMatches || [],
          recentMatches: apiData.allMatches?.filter(m => m.status === 'complete').slice(0, 10) || []
        };
      }
      
      // If data is already in expected format, return as is
      if (rawData.teamId && rawData.stats) {
        return rawData;
      }
      
      // Otherwise throw error
      console.error('Invalid API response format. Got:', rawData);
      throw new Error('Invalid API response format');
    }
  }

  // Create and export singleton instance
  const teamService = new TeamService();
  
  // Export to global scope
  global.TeamStatsTeamService = teamService;

})(window);