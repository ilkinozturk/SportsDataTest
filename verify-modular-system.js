#!/usr/bin/env node
/**
 * Verify that the modular system is working correctly
 */

const axios = require('axios');

async function verifyModularSystem() {
    console.log('=== Verifying Modular System ===\n');
    
    try {
        // Test team 836
        const teamId = 836;
        console.log(`Testing with team ID: ${teamId}`);
        
        // Fetch team data from API
        const response = await axios.get(`http://localhost:3001/api/teams/data?teamId=${teamId}`);
        const data = response.data;
        
        if (!data.success) {
            console.error('API request failed:', data.error);
            return;
        }
        
        const stats = data.stats || data.statistics;
        console.log('\n✓ API Response received');
        console.log(`  Team: ${data.teamInfo?.name || 'Unknown'}`);
        console.log(`  League: ${data.league?.name || 'Unknown'}`);
        
        // Check key statistics that should be displayed
        console.log('\n=== Key Statistics ===');
        console.log(`Goals For Per Match: ${stats.goalsForPerMatch || 0}`);
        console.log(`Goals Against Per Match: ${stats.goalsAgainstPerMatch || 0}`);
        console.log(`Penalties Won: ${stats.penaltiesWon || 0}`);
        console.log(`Penalties Conceded: ${stats.penaltiesConceded || 0}`);
        
        // Check goal percentages
        console.log('\n=== Goal Percentages ===');
        console.log(`Scored Over 0.5: ${stats.seasonScoredOver05Percentage_overall || 0}%`);
        console.log(`Scored Over 1.5: ${stats.seasonScoredOver15Percentage_overall || 0}%`);
        console.log(`Scored Over 2.5: ${stats.seasonScoredOver25Percentage_overall || 0}%`);
        console.log(`Scored Both Halves: ${stats.scoredBothHalvesPercentage_overall || 0}%`);
        console.log(`First to Score: ${stats.firstGoalScoredPercentage_overall || 0}%`);
        console.log(`Failed to Score: ${stats.failedToScorePercentage || 0}%`);
        console.log(`Highest Scored: ${stats.seasonHighestScored_overall || 0} Goals`);
        
        // Check corners statistics
        console.log('\n=== Corners Statistics ===');
        console.log(`Corners For: ${stats.cornersFor || stats.cornersAVG_overall || 0}`);
        console.log(`Corners Against: ${stats.cornersAgainst || stats.cornersAgainstAVG_overall || 0}`);
        console.log(`Over 9.5 Corners: ${stats.over95Corners || 0}%`);
        console.log(`Over 10.5 Corners: ${stats.over105Corners || 0}%`);
        
        // Check cards statistics
        console.log('\n=== Cards Statistics ===');
        console.log(`Cards Total: ${stats.cardsTotal_overall || 0}`);
        console.log(`Cards Per Match: ${stats.cardsAVG_overall || 0}`);
        console.log(`Cards For: ${stats.cardsFor || 0}`);
        console.log(`Cards Against: ${stats.cardsAgainst || 0}`);
        
        console.log('\n✓ All statistics retrieved successfully');
        console.log('\nNOTE: If these values appear in the API but not on the webpage,');
        console.log('check that the display modules are properly updating the DOM elements.');
        
    } catch (error) {
        console.error('Error:', error.message);
        if (error.code === 'ECONNREFUSED') {
            console.error('\nMake sure the server is running on http://localhost:3001');
        }
    }
}

// Run verification
verifyModularSystem();