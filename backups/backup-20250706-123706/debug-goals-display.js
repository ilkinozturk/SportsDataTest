/**
 * Debug script to check goals display module functionality
 */

// Check if modules are loaded
console.log('=== Goals Display Debug ===');
console.log('TeamStatsGoalsDisplay exists:', !!window.TeamStatsGoalsDisplay);
console.log('TeamStatsEventBus exists:', !!window.TeamStatsEventBus);
console.log('TeamStatsStateManager exists:', !!window.TeamStatsStateManager);

// Check if goals display is initialized
if (window.TeamStatsGoalsDisplay) {
    console.log('Goals Display initialized:', window.TeamStatsGoalsDisplay.initialized);
    console.log('Goals Display config:', window.TeamStatsGoalsDisplay.config);
    console.log('Goals Display state:', window.TeamStatsGoalsDisplay.state);
}

// Check for goal elements in DOM
const goalElements = [
    'scoredPerMatch', 'scoredPerMatchAll',
    'minutesPerGoal', 'minutesPerGoalAll',
    'scoredOver05', 'scoredOver05All',
    'scoredOver15', 'scoredOver15All',
    'scoredOver25', 'scoredOver25All',
    'scoredBothHalves', 'scoredBothHalvesAll',
    'firstToScore', 'firstToScoreAll',
    'failedToScore', 'failedToScoreGoals', 'failedToScoreGoalsAll',
    'highestScored', 'highestScoredAll',
    'penaltiesWon', 'penaltiesConceded'
];

console.log('\n=== Goal Elements in DOM ===');
goalElements.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
        console.log(`✓ ${id}: "${el.textContent}"`);
    } else {
        console.log(`✗ ${id}: NOT FOUND`);
    }
});

// Check state manager data
if (window.TeamStatsStateManager) {
    const stats = window.TeamStatsStateManager.get('statistics');
    console.log('\n=== Statistics in State ===');
    console.log('Has statistics:', !!stats);
    if (stats) {
        console.log('goalsForPerMatch:', stats.goalsForPerMatch);
        console.log('goalsFor:', stats.goalsFor);
        console.log('totalMatches:', stats.totalMatches);
        console.log('penaltiesWon:', stats.penaltiesWon);
        console.log('seasonScoredOver05Percentage_overall:', stats.seasonScoredOver05Percentage_overall);
        console.log('seasonScoredOver15Percentage_overall:', stats.seasonScoredOver15Percentage_overall);
        console.log('seasonScoredOver25Percentage_overall:', stats.seasonScoredOver25Percentage_overall);
    }
}

// Try to manually trigger update
if (window.TeamStatsGoalsDisplay && window.TeamStatsGoalsDisplay.updateGoalsStatistics) {
    console.log('\n=== Manually Triggering Update ===');
    const testStats = {
        goalsForPerMatch: 2.45,
        goalsFor: 73,
        totalMatches: 30,
        matches: 30,
        seasonScoredOver05Percentage_overall: 87,
        seasonScoredOver15Percentage_overall: 73,
        seasonScoredOver25Percentage_overall: 60,
        scoredBothHalvesPercentage_overall: 45,
        firstGoalScoredPercentage_overall: 65,
        failedToScorePercentage: 13,
        seasonHighestScored_overall: 5,
        penaltiesWon: 4,
        penaltiesConceded: 2
    };
    
    window.TeamStatsGoalsDisplay.updateGoalsStatistics(testStats, 'overall');
    console.log('Update triggered with test data');
    
    // Check if elements were updated
    setTimeout(() => {
        console.log('\n=== After Update ===');
        ['scoredPerMatch', 'scoredOver05', 'penaltiesWon'].forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                console.log(`${id}: "${el.textContent}"`);
            }
        });
    }, 100);
}

// Listen for events
if (window.TeamStatsEventBus) {
    console.log('\n=== Listening for Events ===');
    window.TeamStatsEventBus.on('data:team:loaded', (data) => {
        console.log('EVENT: data:team:loaded', data);
    });
    window.TeamStatsEventBus.on('filters:change', (data) => {
        console.log('EVENT: filters:change', data);
    });
}

console.log('\n=== Debug Complete ===');