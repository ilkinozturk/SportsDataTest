const axios = require('axios');

/**
 * Universal team position resolver that ONLY uses API data
 * NO calculations, NO PPG sorting - only direct API responses
 */
async function getTeamPositionUniversal(apiKey, baseUrl, seasonId, teamId) {
  console.log(`🎯 Getting position for team ${teamId} in season ${seasonId}`);

  try {
    // Strategy 1: Try league-tables endpoint first (most accurate)
    const tablesResponse = await axios.get(`${baseUrl}/league-tables`, {
      params: {
        key: apiKey,
        season_id: seasonId,
      },
      timeout: 10000,
    });

    if (tablesResponse.data.success && tablesResponse.data.data) {
      // Check all possible table locations in the API response
      const possibleTables = [
        tablesResponse.data.data.league_table,
        ...(tablesResponse.data.data.specific_tables || []).map(t => t.table),
        tablesResponse.data.data.all_matches_table_overall,
      ].filter(Boolean);

      for (const table of possibleTables) {
        if (Array.isArray(table) && table.length > 0) {
          const standings = table;
          const teamInTable = standings.find(
            t =>
              t.team_id?.toString() === teamId.toString() || t.id?.toString() === teamId.toString()
          );

          if (teamInTable) {
            let position =
              teamInTable.position ||
              teamInTable.league_position ||
              teamInTable.rank ||
              teamInTable.table_position;

            // If position is 0 or undefined, use array index + 1
            if (!position || position === 0) {
              const teamIndex = standings.findIndex(
                t =>
                  t.team_id?.toString() === teamId.toString() ||
                  t.id?.toString() === teamId.toString()
              );
              if (teamIndex !== -1) {
                position = teamIndex + 1;
                console.log(`📊 Using array index for position: ${position}`);
              }
            }

            console.log(`✅ Found in league-tables: position ${position}/${standings.length}`);
            return {
              position: position,
              total_teams: standings.length,
              team_name: teamInTable.team_name || teamInTable.name,
              points: teamInTable.points,
              matches_played:
                teamInTable.played || teamInTable.matches_played || teamInTable.matchesPlayed,
              source: 'league-tables',
            };
          }
        }
      }
      console.log(`⚠️ Team ${teamId} not found in league tables`);
    }
  } catch (error) {
    console.log(`⚠️ League-tables error: ${error.message}`);
  }

  // Strategy 2: Try league-teams endpoint - ONLY use API position, NO calculations
  try {
    console.log(`🔄 Trying league-teams endpoint...`);
    const teamsResponse = await axios.get(`${baseUrl}/league-teams`, {
      params: {
        key: apiKey,
        season_id: seasonId,
        include: 'stats',
      },
      timeout: 10000,
    });

    if (
      teamsResponse.data.success &&
      teamsResponse.data.data &&
      teamsResponse.data.data.length > 0
    ) {
      const teams = teamsResponse.data.data;
      console.log(`📊 Found ${teams.length} teams in league-teams`);

      // Find the specific team
      const teamData = teams.find(t => t.id?.toString() === teamId.toString());

      if (!teamData) {
        console.log(`❌ Team ${teamId} not found in league-teams`);
        return null;
      }

      // ONLY use table_position from API if it's valid
      if (teamData.table_position && teamData.table_position > 0) {
        console.log(`✅ Using API table_position: ${teamData.table_position}/${teams.length}`);
        return {
          position: teamData.table_position,
          total_teams: teams.length,
          team_name: teamData.name,
          points: teamData.stats?.seasonPoints_overall,
          matches_played: teamData.stats?.seasonMatchesPlayed_overall,
          source: 'league-teams-api',
        };
      } else {
        console.log(`⚠️ No valid position from API (table_position: ${teamData.table_position})`);
        return null;
      }
    }
  } catch (error) {
    console.log(`❌ League-teams error: ${error.message}`);
  }

  console.log(`❌ No position data available from API`);
  return null;
}

module.exports = { getTeamPositionUniversal };
