// Find Working Leagues in FootyStats Subscription
const axios = require('axios');
const fs = require('fs');

const API_KEY = '29581005f929990bf13dc9c964200d537e484ee248f0ac2d0f76910a6ce7aae9';
const BASE_URL = 'https://api.football-data-api.com';

async function makeRequest(endpoint, params = {}) {
  try {
    const response = await axios.get(`${BASE_URL}${endpoint}`, {
      params: { key: API_KEY, ...params },
      timeout: 15000,
    });
    return {
      success: true,
      status: response.status,
      data: response.data,
      headers: response.headers,
    };
  } catch (error) {
    return {
      success: false,
      status: error.response?.status,
      error: error.message,
      data: error.response?.data,
    };
  }
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function findWorkingLeagues() {
  console.log('🔍 FINDING WORKING LEAGUES IN SUBSCRIPTION');
  console.log('='.repeat(50));

  // Get all leagues
  const leaguesResponse = await makeRequest('/league-list');
  if (!leaguesResponse.success || !leaguesResponse.data?.success) {
    console.log('❌ Failed to get leagues');
    return;
  }

  const leagues = leaguesResponse.data.data;
  console.log(`📋 Testing ${leagues.length} leagues in subscription...`);
  console.log(
    `⏱️  Rate Limit: ${leaguesResponse.headers['x-ratelimit-remaining']}/${leaguesResponse.headers['x-ratelimit-limit']}`
  );

  const workingLeagues = [];
  const failedLeagues = [];

  // Test a reasonable sample of leagues (don't test all 1695 - that would take forever)
  const testLeagues = leagues.slice(0, 50); // Test first 50 leagues

  console.log(`\n🧪 Testing first ${testLeagues.length} leagues for data access...`);
  console.log('(This may take a few minutes due to rate limiting)\n');

  for (let i = 0; i < testLeagues.length; i++) {
    const league = testLeagues[i];

    // Get the most recent season
    const currentSeason = league.season.reduce((latest, season) =>
      season.year > latest.year ? season : latest
    );

    process.stdout.write(
      `\r🧪 Testing ${i + 1}/${testLeagues.length}: ${league.name} (${league.country})...`
    );

    // Test teams endpoint
    const teamsResponse = await makeRequest('/league-teams', { league_id: currentSeason.id });

    if (teamsResponse.success && teamsResponse.data?.success) {
      const teamCount = teamsResponse.data.data?.length || 0;

      if (teamCount > 0) {
        workingLeagues.push({
          name: league.name,
          country: league.country,
          seasonId: currentSeason.id,
          seasonYear: currentSeason.year,
          teams: teamCount,
          category: categorizeLeague(league.name, league.country),
        });

        console.log(
          `\n✅ ${league.name} (${league.country}) - ${teamCount} teams - Season ID: ${currentSeason.id}`
        );
      }
    } else {
      failedLeagues.push({
        name: league.name,
        country: league.country,
        seasonId: currentSeason.id,
        error: teamsResponse.data?.message || teamsResponse.error,
      });
    }

    // Rate limiting - be conservative
    await delay(2000); // 2 seconds between requests
  }

  console.log('\n\n🎯 WORKING LEAGUES FOUND:');
  console.log('='.repeat(50));

  // Group by category
  const categories = {
    'Top European': [],
    'Other European': [],
    'North American': [],
    'South American': [],
    Asian: [],
    African: [],
    Other: [],
  };

  workingLeagues.forEach(league => {
    categories[league.category].push(league);
  });

  Object.keys(categories).forEach(category => {
    if (categories[category].length > 0) {
      console.log(`\n🏆 ${category.toUpperCase()}:`);
      categories[category].forEach(league => {
        console.log(`   • ${league.name} (${league.country})`);
        console.log(
          `     Season ID: ${league.seasonId} | Teams: ${league.teams} | Year: ${league.seasonYear}`
        );
      });
    }
  });

  console.log(`\n📊 SUMMARY:`);
  console.log(`• Working leagues found: ${workingLeagues.length}`);
  console.log(`• Failed leagues: ${failedLeagues.length}`);
  console.log(`• Success rate: ${Math.round((workingLeagues.length / testLeagues.length) * 100)}%`);

  // Save detailed results
  const results = {
    timestamp: new Date().toISOString(),
    summary: {
      totalTested: testLeagues.length,
      working: workingLeagues.length,
      failed: failedLeagues.length,
      successRate: Math.round((workingLeagues.length / testLeagues.length) * 100),
    },
    workingLeagues,
    categories,
    rateLimit: {
      limit: leaguesResponse.headers['x-ratelimit-limit'],
      remaining: leaguesResponse.headers['x-ratelimit-remaining'],
    },
  };

  try {
    fs.writeFileSync('/mnt/d/SportsData.Ai/working-leagues.json', JSON.stringify(results, null, 2));
    console.log('\n📄 Detailed results saved to working-leagues.json');
  } catch (error) {
    console.log(`\n❌ Failed to save results: ${error.message}`);
  }

  if (workingLeagues.length > 0) {
    console.log('\n🔧 RECOMMENDED SEASON IDS FOR YOUR APPLICATION:');
    console.log('Update your constants/index.ts with these working season IDs:');
    console.log('\nexport const WORKING_LEAGUES = {');
    workingLeagues.slice(0, 10).forEach(league => {
      const safeName = league.name.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase();
      console.log(
        `  ${safeName}: ${league.seasonId}, // ${league.name} (${league.country}) - ${league.teams} teams`
      );
    });
    console.log('} as const;');
  }

  return results;
}

function categorizeLeague(name, country) {
  const nameCountry = `${name} ${country}`.toLowerCase();

  if (nameCountry.includes('premier league') && nameCountry.includes('england'))
    return 'Top European';
  if (nameCountry.includes('la liga') && nameCountry.includes('spain')) return 'Top European';
  if (nameCountry.includes('bundesliga') && nameCountry.includes('germany')) return 'Top European';
  if (nameCountry.includes('serie a') && nameCountry.includes('italy')) return 'Top European';
  if (nameCountry.includes('ligue 1') && nameCountry.includes('france')) return 'Top European';

  if (
    country.toLowerCase().includes('england') ||
    country.toLowerCase().includes('spain') ||
    country.toLowerCase().includes('germany') ||
    country.toLowerCase().includes('italy') ||
    country.toLowerCase().includes('france') ||
    country.toLowerCase().includes('netherlands') ||
    country.toLowerCase().includes('portugal') ||
    country.toLowerCase().includes('belgium') ||
    country.toLowerCase().includes('europe')
  ) {
    return 'Other European';
  }

  if (
    country.toLowerCase().includes('usa') ||
    country.toLowerCase().includes('canada') ||
    country.toLowerCase().includes('mexico')
  ) {
    return 'North American';
  }

  if (
    country.toLowerCase().includes('brazil') ||
    country.toLowerCase().includes('argentina') ||
    country.toLowerCase().includes('chile') ||
    country.toLowerCase().includes('colombia') ||
    country.toLowerCase().includes('peru') ||
    country.toLowerCase().includes('uruguay')
  ) {
    return 'South American';
  }

  if (
    country.toLowerCase().includes('china') ||
    country.toLowerCase().includes('japan') ||
    country.toLowerCase().includes('korea') ||
    country.toLowerCase().includes('asia') ||
    country.toLowerCase().includes('india') ||
    country.toLowerCase().includes('thailand') ||
    country.toLowerCase().includes('australia')
  ) {
    return 'Asian';
  }

  if (
    country.toLowerCase().includes('africa') ||
    country.toLowerCase().includes('egypt') ||
    country.toLowerCase().includes('south africa') ||
    country.toLowerCase().includes('nigeria') ||
    country.toLowerCase().includes('morocco')
  ) {
    return 'African';
  }

  return 'Other';
}

// Run the script
findWorkingLeagues()
  .then(() => {
    console.log('\n✅ Investigation completed!');
  })
  .catch(error => {
    console.error('❌ Investigation failed:', error.message);
  });
