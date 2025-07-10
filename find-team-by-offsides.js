const axios = require('axios');

const API_KEY = process.env.FOOTYSTATS_API_KEY;
const BASE_URL = 'https://api.footystats.org/v3';

async function findTeamByOffsides() {
  console.log('🔍 Searching for teams with ~5.67 offsides per match...\n');
  console.log('This should help us find PPJ team.\n');

  const teamsWithOffsides = [];

  // Get all leagues first
  try {
    const leaguesResponse = await axios.get(`${BASE_URL}/league-list`, {
      params: {
        key: API_KEY,
        chosen_leagues_only: true,
      },
    });

    if (!leaguesResponse.data.success) {
      throw new Error('Failed to fetch leagues');
    }

    const leagues = leaguesResponse.data.data || [];
    console.log(`Found ${leagues.length} leagues in chosen leagues.\n`);

    // For each league, get current season teams
    for (const league of leagues) {
      if (league.season && league.season.length > 0) {
        const currentSeason = league.season[0];

        if (currentSeason && currentSeason.id) {
          process.stdout.write(`Checking ${league.name} (${league.country})...`);

          try {
            // Get teams in this league
            const teamsResponse = await axios.get(`${BASE_URL}/league-teams`, {
              params: {
                key: API_KEY,
                season_id: currentSeason.id,
              },
              timeout: 10000,
            });

            if (teamsResponse.data.success && teamsResponse.data.data) {
              const teams = teamsResponse.data.data;

              // For each team, check their statistics
              for (const team of teams) {
                try {
                  // Get team statistics
                  const statsResponse = await axios.get(`${BASE_URL}/team`, {
                    params: {
                      key: API_KEY,
                      team_id: team.id,
                    },
                    timeout: 5000,
                  });

                  if (
                    statsResponse.data.success &&
                    statsResponse.data.data &&
                    statsResponse.data.data.length > 0
                  ) {
                    const teamData = statsResponse.data.data[0];

                    // Check if team has offsides statistics
                    if (teamData.stats && teamData.stats.offsides_per_match) {
                      const offsidesPerMatch = parseFloat(teamData.stats.offsides_per_match);

                      // Check if it's close to 5.67 (within 0.1)
                      if (Math.abs(offsidesPerMatch - 5.67) < 0.1) {
                        teamsWithOffsides.push({
                          id: team.id,
                          name: teamData.name,
                          country: teamData.country,
                          league: league.name,
                          offsides_per_match: offsidesPerMatch,
                          matches_played: teamData.stats.matches || 0,
                        });

                        console.log(
                          `\n  ✅ Found: ${teamData.name} (ID: ${team.id}) - ${offsidesPerMatch} offsides/match`
                        );
                      }

                      // Also check if name might be PPJ-related
                      const teamNameUpper = teamData.name.toUpperCase();
                      if (
                        teamNameUpper.includes('PPJ') ||
                        teamNameUpper.includes('P.P.J') ||
                        teamNameUpper.includes('P P J') ||
                        (teamNameUpper.includes('P') &&
                          teamNameUpper.includes('J') &&
                          teamData.name.length < 10)
                      ) {
                        console.log(
                          `\n  🔍 Potential PPJ match: ${teamData.name} (ID: ${team.id}) - ${offsidesPerMatch} offsides/match`
                        );

                        if (!teamsWithOffsides.find(t => t.id === team.id)) {
                          teamsWithOffsides.push({
                            id: team.id,
                            name: teamData.name,
                            country: teamData.country,
                            league: league.name,
                            offsides_per_match: offsidesPerMatch,
                            matches_played: teamData.stats.matches || 0,
                            note: 'Name matches PPJ pattern',
                          });
                        }
                      }
                    }
                  }
                } catch (error) {
                  // Skip individual team errors
                }
              }

              console.log(' ✓');
            } else {
              console.log(' ✗ No teams');
            }
          } catch (error) {
            console.log(' ✗ Error');
          }
        }
      }
    }

    console.log('\n\n📊 Results:');
    console.log('='.repeat(60));

    if (teamsWithOffsides.length > 0) {
      console.log(
        `Found ${teamsWithOffsides.length} team(s) with offsides statistics around 5.67:\n`
      );

      teamsWithOffsides.forEach((team, index) => {
        console.log(`${index + 1}. ${team.name}`);
        console.log(`   ID: ${team.id}`);
        console.log(`   Country: ${team.country}`);
        console.log(`   League: ${team.league}`);
        console.log(`   Offsides per match: ${team.offsides_per_match}`);
        console.log(`   Matches played: ${team.matches_played}`);
        if (team.note) {
          console.log(`   Note: ${team.note}`);
        }
        console.log('');
      });
    } else {
      console.log('No teams found with ~5.67 offsides per match.');
      console.log('\nPossible reasons:');
      console.log('1. PPJ might be in a league not included in chosen leagues');
      console.log('2. The statistic might be from a different season');
      console.log('3. The team might be listed under a different name');
    }
  } catch (error) {
    console.error('Error searching for teams:', error.message);
  }
}

findTeamByOffsides().catch(console.error);
