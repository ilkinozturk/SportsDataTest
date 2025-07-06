const axios = require('axios');

const API_KEY = '29581005f929990bf13dc9c964200d537e484ee248f0ac2d0f76910a6ce7aae9';
const BASE_URL = 'https://api.football-data-api.com';

async function extendedDiscovery() {
  console.log('🔍 Extended League Discovery - Finding More Active Leagues');
  console.log('='.repeat(60));

  // Get all leagues
  const response = await axios.get(`${BASE_URL}/league-list`, {
    params: { key: API_KEY },
  });

  const allLeagues = response.data.data;
  console.log(`📊 Total leagues in subscription: ${allLeagues.length}`);

  // Test leagues 51-200 (we already tested 1-50)
  const leaguesToTest = allLeagues.slice(50, 200);
  console.log(`🎯 Testing leagues 51-200 (${leaguesToTest.length} leagues)...`);

  const activeLeagues = [];
  let requestCount = 0;

  for (let i = 0; i < leaguesToTest.length; i++) {
    const league = leaguesToTest[i];

    // Get the most recent season
    const currentSeason = league.season.reduce((latest, season) => {
      return season.year > latest.year ? season : latest;
    });

    try {
      requestCount++;
      console.log(
        `🔍 Testing ${league.name} (${league.country}) - Season ${currentSeason.year} (ID: ${currentSeason.id})...`
      );

      const teamsResponse = await axios.get(`${BASE_URL}/league-teams`, {
        params: { key: API_KEY, league_id: currentSeason.id },
        timeout: 10000,
      });

      if (teamsResponse.data.success && teamsResponse.data.data.length > 0) {
        const matchesResponse = await axios.get(`${BASE_URL}/league-matches`, {
          params: { key: API_KEY, league_id: currentSeason.id },
          timeout: 10000,
        });

        if (matchesResponse.data.success) {
          const leagueInfo = {
            id: currentSeason.id,
            name: league.name,
            country: league.country,
            season: currentSeason.year,
            teams: teamsResponse.data.data.length,
            matches: matchesResponse.data.data.length,
          };

          activeLeagues.push(leagueInfo);
          console.log(
            `✅ ACTIVE: ${league.name} (${league.country}) - ${leagueInfo.teams} teams, ${leagueInfo.matches} matches`
          );
        }

        requestCount++;
      }
    } catch (error) {
      if (error.response?.status === 417) {
        console.log(`❌ Not activated: ${league.name} (${league.country})`);
      } else {
        console.log(`❌ Error: ${league.name} (${league.country}) - ${error.message}`);
      }
    }

    // Progress updates and rate limiting
    if ((i + 1) % 10 === 0) {
      console.log(
        `📊 Progress: ${i + 1}/${leaguesToTest.length} tested, ${activeLeagues.length} active found, ${requestCount} requests used`
      );
      await new Promise(resolve => setTimeout(resolve, 2000)); // Longer pause every 10
    } else {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Regular rate limiting
    }
  }

  console.log(`\\n${'='.repeat(60)}`);
  console.log('🏆 EXTENDED DISCOVERY COMPLETE');
  console.log('='.repeat(60));
  console.log(`📊 Additional Active Leagues Found: ${activeLeagues.length}`);
  console.log(`🌐 Total Requests Used: ${requestCount}`);

  if (activeLeagues.length > 0) {
    console.log('\\n🎯 NEWLY DISCOVERED ACTIVE LEAGUES:');
    activeLeagues.forEach((league, index) => {
      console.log(
        `  ${index + 1}. ${league.name} (${league.country}) - ID: ${league.id} - ${league.teams} teams, ${league.matches} matches`
      );
    });

    // Generate constants for new leagues
    console.log('\\n📝 Additional Constants:');
    activeLeagues.forEach(league => {
      const constantName = `${league.name}_${league.country}`
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '');
      console.log(
        `  ${constantName}: ${league.id}, // ${league.name} (${league.country}) - ${league.teams} teams, ${league.matches} matches`
      );
    });
  }

  return activeLeagues;
}

extendedDiscovery()
  .then(activeLeagues => {
    console.log(
      `\\n✅ Discovery completed successfully. Found ${activeLeagues.length} additional active leagues.`
    );
  })
  .catch(error => {
    console.error('❌ Discovery failed:', error.message);
  });
