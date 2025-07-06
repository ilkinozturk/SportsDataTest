const axios = require('axios');

const API_KEY = '29581005f929990bf13dc9c964200d537e484ee248f0ac2d0f76910a6ce7aae9';
const BASE_URL = 'https://api.football-data-api.com';

async function verifyTeamIds() {
  console.log('🔍 Verifying Team IDs...\n');

  const testTeamIds = [629, 836, 5520];

  for (const teamId of testTeamIds) {
    try {
      const teamResponse = await axios.get(`${BASE_URL}/team`, {
        params: {
          key: API_KEY,
          team_id: teamId,
        },
      });

      if (teamResponse.data.success && teamResponse.data.data.length > 0) {
        const team = teamResponse.data.data[0];
        console.log(`Team ID ${teamId}:`);
        console.log(`  Name: ${team.name}`);
        console.log(`  Country: ${team.country}`);
        console.log(`  Competition ID: ${team.competition_id}`);
        console.log('---');
      }
    } catch (error) {
      console.log(`Team ID ${teamId}: ❌ Error - ${error.message}`);
      console.log('---');
    }
  }
}

verifyTeamIds();