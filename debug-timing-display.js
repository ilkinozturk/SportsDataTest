// Debug script to check timing analytics display update
const axios = require('axios');

async function debugTimingDisplay() {
  try {
    console.log('Fetching team data for ID 836...\n');
    
    const response = await axios.get('http://localhost:3005/api/teams/data?teamId=836');
    
    if (response.data.success && response.data.data) {
      const stats = response.data.data.statistics || {};
      
      console.log('=== CHECKING TIMING DATA AVAILABILITY ===\n');
      
      // Overall data
      console.log('OVERALL DATA:');
      console.log('goals0_15:', stats.goals0_15, '(exists:', !!stats.goals0_15, ')');
      console.log('goals16_30:', stats.goals16_30, '(exists:', !!stats.goals16_30, ')');
      console.log('goals31_45:', stats.goals31_45, '(exists:', !!stats.goals31_45, ')');
      
      console.log('\nHOME DATA:');
      console.log('homeGoals0_15:', stats.homeGoals0_15, '(exists:', !!stats.homeGoals0_15, ')');
      console.log('homeGoals16_30:', stats.homeGoals16_30, '(exists:', !!stats.homeGoals16_30, ')');
      console.log('homeGoals31_45:', stats.homeGoals31_45, '(exists:', !!stats.homeGoals31_45, ')');
      
      console.log('\nAWAY DATA:');
      console.log('awayGoals0_15:', stats.awayGoals0_15, '(exists:', !!stats.awayGoals0_15, ')');
      console.log('awayGoals16_30:', stats.awayGoals16_30, '(exists:', !!stats.awayGoals16_30, ')');
      console.log('awayGoals31_45:', stats.awayGoals31_45, '(exists:', !!stats.awayGoals31_45, ')');
      
      // Test if the field names match exactly
      console.log('\n=== FIELD NAME VERIFICATION ===');
      console.log('\nExpected field names in goals-display.js:');
      const expectedHomeFields = [
        'homeGoals0_15', 'homeGoals16_30', 'homeGoals31_45',
        'homeGoals46_60', 'homeGoals61_75', 'homeGoals76_90'
      ];
      
      expectedHomeFields.forEach(field => {
        const hasField = field in stats;
        const value = stats[field];
        console.log(`${field}: ${hasField ? '✓ EXISTS' : '✗ MISSING'} (value: ${value})`);
      });
      
      // Check if statistics object structure
      console.log('\n=== OBJECT STRUCTURE ===');
      console.log('Type of stats:', typeof stats);
      console.log('Stats object keys count:', Object.keys(stats).length);
      console.log('Has homeGoals0_15:', 'homeGoals0_15' in stats);
      console.log('Has awayGoals0_15:', 'awayGoals0_15' in stats);
      
    } else {
      console.log('Failed to get team data');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

debugTimingDisplay();