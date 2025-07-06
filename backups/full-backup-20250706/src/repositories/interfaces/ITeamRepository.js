/**
 * ITeamRepository - Interface for team data repository
 * Defines the contract for team data access
 */

class ITeamRepository {
  /**
   * Find team by ID
   * @param {string|number} teamId - Team ID
   * @returns {Promise<Object>} Team data
   */
  async findTeamById(teamId) {
    throw new Error('Method findTeamById must be implemented');
  }

  /**
   * Find team matches
   * @param {string|number} teamId - Team ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Team matches
   */
  async findTeamMatches(teamId, options = {}) {
    throw new Error('Method findTeamMatches must be implemented');
  }

  /**
   * Find team statistics
   * @param {string|number} teamId - Team ID
   * @returns {Promise<Object>} Team statistics
   */
  async findTeamStatistics(teamId) {
    throw new Error('Method findTeamStatistics must be implemented');
  }

  /**
   * Find team by name
   * @param {string} teamName - Team name
   * @returns {Promise<Object>} Team data
   */
  async findTeamByName(teamName) {
    throw new Error('Method findTeamByName must be implemented');
  }

  /**
   * Find teams by league
   * @param {string|number} leagueId - League ID
   * @returns {Promise<Array>} Teams in league
   */
  async findTeamsByLeague(leagueId) {
    throw new Error('Method findTeamsByLeague must be implemented');
  }

  /**
   * Calculate team statistics from matches
   * @param {string|number} teamId - Team ID
   * @returns {Promise<Object>} Calculated statistics
   */
  async calculateTeamStatistics(teamId) {
    throw new Error('Method calculateTeamStatistics must be implemented');
  }

  /**
   * Find head to head matches between two teams
   * @param {string|number} team1Id - First team ID
   * @param {string|number} team2Id - Second team ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} H2H matches
   */
  async findH2HMatches(team1Id, team2Id, options = {}) {
    throw new Error('Method findH2HMatches must be implemented');
  }

  /**
   * Find team form (last N matches)
   * @param {string|number} teamId - Team ID
   * @param {number} matchCount - Number of matches
   * @returns {Promise<Array>} Recent form
   */
  async findTeamForm(teamId, matchCount = 5) {
    throw new Error('Method findTeamForm must be implemented');
  }

  /**
   * Clear team cache
   * @param {string|number} teamId - Team ID
   */
  async clearTeamCache(teamId) {
    throw new Error('Method clearTeamCache must be implemented');
  }
}

module.exports = ITeamRepository;