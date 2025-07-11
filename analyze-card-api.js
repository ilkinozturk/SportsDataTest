// Comprehensive API field analysis for cards
const fetch = require('node-fetch');

const API_KEY = 'YOUR_API_KEY_HERE';
const BASE_URL = 'https://api.sportsdata.ai/v3/soccer/scores/json';

// Helper to find all fields with specific keywords
function findFieldsByKeywords(obj, keywords, path = '', results = {}) {
    if (!obj || typeof obj !== 'object') return results;
    
    for (const [key, value] of Object.entries(obj)) {
        const currentPath = path ? `${path}.${key}` : key;
        const lowerKey = key.toLowerCase();
        
        // Check if key contains any of our keywords
        for (const keyword of keywords) {
            if (lowerKey.includes(keyword.toLowerCase())) {
                if (!results[keyword]) results[keyword] = [];
                results[keyword].push({
                    path: currentPath,
                    field: key,
                    value: value,
                    type: Array.isArray(value) ? 'array' : typeof value
                });
                break;
            }
        }
        
        // Recursively search nested objects
        if (value && typeof value === 'object' && !Array.isArray(value)) {
            findFieldsByKeywords(value, keywords, currentPath, results);
        } else if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'object') {
            findFieldsByKeywords(value[0], keywords, `${currentPath}[0]`, results);
        }
    }
    
    return results;
}

// Analyze team statistics endpoint
async function analyzeTeamStatistics(teamId, competitionId) {
    console.log('\n=== TEAM STATISTICS ENDPOINT ===\n');
    
    try {
        // Try the team statistics endpoint
        const url = `${BASE_URL}/TeamSeasonStats/${competitionId}?key=${API_KEY}`;
        console.log(`Fetching from: ${url}\n`);
        
        const response = await fetch(url);
        const data = await response.json();
        
        // Find the specific team
        const teamStats = data.find(t => t.TeamId === teamId || t.Team?.TeamId === teamId);
        
        if (teamStats) {
            console.log(`Found stats for team: ${teamStats.Team?.Name || teamStats.Name}`);
            
            // Search for card-related fields
            const keywords = ['card', 'yellow', 'red', 'booking', 'caution', 'dismissal'];
            const fields = findFieldsByKeywords(teamStats, keywords);
            
            console.log('\n--- Card-related fields found ---');
            for (const [keyword, fieldList] of Object.entries(fields)) {
                console.log(`\n${keyword.toUpperCase()} fields:`);
                fieldList.forEach(f => {
                    console.log(`  ${f.path}: ${JSON.stringify(f.value)}`);
                });
            }
            
            // Check specific stat categories
            console.log('\n--- Checking stat categories ---');
            const statCategories = ['Stats', 'Statistics', 'AdditionalStats', 'TeamStats', 'SeasonStats'];
            
            for (const category of statCategories) {
                if (teamStats[category]) {
                    console.log(`\n${category} object found:`);
                    console.log(JSON.stringify(teamStats[category], null, 2));
                }
            }
        } else {
            console.log('Team not found in statistics data');
        }
        
    } catch (error) {
        console.error('Error fetching team statistics:', error.message);
    }
}

// Analyze standings endpoint for card data
async function analyzeStandings(competitionId) {
    console.log('\n=== STANDINGS ENDPOINT ===\n');
    
    try {
        const url = `${BASE_URL}/Standings/${competitionId}?key=${API_KEY}`;
        console.log(`Fetching from: ${url}\n`);
        
        const response = await fetch(url);
        const standings = await response.json();
        
        if (standings && standings.length > 0) {
            const firstTeam = standings[0];
            console.log(`Sample team: ${firstTeam.Name}`);
            
            // Look for card fields
            const keywords = ['card', 'yellow', 'red', 'YC', 'RC', 'booking'];
            const fields = findFieldsByKeywords(firstTeam, keywords);
            
            console.log('\n--- Card fields in standings ---');
            for (const [keyword, fieldList] of Object.entries(fields)) {
                if (fieldList.length > 0) {
                    console.log(`\n${keyword} fields:`);
                    fieldList.forEach(f => {
                        console.log(`  ${f.field}: ${f.value}`);
                    });
                }
            }
            
            // List all numeric fields (potential card stats)
            console.log('\n--- All numeric fields in standings ---');
            Object.entries(firstTeam).forEach(([key, value]) => {
                if (typeof value === 'number' && value > 0) {
                    console.log(`  ${key}: ${value}`);
                }
            });
        }
        
    } catch (error) {
        console.error('Error fetching standings:', error.message);
    }
}

// Analyze match details for card events
async function analyzeMatchDetails(matchId) {
    console.log('\n=== MATCH DETAILS / BOXSCORE ===\n');
    
    try {
        const url = `${BASE_URL}/BoxScore/${matchId}?key=${API_KEY}`;
        console.log(`Fetching from: ${url}\n`);
        
        const response = await fetch(url);
        const matchData = await response.json();
        
        // Check for card events
        if (matchData.YellowCards) {
            console.log(`Yellow Cards: ${matchData.YellowCards.length} events found`);
            if (matchData.YellowCards.length > 0) {
                console.log('Sample yellow card:', JSON.stringify(matchData.YellowCards[0], null, 2));
            }
        }
        
        if (matchData.RedCards) {
            console.log(`Red Cards: ${matchData.RedCards.length} events found`);
            if (matchData.RedCards.length > 0) {
                console.log('Sample red card:', JSON.stringify(matchData.RedCards[0], null, 2));
            }
        }
        
        // Check team game stats
        if (matchData.TeamGames) {
            console.log('\n--- Team Game Stats ---');
            matchData.TeamGames.forEach(teamGame => {
                console.log(`\n${teamGame.Team?.Name || teamGame.TeamName}:`);
                
                // Look for card-related fields
                const cardFields = {};
                Object.entries(teamGame).forEach(([key, value]) => {
                    if (key.toLowerCase().includes('card') || 
                        key.toLowerCase().includes('yellow') || 
                        key.toLowerCase().includes('red')) {
                        cardFields[key] = value;
                    }
                });
                
                if (Object.keys(cardFields).length > 0) {
                    console.log('Card fields:', cardFields);
                } else {
                    console.log('No card fields found');
                }
            });
        }
        
    } catch (error) {
        console.error('Error fetching match details:', error.message);
    }
}

// Main analysis function
async function runComprehensiveAnalysis() {
    console.log('SportsData.AI Card Fields Analysis');
    console.log('==================================\n');
    
    // Test with real IDs from your system
    const testTeamId = 516; // Manchester City
    const testCompetitionId = 1; // Premier League
    const testMatchId = 223456; // Sample match
    
    // Run all analyses
    await analyzeTeamStatistics(testTeamId, testCompetitionId);
    await analyzeStandings(testCompetitionId);
    await analyzeMatchDetails(testMatchId);
    
    console.log('\n\n=== SUMMARY ===');
    console.log('Check the output above to identify the correct field names for:');
    console.log('1. Team cards for (team\'s own cards)');
    console.log('2. Team cards against (opponent\'s cards received when playing this team)');
    console.log('3. Over percentages for cards');
    console.log('\nLook for fields like:');
    console.log('- YellowCards, RedCards');
    console.log('- CardsFor, CardsAgainst');
    console.log('- YellowCardsFor, YellowCardsAgainst');
    console.log('- TotalCards, TeamCards');
    console.log('- Any numeric fields that might represent card counts');
}

// Run the analysis
runComprehensiveAnalysis().catch(console.error);