const axios = require('axios');
const API_KEY = process.env.FOOTYSTATS_API_KEY;
const BASE_URL = 'https://api.footystats.org/v3';

async function searchTeamsInAPI() {
  console.log('🔍 Searching for teams in FootyStats API\n');

  // Test a few team IDs to see what they return
  const testIds = [
    1, 2, 3, 4, 5, 10, 50, 100, 200, 300, 301, 302, 303, 304, 305, 500, 1000, 5000, 5569, 14524,
  ];

  console.log('Testing team IDs to find Manchester City and Inter Miami...\n');

  for (const id of testIds) {
    try {
      const response = await axios.get(`${BASE_URL}/team`, {
        params: {
          key: API_KEY,
          team_id: id,
        },
        timeout: 5000,
      });

      if (response.data.success && response.data.data && response.data.data.length > 0) {
        const team = response.data.data[0];
        console.log(
          `ID ${id}: ${team.name} (${team.country}) - Competition: ${team.competition_id}`
        );

        // If it's a team we're looking for
        if (
          team.name.toLowerCase().includes('manchester') ||
          team.name.toLowerCase().includes('miami') ||
          team.name.toLowerCase().includes('inter')
        ) {
          console.log(`  ✅ FOUND: ${team.name}`);
        }
      }
    } catch (error) {
      // Silently skip errors
    }
  }

  console.log('\n\nSearching in our cached leagues for England teams...');

  // Also check using our server's endpoint
  try {
    const leaguesResponse = await axios.get('http://localhost:3001/api/leagues/current', {
      headers: { 'x-api-key': API_KEY },
    });

    if (leaguesResponse.data.success) {
      const leagues = leaguesResponse.data.data;

      // Find England leagues
      const englandLeagues = leagues.filter(l => l.country === 'England');
      console.log(`\nFound ${englandLeagues.length} England leagues`);

      if (englandLeagues.length === 0) {
        console.log(
          '⚠️ No England leagues found in chosen leagues - this explains why Manchester City is not found!'
        );
        console.log('\nAll available countries:');
        const countries = [...new Set(leagues.map(l => l.country))].sort();
        countries.forEach(c => console.log(`  - ${c}`));
      }
    }
  } catch (error) {
    console.error('Error checking leagues:', error.message);
  }
}

searchTeamsInAPI();
