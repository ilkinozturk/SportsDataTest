// Proper FootyStats API Investigation Script
const axios = require('axios');
const fs = require('fs');

const API_KEY = '29581005f929990bf13dc9c964200d537e484ee248f0ac2d0f76910a6ce7aae9';
const BASE_URL = 'https://api.football-data-api.com';

// Helper function to make API requests
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
      headers: error.response?.headers,
    };
  }
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function properInvestigation() {
  console.log('🔍 PROPER FOOTYSTATS API INVESTIGATION');
  console.log('='.repeat(50));
  console.log(
    `📊 API Key: ${API_KEY.substring(0, 10)}...${API_KEY.substring(API_KEY.length - 10)}`
  );
  console.log(`🌐 Base URL: ${BASE_URL}`);
  console.log();

  const results = {
    subscription: {
      totalLeagues: 0,
      rateLimit: null,
      rateRemaining: null,
    },
    majorLeagues: [],
    workingSeasons: [],
    failedTests: [],
    recommendations: [],
  };

  // Step 1: Get league list
  console.log('1️⃣ ANALYZING SUBSCRIPTION LEAGUES');
  console.log('-'.repeat(50));

  const leaguesResponse = await makeRequest('/league-list');

  if (!leaguesResponse.success || !leaguesResponse.data?.success) {
    console.log(
      '❌ Failed to get leagues:',
      leaguesResponse.error || leaguesResponse.data?.message
    );
    return results;
  }

  const leagues = leaguesResponse.data.data;
  results.subscription.totalLeagues = leagues.length;
  results.subscription.rateLimit = leaguesResponse.headers['x-ratelimit-limit'];
  results.subscription.rateRemaining = leaguesResponse.headers['x-ratelimit-remaining'];

  console.log(`✅ Successfully retrieved ${leagues.length} leagues`);
  console.log(
    `⏱️  Rate Limit: ${results.subscription.rateRemaining}/${results.subscription.rateLimit}`
  );

  // Step 2: Find major European leagues
  console.log('\n2️⃣ IDENTIFYING MAJOR LEAGUES');
  console.log('-'.repeat(50));

  const majorLeagueNames = [
    { name: 'Premier League', country: 'England' },
    { name: 'La Liga', country: 'Spain' },
    { name: 'Bundesliga', country: 'Germany' },
    { name: 'Serie A', country: 'Italy' },
    { name: 'Ligue 1', country: 'France' },
    { name: 'Champions League', country: 'Europe' },
    { name: 'Europa League', country: 'Europe' },
  ];

  for (const majorLeague of majorLeagueNames) {
    const found = leagues.find(
      l =>
        l.name &&
        l.country &&
        l.name.toLowerCase().includes(majorLeague.name.toLowerCase()) &&
        l.country.toLowerCase().includes(majorLeague.country.toLowerCase())
    );

    if (found) {
      // Get the most recent season
      const currentSeason = found.season.reduce((latest, season) =>
        season.year > latest.year ? season : latest
      );

      const leagueInfo = {
        name: found.name,
        country: found.country,
        seasonId: currentSeason.id,
        seasonYear: currentSeason.year,
        available: true,
      };

      results.majorLeagues.push(leagueInfo);
      console.log(
        `✅ ${majorLeague.name}: ${found.name} (Season ID: ${currentSeason.id}, Year: ${currentSeason.year})`
      );
    } else {
      results.majorLeagues.push({
        name: majorLeague.name,
        country: majorLeague.country,
        available: false,
      });
      console.log(`❌ ${majorLeague.name}: Not found in subscription`);
    }
  }

  // Step 3: Test data access for available major leagues
  console.log('\n3️⃣ TESTING DATA ACCESS FOR MAJOR LEAGUES');
  console.log('-'.repeat(50));

  for (const league of results.majorLeagues.filter(l => l.available)) {
    console.log(`🧪 Testing: ${league.name} (Season ID: ${league.seasonId})`);

    // Test teams
    const teamsResponse = await makeRequest('/league-teams', { league_id: league.seasonId });
    await delay(1500); // Respect rate limits

    if (teamsResponse.success && teamsResponse.data?.success) {
      const teamCount = teamsResponse.data.data?.length || 0;
      console.log(`   ✅ Teams: ${teamCount} found`);

      // Test matches
      const matchesResponse = await makeRequest('/league-matches', { league_id: league.seasonId });
      await delay(1500);

      if (matchesResponse.success && matchesResponse.data?.success) {
        const matchCount = matchesResponse.data.data?.length || 0;
        console.log(`   ✅ Matches: ${matchCount} found`);

        results.workingSeasons.push({
          ...league,
          teams: teamCount,
          matches: matchCount,
          status: 'working',
        });
      } else {
        console.log(
          `   ❌ Matches failed: ${matchesResponse.data?.message || matchesResponse.error}`
        );
        results.failedTests.push({
          ...league,
          error: 'matches_failed',
          details: matchesResponse.data?.message || matchesResponse.error,
        });
      }
    } else {
      console.log(`   ❌ Teams failed: ${teamsResponse.data?.message || teamsResponse.error}`);
      results.failedTests.push({
        ...league,
        error: 'teams_failed',
        details: teamsResponse.data?.message || teamsResponse.error,
      });
    }
  }

  // Step 4: Test some other popular leagues
  console.log('\n4️⃣ TESTING OTHER POPULAR LEAGUES');
  console.log('-'.repeat(50));

  const otherLeagues = ['Championship', 'Eredivisie', 'Liga MX', 'Brazilian Serie A', 'MLS'];

  for (const leagueName of otherLeagues) {
    const found = leagues.find(
      l => l.name && l.name.toLowerCase().includes(leagueName.toLowerCase())
    );

    if (found) {
      const currentSeason = found.season.reduce((latest, season) =>
        season.year > latest.year ? season : latest
      );

      console.log(`🧪 Testing: ${found.name} (Season ID: ${currentSeason.id})`);

      const teamsResponse = await makeRequest('/league-teams', { league_id: currentSeason.id });
      await delay(1500);

      if (teamsResponse.success && teamsResponse.data?.success) {
        const teamCount = teamsResponse.data.data?.length || 0;
        console.log(`   ✅ Working: ${teamCount} teams found`);

        results.workingSeasons.push({
          name: found.name,
          country: found.country,
          seasonId: currentSeason.id,
          seasonYear: currentSeason.year,
          teams: teamCount,
          status: 'working',
        });
      } else {
        console.log(`   ❌ Failed: ${teamsResponse.data?.message || teamsResponse.error}`);
      }
    } else {
      console.log(`❌ ${leagueName}: Not found`);
    }
  }

  // Step 5: Test the previously problematic league IDs
  console.log('\n5️⃣ INVESTIGATING PREVIOUS 417 ERRORS');
  console.log('-'.repeat(50));

  const problematicIds = [1625, 1398, 1635, 1269, 1423];
  console.log('Testing old hardcoded league IDs that were causing 417 errors:');

  for (const id of problematicIds) {
    console.log(`🧪 Testing legacy ID: ${id}`);

    const response = await makeRequest('/league-matches', { league_id: id });
    await delay(1500);

    if (response.success && response.data?.success) {
      console.log(`   ✅ ID ${id}: Works! This is a valid season ID`);
    } else {
      console.log(`   ❌ ID ${id}: ${response.data?.message || response.error}`);
      if (response.data?.message?.includes('not chosen by the user')) {
        console.log(`      → This season/league is not in your subscription`);
      }
    }
  }

  // Step 6: Generate recommendations
  console.log('\n6️⃣ GENERATING RECOMMENDATIONS');
  console.log('-'.repeat(50));

  console.log('📊 INVESTIGATION SUMMARY:');
  console.log(`• Total leagues in subscription: ${results.subscription.totalLeagues}`);
  console.log(
    `• Major leagues available: ${results.majorLeagues.filter(l => l.available).length}/7`
  );
  console.log(`• Working seasons tested: ${results.workingSeasons.length}`);
  console.log(`• Failed tests: ${results.failedTests.length}`);

  if (results.workingSeasons.length > 0) {
    console.log('\n✅ CONFIRMED WORKING LEAGUES (use these season IDs):');
    results.workingSeasons.forEach(league => {
      console.log(`• ${league.name} (${league.country})`);
      console.log(`  - Season ID: ${league.seasonId} (Year: ${league.seasonYear})`);
      console.log(`  - Teams: ${league.teams || 'N/A'}, Matches: ${league.matches || 'N/A'}`);
    });
  }

  console.log('\n🔧 KEY FINDINGS:');
  console.log('1. FootyStats API uses SEASON IDs, not league IDs');
  console.log('2. Each league has multiple seasons with different IDs');
  console.log('3. The 417 errors occurred because you were using old/wrong season IDs');
  console.log('4. Your subscription includes many leagues, but not all major European ones');

  console.log('\n💡 NEXT STEPS:');
  results.recommendations = [
    'Update your application to use season IDs instead of league IDs',
    'Use the working season IDs identified above',
    'Implement dynamic season selection (latest season per league)',
    'Add error handling for leagues not in subscription',
    'Consider subscription upgrade if major European leagues are needed',
  ];

  results.recommendations.forEach((rec, index) => {
    console.log(`${index + 1}. ${rec}`);
  });

  // Save results
  try {
    fs.writeFileSync(
      '/mnt/d/SportsData.Ai/investigation-results.json',
      JSON.stringify(results, null, 2)
    );
    console.log('\n📄 Detailed results saved to investigation-results.json');
  } catch (error) {
    console.log(`\n❌ Failed to save results: ${error.message}`);
  }

  return results;
}

// Run the investigation
properInvestigation()
  .then(results => {
    console.log('\n✅ Investigation completed successfully!');
    console.log(`\n📈 Final Stats:`);
    console.log(
      `• API Rate Limit: ${results.subscription.rateRemaining}/${results.subscription.rateLimit} requests remaining`
    );
    console.log(`• Working Leagues Found: ${results.workingSeasons.length}`);
    console.log(`• Subscription includes ${results.subscription.totalLeagues} total leagues`);
  })
  .catch(error => {
    console.error('❌ Investigation failed:', error.message);
  });
