const fetch = require('node-fetch');

const API_BASE_URL = 'http://localhost:3005/api';

async function findCardFields() {
    console.log('🔍 Searching for correct card field names in API...\n');
    
    try {
        // Get some team IDs from matches
        const matchesResponse = await fetch(`${API_BASE_URL}/matches?date=2025-01-11`);
        const matchesData = await matchesResponse.json();
        
        if (!matchesData.success || !matchesData.data || matchesData.data.length === 0) {
            console.log('❌ No matches found. Trying with a specific team ID...');
            return;
        }
        
        const match = matchesData.data[0];
        console.log(`📋 Using match: ${match.home_team} vs ${match.away_team}\n`);
        
        // Get team statistics
        const homeTeamResponse = await fetch(`${API_BASE_URL}/teams/${match.home_team_id}/statistics`);
        const homeTeamData = await homeTeamResponse.json();
        
        if (!homeTeamData.success) {
            console.log('❌ Failed to fetch team data');
            return;
        }
        
        const data = homeTeamData.data;
        console.log('✅ Team data fetched successfully\n');
        
        // Search for card-related fields
        console.log('🎯 SEARCHING FOR CARD FIELDS:\n');
        
        const cardFields = {
            root: [],
            stats: [],
            statistics: [],
            additional_info: []
        };
        
        // Search in root level
        Object.keys(data).forEach(key => {
            if (key.toLowerCase().includes('card')) {
                cardFields.root.push({ key, value: data[key] });
            }
        });
        
        // Search in stats
        if (data.stats) {
            Object.keys(data.stats).forEach(key => {
                if (key.toLowerCase().includes('card')) {
                    cardFields.stats.push({ key, value: data.stats[key] });
                }
            });
        }
        
        // Search in statistics
        if (data.statistics) {
            Object.keys(data.statistics).forEach(key => {
                if (key.toLowerCase().includes('card')) {
                    cardFields.statistics.push({ key, value: data.statistics[key] });
                }
            });
        }
        
        // Search in additional_info
        if (data.additional_info) {
            Object.keys(data.additional_info).forEach(key => {
                if (key.toLowerCase().includes('card')) {
                    cardFields.additional_info.push({ key, value: data.additional_info[key] });
                }
            });
        }
        
        // Display results
        console.log('📊 ROOT LEVEL CARD FIELDS:');
        if (cardFields.root.length > 0) {
            cardFields.root.forEach(field => {
                console.log(`  ${field.key}: ${JSON.stringify(field.value)}`);
            });
        } else {
            console.log('  None found');
        }
        
        console.log('\n📊 STATS CARD FIELDS:');
        if (cardFields.stats.length > 0) {
            cardFields.stats.forEach(field => {
                console.log(`  stats.${field.key}: ${JSON.stringify(field.value)}`);
            });
        } else {
            console.log('  None found');
        }
        
        console.log('\n📊 STATISTICS CARD FIELDS:');
        if (cardFields.statistics.length > 0) {
            cardFields.statistics.forEach(field => {
                console.log(`  statistics.${field.key}: ${JSON.stringify(field.value)}`);
            });
        } else {
            console.log('  None found');
        }
        
        console.log('\n📊 ADDITIONAL_INFO CARD FIELDS:');
        if (cardFields.additional_info.length > 0) {
            cardFields.additional_info.forEach(field => {
                console.log(`  additional_info.${field.key}: ${JSON.stringify(field.value)}`);
            });
        } else {
            console.log('  None found');
        }
        
        // Look for specific patterns
        console.log('\n\n🔎 SEARCHING FOR SPECIFIC PATTERNS:\n');
        
        const patterns = [
            'cardsFor', 'cards_for', 'teamCards', 'team_cards',
            'cardsAgainst', 'cards_against', 'opponentCards', 'opponent_cards',
            'yellowCards', 'yellow_cards', 'redCards', 'red_cards',
            'cardsPerMatch', 'cards_per_match', 'cardsAverage', 'cards_average',
            'homeCards', 'home_cards', 'awayCards', 'away_cards'
        ];
        
        patterns.forEach(pattern => {
            const found = searchPattern(data, pattern);
            if (found.length > 0) {
                console.log(`✅ Pattern "${pattern}" found:`);
                found.forEach(f => console.log(`   ${f.path}: ${f.value}`));
            }
        });
        
        // Check for over percentages
        console.log('\n\n📈 SEARCHING FOR OVER PERCENTAGES:\n');
        
        const overPatterns = [
            'over05Cards', 'over15Cards', 'over25Cards', 'over35Cards',
            'cardsOver05', 'cardsOver15', 'cardsOver25', 'cardsOver35'
        ];
        
        overPatterns.forEach(pattern => {
            const found = searchPattern(data, pattern);
            if (found.length > 0) {
                console.log(`✅ Pattern "${pattern}" found:`);
                found.forEach(f => console.log(`   ${f.path}: ${f.value}`));
            }
        });
        
        // Log the entire structure for manual inspection
        console.log('\n\n📋 FULL DATA STRUCTURE (first 3 levels):');
        console.log(JSON.stringify(data, null, 2).substring(0, 2000) + '...');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

function searchPattern(obj, pattern, path = '') {
    const results = [];
    const lowerPattern = pattern.toLowerCase();
    
    for (const key in obj) {
        const lowerKey = key.toLowerCase();
        const currentPath = path ? `${path}.${key}` : key;
        
        if (lowerKey.includes(lowerPattern)) {
            results.push({ path: currentPath, value: obj[key] });
        }
        
        if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
            results.push(...searchPattern(obj[key], pattern, currentPath));
        }
    }
    
    return results;
}

// Run the diagnostic
findCardFields().catch(console.error);