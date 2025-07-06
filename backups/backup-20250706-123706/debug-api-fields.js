const axios = require('axios');
require('dotenv').config();

const API_KEY = process.env.FOOTYSTATS_API_KEY;
const BASE_URL = process.env.FOOTYSTATS_BASE_URL || 'https://api.football-data-api.com';

async function debugApiFields() {
  try {
    console.log('🔍 API FIELD DEBUG - Shanghai SIPG FC\n');
    
    const teamId = 836;
    const seasonId = 14153;
    const url = `${BASE_URL}/league-teams?key=${API_KEY}&season_id=${seasonId}&include=stats`;
    
    const response = await axios.get(url);
    const team = response.data.data.find(t => t.id === teamId);
    const stats = team.stats;
    
    console.log('🎯 ARANAN FIELD\'LAR ve GERÇEKTEKİ KARŞILIKLARI:\n');
    
    // Goals fields
    console.log('⚽ GOALS:');
    console.log(`  seasonGoalsAverage_overall: ${stats.seasonGoalsAverage_overall}`);
    console.log(`  seasonScoredAVG_overall: ${stats.seasonScoredAVG_overall}`);
    console.log(`  seasonGoalsNum_overall: ${stats.seasonGoalsNum_overall}`);
    console.log(`  seasonScoredNum_overall: ${stats.seasonScoredNum_overall}`);
    console.log(`  seasonConcededAverage_overall: ${stats.seasonConcededAverage_overall}`);
    console.log(`  seasonConcededAVG_overall: ${stats.seasonConcededAVG_overall}`);
    
    // PPG fields
    console.log('\n📊 PPG:');
    console.log(`  ppgOverall: ${stats.ppgOverall}`);
    console.log(`  seasonPPG_overall: ${stats.seasonPPG_overall}`);
    console.log(`  ppg_overall: ${stats.ppg_overall}`);
    
    // xG fields
    console.log('\n📈 XG:');
    console.log(`  xgForAverage_overall: ${stats.xgForAverage_overall}`);
    console.log(`  xgFor_overall: ${stats.xgFor_overall}`);
    console.log(`  xgForPerMatch_overall: ${stats.xgForPerMatch_overall}`);
    console.log(`  xgAgainstAverage_overall: ${stats.xgAgainstAverage_overall}`);
    console.log(`  xgAgainst_overall: ${stats.xgAgainst_overall}`);
    console.log(`  xgAgainstPerMatch_overall: ${stats.xgAgainstPerMatch_overall}`);
    
    // Highest scored
    console.log('\n🎯 HIGHEST:');
    console.log(`  seasonHighestScored_overall: ${stats.seasonHighestScored_overall}`);
    console.log(`  highestScored_overall: ${stats.highestScored_overall}`);
    console.log(`  seasonHighestScored: ${stats.seasonHighestScored}`);
    
    // Goal fields kontrol
    console.log('\n🧪 GOALS HESAPLAMA TEST:');
    if (stats.seasonScoredNum_overall && stats.seasonMatchesPlayed_overall) {
      const calculatedGoalsPerMatch = (stats.seasonScoredNum_overall / stats.seasonMatchesPlayed_overall).toFixed(2);
      console.log(`  Manual calculation: ${stats.seasonScoredNum_overall} / ${stats.seasonMatchesPlayed_overall} = ${calculatedGoalsPerMatch}`);
      console.log(`  seasonScoredAVG_overall: ${stats.seasonScoredAVG_overall}`);
    }
    
    // Search for goal-related fields
    console.log('\n🔍 TÜM GOAL RELATED FIELDS:');
    const goalFields = Object.keys(stats).filter(key => 
      key.toLowerCase().includes('goal') || 
      key.toLowerCase().includes('scored') ||
      key.toLowerCase().includes('conceded')
    ).slice(0, 20); // İlk 20'si
    
    goalFields.forEach(field => {
      console.log(`  ${field}: ${stats[field]}`);
    });
    
    // Search for xG fields
    console.log('\n🔍 TÜM XG RELATED FIELDS:');
    const xgFields = Object.keys(stats).filter(key => 
      key.toLowerCase().includes('xg')
    );
    
    xgFields.forEach(field => {
      console.log(`  ${field}: ${stats[field]}`);
    });
    
    // Search for ppg fields
    console.log('\n🔍 TÜM PPG RELATED FIELDS:');
    const ppgFields = Object.keys(stats).filter(key => 
      key.toLowerCase().includes('ppg')
    );
    
    ppgFields.forEach(field => {
      console.log(`  ${field}: ${stats[field]}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

debugApiFields();