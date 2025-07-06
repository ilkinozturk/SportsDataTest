#!/usr/bin/env node

/**
 * League Discovery Script
 *
 * This script discovers which leagues are actually activated in your FootyStats subscription
 * by systematically testing league endpoints instead of scraping the dashboard.
 *
 * Features:
 * - Tests leagues via official API endpoints
 * - Respects rate limits
 * - Generates updated constants
 * - Provides comprehensive reporting
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

class LeagueDiscoverer {
  constructor() {
    this.apiKey = '29581005f929990bf13dc9c964200d537e484ee248f0ac2d0f76910a6ce7aae9';
    this.baseUrl = 'https://api.football-data-api.com';
    this.requestCount = 0;
    this.activeLeagues = [];
    this.inactiveLeagues = [];

    if (!this.apiKey) {
      throw new Error('FOOTYSTATS_API_KEY environment variable is required');
    }
  }

  async makeRequest(endpoint, params = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const fullParams = { ...params, key: this.apiKey };

    try {
      console.log(`🌐 API Request #${++this.requestCount}: ${endpoint}`);
      const response = await axios.get(url, { params: fullParams });

      if (response.data.success) {
        console.log(`✅ API Response: ${response.status}`);
        return { success: true, data: response.data.data };
      } else {
        console.log(`❌ API Response: success=false`);
        return { success: false, error: 'API returned success: false' };
      }
    } catch (error) {
      console.log(`❌ API Error: ${error.response?.status || error.message}`);
      return {
        success: false,
        error: error.response?.status === 417 ? 'League not activated' : error.message,
      };
    }
  }

  async testLeague(leagueId, leagueName = `League ${leagueId}`) {
    console.log(`\n🔍 Testing ${leagueName} (ID: ${leagueId})...`);

    // Test by trying to get league teams
    const teamsResponse = await this.makeRequest('/league-teams', { league_id: leagueId });

    if (teamsResponse.success) {
      // If teams work, try matches
      const matchesResponse = await this.makeRequest('/league-matches', { league_id: leagueId });

      const result = {
        id: leagueId,
        name: leagueName,
        isActive: matchesResponse.success,
        teamsCount: teamsResponse.data?.length || 0,
        matchesCount: matchesResponse.success ? matchesResponse.data?.length || 0 : 0,
        error: matchesResponse.success ? null : matchesResponse.error,
      };

      if (result.isActive) {
        console.log(
          `✅ ${leagueName}: ACTIVE (${result.teamsCount} teams, ${result.matchesCount} matches)`
        );
        this.activeLeagues.push(result);
      } else {
        console.log(`❌ ${leagueName}: INACTIVE (${result.error})`);
        this.inactiveLeagues.push(result);
      }

      return result;
    } else {
      const result = {
        id: leagueId,
        name: leagueName,
        isActive: false,
        error: teamsResponse.error,
      };

      console.log(`❌ ${leagueName}: INACTIVE (${result.error})`);
      this.inactiveLeagues.push(result);
      return result;
    }
  }

  async getAllLeagues() {
    console.log('📋 Fetching all available leagues...');
    const response = await this.makeRequest('/league-list');

    if (response.success) {
      console.log(`📊 Found ${response.data.length} total leagues in subscription`);
      return response.data;
    } else {
      throw new Error(`Failed to fetch leagues: ${response.error}`);
    }
  }

  async discoverActiveLeagues(maxLeaguesToTest = 100) {
    console.log(`🔍 Starting league discovery (testing up to ${maxLeaguesToTest} leagues)...`);

    // Get all available leagues
    const allLeagues = await this.getAllLeagues();

    // Test leagues in batches to avoid hitting rate limits
    const leaguesToTest = allLeagues.slice(0, maxLeaguesToTest);
    console.log(`\n🎯 Testing ${leaguesToTest.length} leagues...`);

    for (let i = 0; i < leaguesToTest.length; i++) {
      const league = leaguesToTest[i];

      // Get the most recent season (highest year)
      const currentSeason = league.season.reduce((latest, season) => {
        return season.year > latest.year ? season : latest;
      });

      console.log(
        `\n🔍 Testing ${league.name} (${league.country}) - Season ${currentSeason.year} (ID: ${currentSeason.id})...`
      );
      await this.testLeague(currentSeason.id, `${league.name} (${league.country})`);

      // Rate limiting - wait 1 second between requests
      if (i < leaguesToTest.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Progress indicator
      if ((i + 1) % 10 === 0) {
        console.log(`\n📊 Progress: ${i + 1}/${leaguesToTest.length} leagues tested`);
        console.log(
          `✅ Active: ${this.activeLeagues.length} | ❌ Inactive: ${this.inactiveLeagues.length}`
        );
      }
    }
  }

  generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalTested: this.activeLeagues.length + this.inactiveLeagues.length,
        activeCount: this.activeLeagues.length,
        inactiveCount: this.inactiveLeagues.length,
        requestsUsed: this.requestCount,
      },
      activeLeagues: this.activeLeagues,
      inactiveLeagues: this.inactiveLeagues.map(league => ({
        id: league.id,
        name: league.name,
        error: league.error,
      })),
    };

    // Save detailed report
    fs.writeFileSync('league-discovery-report.json', JSON.stringify(report, null, 2));

    return report;
  }

  generateUpdatedConstants() {
    if (this.activeLeagues.length === 0) {
      return '// No active leagues found\nexport const DISCOVERED_LEAGUES = {} as const;';
    }

    let constants = '// Auto-generated active leagues from FootyStats subscription\n';
    constants += `// Generated on: ${new Date().toISOString()}\n\n`;
    constants += 'export const DISCOVERED_ACTIVE_LEAGUES = {\n';

    this.activeLeagues.forEach(league => {
      const constantName = league.name
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '');

      constants += `  ${constantName}: ${league.id}, // ${league.name} (${league.teamsCount} teams, ${league.matchesCount} matches)\n`;
    });

    constants += '} as const;\n\n';

    // Add helper function
    constants += `// Helper function to get all active league IDs
export const getActiveLeagueIds = (): number[] => {
  return Object.values(DISCOVERED_ACTIVE_LEAGUES);
};

// Helper function to get league by ID
export const getLeagueNameById = (id: number): string | undefined => {
  const entry = Object.entries(DISCOVERED_ACTIVE_LEAGUES).find(([, leagueId]) => leagueId === id);
  return entry ? entry[0].replace(/_/g, ' ') : undefined;
};`;

    return constants;
  }

  printSummary() {
    console.log(`\n${'='.repeat(60)}`);
    console.log('🏆 LEAGUE DISCOVERY COMPLETE');
    console.log('='.repeat(60));
    console.log(
      `📊 Total Leagues Tested: ${this.activeLeagues.length + this.inactiveLeagues.length}`
    );
    console.log(`✅ Active Leagues: ${this.activeLeagues.length}`);
    console.log(`❌ Inactive Leagues: ${this.inactiveLeagues.length}`);
    console.log(`🌐 API Requests Used: ${this.requestCount}`);

    if (this.activeLeagues.length > 0) {
      console.log('\n🎯 ACTIVE LEAGUES:');
      this.activeLeagues.forEach(league => {
        console.log(
          `  ✅ ${league.name} (ID: ${league.id}) - ${league.teamsCount} teams, ${league.matchesCount} matches`
        );
      });
    }

    console.log('\n📁 Files Created:');
    console.log('  - league-discovery-report.json (detailed results)');
    console.log('  - discovered-leagues-constants.ts (TypeScript constants)');
    console.log('='.repeat(60));
  }
}

async function main() {
  try {
    console.log('🚀 FootyStats League Discovery Starting...\n');

    const discoverer = new LeagueDiscoverer();

    // Discover active leagues (test first 50 to avoid rate limits)
    await discoverer.discoverActiveLeagues(50);

    // Generate and save report
    const report = discoverer.generateReport();
    console.log(`\n📊 Report saved to: league-discovery-report.json`);

    // Generate and save updated constants
    const constants = discoverer.generateUpdatedConstants();
    fs.writeFileSync('discovered-leagues-constants.ts', constants);
    console.log(`📝 Constants saved to: discovered-leagues-constants.ts`);

    // Print summary
    discoverer.printSummary();

    // Recommendations
    console.log('\n💡 RECOMMENDATIONS:');
    if (discoverer.activeLeagues.length >= 32) {
      console.log('✅ You have sufficient active leagues! Update your constants file.');
    } else if (discoverer.activeLeagues.length > 0) {
      console.log(
        `⚠️  You have ${discoverer.activeLeagues.length} active leagues, but expected 32.`
      );
      console.log('   This could be due to:');
      console.log('   - Seasonal scheduling (some leagues may be off-season)');
      console.log('   - Cache delays (wait 1 hour after activation)');
      console.log('   - Different season IDs needed');
    } else {
      console.log('❌ No active leagues found. Check your subscription status.');
    }
  } catch (error) {
    console.error('\n❌ Discovery failed:', error.message);
    process.exit(1);
  }
}

// Run the discovery
main();
