const axios = require('axios');
const Logger = require('../utils/logger');

/**
 * Team Statistics Validator and Corrector
 * Ensures team statistics are accurate and from the correct season
 */
class TeamStatisticsValidator {
  constructor(apiKey, baseUrl) {
    this.logger = new Logger('TeamStatisticsValidator');
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;

    // Known team ID changes in FootyStats API
    this.teamIdCorrections = {
      // Currently empty - we need to discover correct mappings
      // Removed incorrect mappings:
      // 4 was wrongly mapped to 303 (which is Gimnàstic de Tarragona)
      // 5569 was wrongly mapped to 14524 (which doesn't exist)
    };

    // Validation rules
    this.validationRules = {
      maxMatchesPerSeason: 60,
      minGoalsRatio: 0.1, // At least 0.1 goals per match if played > 10 matches
      seasonYears: [2024, 2025], // Valid season years
    };

    // Cache for validated data
    this.validationCache = new Map();
    this.CACHE_TTL = 30 * 60 * 1000; // 30 minutes
  }

  /**
   * Validate and correct team statistics
   */
  async validateTeamStats(teamId, rawStats, leagueInfo, teamInfo) {
    const issues = [];
    const corrections = {};

    try {
      // 1. Check if team ID needs correction
      const idCorrection = this.teamIdCorrections[teamId];
      if (idCorrection) {
        issues.push(
          `Team ID mismatch: ${teamId} should be ${idCorrection.correctId} (${idCorrection.name})`
        );
        corrections.needsIdCorrection = true;
        corrections.correctTeamId = idCorrection.correctId;
        corrections.correctTeamInfo = idCorrection;
      }

      // 2. Validate statistics consistency
      const statsIssues = this.validateStatisticsConsistency(rawStats);
      if (statsIssues.length > 0) {
        issues.push(...statsIssues);
      }

      // 3. Validate league/season information
      const leagueIssues = this.validateLeagueInfo(leagueInfo, teamInfo, idCorrection);
      if (leagueIssues.length > 0) {
        issues.push(...leagueIssues);
      }

      // 4. Cross-validate with season data if possible
      if (leagueInfo.id && !corrections.needsIdCorrection) {
        const seasonValidation = await this.validateAgainstSeasonData(
          teamId,
          leagueInfo.id,
          rawStats
        );
        if (seasonValidation.issues.length > 0) {
          issues.push(...seasonValidation.issues);
          if (seasonValidation.correctedStats) {
            corrections.stats = seasonValidation.correctedStats;
          }
        }
      }

      // 5. Apply intelligent corrections
      const correctedStats = this.applyStatisticsCorrections(rawStats, issues);

      return {
        isValid: issues.length === 0,
        issues,
        corrections,
        correctedStats,
        confidence: this.calculateConfidence(issues, rawStats),
      };
    } catch (error) {
      this.logger.error(`Error validating team ${teamId}: ${error.message}`);
      return {
        isValid: false,
        issues: [`Validation error: ${error.message}`],
        corrections: {},
        correctedStats: rawStats,
        confidence: 0.5,
      };
    }
  }

  /**
   * Validate statistics internal consistency
   */
  validateStatisticsConsistency(stats) {
    const issues = [];

    // Check W+D+L = Total matches
    const calculatedTotal = stats.wins + stats.draws + stats.losses;
    if (calculatedTotal !== stats.totalMatches && stats.totalMatches > 0) {
      issues.push(`Match count mismatch: W+D+L=${calculatedTotal}, Total=${stats.totalMatches}`);
    }

    // Check if matches exceed reasonable limit
    if (stats.totalMatches > this.validationRules.maxMatchesPerSeason) {
      issues.push(
        `Excessive matches: ${stats.totalMatches} (max ${this.validationRules.maxMatchesPerSeason})`
      );
    }

    // Check goals ratio
    if (stats.totalMatches > 10) {
      const goalsPerMatch = stats.goalsFor / stats.totalMatches;
      if (goalsPerMatch < this.validationRules.minGoalsRatio) {
        issues.push(`Suspicious goal ratio: ${goalsPerMatch.toFixed(2)} goals/match`);
      }
    }

    // Check points calculation (assuming 3 points for win, 1 for draw)
    const expectedPoints = stats.wins * 3 + stats.draws;
    if (stats.points > 0 && Math.abs(stats.points - expectedPoints) > 1) {
      issues.push(`Points mismatch: Expected ${expectedPoints}, got ${stats.points}`);
    }

    // Check home/away totals
    const homeTotal = stats.homeWins + stats.homeDraws + stats.homeLosses;
    const awayTotal = stats.awayWins + stats.awayDraws + stats.awayLosses;
    if (homeTotal + awayTotal !== stats.totalMatches && stats.totalMatches > 0) {
      issues.push(`Home/Away total mismatch: ${homeTotal}+${awayTotal} != ${stats.totalMatches}`);
    }

    return issues;
  }

