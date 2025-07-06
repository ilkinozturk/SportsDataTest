const axios = require('axios');

const API_KEY = '29581005f929990bf13dc9c964200d537e484ee248f0ac2d0f76910a6ce7aae9';
const BASE_URL = 'https://api.football-data-api.com';

async function findTeam836Season() {
  console.log('🔍 Finding correct season for team 836...\n');

  try {
    // First, get team info
    const teamResponse = await axios.get(`${BASE_URL}/team`, {
      params: {
        key: API_KEY,
        team_id: 836,
      },
    });

    if (teamResponse.data.success && teamResponse.data.data.length > 0) {
      const team = teamResponse.data.data[0];
      console.log(`Team: ${team.name}`);
      console.log(`Country: ${team.country}`);
      console.log(`Competition ID: ${team.competition_id}`);

      // Check if this competition is in chosen leagues
      const leaguesResponse = await axios.get(`${BASE_URL}/league-list`, {
        params: {
          key: API_KEY,
          chosen_leagues_only: 'true',
        },
      });

      if (leaguesResponse.data.success && leaguesResponse.data.data) {
        const leagues = leaguesResponse.data.data;

        // Find Chinese leagues
        const chineseLeagues = leagues.filter(
          l => l.name.includes('China') || l.name.includes('Chinese')
        );

        console.log(`\nFound ${chineseLeagues.length} Chinese leagues in chosen leagues`);

        if (chineseLeagues.length > 0) {
          // Check each Chinese league for team 836
          for (const league of chineseLeagues) {
            if (league.season && league.season.length > 0) {
              const recentSeason = league.season
                .filter(s => s.id)
                .sort((a, b) => b.year - a.year)[0];

              if (recentSeason) {
                console.log(
                  `\nChecking ${league.name} - ${recentSeason.year} (ID: ${recentSeason.id})`
                );

                const teamsResponse = await axios.get(`${BASE_URL}/league-teams`, {
                  params: {
                    key: API_KEY,
                    season_id: recentSeason.id,
                  },
                });

                if (teamsResponse.data.success && teamsResponse.data.data) {
                  const teams = teamsResponse.data.data;
                  const found = teams.find(t => t.id === 836);

                  if (found) {
                    console.log(`✅ Found team 836 in this league!`);
                    console.log(`   Team name: ${found.name}`);
                    console.log(`   Season ID: ${recentSeason.id}`);

                    // Check matches
                    const matchesResponse = await axios.get(`${BASE_URL}/league-matches`, {
                      params: {
                        key: API_KEY,
                        season_id: recentSeason.id,
                        max_per_page: 500,
                      },
                    });

                    if (matchesResponse.data.success && matchesResponse.data.data) {
                      const teamMatches = matchesResponse.data.data.filter(
                        m => m.homeID === 836 || m.awayID === 836
                      );

                      console.log(`   Matches found: ${teamMatches.length}`);

                      if (teamMatches.length > 0) {
                        console.log(
                          `\n✅ SUCCESS! Team 836 can work with season ID: ${recentSeason.id}`
                        );
                        return recentSeason.id;
                      }
                    }
                  }
                }
              }
            }
          }
        } else {
          console.log('\n❌ No Chinese leagues in chosen leagues');
          console.log('This explains why team 836 has no matches - its league is not available');

          // Suggest alternative teams
          console.log('\n💡 Suggestion: Use one of these teams instead:');

          // Get a working league
          const workingLeague = leagues.find(
            l => l.name.includes('MLS') && l.season && l.season.length > 0
          );
          if (workingLeague) {
            const season = workingLeague.season.sort((a, b) => b.year - a.year)[0];

            const teamsResponse = await axios.get(`${BASE_URL}/league-teams`, {
              params: {
                key: API_KEY,
                season_id: season.id,
              },
            });

            if (teamsResponse.data.success && teamsResponse.data.data) {
              const teams = teamsResponse.data.data.slice(0, 5);
              teams.forEach(team => {
                console.log(
                  `   - ${team.name} (ID: ${team.id}) - http://localhost:3001/team-stats.html?teamId=${team.id}`
                );
              });
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

findTeam836Season();
