const axios = require('axios');

/**
 * Builds a map of all competition IDs to their leagues
 * This helps resolve which league a team belongs to based on their competition_id
 */
async function buildCompetitionMap(apiKey, baseUrl) {
  console.log('🔄 Building competition to league mapping...');

  const competitionToLeague = {};

  try {
    // Get all chosen leagues
    const response = await axios.get(`${baseUrl}/league-list`, {
      params: {
        key: apiKey,
        chosen_leagues_only: 'true',
      },
      timeout: 10000,
    });

    if (response.data.success && response.data.data) {
      const leagues = response.data.data;

      for (const league of leagues) {
        // For each league, try to get its teams to understand competition IDs
        try {
          const teamsResponse = await axios.get(`${baseUrl}/league-teams`, {
            params: {
              key: apiKey,
              season_id: league.id,
              include: 'stats',
            },
            timeout: 10000,
          });

          if (teamsResponse.data.success && teamsResponse.data.data) {
            const teams = teamsResponse.data.data;

            // Build a map of competition IDs found in this league
            const competitionIds = new Set();
            teams.forEach(team => {
              if (team.competition_id) {
                competitionIds.add(team.competition_id);
              }
            });

            // Map all these competition IDs to this league
            competitionIds.forEach(compId => {
              competitionToLeague[compId] = {
                season_id: league.id,
                league_name: league.name,
                country: league.country,
                season_name: league.season,
              };
            });

            if (competitionIds.size > 0) {
              console.log(
                `✅ ${league.country} - ${league.name}: Found ${competitionIds.size} competition IDs`
              );
            }
          }
        } catch (error) {
          // Some leagues might not have data, that's ok
        }
      }
    }

    console.log(`📊 Built mapping for ${Object.keys(competitionToLeague).length} competition IDs`);
    return competitionToLeague;
  } catch (error) {
    console.error(`❌ Failed to build competition mapping: ${error.message}`);
    return {};
  }
}

module.exports = { buildCompetitionMap };
