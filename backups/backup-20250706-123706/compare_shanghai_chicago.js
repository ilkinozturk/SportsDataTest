require('dotenv').config();
const axios = require('axios');

const API_KEY = process.env.FOOTYSTATS_API_KEY;
const BASE_URL = process.env.FOOTYSTATS_BASE_URL;

// Team IDs
const SHANGHAI_SIPG_ID = 836;
const CHICAGO_FIRE_ID = 7;

// League IDs from discovered-leagues.ts
const CHINA_SUPER_LEAGUE_ID = 14153;
const USA_MLS_ID = 13973;

// Alternative league IDs from API responses
const CHINA_SUPER_LEAGUE_ALT = 13356; // From Shanghai SIPG's competition_id

async function fetchTeamData(teamId, teamName) {
  try {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Fetching data for ${teamName} (ID: ${teamId})`);
    console.log('='.repeat(60));

    // 1. Fetch team data directly
    console.log('\n1. TEAM ENDPOINT (/team):');
    const teamResponse = await axios.get(`${BASE_URL}/team`, {
      params: { key: API_KEY, team_id: teamId },
      timeout: 10000,
    });

    if (teamResponse.data.success && teamResponse.data.data.length > 0) {
      const teamData = teamResponse.data.data[0];
      console.log(`   ✓ Team found: ${teamData.name}`);
      console.log(`   - Country: ${teamData.country}`);
      console.log(`   - Competition ID: ${teamData.competition_id}`);
      console.log(`   - Season: ${teamData.season}`);
      console.log(`   - Table Position: ${teamData.table_position || 'NULL'}`);
      console.log(`   - Matches Played: ${teamData.stats?.seasonMatchesPlayed_overall || 0}`);
      console.log(`   - Points: ${teamData.stats?.seasonPoints_overall || 0}`);
      console.log(`   - PPG: ${teamData.stats?.seasonPPG_overall || 0}`);
      console.log(`   - Win%: ${teamData.stats?.seasonWinPercentage_overall || 0}`);

      // Check for null/missing fields
      console.log('\n   Data Quality Check:');
      console.log(
        `   - Has table_position: ${teamData.table_position !== null && teamData.table_position !== undefined}`
      );
      console.log(
        `   - Has competition_id: ${teamData.competition_id !== null && teamData.competition_id !== undefined}`
      );
      console.log(`   - Has season: ${teamData.season !== null && teamData.season !== undefined}`);
      console.log(`   - Has stats: ${teamData.stats !== null && teamData.stats !== undefined}`);

      return {
        teamData,
        leagueId: teamData.competition_id,
      };
    } else {
      console.log('   ✗ Team not found in team endpoint');
      return null;
    }
  } catch (error) {
    console.error(`   ✗ Error fetching team data: ${error.message}`);
    return null;
  }
}

async function fetchLeagueTeams(leagueId, leagueName) {
  try {
    console.log(`\n2. LEAGUE-TEAMS ENDPOINT (/league-teams) for ${leagueName} (ID: ${leagueId}):`);

    const leagueResponse = await axios.get(`${BASE_URL}/league-teams`, {
      params: { key: API_KEY, league_id: leagueId },
      timeout: 10000,
    });

    if (leagueResponse.data.success && leagueResponse.data.data) {
      const teams = leagueResponse.data.data;
      console.log(`   ✓ Found ${teams.length} teams in league`);

      // Check data quality for all teams
      let teamsWithPosition = 0;
      let teamsWithoutPosition = 0;
      teams.forEach(team => {
        if (team.table_position !== null && team.table_position !== undefined) {
          teamsWithPosition++;
        } else {
          teamsWithoutPosition++;
        }
      });

      console.log(`   - Teams with position: ${teamsWithPosition}`);
      console.log(`   - Teams without position: ${teamsWithoutPosition}`);

      return teams;
    } else {
      console.log('   ✗ No teams found in league');
      return [];
    }
  } catch (error) {
    console.error(`   ✗ Error fetching league teams: ${error.message}`);
    return [];
  }
}

async function analyzeTeamInLeague(teamId, teamName, teams) {
  const teamInLeague = teams.find(t => t.id === teamId);

  if (teamInLeague) {
    console.log(`\n3. ${teamName.toUpperCase()} IN LEAGUE DATA:`);
    console.log(`   ✓ Found in league-teams response`);
    console.log(`   - Name: ${teamInLeague.name}`);
    console.log(`   - Table Position: ${teamInLeague.table_position || 'NULL'}`);
    console.log(`   - Matches Played: ${teamInLeague.stats?.seasonMatchesPlayed_overall || 0}`);
    console.log(`   - Points: ${teamInLeague.stats?.seasonPoints_overall || 0}`);
    console.log(`   - PPG: ${teamInLeague.stats?.seasonPPG_overall || 0}`);

    // Show position in sorted table
    const sortedTeams = [...teams].sort((a, b) => {
      // Sort by points descending, then by PPG
      const pointsA = a.stats?.seasonPoints_overall || 0;
      const pointsB = b.stats?.seasonPoints_overall || 0;
      if (pointsA !== pointsB) {
        return pointsB - pointsA;
      }

      const ppgA = a.stats?.seasonPPG_overall || 0;
      const ppgB = b.stats?.seasonPPG_overall || 0;
      return ppgB - ppgA;
    });

    const calculatedPosition = sortedTeams.findIndex(t => t.id === teamId) + 1;
    console.log(`\n   Position Analysis:`);
    console.log(`   - API table_position: ${teamInLeague.table_position || 'NULL'}`);
    console.log(`   - Calculated position (by points): ${calculatedPosition}`);
    console.log(
      `   - Match: ${teamInLeague.table_position == calculatedPosition ? 'YES ✓' : 'NO ✗'}`
    );

    // Show top 5 teams for context
    console.log('\n   Top 5 teams in league (by points):');
    sortedTeams.slice(0, 5).forEach((team, idx) => {
      const isOurTeam = team.id === teamId ? ' <-- THIS TEAM' : '';
      console.log(
        `   ${idx + 1}. ${team.name} - Points: ${team.stats?.seasonPoints_overall || 0}, Pos: ${team.table_position || 'NULL'}${isOurTeam}`
      );
    });

    return teamInLeague;
  } else {
    console.log(`\n3. ${teamName.toUpperCase()} IN LEAGUE DATA:`);
    console.log(`   ✗ NOT found in league-teams response`);
    return null;
  }
}

async function compareTeams() {
  console.log('SHANGHAI SIPG vs CHICAGO FIRE POSITION ANALYSIS');
  console.log('='.repeat(60));
  console.log("Goal: Understand why Shanghai SIPG's position displays correctly");
  console.log("      while Chicago Fire's position does not.");

  // Analyze Shanghai SIPG
  const shanghaiResult = await fetchTeamData(SHANGHAI_SIPG_ID, 'Shanghai SIPG');
  if (shanghaiResult) {
    // Try the competition_id from the team response first
    let shanghaiLeagueTeams = await fetchLeagueTeams(
      shanghaiResult.leagueId,
      'Chinese Super League (from team data)'
    );

    // If that fails (417 error), try the discovered league ID
    if (shanghaiLeagueTeams.length === 0) {
      console.log('\n   Trying alternative league ID from discovered-leagues.ts...');
      shanghaiLeagueTeams = await fetchLeagueTeams(
        CHINA_SUPER_LEAGUE_ID,
        'Chinese Super League (discovered)'
      );
    }

    await analyzeTeamInLeague(SHANGHAI_SIPG_ID, 'Shanghai SIPG', shanghaiLeagueTeams);
  }

  // Analyze Chicago Fire
  const chicagoResult = await fetchTeamData(CHICAGO_FIRE_ID, 'Chicago Fire');
  if (chicagoResult) {
    const chicagoLeagueTeams = await fetchLeagueTeams(
      chicagoResult.leagueId || USA_MLS_ID,
      'USA MLS'
    );
    await analyzeTeamInLeague(CHICAGO_FIRE_ID, 'Chicago Fire', chicagoLeagueTeams);
  }

  // Summary comparison
  console.log(`\n${'='.repeat(60)}`);
  console.log('SUMMARY COMPARISON');
  console.log('='.repeat(60));

  if (shanghaiResult && chicagoResult) {
    console.log('\nShanghai SIPG:');
    console.log(
      `- Team endpoint table_position: ${shanghaiResult.teamData.table_position || 'NULL'}`
    );
    console.log(`- League activated: YES (Chinese Super League is in WORKING_LEAGUES)`);
    console.log(
      `- Data quality: ${shanghaiResult.teamData.table_position ? 'GOOD ✓' : 'MISSING POSITION ✗'}`
    );

    console.log('\nChicago Fire:');
    console.log(
      `- Team endpoint table_position: ${chicagoResult.teamData.table_position || 'NULL'}`
    );
    console.log(`- League activated: YES (USA MLS is in WORKING_LEAGUES)`);
    console.log(
      `- Data quality: ${chicagoResult.teamData.table_position ? 'GOOD ✓' : 'MISSING POSITION ✗'}`
    );

    console.log('\nKEY FINDING:');
    if (shanghaiResult.teamData.table_position && !chicagoResult.teamData.table_position) {
      console.log('Shanghai SIPG has table_position in the API response, Chicago Fire does not.');
      console.log('This is an API data issue, not a code issue.');
    } else if (!shanghaiResult.teamData.table_position && !chicagoResult.teamData.table_position) {
      console.log('Both teams are missing table_position in the API response.');
      console.log('Need to calculate positions from league standings.');
    } else {
      console.log('Both teams have table_position in the API response.');
    }
  }
}

// Run the comparison
compareTeams().catch(console.error);
