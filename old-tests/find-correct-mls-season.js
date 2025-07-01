/**
 * Find the Correct MLS Season ID with Accurate Standings
 *
 * This script specifically looks for the MLS league ID that has:
 * - Current/updated team statistics
 * - Correct team positions
 * - Chicago Fire in a realistic position (around 17th)
 */
require('dotenv').config();
const axios = require('axios');

const API_KEY = process.env.FOOTYSTATS_API_KEY;
const BASE_URL = process.env.FOOTYSTATS_BASE_URL;

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function findCorrectMLSSeason() {
  console.log('🔍 Finding Correct MLS Season ID with Accurate Data\n');

  // Step 1: Get all leagues
  console.log('1️⃣ Fetching all available leagues...');
  let allLeagues = [];

  try {
    const response = await axios.get(`${BASE_URL}/league-list`, {
      params: { key: API_KEY },
      timeout: 15000,
    });

    if (response.data.success) {
      allLeagues = response.data.data;
      console.log(`✅ Found ${allLeagues.length} leagues total`);
    }
  } catch (error) {
    console.error('❌ Failed to get leagues:', error.message);
    return;
  }

  // Step 2: Find all MLS-related leagues
  console.log('\n2️⃣ Identifying MLS-related leagues...');
  const mlsLeagues = [];

  allLeagues.forEach(league => {
    const name = (league.name || '').toLowerCase();
    if (
      name.includes('mls') ||
      name.includes('major league soccer') ||
      (name.includes('usa') && name.includes('soccer'))
    ) {
      if (league.season && Array.isArray(league.season)) {
        league.season.forEach(season => {
          mlsLeagues.push({
            leagueId: season.id,
            year: season.year,
            name: league.name,
            country: league.country,
          });
        });
      }
    }
  });

  // Sort by year (most recent first)
  mlsLeagues.sort((a, b) => {
    const yearA = parseInt(a.year.toString());
    const yearB = parseInt(b.year.toString());
    return yearB - yearA;
  });

  console.log(`Found ${mlsLeagues.length} MLS seasons:`);
  mlsLeagues.slice(0, 10).forEach(league => {
    console.log(`  ID: ${league.leagueId}, Year: ${league.year}, Name: ${league.name}`);
  });

  // Step 3: Test each MLS league for data quality
  console.log('\n3️⃣ Testing each MLS league for data quality...');
  const results = [];

  for (const mlsLeague of mlsLeagues.slice(0, 15)) {
    // Test top 15 most recent
    try {
      await delay(500); // Be respectful to API
      console.log(`\nTesting League ID: ${mlsLeague.leagueId} (${mlsLeague.year})`);

      const response = await axios.get(`${BASE_URL}/league-teams`, {
        params: {
          key: API_KEY,
          league_id: mlsLeague.leagueId,
        },
        timeout: 10000,
      });

      if (response.data.success && response.data.data && response.data.data.length > 0) {
        const teams = response.data.data;
        console.log(`  ✅ Found ${teams.length} teams`);

        // Look for Chicago Fire
        const chicago = teams.find(
          t =>
            t.id === 7 ||
            (t.name && t.name.toLowerCase().includes('chicago')) ||
            (t.name && t.name.toLowerCase().includes('fire'))
        );

        if (chicago) {
          // Calculate position based on PPG
          const teamsWithStats = teams.filter(
            t =>
              t.stats && (t.stats.seasonPPG_overall > 0 || t.stats.seasonMatchesPlayed_overall > 0)
          );

          const sortedByPPG = [...teamsWithStats].sort((a, b) => {
            const ppgA = a.stats?.seasonPPG_overall || 0;
            const ppgB = b.stats?.seasonPPG_overall || 0;
            if (ppgB !== ppgA) return ppgB - ppgA;

            // Secondary sort by points
            const pointsA = a.stats?.seasonPoints_overall || 0;
            const pointsB = b.stats?.seasonPoints_overall || 0;
            if (pointsB !== pointsA) return pointsB - pointsA;

            // Tertiary sort by goal difference
            const gdA = a.stats?.seasonGoalDifference_overall || 0;
            const gdB = b.stats?.seasonGoalDifference_overall || 0;
            return gdB - gdA;
          });

          const calculatedPosition = sortedByPPG.findIndex(t => t.id === chicago.id) + 1;
          const totalTeamsWithStats = teamsWithStats.length;

          // Check data quality indicators
          const hasRecentStats = teamsWithStats.some(
            t => (t.stats?.seasonMatchesPlayed_overall || 0) > 15
          );

          const avgPPG =
            teamsWithStats.reduce((sum, t) => sum + (t.stats?.seasonPPG_overall || 0), 0) /
            teamsWithStats.length;

          const dataQuality = {
            teamsWithStats: teamsWithStats.length,
            totalTeams: teams.length,
            hasRecentStats,
            avgPPG: avgPPG.toFixed(2),
            allTeamsHaveZeroStats: teamsWithStats.length === 0,
          };

          const result = {
            leagueId: mlsLeague.leagueId,
            year: mlsLeague.year,
            name: mlsLeague.name,
            chicago: {
              found: true,
              id: chicago.id,
              name: chicago.name,
              apiPosition: chicago.table_position,
              calculatedPosition,
              totalTeams: teams.length,
              totalTeamsWithStats,
              ppg: chicago.stats?.seasonPPG_overall || 0,
              matchesPlayed: chicago.stats?.seasonMatchesPlayed_overall || 0,
              points: chicago.stats?.seasonPoints_overall || 0,
              wins: chicago.stats?.seasonWinsNum_overall || 0,
              draws: chicago.stats?.seasonDrawsNum_overall || 0,
              losses: chicago.stats?.seasonLossesNum_overall || 0,
            },
            dataQuality,
            // Score the league based on data quality
            qualityScore:
              (hasRecentStats ? 40 : 0) +
              (teamsWithStats.length > 20 ? 30 : 0) +
              (calculatedPosition > 10 && calculatedPosition < 25 ? 20 : 0) +
              (avgPPG > 0.5 ? 10 : 0),
          };

          results.push(result);

          console.log(`  🏈 Chicago Fire found:`);
          console.log(`     API Position: ${chicago.table_position}`);
          console.log(`     Calculated Position: ${calculatedPosition}/${totalTeamsWithStats}`);
          console.log(`     PPG: ${chicago.stats?.seasonPPG_overall || 0}`);
          console.log(`     Matches: ${chicago.stats?.seasonMatchesPlayed_overall || 0}`);
          console.log(`     Quality Score: ${result.qualityScore}/100`);

          // Highlight potentially correct leagues
          if (calculatedPosition >= 15 && calculatedPosition <= 20 && hasRecentStats) {
            console.log(
              `  🎯 POTENTIAL MATCH! Position ${calculatedPosition} is in expected range`
            );
          }
        } else {
          console.log(`  ❌ Chicago Fire not found`);
          results.push({
            leagueId: mlsLeague.leagueId,
            year: mlsLeague.year,
            name: mlsLeague.name,
            chicago: { found: false },
            qualityScore: 0,
          });
        }
      } else {
        console.log(`  ❌ No teams data`);
      }
    } catch (error) {
      console.log(`  ❌ Error: ${error.message}`);
    }
  }

  // Step 4: Analyze results
  console.log('\n4️⃣ ANALYSIS AND RECOMMENDATIONS');
  console.log('='.repeat(60));

  // Sort by quality score
  const validResults = results.filter(r => r.chicago.found);
  validResults.sort((a, b) => b.qualityScore - a.qualityScore);

  console.log('\nTop MLS leagues by data quality:');
  console.log('-'.repeat(40));

  validResults.slice(0, 5).forEach((result, index) => {
    const chicago = result.chicago;
    console.log(`\n${index + 1}. League ID: ${result.leagueId} (Year: ${result.year})`);
    console.log(`   Name: ${result.name}`);
    console.log(`   Quality Score: ${result.qualityScore}/100`);
    console.log(
      `   Chicago Position: ${chicago.calculatedPosition}/${chicago.totalTeamsWithStats}`
    );
    console.log(`   Chicago PPG: ${chicago.ppg}`);
    console.log(`   Chicago Matches: ${chicago.matchesPlayed}`);
    console.log(
      `   Data Quality: ${result.dataQuality.teamsWithStats}/${result.dataQuality.totalTeams} teams with stats`
    );

    if (chicago.calculatedPosition >= 15 && chicago.calculatedPosition <= 20) {
      console.log(`   🎯 RECOMMENDED: Position matches expected range!`);
    }
  });

  // Check for leagues where Chicago Fire has realistic stats
  console.log('\n📊 Leagues with Chicago Fire in realistic position (15-20th):');
  console.log('-'.repeat(50));

  const realisticLeagues = validResults.filter(
    r =>
      r.chicago.calculatedPosition >= 15 &&
      r.chicago.calculatedPosition <= 20 &&
      r.chicago.matchesPlayed > 10
  );

  realisticLeagues.forEach(result => {
    console.log(`✅ League ID: ${result.leagueId} (${result.year})`);
    console.log(
      `   Position: ${result.chicago.calculatedPosition}/${result.chicago.totalTeamsWithStats}`
    );
    console.log(
      `   Record: ${result.chicago.wins}W-${result.chicago.draws}D-${result.chicago.losses}L`
    );
    console.log(`   PPG: ${result.chicago.ppg} (${result.chicago.points} points)`);
    console.log(`   Matches: ${result.chicago.matchesPlayed}`);
    console.log('');
  });

  if (realisticLeagues.length > 0) {
    const bestLeague = realisticLeagues[0];
    console.log('🏆 RECOMMENDED LEAGUE ID FOR ACCURATE DATA:');
    console.log(`   Use League ID: ${bestLeague.leagueId} instead of 13973`);
    console.log(
      `   This shows Chicago Fire at position ${bestLeague.chicago.calculatedPosition}/${bestLeague.chicago.totalTeamsWithStats}`
    );
    console.log(
      `   With ${bestLeague.chicago.matchesPlayed} matches played and ${bestLeague.chicago.ppg} PPG`
    );
  } else {
    console.log('⚠️  No leagues found with Chicago Fire in realistic position.');
    console.log('   This might indicate:');
    console.log('   - API data is generally outdated');
    console.log('   - Need to implement calculated positions instead of API positions');
    console.log('   - Consider alternative data sources');
  }

  // Save results
  require('fs').writeFileSync(
    './mls-season-analysis.json',
    JSON.stringify(
      {
        testDate: new Date().toISOString(),
        totalLeaguesTested: results.length,
        validResults: validResults.length,
        realisticResults: realisticLeagues.length,
        recommendations: realisticLeagues.slice(0, 3),
        allResults: results,
      },
      null,
      2
    )
  );

  console.log('\n💾 Detailed results saved to mls-season-analysis.json');
}

findCorrectMLSSeason().catch(console.error);
