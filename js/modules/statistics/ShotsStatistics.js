import { BaseStatistics } from './BaseStatistics.js';

/**
 * ShotsStatistics - Manages shots statistics and goal timing bars
 */
export class ShotsStatistics extends BaseStatistics {
  constructor(filterManager) {
    super(filterManager);
    
    // Listen to filter changes
    this.filterManager.on('shots', (newValue) => {
      if (this.statistics) {
        this.updateShotsStats(newValue);
      }
    });
    
    this.filterManager.on('goalTimings', (newValue) => {
      if (this.statistics) {
        this.updateGoalTimingBars(newValue);
      }
    });
  }

  /**
   * Update all shots statistics
   * @param {Object} statistics - Statistics data
   */
  update(statistics) {
    if (!statistics) return;
    
    this.setStatistics(statistics);
    
    // Update shots statistics
    const shotsFilter = this.filterManager.getFilter('shots');
    this.updateShotsStats(shotsFilter);
    
    // Update goal timing bars
    const goalTimingsFilter = this.filterManager.getFilter('goalTimings');
    this.updateGoalTimingBars(goalTimingsFilter);
  }

  /**
   * Update shots statistics
   * @param {string} filter - Filter type (overall, home, away)
   */
  updateShotsStats(filter = 'overall') {
    const statistics = this.statistics;
    if (!statistics) return;

    const isHome = filter === 'home';
    const isAway = filter === 'away';

    // Team Shots - Direct API data
    const shotsPerMatch = isHome ? statistics.homeShotsAVG :
                         isAway ? statistics.awayShotsAVG :
                         statistics.shotsAVG || 0;
    
    const shotsOnTargetPerMatch = isHome ? statistics.homeShotsOnTargetAVG :
                                  isAway ? statistics.awayShotsOnTargetAVG :
                                  statistics.shotsOnTargetAVG || 0;
    
    const shotsOffTargetPerMatch = isHome ? statistics.homeShotsOffTargetAVG :
                                   isAway ? statistics.awayShotsOffTargetAVG :
                                   statistics.shotsOffTargetAVG || 0;
    
    const shotsConversionRate = isHome ? statistics.homeShotsConversionRate :
                               isAway ? statistics.awayShotsConversionRate :
                               statistics.shotsConversionRate || 0;
    
    const shotsPerGoal = isHome ? statistics.homeShotsPerGoal :
                        isAway ? statistics.awayShotsPerGoal :
                        statistics.shotsPerGoal || 0;
    
    const shotsOnTargetPerGoal = isHome ? statistics.homeShotsOnTargetPerGoal :
                                isAway ? statistics.awayShotsOnTargetPerGoal :
                                statistics.shotsOnTargetPerGoal || 0;

    // Update team shots stats
    this.updateElement('shotsPerMatch', Math.round(shotsPerMatch * 100) / 100);
    this.updateElement('shotsOnTargetPerMatch', Math.round(shotsOnTargetPerMatch * 100) / 100);
    this.updateElement('shotsOffTargetPerMatch', Math.round(shotsOffTargetPerMatch * 100) / 100);
    this.updateElement('shotsConversionRate', Math.round(shotsConversionRate), { isPercentage: true });
    this.updateElement('shotsPerGoal', Math.round(shotsPerGoal * 10) / 10);
    this.updateElement('shotsOnTargetPerGoal', Math.round(shotsOnTargetPerGoal * 10) / 10);

    // Update team shots over percentages
    this.updateTeamShotsOverPercentages(filter);
    
    // Update shots on target over percentages
    this.updateShotsOnTargetOverPercentages(filter);
    
    // Update match shots
    this.updateMatchShots(filter);
    
    // Update offsides
    this.updateOffsides(filter);
  }

  /**
   * Update team shots over percentages
   * @param {string} filter - Filter type
   */
  updateTeamShotsOverPercentages(filter) {
    const statistics = this.statistics;
    const isHome = filter === 'home';
    const isAway = filter === 'away';

    const overKeys = ['10_5', '11_5', '12_5', '13_5', '14_5', '15_5'];
    
    overKeys.forEach(key => {
      const fieldKey = `shotsOver${key}`;
      const value = isHome ? statistics[`home${this.capitalize(fieldKey)}`] :
                   isAway ? statistics[`away${this.capitalize(fieldKey)}`] :
                   statistics[fieldKey] || 0;
      
      const elementId = `teamShotsOver${key}`;
      this.updateElement(elementId, value, { isPercentage: true });
    });
  }

