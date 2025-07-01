import { BaseStatistics } from './BaseStatistics.js';

/**
 * GoalsStatistics - Manages goals tab statistics
 */
export class GoalsStatistics extends BaseStatistics {
  constructor(filterManager) {
    super(filterManager);
  }

  /**
   * Update all goals tab statistics
   * @param {Object} statistics - Statistics data
   */
  update(statistics) {
    if (!statistics) return;
    
    this.setStatistics(statistics);
    
    // Update all sections
    this.updateScoredStats();
    this.updateConcededStats();
    this.updateOverUnderStats();
    this.updateBTTSStats();
    this.updateTopCards();
  }

  /**
   * Update scored goals statistics
   */
  updateScoredStats() {
    const filter = this.filterManager.getFilter('current');
    const isHome = filter === 'home';
    const isAway = filter === 'away';

    // Get base values
    const matches = this.getFilteredValue('matches', 'current') || 
                   (isHome ? this.statistics.homeMatches : 
                    isAway ? this.statistics.awayMatches : 
                    this.statistics.totalMatches) || 0;
    
    const goalsScored = this.getFilteredValue('goalsFor', 'current') || 0;
    const scoredPerMatch = this.getFilteredValue('goalsForPerMatch', 'current') || 0;

    // Update scored per match
    this.updateElement('scoredPerMatch', scoredPerMatch, { isDecimal: true });

    // Minutes per goal
    const minutesPerGoal = goalsScored > 0 ? Math.round((matches * 90) / goalsScored) : 0;
    this.updateElement('minutesPerGoal', minutesPerGoal > 0 ? `${minutesPerGoal} min` : 'N/A');

    // Scored Over X.5 percentages
    this.updateScoredOverPercentages(filter);

    // Scored in both halves
    const scoredBothHalves = this.getFilteredValue('scoredBothHalvesPercentage', 'current') || 0;
    this.updateElement('scoredBothHalves', scoredBothHalves, { isPercentage: true });
    this.updateElement('scoredBothHalves2', scoredBothHalves, { isPercentage: true });

    // First to score
    const firstToScore = this.getFilteredValue('firstGoalScoredPercentage', 'current') || 0;
    this.updateElement('firstToScore', firstToScore, { isPercentage: true });

    // Failed to score
    const failedToScore = isHome ? this.statistics.homeFailedToScorePercentage :
                         isAway ? this.statistics.awayFailedToScorePercentage :
                         this.statistics.failedToScorePercentage || 0;
    this.updateElement('failedToScoreGoals', failedToScore, { isPercentage: true });

    // Highest scored
    this.updateHighestScored(filter);

    // Penalties
    this.updatePenalties(filter, matches);

    // Half time statistics
    this.updateHalfTimeScored(filter, matches);
  }

  /**
   * Update scored over percentages
   */
  updateScoredOverPercentages(filter) {
    const isHome = filter === 'home';
    const isAway = filter === 'away';

    const scoredOver05 = isHome ? this.statistics.seasonScoredOver05Percentage_home :
                        isAway ? this.statistics.seasonScoredOver05Percentage_away :
                        this.statistics.seasonScoredOver05Percentage_overall || 0;
    
    const scoredOver15 = isHome ? this.statistics.seasonScoredOver15Percentage_home :
                        isAway ? this.statistics.seasonScoredOver15Percentage_away :
                        this.statistics.seasonScoredOver15Percentage_overall || 0;
    
    const scoredOver25 = isHome ? this.statistics.seasonScoredOver25Percentage_home :
                        isAway ? this.statistics.seasonScoredOver25Percentage_away :
                        this.statistics.seasonScoredOver25Percentage_overall || 0;

    this.updateElement('scoredOver05', scoredOver05, { isPercentage: true });
    this.updateElement('scoredOver15', scoredOver15, { isPercentage: true });
    this.updateElement('scoredOver25', scoredOver25, { isPercentage: true });
  }

  /**
   * Update highest scored
   */
  updateHighestScored(filter) {
    let highestScored;
    if (filter === 'home') {
      highestScored = this.statistics.seasonHighestScored_home || 0;
    } else if (filter === 'away') {
      highestScored = this.statistics.seasonHighestScored_away || 0;
    } else {
      const homeHighest = this.statistics.seasonHighestScored_home || 0;
      const awayHighest = this.statistics.seasonHighestScored_away || 0;
      highestScored = Math.max(homeHighest, awayHighest);
    }
    this.updateElement('highestScored', `${highestScored} Goals`);
  }

