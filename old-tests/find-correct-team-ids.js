const axios = require('axios');
require('dotenv').config();

const API_KEY = process.env.FOOTYSTATS_API_KEY;
const BASE_URL = process.env.FOOTYSTATS_BASE_URL;

// Test için aranacak takımlar
const TEAMS_TO_FIND = [
  { name: 'Chicago Fire', country: 'USA', league: 'MLS' },
  { name: 'Shanghai', country: 'China', league: 'Chinese Super League' },
  { name: 'Manchester United', country: 'England', league: 'Premier League' },
  { name: 'Real Madrid', country: 'Spain', league: 'La Liga' },
  { name: 'Como', country: 'Italy', league: 'Serie A' },
  { name: 'Klaksvik', country: 'Faroe Islands', league: 'Premier League' },
  { name: 'PSG', country: 'France', league: 'Ligue 1' },
  { name: 'HB Torshavn', country: 'Faroe Islands', league: '1. Deild' },
  { name: 'Bayern Munich', country: 'Germany', league: 'Bundesliga' },
  { name: 'Trabzonspor', country: 'Turkey', league: 'Super Lig' },
];

async function getChosenLeagueSeasonIds() {
  try {
    const response = await axios.get(`${BASE_URL}/league-list`, {
      params: {
        key: API_KEY,
        chosen_leagues_only: 'true',
      },
      timeout: 10000,
    });

    if (response.data.success && response.data.data) {
      const results = [];
      const now = new Date();

      for (const league of response.data.data) {
        if (league.season && league.season.length > 0) {
          // En güncel season'ı bul
          const sortedSeasons = [...league.season].sort((a, b) => {
            const yearA = parseInt(a.year?.toString().split('/')[0]) || 0;
            const yearB = parseInt(b.year?.toString().split('/')[0]) || 0;
            return yearB - yearA;
          });

          const currentSeason = sortedSeasons[0];
          const country = currentSeason.country || league.country || 'Unknown';

          results.push({
            league_name: league.name,
            country: country,
            season_id: currentSeason.id,
            season_year: currentSeason.year,
          });
        }
      }

      return results;
    }
    return [];
  } catch (error) {
    console.error('Error fetching season IDs:', error.message);
    return [];
  }
}

async function findTeamInLeague(teamName, seasonId, leagueName) {
  try {
    const response = await axios.get(`${BASE_URL}/league-teams`, {
      params: {
        key: API_KEY,
        season_id: seasonId,
      },
      timeout: 10000,
    });

    if (response.data.success && response.data.data) {
      // Takım adında arama yap
      const teams = response.data.data.filter(t => {
        const tName = t.name.toLowerCase();
        const searchName = teamName.toLowerCase();
        return (
          tName.includes(searchName) ||
          tName.replace(/[^a-z0-9]/g, '') === searchName.replace(/[^a-z0-9]/g, '') ||
          (t.cleanName && t.cleanName.toLowerCase().includes(searchName))
        );
      });

      if (teams.length > 0) {
        console.log(`\n✅ Found ${teams.length} match(es) in ${leagueName}:`);
        teams.forEach(t => {
          console.log(`   ID: ${t.id} - ${t.name} (${t.country})`);
        });
        return teams;
      }
    }
    return [];
  } catch (error) {
    console.error(`Error searching in league ${seasonId}: ${error.message}`);
    return [];
  }
}

async function findTeams() {
  console.log('🔍 Finding correct team IDs from FootyStats API');
  console.log('='.repeat(70));

  // Önce season ID'leri al
  const seasonIds = await getChosenLeagueSeasonIds();
  console.log(`\n✅ Found ${seasonIds.length} leagues`);

  const results = [];

  for (const teamToFind of TEAMS_TO_FIND) {
    console.log(`\n${'='.repeat(50)}`);
    console.log(
      `🔎 Searching for: ${teamToFind.name} (${teamToFind.country} - ${teamToFind.league})`
    );

    // İlgili ülkenin liglerini bul
    const countryLeagues = seasonIds.filter(l => l.country === teamToFind.country);

    if (countryLeagues.length === 0) {
      console.log(`❌ No leagues found for ${teamToFind.country}`);
      continue;
    }

    console.log(`\nFound ${countryLeagues.length} league(s) for ${teamToFind.country}:`);
    countryLeagues.forEach(l => {
      console.log(`   - ${l.league_name} (ID: ${l.season_id}, Year: ${l.season_year})`);
    });

    // Her ligde takımı ara
    let found = false;
    for (const league of countryLeagues) {
      if (
        league.league_name.toLowerCase().includes(teamToFind.league.toLowerCase()) ||
        teamToFind.league.toLowerCase().includes(league.league_name.toLowerCase())
      ) {
        const teams = await findTeamInLeague(teamToFind.name, league.season_id, league.league_name);
        if (teams.length > 0) {
          found = true;
          results.push({
            searchName: teamToFind.name,
            country: teamToFind.country,
            league: league.league_name,
            seasonId: league.season_id,
            foundTeams: teams,
          });
        }

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    if (!found) {
      // Tüm liglerde ara
      console.log(
        `\n⚠️ Not found in expected league, searching all ${teamToFind.country} leagues...`
      );
      for (const league of countryLeagues) {
        const teams = await findTeamInLeague(teamToFind.name, league.season_id, league.league_name);
        if (teams.length > 0) {
          found = true;
          results.push({
            searchName: teamToFind.name,
            country: teamToFind.country,
            league: league.league_name,
            seasonId: league.season_id,
            foundTeams: teams,
          });
          break;
        }
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    if (!found) {
      console.log(`❌ Team not found in any ${teamToFind.country} league`);
    }
  }

  // Summary
  console.log('\n\n📊 SUMMARY - Correct Team IDs');
  console.log('='.repeat(70));

  results.forEach(r => {
    console.log(`\n${r.searchName} (${r.country}):`);
    console.log(`   League: ${r.league} (Season ID: ${r.seasonId})`);
    r.foundTeams.forEach(t => {
      console.log(`   ✅ ID: ${t.id} - ${t.name}`);
    });
  });

  console.log('\n✅ Search complete!');
}

// Run search
findTeams().catch(console.error);
