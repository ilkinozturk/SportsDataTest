const axios = require('axios');
const ProcessorManager = require('./services/statistics/processors/ProcessorManager');
require('dotenv').config();

const API_KEY = process.env.FOOTYSTATS_API_KEY;
const BASE_URL = process.env.FOOTYSTATS_BASE_URL || 'https://api.football-data-api.com';

async function finalAllStatsTest() {
  try {
    console.log('🎯 FINAL ALLSTATS TEST - MAPPING HATASI KABUL EDİLMEZ\n');
    
    // 1. API'den RAW veri al
    const teamId = 836;
    const seasonId = 14153;
    const url = `${BASE_URL}/league-teams?key=${API_KEY}&season_id=${seasonId}&include=stats`;
    
    console.log('📡 API\'den veri alınıyor...');
    const response = await axios.get(url);
    const team = response.data.data.find(t => t.id === teamId);
    
    if (!team) {
      throw new Error('Team not found in API response');
    }
    
    console.log(`✅ Takım bulundu: ${team.name}\n`);
    
    // 2. Data sources hazırla - EXACTLY like teamDataService
    const dataSources = {
      stats: team.stats,
      additionalInfo: team.stats.additional_info || {}
    };
    
    console.log('📊 Veri kaynakları:');
    console.log(`  stats field count: ${Object.keys(dataSources.stats).length}`);
    console.log(`  additionalInfo field count: ${Object.keys(dataSources.additionalInfo).length}`);
    
    // 3. ProcessorManager ile işle
    console.log('\n🚀 ProcessorManager çalıştırılıyor...');
    const processorManager = new ProcessorManager();
    const result = processorManager.processAllStatistics(dataSources, [], teamId);
    
    console.log('✅ Processing tamamlandı\n');
    
    // 4. AllStats alanlarını kontrol et
    console.log('📋 ALLSTATS SONUÇLARI:');
    console.log('=======================\n');
    
    // HTML'deki AllStats alanları (kritik olanlar)
    const criticalFields = {
      // Basic Stats
      'winsPercentage': result.winsPercentage,
      'drawsPercentage': result.drawsPercentage, 
      'lossesPercentage': result.lossesPercentage,
      'goalsForPerMatch': result.goalsForPerMatch,
      'goalsAgainstPerMatch': result.goalsAgainstPerMatch,
      'cleanSheetsPercentage': result.cleanSheetsPercentage,
      'pointsPerGame': result.pointsPerGame,
      
      // Scored Per Game (All)
      'scoredPerMatchAll': result.scoredPerMatchAll,
      'minutesPerGoalAll': result.minutesPerGoalAll,
      'firstToScoreAll': result.firstToScoreAll,
      'highestScoredAll': result.highestScoredAll,
      
      // Corner Stats (All)
      'cornersEarnedPerMatch': result.cornersEarnedPerMatch,
      'cornersAgainstPerMatch': result.cornersAgainstPerMatch,
      'totalCornersPerMatch': result.totalCornersPerMatch,
      
      // Card Stats (All)
      'totalCards': result.totalCards,
      'cardsPerMatch': result.cardsPerMatch,
      'cardsHighest': result.cardsHighest,
      
      // xG Analysis (All)
      'xgForTotal': result.xgForTotal,
      'xgAgainstTotal': result.xgAgainstTotal,
      'xgDifference': result.xgDifference
    };
    
    let successCount = 0;
    let zeroCount = 0;
    let undefinedCount = 0;
    
    for (const [field, value] of Object.entries(criticalFields)) {
      const status = value === undefined ? '❌ UNDEFINED' : 
                    (value === 0 || value === '0.00' || value === '+0.00') ? '⚠️ ZERO' : 
                    '✅ OK';
      
      console.log(`  ${field}: ${value} ${status}`);
      
      if (value === undefined) undefinedCount++;
      else if (value === 0 || value === '0.00' || value === '+0.00') zeroCount++;
      else successCount++;
    }
    
    console.log('\n📊 SONUÇ RAPORU:');
    console.log('=================');
    console.log(`✅ Success: ${successCount}/${Object.keys(criticalFields).length}`);
    console.log(`⚠️ Zero Values: ${zeroCount}/${Object.keys(criticalFields).length}`);
    console.log(`❌ Undefined: ${undefinedCount}/${Object.keys(criticalFields).length}`);
    console.log(`🎯 Success Rate: ${Math.round((successCount / Object.keys(criticalFields).length) * 100)}%`);
    
    // 5. API raw data ile karşılaştır
    console.log('\n🔍 API RAW DATA KONTROLÜ:');
    console.log('==========================');
    console.log('API Stats field\'larından örnekler:');
    console.log(`  seasonWinsNum_overall: ${dataSources.stats.seasonWinsNum_overall}`);
    console.log(`  seasonMatchesPlayed_overall: ${dataSources.stats.seasonMatchesPlayed_overall}`);
    console.log(`  cardsTotal_overall: ${dataSources.stats.cardsTotal_overall}`);
    console.log(`  cornersAVG_overall: ${dataSources.stats.cornersAVG_overall}`);
    console.log(`  xgForAverage_overall: ${dataSources.stats.xgForAverage_overall}`);
    
    // 6. Mapping test
    console.log('\n🧪 MAPPING TEST:');
    console.log('=================');
    
    // Manual mapping test
    const manualWinsPercentage = dataSources.stats.seasonWinsNum_overall && dataSources.stats.seasonMatchesPlayed_overall ? 
      Math.round((dataSources.stats.seasonWinsNum_overall / dataSources.stats.seasonMatchesPlayed_overall) * 100) : 0;
    
    console.log(`Manual winsPercentage calculation: ${manualWinsPercentage}%`);
    console.log(`Processor winsPercentage result: ${result.winsPercentage}%`);
    console.log(`Mapping ${manualWinsPercentage === result.winsPercentage ? '✅ CORRECT' : '❌ WRONG'}`);
    
    if (successCount > 15) {
      console.log('\n🎉 BAŞARI! AllStats Processor DOĞRU ÇALIŞIYOR!');
    } else {
      console.log('\n⚠️ UYARI: Bazı alanlar eksik veya hatalı');
    }
    
  } catch (error) {
    console.error('❌ Test Error:', error.message);
    if (error.response) {
      console.error('API Response:', error.response.status, error.response.statusText);
    }
  }
}

finalAllStatsTest();