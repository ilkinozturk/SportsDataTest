/**
 * Debug script to compare modular system vs legacy system data processing
 * Tests the specific issue where goals-display module shows different data
 */

const fs = require('fs');
const path = require('path');

// Load the teamDataService
const TeamDataService = require('./services/teamDataService');
const teamDataService = new TeamDataService();

// Sample API data structure (based on actual API response)
const sampleApiData = {
  teamInfo: {
    id: 836,
    name: "Shanghai SIPG",
    image: "https://example.com/logo.png"
  },
  stats: {
    // Basic stats
    seasonMatchesPlayed_overall: 15,
    seasonScoredAVG_overall: 2.27,
    seasonConcededAVG_overall: 1.80,
    
    // 1st Half Goals Average - these are the fields used by goals-display.js
    seasonScoredAVGHT_overall: 0.8,  // This is what goals-display looks for
    scoredAVGHT_overall: 0.8,        // Alternative field name
    firstHalfGoalsAVG_overall: 0.8,  // Another alternative
    
    // 2nd Half Goals Average - these are the critical fields
    scored_2hg_avg_overall: 1.47,    // This is the primary field
    seasonScored2HAVG_overall: 1.47, // Alternative name
    secondHalfGoalsAVG_overall: 1.47, // Another alternative used by goals-display
    scoredAVG2H_overall: 1.47,      // Yet another alternative
    
    // Failed to score counts (important for percentage calculations)
    seasonFTSHT_overall: 3,  // Failed to score in 1st half (3 matches out of 15)
    seasonFTS2H_overall: 2,  // Failed to score in 2nd half (2 matches out of 15)
    
    // Total goals in halves
    scoredGoalsHT_overall: 12,   // Total 1st half goals
    scored_2hg_overall: 22,      // Total 2nd half goals
    
    // Additional fields that might be in additional_info
    additional_info: {
      scored_2hg_avg_overall: 1.47,
      scored_2hg_avg_home: 1.56,
      scored_2hg_avg_away: 1.38,
      fts_2hg_overall: 2,
      fts_2hg_percentage_overall: 13.33
    }
  }
};

console.log('🔍 Debug: Modular vs Legacy Data Processing Comparison\n');
console.log('Test Case: Goals Display Module Data Requirements');
console.log('================================================\n');

// Test 1: Process with legacy method
console.log('1️⃣ LEGACY PROCESSING (processStatisticsLegacy):');
console.log('-----------------------------------------------');
const legacyResult = teamDataService.processStatisticsLegacy(
  sampleApiData.stats,
  sampleApiData.stats.additional_info || {},
  [],
  836
);

console.log('Key fields for goals-display.js:');
console.log(`  seasonScoredAVG_overall: ${legacyResult.seasonScoredAVG_overall}`);
console.log(`  scoredAVGHT_overall: ${legacyResult.scoredAVGHT_overall}`);
console.log(`  scored_2hg_avg_overall: ${legacyResult.scored_2hg_avg_overall}`);
console.log(`  secondHalfGoalsAVG_overall: ${legacyResult.secondHalfGoalsAVG_overall}`);
console.log(`  scoredAVG2H_overall: ${legacyResult.scoredAVG2H_overall}`);
console.log(`  seasonFTSHT_overall: ${legacyResult.seasonFTSHT_overall}`);
console.log(`  seasonFTS2H_overall: ${legacyResult.seasonFTS2H_overall}`);
console.log(`  scored_2hg_overall: ${legacyResult.scored_2hg_overall}`);

// Test 2: Process with modular method
console.log('\n2️⃣ MODULAR PROCESSING (processStatisticsModular):');
console.log('-----------------------------------------------');
const modularResult = teamDataService.processStatisticsModular(
  sampleApiData,
  [],
  836
);

