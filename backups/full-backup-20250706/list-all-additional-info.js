// List ALL fields in additional_info to find the correct field name
const fetch = require('node-fetch');

async function listAllAdditionalInfo() {
  try {
    const response = await fetch('http://localhost:3001/api/league-teams?seasonId=2012');
    const html = await response.text();

    // Try to extract JSON from HTML if needed
    let result;
    try {
      result = JSON.parse(html);
    } catch (e) {
      // If HTML, try to extract JSON from it
      const jsonMatch = html.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Could not parse response');
      }
    }

    if (result.success && result.data && result.data.teams) {
      const team = result.data.teams.find(t => t.id === 836);

      if (team && team.stats && team.stats.additional_info) {
        const additionalInfo = team.stats.additional_info;

        console.log('=== ALL FIELDS IN additional_info ===');
        console.log(`Total fields: ${Object.keys(additionalInfo).length}\n`);

        // Group by categories
        const cardsForFields = [];
        const overFields = [];
        const over05Fields = [];

        Object.keys(additionalInfo)
          .sort()
          .forEach(key => {
            const value = additionalInfo[key];

            if (key.toLowerCase().includes('cards') && key.toLowerCase().includes('for')) {
              cardsForFields.push({ key, value });
            }

            if (key.toLowerCase().includes('over')) {
              overFields.push({ key, value });
            }

            if (key.toLowerCase().includes('0') && key.toLowerCase().includes('5')) {
              over05Fields.push({ key, value });
            }
          });

        console.log('=== CARDS FOR FIELDS ===');
        cardsForFields.forEach(({ key, value }) => {
          console.log(`${key}: ${value}`);
        });

        console.log('\n=== FIELDS WITH "0" AND "5" ===');
        over05Fields.forEach(({ key, value }) => {
          console.log(`${key}: ${value}`);
        });

        console.log('\n=== ALL OVER FIELDS ===');
        overFields.slice(0, 20).forEach(({ key, value }) => {
          console.log(`${key}: ${value}`);
        });

        // Look for any pattern that might be over 0.5
        console.log('\n=== SEARCHING FOR PATTERNS ===');
        const patterns = [
          'over.*0.*5.*cards.*for',
          'cards.*for.*over.*0.*5',
          'over.*half.*cards.*for',
          'over.*05.*cards.*for',
        ];

        patterns.forEach(pattern => {
          const regex = new RegExp(pattern, 'i');
          const matches = Object.keys(additionalInfo).filter(k => regex.test(k));
          if (matches.length > 0) {
            console.log(`\nPattern "${pattern}" matches:`);
            matches.forEach(key => {
              console.log(`  ${key}: ${additionalInfo[key]}`);
            });
          }
        });
      }
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

listAllAdditionalInfo();
