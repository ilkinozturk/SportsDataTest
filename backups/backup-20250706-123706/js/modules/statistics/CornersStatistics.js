import { BaseStatistics } from './BaseStatistics.js';

/**
 * CornersStatistics - Manages corners statistics
 */
export class CornersStatistics extends BaseStatistics {
  constructor(filterManager) {
    super(filterManager);
    
    // Listen to filter changes
    this.filterManager.on('corners', (newValue) => {
      if (this.statistics) {
        this.updateCornersStats(newValue);
      }
    });
    
    // If team corners filter exists
    this.filterManager.on('teamCorners', (newValue) => {
      if (this.statistics) {
        this.updateTeamCorners(newValue);
      }
    });
  }

  /**
   * Update all corner statistics
   * @param {Object} statistics - Statistics data
   */
  update(statistics) {
    if (!statistics) return;
    
    this.setStatistics(statistics);
    
    // Update corners statistics
    const currentFilter = this.filterManager.getFilter('corners');
    this.updateCornersStats(currentFilter);
    
    // Update team corners if exists
    if (document.getElementById('teamCornersOverallFilter')) {
      const teamCornersFilter = this.filterManager.getFilter('teamCorners');
      this.updateTeamCorners(teamCornersFilter);
    }
  }

  /**
   * Update corners statistics
   * @param {string} filter - Filter type (overall, home, away)
   */
  updateCornersStats(filter = 'overall') {
    const statistics = this.statistics;
    if (!statistics) return;

    let cornersAVG, cornersAgainstAVG, cornersTotalAVG;
    let cornersOver65, cornersOver75, cornersOver85, over95Corners, over105Corners;
    let cornersOver115, cornersOver125, cornersOver135;

    if (filter === 'home') {
      cornersAVG = statistics.homeCornersAVG || '0.00';
      cornersAgainstAVG = statistics.homeCornersAgainstAVG || '0.00';
      cornersTotalAVG = statistics.homeCornersTotalAVG || '0.00';
      
      // Try multiple possible property names for home values
      cornersOver65 = statistics.over65CornersPercentage_home ||
                     statistics.cornersOver65_home ||
                     statistics.homeOver65Corners || 0;
      cornersOver75 = statistics.over75CornersPercentage_away ||
                     statistics.cornersOver75_home ||
                     statistics.homeOver75Corners || 0;
      cornersOver85 = statistics.over85CornersPercentage_home ||
                     statistics.cornersOver85_home ||
                     statistics.homeOver85Corners || 0;
      over95Corners = statistics.over95CornersPercentage_home ||
                     statistics.over95Corners_home ||
                     statistics.homeOver95Corners || 0;
      over105Corners = statistics.over105CornersPercentage_home ||
                      statistics.over105Corners_home ||
                      statistics.homeOver105Corners || 0;
      cornersOver115 = statistics.over115CornersPercentage_home ||
                      statistics.cornersOver115_home ||
                      statistics.homeOver115Corners || 0;
      cornersOver125 = statistics.over125CornersPercentage_home ||
                      statistics.cornersOver125_home ||
                      statistics.homeOver125Corners || 0;
      cornersOver135 = statistics.over135CornersPercentage_home ||
                      statistics.cornersOver135_home ||
                      statistics.homeOver135Corners || 0;
    } else if (filter === 'away') {
      cornersAVG = statistics.awayCornersAVG || '0.00';
      cornersAgainstAVG = statistics.awayCornersAgainstAVG || '0.00';
      cornersTotalAVG = statistics.awayCornersTotalAVG || '0.00';
      
      // Try multiple possible property names for away values
      cornersOver65 = statistics.over65CornersPercentage_away ||
                     statistics.cornersOver65_away ||
                     statistics.awayOver65Corners || 0;
      cornersOver75 = statistics.over75CornersPercentage_away ||
                     statistics.cornersOver75_away ||
                     statistics.awayOver75Corners || 0;
      cornersOver85 = statistics.over85CornersPercentage_away ||
                     statistics.cornersOver85_away ||
                     statistics.awayOver85Corners || 0;
      over95Corners = statistics.over95CornersPercentage_away ||
                     statistics.over95Corners_away ||
                     statistics.awayOver95Corners || 0;
      over105Corners = statistics.over105CornersPercentage_away ||
                      statistics.over105Corners_away ||
                      statistics.awayOver105Corners || 0;
      cornersOver115 = statistics.over115CornersPercentage_away ||
                      statistics.cornersOver115_away ||
                      statistics.awayOver115Corners || 0;
      cornersOver125 = statistics.over125CornersPercentage_away ||
                      statistics.cornersOver125_away ||
                      statistics.awayOver125Corners || 0;
      cornersOver135 = statistics.over135CornersPercentage_away ||
                      statistics.cornersOver135_away ||
                      statistics.awayOver135Corners || 0;
    } else {
      // Overall
      cornersAVG = statistics.cornersAVG || '0.00';
      cornersAgainstAVG = statistics.cornersAgainstAVG || '0.00';
      cornersTotalAVG = statistics.cornersTotalAVG || '0.00';
      cornersOver65 = statistics.cornersOver65 || 0;
      cornersOver75 = statistics.cornersOver75 || 0;
      cornersOver85 = statistics.cornersOver85 || 0;
      over95Corners = statistics.over95Corners || 0;
      over105Corners = statistics.over105Corners || 0;
      cornersOver115 = statistics.cornersOver115 || 0;
      cornersOver125 = statistics.cornersOver125 || 0;
      cornersOver135 = statistics.cornersOver135 || 0;
    }

    // Update the UI - use filter- prefix for corners tab elements
    this.updateElement('filter-cornersEarnedPerMatch', cornersAVG);
    this.updateElement('filter-cornersAgainstPerMatch', cornersAgainstAVG);
    this.updateElement('filter-totalCornersPerMatch', cornersTotalAVG);
    
    // Update percentage values
    this.updateElement('filter-cornersOver65', cornersOver65, { isPercentage: true });
    this.updateElement('filter-cornersOver75', cornersOver75, { isPercentage: true });
    this.updateElement('filter-cornersOver85', cornersOver85, { isPercentage: true });
    this.updateElement('filter-over95Corners', over95Corners, { isPercentage: true });
    this.updateElement('filter-over105Corners', over105Corners, { isPercentage: true });
    this.updateElement('filter-cornersOver115', cornersOver115, { isPercentage: true });
    this.updateElement('filter-cornersOver125', cornersOver125, { isPercentage: true });
    this.updateElement('filter-cornersOver135', cornersOver135, { isPercentage: true });

    // Update additional corner stats if they exist
    this.updateAdditionalCornerStats(filter);
  }

