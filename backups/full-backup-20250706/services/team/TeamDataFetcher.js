const axios = require('axios');
const Logger = require('../../utils/logger');
const { trackApiError } = require('../../middleware/errorTracking');

/**
 * TeamDataFetcher - Handles API calls for team data
 */
class TeamDataFetcher {
  constructor(apiKey, baseUrl) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
    this.logger = new Logger('TeamDataFetcher');
    this.teamIdMappings = {
      // Add any specific team ID mappings here
    };
  }

  /**
   * Fetch team stats from FootyStats API
   */
  async fetchTeamStats(teamId, seasonId = null) {
    try {
      this.logger.info(`Fetching team stats for ID: ${teamId}${seasonId ? ` in season ${seasonId}` : ''}`);
      
      const mappedId = this.teamIdMappings[teamId] || teamId;
      
      const params = {
        key: this.apiKey,
        team_id: mappedId,
        include: 'stats'
      };
      
      if (seasonId) {
        params.season_id = seasonId;
      }
      
      const response = await axios.get(`${this.baseUrl}/team`, {
        params,
        timeout: 10000
      });
      
      if (response.data.success && response.data.data && response.data.data.length > 0) {
        const teamData = response.data.data[0];
        this.logger.success(`Found team: ${teamData.name} (${teamData.country})`);
        return teamData;
      }
      
      this.logger.warn(`No team data found for ID: ${teamId}`);
      return null;
      
    } catch (error) {
      this.logger.error(`Failed to fetch team stats: ${error.message}`, error);
      trackApiError('/team', error, { teamId, seasonId });
      return null;
    }
  }

  /**
   * Fetch league teams data
   */
  async fetchLeagueTeams(seasonId) {
    try {
      this.logger.info(`Fetching league teams for season: ${seasonId}`);
      
      const response = await axios.get(`${this.baseUrl}/league-teams`, {
        params: {
          key: this.apiKey,
          season_id: seasonId,
          include: 'stats'
        },
        timeout: 10000
      });
      
      if (response.data.success && response.data.data) {
        const teams = response.data.data;
        this.logger.success(`Fetched ${teams.length} teams from league-teams`);
        return teams;
      }
      
      return null;
      
    } catch (error) {
      this.logger.error(`Failed to fetch league teams: ${error.message}`, error);
      trackApiError('/league-teams', error, { seasonId });
      return null;
    }
  }

  /**
   * Fetch league table
   */
  async fetchLeagueTable(seasonId) {
    try {
      this.logger.info(`Fetching league table for season: ${seasonId}`);
      
      const response = await axios.get(`${this.baseUrl}/league-tables`, {
        params: {
          key: this.apiKey,
          season_id: seasonId
        },
        timeout: 10000
      });
      
      if (response.data.success && response.data.data) {
        return response.data.data;
      }
      
      return null;
      
    } catch (error) {
      this.logger.error(`Failed to fetch league table: ${error.message}`, error);
      trackApiError('/league-tables', error, { seasonId });
      return null;
    }
  }
}

module.exports = TeamDataFetcher;