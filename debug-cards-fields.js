const fetch = require('node-fetch');

async function debugCardsFields() {
    console.log('🔍 Debugging Cards Fields...\n');
    
    try {
        // Try to get a match first
        const dates = ['2024-12-15', '2024-12-14', '2024-12-13', '2024-12-12', '2024-12-11'];
        let matchFound = false;
        let match = null;
        
        for (const date of dates) {
            const res = await fetch(`http://localhost:3005/api/matches?date=${date}`);
            const data = await res.json();
            
            if (data.success && data.data && data.data.length > 0) {
                match = data.data[0];
                matchFound = true;
                console.log(`✅ Found match on ${date}: ${match.home_team} vs ${match.away_team}`);
                break;
            }
        }
        
        if (!matchFound) {
            console.log('❌ No matches found in recent dates');
            return;
        }
        
        // Get home team data
        console.log(`\n📋 Fetching data for ${match.home_team} (ID: ${match.home_team_id})...\n`);
        
        const teamRes = await fetch(`http://localhost:3005/api/teams/${match.home_team_id}/statistics`);
        const teamData = await teamRes.json();
        
        if (!teamData.success) {
            console.log('❌ Failed to fetch team data');
            return;
        }
        
        const data = teamData.data;
        
        // Check what's in the raw data
        console.log('📊 RAW DATA KEYS:');
        console.log('Root level keys:', Object.keys(data).join(', '));
        
        if (data.stats) {
            console.log('\nstats keys:', Object.keys(data.stats).filter(k => k.includes('card') || k.includes('Card')).join(', '));
        }
        
        if (data.statistics) {
            console.log('\nstatistics keys:', Object.keys(data.statistics).filter(k => k.includes('card') || k.includes('Card')).join(', '));
        }
        
        if (data.additional_info) {
            console.log('\nadditional_info keys:', Object.keys(data.additional_info).filter(k => k.includes('card') || k.includes('Card')).join(', '));
        }
        
        // Look for yellow/red cards specifically
        console.log('\n\n🟡 YELLOW CARD FIELDS:');
        findFields(data, 'yellow');
        
        console.log('\n\n🔴 RED CARD FIELDS:');
        findFields(data, 'red');
        
        // Look for total cards
        console.log('\n\n📊 TOTAL CARDS FIELDS:');
        findFields(data, 'totalCards');
        findFields(data, 'cardsTotal');
        findFields(data, 'cards_total');
        
        // Look for cards per match
        console.log('\n\n📈 CARDS PER MATCH FIELDS:');
        findFields(data, 'cardsPerMatch');
        findFields(data, 'cardsAVG');
        findFields(data, 'cardsTotalAVG');
        
        // Test the working over percentages
        console.log('\n\n✅ TESTING WORKING OVER PERCENTAGES:');
        const { TeamStatisticsExtractor } = require('./public/js/services/TeamStatisticsExtractor.js');
        
        const overPercentages = TeamStatisticsExtractor.extractCardsOverPercentages(data, 'home');
        console.log('Over percentages (home):', overPercentages);
        
        const overPercentagesAway = TeamStatisticsExtractor.extractCardsOverPercentages(data, 'away');
        console.log('Over percentages (away):', overPercentagesAway);
        
        // Now let's find the actual field names for Cards For and Against
        console.log('\n\n🎯 LOOKING FOR CARDS FOR/AGAINST PATTERNS:');
        
        // Common patterns for team's own cards
        const forPatterns = [
            'cardsFor', 'cards_for', 'teamCards', 'team_cards',
            'ownCards', 'own_cards', 'yellowCards', 'redCards',
            'cardsReceived', 'cards_received'
        ];
        
        console.log('\nTeam\'s own cards (For):');
        forPatterns.forEach(pattern => {
            findFields(data, pattern, true);
        });
        
        // Common patterns for opponent's cards
        const againstPatterns = [
            'cardsAgainst', 'cards_against', 'opponentCards', 'opponent_cards',
            'oppositionCards', 'opposition_cards', 'rivalCards', 'rival_cards',
            'concededCards', 'conceded_cards'
        ];
        
        console.log('\nOpponent\'s cards (Against):');
        againstPatterns.forEach(pattern => {
            findFields(data, pattern, true);
        });
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

function findFields(obj, pattern, silent = false, path = '') {
    const results = [];
    
    function search(o, p) {
        if (!o || typeof o !== 'object') return;
        
        Object.keys(o).forEach(key => {
            const currentPath = p ? `${p}.${key}` : key;
            
            if (key.toLowerCase().includes(pattern.toLowerCase())) {
                results.push({ path: currentPath, value: o[key] });
            }
            
            if (typeof o[key] === 'object' && o[key] !== null && !Array.isArray(o[key])) {
                search(o[key], currentPath);
            }
        });
    }
    
    search(obj, path);
    
    if (!silent && results.length > 0) {
        results.forEach(r => {
            console.log(`  ${r.path}: ${JSON.stringify(r.value)}`);
        });
    }
    
    return results;
}

debugCardsFields().catch(console.error);