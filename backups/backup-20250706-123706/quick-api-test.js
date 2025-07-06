// Quick API Test to understand data structure
const axios = require('axios');

const API_KEY = '29581005f929990bf13dc9c964200d537e484ee248f0ac2d0f76910a6ce7aae9';
const BASE_URL = 'https://api.football-data-api.com';

async function quickTest() {
  console.log('🧪 Quick FootyStats API Test');
  console.log('='.repeat(30));

  try {
    console.log('1. Testing league list...');
    const response = await axios.get(`${BASE_URL}/league-list`, {
      params: { key: API_KEY },
      timeout: 10000,
    });

    console.log('✅ Response Status:', response.status);
    console.log('📊 Rate Limit Info:');
    console.log('  - Limit:', response.headers['x-ratelimit-limit']);
    console.log('  - Remaining:', response.headers['x-ratelimit-remaining']);
    console.log('  - Reset:', response.headers['x-ratelimit-reset']);

    if (response.data && response.data.success) {
      const leagues = response.data.data;
      console.log(`📋 Total leagues: ${leagues.length}`);

      // Show structure of first few leagues
      console.log('\n📝 Sample league data structure:');
      console.log(JSON.stringify(leagues.slice(0, 3), null, 2));

      // Find major leagues by name
      console.log('\n🔍 Looking for major European leagues:');
      const majorLeagues = ['Premier League', 'La Liga', 'Bundesliga', 'Serie A', 'Ligue 1'];

      majorLeagues.forEach(leagueName => {
        const found = leagues.find(l => l.name && l.name.includes(leagueName));
        if (found) {
          console.log(`✅ ${leagueName}: Found - ID ${found.id} (${found.country})`);
        } else {
          console.log(`❌ ${leagueName}: Not found in subscription`);
        }
      });

      // Test accessing a specific league from the subscription
      if (leagues.length > 0) {
        const testLeague = leagues[0];
        console.log(`\n🧪 Testing data access for: ${testLeague.name} (ID: ${testLeague.id})`);

        try {
          const teamsResponse = await axios.get(`${BASE_URL}/league-teams`, {
            params: { key: API_KEY, league_id: testLeague.id },
            timeout: 10000,
          });

          if (teamsResponse.data && teamsResponse.data.success) {
            console.log(`✅ Teams data: ${teamsResponse.data.data.length} teams found`);
          } else {
            console.log(`❌ Teams data failed: ${teamsResponse.data.message}`);
          }
        } catch (error) {
          console.log(`❌ Teams request failed: ${error.response?.data?.message || error.message}`);
        }
      }
    } else {
      console.log('❌ API returned success: false');
      console.log('Response:', JSON.stringify(response.data, null, 2));
    }
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

quickTest();
