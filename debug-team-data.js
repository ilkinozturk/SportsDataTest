const axios = require('axios');

async function debugTeamData() {
    try {
        // Fetch match details
        console.log('Fetching match details...');
        const matchResponse = await axios.get('http://localhost:3005/api/matches/4331086/details');
        const matchData = matchResponse.data.data;
        
        console.log(`Home Team: ${matchData.homeTeam.name} (ID: ${matchData.homeTeam.id})`);
        console.log(`Away Team: ${matchData.awayTeam.name} (ID: ${matchData.awayTeam.id})`);
        
        // Fetch home team data
        console.log('\nFetching home team data...');
        const homeTeamResponse = await axios.get(`http://localhost:3005/api/teams/data?teamId=${matchData.homeTeam.id}`);
        const homeTeamData = homeTeamResponse.data.data;
        
        console.log('\n=== HOME TEAM CONCEDED STATS ===');
        const homeStats = homeTeamData.statistics || {};
        console.log('seasonConcededAVG_home:', homeStats.seasonConcededAVG_home);
        console.log('seasonConcededNum_home:', homeStats.seasonConcededNum_home);
        console.log('concededAVGHT_home:', homeStats.concededAVGHT_home);
        console.log('concededAVG2H_home:', homeStats.concededAVG2H_home);
        console.log('seasonCSPercentage_home:', homeStats.seasonCSPercentage_home);
        
        console.log('\n=== HOME TEAM ADDITIONAL INFO ===');
        const homeAdditional = homeTeamData.additional_info || {};
        console.log('over05_conceded_percentage_home:', homeAdditional.over05_conceded_percentage_home);
        console.log('over15_conceded_percentage_home:', homeAdditional.over15_conceded_percentage_home);
        console.log('over25_conceded_percentage_home:', homeAdditional.over25_conceded_percentage_home);
        console.log('over35_conceded_percentage_home:', homeAdditional.over35_conceded_percentage_home);
        
        // Check for alternative field names
        console.log('\n=== CHECKING ALTERNATIVE FIELD NAMES ===');
        console.log('homeGoalsConceded:', homeStats.homeGoalsConceded);
        console.log('goalsConceded:', homeStats.goalsConceded);
        console.log('seasonConceded:', homeStats.seasonConceded);
        console.log('seasonConcededNum:', homeStats.seasonConcededNum);
        console.log('seasonConcededNum_overall:', homeStats.seasonConcededNum_overall);
        
    } catch (error) {
        console.error('Error:', error.message);
    }
}

debugTeamData();