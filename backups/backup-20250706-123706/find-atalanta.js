const axios = require('axios');

const API_KEY = '29581005f929990bf13dc9c964200d537e484ee248f0ac2d0f76910a6ce7aae9';
const BASE_URL = 'https://api.football-data-api.com';

async function findAtalanta() {
  console.log('🔍 Searching for Atalanta in Italian leagues...\n');

  try {
    // Get chosen leagues
    const leaguesResponse = await axios.get(`${BASE_URL}/league-list`, {
      params: {
        key: API_KEY,
        chosen_leagues_only: 'true',
        include_cup: 'false',
      },
    });

    if (leaguesResponse.data.success && leaguesResponse.data.data) {
      // Find Italian leagues
      const italianLeagues = leaguesResponse.data.data.filter(
        league => league.country === 'Italy' && league.name.includes('Serie A')
      );

      console.log(`Found ${italianLeagues.length} Italian Serie A seasons`);

      // Get most recent Serie A season
      const recentSeason = italianLeagues.sort((a, b) => {
        const yearA = parseInt(a.season?.split('/')[0] || '0');
        const yearB = parseInt(b.season?.split('/')[0] || '0');
        return yearB - yearA;
      })[0];

      if (recentSeason) {
        console.log(
          `\n✅ Using ${recentSeason.name} - ${recentSeason.season} (ID: ${recentSeason.id})`
        );

        // Get teams from this season
        const teamsResponse = await axios.get(`${BASE_URL}/league-teams`, {
          params: {
            key: API_KEY,
            season_id: recentSeason.id,
          },
        });

        if (teamsResponse.data.success && teamsResponse.data.data) {
          const teams = teamsResponse.data.data;

          // Find Atalanta
          const atalanta = teams.find(
            team =>
              team.name.toLowerCase().includes('atalanta') ||
              team.cleanName?.toLowerCase().includes('atalanta')
          );

          if (atalanta) {
            console.log(`\n✅ Found Atalanta!`);
            console.log(`   Name: ${atalanta.name}`);
            console.log(`   ID: ${atalanta.id}`);
            console.log(`   Clean Name: ${atalanta.cleanName}`);
            console.log(`   Season ID: ${recentSeason.id}`);

            // Test if we can get matches
            console.log('\n📅 Testing match retrieval...');
            const matchesResponse = await axios.get(`${BASE_URL}/league-matches`, {
              params: {
                key: API_KEY,
                season_id: recentSeason.id,
                max_per_page: 100,
              },
            });

            if (matchesResponse.data.success && matchesResponse.data.data) {
              const atalantaMatches = matchesResponse.data.data.filter(
                match => match.homeID === atalanta.id || match.awayID === atalanta.id
              );

              console.log(`✅ Found ${atalantaMatches.length} Atalanta matches`);

              if (atalantaMatches.length > 0) {
                const firstMatch = atalantaMatches[0];
                const isHome = firstMatch.homeID === atalanta.id;
                console.log(
                  `\nFirst match: ${isHome ? 'Atalanta' : `Team ${firstMatch.homeID}`} vs ${!isHome ? 'Atalanta' : `Team ${firstMatch.awayID}`}`
                );
                console.log(`Score: ${firstMatch.homeGoalCount}-${firstMatch.awayGoalCount}`);
              }
            }

            return {
              teamId: atalanta.id,
              seasonId: recentSeason.id,
              teamName: atalanta.name,
            };
          } else {
            console.log('❌ Atalanta not found in teams list');
            console.log(
              'Available teams:',
              teams
                .slice(0, 5)
                .map(t => t.name)
                .join(', '),
              '...'
            );
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

findAtalanta();