  /**
   * Update shots on target over percentages
   * @param {string} filter - Filter type
   */
  updateShotsOnTargetOverPercentages(filter) {
    const statistics = this.statistics;
    const isHome = filter === 'home';
    const isAway = filter === 'away';

    const overKeys = ['3_5', '4_5', '5_5', '6_5'];
    
    overKeys.forEach(key => {
      const fieldKey = `shotsOnTargetOver${key}`;
      const value = isHome ? statistics[`home${this.capitalize(fieldKey)}`] :
                   isAway ? statistics[`away${this.capitalize(fieldKey)}`] :
                   statistics[fieldKey] || 0;
      
      const elementId = `teamShotsOnTargetOver${key}`;
      this.updateElement(elementId, value, { isPercentage: true });
    });
  }

  /**
   * Update match shots statistics
   * @param {string} filter - Filter type
   */
  updateMatchShots(filter) {
    const statistics = this.statistics;
    const isHome = filter === 'home';
    const isAway = filter === 'away';

    // Match Shots Over percentages
    const matchShotsKeys = ['23_5', '24_5', '25_5', '26_5'];
    
    matchShotsKeys.forEach(key => {
      const fieldKey = `matchShotsOver${key}`;
      const value = isHome ? statistics[`home${this.capitalize(fieldKey)}`] :
                   isAway ? statistics[`away${this.capitalize(fieldKey)}`] :
                   statistics[fieldKey] || 0;
      
      this.updateElement(`matchShotsOver${key}`, value, { isPercentage: true });
    });

    // Match Shots On Target Over percentages
    const matchShotsOnTargetKeys = ['7_5', '8_5', '9_5'];
    
    matchShotsOnTargetKeys.forEach(key => {
      const fieldKey = `matchShotsOnTargetOver${key}`;
      const value = isHome ? statistics[`home${this.capitalize(fieldKey)}`] :
                   isAway ? statistics[`away${this.capitalize(fieldKey)}`] :
                   statistics[fieldKey] || 0;
      
      this.updateElement(`matchShotsOnTargetOver${key}`, value, { isPercentage: true });
    });
  }

  /**
   * Update offsides statistics
   * @param {string} filter - Filter type
   */
  updateOffsides(filter) {
    const statistics = this.statistics;
    const isHome = filter === 'home';
    const isAway = filter === 'away';

    // Match Offsides
    const matchOffsidesAvg = isHome ? statistics.homeMatchOffsidesAvg :
                            isAway ? statistics.awayMatchOffsidesAvg :
                            statistics.matchOffsidesAvg || 0;
    
    this.updateElement('matchOffsidesAvg', Math.round(matchOffsidesAvg * 100) / 100);

    // Match Offsides Over percentages
    const offsidesKeys = ['0_5', '1_5', '2_5', '3_5'];
    
    offsidesKeys.forEach(key => {
      const fieldKey = `matchOffsidesOver${key}`;
      const value = isHome ? statistics[`home${this.capitalize(fieldKey)}`] :
                   isAway ? statistics[`away${this.capitalize(fieldKey)}`] :
                   statistics[fieldKey] || 0;
      
      this.updateElement(`matchOffsidesOver${key}`, Math.round(value), { isPercentage: true });
    });

    // Team Offsides
    const teamOffsidesAvg = isHome ? statistics.homeOffsidesAvg :
                           isAway ? statistics.awayOffsidesAvg :
                           statistics.offsidesAvg || 0;
    
    this.updateElement('teamOffsidesAvg', Math.round(teamOffsidesAvg * 100) / 100);

    // Team Offsides Over percentages
    offsidesKeys.forEach(key => {
      const fieldKey = `offsidesOver${key}`;
      const value = isHome ? statistics[`home${this.capitalize(fieldKey)}`] :
                   isAway ? statistics[`away${this.capitalize(fieldKey)}`] :
                   statistics[fieldKey] || 0;
      
      this.updateElement(`teamOffsidesOver${key}`, Math.round(value), { isPercentage: true });
    });
  }

