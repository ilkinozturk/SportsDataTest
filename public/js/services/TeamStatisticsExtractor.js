/**
 * Team Statistics Extractor Service
 * Provides modular extraction methods for team statistics from raw API responses
 * Used by prediction modules to extract their specific data needs
 */

export class TeamStatisticsExtractor {
  /**
   * Extract team scored over percentages from raw API data
   * @param {Object} rawData - Raw API response data for a team
   * @param {string} venue - 'home', 'away', or 'overall'
   * @returns {Object} Scored over percentages
   */
  static extractScoredOverPercentages(rawData, venue) {
    const stats = rawData.statistics || {};
    const additionalInfo = rawData.additional_info || {};
    
    const result = {
      over05: 0,
      over15: 0,
      over25: 0,
      over35: 0
    };

    if (venue === 'home') {
      result.over05 = 
        additionalInfo.seasonScoredOver05Percentage_home ||
        stats.seasonScoredOver05Percentage_home ||
        stats.homeScoredOver05Percentage ||
        0;
      result.over15 = 
        additionalInfo.seasonScoredOver15Percentage_home ||
        stats.seasonScoredOver15Percentage_home ||
        stats.homeScoredOver15Percentage ||
        0;
      result.over25 = 
        additionalInfo.seasonScoredOver25Percentage_home ||
        stats.seasonScoredOver25Percentage_home ||
        stats.homeScoredOver25Percentage ||
        0;
      result.over35 = 
        additionalInfo.seasonScoredOver35Percentage_home ||
        stats.seasonScoredOver35Percentage_home ||
        stats.homeScoredOver35Percentage ||
        0;
    } else if (venue === 'away') {
      result.over05 = 
        additionalInfo.seasonScoredOver05Percentage_away ||
        stats.seasonScoredOver05Percentage_away ||
        stats.awayScoredOver05Percentage ||
        0;
      result.over15 = 
        additionalInfo.seasonScoredOver15Percentage_away ||
        stats.seasonScoredOver15Percentage_away ||
        stats.awayScoredOver15Percentage ||
        0;
      result.over25 = 
        additionalInfo.seasonScoredOver25Percentage_away ||
        stats.seasonScoredOver25Percentage_away ||
        stats.awayScoredOver25Percentage ||
        0;
      result.over35 = 
        additionalInfo.seasonScoredOver35Percentage_away ||
        stats.seasonScoredOver35Percentage_away ||
        stats.awayScoredOver35Percentage ||
        0;
    } else {
      // Overall
      result.over05 = 
        additionalInfo.seasonScoredOver05Percentage_overall ||
        stats.seasonScoredOver05Percentage_overall ||
        stats.scoredOver05Percentage ||
        0;
      result.over15 = 
        additionalInfo.seasonScoredOver15Percentage_overall ||
        stats.seasonScoredOver15Percentage_overall ||
        stats.scoredOver15Percentage ||
        0;
      result.over25 = 
        additionalInfo.seasonScoredOver25Percentage_overall ||
        stats.seasonScoredOver25Percentage_overall ||
        stats.scoredOver25Percentage ||
        0;
      result.over35 = 
        additionalInfo.seasonScoredOver35Percentage_overall ||
        stats.seasonScoredOver35Percentage_overall ||
        stats.scoredOver35Percentage ||
        0;
    }

    return result;
  }

