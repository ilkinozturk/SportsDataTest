import { BaseStatistics } from './BaseStatistics.js';

/**
 * XGStatistics - Manages Expected Goals (xG) statistics
 */
export class XGStatistics extends BaseStatistics {
  constructor(filterManager) {
    super(filterManager);
    
    // Listen to xG filter changes
    this.filterManager.on('xg', (newValue) => {
      if (this.statistics) {
        this.updateXgStats(newValue);
      }
    });
  }

  /**
   * Update all xG statistics
   * @param {Object} statistics - Statistics data
   */
  update(statistics) {
    if (!statistics) return;
    
    this.setStatistics(statistics);
    
    // Update xG statistics
    const currentFilter = this.filterManager.getFilter('xg');
    this.updateXgStats(currentFilter);
  }

  /**
   * Update xG statistics based on filter
   * @param {string} filter - Filter type (overall, home, away)
   */
  updateXgStats(filter = 'overall') {
    const statistics = this.statistics;
    if (!statistics) return;

    // Get filtered stats helper
    const getFilteredStats = (stats, filter) => {
      if (filter === 'home') {
        return {
          matches: stats.homeMatches || 0,
          wins: stats.homeWins || 0,
          draws: stats.homeDraws || 0,
          losses: stats.homeLosses || 0
        };
      } else if (filter === 'away') {
        return {
          matches: stats.awayMatches || 0,
          wins: stats.awayWins || 0,
          draws: stats.awayDraws || 0,
          losses: stats.awayLosses || 0
        };
      }
      return {
        matches: stats.completedMatches || stats.totalMatches || 0,
        wins: stats.wins || 0,
        draws: stats.draws || 0,
        losses: stats.losses || 0
      };
    };

    const filteredStats = getFilteredStats(statistics, filter);
    const completedMatches = filteredStats.matches || 1;

    if (filter === 'home') {
      // Home filter - show home-specific data
      this.updateHomeXgStats(statistics);
    } else if (filter === 'away') {
      // Away filter - show away-specific data
      this.updateAwayXgStats(statistics);
    } else {
      // Overall filter - show overall data
      this.updateOverallXgStats(statistics);
    }

    // Update performance comparison
    this.updatePerformanceComparison(filter);
    
    // Update xG over/under stats if they exist
    this.updateXgOverUnder(filter);
  }

  /**
   * Update home xG statistics
   * @private
   */
  updateHomeXgStats(statistics) {
    const xgFor = statistics.homeXgForPerMatch || 0;
    const xgAgainst = statistics.homeXgAgainstPerMatch || 0;
    const xgDiff = xgFor - xgAgainst;
    
    const goalsFor = statistics.homeGoalsForPerMatch || 0;
    const goalsAgainst = statistics.homeGoalsAgainstPerMatch || 0;
    const goalDiff = goalsFor - goalsAgainst;

    this.updateElement('xgForTotal', xgFor, { isDecimal: true });
    this.updateElement('xgAgainstTotal', xgAgainst, { isDecimal: true });
    this.updateElement('xgDifference', (xgDiff >= 0 ? '+' : '') + xgDiff.toFixed(2));
    
    this.updateElement('goalsForAvg', goalsFor, { isDecimal: true });
    this.updateElement('goalsAgainstAvg', goalsAgainst, { isDecimal: true });
    this.updateElement('goalDifferenceAvg', (goalDiff >= 0 ? '+' : '') + goalDiff.toFixed(2));
  }

  /**
   * Update away xG statistics
   * @private
   */
  updateAwayXgStats(statistics) {
    const xgFor = statistics.awayXgForPerMatch || 0;
    const xgAgainst = statistics.awayXgAgainstPerMatch || 0;
    const xgDiff = xgFor - xgAgainst;
    
    const goalsFor = statistics.awayGoalsForPerMatch || 0;
    const goalsAgainst = statistics.awayGoalsAgainstPerMatch || 0;
    const goalDiff = goalsFor - goalsAgainst;

    this.updateElement('xgForTotal', xgFor, { isDecimal: true });
    this.updateElement('xgAgainstTotal', xgAgainst, { isDecimal: true });
    this.updateElement('xgDifference', (xgDiff >= 0 ? '+' : '') + xgDiff.toFixed(2));
    
    this.updateElement('goalsForAvg', goalsFor, { isDecimal: true });
    this.updateElement('goalsAgainstAvg', goalsAgainst, { isDecimal: true });
    this.updateElement('goalDifferenceAvg', (goalDiff >= 0 ? '+' : '') + goalDiff.toFixed(2));
  }

  /**
   * Update overall xG statistics
   * @private
   */
  updateOverallXgStats(statistics) {
    const xgFor = statistics.xgForPerMatch || 0;
    const xgAgainst = statistics.xgAgainstPerMatch || 0;
    const xgDiff = statistics.xgDifferencePerMatch || (xgFor - xgAgainst);
    
    const goalsFor = statistics.goalsForPerMatch || 0;
    const goalsAgainst = statistics.averageGoalsAgainst || statistics.goalsAgainstPerMatch || 0;
    const goalDiff = goalsFor - goalsAgainst;

    this.updateElement('xgForTotal', xgFor, { isDecimal: true });
    this.updateElement('xgAgainstTotal', xgAgainst, { isDecimal: true });
    this.updateElement('xgDifference', (xgDiff >= 0 ? '+' : '') + xgDiff.toFixed(2));
    
    this.updateElement('goalsForAvg', goalsFor, { isDecimal: true });
    this.updateElement('goalsAgainstAvg', goalsAgainst, { isDecimal: true });
    this.updateElement('goalDifferenceAvg', (goalDiff >= 0 ? '+' : '') + goalDiff.toFixed(2));
  }

