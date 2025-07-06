const axios = require('axios');

const API_KEY = '29581005f929990bf13dc9c964200d537e484ee248f0ac2d0f76910a6ce7aae9';
const BASE_URL = 'https://api.football-data-api.com';

async function listChosenLeagues() {
  console.log('📋 Listing all chosen leagues...\n');

  try {
    const response = await axios.get(`${BASE_URL}/league-list`, {
      params: {
        key: API_KEY,
        chosen_leagues_only: 'true',
      },
    });

    if (response.data.success && response.data.data) {
      const leagues = response.data.data;
      console.log(`Total chosen leagues: ${leagues.length}\n`);

      // Group by country
      const byCountry = {};
      // First, let's see the structure
      if (leagues.length > 0) {
        console.log('Sample league structure:', JSON.stringify(leagues[0], null, 2));
      }

      leagues.forEach(league => {
        const country = league.country || 'Unknown';
        if (!byCountry[country]) {
          byCountry[country] = [];
        }
        byCountry[country].push(league);
      });

      // Display leagues by country
      Object.keys(byCountry)
        .sort()
        .forEach(country => {
          console.log(`\n${country}:`);
          byCountry[country].forEach(league => {
            console.log(`  - ${league.name} (${league.season}) - ID: ${league.id}`);
          });
        });

      // Find a team from any available league
      console.log('\n\n🔍 Looking for a team from the first available league...');

      if (leagues.length > 0) {
        const firstLeague = leagues[0];
        console.log(`\nUsing ${firstLeague.name} (${firstLeague.country}) - ID: ${firstLeague.id}`);

        // Get teams
        const teamsResponse = await axios.get(`${BASE_URL}/league-teams`, {
          params: {
            key: API_KEY,
            season_id: firstLeague.id,
          },
        });

        if (teamsResponse.data.success && teamsResponse.data.data) {
          const teams = teamsResponse.data.data;
          console.log(`\nFound ${teams.length} teams`);
          console.log('\nFirst 5 teams:');
          teams.slice(0, 5).forEach(team => {
            console.log(`  - ${team.name} (ID: ${team.id})`);
          });

          if (teams.length > 0) {
            console.log(
              `\n✅ You can test with team ID: ${teams[0].id} in season ID: ${firstLeague.id}`
            );
          }
        }
      }
    } else {
      console.log('❌ No chosen leagues found');
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data.message);
    }
  }
}

listChosenLeagues();