  /**
   * Update penalties statistics
   */
  updatePenalties(filter, matches) {
    const isHome = filter === 'home';
    const isAway = filter === 'away';

    const penaltiesWon = isHome ? this.statistics.homePenaltiesWon :
                        isAway ? this.statistics.awayPenaltiesWon :
                        this.statistics.penaltiesWon || 0;
    
    const penaltiesConceded = isHome ? this.statistics.homePenaltiesConceded :
                             isAway ? this.statistics.awayPenaltiesConceded :
                             this.statistics.penaltiesConceded || 0;

    this.updateElement('penaltiesWonGoals', `${penaltiesWon} in ${matches}`);
    this.updateElement('penaltiesConcededGoals', `${penaltiesConceded} in ${matches}`);

    // Penalty in match percentage
    const penaltyInMatch = this.getFilteredValue('penalty_in_a_match_percentage', 'current') || 0;
    this.updateElement('penaltyInMatch', penaltyInMatch, { isPercentage: true });
  }

  /**
   * Update half time scored statistics
   */
  updateHalfTimeScored(filter, matches) {
    const isHome = filter === 'home';
    const isAway = filter === 'away';

    // Average goals per half
    const scoredAvg1H = isHome ? this.statistics.scoredAVGHT_home :
                       isAway ? this.statistics.scoredAVGHT_away :
                       this.statistics.scoredAVGHT_overall || 0;
    
    const scoredAvg2H = isHome ? this.statistics.scored_2hg_avg_home :
                       isAway ? this.statistics.scored_2hg_avg_away :
                       this.statistics.scored_2hg_avg_overall || 0;

    this.updateElement('scoredAvg1H', scoredAvg1H, { isDecimal: true });
    this.updateElement('scoredAvg2H', scoredAvg2H, { isDecimal: true });

    // Scored in half percentages
    const fts1H = isHome ? this.statistics.seasonFTSPercentageHT_home || 0 :
                  isAway ? this.statistics.seasonFTSPercentageHT_away || 0 :
                  this.statistics.seasonFTSPercentageHT_overall || 0;
    const scoredIn1H = 100 - fts1H;

    let scoredIn2H = null;
    let fts2H = isHome ? this.statistics.fts_2hg_percentage_home :
                isAway ? this.statistics.fts_2hg_percentage_away :
                this.statistics.fts_2hg_percentage_overall;
    
    if (fts2H !== null && fts2H !== undefined) {
      scoredIn2H = 100 - fts2H;
    }

    this.updateElement('scoredIn1H', scoredIn1H, { isPercentage: true });
    this.updateElement('scoredIn2H', scoredIn2H !== null ? `${scoredIn2H}%` : 'N/A');

    // Failed to score in halves
    this.updateElement('failedToScore1H', fts1H, { isPercentage: true });
    this.updateElement('failedToScore2H', 
      fts2H !== null && fts2H !== undefined ? `${fts2H}%` : 'N/A');

    // Goals in halves
    const goalsScored1H = isHome ? (this.statistics.scoredGoalsHT_home || this.statistics.scored1HG_home) :
                         isAway ? (this.statistics.scoredGoalsHT_away || this.statistics.scored1HG_away) :
                         (this.statistics.scoredGoalsHT_overall || this.statistics.scored1HG_overall) || 0;
    
    const goalsScored2H = isHome ? (this.statistics.scored_2hg_home || this.statistics.scored2HG_home) :
                         isAway ? (this.statistics.scored_2hg_away || this.statistics.scored2HG_away) :
                         (this.statistics.scored_2hg_overall || this.statistics.scored2HG_overall) || 0;

    this.updateElement('goals1HScored', `${goalsScored1H} in ${matches}`);
    this.updateElement('goals2HScored', `${goalsScored2H} in ${matches}`);
  }

  /**
   * Update conceded goals statistics
   */
  updateConcededStats() {
    const filter = this.filterManager.getFilter('current');
    const isHome = filter === 'home';
    const isAway = filter === 'away';

    // Get base values
    const matches = this.getFilteredValue('matches', 'current') || 
                   (isHome ? this.statistics.homeMatches : 
                    isAway ? this.statistics.awayMatches : 
                    this.statistics.totalMatches) || 0;
    
    const goalsConceded = this.getFilteredValue('goalsAgainst', 'current') || 0;
    
    // Conceded per match
    const concededPerMatch = isHome ? 
      (this.statistics.seasonConcededAVG_home || this.statistics.homeGoalsAgainstPerMatch) :
      isAway ? (this.statistics.seasonConcededAVG_away || this.statistics.awayGoalsAgainstPerMatch) :
      (this.statistics.seasonConcededAVG_overall || this.statistics.goalsAgainstPerMatch) || 0;

    // Update all conceded per match elements
    this.updateElement('concededPerMatch', concededPerMatch, { isDecimal: true });
    this.updateElement('concededPerMatchStats', concededPerMatch, { isDecimal: true });
    this.updateElement('concededPerMatchCard', concededPerMatch, { isDecimal: true });

    // Minutes per goal conceded
    const minutesPerGoalConceded = goalsConceded > 0 ? 
      Math.round((matches * 90) / goalsConceded) : 0;
    this.updateElement('minutesPerGoalConceded', 
      minutesPerGoalConceded > 0 ? `${minutesPerGoalConceded} min` : 'N/A');

    // Conceded Over X.5 percentages
    this.updateConcededOverPercentages(filter);

    // Clean sheets
    const cleanSheetsPercentage = this.getFilteredValue('cleanSheetPercentage', 'current') || 0;
    this.updateElement('cleanSheetsGoals', cleanSheetsPercentage, { isPercentage: true });

    // Highest conceded
    this.updateHighestConceded(filter);

    // Half time statistics
    this.updateHalfTimeConceded(filter, matches);
  }