  /**
   * Validate league information
   */
  validateLeagueInfo(leagueInfo, teamInfo, idCorrection) {
    const issues = [];

    // Check if league makes sense for the team
    if (idCorrection) {
      if (
        !leagueInfo.name.includes(idCorrection.league) &&
        !idCorrection.league.includes(leagueInfo.name.replace(`${leagueInfo.country} `, ''))
      ) {
        issues.push(`Wrong league: ${leagueInfo.name} (expected ${idCorrection.league})`);
      }

      if (leagueInfo.country !== idCorrection.country) {
        issues.push(`Wrong country: ${leagueInfo.country} (expected ${idCorrection.country})`);
      }
    }

    // Check season year
    if (leagueInfo.season) {
      const hasValidYear = this.validationRules.seasonYears.some(year =>
        leagueInfo.season.includes(year.toString())
      );
      if (!hasValidYear) {
        issues.push(`Outdated season: ${leagueInfo.season}`);
      }
    }

    return issues;
  }

  /**
   * Validate against actual season data
   */
  async validateAgainstSeasonData(teamId, seasonId, stats) {
    try {
      // Try to get team data from the specific season
      const response = await axios.get(`${this.baseUrl}/league-teams`, {
        params: {
          key: this.apiKey,
          season_id: seasonId,
          include: 'stats',
        },
        timeout: 5000,
      });

      if (response.data.success && response.data.data) {
        const teamData = response.data.data.find(t => t.id == teamId);

        if (teamData && teamData.table_position) {
          // Compare key statistics
          const issues = [];
          const seasonStats = teamData.stats || {};

          if (Math.abs((seasonStats.wins || 0) - stats.wins) > 1) {
            issues.push(`Wins mismatch: API=${stats.wins}, Season=${seasonStats.wins || 0}`);
          }

          if (Math.abs((seasonStats.losses || 0) - stats.losses) > 1) {
            issues.push(`Losses mismatch: API=${stats.losses}, Season=${seasonStats.losses || 0}`);
          }

          return { issues, correctedStats: seasonStats };
        }
      }

      return { issues: [], correctedStats: null };
    } catch (error) {
      this.logger.warn(`Could not validate against season data: ${error.message}`);
      return { issues: [], correctedStats: null };
    }
  }

  /**
   * Apply corrections to statistics
   */
  applyStatisticsCorrections(stats, issues) {
    const corrected = { ...stats };

    // Fix match totals if W+D+L doesn't match
    const calculatedTotal = stats.wins + stats.draws + stats.losses;
    if (calculatedTotal !== stats.totalMatches && calculatedTotal > 0) {
      corrected.totalMatches = calculatedTotal;
      corrected.completedMatches = calculatedTotal;
    }

    // Fix points if they're 0 but matches were played
    if (stats.points === 0 && stats.totalMatches > 0) {
      corrected.points = stats.wins * 3 + stats.draws;
    }

    // Ensure goal difference is correct
    corrected.goalDifference = corrected.goalsFor - corrected.goalsAgainst;

    return corrected;
  }

  /**
   * Calculate confidence in the statistics
   */
  calculateConfidence(issues, stats) {
    let confidence = 1.0;

    // Reduce confidence for each issue
    issues.forEach(issue => {
      if (issue.includes('Wrong league') || issue.includes('Team ID mismatch')) {
        confidence *= 0.5;
      } else if (issue.includes('mismatch')) {
        confidence *= 0.8;
      } else {
        confidence *= 0.9;
      }
    });

    // Boost confidence if key stats look reasonable
    if (stats.totalMatches > 0 && stats.totalMatches < 50) {
      confidence *= 1.1;
    }

    if (stats.goalsFor > 0 && stats.goalsAgainst > 0) {
      confidence *= 1.1;
    }

    return Math.max(0.1, Math.min(1.0, confidence));
  }

  /**
   * Get correct team ID if it has changed
   */
  getCorrectTeamId(teamId) {
    const correction = this.teamIdCorrections[teamId];
    return correction ? correction.correctId : teamId;
  }

  /**
   * Clear validation cache
   */
  clearCache() {
    this.validationCache.clear();
    this.logger.info('🧹 Validation cache cleared');
  }
}

module.exports = TeamStatisticsValidator;
