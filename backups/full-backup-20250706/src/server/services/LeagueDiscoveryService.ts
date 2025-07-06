import { FootyStatsApi } from './FootyStatsApi';
import { Logger } from '../utils/logger';
import { ApiResponse, League } from '../../shared/types';

interface LeagueValidationResult {
  leagueId: number;
  name: string;
  isActive: boolean;
  teamsCount?: number;
  matchesCount?: number;
  error?: string;
}

export class LeagueDiscoveryService {
  private api: FootyStatsApi;
  private logger: Logger;

  constructor() {
    this.api = new FootyStatsApi();
    this.logger = new Logger('LeagueDiscoveryService');
  }

  /**
   * Get all available leagues from FootyStats API
   */
  async getAllAvailableLeagues(): Promise<ApiResponse<League[]>> {
    this.logger.info('Fetching all available leagues from API');
    return await this.api.getLeagues();
  }

  /**
   * Test a specific league to see if it's activated in subscription
   */
  async validateLeague(leagueId: number, leagueName?: string): Promise<LeagueValidationResult> {
    this.logger.info(`Validating league ${leagueId} (${leagueName || 'Unknown'})`);

    try {
      // Try to get teams for this league
      const teamsResponse = await this.api.getLeagueTeams(leagueId);

      if (teamsResponse.success && teamsResponse.data) {
        // If teams request succeeds, try to get matches
        const matchesResponse = await this.api.getLeagueMatches(leagueId);

        return {
          leagueId,
          name: leagueName || `League ${leagueId}`,
          isActive: teamsResponse.success && matchesResponse.success,
          teamsCount: teamsResponse.data.length,
          matchesCount: matchesResponse.success ? matchesResponse.data?.length : 0,
        };
      } else {
        return {
          leagueId,
          name: leagueName || `League ${leagueId}`,
          isActive: false,
          error: teamsResponse.error || 'Failed to fetch teams',
        };
      }
    } catch (error: any) {
      return {
        leagueId,
        name: leagueName || `League ${leagueId}`,
        isActive: false,
        error: error.message,
      };
    }
  }

  /**
   * Batch validate multiple leagues
   */
  async validateMultipleLeagues(leagueIds: number[]): Promise<LeagueValidationResult[]> {
    this.logger.info(`Validating ${leagueIds.length} leagues`);

    const results: LeagueValidationResult[] = [];

    for (const leagueId of leagueIds) {
      const result = await this.validateLeague(leagueId);
      results.push(result);

      // Add delay to respect rate limits
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    return results;
  }

  /**
   * Discover working leagues from a list of potential leagues
   */
  async discoverWorkingLeagues(
    candidateLeagues: { id: number; name: string }[]
  ): Promise<LeagueValidationResult[]> {
    this.logger.info(`Discovering working leagues from ${candidateLeagues.length} candidates`);

    const results: LeagueValidationResult[] = [];

    for (const league of candidateLeagues) {
      const result = await this.validateLeague(league.id, league.name);
      results.push(result);

      this.logger.info(
        `League ${league.name} (${league.id}): ${result.isActive ? '✅ ACTIVE' : '❌ INACTIVE'}`
      );

      // Add delay to respect rate limits
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    const activeLeagues = results.filter(r => r.isActive);
    this.logger.info(
      `Discovery complete: ${activeLeagues.length}/${results.length} leagues are active`
    );

    return results;
  }

  /**
   * Generate league constants based on active leagues
   */
  generateLeagueConstants(validationResults: LeagueValidationResult[]): string {
    const activeLeagues = validationResults.filter(r => r.isActive);

    let constants = '// Auto-generated working leagues\n';
    constants += 'export const DISCOVERED_WORKING_LEAGUES = {\n';

    activeLeagues.forEach((league, index) => {
      const constantName = league.name
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '');

      constants += `  ${constantName}: ${league.leagueId}, // ${league.name} (${league.teamsCount} teams, ${league.matchesCount} matches)\n`;
    });

    constants += '} as const;\n';

    return constants;
  }

  /**
   * Smart league discovery - try common league patterns for current season
   */
  async smartLeagueDiscovery(): Promise<LeagueValidationResult[]> {
    this.logger.info('Starting smart league discovery');

    // Get current year and generate season IDs to try
    const currentYear = new Date().getFullYear();
    const potentialSeasonRanges = [
      currentYear * 1000 + 500, // Pattern like 2025500
      currentYear * 1000 + 400, // Pattern like 2025400
      currentYear * 100 + 25, // Pattern like 202525
      13000 + (currentYear - 2020) * 100, // Pattern like 13500 for 2025
      14000 + (currentYear - 2020) * 100, // Pattern like 14500 for 2025
    ];

    const candidateLeagues: { id: number; name: string }[] = [];

    // Generate candidate league IDs
    for (let base of potentialSeasonRanges) {
      for (let offset = 0; offset < 100; offset += 10) {
        candidateLeagues.push({
          id: base + offset,
          name: `Potential League ${base + offset}`,
        });
      }
    }

    this.logger.info(`Generated ${candidateLeagues.length} candidate leagues to test`);

    return await this.discoverWorkingLeagues(candidateLeagues);
  }

  /**
   * Get comprehensive league status report
   */
  async getLeagueStatusReport(): Promise<{
    totalAvailable: number;
    totalActive: number;
    activeLeagues: LeagueValidationResult[];
    inactiveLeagues: LeagueValidationResult[];
    constants: string;
  }> {
    this.logger.info('Generating comprehensive league status report');

    // First get all leagues from API
    const allLeaguesResponse = await this.getAllAvailableLeagues();

    if (!allLeaguesResponse.success || !allLeaguesResponse.data) {
      throw new Error('Failed to fetch available leagues from API');
    }

    const totalAvailable = allLeaguesResponse.data.length;
    this.logger.info(`Found ${totalAvailable} total leagues in subscription`);

    // Test first 50 leagues to avoid hitting rate limits
    const testLeagues = allLeaguesResponse.data.slice(0, 50).map(league => ({
      id: league.id,
      name: league.name,
    }));

    const validationResults = await this.discoverWorkingLeagues(testLeagues);

    const activeLeagues = validationResults.filter(r => r.isActive);
    const inactiveLeagues = validationResults.filter(r => !r.isActive);

    return {
      totalAvailable,
      totalActive: activeLeagues.length,
      activeLeagues,
      inactiveLeagues,
      constants: this.generateLeagueConstants(validationResults),
    };
  }
}
