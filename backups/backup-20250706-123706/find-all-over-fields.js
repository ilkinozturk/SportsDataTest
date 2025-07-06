// Find ALL fields with "over" in the API response
const axios = require('axios');

async function findAllOverFields() {
  const API_KEY = '29581005f929990bf13dc9c964200d537e484ee248f0ac2d0f76910a6ce7aae9';
  const seasonId = 2012;

  try {
    console.log('Fetching data from API...');
    const response = await axios.get('https://api.football-data-api.com/league-teams', {
      params: {
        key: API_KEY,
        season_id: seasonId,
        include: 'stats',
      },
      headers: {
        'User-Agent': 'Mozilla/5.0',
        Accept: 'application/json',
      },
    });

    if (response.data.success && response.data.data) {
      const team = response.data.data.find(t => t.id === 836);

      if (team && team.stats) {
        console.log('=== ALL FIELDS WITH "over" IN STATS ===');
        Object.keys(team.stats)
          .filter(k => k.toLowerCase().includes('over'))
          .forEach(key => {
            console.log(`stats.${key}: ${team.stats[key]}`);
          });

        if (team.stats.additional_info) {
          console.log('\n=== ALL FIELDS WITH "over" IN ADDITIONAL_INFO ===');
          Object.keys(team.stats.additional_info)
            .filter(k => k.toLowerCase().includes('over'))
            .forEach(key => {
              console.log(`additional_info.${key}: ${team.stats.additional_info[key]}`);
            });

          // Look for any field that might represent over 0.5 cards for
          console.log('\n=== SEARCHING FOR POSSIBLE over 0.5 cards for fields ===');
          console.log('Looking for patterns like: over_0_5, over0_5, over_half, etc.');

          const patterns = ['0.5', '0_5', '05', 'half'];
          Object.keys(team.stats.additional_info).forEach(key => {
            const lowerKey = key.toLowerCase();
            if (
              patterns.some(p => lowerKey.includes(p)) &&
              lowerKey.includes('cards') &&
              lowerKey.includes('for')
            ) {
              console.log(`Found: ${key} = ${team.stats.additional_info[key]}`);
            }
          });

          // Check specific expected field names
          console.log('\n=== CHECKING SPECIFIC FIELD NAMES ===');
          const expectedFields = [
            'over05CardsForPercentage_overall',
            'over05CardsForPercentage_home',
            'over05CardsForPercentage_away',
            'over_0.5_cards_for_percentage_overall',
            'over_0.5_cards_for_percentage_home',
            'over_0.5_cards_for_percentage_away',
            'over_0_5_cards_for_percentage_overall',
            'over_half_cards_for_percentage_overall',
          ];

          expectedFields.forEach(field => {
            const value = team.stats.additional_info[field];
            if (value !== undefined) {
              console.log(`✓ ${field}: ${value}`);
            } else {
              console.log(`✗ ${field}: not found`);
            }
          });
        }
      }
    }
  } catch (error) {
    if (error.response) {
      console.error('API Error:', error.response.status);
      if (error.response.data) {
        console.error('Response:', JSON.stringify(error.response.data, null, 2));
      }
    } else {
      console.error('Error:', error.message);
    }
  }
}

findAllOverFields();
