// Direct API test with exact documentation example
const axios = require('axios');

async function directAPITest() {
  const API_KEY = '29581005f929990bf13dc9c964200d537e484ee248f0ac2d0f76910a6ce7aae9';

  try {
    // Test with Premier League 2018/2019 (from docs)
    console.log('Testing Premier League 2018/2019 (season_id from docs)...\n');

    const response = await axios.get('https://api.football-data-api.com/league-teams', {
      params: {
        key: API_KEY,
        season_id: 1625, // Premier League 2018/2019 from docs
        include: 'stats',
      },
      headers: {
        'User-Agent': 'Mozilla/5.0',
      },
    });

    if (response.data.success && response.data.data) {
      // Find Arsenal (ID 59 from docs)
      const arsenal = response.data.data.find(t => t.id === 59);

      if (arsenal && arsenal.stats) {
        console.log('=== ARSENAL STATS ===');
        console.log('Team:', arsenal.name);

        // The documentation shows these exact fields
        console.log('\nChecking documentation fields:');
        console.log(
          'over05CardsForPercentage_overall:',
          arsenal.stats.over05CardsForPercentage_overall
        );
        console.log('over05CardsForPercentage_home:', arsenal.stats.over05CardsForPercentage_home);
        console.log('over05CardsForPercentage_away:', arsenal.stats.over05CardsForPercentage_away);

        // Check if it's in stats directly
        if (arsenal.stats.additional_info) {
          console.log('\nChecking additional_info:');
          console.log(
            'over05CardsForPercentage_overall:',
            arsenal.stats.additional_info.over05CardsForPercentage_overall
          );
          console.log(
            'over05CardsForPercentage_home:',
            arsenal.stats.additional_info.over05CardsForPercentage_home
          );
          console.log(
            'over05CardsForPercentage_away:',
            arsenal.stats.additional_info.over05CardsForPercentage_away
          );
        }

        // From docs we know it should be 92
        console.log('\nExpected value from docs: 92 (overall)');
      }
    }
  } catch (error) {
    if (error.response) {
      console.error('API Error:', error.response.status, error.response.statusText);
    } else {
      console.error('Error:', error.message);
    }
  }
}

directAPITest();
