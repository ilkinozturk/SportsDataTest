// FootyStats API Subscription Investigation Script
const axios = require('axios');

const API_KEY = '29581005f929990bf13dc9c964200d537e484ee248f0ac2d0f76910a6ce7aae9';
const BASE_URL = 'https://api.football-data-api.com';

// Helper function to make API requests with proper error handling
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
      headers: {
        rateLimit: response.headers['x-ratelimit-limit'],
        rateRemaining: response.headers['x-ratelimit-remaining'],
        rateReset: response.headers['x-ratelimit-reset'],
      },
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

// Function to add delay between requests
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function investigateSubscription() {
  console.log('🔍 FOOTYSTATS API SUBSCRIPTION INVESTIGATION');
  console.log('='.repeat(50));
  console.log(
    `📊 API Key: ${API_KEY.substring(0, 10)}...${API_KEY.substring(API_KEY.length - 10)}`
  );
  console.log(`🌐 Base URL: ${BASE_URL}`);
  console.log();

  // Step 1: Test basic connection and get league list
  console.log('1️⃣ TESTING BASIC CONNECTION & GETTING AVAILABLE LEAGUES');
  console.log('-'.repeat(60));

  const leaguesResponse = await makeRequest('/league-list');

  if (!leaguesResponse.success) {
    console.log('❌ Failed to connect to API:', leaguesResponse.error);
    return;
  }

  console.log('✅ API Connection: SUCCESS');
  console.log(`📈 Status: ${leaguesResponse.status}`);

  if (leaguesResponse.headers.rateLimit) {
    console.log(
      `⏱️  Rate Limit: ${leaguesResponse.headers.rateRemaining}/${leaguesResponse.headers.rateLimit} remaining`
    );
  }

  if (!leaguesResponse.data?.success) {
    console.log('❌ API returned success: false');
    console.log('Response:', JSON.stringify(leaguesResponse.data, null, 2));
    return;
  }

  const availableLeagues = leaguesResponse.data.data || [];
  console.log(`📋 Available leagues in subscription: ${availableLeagues.length}`);

  if (availableLeagues.length === 0) {
    console.log('⚠️  No leagues found in subscription!');
    return;
  }

  // Display available leagues
  console.log('\n📑 LEAGUES IN YOUR SUBSCRIPTION:');
  console.log('-'.repeat(40));

  const groupedLeagues = {};
  availableLeagues.forEach(league => {
    const country = league.country || 'International';
    if (!groupedLeagues[country]) {
      groupedLeagues[country] = [];
    }
    groupedLeagues[country].push(league);
  });

  Object.keys(groupedLeagues)
    .sort()
    .forEach(country => {
      console.log(`\n🏴 ${country}:`);
      groupedLeagues[country].forEach(league => {
        console.log(`   • ${league.name} (ID: ${league.id})`);
      });
    });

  console.log('\n');

  // Step 2: Test top 10 leagues from subscription
  console.log('2️⃣ TESTING LEAGUE DATA ACCESS');
  console.log('-'.repeat(60));

  const testLeagues = availableLeagues.slice(0, 10); // Test first 10 leagues
  const workingLeagues = [];
  const failedLeagues = [];

  for (const league of testLeagues) {
    console.log(`🧪 Testing: ${league.name} (ID: ${league.id})`);

    // Test league teams
    const teamsResponse = await makeRequest('/league-teams', { league_id: league.id });
    await delay(1200); // 1.2 second delay to respect rate limits

    if (teamsResponse.success && teamsResponse.data?.success) {
      const teamCount = teamsResponse.data.data?.length || 0;
      console.log(`   ✅ Teams: ${teamCount} found`);

      // Test league matches
      const matchesResponse = await makeRequest('/league-matches', { league_id: league.id });
      await delay(1200);

      if (matchesResponse.success && matchesResponse.data?.success) {
        const matchCount = matchesResponse.data.data?.length || 0;
        console.log(`   ✅ Matches: ${matchCount} found`);
        workingLeagues.push({
          ...league,
          teams: teamCount,
          matches: matchCount,
        });
      } else {
        console.log(
          `   ❌ Matches: Failed (${matchesResponse.status}) - ${matchesResponse.data?.message || matchesResponse.error}`
        );
        failedLeagues.push({
          ...league,
          error: 'matches_failed',
          details: matchesResponse.data?.message || matchesResponse.error,
        });
      }
    } else {
      console.log(
        `   ❌ Teams: Failed (${teamsResponse.status}) - ${teamsResponse.data?.message || teamsResponse.error}`
      );
      failedLeagues.push({
        ...league,
        error: 'teams_failed',
        details: teamsResponse.data?.message || teamsResponse.error,
      });
    }

    console.log();
  }

  // Step 3: Summary and recommendations
  console.log('3️⃣ INVESTIGATION SUMMARY');
  console.log('-'.repeat(60));

  console.log(`📈 Total leagues in subscription: ${availableLeagues.length}`);
  console.log(`✅ Working leagues tested: ${workingLeagues.length}`);
  console.log(`❌ Failed leagues tested: ${failedLeagues.length}`);

  if (workingLeagues.length > 0) {
    console.log('\n🎯 RECOMMENDED WORKING LEAGUES:');
    console.log('-'.repeat(40));
    workingLeagues.forEach(league => {
      console.log(`✅ ${league.name} (ID: ${league.id})`);
      console.log(`   📊 ${league.teams} teams, ${league.matches} matches`);
    });
  }

  if (failedLeagues.length > 0) {
    console.log('\n❌ LEAGUES WITH ISSUES:');
    console.log('-'.repeat(40));
    failedLeagues.forEach(league => {
      console.log(`❌ ${league.name} (ID: ${league.id})`);
      console.log(`   Error: ${league.details}`);
    });
  }

  // Step 4: Test specific endpoints for insights
  console.log('\n4️⃣ ADDITIONAL API ENDPOINT TESTS');
  console.log('-'.repeat(60));

  // Test if there are any account/subscription specific endpoints
  const testEndpoints = ['/stats', '/predictions', '/standings'];

  for (const endpoint of testEndpoints) {
    console.log(`🧪 Testing endpoint: ${endpoint}`);
    const response = await makeRequest(endpoint);

    if (response.success) {
      console.log(`   ✅ ${endpoint}: Available`);
    } else {
      console.log(`   ❌ ${endpoint}: ${response.status} - ${response.error}`);
    }

    await delay(1200);
  }

  // Step 5: Specific investigation of 417 errors
  console.log('\n5️⃣ 417 ERROR ANALYSIS');
  console.log('-'.repeat(60));

  const problematicLeagues = [1625, 1398, 1635, 1269, 1423]; // The ones that were failing

  console.log('Testing leagues that previously returned 417 errors:');

  for (const leagueId of problematicLeagues) {
    const league = availableLeagues.find(l => l.id === leagueId);
    const leagueName = league ? league.name : `Unknown League (${leagueId})`;

    console.log(`🧪 Testing: ${leagueName}`);

    if (!league) {
      console.log(`   ❌ League ID ${leagueId} NOT FOUND in your subscription`);
    } else {
      console.log(`   ✅ League ID ${leagueId} IS in your subscription`);

      // Test the specific league
      const response = await makeRequest('/league-matches', { league_id: leagueId });

      if (response.success && response.data?.success) {
        console.log(`   ✅ Data access: SUCCESS`);
      } else {
        console.log(`   ❌ Data access: FAILED - ${response.data?.message || response.error}`);
      }
    }

    await delay(1200);
  }

  console.log('\n6️⃣ FINAL RECOMMENDATIONS');
  console.log('-'.repeat(60));

  console.log('Based on this investigation:');
  console.log(`• Your subscription includes ${availableLeagues.length} leagues`);
  console.log(`• Rate limit: ${leaguesResponse.headers.rateLimit || 'Unknown'} requests per hour`);
  console.log(`• API key is valid and working`);

  if (workingLeagues.length > 0) {
    console.log(`• ${workingLeagues.length} leagues are confirmed working`);
    console.log('• Use only the leagues listed in your subscription to avoid 417 errors');
  }

  console.log('\n💡 NEXT STEPS:');
  console.log('1. Update your application to use only the leagues from your subscription');
  console.log('2. Implement proper error handling for 417 responses');
  console.log('3. Consider upgrading subscription if you need access to major European leagues');
  console.log('4. Check FootyStats panel to see if you can add/modify league selections');

  return {
    totalLeagues: availableLeagues.length,
    availableLeagues,
    workingLeagues,
    failedLeagues,
    rateLimit: leaguesResponse.headers.rateLimit,
    rateRemaining: leaguesResponse.headers.rateRemaining,
  };
}

// Run the investigation
investigateSubscription()
  .then(results => {
    console.log('\n✅ Investigation completed successfully!');

    // Save results to a file for reference
    const fs = require('fs');
    fs.writeFileSync(
      '/mnt/d/SportsData.Ai/subscription-results.json',
      JSON.stringify(results, null, 2)
    );
    console.log('📄 Results saved to subscription-results.json');
  })
  .catch(error => {
    console.error('❌ Investigation failed:', error.message);
  });
