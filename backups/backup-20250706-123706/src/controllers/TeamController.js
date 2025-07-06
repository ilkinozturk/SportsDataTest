const teamService = require('../services/TeamServiceNew');
const { asyncHandler } = require('../middleware/errorHandler');

class TeamController {
  getTeamData = asyncHandler(async (req, res) => {
    const { teamId } = req.query;
    const data = await teamService.getTeamStatistics(teamId);
    
    // Response format değişmiyor
    res.json({ success: true, data });
  });
  
  compareTeams = asyncHandler(async (req, res) => {
    const { teamIds } = req.body;
    const data = await teamService.compareTeams(teamIds);
    
    res.json({ success: true, data });
  });
}

module.exports = new TeamController();