/**
 * Comprehensive Search for Team Position Solutions
 *
 * This script searches through the codebase and tests various approaches
 * to find accurate team standings and positions.
 */
require('dotenv').config();
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const API_KEY = process.env.FOOTYSTATS_API_KEY;
const BASE_URL = process.env.FOOTYSTATS_BASE_URL;

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function searchStandingsSolutions() {
  console.log('🔍 Comprehensive Search for Team Position Solutions\n');

  const solutions = {
    apiEndpoints: [],
    seasonMappings: [],
    calculationMethods: [],
    configurationOptions: [],
    documentationFindings: [],
  };

  // 1. Search for undocumented endpoints based on FootyStats documentation
  console.log('1️⃣ Testing Undocumented Endpoints Based on FootyStats Patterns');
  console.log('='.repeat(60));

  // FootyStats specializes in betting statistics, so try betting-related endpoints
  const bettingEndpoints = [
    { name: 'League Table', endpoint: '/league-table' },
    { name: 'Current Table', endpoint: '/current-table' },
    { name: 'Live Table', endpoint: '/live-table' },
    { name: 'Season Table', endpoint: '/season-table' },
    { name: 'Competition Table', endpoint: '/competition-table' },
    { name: 'Standings', endpoint: '/standings' },
    { name: 'League Standings', endpoint: '/league-standings' },
    { name: 'Current Standings', endpoint: '/current-standings' },
    { name: 'Table Data', endpoint: '/table-data' },
    { name: 'League Data', endpoint: '/league-data' },
    { name: 'Competition Data', endpoint: '/competition-data' },
    { name: 'Season Data', endpoint: '/season-data' },
    { name: 'Team Rankings', endpoint: '/team-rankings' },
    { name: 'League Rankings', endpoint: '/league-rankings' },
    { name: 'Position Data', endpoint: '/position-data' },
    { name: 'Current Position', endpoint: '/current-position' },
    { name: 'Team Position', endpoint: '/team-position' },
    { name: 'League Position', endpoint: '/league-position' },
  ];

  for (const endpoint of bettingEndpoints) {
    try {
      await delay(200);
      const response = await axios.get(`${BASE_URL}${endpoint.endpoint}`, {
        params: { key: API_KEY, league_id: 13973 },
        timeout: 8000,
      });

      if (response.status === 200 && response.data) {
        console.log(`✅ ${endpoint.name}: ENDPOINT EXISTS!`);
        solutions.apiEndpoints.push({
          name: endpoint.name,
          endpoint: endpoint.endpoint,
          status: 'working',
          dataStructure: typeof response.data,
        });

        // Check if it has Chicago Fire data
        if (response.data.data && Array.isArray(response.data.data)) {
          const chicago = response.data.data.find(
            t => t.id === 7 || (t.name && t.name.toLowerCase().includes('chicago'))
          );
          if (chicago) {
            console.log(
              `   🏈 Chicago Fire found with position: ${chicago.table_position || 'N/A'}`
            );
          }
        }
      }
    } catch (error) {
      // Only log non-404 errors
      if (error.response?.status !== 404) {
        console.log(`❌ ${endpoint.name}: ${error.message}`);
      }
    }
  }

  // 2. Test API parameters that might unlock better data
  console.log('\n2️⃣ Testing API Parameters for Better Data');
  console.log('='.repeat(50));

  const parameterTests = [
    // Date-based parameters
    { name: 'Current Date', params: { date: new Date().toISOString().split('T')[0] } },
    { name: 'Today', params: { today: 'true' } },
    { name: 'Now', params: { now: 'true' } },
    { name: 'Current', params: { current: 'true' } },

    // Season parameters
    { name: 'Season Current', params: { season: 'current' } },
    { name: 'Season Active', params: { season: 'active' } },
    { name: 'Season Latest', params: { season: 'latest' } },
    { name: 'Season 2025', params: { season: '2025' } },
    { name: 'Year 2025', params: { year: '2025' } },

    // Data freshness parameters
    { name: 'Live Data', params: { live: 'true' } },
    { name: 'Fresh Data', params: { fresh: 'true' } },
    { name: 'Updated Data', params: { updated: 'true' } },
    { name: 'Latest Data', params: { latest: 'true' } },
    { name: 'Real Time', params: { realtime: 'true' } },
    { name: 'Force Refresh', params: { refresh: 'true' } },

    // Data completeness parameters
    { name: 'Include All', params: { include: 'all' } },
    { name: 'Include Stats', params: { include: 'stats' } },
    { name: 'Include Position', params: { include: 'position' } },
    { name: 'Include Table', params: { include: 'table' } },
    { name: 'Full Data', params: { full: 'true' } },
    { name: 'Complete Data', params: { complete: 'true' } },
    { name: 'Extended Data', params: { extended: 'true' } },
    { name: 'Detailed Data', params: { detailed: 'true' } },

    // Format parameters
    { name: 'Format Extended', params: { format: 'extended' } },
    { name: 'Format Full', params: { format: 'full' } },
    { name: 'Format Complete', params: { format: 'complete' } },

    // API version parameters
    { name: 'Version 2', params: { version: '2' } },
    { name: 'Version 3', params: { version: '3' } },
    { name: 'API Version 2', params: { api_version: '2' } },
    { name: 'V2', params: { v: '2' } },
  ];

  const baselineResponse = await axios.get(`${BASE_URL}/league-teams`, {
    params: { key: API_KEY, league_id: 13973 },
    timeout: 8000,
  });

  const baselineChicago = baselineResponse.data.data?.find(t => t.id === 7);
  const baselinePosition = baselineChicago?.table_position;
  const baselinePPG = baselineChicago?.stats?.seasonPPG_overall;

  console.log(`Baseline Chicago Fire: Position ${baselinePosition}, PPG ${baselinePPG}`);

  for (const test of parameterTests) {
    try {
      await delay(200);
      const response = await axios.get(`${BASE_URL}/league-teams`, {
        params: {
          key: API_KEY,
          league_id: 13973,
          ...test.params,
        },
        timeout: 8000,
      });

      if (response.data.success && response.data.data) {
        const chicago = response.data.data.find(t => t.id === 7);
        if (chicago) {
          const position = chicago.table_position;
          const ppg = chicago.stats?.seasonPPG_overall;
          const matches = chicago.stats?.seasonMatchesPlayed_overall;

          // Check if data is different from baseline
          if (position !== baselinePosition || ppg !== baselinePPG) {
            console.log(
              `✅ ${test.name}: DIFFERENT DATA! Position ${position}, PPG ${ppg}, Matches ${matches}`
            );
            solutions.configurationOptions.push({
              name: test.name,
              params: test.params,
              chicagoPosition: position,
              chicagoPPG: ppg,
              chicagoMatches: matches,
              isDifferent: true,
            });
          }
        }
      }
    } catch (error) {
      if (error.response?.status !== 404) {
        console.log(`❌ ${test.name}: ${error.message}`);
      }
    }
  }

  // 3. Analyze existing code for position calculation methods
  console.log('\n3️⃣ Analyzing Existing Position Calculation Methods');
  console.log('='.repeat(55));

  // Read the teamDataService to see how it calculates positions
  try {
    const teamServicePath = path.join(__dirname, 'services', 'teamDataService.js');
    const teamServiceContent = fs.readFileSync(teamServicePath, 'utf8');

    // Look for position calculation logic
    const positionCalculationRegex =
      /sort.*ppg|sort.*points|position.*calculation|table_position/gi;
    const matches = teamServiceContent.match(positionCalculationRegex);

    if (matches) {
      console.log('Found position calculation methods in teamDataService.js:');
      matches.forEach(match => console.log(`  - ${match}`));

      solutions.calculationMethods.push({
        file: 'teamDataService.js',
        method: 'PPG-based sorting',
        description: 'Sorts teams by PPG, then points, then goal difference',
      });
    }
  } catch (error) {
    console.log('Could not analyze teamDataService.js');
  }

  // 4. Test alternative league discovery
  console.log('\n4️⃣ Testing Alternative League Discovery Methods');
  console.log('='.repeat(50));

  try {
    // Look for MLS leagues with different naming patterns
    const leagueResponse = await axios.get(`${BASE_URL}/league-list`, {
      params: { key: API_KEY },
      timeout: 15000,
    });

    if (leagueResponse.data.success) {
      const allLeagues = leagueResponse.data.data;

      // Find leagues that might be current MLS
      const potentialMLS = allLeagues.filter(league => {
        const name = (league.name || '').toLowerCase();
        return (
          name.includes('mls') ||
          name.includes('major league soccer') ||
          (name.includes('usa') && name.includes('soccer')) ||
          (name.includes('united states') && name.includes('soccer'))
        );
      });

      console.log(`Found ${potentialMLS.length} potential MLS leagues:`);

      // Test each one quickly
      for (const league of potentialMLS.slice(0, 5)) {
        if (league.season && Array.isArray(league.season)) {
          const recentSeasons = league.season
            .filter(s => s.year >= 2024)
            .sort((a, b) => b.year - a.year);

          for (const season of recentSeasons.slice(0, 2)) {
            try {
              await delay(300);
              const testResponse = await axios.get(`${BASE_URL}/league-teams`, {
                params: { key: API_KEY, league_id: season.id },
                timeout: 8000,
              });

              if (testResponse.data.success && testResponse.data.data) {
                const teams = testResponse.data.data;
                const chicago = teams.find(
                  t => t.id === 7 || (t.name && t.name.toLowerCase().includes('chicago'))
                );

                if (chicago) {
                  const sortedTeams = [...teams].sort((a, b) => {
                    const ppgA = a.stats?.seasonPPG_overall || 0;
                    const ppgB = b.stats?.seasonPPG_overall || 0;
                    return ppgB - ppgA;
                  });

                  const calculatedPos = sortedTeams.findIndex(t => t.id === chicago.id) + 1;

                  console.log(
                    `  League ${season.id} (${season.year}): Chicago at calculated position ${calculatedPos}/${teams.length}`
                  );

                  if (calculatedPos >= 15 && calculatedPos <= 20) {
                    console.log(`    🎯 REALISTIC POSITION! This might be the correct league.`);
                    solutions.seasonMappings.push({
                      leagueId: season.id,
                      year: season.year,
                      name: league.name,
                      chicagoPosition: calculatedPos,
                      totalTeams: teams.length,
                      isRealistic: true,
                    });
                  }
                }
              }
            } catch (error) {
              // Skip failed tests
            }
          }
        }
      }
    }
  } catch (error) {
    console.log('Failed to analyze alternative leagues:', error.message);
  }

  // 5. Summary and recommendations
  console.log('\n5️⃣ SUMMARY AND RECOMMENDATIONS');
  console.log('='.repeat(40));

  console.log('\n📊 FINDINGS:');
  console.log(`- Working endpoints found: ${solutions.apiEndpoints.length}`);
  console.log(`- Configuration options tested: ${solutions.configurationOptions.length}`);
  console.log(`- Alternative seasons found: ${solutions.seasonMappings.length}`);
  console.log(`- Calculation methods identified: ${solutions.calculationMethods.length}`);

  if (solutions.seasonMappings.length > 0) {
    console.log('\n🎯 RECOMMENDED LEAGUE IDS:');
    solutions.seasonMappings
      .filter(s => s.isRealistic)
      .forEach(season => {
        console.log(`  League ID: ${season.leagueId} (${season.year})`);
        console.log(`  Chicago Position: ${season.chicagoPosition}/${season.totalTeams}`);
        console.log(`  League: ${season.name}`);
        console.log('');
      });
  }

  if (solutions.configurationOptions.length > 0) {
    console.log('\n⚙️ CONFIGURATION OPTIONS THAT RETURN DIFFERENT DATA:');
    solutions.configurationOptions
      .filter(opt => opt.isDifferent)
      .forEach(option => {
        console.log(
          `  ${option.name}: Position ${option.chicagoPosition}, PPG ${option.chicagoPPG}`
        );
      });
  }

  if (solutions.apiEndpoints.length > 0) {
    console.log('\n🔗 WORKING ALTERNATIVE ENDPOINTS:');
    solutions.apiEndpoints.forEach(endpoint => {
      console.log(`  ${endpoint.name}: ${endpoint.endpoint}`);
    });
  }

  console.log('\n💡 IMPLEMENTATION RECOMMENDATIONS:');
  console.log('1. Use calculated positions instead of API table_position field');
  console.log('2. Implement data validation to detect stale information');
  console.log('3. Add league ID mapping for current seasons');
  console.log('4. Consider multiple data sources for cross-validation');
  console.log('5. Add user warnings when data appears outdated');

  // Save comprehensive results
  const resultsFile = './comprehensive-standings-analysis.json';
  fs.writeFileSync(
    resultsFile,
    JSON.stringify(
      {
        testDate: new Date().toISOString(),
        currentIssue: {
          problem: 'Chicago Fire showing position 1/30 instead of expected 17/30',
          currentLeagueId: 13973,
          expectedPosition: '15-20',
        },
        solutions,
        recommendations: [
          'Implement position calculation based on PPG/points sorting',
          'Add league ID mapping for current seasons',
          'Implement data freshness validation',
          'Add fallback data sources',
          'Contact FootyStats support for data accuracy',
        ],
      },
      null,
      2
    )
  );

  console.log(`\n💾 Comprehensive results saved to ${resultsFile}`);
}

searchStandingsSolutions().catch(console.error);
