require('dotenv').config();
const axios = require('axios');

const API_KEY = process.env.FOOTYSTATS_API_KEY;
const BASE_URL = process.env.FOOTYSTATS_BASE_URL;

/**
 * Get league table/standings for a specific season
 * @param {number} seasonId - The season ID to get standings for
 * @returns {Promise<Object>} League table data
 */
async function getLeagueTable(seasonId) {
  try {
    console.log(`📊 Fetching league table for season ID: ${seasonId}`);

    // Call the league-tables endpoint
    const response = await axios.get(`${BASE_URL}/league-tables`, {
      params: {
        key: API_KEY,
        season_id: seasonId,
      },
      timeout: 10000,
    });

    if (response.data.success && response.data.data) {
      const data = response.data.data;

      // Extract the table from the response structure
      let standings = null;

      // Check different possible structures
      if (data.league_table && Array.isArray(data.league_table)) {
        standings = data.league_table;
      } else if (data.specific_tables && data.specific_tables.length > 0) {
        // Use the first table (usually Regular Season)
        const regularSeason =
          data.specific_tables.find(
            t => t.round && (t.round.includes('Regular') || t.round.includes('Overall'))
          ) || data.specific_tables[0];

        if (regularSeason && regularSeason.table) {
          standings = regularSeason.table;
        }
      } else if (data.all_matches_table_overall) {
        standings = data.all_matches_table_overall;
      } else if (Array.isArray(data)) {
        standings = data;
      }

      if (!standings || !Array.isArray(standings)) {
        console.error('❌ Could not find standings in response');
        return null;
      }

      // Sort by position (if position is 0 for all, sort by points)
      const sortedStandings = [...standings].sort((a, b) => {
        // If positions are set, use them
        if (a.position > 0 && b.position > 0) {
          return a.position - b.position;
        }

        // Otherwise sort by points, then goal difference
        if (b.points !== a.points) {
          return b.points - a.points;
        }

        const gdA = a.seasonGoalDifference || a.goal_difference || 0;
        const gdB = b.seasonGoalDifference || b.goal_difference || 0;
        return gdB - gdA;
      });

      // Assign positions if they're all 0
      if (sortedStandings.every(t => !t.position || t.position === 0)) {
        sortedStandings.forEach((team, index) => {
          team.position = index + 1;
        });
      }

      // Process and return the table data
      const processedTable = {
        season_id: seasonId,
        total_teams: sortedStandings.length,
        standings: sortedStandings.map(team => ({
          position: team.position,
          team_id: team.id,
          team_name: team.name || team.cleanName,
          played: team.matchesPlayed || team.played || 0,
          wins: team.seasonWins_overall || team.wins || 0,
          draws: team.seasonDraws_overall || team.draws || 0,
          losses: team.seasonLosses_overall || team.losses || 0,
          goals_for: team.seasonGoals || team.goals_for || 0,
          goals_against: team.seasonConceded || team.goals_against || 0,
          goal_difference: team.seasonGoalDifference || team.goal_difference || 0,
          points: team.points || 0,
          form: team.wdl_record || team.form || '',
          ppg:
            team.ppg ||
            (team.points && team.matchesPlayed ? (team.points / team.matchesPlayed).toFixed(2) : 0),
          home_wins: team.seasonWins_home || team.home_wins || 0,
          home_draws: team.seasonDraws_home || team.home_draws || 0,
          home_losses: team.seasonLosses_home || team.home_losses || 0,
          home_goals_for: team.seasonGoals_home || team.home_goals_for || 0,
          home_goals_against: team.seasonConceded_home || team.home_goals_against || 0,
          away_wins: team.seasonWins_away || team.away_wins || 0,
          away_draws: team.seasonDraws_away || team.away_draws || 0,
          away_losses: team.seasonLosses_away || team.away_losses || 0,
          away_goals_for: team.seasonGoals_away || team.away_goals_for || 0,
          away_goals_against: team.seasonConceded_away || team.away_goals_against || 0,
        })),
      };

      console.log(`✅ Successfully fetched standings for ${sortedStandings.length} teams`);
      return processedTable;
    } else {
      console.error('❌ Invalid response from league-tables endpoint');
      return null;
    }
  } catch (error) {
    console.error(`❌ Error fetching league table: ${error.message}`);
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Data: ${JSON.stringify(error.response.data)}`);
    }
    return null;
  }
}

/**
 * Get team position from league table
 * @param {number} seasonId - The season ID
 * @param {number} teamId - The team ID to find
 * @returns {Promise<Object>} Team position data
 */
async function getTeamPositionFromTable(seasonId, teamId) {
  try {
    const tableData = await getLeagueTable(seasonId);

    if (!tableData || !tableData.standings) {
      return null;
    }

    // Find the team in standings
    const teamStanding = tableData.standings.find(
      team => team.team_id === teamId || team.team_id === parseInt(teamId)
    );

    if (teamStanding) {
      return {
        position: teamStanding.position,
        total_teams: tableData.total_teams,
        position_text: `${teamStanding.position}/${tableData.total_teams}`,
        team_name: teamStanding.team_name,
        matches_played: teamStanding.played,
        points: teamStanding.points,
        wins: teamStanding.wins,
        draws: teamStanding.draws,
        losses: teamStanding.losses,
        goals_for: teamStanding.goals_for,
        goals_against: teamStanding.goals_against,
        goal_difference: teamStanding.goal_difference,
        form: teamStanding.form,
        ppg: teamStanding.ppg,
      };
    } else {
      console.log(`⚠️ Team ID ${teamId} not found in standings`);
      return null;
    }
  } catch (error) {
    console.error(`❌ Error getting team position: ${error.message}`);
    return null;
  }
}

// Export functions
module.exports = {
  getLeagueTable,
  getTeamPositionFromTable,
};

// If running directly, test with sample data
if (require.main === module) {
  async function test() {
    console.log('=== TESTING LEAGUE TABLES ENDPOINT ===\n');

    // Test with MLS 2025
    const mlsSeasonId = 13973;
    console.log(`Testing with MLS 2025 (Season ID: ${mlsSeasonId})\n`);

    const table = await getLeagueTable(mlsSeasonId);

    if (table) {
      console.log(`\nTotal teams: ${table.total_teams}`);
      console.log('\nTop 5 teams:');
      table.standings.slice(0, 5).forEach(team => {
        console.log(
          `${team.position}. ${team.team_name} - ${team.points} pts (${team.played} played)`
        );
      });

      // Test finding Chicago Fire position
      console.log('\n--- Testing Team Position Lookup ---');
      const chicagoFireId = 7;
      const chicagoPosition = await getTeamPositionFromTable(mlsSeasonId, chicagoFireId);

      if (chicagoPosition) {
        console.log('\nChicago Fire position:');
        console.log(JSON.stringify(chicagoPosition, null, 2));
      }
    }

    // Test with Chinese Super League 2025
    console.log('\n\n--- Testing with CSL 2025 ---');
    const cslSeasonId = 14153;
    const shanghaiPosition = await getTeamPositionFromTable(cslSeasonId, 836);

    if (shanghaiPosition) {
      console.log('\nShanghai SIPG position:');
      console.log(JSON.stringify(shanghaiPosition, null, 2));
    }
  }

  test();
}
