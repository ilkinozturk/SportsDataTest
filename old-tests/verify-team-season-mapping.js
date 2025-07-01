const axios = require('axios');
require('dotenv').config();

const API_KEY = process.env.FOOTYSTATS_API_KEY;
const BASE_URL = process.env.FOOTYSTATS_BASE_URL;

// Doğru takım ID'leri ile test
const TEST_TEAMS = [
  { id: 7, name: 'Chicago Fire', country: 'USA', expectedLeague: 'MLS', expectedSeasonId: 13973 },
  {
    id: 846,
    name: 'Shanghai Shenhua FC',
    country: 'China',
    expectedLeague: 'Chinese Super League',
    expectedSeasonId: 14153,
  },
];

async function testTeamSeasonMapping(team) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🔍 Testing ${team.name} (ID: ${team.id})`);
  console.log(`${'='.repeat(60)}`);

  try {
    // 1. Team API'den veri al
    console.log('\n1️⃣ Fetching from /team endpoint...');
    const teamResponse = await axios.get(`${BASE_URL}/team`, {
      params: { key: API_KEY, team_id: team.id },
      timeout: 10000,
    });

    if (
      !teamResponse.data.success ||
      !teamResponse.data.data ||
      teamResponse.data.data.length === 0
    ) {
      console.log(`❌ Team not found in /team endpoint`);
      return { success: false, error: 'Team not found' };
    }

    const teamData = teamResponse.data.data[0];
    const stats = teamData.stats || {};

    console.log(`✅ Team API Response:`);
    console.log(`   Name: ${teamData.name}`);
    console.log(`   Country: ${teamData.country}`);
    console.log(`   Competition ID: ${teamData.competition_id}`);
    console.log(`   Season: ${teamData.season}`);
    console.log(`   Table Position: ${teamData.table_position || 'N/A'}`);
    console.log(`   Matches Played: ${stats.seasonMatchesPlayed_overall || 0}`);
    console.log(`   Points: ${stats.seasonPoints_overall || 0}`);
    console.log(
      `   W-D-L: ${stats.seasonWinsNum_overall || 0}-${stats.seasonDrawsNum_overall || 0}-${stats.seasonLossesNum_overall || 0}`
    );
    console.log(
      `   Goals For/Against: ${stats.seasonGoals_overall || 0}/${stats.seasonConceded_overall || 0}`
    );

    // 2. Expected season'dan league teams al
    console.log(
      `\n2️⃣ Fetching from /league-teams endpoint (Season ID: ${team.expectedSeasonId})...`
    );
    const leagueResponse = await axios.get(`${BASE_URL}/league-teams`, {
      params: {
        key: API_KEY,
        season_id: team.expectedSeasonId,
        include: 'stats',
      },
      timeout: 10000,
    });

    if (leagueResponse.data.success && leagueResponse.data.data) {
      const teamInLeague = leagueResponse.data.data.find(t => t.id == team.id);

      if (teamInLeague) {
        console.log(`✅ Team found in league!`);
        console.log(`   Table Position: ${teamInLeague.table_position || 'N/A'}`);
        console.log(`   Matches Played: ${teamInLeague.stats?.seasonMatchesPlayed_overall || 0}`);
        console.log(`   Points: ${teamInLeague.stats?.seasonPoints_overall || 0}`);
        console.log(
          `   W-D-L: ${teamInLeague.stats?.seasonWinsNum_overall || 0}-${teamInLeague.stats?.seasonDrawsNum_overall || 0}-${teamInLeague.stats?.seasonLossesNum_overall || 0}`
        );
        console.log(
          `   Goals For/Against: ${teamInLeague.stats?.seasonGoals_overall || 0}/${teamInLeague.stats?.seasonConceded_overall || 0}`
        );

        // 3. Veri karşılaştırması
        console.log(`\n3️⃣ Data Comparison:`);

        // Competition ID karşılaştırması
        if (teamData.competition_id != team.expectedSeasonId) {
          console.log(`   ⚠️ Competition ID Mismatch!`);
          console.log(`      Team API: ${teamData.competition_id}`);
          console.log(`      Expected: ${team.expectedSeasonId}`);
        } else {
          console.log(`   ✅ Competition ID matches: ${teamData.competition_id}`);
        }

        // Stats karşılaştırması
        const statsMatch = {
          matches:
            (stats.seasonMatchesPlayed_overall || 0) ===
            (teamInLeague.stats?.seasonMatchesPlayed_overall || 0),
          points:
            (stats.seasonPoints_overall || 0) === (teamInLeague.stats?.seasonPoints_overall || 0),
          wins:
            (stats.seasonWinsNum_overall || 0) === (teamInLeague.stats?.seasonWinsNum_overall || 0),
          position: teamData.table_position === teamInLeague.table_position,
        };

        console.log(`   Stats Match:`);
        console.log(
          `      Matches: ${statsMatch.matches ? '✅' : '❌'} (${stats.seasonMatchesPlayed_overall} vs ${teamInLeague.stats?.seasonMatchesPlayed_overall})`
        );
        console.log(
          `      Points: ${statsMatch.points ? '✅' : '❌'} (${stats.seasonPoints_overall} vs ${teamInLeague.stats?.seasonPoints_overall})`
        );
        console.log(
          `      Wins: ${statsMatch.wins ? '✅' : '❌'} (${stats.seasonWinsNum_overall} vs ${teamInLeague.stats?.seasonWinsNum_overall})`
        );
        console.log(
          `      Position: ${statsMatch.position ? '✅' : '❌'} (${teamData.table_position} vs ${teamInLeague.table_position})`
        );

        // 4. League table'dan position kontrolü
        console.log(`\n4️⃣ Checking league table...`);
        try {
          const tableResponse = await axios.get(`${BASE_URL}/league-table`, {
            params: {
              key: API_KEY,
              season_id: team.expectedSeasonId,
            },
            timeout: 10000,
          });

          if (
            tableResponse.data.success &&
            tableResponse.data.data &&
            tableResponse.data.data.league_table
          ) {
            const table = tableResponse.data.data.league_table;
            const teamInTable = table.find(t => t.id == team.id);

            if (teamInTable) {
              console.log(`   ✅ Found in league table:`);
              console.log(`      Position: ${teamInTable.position}`);
              console.log(`      Points: ${teamInTable.points}`);
              console.log(`      Matches: ${teamInTable.matchesPlayed}`);

              if (teamInTable.position !== teamData.table_position) {
                console.log(`   ⚠️ Position mismatch with team API!`);
              }
            } else {
              console.log(`   ❌ Not found in league table`);
            }
          }
        } catch (error) {
          console.log(`   ⚠️ Could not fetch league table: ${error.message}`);
        }

        return {
          success: true,
          teamId: team.id,
          teamName: teamData.name,
          competitionIdMatch: teamData.competition_id == team.expectedSeasonId,
          statsMatch: statsMatch,
          teamApiData: {
            competitionId: teamData.competition_id,
            position: teamData.table_position,
            matches: stats.seasonMatchesPlayed_overall || 0,
            points: stats.seasonPoints_overall || 0,
          },
          leagueApiData: {
            seasonId: team.expectedSeasonId,
            position: teamInLeague.table_position,
            matches: teamInLeague.stats?.seasonMatchesPlayed_overall || 0,
            points: teamInLeague.stats?.seasonPoints_overall || 0,
          },
        };
      } else {
        console.log(`❌ Team NOT found in expected league!`);
        console.log(`   This indicates a season mapping problem`);

        // Competition ID'yi kontrol et
        if (teamData.competition_id && teamData.competition_id != team.expectedSeasonId) {
          console.log(`\n5️⃣ Checking team's actual competition ID: ${teamData.competition_id}...`);
          try {
            const actualLeagueResponse = await axios.get(`${BASE_URL}/league-teams`, {
              params: {
                key: API_KEY,
                season_id: teamData.competition_id,
                include: 'stats',
              },
              timeout: 10000,
            });

            if (actualLeagueResponse.data.success && actualLeagueResponse.data.data) {
              const teamInActualLeague = actualLeagueResponse.data.data.find(t => t.id == team.id);
              if (teamInActualLeague) {
                console.log(`   ✅ Team found in competition ID ${teamData.competition_id}!`);
                console.log(`   ⚠️ This means the team is in a different season than expected`);
              }
            }
          } catch (error) {
            console.log(`   Could not check actual competition: ${error.message}`);
          }
        }
      }
    }
  } catch (error) {
    console.error(`❌ Error testing ${team.name}: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function runVerification() {
  console.log('🏁 Season ID Mapping Verification');
  console.log('Testing if teams return correct data with proper season IDs');

  const results = [];

  for (const team of TEST_TEAMS) {
    const result = await testTeamSeasonMapping(team);
    results.push(result);

    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 1500));
  }

  // Summary
  console.log('\n\n📊 VERIFICATION SUMMARY');
  console.log('='.repeat(70));

  results.forEach(r => {
    if (r.success) {
      console.log(`\n${r.teamName} (ID: ${r.teamId}):`);
      console.log(`   Competition ID Match: ${r.competitionIdMatch ? '✅' : '❌'}`);
      console.log(
        `   Stats Match: ${Object.values(r.statsMatch).every(v => v) ? '✅ All match' : '⚠️ Some differences'}`
      );
      console.log(
        `   Team API: Competition ${r.teamApiData.competitionId}, Pos ${r.teamApiData.position}, ${r.teamApiData.matches} matches, ${r.teamApiData.points} pts`
      );
      console.log(
        `   League API: Season ${r.leagueApiData.seasonId}, Pos ${r.leagueApiData.position}, ${r.leagueApiData.matches} matches, ${r.leagueApiData.points} pts`
      );
    } else {
      console.log(`\n❌ ${r.teamName || 'Unknown'}: ${r.error}`);
    }
  });

  console.log('\n✅ Verification complete!');
}

// Run verification
runVerification().catch(console.error);
