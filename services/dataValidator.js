/**
 * Data Validation Service
 * Validates and ensures data freshness from FootyStats API
 */

class DataValidator {
  constructor() {
    this.warningThresholds = {
      daysSinceUpdate: 3,
      matchesPlayedDifference: 2,
      positionDifference: 5,
    };
  }

  /**
   * Validate team data freshness and accuracy
   */
  validateTeamData(teamData, expectedData = null) {
    const validationResult = {
      isValid: true,
      warnings: [],
      errors: [],
      suggestions: [],
    };

    // Check if data exists
    if (!teamData || !teamData.stats) {
      validationResult.isValid = false;
      validationResult.errors.push('No team data or stats available');
      return validationResult;
    }

    // Check season
    if (teamData.season) {
      const currentYear = new Date().getFullYear();
      const seasonYear = parseInt(teamData.season.split('/')[0]);
      if (currentYear - seasonYear > 1) {
        validationResult.warnings.push(`Data is from ${teamData.season} season`);
      }
    }

    // Validate statistics consistency
    const stats = teamData.stats;
    const totalMatches =
      (stats.seasonWinsNum_overall || 0) +
      (stats.seasonDrawsNum_overall || 0) +
      (stats.seasonLossesNum_overall || 0);

    if (stats.seasonMatchesPlayed_overall !== totalMatches) {
      validationResult.warnings.push(
        `Match count inconsistency: Played=${stats.seasonMatchesPlayed_overall}, W+D+L=${totalMatches}`
      );
    }

    // Check points calculation
    const calculatedPoints =
      (stats.seasonWinsNum_overall || 0) * 3 + (stats.seasonDrawsNum_overall || 0);
    if (stats.seasonPoints_overall && stats.seasonPoints_overall !== calculatedPoints) {
      validationResult.warnings.push(
        `Points mismatch: API=${stats.seasonPoints_overall}, Calculated=${calculatedPoints}`
      );
    }

    // Check PPG calculation
    if (stats.seasonMatchesPlayed_overall > 0) {
      const calculatedPPG = calculatedPoints / stats.seasonMatchesPlayed_overall;
      const apiPPG = stats.seasonPPG_overall || 0;
      if (Math.abs(calculatedPPG - apiPPG) > 0.1) {
        validationResult.warnings.push(
          `PPG mismatch: API=${apiPPG.toFixed(2)}, Calculated=${calculatedPPG.toFixed(2)}`
        );
      }
    }

    // Compare with expected data if provided
    if (expectedData) {
      if (expectedData.position && teamData.table_position) {
        const posDiff = Math.abs(expectedData.position - teamData.table_position);
        if (posDiff >= this.warningThresholds.positionDifference) {
          validationResult.errors.push(
            `Position mismatch: API=${teamData.table_position}, Expected=${expectedData.position}`
          );
          validationResult.isValid = false;
        }
      }

      if (expectedData.ppg && stats.seasonPPG_overall) {
        const ppgDiff = Math.abs(expectedData.ppg - stats.seasonPPG_overall);
        if (ppgDiff > 0.5) {
          validationResult.errors.push(
            `PPG mismatch: API=${stats.seasonPPG_overall}, Expected=${expectedData.ppg}`
          );
          validationResult.isValid = false;
        }
      }
    }

    // Add suggestions
    if (validationResult.warnings.length > 0 || validationResult.errors.length > 0) {
      validationResult.suggestions.push('Consider refreshing data from API');
      validationResult.suggestions.push('Check if using correct season/competition ID');
      validationResult.suggestions.push('Verify API endpoint parameters');
    }

    return validationResult;
  }

  /**
   * Compare two datasets to detect changes
   */
  compareTeamData(oldData, newData) {
    const changes = {
      hasChanges: false,
      differences: [],
    };

    const fieldsToCompare = [
      'table_position',
      'seasonMatchesPlayed_overall',
      'seasonWinsNum_overall',
      'seasonDrawsNum_overall',
      'seasonLossesNum_overall',
      'seasonPoints_overall',
      'seasonPPG_overall',
    ];

    fieldsToCompare.forEach(field => {
      const oldValue = this.getNestedValue(oldData, field);
      const newValue = this.getNestedValue(newData, field);

      if (oldValue !== newValue) {
        changes.hasChanges = true;
        changes.differences.push({
          field,
          oldValue,
          newValue,
          change: newValue - oldValue,
        });
      }
    });

    return changes;
  }

  /**
   * Get nested object value safely
   */
  getNestedValue(obj, path) {
    return path
      .split('.')
      .reduce((curr, prop) => (curr && curr[prop] !== undefined ? curr[prop] : null), obj);
  }

  /**
   * Generate data quality report
   */
  generateQualityReport(teamData) {
    const report = {
      timestamp: new Date().toISOString(),
      teamId: teamData.id,
      teamName: teamData.name,
      season: teamData.season,
      dataQuality: 'Unknown',
      issues: [],
      metrics: {},
    };

    // Calculate data completeness
    const requiredFields = [
      'table_position',
      'seasonMatchesPlayed_overall',
      'seasonPPG_overall',
      'seasonWinsNum_overall',
      'seasonDrawsNum_overall',
      'seasonLossesNum_overall',
    ];

    let filledFields = 0;
    requiredFields.forEach(field => {
      const value = this.getNestedValue(teamData, field);
      if (value !== null && value !== undefined && value !== 'Bulunamadı') {
        filledFields++;
      } else {
        report.issues.push(`Missing field: ${field}`);
      }
    });

    report.metrics.completeness = (filledFields / requiredFields.length) * 100;

    // Determine quality rating
    if (report.metrics.completeness === 100 && report.issues.length === 0) {
      report.dataQuality = 'Excellent';
    } else if (report.metrics.completeness >= 80) {
      report.dataQuality = 'Good';
    } else if (report.metrics.completeness >= 60) {
      report.dataQuality = 'Fair';
    } else {
      report.dataQuality = 'Poor';
    }

    return report;
  }
}

module.exports = DataValidator;
