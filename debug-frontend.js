// Debug script to check frontend data flow
console.log('🔍 Starting frontend debug...');

// Test API endpoint
fetch('/api/teams/data?teamId=836')
  .then(response => response.json())
  .then(data => {
    console.log('📊 API Response:', data);
    
    if (data.success) {
      console.log('✅ API call successful');
      console.log('📋 Team Info:', data.data.teamInfo);
      console.log('📊 Statistics keys:', Object.keys(data.data.statistics));
      
      // Check specific AllStats fields
      const stats = data.data.statistics;
      console.log('🎯 Key AllStats fields:');
      console.log('  - pointsPerGame:', stats.pointsPerGame);
      console.log('  - goalsForPerMatch:', stats.goalsForPerMatch);
      console.log('  - winPercentage:', stats.winPercentage);
      console.log('  - cards1H_AVG_overall:', stats.cards1H_AVG_overall);
      
      // Check if mainStatsTitle element exists
      const titleElement = document.getElementById('mainStatsTitle');
      if (titleElement) {
        console.log('✅ mainStatsTitle element found:', titleElement.textContent);
        
        // Try to update it manually
        titleElement.textContent = `2025 ${data.data.teamInfo.name} Statistics`;
        console.log('🔄 Updated title to:', titleElement.textContent);
      } else {
        console.error('❌ mainStatsTitle element not found!');
      }
      
      // Check if displayDetailedTeamData function exists
      if (typeof displayDetailedTeamData === 'function') {
        console.log('✅ displayDetailedTeamData function exists');
        
        // Call it manually
        displayDetailedTeamData(data.data);
        console.log('🔄 Called displayDetailedTeamData manually');
      } else {
        console.error('❌ displayDetailedTeamData function not found!');
      }
      
    } else {
      console.error('❌ API call failed:', data.error);
    }
  })
  .catch(error => {
    console.error('❌ Error:', error);
  });