  /**
   * Extract team conceded over percentages from raw API data
   * @param {Object} rawData - Raw API response data for a team
   * @param {string} venue - 'home', 'away', or 'overall'
   * @returns {Object} Conceded over percentages
   */
  static extractConcededOverPercentages(rawData, venue) {
    const stats = rawData.statistics || {};
    const additionalInfo = rawData.additional_info || {};
    
    const result = {
      over05: 0,
      over15: 0,
      over25: 0,
      over35: 0
    };

    if (venue === 'home') {
      result.over05 = 
        additionalInfo.over05_conceded_percentage_home ||
        additionalInfo.seasonConcededOver05Percentage_home ||
        stats.over05Conceded_home ||
        stats.over05_conceded_percentage_home ||
        0;
      result.over15 = 
        additionalInfo.over15_conceded_percentage_home ||
        additionalInfo.seasonConcededOver15Percentage_home ||
        stats.over15Conceded_home ||
        stats.over15_conceded_percentage_home ||
        0;
      result.over25 = 
        additionalInfo.over25_conceded_percentage_home ||
        additionalInfo.seasonConcededOver25Percentage_home ||
        stats.over25Conceded_home ||
        stats.over25_conceded_percentage_home ||
        0;
      result.over35 = 
        additionalInfo.over35_conceded_percentage_home ||
        additionalInfo.seasonConcededOver35Percentage_home ||
        stats.over35Conceded_home ||
        stats.over35_conceded_percentage_home ||
        0;
    } else if (venue === 'away') {
      result.over05 = 
        additionalInfo.over05_conceded_percentage_away ||
        additionalInfo.seasonConcededOver05Percentage_away ||
        stats.over05Conceded_away ||
        stats.over05_conceded_percentage_away ||
        0;
      result.over15 = 
        additionalInfo.over15_conceded_percentage_away ||
        additionalInfo.seasonConcededOver15Percentage_away ||
        stats.over15Conceded_away ||
        stats.over15_conceded_percentage_away ||
        0;
      result.over25 = 
        additionalInfo.over25_conceded_percentage_away ||
        additionalInfo.seasonConcededOver25Percentage_away ||
        stats.over25Conceded_away ||
        stats.over25_conceded_percentage_away ||
        0;
      result.over35 = 
        additionalInfo.over35_conceded_percentage_away ||
        additionalInfo.seasonConcededOver35Percentage_away ||
        stats.over35Conceded_away ||
        stats.over35_conceded_percentage_away ||
        0;
    } else {
      // Overall
      result.over05 = 
        additionalInfo.over05_conceded_percentage_overall ||
        additionalInfo.seasonConcededOver05Percentage_overall ||
        stats.over05Conceded_overall ||
        stats.over05_conceded_percentage_overall ||
        0;
      result.over15 = 
        additionalInfo.over15_conceded_percentage_overall ||
        additionalInfo.seasonConcededOver15Percentage_overall ||
        stats.over15Conceded_overall ||
        stats.over15_conceded_percentage_overall ||
        0;
      result.over25 = 
        additionalInfo.over25_conceded_percentage_overall ||
        additionalInfo.seasonConcededOver25Percentage_overall ||
        stats.over25Conceded_overall ||
        stats.over25_conceded_percentage_overall ||
        0;
      result.over35 = 
        additionalInfo.over35_conceded_percentage_overall ||
        additionalInfo.seasonConcededOver35Percentage_overall ||
        stats.over35Conceded_overall ||
        stats.over35_conceded_percentage_overall ||
        0;
    }

    return result;
  }