  /**
   * Update additional corner statistics
   * @param {string} filter - Filter type
   */
  updateAdditionalCornerStats(filter) {
    const statistics = this.statistics;
    if (!statistics) return;

    // Corners 1st/2nd half
    if (document.getElementById('corners1H')) {
      const corners1H = this.getFilteredValue('corners1H', 'corners') || 0;
      const corners2H = this.getFilteredValue('corners2H', 'corners') || 0;
      
      this.updateElement('corners1H', corners1H);
      this.updateElement('corners2H', corners2H);
      
      // Update percentage bars if they exist
      const total = corners1H + corners2H;
      if (total > 0) {
        const corners1HPerc = Math.round((corners1H / total) * 100);
        const corners2HPerc = Math.round((corners2H / total) * 100);
        
        const corners1HBar = document.getElementById('corners1HBar');
        const corners2HBar = document.getElementById('corners2HBar');
        
        if (corners1HBar) corners1HBar.style.width = `${corners1HPerc}%`;
        if (corners2HBar) corners2HBar.style.width = `${corners2HPerc}%`;
      }
    }

    // First to 3/5/7 corners
    if (document.getElementById('firstTo3Corners')) {
      const firstTo3 = this.getFilteredValue('firstTo3CornersPercentage', 'corners') || 0;
      const firstTo5 = this.getFilteredValue('firstTo5CornersPercentage', 'corners') || 0;
      const firstTo7 = this.getFilteredValue('firstTo7CornersPercentage', 'corners') || 0;
      
      this.updateElement('firstTo3Corners', firstTo3, { isPercentage: true });
      this.updateElement('firstTo5Corners', firstTo5, { isPercentage: true });
      this.updateElement('firstTo7Corners', firstTo7, { isPercentage: true });
    }

    // Asian corners
    if (document.getElementById('asianCornersFor')) {
      const asianCornersFor = this.getFilteredValue('asianCornersFor', 'corners') || 0;
      const asianCornersAgainst = this.getFilteredValue('asianCornersAgainst', 'corners') || 0;
      
      this.updateElement('asianCornersFor', asianCornersFor, { isDecimal: true });
      this.updateElement('asianCornersAgainst', asianCornersAgainst, { isDecimal: true });
    }
  }