  /**
   * Update performance comparison (xG vs actual goals)
   * @param {string} filter - Filter type
   */
  updatePerformanceComparison(filter) {
    const statistics = this.statistics;
    if (!statistics) return;

    let xgFor, xgAgainst, goalsFor, goalsAgainst;

    if (filter === 'home') {
      xgFor = statistics.homeXgForPerMatch || 0;
      xgAgainst = statistics.homeXgAgainstPerMatch || 0;
      goalsFor = statistics.homeGoalsForPerMatch || 0;
      goalsAgainst = statistics.homeGoalsAgainstPerMatch || 0;
    } else if (filter === 'away') {
      xgFor = statistics.awayXgForPerMatch || 0;
      xgAgainst = statistics.awayXgAgainstPerMatch || 0;
      goalsFor = statistics.awayGoalsForPerMatch || 0;
      goalsAgainst = statistics.awayGoalsAgainstPerMatch || 0;
    } else {
      xgFor = statistics.xgForPerMatch || 0;
      xgAgainst = statistics.xgAgainstPerMatch || 0;
      goalsFor = statistics.goalsForPerMatch || 0;
      goalsAgainst = statistics.averageGoalsAgainst || statistics.goalsAgainstPerMatch || 0;
    }

    // Performance difference
    const attackPerformance = goalsFor - xgFor;
    const defensePerformance = xgAgainst - goalsAgainst;

    // Update performance indicators if they exist
    if (document.getElementById('xgAttackPerformance')) {
      this.updateElement('xgAttackPerformance', 
        (attackPerformance >= 0 ? '+' : '') + attackPerformance.toFixed(2));
      
      // Add color coding
      const element = document.getElementById('xgAttackPerformance');
      if (element) {
        element.style.color = attackPerformance > 0 ? '#4ade80' : 
                             attackPerformance < 0 ? '#f87171' : '#94a3b8';
      }
    }

    if (document.getElementById('xgDefensePerformance')) {
      this.updateElement('xgDefensePerformance', 
        (defensePerformance >= 0 ? '+' : '') + defensePerformance.toFixed(2));
      
      // Add color coding
      const element = document.getElementById('xgDefensePerformance');
      if (element) {
        element.style.color = defensePerformance > 0 ? '#4ade80' : 
                             defensePerformance < 0 ? '#f87171' : '#94a3b8';
      }
    }
  }

  /**
   * Update xG over/under statistics
   * @param {string} filter - Filter type
   */
  updateXgOverUnder(filter) {
    const statistics = this.statistics;
    if (!statistics) return;

    // xG Over 0.5-3.5
    const overKeys = ['05', '15', '25', '35'];
    
    overKeys.forEach(key => {
      // xG For Over X.5
      const xgForOverId = `xgForOver${key}`;
      if (document.getElementById(xgForOverId)) {
        const value = this.getFilteredValue(`xgForOver${key}Percentage`, 'xg') || 0;
        this.updateElement(xgForOverId, value, { isPercentage: true });
      }
      
      // xG Against Over X.5
      const xgAgainstOverId = `xgAgainstOver${key}`;
      if (document.getElementById(xgAgainstOverId)) {
        const value = this.getFilteredValue(`xgAgainstOver${key}Percentage`, 'xg') || 0;
        this.updateElement(xgAgainstOverId, value, { isPercentage: true });
      }
      
      // Total xG Over X.5
      const xgTotalOverId = `xgTotalOver${key}`;
      if (document.getElementById(xgTotalOverId)) {
        const value = this.getFilteredValue(`xgTotalOver${key}Percentage`, 'xg') || 0;
        this.updateElement(xgTotalOverId, value, { isPercentage: true });
      }
    });

    // xG ranges if they exist
    this.updateXgRanges(filter);
  }

  /**
   * Update xG range statistics
   * @param {string} filter - Filter type
   */
  updateXgRanges(filter) {
    // Team xG ranges
    if (document.getElementById('xgRange0to1')) {
      const ranges = [
        { id: 'xgRange0to1', field: 'xgRange0to1Percentage' },
        { id: 'xgRange1to2', field: 'xgRange1to2Percentage' },
        { id: 'xgRange2to3', field: 'xgRange2to3Percentage' },
        { id: 'xgRangeOver3', field: 'xgRangeOver3Percentage' }
      ];

      ranges.forEach(range => {
        const value = this.getFilteredValue(range.field, 'xg') || 0;
        this.updateElement(range.id, value, { isPercentage: true });
      });
    }

    // Match xG ranges
    if (document.getElementById('matchXgUnder2')) {
      const matchRanges = [
        { id: 'matchXgUnder2', field: 'matchXgUnder2Percentage' },
        { id: 'matchXg2to3', field: 'matchXg2to3Percentage' },
        { id: 'matchXgOver3', field: 'matchXgOver3Percentage' }
      ];

      matchRanges.forEach(range => {
        const value = this.getFilteredValue(range.field, 'xg') || 0;
        this.updateElement(range.id, value, { isPercentage: true });
      });
    }
  }

  /**
   * Update xG top stats cards
   */
  updateTopStats() {
    const statistics = this.statistics;
    if (!statistics) return;

    // xG For per match
    const xgFor = statistics.xgForPerMatch || 0;
    this.updateElement('xgForValue', xgFor, { isDecimal: true });

    // xG Against per match
    const xgAgainst = statistics.xgAgainstPerMatch || 0;
    this.updateElement('xgAgainstValue', xgAgainst, { isDecimal: true });

    // xG Difference
    const xgDiff = statistics.xgDifferencePerMatch || (xgFor - xgAgainst);
    this.updateElement('xgDiffValue', (xgDiff >= 0 ? '+' : '') + xgDiff.toFixed(2));
  }
}