  /**
   * Update conceded over percentages
   */
  updateConcededOverPercentages(filter) {
    const isHome = filter === 'home';
    const isAway = filter === 'away';

    const concededOver05 = isHome ? this.statistics.seasonConcededOver05Percentage_home :
                          isAway ? this.statistics.seasonConcededOver05Percentage_away :
                          this.statistics.seasonConcededOver05Percentage_overall || 0;
    
    const concededOver15 = isHome ? this.statistics.seasonConcededOver15Percentage_home :
                          isAway ? this.statistics.seasonConcededOver15Percentage_away :
                          this.statistics.seasonConcededOver15Percentage_overall || 0;
    
    const concededOver25 = isHome ? this.statistics.seasonConcededOver25Percentage_home :
                          isAway ? this.statistics.seasonConcededOver25Percentage_away :
                          this.statistics.seasonConcededOver25Percentage_overall || 0;

    this.updateElement('concededOver05', concededOver05, { isPercentage: true });
    this.updateElement('concededOver15', concededOver15, { isPercentage: true });
    this.updateElement('concededOver25', concededOver25, { isPercentage: true });
  }

  /**
   * Update highest conceded
   */
  updateHighestConceded(filter) {
    let highestConceded;
    if (filter === 'home') {
      highestConceded = this.statistics.seasonHighestConceded_home || 0;
    } else if (filter === 'away') {
      highestConceded = this.statistics.seasonHighestConceded_away || 0;
    } else {
      const homeHighest = this.statistics.seasonHighestConceded_home || 0;
      const awayHighest = this.statistics.seasonHighestConceded_away || 0;
      highestConceded = Math.max(homeHighest, awayHighest);
    }
    this.updateElement('highestConceded', `${highestConceded} Goals`);
  }

  /**
   * Update half time conceded statistics
   */
  updateHalfTimeConceded(filter, matches) {
    const isHome = filter === 'home';
    const isAway = filter === 'away';

    // Average goals conceded per half
    const concededAvg1H = isHome ? this.statistics.concededAVGHT_home :
                         isAway ? this.statistics.concededAVGHT_away :
                         this.statistics.concededAVGHT_overall || 0;
    
    const concededAvg2H = isHome ? this.statistics.conceded_2hg_avg_home :
                         isAway ? this.statistics.conceded_2hg_avg_away :
                         this.statistics.conceded_2hg_avg_overall || 0;

    this.updateElement('concededAvg1H', concededAvg1H, { isDecimal: true });
    this.updateElement('concededAvg2H', concededAvg2H, { isDecimal: true });
    this.updateElement('concededAvg1HCard', concededAvg1H || '0.00');
    this.updateElement('concededAvg2HCard', concededAvg2H || '0.00');

    // Clean sheet percentages
    const cleanSheet1H = isHome ? 
      (this.statistics.seasonCSPercentageHT_home || this.statistics.seasonCSHT_home) :
      isAway ? (this.statistics.seasonCSPercentageHT_away || this.statistics.seasonCSHT_away) :
      (this.statistics.seasonCSPercentageHT_overall || this.statistics.seasonCSHT_overall) || 0;

    const cleanSheet2H = isHome ?
      (this.statistics.cs_2hg_percentage_home || this.statistics.seasonCS2H_home) :
      isAway ? (this.statistics.cs_2hg_percentage_away || this.statistics.seasonCS2H_away) :
      (this.statistics.cs_2hg_percentage_overall || this.statistics.seasonCS2H_overall) || 0;

    // Conceded in half percentages
    const conceded1H = 100 - cleanSheet1H;
    const conceded2H = cleanSheet2H ? 100 - cleanSheet2H : null;

    this.updateElement('concededIn1H', conceded1H, { isPercentage: true });
    this.updateElement('concededIn2H', conceded2H !== null ? `${conceded2H}%` : 'N/A');
    this.updateElement('cleanSheet1H', cleanSheet1H, { isPercentage: true });
    this.updateElement('cleanSheet2H', cleanSheet2H, { isPercentage: true });

    // Goals conceded in halves
    const goalsConceded1H = isHome ? 
      (this.statistics.concededGoalsHT_home || this.statistics.conceded1HG_home) :
      isAway ? (this.statistics.concededGoalsHT_away || this.statistics.conceded1HG_away) :
      (this.statistics.concededGoalsHT_overall || this.statistics.conceded1HG_overall) || 0;
    
    const goalsConceded2H = isHome ?
      (this.statistics.conceded_2hg_home || this.statistics.conceded2HG_home) :
      isAway ? (this.statistics.conceded_2hg_away || this.statistics.conceded2HG_away) :
      (this.statistics.conceded_2hg_overall || this.statistics.conceded2HG_overall) || 0;

    this.updateElement('goals1HConceded', `${goalsConceded1H} in ${matches}`);
    this.updateElement('goals2HConceded', `${goalsConceded2H} in ${matches}`);
  }

