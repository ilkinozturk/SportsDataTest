const TeamSearchService = require('./services/TeamSearchService');

const API_KEY = process.env.FOOTYSTATS_API_KEY;
const BASE_URL = 'https://api.footystats.org/v3';

async function searchAndFindTeams() {
  const searchService = new TeamSearchService(API_KEY, BASE_URL);

  console.log('🔍 Searching for correct team IDs...\n');

  // Search for specific teams
  const teamsToFind = [
    { name: 'Manchester City', country: 'England', wrongId: 4 },
    { name: 'Inter Miami', country: 'USA', wrongId: 5569 },
    { name: 'Miami', country: 'USA', wrongId: 5569 },
  ];

  for (const team of teamsToFind) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🔍 Searching for: ${team.name} (${team.country})`);
    console.log(`Currently returns wrong team with ID: ${team.wrongId}`);
    console.log('='.repeat(60));

    // Search in all leagues
    const results = await searchService.searchTeamInAllLeagues(team.name, team.country);

    if (results.length > 0) {
      console.log(`\n✅ Found ${results.length} potential matches:\n`);

      results.slice(0, 5).forEach((result, index) => {
        console.log(`${index + 1}. ${result.team.name}`);
        console.log(`   ID: ${result.team.id}`);
        console.log(`   League: ${result.league.name} (${result.league.country})`);
        console.log(`   Season: ${result.league.season}`);
        console.log(`   Match Score: ${(result.matchScore * 100).toFixed(0)}%`);
        console.log('');
      });
    } else {
      console.log('\n❌ No matches found in current leagues');

      // Try ID range search for Premier League teams
      if (team.country === 'England') {
        console.log('\nTrying ID range search (1-500)...');
        const rangeResults = await searchService.searchTeamsByIdRange(1, 500, team.name);

        if (rangeResults.length > 0) {
          console.log(`\n✅ Found in ID range:\n`);
          rangeResults.forEach(result => {
            console.log(`ID ${result.teamId}: ${result.team.name} (${result.team.country})`);
            console.log(`   Competition: ${result.team.competition_id}`);
            console.log(`   Match Score: ${(result.matchScore * 100).toFixed(0)}%`);
          });
        }
      }
    }
  }

  console.log('\n\n📝 Summary:');
  console.log('Manchester City and other Premier League teams are not in our chosen leagues.');
  console.log('We need to either:');
  console.log('1. Add Premier League to chosen leagues');
  console.log('2. Use ID range search to find them');
  console.log('3. Create a manual mapping for known problematic IDs');
}

searchAndFindTeams().catch(console.error);
