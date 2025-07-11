/**
 * Shots Display Module
 * Handles the display of shots statistics
 */

(function (global) {
  'use strict';

  // Debug mode
  const DEBUG = false;

  class ShotsDisplay {
    constructor() {
      this.name = 'ShotsDisplay';
      this.initialized = false;
    }

    /**
     * Update element helper
     */
    updateElement(id, value) {
      const element = document.getElementById(id);
      if (element) {
        element.textContent = value;
      }
    }

    /**
     * Update shots statistics
     */
    updateShotsStatistics(statistics, filter = 'overall') {
      log('[ShotsDisplay] Updating shots statistics with filter:', filter);

      // Basic shots stats - handle different filters
      let shotsPerMatch, shotsOnTargetPerMatch, shotsOffTargetPerMatch;

      if (filter === 'overall') {
        shotsPerMatch = statistics.shotsAVG || statistics.shotsPerMatch || 0;
        shotsOnTargetPerMatch =
          statistics.shotsOnTargetAVG || statistics.shotsOnTargetPerMatch || 0;
        shotsOffTargetPerMatch =
          statistics.shotsOffTargetAVG || statistics.shotsOffTargetPerMatch || 0;
      } else if (filter === 'home') {
        shotsPerMatch = statistics.shotsPerMatch_home || statistics.homeShotsAVG || 0;
        shotsOnTargetPerMatch =
          statistics.shotsOnTargetPerMatch_home || statistics.homeShotsOnTargetAVG || 0;
        shotsOffTargetPerMatch =
          statistics.shotsOffTargetPerMatch_home || statistics.homeShotsOffTargetAVG || 0;
      } else if (filter === 'away') {
        shotsPerMatch = statistics.shotsPerMatch_away || statistics.awayShotsAVG || 0;
        shotsOnTargetPerMatch =
          statistics.shotsOnTargetPerMatch_away || statistics.awayShotsOnTargetAVG || 0;
        shotsOffTargetPerMatch =
          statistics.shotsOffTargetPerMatch_away || statistics.awayShotsOffTargetAVG || 0;
      }

      this.updateElement('shotsPerMatch', shotsPerMatch.toFixed(1));
      this.updateElement('shotsOnTargetPerMatch', shotsOnTargetPerMatch.toFixed(1));
      this.updateElement('shotsOffTargetPerMatch', shotsOffTargetPerMatch.toFixed(1));

      // Conversion rates - handle different filters
      let conversionRate, shotsPerGoal, shotsOnTargetPerGoal;

      if (filter === 'overall') {
        conversionRate = statistics.shotsConversionRate || 0;
        shotsPerGoal = statistics.shotsPerGoal || 0;
        shotsOnTargetPerGoal = statistics.shotsOnTargetPerGoal || 0;
      } else if (filter === 'home') {
        conversionRate =
          statistics.homeShotsConversionRate || statistics.shotsConversionRate_home || 0;
        shotsPerGoal = statistics.homeShotsPerGoal || statistics.shotsPerGoal_home || 0;
        shotsOnTargetPerGoal =
          statistics.homeShotsOnTargetPerGoal || statistics.shotsOnTargetPerGoal_home || 0;
      } else if (filter === 'away') {
        conversionRate =
          statistics.awayShotsConversionRate || statistics.shotsConversionRate_away || 0;
        shotsPerGoal = statistics.awayShotsPerGoal || statistics.shotsPerGoal_away || 0;
        shotsOnTargetPerGoal =
          statistics.awayShotsOnTargetPerGoal || statistics.shotsOnTargetPerGoal_away || 0;
      }

      this.updateElement('shotsConversionRate', conversionRate + '%');
      this.updateElement('shotsPerGoal', shotsPerGoal.toFixed(1));
      this.updateElement('shotsOnTargetPerGoal', shotsOnTargetPerGoal.toFixed(1));

      // Team Shots Over percentages
      const shotThresholds = ['10_5', '11_5', '12_5', '13_5', '14_5', '15_5'];
      shotThresholds.forEach(threshold => {
        let value;
        if (filter === 'overall') {
          value =
            statistics[`shotsOver${threshold}`] || statistics[`teamShotsOver${threshold}`] || 0;
        } else if (filter === 'home') {
          value =
            statistics[`homeShotsOver${threshold}`] ||
            statistics[`teamShotsOver${threshold}_home`] ||
            0;
        } else if (filter === 'away') {
          value =
            statistics[`awayShotsOver${threshold}`] ||
            statistics[`teamShotsOver${threshold}_away`] ||
            0;
        }
        this.updateElement(`teamShotsOver${threshold}`, value + '%');
      });

      // Shots On Target Over percentages
      const targetThresholds = ['3_5', '4_5', '5_5', '6_5'];
      targetThresholds.forEach(threshold => {
        let value;
        if (filter === 'overall') {
          value =
            statistics[`shotsOnTargetOver${threshold}`] ||
            statistics[`teamShotsOnTargetOver${threshold}`] ||
            0;
        } else if (filter === 'home') {
          value =
            statistics[`homeShotsOnTargetOver${threshold}`] ||
            statistics[`teamShotsOnTargetOver${threshold}_home`] ||
            0;
        } else if (filter === 'away') {
          value =
            statistics[`awayShotsOnTargetOver${threshold}`] ||
            statistics[`teamShotsOnTargetOver${threshold}_away`] ||
            0;
        }
        this.updateElement(`teamShotsOnTargetOver${threshold}`, value + '%');
      });

      // Match Shots Over percentages
      const matchShotThresholds = ['23_5', '24_5', '25_5', '26_5'];
      matchShotThresholds.forEach(threshold => {
        let value;
        if (filter === 'overall') {
          value = statistics[`matchShotsOver${threshold}`] || 0;
        } else if (filter === 'home') {
          value =
            statistics[`homeMatchShotsOver${threshold}`] ||
            statistics[`matchShotsOver${threshold}_home`] ||
            0;
        } else if (filter === 'away') {
          value =
            statistics[`awayMatchShotsOver${threshold}`] ||
            statistics[`matchShotsOver${threshold}_away`] ||
            0;
        }
        log(`[ShotsDisplay] Match Shots Over ${threshold} (${filter}):`, value);
        this.updateElement(`matchShotsOver${threshold}`, value + '%');
      });

      // Match Shots On Target Over percentages
      const matchTargetThresholds = ['7_5', '8_5', '9_5', '10_5'];
      matchTargetThresholds.forEach(threshold => {
        let value;
        if (filter === 'overall') {
          value = statistics[`matchShotsOnTargetOver${threshold}`] || 0;
        } else if (filter === 'home') {
          value =
            statistics[`homeMatchShotsOnTargetOver${threshold}`] ||
            statistics[`matchShotsOnTargetOver${threshold}_home`] ||
            0;
        } else if (filter === 'away') {
          value =
            statistics[`awayMatchShotsOnTargetOver${threshold}`] ||
            statistics[`matchShotsOnTargetOver${threshold}_away`] ||
            0;
        }
        this.updateElement(`matchShotsOnTargetOver${threshold}`, value + '%');
      });

      // Update Offsides statistics
      this.updateOffsidesStats(statistics, filter);

      // Update xG statistics
      this.updateXGStats(statistics, filter);
    }

    /**
     * Update offsides statistics
     */
    updateOffsidesStats(statistics, filter) {
      // Offsides averages
      let matchOffsidesAvg = 0;
      let teamOffsidesAvg = 0;

      if (filter === 'overall') {
        matchOffsidesAvg = statistics.matchOffsidesAvg || statistics.matchOffsidesAVG || 0;
        teamOffsidesAvg =
          statistics.offsidesAvg || statistics.teamOffsidesAvg || statistics.teamOffsidesAVG || 0;
      } else if (filter === 'home') {
        matchOffsidesAvg = statistics.homeMatchOffsidesAvg || statistics.homeMatchOffsidesAVG || 0;
        teamOffsidesAvg =
          statistics.homeOffsidesAvg ||
          statistics.homeTeamOffsidesAvg ||
          statistics.homeTeamOffsidesAVG ||
          0;
      } else if (filter === 'away') {
        matchOffsidesAvg = statistics.awayMatchOffsidesAvg || statistics.awayMatchOffsidesAVG || 0;
        teamOffsidesAvg =
          statistics.awayOffsidesAvg ||
          statistics.awayTeamOffsidesAvg ||
          statistics.awayTeamOffsidesAVG ||
          0;
      }

      this.updateElement('matchOffsidesAvg', matchOffsidesAvg.toFixed(1));
      this.updateElement('teamOffsidesAvg', teamOffsidesAvg.toFixed(1));

      // Offsides over percentages
      const offsidesThresholds = ['0_5', '1_5', '2_5', '3_5'];

      // Match offsides
      offsidesThresholds.forEach(threshold => {
        let value = 0;
        if (filter === 'overall') {
          value =
            statistics[`matchOffsidesOver${threshold}`] ||
            statistics[`offsidesOver${threshold}`] ||
            0;
        } else if (filter === 'home') {
          value =
            statistics[`homeMatchOffsidesOver${threshold}`] ||
            statistics[`homeOffsidesOver${threshold}`] ||
            0;
        } else if (filter === 'away') {
          value =
            statistics[`awayMatchOffsidesOver${threshold}`] ||
            statistics[`awayOffsidesOver${threshold}`] ||
            0;
        }
        this.updateElement(`matchOffsidesOver${threshold}`, value + '%');
      });

      // Team offsides (only first 3 thresholds)
      ['0_5', '1_5', '2_5'].forEach(threshold => {
        let value = 0;
        if (filter === 'overall') {
          value =
            statistics[`teamOffsidesOver${threshold}`] ||
            statistics[`offsidesOver${threshold}`] ||
            0;
        } else if (filter === 'home') {
          value =
            statistics[`homeTeamOffsidesOver${threshold}`] ||
            statistics[`homeOffsidesOver${threshold}`] ||
            0;
        } else if (filter === 'away') {
          value =
            statistics[`awayTeamOffsidesOver${threshold}`] ||
            statistics[`awayOffsidesOver${threshold}`] ||
            0;
        }
        this.updateElement(`teamOffsidesOver${threshold}`, value + '%');
      });
    }

    /**
     * Update xG statistics
     */
    updateXGStats(statistics, filter) {
      let xgFor = 0,
        xgAgainst = 0;

      if (filter === 'overall') {
        xgFor = statistics.xgFor || 0;
        xgAgainst = statistics.xgAgainst || 0;
      } else if (filter === 'home') {
        xgFor = statistics.homeXgFor || 0;
        xgAgainst = statistics.homeXgAgainst || 0;
      } else if (filter === 'away') {
        xgFor = statistics.awayXgFor || 0;
        xgAgainst = statistics.awayXgAgainst || 0;
      }

      this.updateElement('xgFor', xgFor.toFixed(2));
      this.updateElement('xgAgainst', xgAgainst.toFixed(2));
    }

    /**
     * Initialize the module
     */
    initialize() {
      if (this.initialized) {
        log('[ShotsDisplay] Already initialized');
        return;
      }

      this.initialized = true;
      log('[ShotsDisplay] Initialized');
    }
  }

  // Create and export singleton instance
  const shotsDisplay = new ShotsDisplay();
  global.TeamStatsShotsDisplay = shotsDisplay;

  console.log('[ShotsDisplay] Module loaded');
})(window);
