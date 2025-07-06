const teamRepository = require('../repositories/TeamRepositorySimple');
const TeamStatisticsDTO = require('../dtos/TeamStatisticsDTO');
const { ValidationError } = require('../errors/AppError');

class TeamService {
  validateTeamId(teamId) {
    if (!teamId) {
      throw new ValidationError('Team ID is required');
    }
    
    const id = parseInt(teamId);
    if (isNaN(id) || id <= 0) {
      throw new ValidationError('Invalid team ID format');
    }
    
    return id;
  }
  
  async getTeamStatistics(teamId) {
    // Validate
    const validatedId = this.validateTeamId(teamId);
    
    // Get data from repository
    const data = await teamRepository.getTeamStatistics(validatedId);
    
    // Convert to DTO
    return TeamStatisticsDTO.fromRepository(data);
  }
  
  async compareTeams(teamIds) {
    if (!Array.isArray(teamIds) || teamIds.length === 0) {
      throw new ValidationError('Team IDs array is required');
    }
    
    if (teamIds.length > 5) {
      throw new ValidationError('Maximum 5 teams can be compared');
    }
    
    // Parallel fetch
    const results = await Promise.all(
      teamIds.map(id => this.getTeamStatistics(id))
    );
    
    return results;
  }
}

module.exports = new TeamService();