  /**
   * Update goal timing bars
   * @param {string} filter - Filter type (overall, scored, conceded)
   */
  updateGoalTimingBars(filter = 'overall') {
    const statistics = this.statistics;
    if (!statistics) return;

    const isHome = filter === 'home';
    const isAway = filter === 'away';

    // Goals Scored data based on filter
    const goalsScored = [
      {
        period: '0_15',
        value: isHome ? statistics.homeGoals0_15 :
               isAway ? statistics.awayGoals0_15 :
               statistics.goals0_15 || 0
      },
      {
        period: '16_30',
        value: isHome ? statistics.homeGoals16_30 :
               isAway ? statistics.awayGoals16_30 :
               statistics.goals16_30 || 0
      },
      {
        period: '31_45',
        value: isHome ? statistics.homeGoals31_45 :
               isAway ? statistics.awayGoals31_45 :
               statistics.goals31_45 || 0
      },
      {
        period: '46_60',
        value: isHome ? statistics.homeGoals46_60 :
               isAway ? statistics.awayGoals46_60 :
               statistics.goals46_60 || 0
      },
      {
        period: '61_75',
        value: isHome ? statistics.homeGoals61_75 :
               isAway ? statistics.awayGoals61_75 :
               statistics.goals61_75 || 0
      },
      {
        period: '76_90',
        value: isHome ? statistics.homeGoals76_90 :
               isAway ? statistics.awayGoals76_90 :
               statistics.goals76_90 || 0
      }
    ];

    // Goals Conceded data based on filter
    const goalsConceded = [
      {
        period: '0_15',
        value: isHome ? statistics.homeGoalsConc0_15 :
               isAway ? statistics.awayGoalsConc0_15 :
               statistics.goalsConc0_15 || 0
      },
      {
        period: '16_30',
        value: isHome ? statistics.homeGoalsConc16_30 :
               isAway ? statistics.awayGoalsConc16_30 :
               statistics.goalsConc16_30 || 0
      },
      {
        period: '31_45',
        value: isHome ? statistics.homeGoalsConc31_45 :
               isAway ? statistics.awayGoalsConc31_45 :
               statistics.goalsConc31_45 || 0
      },
      {
        period: '46_60',
        value: isHome ? statistics.homeGoalsConc46_60 :
               isAway ? statistics.awayGoalsConc46_60 :
               statistics.goalsConc46_60 || 0
      },
      {
        period: '61_75',
        value: isHome ? statistics.homeGoalsConc61_75 :
               isAway ? statistics.awayGoalsConc61_75 :
               statistics.goalsConc61_75 || 0
      },
      {
        period: '76_90',
        value: isHome ? statistics.homeGoalsConc76_90 :
               isAway ? statistics.awayGoalsConc76_90 :
               statistics.goalsConc76_90 || 0
      }
    ];

    // Calculate totals
    const totalScored = goalsScored.reduce((sum, g) => sum + g.value, 0);
    const totalConceded = goalsConceded.reduce((sum, g) => sum + g.value, 0);

    // Find max values for scaling
    const maxScored = Math.max(...goalsScored.map(g => g.value), 1);
    const maxConceded = Math.max(...goalsConceded.map(g => g.value), 1);

    // Update scored bars
    goalsScored.forEach(goal => {
      const bar = document.getElementById(`scored${goal.period}Bar`);
      const value = document.getElementById(`scored${goal.period}Value`);
      if (bar && value) {
        const widthPercentage = (goal.value / maxScored) * 100;
        const dataPercentage = totalScored > 0 ? ((goal.value / totalScored) * 100).toFixed(1) : 0;
        bar.style.width = `${Math.max(widthPercentage, 15)}%`; // Minimum 15% width
        value.innerHTML = `<span>${goal.value}</span><span>(${dataPercentage}%)</span>`;

        // Add highest-value class
        if (goal.value === maxScored && goal.value > 0) {
          bar.classList.add('highest-value');
        } else {
          bar.classList.remove('highest-value');
        }
      }
    });

    // Update conceded bars
    goalsConceded.forEach(goal => {
      const bar = document.getElementById(`conceded${goal.period}Bar`);
      const value = document.getElementById(`conceded${goal.period}Value`);
      if (bar && value) {
        const widthPercentage = (goal.value / maxConceded) * 100;
        const dataPercentage = totalConceded > 0 ? ((goal.value / totalConceded) * 100).toFixed(1) : 0;
        bar.style.width = `${Math.max(widthPercentage, 15)}%`; // Minimum 15% width
        value.innerHTML = `<span>${goal.value}</span><span>(${dataPercentage}%)</span>`;

        // Add highest-value class
        if (goal.value === maxConceded && goal.value > 0) {
          bar.classList.add('highest-value');
        } else {
          bar.classList.remove('highest-value');
        }
      }
    });
  }

  /**
   * Update shots top stats cards
   */
  updateTopStats() {
    const statistics = this.statistics;
    if (!statistics) return;

    // Shots per match
    const shotsPerMatch = statistics.shotsAVG || 0;
    this.updateElement('shotsPerMatchValue', shotsPerMatch, { isDecimal: true });

    // Shots on target per match
    const shotsOnTarget = statistics.shotsOnTargetAVG || 0;
    this.updateElement('shotsOnTargetValue', shotsOnTarget, { isDecimal: true });

    // Shots conversion rate
    const conversionRate = statistics.shotsConversionRate || 0;
    this.updateElement('shotsConversionValue', conversionRate, { isPercentage: true });
  }
}