  /**
   * Extract goals scored averages from raw API data
   * @param {Object} rawData - Raw API response data for a team
   * @param {string} venue - 'home', 'away', or 'overall'
   * @returns {Object} Goals scored statistics
   */
  static extractGoalsScoredStats(rawData, venue) {
    const stats = rawData.statistics || {};
    const additionalInfo = rawData.additional_info || {};

    let goalsPerMatch = 0;
    let totalGoals = 0;
    let firstHalfAvg = 0;
    let secondHalfAvg = 0;

    if (venue === 'home') {
      goalsPerMatch = 
        stats.seasonScoredAVG_home ||
        stats.homeGoalsPerMatch ||
        additionalInfo.seasonScoredAVG_home ||
        0;
      totalGoals = 
        stats.seasonScoredNum_home ||
        stats.homeGoalsScored ||
        additionalInfo.seasonScoredNum_home ||
        0;
      firstHalfAvg = 
        stats.scoredAVGHT_home ||
        stats.firstHalfGoalsAVG_home ||
        additionalInfo.scoredAVGHT_home ||
        0;
      secondHalfAvg = 
        stats.scored_2hg_avg_home ||
        stats.secondHalfGoalsAVG_home ||
        stats.scoredAVG2H_home ||
        additionalInfo.scored_2hg_avg_home ||
        0;
    } else if (venue === 'away') {
      goalsPerMatch = 
        stats.seasonScoredAVG_away ||
        stats.awayGoalsPerMatch ||
        additionalInfo.seasonScoredAVG_away ||
        0;
      totalGoals = 
        stats.seasonScoredNum_away ||
        stats.awayGoalsScored ||
        additionalInfo.seasonScoredNum_away ||
        0;
      firstHalfAvg = 
        stats.scoredAVGHT_away ||
        stats.firstHalfGoalsAVG_away ||
        additionalInfo.scoredAVGHT_away ||
        0;
      secondHalfAvg = 
        stats.scored_2hg_avg_away ||
        stats.secondHalfGoalsAVG_away ||
        stats.scoredAVG2H_away ||
        additionalInfo.scored_2hg_avg_away ||
        0;
    } else {
      // Overall
      goalsPerMatch = 
        stats.seasonScoredAVG_overall ||
        stats.goalsPerMatch ||
        additionalInfo.seasonScoredAVG_overall ||
        0;
      totalGoals = 
        stats.seasonScoredNum_overall ||
        stats.goalsScored ||
        additionalInfo.seasonScoredNum_overall ||
        0;
      firstHalfAvg = 
        stats.scoredAVGHT_overall ||
        stats.firstHalfGoalsAVG_overall ||
        additionalInfo.scoredAVGHT_overall ||
        0;
      secondHalfAvg = 
        stats.scored_2hg_avg_overall ||
        stats.secondHalfGoalsAVG_overall ||
        stats.scoredAVG2H_overall ||
        additionalInfo.scored_2hg_avg_overall ||
        0;
    }

    return {
      goalsPerMatch: parseFloat(goalsPerMatch).toFixed(2),
      totalGoals: parseInt(totalGoals, 10),
      firstHalfAvg: parseFloat(firstHalfAvg).toFixed(2),
      secondHalfAvg: parseFloat(secondHalfAvg).toFixed(2)
    };
  }

  /**
   * Extract goals conceded averages from raw API data
   * @param {Object} rawData - Raw API response data for a team
   * @param {string} venue - 'home', 'away', or 'overall'
   * @returns {Object} Goals conceded statistics
   */
  static extractGoalsConcededStats(rawData, venue) {
    const stats = rawData.statistics || {};
    const additionalInfo = rawData.additional_info || {};

    let goalsConcededPerMatch = 0;
    let totalGoalsConceded = 0;
    let firstHalfConcededAvg = 0;
    let secondHalfConcededAvg = 0;

    if (venue === 'home') {
      goalsConcededPerMatch = 
        stats.seasonConcededAVG_home ||
        stats.homeGoalsConcededPerMatch ||
        additionalInfo.seasonConcededAVG_home ||
        0;
      totalGoalsConceded = 
        stats.seasonConcededNum_home ||
        stats.homeGoalsConceded ||
        additionalInfo.seasonConcededNum_home ||
        0;
      firstHalfConcededAvg = 
        stats.concededAVGHT_home ||
        stats.firstHalfGoalsAgainstAVG_home ||
        additionalInfo.concededAVGHT_home ||
        0;
      secondHalfConcededAvg = 
        stats.concededAVG2H_home ||
        stats.secondHalfGoalsAgainstAVG_home ||
        additionalInfo.concededAVG2H_home ||
        0;
    } else if (venue === 'away') {
      goalsConcededPerMatch = 
        stats.seasonConcededAVG_away ||
        stats.awayGoalsConcededPerMatch ||
        additionalInfo.seasonConcededAVG_away ||
        0;
      totalGoalsConceded = 
        stats.seasonConcededNum_away ||
        stats.awayGoalsConceded ||
        additionalInfo.seasonConcededNum_away ||
        0;
      firstHalfConcededAvg = 
        stats.concededAVGHT_away ||
        stats.firstHalfGoalsAgainstAVG_away ||
        additionalInfo.concededAVGHT_away ||
        0;
      secondHalfConcededAvg = 
        stats.concededAVG2H_away ||
        stats.secondHalfGoalsAgainstAVG_away ||
        additionalInfo.concededAVG2H_away ||
        0;
    } else {
      // Overall
      goalsConcededPerMatch = 
        stats.seasonConcededAVG_overall ||
        stats.goalsConcededPerMatch ||
        additionalInfo.seasonConcededAVG_overall ||
        0;
      totalGoalsConceded = 
        stats.seasonConcededNum_overall ||
        stats.goalsConceded ||
        additionalInfo.seasonConcededNum_overall ||
        0;
      firstHalfConcededAvg = 
        stats.concededAVGHT_overall ||
        stats.firstHalfGoalsAgainstAVG_overall ||
        additionalInfo.concededAVGHT_overall ||
        0;
      secondHalfConcededAvg = 
        stats.concededAVG2H_overall ||
        stats.secondHalfGoalsAgainstAVG_overall ||
        additionalInfo.concededAVG2H_overall ||
        0;
    }

    return {
      goalsConcededPerMatch: parseFloat(goalsConcededPerMatch).toFixed(2),
      totalGoalsConceded: parseInt(totalGoalsConceded, 10),
      firstHalfConcededAvg: parseFloat(firstHalfConcededAvg).toFixed(2),
      secondHalfConcededAvg: parseFloat(secondHalfConcededAvg).toFixed(2)
    };
  }

