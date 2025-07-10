const TeamSearchService = require('./services/TeamSearchService');
const axios = require('axios');

const API_KEY =
  process.env.FOOTYSTATS_API_KEY ||
  '29581005f929990bf13dc9c964200d537e484ee248f0ac2d0f76910a6ce7aae9';
const BASE_URL = 'https://api.footystats.org/v3';

async function findPPJTeam() {
  const searchService = new TeamSearchService(API_KEY, BASE_URL);

  console.log('🔍 Searching for PPJ team...\n');

  // Search variations of PPJ
  const searchTerms = ['PPJ', 'P.P.J', 'PP J', 'P P J'];

  // Also check potential full names
  const potentialFullNames = [
    'PPJ',
    'Persepolis Pirouzi',
    'Paykan Pars',
    'Pars Jonoubi',
    'Persepolis',
    'Paykan',
    'Pars',
  ];

  console.log('Searching in all available leagues...\n');

  // First, get all available leagues
  try {
    const leaguesResponse = await axios.get(`${BASE_URL}/league-list`, {
      params: {
        key: API_KEY,
        chosen_leagues_only: true,
      },
    });

    if (leaguesResponse.data.success) {
      const leagues = leaguesResponse.data.data || [];
      const countries = [...new Set(leagues.map(l => l.country))].sort();

      console.log('Available countries in chosen leagues:');
      countries.forEach(c => console.log(`  - ${c}`));
      console.log('\n');
    }
  } catch (error) {
    console.error('Error fetching leagues:', error.message);
  }

  // Search for PPJ and variations
  for (const searchTerm of [...searchTerms, ...potentialFullNames]) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🔍 Searching for: "${searchTerm}"`);
    console.log('='.repeat(60));

    const results = await searchService.searchTeamInAllLeagues(searchTerm);

    if (results.length > 0) {
      console.log(`\n✅ Found ${results.length} potential matches:\n`);

      results.forEach((result, index) => {
        console.log(`${index + 1}. ${result.team.name}`);
        console.log(`   ID: ${result.team.id}`);
        console.log(`   League: ${result.league.name} (${result.league.country})`);
        console.log(`   Season: ${result.league.season}`);
        console.log(`   Match Score: ${(result.matchScore * 100).toFixed(0)}%`);
        console.log('');
      });
    }
  }

  // Also try a broader ID range search for teams with offsides stats around 5.67
  console.log('\n\n🔍 Searching for teams with ~5.67 offsides per match...');
  console.log('(This might help identify PPJ if it has this specific stat)\n');

  // Search through a range of team IDs
  const testRanges = [
    { start: 1, end: 100 },
    { start: 100, end: 500 },
    { start: 500, end: 1000 },
    { start: 1000, end: 2000 },
    { start: 2000, end: 3000 },
    { start: 3000, end: 4000 },
    { start: 4000, end: 5000 },
    { start: 5000, end: 6000 },
    { start: 6000, end: 7000 },
    { start: 7000, end: 8000 },
    { start: 8000, end: 9000 },
    { start: 9000, end: 10000 },
    { start: 10000, end: 11000 },
    { start: 11000, end: 12000 },
    { start: 12000, end: 13000 },
    { start: 13000, end: 14000 },
    { start: 14000, end: 15000 },
    { start: 15000, end: 16000 },
  ];

  console.log('Checking team IDs in ranges...');
  console.log('(Looking for teams with names containing P, J, or similar)\n');

  for (const range of testRanges) {
    process.stdout.write(`Checking IDs ${range.start}-${range.end}...`);

    let foundInRange = false;

    for (let id = range.start; id <= range.end; id += 10) {
      try {
        const response = await axios.get(`${BASE_URL}/team`, {
          params: {
            key: API_KEY,
            team_id: id,
          },
          timeout: 2000,
        });

        if (response.data.success && response.data.data && response.data.data.length > 0) {
          const team = response.data.data[0];
          const teamName = team.name.toUpperCase();

          // Check if team name contains P and J or matches PPJ pattern
          if (
            teamName.includes('PPJ') ||
            teamName.includes('P.P.J') ||
            teamName.includes('P P J') ||
            (teamName.includes('P') && teamName.includes('J') && teamName.length < 20)
          ) {
            if (!foundInRange) {
              console.log('\n');
              foundInRange = true;
            }
            console.log(`  ✓ ID ${id}: ${team.name} (${team.country})`);
          }
        }
      } catch (error) {
        // Silently skip errors
      }
    }

    if (!foundInRange) {
      console.log(' ✗ No matches');
    }
  }

  console.log('\n\n📝 Summary:');
  console.log('If PPJ was not found, it might be:');
  console.log('1. In a league that is not part of chosen leagues');
  console.log('2. Listed under a different name');
  console.log('3. A newer team with a higher ID number');
  console.log('\nYou mentioned PPJ should show 5.67 offsides per match.');
  console.log('This specific statistic might help identify the team if we check team statistics.');
}

findPPJTeam().catch(console.error);
