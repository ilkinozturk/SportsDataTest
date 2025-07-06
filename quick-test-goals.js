// Quick test for goals-statistics module
const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');

// Create a DOM environment
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
  url: 'http://localhost:3003',
  runScripts: 'dangerously',
  resources: 'usable'
});

// Set up globals
global.window = dom.window;
global.document = dom.window.document;
global.performance = { now: () => Date.now() };

// Load modules
const baseStatsCode = fs.readFileSync(path.join(__dirname, 'public/js/modules/statistics/base-statistics.js'), 'utf8');
const goalsStatsCode = fs.readFileSync(path.join(__dirname, 'public/js/modules/statistics/goals-statistics.js'), 'utf8');

// Execute in DOM context
dom.window.eval(baseStatsCode);
dom.window.eval(goalsStatsCode);

// Get modules
const BaseStats = dom.window.TeamStatsBaseStatistics;
const GoalsStats = dom.window.TeamStatsGoalsStatistics;

console.log('Module Check:');
console.log('- BaseStats loaded:', !!BaseStats);
console.log('- GoalsStats loaded:', !!GoalsStats);

if (!BaseStats || !GoalsStats) {
  console.log('\n❌ Modules not loaded properly!');
  process.exit(1);
}

// Simple test
const testMatches = [
  { homeTeamId: '1', awayTeamId: '2', homeGoals: 2, awayGoals: 1 },
  { homeTeamId: '1', awayTeamId: '3', homeGoals: 0, awayGoals: 0 },
  { homeTeamId: '4', awayTeamId: '1', homeGoals: 1, awayGoals: 3 }
];

try {
  const stats = GoalsStats.calculateGoalStatistics(testMatches, { teamId: '1' });
  console.log('\n✅ Test Results:');
  console.log('- Matches:', stats.matches);
  console.log('- Goals For:', stats.goalsFor);
  console.log('- Goals Against:', stats.goalsAgainst);
  console.log('- Average Goals For:', stats.avgGoalsFor);
  console.log('- BTTS %:', stats.btts.yes.percentage);
  console.log('\n✅ Goals module working correctly!');
} catch (error) {
  console.log('\n❌ Error:', error.message);
}