  /**
   * Extract clean sheet and failed to score percentages
   * @param {Object} rawData - Raw API response data for a team
   * @param {string} venue - 'home', 'away', or 'overall'
   * @returns {Object} CS and FTS percentages
   */
  static extractCSandFTSPercentages(rawData, venue) {
    const stats = rawData.statistics || {};
    const additionalInfo = rawData.additional_info || {};

    let cleanSheetPercentage = 0;
    let failedToScorePercentage = 0;

    if (venue === 'home') {
      cleanSheetPercentage = 
        stats.seasonCSPercentage_home ||
        stats.seasonCleanSheetPercentage_home ||
        stats.homeCleanSheetPercentage ||
        additionalInfo.seasonCSPercentage_home ||
        additionalInfo.seasonCleanSheetPercentage_home ||
        0;
      failedToScorePercentage = 
        stats.seasonFTSPercentage_home ||
        stats.seasonFailedToScorePercentage_home ||
        stats.homeFailedToScorePercentage ||
        additionalInfo.seasonFTSPercentage_home ||
        additionalInfo.seasonFailedToScorePercentage_home ||
        0;
    } else if (venue === 'away') {
      cleanSheetPercentage = 
        stats.seasonCSPercentage_away ||
        stats.seasonCleanSheetPercentage_away ||
        stats.awayCleanSheetPercentage ||
        additionalInfo.seasonCSPercentage_away ||
        additionalInfo.seasonCleanSheetPercentage_away ||
        0;
      failedToScorePercentage = 
        stats.seasonFTSPercentage_away ||
        stats.seasonFailedToScorePercentage_away ||
        stats.awayFailedToScorePercentage ||
        additionalInfo.seasonFTSPercentage_away ||
        additionalInfo.seasonFailedToScorePercentage_away ||
        0;
    } else {
      // Overall
      cleanSheetPercentage = 
        stats.seasonCSPercentage_overall ||
        stats.seasonCleanSheetPercentage_overall ||
        stats.cleanSheetPercentage ||
        additionalInfo.seasonCSPercentage_overall ||
        additionalInfo.seasonCleanSheetPercentage_overall ||
        0;
      failedToScorePercentage = 
        stats.seasonFTSPercentage_overall ||
        stats.seasonFailedToScorePercentage_overall ||
        stats.failedToScorePercentage ||
        additionalInfo.seasonFTSPercentage_overall ||
        additionalInfo.seasonFailedToScorePercentage_overall ||
        0;
    }

    return {
      cleanSheetPercentage: parseFloat(cleanSheetPercentage).toFixed(0),
      failedToScorePercentage: parseFloat(failedToScorePercentage).toFixed(0)
    };
  }
}

export default TeamStatisticsExtractor;