console.log('Key fields for goals-display.js:');
console.log(`  seasonScoredAVG_overall: ${modularResult.seasonScoredAVG_overall}`);
console.log(`  scoredAVGHT_overall: ${modularResult.scoredAVGHT_overall}`);
console.log(`  scored_2hg_avg_overall: ${modularResult.scored_2hg_avg_overall}`);
console.log(`  secondHalfGoalsAVG_overall: ${modularResult.secondHalfGoalsAVG_overall}`);
console.log(`  scoredAVG2H_overall: ${modularResult.scoredAVG2H_overall}`);
console.log(`  seasonFTSHT_overall: ${modularResult.seasonFTSHT_overall}`);
console.log(`  seasonFTS2H_overall: ${modularResult.seasonFTS2H_overall}`);
console.log(`  scored_2hg_overall: ${modularResult.scored_2hg_overall}`);

// Test 3: Check what the modular system returns through API transformation
console.log('\n3️⃣ MODULAR SYSTEM API RESPONSE STRUCTURE:');
console.log('-----------------------------------------------');
console.log('When the modular system returns data to the frontend:');

// Simulate what team-service.js transformApiResponse does
const transformedData = {
  teamId: sampleApiData.teamInfo?.id,
  teamName: sampleApiData.teamInfo?.name,
  teamLogo: sampleApiData.teamInfo?.image,
  stats: modularResult,
  statistics: modularResult,
  teamInfo: sampleApiData.teamInfo
};

console.log('The modular system returns:');
console.log(`  data.stats.scored_2hg_avg_overall: ${transformedData.stats.scored_2hg_avg_overall}`);
console.log(`  data.statistics.scored_2hg_avg_overall: ${transformedData.statistics.scored_2hg_avg_overall}`);

// Test 4: Verify what goals-display.js looks for
console.log('\n4️⃣ GOALS-DISPLAY.JS FIELD LOOKUP:');
console.log('-----------------------------------------------');
console.log('goals-display.js updateGoalsStatistics() looks for these fields:');
console.log('  For 2nd Half Average:');
console.log('    1. statistics.scored_2hg_avg_overall');
console.log('    2. statistics.seasonScored2HAVG_overall');
console.log('    3. statistics.secondHalfGoalsAVG_overall');
console.log('    4. statistics.scoredAVG2H_overall');
console.log('  For 1st Half Average:');
console.log('    1. statistics.seasonScoredAVGHT_overall');
console.log('    2. statistics.scoredAVGHT_overall');
console.log('    3. statistics.firstHalfGoalsAVG_overall');

// Test 5: Compare the two systems
console.log('\n5️⃣ COMPARISON RESULTS:');
console.log('-----------------------------------------------');
const fieldsToCompare = [
  'scored_2hg_avg_overall',
  'secondHalfGoalsAVG_overall',
  'scoredAVG2H_overall',
  'scoredAVGHT_overall',
  'firstHalfGoalsAVG_overall',
  'seasonFTSHT_overall',
  'seasonFTS2H_overall'
];

let differencesFound = false;
fieldsToCompare.forEach(field => {
  const legacyValue = legacyResult[field];
  const modularValue = modularResult[field];
  if (legacyValue !== modularValue) {
    console.log(`❌ DIFFERENCE in ${field}:`);
    console.log(`   Legacy: ${legacyValue}`);
    console.log(`   Modular: ${modularValue}`);
    differencesFound = true;
  } else {
    console.log(`✅ ${field}: ${legacyValue} (same in both)`);
  }
});

if (!differencesFound) {
  console.log('\n✅ All fields match between legacy and modular systems!');
} else {
  console.log('\n❌ Differences found between legacy and modular systems!');
  console.log('\n🔍 ANALYSIS:');
  console.log('The modular system might be missing mappings for:');
  console.log('- Alternative field names (seasonScored2HAVG_overall, etc.)');
  console.log('- Fields from additional_info object');
  console.log('- Calculated fields that the legacy system provides');
}

// Save results to file
const results = {
  timestamp: new Date().toISOString(),
  legacyResult: fieldsToCompare.reduce((acc, field) => {
    acc[field] = legacyResult[field];
    return acc;
  }, {}),
  modularResult: fieldsToCompare.reduce((acc, field) => {
    acc[field] = modularResult[field];
    return acc;
  }, {}),
  differencesFound
};

fs.writeFileSync(
  path.join(__dirname, 'debug-modular-vs-legacy-results.json'),
  JSON.stringify(results, null, 2)
);

console.log('\n📄 Results saved to debug-modular-vs-legacy-results.json');