  /**
   * Update team corners statistics
   * @param {string} filter - Filter type
   */
  updateTeamCorners(filter = 'overall') {
    const statistics = this.statistics;
    if (!statistics) return;

    // Similar pattern to team cards
    const isHome = filter === 'home';
    const isAway = filter === 'away';

    // Corners For
    const cornersFor = isHome ? statistics.homeCornersFor :
                      isAway ? statistics.awayCornersFor :
                      statistics.cornersFor || 0;
    
    const cornersForAvg = isHome ? statistics.homeCornersForAVG :
                         isAway ? statistics.awayCornersForAVG :
                         statistics.cornersForAVG || 0;

    // Corners Against
    const cornersAgainst = isHome ? statistics.homeCornersAgainst :
                          isAway ? statistics.awayCornersAgainst :
                          statistics.cornersAgainst || 0;
    
    const cornersAgainstAvg = isHome ? statistics.homeCornersAgainstAVG :
                             isAway ? statistics.awayCornersAgainstAVG :
                             statistics.cornersAgainstAVG || 0;

    // Update elements
    this.updateElement('teamCornersFor', cornersFor);
    this.updateElement('teamCornersForAvg', cornersForAvg, { isDecimal: true });
    this.updateElement('teamCornersAgainst', cornersAgainst);
    this.updateElement('teamCornersAgainstAvg', cornersAgainstAvg, { isDecimal: true });

    // Over percentages for team corners
    this.updateTeamCornersOverPercentages(filter);
  }

  /**
   * Update team corners over percentages
   * @param {string} filter - Filter type
   */
  updateTeamCornersOverPercentages(filter) {
    const overKeys = ['25', '35', '45', '55', '65'];
    
    overKeys.forEach(key => {
      // Corners For Over X.5
      const forOverValue = this.getFilteredValue(`over${key}CornersForPercentage`, 'teamCorners') || 0;
      this.updateElement(`teamCornersForOver${key}`, forOverValue, { isPercentage: true });
      
      // Corners Against Over X.5
      const againstOverValue = this.getFilteredValue(`over${key}CornersAgainstPercentage`, 'teamCorners') || 0;
      this.updateElement(`teamCornersAgainstOver${key}`, againstOverValue, { isPercentage: true });
    });
  }

  /**
   * Update corners top stats cards
   */
  updateTopStats() {
    const statistics = this.statistics;
    if (!statistics) return;

    // Corners per match
    const cornersPerMatch = statistics.cornersTotalAVG || 0;
    const cornersFor = statistics.cornersAVG || 0;
    const cornersAgainst = statistics.cornersAgainstAVG || 0;

    // Update top stats if they exist
    this.updateElement('cornersPerMatchValue', cornersPerMatch, { isDecimal: true });
    this.updateElement('cornersForValue', cornersFor, { isDecimal: true });
    this.updateElement('cornersAgainstValue', cornersAgainst, { isDecimal: true });
    
    // Over 10.5 corners percentage
    const over105 = statistics.over105Corners || 0;
    this.updateElement('cornersOver105Value', over105, { isPercentage: true });
  }
}