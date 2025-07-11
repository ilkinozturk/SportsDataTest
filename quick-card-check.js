const axios = require('axios');

// Quick script to check what card fields are available in your API
async function quickCheck() {
  console.log('=== QUICK CARD FIELDS CHECK ===\n');
  
  try {
    // First, let's check if the server is running
    const testUrl = 'http://localhost:3001/api/teams/data?teamId=836';
    console.log(`Checking API at: ${testUrl}\n`);
    
    const response = await axios.get(testUrl);
    const data = response.data;
    
    if (!data.success) {
      console.error('API returned error:', data.error);
      return;
    }
    
    console.log(`Team: ${data.teamName}\n`);
    
    // Look for card fields in statistics
    if (data.statistics) {
      console.log('=== CARD FIELDS IN statistics ===');
      Object.keys(data.statistics).forEach(key => {
        if (key.toLowerCase().includes('card') || 
            key.toLowerCase().includes('yellow') || 
            key.toLowerCase().includes('red')) {
          console.log(`  ${key}: ${data.statistics[key]}`);
        }
      });
    }
    
    // Look in additional_info
    if (data.statistics?.additional_info) {
      console.log('\n=== CARD FIELDS IN additional_info ===');
      Object.keys(data.statistics.additional_info).forEach(key => {
        if (key.toLowerCase().includes('card') || 
            key.toLowerCase().includes('yellow') || 
            key.toLowerCase().includes('red')) {
          console.log(`  ${key}: ${data.statistics.additional_info[key]}`);
        }
      });
    }
    
    // Check for potential card fields with different naming
    console.log('\n=== CHECKING ALTERNATIVE NAMES ===');
    const alternativeNames = [
      // Direct card references
      'cards', 'card', 'Cards', 'Card',
      'totalCards', 'total_cards', 'TotalCards',
      'teamCards', 'team_cards', 'TeamCards',
      
      // For/Against patterns
      'cardsFor', 'cards_for', 'CardsFor',
      'cardsAgainst', 'cards_against', 'CardsAgainst',
      'cardsReceived', 'cards_received', 'CardsReceived',
      'cardsConceded', 'cards_conceded', 'CardsConceded',
      
      // Yellow/Red specific
      'yellowCards', 'yellow_cards', 'YellowCards',
      'redCards', 'red_cards', 'RedCards',
      'yellows', 'reds', 'Yellows', 'Reds',
      
      // Averages and totals
      'cardsAvg', 'cards_avg', 'CardsAvg',
      'cardsAverage', 'cards_average', 'CardsAverage',
      'cardsPerGame', 'cards_per_game', 'CardsPerGame',
      'cardsPerMatch', 'cards_per_match', 'CardsPerMatch',
      
      // Bookings
      'bookings', 'Bookings', 'booking',
      'bookingsFor', 'bookings_for', 'BookingsFor',
      'bookingsAgainst', 'bookings_against', 'BookingsAgainst'
    ];
    
    alternativeNames.forEach(name => {
      // Check in main statistics
      if (data.statistics && data.statistics[name] !== undefined) {
        console.log(`Found statistics.${name}: ${data.statistics[name]}`);
      }
      
      // Check in additional_info
      if (data.statistics?.additional_info && data.statistics.additional_info[name] !== undefined) {
        console.log(`Found additional_info.${name}: ${data.statistics.additional_info[name]}`);
      }
      
      // Check at root level
      if (data[name] !== undefined) {
        console.log(`Found data.${name}: ${data[name]}`);
      }
    });
    
    // Show all numeric fields that might be cards
    console.log('\n=== ALL NUMERIC FIELDS (potential card data) ===');
    if (data.statistics) {
      Object.entries(data.statistics).forEach(([key, value]) => {
        if (typeof value === 'number' && value > 0 && value < 1000) {
          console.log(`  statistics.${key}: ${value}`);
        }
      });
    }
    
    // Print raw data structure for manual inspection
    console.log('\n=== RAW DATA STRUCTURE (first level) ===');
    console.log('Root keys:', Object.keys(data).join(', '));
    
    if (data.statistics) {
      console.log('\nstatistics keys:', Object.keys(data.statistics).filter(k => !k.includes('_')).slice(0, 20).join(', '), '...');
    }
    
    if (data.statistics?.additional_info) {
      console.log('\nadditional_info keys:', Object.keys(data.statistics.additional_info).slice(0, 20).join(', '), '...');
    }
    
  } catch (error) {
    console.error('\nError:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.error('\n⚠️  Server is not running. Please start the server with: npm run dev');
    } else if (error.response) {
      console.error('Response error:', error.response.data);
    }
  }
}

// Run immediately
quickCheck();