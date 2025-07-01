/**
 * Team Data Enhancer
 * Detects and fixes incorrect team data from API
 */
class TeamDataEnhancer {
  constructor() {
    // Known team expectations (what we expect vs what API returns)
    this.teamExpectations = {
      4: {
        expectedName: 'Manchester City',
        expectedCountry: 'England',
        expectedLeague: 'Premier League',
        actualName: null, // Will be filled from API
        actualCountry: null,
        status: 'mismatch',
      },
      5: {
        expectedName: 'Manchester United',
        expectedCountry: 'England',
        expectedLeague: 'Premier League',
        actualName: null,
        actualCountry: null,
        status: 'unknown',
      },
      5569: {
        expectedName: 'Inter Miami',
        expectedCountry: 'USA',
        expectedLeague: 'MLS',
        actualName: null,
        actualCountry: null,
        status: 'mismatch',
      },
    };

    // Statistics overrides for known problematic teams
    this.statisticsOverrides = {
      // If we know certain teams have wrong stats, we can override here
    };

    // League name corrections
    this.leagueNameCorrections = {
      'Unknown League': {
        England: 'Premier League',
        USA: 'MLS',
        Spain: 'La Liga',
        Italy: 'Serie A',
        Germany: 'Bundesliga',
        France: 'Ligue 1',
      },
    };
  }

  /**
   * Enhance team data with corrections and warnings
   */
  enhanceTeamData(teamId, teamData, leagueInfo, statistics) {
    const enhancements = {
      warnings: [],
      corrections: {},
      metadata: {},
    };

    // Check if this is a known problematic team
    const expectation = this.teamExpectations[teamId];

    if (expectation) {
      // Update what we actually got from API
      expectation.actualName = teamData.name;
      expectation.actualCountry = teamData.country;

      // Check for mismatches
      if (
        expectation.expectedName !== teamData.name ||
        expectation.expectedCountry !== teamData.country
      ) {
        enhancements.warnings.push({
          type: 'team_mismatch',
          message: `Expected ${expectation.expectedName} (${expectation.expectedCountry}), but got ${teamData.name} (${teamData.country})`,
          severity: 'high',
        });

        // Add metadata about the mismatch
        enhancements.metadata.expectedTeam = {
          name: expectation.expectedName,
          country: expectation.expectedCountry,
          league: expectation.expectedLeague,
        };

        enhancements.metadata.actualTeam = {
          name: teamData.name,
          country: teamData.country,
          league: leagueInfo.name,
        };

        // Flag this data as unreliable
        enhancements.corrections.dataReliability = 'low';
      }
    }

    // Check for "Unknown League" and try to correct
    if (leagueInfo.name === 'Unknown League' || leagueInfo.name.includes('Unknown')) {
      const correction = this.leagueNameCorrections['Unknown League'][teamData.country];

      if (correction) {
        enhancements.corrections.suggestedLeague = correction;
        enhancements.warnings.push({
          type: 'unknown_league',
          message: `League is unknown, suggested: ${correction}`,
          severity: 'medium',
        });
      }
    }

    // Check for suspicious statistics patterns
    const statsWarnings = this.validateStatisticsPatterns(statistics, teamData);
    if (statsWarnings.length > 0) {
      enhancements.warnings.push(...statsWarnings);
    }

    // Add data quality score
    enhancements.metadata.dataQualityScore = this.calculateDataQuality(
      teamData,
      leagueInfo,
      statistics,
      enhancements.warnings
    );

    return enhancements;
  }

  /**
   * Validate statistics patterns for anomalies
   */
  validateStatisticsPatterns(stats, teamData) {
    const warnings = [];

    // Check for all zeros (likely missing data)
    if (stats.totalMatches > 0 && stats.goalsFor === 0 && stats.goalsAgainst === 0) {
      warnings.push({
        type: 'missing_goals_data',
        message: 'Goals data appears to be missing (all zeros)',
        severity: 'medium',
      });
    }

    // Check for unrealistic win rates
    if (stats.totalMatches > 10) {
      const winRate = stats.wins / stats.totalMatches;

      if (winRate > 0.85) {
        warnings.push({
          type: 'suspicious_win_rate',
          message: `Unusually high win rate: ${(winRate * 100).toFixed(0)}%`,
          severity: 'low',
        });
      }

      if (winRate < 0.05 && stats.totalMatches > 20) {
        warnings.push({
          type: 'suspicious_win_rate',
          message: `Unusually low win rate: ${(winRate * 100).toFixed(0)}%`,
          severity: 'low',
        });
      }
    }

    // Check points calculation
    const expectedPoints = stats.wins * 3 + stats.draws;
    if (stats.points > 0 && Math.abs(stats.points - expectedPoints) > 3) {
      warnings.push({
        type: 'points_mismatch',
        message: `Points (${stats.points}) don't match W/D/L calculation (${expectedPoints})`,
        severity: 'high',
      });
    }

    return warnings;
  }

  /**
   * Calculate overall data quality score
   */
  calculateDataQuality(teamData, leagueInfo, statistics, warnings) {
    let score = 100;

    // Deduct points for warnings
    warnings.forEach(warning => {
      switch (warning.severity) {
        case 'high':
          score -= 30;
          break;
        case 'medium':
          score -= 15;
          break;
        case 'low':
          score -= 5;
          break;
      }
    });

    // Deduct for unknown league
    if (leagueInfo.name.includes('Unknown')) {
      score -= 20;
    }

    // Deduct for missing statistics
    if (statistics.totalMatches === 0) {
      score -= 25;
    }

    // Bonus for complete data
    if (
      statistics.totalMatches > 0 &&
      statistics.goalsFor > 0 &&
      leagueInfo.id &&
      !leagueInfo.name.includes('Unknown')
    ) {
      score += 10;
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Get recommendation for the data
   */
  getDataRecommendation(dataQualityScore) {
    if (dataQualityScore >= 80) {
      return {
        status: 'reliable',
        message: 'Data appears to be accurate and complete',
        action: 'use_as_is',
      };
    } else if (dataQualityScore >= 50) {
      return {
        status: 'questionable',
        message: 'Data has some issues but may be partially accurate',
        action: 'use_with_caution',
      };
    } else {
      return {
        status: 'unreliable',
        message: 'Data has significant issues and should not be trusted',
        action: 'requires_manual_verification',
      };
    }
  }

  /**
   * Generate a detailed report for debugging
   */
  generateDataReport(teamId) {
    const expectation = this.teamExpectations[teamId];

    if (!expectation) {
      return null;
    }

    return {
      teamId,
      expected: {
        name: expectation.expectedName,
        country: expectation.expectedCountry,
        league: expectation.expectedLeague,
      },
      actual: {
        name: expectation.actualName,
        country: expectation.actualCountry,
      },
      status: expectation.status,
      recommendation:
        'This team ID may have changed in the FootyStats API. Manual verification required.',
    };
  }
}

module.exports = TeamDataEnhancer;
