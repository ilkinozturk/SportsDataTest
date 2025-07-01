const axios = require('axios');
require('dotenv').config();

const API_KEY = process.env.FOOTYSTATS_API_KEY;
const BASE_URL = process.env.FOOTYSTATS_BASE_URL || 'https://api.football-data-api.com';

async function checkApiVsProcessor() {
  try {
    // 1. API'den RAW veri al
    const teamId = 836;
    const seasonId = 14153;
    const url = `${BASE_URL}/league-teams?key=${API_KEY}&season_id=${seasonId}&include=stats`;
    const response = await axios.get(url);
    const team = response.data.data.find(t => t.id === teamId);
    
    const stats = team.stats;
    const additionalInfo = stats.additional_info;
    
    console.log('=== API RAW VERİ KONTROLÜ ===\n');
    
    // Goals over percentages
    console.log('GOALS OVER PERCENTAGES (API):');
    console.log('  over05GoalsPercentage_overall:', stats.over05GoalsPercentage_overall);
    console.log('  over15GoalsPercentage_overall:', stats.over15GoalsPercentage_overall);
    console.log('  over25GoalsPercentage_overall:', stats.over25GoalsPercentage_overall);
    console.log('  over35GoalsPercentage_overall:', stats.over35GoalsPercentage_overall);
    
    // BTTS percentages
    console.log('\nBTTS PERCENTAGES (API):');
    console.log('  bttsNoPercentage_overall:', stats.bttsNoPercentage_overall);
    console.log('  bttsAndWinPercentage_overall (additional):', additionalInfo.btts_and_win_percentage_overall);
    console.log('  bttsAndDrawPercentage_overall (additional):', additionalInfo.btts_and_draw_percentage_overall);
    
    // Cards percentages
    console.log('\nCARDS FOR PERCENTAGES (API):');
    console.log('  over15CardsForPercentage_overall:', stats.over15CardsForPercentage_overall);
    console.log('  over25CardsForPercentage_overall:', stats.over25CardsForPercentage_overall);
    console.log('  over35CardsForPercentage_overall:', stats.over35CardsForPercentage_overall);
    
    // Cards highest
    console.log('\nCARDS HIGHEST (API):');
    console.log('  cardsForHighest_overall:', stats.cardsForHighest_overall);
    console.log('  cardsAgainstHighest_overall:', stats.cardsAgainstHighest_overall);
    
    // Shots
    console.log('\nSHOTS (API):');
    console.log('  shotsPerGoal_overall:', stats.shotsPerGoal_overall);
    console.log('  shotsOnTargetPerGoal_overall:', stats.shotsOnTargetPerGoal_overall);
    console.log('  shotsConversionRate_overall:', stats.shotsConversionRate_overall);
    
    // Half goals
    console.log('\nHALF GOALS (API):');
    console.log('  scored_1hg_avg_overall (additional):', additionalInfo.scored_1hg_avg_overall);
    console.log('  scored_1hg_overall (additional):', additionalInfo.scored_1hg_overall);
    
    // Goal timing
    console.log('\nGOAL TIMING (API):');
    console.log('  goals0_15_overall (additional):', additionalInfo.goals0_15_overall);
    console.log('  goals16_30_overall (additional):', additionalInfo.goals16_30_overall);
    
    // 2. Şimdi backend'den işlenmiş veri al
    console.log('\n=== BACKEND İŞLENMİŞ VERİ KONTROLÜ ===\n');
    
    const backendResponse = await axios.get('http://localhost:3001/api/teams/data?teamId=836');
    const backendStats = backendResponse.data.data.statistics;
    
    console.log('GOALS OVER PERCENTAGES (BACKEND):');
    console.log('  over05GoalsPercentage:', backendStats.over05GoalsPercentage);
    console.log('  over15GoalsPercentage:', backendStats.over15GoalsPercentage);
    console.log('  over25GoalsPercentage:', backendStats.over25GoalsPercentage);
    console.log('  over35GoalsPercentage:', backendStats.over35GoalsPercentage);
    
    console.log('\nBTTS PERCENTAGES (BACKEND):');
    console.log('  bttsNoPercentage:', backendStats.bttsNoPercentage);
    console.log('  bttsAndWinPercentage:', backendStats.bttsAndWinPercentage);
    console.log('  bttsAndDrawPercentage:', backendStats.bttsAndDrawPercentage);
    
    console.log('\nCARDS FOR PERCENTAGES (BACKEND):');
    console.log('  over15CardsForPercentage:', backendStats.over15CardsForPercentage);
    console.log('  over25CardsForPercentage:', backendStats.over25CardsForPercentage);
    console.log('  over35CardsForPercentage:', backendStats.over35CardsForPercentage);
    
    console.log('\nCARDS HIGHEST (BACKEND):');
    console.log('  cardsForHighest:', backendStats.cardsForHighest);
    console.log('  cardsAgainstHighest:', backendStats.cardsAgainstHighest);
    
    console.log('\nSHOTS (BACKEND):');
    console.log('  shotsPerGoal:', backendStats.shotsPerGoal);
    console.log('  shotsOnTargetPerGoal:', backendStats.shotsOnTargetPerGoal);
    console.log('  shotsConversionRate:', backendStats.shotsConversionRate);
    
    console.log('\nHALF GOALS (BACKEND):');
    console.log('  scored_1hg_avg_overall:', backendStats.scored_1hg_avg_overall);
    console.log('  scored_1hg_overall:', backendStats.scored_1hg_overall);
    
    console.log('\nGOAL TIMING (BACKEND):');
    console.log('  goals0_15:', backendStats.goals0_15);
    console.log('  goals16_30:', backendStats.goals16_30);
    
    console.log('\n=== FARK ANALİZİ ===');
    console.log('API\'de VAR, Backend\'de 0 olan alanlar:');
    
    if (stats.over15GoalsPercentage_overall && !backendStats.over15GoalsPercentage) {
      console.log('❌ over15GoalsPercentage: API=' + stats.over15GoalsPercentage_overall + ', Backend=' + backendStats.over15GoalsPercentage);
    }
    
    if (additionalInfo.btts_and_win_percentage_overall && !backendStats.bttsAndWinPercentage) {
      console.log('❌ bttsAndWinPercentage: API=' + additionalInfo.btts_and_win_percentage_overall + ', Backend=' + backendStats.bttsAndWinPercentage);
    }
    
    if (stats.over15CardsForPercentage_overall && !backendStats.over15CardsForPercentage) {
      console.log('❌ over15CardsForPercentage: API=' + stats.over15CardsForPercentage_overall + ', Backend=' + backendStats.over15CardsForPercentage);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkApiVsProcessor();