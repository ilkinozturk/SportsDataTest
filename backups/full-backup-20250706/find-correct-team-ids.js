const axios = require('axios');
const API_KEY = process.env.FOOTYSTATS_API_KEY;

async function findCorrectTeamIds() {
  console.log('🔍 Searching for correct team IDs in FootyStats API\n');

  // Teams to search for
  const teamsToFind = [
    { name: 'Manchester City', country: 'England', league: 'Premier League' },
    { name: 'Manchester United', country: 'England', league: 'Premier League' },
    { name: 'Inter Miami', country: 'USA', league: 'MLS' },
    { name: 'Inter Miami CF', country: 'USA', league: 'MLS' },
    { name: 'Miami', country: 'USA', league: 'MLS' },
  ];

  // Get England Premier League teams
  try {
    console.log('📋 Searching in Premier League...');
    const premierLeagueId = 237; // Common Premier League ID

    const response = await axios.get(`https://api.footystats.org/v3/league-teams`, {
      params: {
        key: API_KEY,
        season_id: premierLeagueId,
      },
    });

    if (response.data.success && response.data.data) {
      console.log(`Found ${response.data.data.length} teams in Premier League:\n`);

      // Find Manchester teams
      const manchesterTeams = response.data.data.filter(team =>
        team.name.toLowerCase().includes('manchester')
      );

      manchesterTeams.forEach(team => {
        console.log(`✅ ${team.name} - ID: ${team.id}`);
      });
    }
  } catch (error) {
    console.error('Error searching Premier League:', error.message);
  }

  // Get MLS teams
  try {
    console.log('\n📋 Searching in MLS...');
    const mlsId = 13973; // Current MLS season

    const response = await axios.get(`https://api.footystats.org/v3/league-teams`, {
      params: {
        key: API_KEY,
        season_id: mlsId,
      },
    });

    if (response.data.success && response.data.data) {
      console.log(`Found ${response.data.data.length} teams in MLS:\n`);

      // Find Miami teams
      const miamiTeams = response.data.data.filter(
        team =>
          team.name.toLowerCase().includes('miami') || team.name.toLowerCase().includes('inter')
      );

      if (miamiTeams.length > 0) {
        miamiTeams.forEach(team => {
          console.log(`✅ ${team.name} - ID: ${team.id}`);
        });
      } else {
        // List all teams to find the right one
        console.log('Miami/Inter not found. All MLS teams:');
        response.data.data.forEach(team => {
          console.log(`  - ${team.name} - ID: ${team.id}`);
        });
      }
    }
  } catch (error) {
    console.error('Error searching MLS:', error.message);
  }

  // Search by team name
  console.log('\n📋 Direct team searches...');
  for (const team of teamsToFind) {
    try {
      // Try searching by team name
      const searchResponse = await axios.get(`https://api.footystats.org/v3/league-list`, {
        params: {
          key: API_KEY,
          chosen_leagues_only: 'true',
        },
      });

      if (searchResponse.data.success && searchResponse.data.data) {
        const leagues = searchResponse.data.data;

        // Find leagues for the country
        const countryLeagues = leagues.filter(l => l.country === team.country);

        for (const league of countryLeagues) {
          if (league.name.includes(team.league) || team.league.includes(league.name)) {
            console.log(`\nSearching in ${league.country} - ${league.name}...`);

            // Get most recent season
            if (league.season && league.season.length > 0) {
              const recentSeason = league.season[0];

              try {
                const teamsResponse = await axios.get(
                  `https://api.footystats.org/v3/league-teams`,
                  {
                    params: {
                      key: API_KEY,
                      season_id: recentSeason.id,
                    },
                  }
                );

                if (teamsResponse.data.success && teamsResponse.data.data) {
                  const foundTeam = teamsResponse.data.data.find(t =>
                    t.name.toLowerCase().includes(team.name.toLowerCase())
                  );

                  if (foundTeam) {
                    console.log(`✅ Found: ${foundTeam.name} - ID: ${foundTeam.id}`);
                    break;
                  }
                }
              } catch (err) {
                // Continue searching
              }
            }
          }
        }
      }
    } catch (error) {
      console.error(`Error searching for ${team.name}:`, error.message);
    }
  }
}

findCorrectTeamIds();
