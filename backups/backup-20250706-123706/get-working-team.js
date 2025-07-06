const axios = require('axios');

const API_KEY = '29581005f929990bf13dc9c964200d537e484ee248f0ac2d0f76910a6ce7aae9';
const BASE_URL = 'https://api.football-data-api.com';

async function getWorkingTeam() {
  console.log('🔍 Finding a working team and season...\n');

  try {
    // Get chosen leagues
    const response = await axios.get(`${BASE_URL}/league-list`, {
      params: {
        key: API_KEY,
        chosen_leagues_only: 'true',
      },
    });

    if (response.data.success && response.data.data) {
      const leagues = response.data.data;

      // Find MLS or another good league
      const mls = leagues.find(l => l.name.includes('MLS'));

      if (mls && mls.season && mls.season.length > 0) {
        // Get most recent season
        const recentSeason = mls.season
          .filter(s => s.id) // Make sure it has an ID
          .sort((a, b) => b.year - a.year)[0];

        if (recentSeason) {
          console.log(`✅ Using ${mls.name} - ${recentSeason.year} season`);
          console.log(`   Season ID: ${recentSeason.id}`);

          // Get teams from this season
          const teamsResponse = await axios.get(`${BASE_URL}/league-teams`, {
            params: {
              key: API_KEY,
              season_id: recentSeason.id,
            },
          });

          if (teamsResponse.data.success && teamsResponse.data.data) {
            const teams = teamsResponse.data.data;
            console.log(`\n✅ Found ${teams.length} teams`);

            if (teams.length > 0) {
              const team = teams[0];
              console.log(`\n📋 Testing with team: ${team.name} (ID: ${team.id})`);

              // Test matches
              const matchesResponse = await axios.get(`${BASE_URL}/league-matches`, {
                params: {
                  key: API_KEY,
                  season_id: recentSeason.id,
                  max_per_page: 500,
                },
              });

              if (matchesResponse.data.success && matchesResponse.data.data) {
                const allMatches = matchesResponse.data.data;
                const teamMatches = allMatches.filter(
                  m => m.homeID === team.id || m.awayID === team.id
                );

                console.log(`✅ Found ${teamMatches.length} matches for ${team.name}`);

                if (teamMatches.length > 0) {
                  console.log('\nFirst match:');
                  const match = teamMatches[0];
                  const homeTeam = teams.find(t => t.id === match.homeID);
                  const awayTeam = teams.find(t => t.id === match.awayID);
                  console.log(
                    `  ${homeTeam?.name || 'Unknown'} ${match.homeGoalCount} - ${match.awayGoalCount} ${awayTeam?.name || 'Unknown'}`
                  );
                }

                console.log(`\n✅ SUCCESS! You can use:`);
                console.log(`   Team ID: ${team.id}`);
                console.log(`   Season ID: ${recentSeason.id}`);
                console.log(`   URL: http://localhost:3001/team-stats.html?teamId=${team.id}`);

                return {
                  teamId: team.id,
                  seasonId: recentSeason.id,
                  teamName: team.name,
                };
              }
            }
          }
        }
      }
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
  }
}

getWorkingTeam();