  /**
   * Update over/under statistics
   */
  updateOverUnderStats() {
    const filter = this.filterManager.getFilter('current');
    
    // Over 0.5-5.5 goals
    const overKeys = ['05', '15', '25', '35', '45', '55'];
    overKeys.forEach(key => {
      const value = this.getFilteredValue(`seasonOver${key}Percentage`, 'current') || 0;
      this.updateElement(`over${key}Goals`, value, { isPercentage: true });
    });

    // Under 0.5-5.5 goals
    const underKeys = ['05', '15', '25', '35', '45', '55'];
    underKeys.forEach(key => {
      const value = this.getFilteredValue(`seasonUnder${key}Percentage`, 'current') || 0;
      this.updateElement(`under${key}Goals`, value, { isPercentage: true });
    });

    // Over goals 1st half
    const over1HKeys = ['05', '15', '25'];
    over1HKeys.forEach(key => {
      const value = this.getFilteredValue(`seasonOver${key}PercentageHT`, 'current') || 0;
      this.updateElement(`over${key}Goals1H`, value, { isPercentage: true });
    });

    // Over goals 2nd half
    const over2HKeys = ['05', '15', '25'];
    over2HKeys.forEach(key => {
      const fieldName = `over${key}_goals_percentage_2hg`;
      const value = this.getFilteredValue(fieldName, 'current') || 0;
      this.updateElement(`over${key}Goals2H`, value, { isPercentage: true });
    });
  }

  /**
   * Update BTTS (Both Teams To Score) statistics
   */
  updateBTTSStats() {
    const filter = this.filterManager.getFilter('current');
    
    // BTTS percentage
    const bttsPercentage = this.getFilteredValue('seasonBTTSPercentage', 'current') || 0;
    this.updateElement('bttsPercentage', bttsPercentage, { isPercentage: true });

    // BTTS and win percentage
    const bttsWinPercentage = this.getFilteredValue('btts_and_win_percentage', 'current') || 0;
    this.updateElement('bttsWinPercentage', bttsWinPercentage, { isPercentage: true });

    // BTTS and draw percentage
    const bttsDrawPercentage = this.getFilteredValue('btts_and_draw_percentage', 'current') || 0;
    this.updateElement('bttsDrawPercentage', bttsDrawPercentage, { isPercentage: true });

    // BTTS and lose percentage
    const bttsLosePercentage = this.getFilteredValue('btts_and_lose_percentage', 'current') || 0;
    this.updateElement('bttsLosePercentage', bttsLosePercentage, { isPercentage: true });

    // BTTS 1st half
    const btts1H = this.getFilteredValue('seasonBTTSPercentageHT', 'current') || 0;
    this.updateElement('btts1H', btts1H, { isPercentage: true });

    // BTTS 2nd half
    const btts2H = this.getFilteredValue('btts_percentage_2hg', 'current') || 0;
    this.updateElement('btts2H', btts2H, { isPercentage: true });

    // BTTS and over 2.5
    const bttsOver25 = this.getFilteredValue('btts_and_over25_percentage', 'current') || 0;
    this.updateElement('bttsOver25', bttsOver25, { isPercentage: true });
  }

  /**
   * Update top stats cards for goals tab
   */
  updateTopCards() {
    const filter = this.filterManager.getFilter('current');
    
    // Scored per match
    const scoredPerMatch = this.getFilteredValue('goalsForPerMatch', 'current') || 0;
    this.updateElement('scoredPerMatch', scoredPerMatch, { isDecimal: true });

    // Conceded per match
    const concededPerMatch = this.getFilteredValue('goalsAgainstPerMatch', 'current') || 
      this.getFilteredValue('seasonConcededAVG', 'current') || 0;
    this.updateElement('concededPerMatch', concededPerMatch, { isDecimal: true });

    // Over 2.5 percentage
    const over25 = this.getFilteredValue('seasonOver25Percentage', 'current') || 0;
    this.updateElement('over25TopCard', over25, { isPercentage: true });
  }
}