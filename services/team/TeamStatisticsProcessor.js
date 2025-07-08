const Logger = require('../../utils/logger');

/**
 * TeamStatisticsProcessor - Handles statistics processing
 */
class TeamStatisticsProcessor {
  constructor() {
    this.logger = new Logger('TeamStatisticsProcessor');
  }

  /**
   * Process raw statistics from API response
   * This method preserves the exact logic from processStatisticsLegacy
   */
  processStatistics(apiStats, matches = [], teamId = null) {
    const stats = apiStats.stats || {};
    const additionalInfo = stats.additional_info || apiStats.additional_info || {};
    
    // Debug logging for Over/Under fields
    this.logger.info('Processing statistics - Over/Under fields:', {
      teamId,
      'seasonOver35Percentage_overall': stats.seasonOver35Percentage_overall,
      'seasonOver35Percentage_home': stats.seasonOver35Percentage_home,
      'seasonOver35Percentage_away': stats.seasonOver35Percentage_away,
      'seasonScoredOver35Percentage_overall': stats.seasonScoredOver35Percentage_overall || additionalInfo.seasonScoredOver35Percentage_overall,
      'seasonScoredOver35Percentage_home': stats.seasonScoredOver35Percentage_home || additionalInfo.seasonScoredOver35Percentage_home,
      'seasonScoredOver35Percentage_away': stats.seasonScoredOver35Percentage_away || additionalInfo.seasonScoredOver35Percentage_away,
    });
    
    // IMPORTANT: This is the exact same logic as processStatisticsLegacy
    // We're not changing ANY logic to ensure data integrity
    return {
      // Basic stats
      totalMatches: stats.seasonMatchesPlayed_overall || 0,
      completedMatches: stats.seasonMatchesPlayed_overall || 0,
      wins: stats.seasonWinsNum_overall || 0,
      draws: stats.seasonDrawsNum_overall || 0,
      losses: stats.seasonLossesNum_overall || 0,
      points: stats.seasonPoints_overall || 0,
      pointsPerGame: stats.seasonPPG_overall || 0,

      // Goals
      goalsFor: stats.seasonGoals_overall || stats.seasonScoredNum_overall || 0,
      goalsAgainst: stats.seasonConceded_overall || stats.seasonConcededNum_overall || 0,
      goalDifference: stats.seasonGoalDifference_overall || 0,
      averageGoalsFor: stats.seasonScoredAVG_overall || 0,
      averageGoalsAgainst: stats.seasonConcededAVG_overall || 0,
      goalsForPerMatch: stats.seasonScoredAVG_overall || 0,
      goalsAgainstPerMatch: stats.seasonConcededAVG_overall || 0,
      seasonConcededAVG_overall: stats.seasonConcededAVG_overall || 0,
      seasonConcededAVG_home: stats.seasonConcededAVG_home || 0,
      seasonConcededAVG_away: stats.seasonConcededAVG_away || 0,
      avgMatchGoals: stats.seasonAVG_overall || 0,
      seasonScoredAVG_overall: stats.seasonScoredAVG_overall || 0,

      // 2nd Half Goals Average
      scored_2hg_avg_overall:
        additionalInfo.scored_2hg_avg_overall || stats.scored_2hg_avg_overall || 0,
      scored_2hg_avg_home: additionalInfo.scored_2hg_avg_home || stats.scored_2hg_avg_home || 0,
      scored_2hg_avg_away: additionalInfo.scored_2hg_avg_away || stats.scored_2hg_avg_away || 0,
      conceded_2hg_avg_overall:
        additionalInfo.conceded_2hg_avg_overall || stats.conceded_2hg_avg_overall || 0,
      conceded_2hg_avg_home:
        additionalInfo.conceded_2hg_avg_home || stats.conceded_2hg_avg_home || 0,
      conceded_2hg_avg_away:
        additionalInfo.conceded_2hg_avg_away || stats.conceded_2hg_avg_away || 0,

      // 2nd Half Goals Total
      scored_2hg_overall: additionalInfo.scored_2hg_overall || stats.scored_2hg_overall || 0,
      scored_2hg_home: additionalInfo.scored_2hg_home || stats.scored_2hg_home || 0,
      scored_2hg_away: additionalInfo.scored_2hg_away || stats.scored_2hg_away || 0,

      // Home stats
      homeMatches: stats.seasonMatchesPlayed_home || 0,
      homeWins: stats.seasonWinsNum_home || 0,
      homeDraws: stats.seasonDrawsNum_home || 0,
      homeLosses: stats.seasonLossesNum_home || 0,
      homeGoalsFor: stats.seasonScoredNum_home || stats.seasonGoals_home || 0,
      homeGoalsAgainst: stats.seasonConcededNum_home || stats.seasonConceded_home || 0,
      homePointsPerGame: stats.seasonPPG_home || 0,
      homeGoalDifference: stats.seasonGoalDifference_home || 0,

      // Away stats
      awayMatches: stats.seasonMatchesPlayed_away || 0,
      awayWins: stats.seasonWinsNum_away || 0,
      awayDraws: stats.seasonDrawsNum_away || 0,
      awayLosses: stats.seasonLossesNum_away || 0,
      awayGoalsFor: stats.seasonScoredNum_away || stats.seasonGoals_away || 0,
      awayGoalsAgainst: stats.seasonConcededNum_away || stats.seasonConceded_away || 0,
      awayPointsPerGame: stats.seasonPPG_away || 0,
      awayGoalDifference: stats.seasonGoalDifference_away || 0,

      // Win/Draw/Loss percentages
      winPercentage: additionalInfo.winPercentage_overall || stats.winPercentage_overall || 0,
      drawPercentage: additionalInfo.drawPercentage_overall || stats.drawPercentage_overall || 0,
      lossPercentage: additionalInfo.losePercentage_overall || stats.losePercentage_overall || 0,
      homeWinPercentage: additionalInfo.winPercentage_home || stats.winPercentage_home || 0,
      awayWinPercentage: additionalInfo.winPercentage_away || stats.winPercentage_away || 0,

      // Clean sheets and BTTS
      cleanSheets: stats.seasonCS_overall || 0,
      failedToScore: stats.seasonFTS_overall || 0,
      cleanSheetPercentage: stats.seasonCSPercentage_overall || 0,
      failedToScorePercentage: stats.seasonFTSPercentage_overall || 0,
      homeCleanSheets: stats.seasonCS_home || 0,
      awayCleanSheets: stats.seasonCS_away || 0,
      homeFailedToScore: stats.seasonFTS_home || 0,
      awayFailedToScore: stats.seasonFTS_away || 0,
      homeCleanSheetPercentage: stats.seasonCSPercentage_home || 0,
      awayCleanSheetPercentage: stats.seasonCSPercentage_away || 0,
      homeFailedToScorePercentage: stats.seasonFTSPercentage_home || 0,
      awayFailedToScorePercentage: stats.seasonFTSPercentage_away || 0,

      // Over/Under goals
      over05GoalsPercentage: stats.seasonOver05Percentage_overall || 0,
      over15GoalsPercentage: stats.seasonOver15Percentage_overall || 0,
      over25GoalsPercentage: stats.seasonOver25Percentage_overall || 0,
      over35GoalsPercentage: stats.seasonOver35Percentage_overall || 0,
      over45GoalsPercentage: stats.seasonOver45Percentage_overall || 0,
      bothTeamsScoredPercentage: stats.seasonBTTSPercentage_overall || 0,
      bttsAndWinPercentage: stats.BTTS_and_win_percentage_overall || 0,
      bttsAndDrawPercentage: stats.BTTS_and_draw_percentage_overall || 0,
      bttsAndLosePercentage: stats.BTTS_and_lose_percentage_overall || 0,

      // Home Over/Under
      homeOver05GoalsPercentage: stats.seasonOver05Percentage_home || 0,
      homeOver15GoalsPercentage: stats.seasonOver15Percentage_home || 0,
      homeOver25GoalsPercentage: stats.seasonOver25Percentage_home || 0,
      homeOver35GoalsPercentage: stats.seasonOver35Percentage_home || 0,
      homeOver45GoalsPercentage: stats.seasonOver45Percentage_home || 0,
      homeBothTeamsScoredPercentage: stats.seasonBTTSPercentage_home || 0,
      homeBttsAndWinPercentage: stats.BTTS_and_win_percentage_home || 0,
      homeBttsAndDrawPercentage: stats.BTTS_and_draw_percentage_home || 0,
      homeBttsAndLosePercentage: stats.BTTS_and_lose_percentage_home || 0,

      // Away Over/Under
      awayOver05GoalsPercentage: stats.seasonOver05Percentage_away || 0,
      awayOver15GoalsPercentage: stats.seasonOver15Percentage_away || 0,
      awayOver25GoalsPercentage: stats.seasonOver25Percentage_away || 0,
      awayOver35GoalsPercentage: stats.seasonOver35Percentage_away || 0,
      awayOver45GoalsPercentage: stats.seasonOver45Percentage_away || 0,
      awayBothTeamsScoredPercentage: stats.seasonBTTSPercentage_away || 0,
      awayBttsAndWinPercentage: stats.BTTS_and_win_percentage_away || 0,
      awayBttsAndDrawPercentage: stats.BTTS_and_draw_percentage_away || 0,
      awayBttsAndLosePercentage: stats.BTTS_and_lose_percentage_away || 0,

      // xG stats
      xgFor: stats.xg_for_avg_overall || 0,
      xgAgainst: stats.xg_against_avg_overall || 0,
      xgForPerMatch: stats.xg_for_avg_overall || 0,
      xgAgainstPerMatch: stats.xg_against_avg_overall || 0,
      xgDifferencePerMatch: (stats.xg_for_avg_overall || 0) - (stats.xg_against_avg_overall || 0),
      homeXgFor: stats.xg_for_avg_home || 0,
      homeXgAgainst: stats.xg_against_avg_home || 0,
      homeXgForPerMatch: stats.xg_for_avg_home || 0,
      homeXgAgainstPerMatch: stats.xg_against_avg_home || 0,
      awayXgFor: stats.xg_for_avg_away || 0,
      awayXgAgainst: stats.xg_against_avg_away || 0,
      awayXgForPerMatch: stats.xg_for_avg_away || 0,
      awayXgAgainstPerMatch: stats.xg_against_avg_away || 0,

      // Goals averages for comparison with xG
      homeGoalsForPerMatch: stats.seasonScoredAVG_home || 0,
      awayGoalsForPerMatch: stats.seasonScoredAVG_away || 0,
      homeGoalsAgainstPerMatch: stats.seasonConcededAVG_home || 0,
      awayGoalsAgainstPerMatch: stats.seasonConcededAVG_away || 0,

      // Corners
      cornersAVG: stats.cornersAVG_overall || 0,
      cornersAgainstAVG: stats.cornersAgainstAVG_overall || 0,
      cornersTotalAVG: stats.cornersTotalAVG_overall || 0,
      cornersEarnedPerMatch: stats.cornersAVG_overall || 0,
      cornersAgainstPerMatch: stats.cornersAgainstAVG_overall || 0,
      totalCornersPerMatch: stats.cornersTotalAVG_overall || 0,
      homeCornersAVG: stats.cornersAVG_home || 0,
      homeCornersAgainstAVG: stats.cornersAgainstAVG_home || 0,
      homeCornersTotalAVG: stats.cornersTotalAVG_home || 0,
      awayCornersAVG: stats.cornersAVG_away || 0,
      awayCornersAgainstAVG: stats.cornersAgainstAVG_away || 0,
      awayCornersTotalAVG: stats.cornersTotalAVG_away || 0,

      // Corners Over statistics
      cornersOver65: stats.over65CornersPercentage_overall || 0,
      cornersOver75: stats.over75CornersPercentage_overall || 0,
      cornersOver85: stats.over85CornersPercentage_overall || 0,
      over95Corners: stats.over95CornersPercentage_overall || 0,
      over105Corners: stats.over105CornersPercentage_overall || 0,
      cornersOver115: stats.over115CornersPercentage_overall || 0,
      cornersOver125: stats.over125CornersPercentage_overall || 0,
      cornersOver135: stats.over135CornersPercentage_overall || 0,

      // Team-specific corner FOR statistics
      over25CornersForPercentage_overall: stats.over25CornersForPercentage_overall || 0,
      over35CornersForPercentage_overall: stats.over35CornersForPercentage_overall || 0,
      over45CornersForPercentage_overall: stats.over45CornersForPercentage_overall || 0,
      over55CornersForPercentage_overall: stats.over55CornersForPercentage_overall || 0,
      over65CornersForPercentage_overall: stats.over65CornersForPercentage_overall || 0,
      over75CornersForPercentage_overall: stats.over75CornersForPercentage_overall || 0,
      over85CornersForPercentage_overall: stats.over85CornersForPercentage_overall || 0,

      over25CornersForPercentage_home: stats.over25CornersForPercentage_home || 0,
      over35CornersForPercentage_home: stats.over35CornersForPercentage_home || 0,
      over45CornersForPercentage_home: stats.over45CornersForPercentage_home || 0,
      over55CornersForPercentage_home: stats.over55CornersForPercentage_home || 0,
      over65CornersForPercentage_home: stats.over65CornersForPercentage_home || 0,
      over75CornersForPercentage_home: stats.over75CornersForPercentage_home || 0,
      over85CornersForPercentage_home: stats.over85CornersForPercentage_home || 0,

      over25CornersForPercentage_away: stats.over25CornersForPercentage_away || 0,
      over35CornersForPercentage_away: stats.over35CornersForPercentage_away || 0,
      over45CornersForPercentage_away: stats.over45CornersForPercentage_away || 0,
      over55CornersForPercentage_away: stats.over55CornersForPercentage_away || 0,
      over65CornersForPercentage_away: stats.over65CornersForPercentage_away || 0,
      over75CornersForPercentage_away: stats.over75CornersForPercentage_away || 0,
      over85CornersForPercentage_away: stats.over85CornersForPercentage_away || 0,

      // Team-specific corner AGAINST statistics
      over25CornersAgainstPercentage_overall: stats.over25CornersAgainstPercentage_overall || 0,
      over35CornersAgainstPercentage_overall: stats.over35CornersAgainstPercentage_overall || 0,
      over45CornersAgainstPercentage_overall: stats.over45CornersAgainstPercentage_overall || 0,
      over55CornersAgainstPercentage_overall: stats.over55CornersAgainstPercentage_overall || 0,
      over65CornersAgainstPercentage_overall: stats.over65CornersAgainstPercentage_overall || 0,
      over75CornersAgainstPercentage_overall: stats.over75CornersAgainstPercentage_overall || 0,
      over85CornersAgainstPercentage_overall: stats.over85CornersAgainstPercentage_overall || 0,

      over25CornersAgainstPercentage_home: stats.over25CornersAgainstPercentage_home || 0,
      over35CornersAgainstPercentage_home: stats.over35CornersAgainstPercentage_home || 0,
      over45CornersAgainstPercentage_home: stats.over45CornersAgainstPercentage_home || 0,
      over55CornersAgainstPercentage_home: stats.over55CornersAgainstPercentage_home || 0,
      over65CornersAgainstPercentage_home: stats.over65CornersAgainstPercentage_home || 0,
      over75CornersAgainstPercentage_home: stats.over75CornersAgainstPercentage_home || 0,
      over85CornersAgainstPercentage_home: stats.over85CornersAgainstPercentage_home || 0,

      over25CornersAgainstPercentage_away: stats.over25CornersAgainstPercentage_away || 0,
      over35CornersAgainstPercentage_away: stats.over35CornersAgainstPercentage_away || 0,
      over45CornersAgainstPercentage_away: stats.over45CornersAgainstPercentage_away || 0,
      over55CornersAgainstPercentage_away: stats.over55CornersAgainstPercentage_away || 0,
      over65CornersAgainstPercentage_away: stats.over65CornersAgainstPercentage_away || 0,
      over75CornersAgainstPercentage_away: stats.over75CornersAgainstPercentage_away || 0,
      over85CornersAgainstPercentage_away: stats.over85CornersAgainstPercentage_away || 0,

      // Overall corner over statistics
      over65CornersPercentage_overall: stats.over65CornersPercentage_overall || 0,
      over75CornersPercentage_overall: stats.over75CornersPercentage_overall || 0,
      over85CornersPercentage_overall: stats.over85CornersPercentage_overall || 0,
      over95CornersPercentage_overall: stats.over95CornersPercentage_overall || 0,
      over105CornersPercentage_overall: stats.over105CornersPercentage_overall || 0,
      over115CornersPercentage_overall: stats.over115CornersPercentage_overall || 0,
      over125CornersPercentage_overall: stats.over125CornersPercentage_overall || 0,
      over135CornersPercentage_overall: stats.over135CornersPercentage_overall || 0,

      // Home corner over statistics
      over65CornersPercentage_home: stats.over65CornersPercentage_home || 0,
      over75CornersPercentage_home: stats.over75CornersPercentage_home || 0,
      over85CornersPercentage_home: stats.over85CornersPercentage_home || 0,
      over95CornersPercentage_home: stats.over95CornersPercentage_home || 0,
      over105CornersPercentage_home: stats.over105CornersPercentage_home || 0,
      over115CornersPercentage_home: stats.over115CornersPercentage_home || 0,
      over125CornersPercentage_home: stats.over125CornersPercentage_home || 0,
      over135CornersPercentage_home: stats.over135CornersPercentage_home || 0,

      // Away corner over statistics
      over65CornersPercentage_away: stats.over65CornersPercentage_away || 0,
      over75CornersPercentage_away: stats.over75CornersPercentage_away || 0,
      over85CornersPercentage_away: stats.over85CornersPercentage_away || 0,
      over95CornersPercentage_away: stats.over95CornersPercentage_away || 0,
      over105CornersPercentage_away: stats.over105CornersPercentage_away || 0,
      over115CornersPercentage_away: stats.over115CornersPercentage_away || 0,
      over125CornersPercentage_away: stats.over125CornersPercentage_away || 0,
      over135CornersPercentage_away: stats.over135CornersPercentage_away || 0,

      // Corner additional statistics
      corners1H_AVG_overall:
        stats.corners1H_AVG_overall || additionalInfo.corners1H_AVG_overall || 0,
      corners2H_AVG_overall:
        stats.corners2H_AVG_overall || additionalInfo.corners2H_AVG_overall || 0,
      corners1H_AVG_home: stats.corners1H_AVG_home || additionalInfo.corners1H_AVG_home || 0,
      corners2H_AVG_home: stats.corners2H_AVG_home || additionalInfo.corners2H_AVG_home || 0,
      corners1H_AVG_away: stats.corners1H_AVG_away || additionalInfo.corners1H_AVG_away || 0,
      corners2H_AVG_away: stats.corners2H_AVG_away || additionalInfo.corners2H_AVG_away || 0,

      cornerDrawPercentage_overall:
        stats.cornerDrawPercentage_overall || additionalInfo.cornerDrawPercentage_overall || 0,
      cornerDrawPercentage_home:
        stats.cornerDrawPercentage_home || additionalInfo.cornerDrawPercentage_home || 0,
      cornerDrawPercentage_away:
        stats.cornerDrawPercentage_away || additionalInfo.cornerDrawPercentage_away || 0,

      winMostCornersPercentage_overall:
        additionalInfo.team_with_most_corners_win_percentage_overall ||
        apiStats.team_with_most_corners_win_percentage_overall ||
        stats.team_with_most_corners_win_percentage_overall ||
        stats.winMostCornersPercentage_overall ||
        additionalInfo.winMostCornersPercentage_overall ||
        0,
      winMostCornersPercentage_home:
        additionalInfo.team_with_most_corners_win_percentage_home ||
        apiStats.team_with_most_corners_win_percentage_home ||
        stats.team_with_most_corners_win_percentage_home ||
        stats.winMostCornersPercentage_home ||
        additionalInfo.winMostCornersPercentage_home ||
        0,
      winMostCornersPercentage_away:
        additionalInfo.team_with_most_corners_win_percentage_away ||
        apiStats.team_with_most_corners_win_percentage_away ||
        stats.team_with_most_corners_win_percentage_away ||
        stats.winMostCornersPercentage_away ||
        additionalInfo.winMostCornersPercentage_away ||
        0,

      loseMostCornersPercentage_overall:
        stats.loseMostCornersPercentage_overall ||
        additionalInfo.loseMostCornersPercentage_overall ||
        0,
      loseMostCornersPercentage_home:
        stats.loseMostCornersPercentage_home || additionalInfo.loseMostCornersPercentage_home || 0,
      loseMostCornersPercentage_away:
        stats.loseMostCornersPercentage_away || additionalInfo.loseMostCornersPercentage_away || 0,

      corners04Percentage_overall:
        stats.corners04Percentage_overall || additionalInfo.corners04Percentage_overall || 0,
      corners04Percentage_home:
        stats.corners04Percentage_home || additionalInfo.corners04Percentage_home || 0,
      corners04Percentage_away:
        stats.corners04Percentage_away || additionalInfo.corners04Percentage_away || 0,

      corners56Percentage_overall:
        stats.corners56Percentage_overall || additionalInfo.corners56Percentage_overall || 0,
      corners56Percentage_home:
        stats.corners56Percentage_home || additionalInfo.corners56Percentage_home || 0,
      corners56Percentage_away:
        stats.corners56Percentage_away || additionalInfo.corners56Percentage_away || 0,

      corners78Percentage_overall:
        stats.corners78Percentage_overall || additionalInfo.corners78Percentage_overall || 0,
      corners78Percentage_home:
        stats.corners78Percentage_home || additionalInfo.corners78Percentage_home || 0,
      corners78Percentage_away:
        stats.corners78Percentage_away || additionalInfo.corners78Percentage_away || 0,

      corners910Percentage_overall:
        stats.corners910Percentage_overall || additionalInfo.corners910Percentage_overall || 0,
      corners910Percentage_home:
        stats.corners910Percentage_home || additionalInfo.corners910Percentage_home || 0,
      corners910Percentage_away:
        stats.corners910Percentage_away || additionalInfo.corners910Percentage_away || 0,

      corners11PlusPercentage_overall:
        stats.corners11PlusPercentage_overall ||
        additionalInfo.corners11PlusPercentage_overall ||
        0,
      corners11PlusPercentage_home:
        stats.corners11PlusPercentage_home || additionalInfo.corners11PlusPercentage_home || 0,
      corners11PlusPercentage_away:
        stats.corners11PlusPercentage_away || additionalInfo.corners11PlusPercentage_away || 0,

      // Cards
      totalCards: stats.cardsTotal_overall || 0,
      cardsPerMatch: stats.cardsAVG_overall || 0,
      homeCards: stats.cardsTotal_home || 0,
      awayCards: stats.cardsTotal_away || 0,
      homeCardsPerMatch: stats.cardsAVG_home || 0,
      awayCardsPerMatch: stats.cardsAVG_away || 0,
      cardsHighest: stats.cardsHighest_overall || 0,
      cardsLowest: stats.cardsLowest_overall || 0,

      // Cards For/Against
      cardsFor: additionalInfo.cards_for || additionalInfo.cards_for_overall || 0,
      cardsAgainst: additionalInfo.cards_against || additionalInfo.cards_against_overall || 0,
      cardsForPerMatch: additionalInfo.cards_for_avg || additionalInfo.cards_for_avg_overall || 0,
      cardsAgainstPerMatch:
        additionalInfo.cards_against_avg || additionalInfo.cards_against_avg_overall || 0,

      // Home/Away Cards For/Against
      homeCardsFor: additionalInfo.cards_for_home || 0,
      homeCardsAgainst: additionalInfo.cards_against_home || 0,
      awayCardsFor: additionalInfo.cards_for_away || 0,
      awayCardsAgainst: additionalInfo.cards_against_away || 0,

      // Cards For Over Percentages
      over05CardsForPercentage:
        stats.over05CardsForPercentage_overall ||
        additionalInfo.over05CardsForPercentage_overall ||
        additionalInfo.over05_cards_for_percentage ||
        0,
      over15CardsForPercentage:
        additionalInfo.over15_cards_for_percentage || additionalInfo.over15CardsForPercentage || 0,
      over25CardsForPercentage:
        additionalInfo.over25_cards_for_percentage || additionalInfo.over25CardsForPercentage || 0,
      over35CardsForPercentage:
        additionalInfo.over35_cards_for_percentage || additionalInfo.over35CardsForPercentage || 0,
      over45CardsForPercentage:
        additionalInfo.over45_cards_for_percentage || additionalInfo.over45CardsForPercentage || 0,
      over55CardsForPercentage:
        additionalInfo.over55_cards_for_percentage || additionalInfo.over55CardsForPercentage || 0,
      over65CardsForPercentage:
        additionalInfo.over65_cards_for_percentage || additionalInfo.over65CardsForPercentage || 0,

      // Cards Against Over Percentages
      over05CardsAgainstPercentage:
        additionalInfo.over05_cards_against_percentage ||
        additionalInfo.over05CardsAgainstPercentage ||
        0,
      over15CardsAgainstPercentage:
        additionalInfo.over15_cards_against_percentage ||
        additionalInfo.over15CardsAgainstPercentage ||
        0,
      over25CardsAgainstPercentage:
        additionalInfo.over25_cards_against_percentage ||
        additionalInfo.over25CardsAgainstPercentage ||
        0,
      over35CardsAgainstPercentage:
        additionalInfo.over35_cards_against_percentage ||
        additionalInfo.over35CardsAgainstPercentage ||
        0,
      over45CardsAgainstPercentage:
        additionalInfo.over45_cards_against_percentage ||
        additionalInfo.over45CardsAgainstPercentage ||
        0,
      over55CardsAgainstPercentage:
        additionalInfo.over55_cards_against_percentage ||
        additionalInfo.over55CardsAgainstPercentage ||
        0,
      over65CardsAgainstPercentage:
        additionalInfo.over65_cards_against_percentage ||
        additionalInfo.over65CardsAgainstPercentage ||
        0,

      // Home Cards For/Against Over Percentages
      homeOver05CardsForPercentage:
        stats.over05CardsForPercentage_home ||
        additionalInfo.over05CardsForPercentage_home ||
        additionalInfo.over05_cards_for_percentage_home ||
        0,
      homeOver15CardsForPercentage: additionalInfo.over15_cards_for_percentage_home || 0,
      homeOver25CardsForPercentage: additionalInfo.over25_cards_for_percentage_home || 0,
      homeOver35CardsForPercentage: additionalInfo.over35_cards_for_percentage_home || 0,
      homeOver45CardsForPercentage: additionalInfo.over45_cards_for_percentage_home || 0,
      homeOver55CardsForPercentage: additionalInfo.over55_cards_for_percentage_home || 0,
      homeOver65CardsForPercentage: additionalInfo.over65_cards_for_percentage_home || 0,

      homeOver05CardsAgainstPercentage: additionalInfo.over05_cards_against_percentage_home || 0,
      homeOver15CardsAgainstPercentage: additionalInfo.over15_cards_against_percentage_home || 0,
      homeOver25CardsAgainstPercentage: additionalInfo.over25_cards_against_percentage_home || 0,
      homeOver35CardsAgainstPercentage: additionalInfo.over35_cards_against_percentage_home || 0,

      // Away Cards For/Against Over Percentages
      awayOver05CardsForPercentage:
        stats.over05CardsForPercentage_away ||
        additionalInfo.over05CardsForPercentage_away ||
        additionalInfo.over05_cards_for_percentage_away ||
        0,
      awayOver15CardsForPercentage: additionalInfo.over15_cards_for_percentage_away || 0,
      awayOver25CardsForPercentage: additionalInfo.over25_cards_for_percentage_away || 0,
      awayOver35CardsForPercentage: additionalInfo.over35_cards_for_percentage_away || 0,
      awayOver45CardsForPercentage: additionalInfo.over45_cards_for_percentage_away || 0,
      awayOver55CardsForPercentage: additionalInfo.over55_cards_for_percentage_away || 0,
      awayOver65CardsForPercentage: additionalInfo.over65_cards_for_percentage_away || 0,

      awayOver05CardsAgainstPercentage: additionalInfo.over05_cards_against_percentage_away || 0,
      awayOver15CardsAgainstPercentage: additionalInfo.over15_cards_against_percentage_away || 0,
      awayOver25CardsAgainstPercentage: additionalInfo.over25_cards_against_percentage_away || 0,
      awayOver35CardsAgainstPercentage: additionalInfo.over35_cards_against_percentage_away || 0,

      // Card Over statistics
      cardsOver05:
        stats.over05CardsPercentage_overall ||
        additionalInfo.over05_cards_percentage ||
        additionalInfo.over_05_cards_percentage ||
        0,
      cardsOver15:
        stats.over15CardsPercentage_overall ||
        additionalInfo.over15_cards_percentage ||
        additionalInfo.over_15_cards_percentage ||
        0,
      cardsOver25:
        stats.over25CardsPercentage_overall ||
        additionalInfo.over25_cards_percentage ||
        additionalInfo.over_25_cards_percentage ||
        0,
      cardsOver35:
        stats.over35CardsPercentage_overall ||
        additionalInfo.over35_cards_percentage ||
        additionalInfo.over_35_cards_percentage ||
        0,
      cardsOver45:
        stats.over45CardsPercentage_overall ||
        additionalInfo.over45_cards_percentage ||
        additionalInfo.over_45_cards_percentage ||
        0,
      cardsOver55:
        stats.over55CardsPercentage_overall ||
        additionalInfo.over55_cards_percentage ||
        additionalInfo.over_55_cards_percentage ||
        0,

      // Card Over statistics - Home
      homeCardsOver05:
        stats.over05CardsPercentage_home ||
        additionalInfo.over05_cards_percentage_home ||
        additionalInfo.over_05_cards_percentage_home ||
        0,
      homeCardsOver15:
        stats.over15CardsPercentage_home ||
        additionalInfo.over15_cards_percentage_home ||
        additionalInfo.over_15_cards_percentage_home ||
        0,
      homeCardsOver25:
        stats.over25CardsPercentage_home ||
        additionalInfo.over25_cards_percentage_home ||
        additionalInfo.over_25_cards_percentage_home ||
        0,
      homeCardsOver35:
        stats.over35CardsPercentage_home ||
        additionalInfo.over35_cards_percentage_home ||
        additionalInfo.over_35_cards_percentage_home ||
        0,
      homeCardsOver45:
        stats.over45CardsPercentage_home ||
        additionalInfo.over45_cards_percentage_home ||
        additionalInfo.over_45_cards_percentage_home ||
        0,
      homeCardsOver55:
        stats.over55CardsPercentage_home ||
        additionalInfo.over55_cards_percentage_home ||
        additionalInfo.over_55_cards_percentage_home ||
        0,

      // Card Over statistics - Away
      awayCardsOver05:
        stats.over05CardsPercentage_away ||
        additionalInfo.over05_cards_percentage_away ||
        additionalInfo.over_05_cards_percentage_away ||
        0,
      awayCardsOver15:
        stats.over15CardsPercentage_away ||
        additionalInfo.over15_cards_percentage_away ||
        additionalInfo.over_15_cards_percentage_away ||
        0,
      awayCardsOver25:
        stats.over25CardsPercentage_away ||
        additionalInfo.over25_cards_percentage_away ||
        additionalInfo.over_25_cards_percentage_away ||
        0,
      awayCardsOver35:
        stats.over35CardsPercentage_away ||
        additionalInfo.over35_cards_percentage_away ||
        additionalInfo.over_35_cards_percentage_away ||
        0,
      awayCardsOver45:
        stats.over45CardsPercentage_away ||
        additionalInfo.over45_cards_percentage_away ||
        additionalInfo.over_45_cards_percentage_away ||
        0,
      awayCardsOver55:
        stats.over55CardsPercentage_away ||
        additionalInfo.over55_cards_percentage_away ||
        additionalInfo.over_55_cards_percentage_away ||
        0,

      // 1st Half & 2nd Half Cards
      cards1H_AVG_overall: stats.cards_1h_avg_overall || stats.cards1H_AVG_overall || 0,
      cards1H_AVG_home: stats.cards_1h_avg_home || stats.cards1H_AVG_home || 0,
      cards1H_AVG_away: stats.cards_1h_avg_away || stats.cards1H_AVG_away || 0,
      cards2H_AVG_overall: stats.cards_2h_avg_overall || stats.cards2H_AVG_overall || 0,
      cards2H_AVG_home: stats.cards_2h_avg_home || stats.cards2H_AVG_home || 0,
      cards2H_AVG_away: stats.cards_2h_avg_away || stats.cards2H_AVG_away || 0,

      // 1st Half Cards Under/Between/Over ranges
      cards1H_under2_percentage_overall:
        additionalInfo.fh_total_cards_under2_percentage_overall ||
        stats.fh_total_cards_under2_percentage_overall ||
        stats.cards1H_under2_percentage ||
        0,
      cards1H_2to3_percentage_overall:
        additionalInfo.fh_total_cards_2to3_percentage_overall ||
        stats.fh_total_cards_2to3_percentage_overall ||
        stats.cards1H_2to3_percentage ||
        0,
      cards1H_over3_percentage_overall:
        additionalInfo.fh_total_cards_over3_percentage_overall ||
        stats.fh_total_cards_over3_percentage_overall ||
        stats.cards1H_over3_percentage ||
        0,
      cards1H_under2_percentage_home:
        additionalInfo.fh_total_cards_under2_percentage_home ||
        stats.fh_total_cards_under2_percentage_home ||
        stats.homeCards1H_under2_percentage ||
        0,
      cards1H_2to3_percentage_home:
        additionalInfo.fh_total_cards_2to3_percentage_home ||
        stats.fh_total_cards_2to3_percentage_home ||
        stats.homeCards1H_2to3_percentage ||
        0,
      cards1H_over3_percentage_home:
        additionalInfo.fh_total_cards_over3_percentage_home ||
        stats.fh_total_cards_over3_percentage_home ||
        stats.homeCards1H_over3_percentage ||
        0,
      cards1H_under2_percentage_away:
        additionalInfo.fh_total_cards_under2_percentage_away ||
        stats.fh_total_cards_under2_percentage_away ||
        stats.awayCards1H_under2_percentage ||
        0,
      cards1H_2to3_percentage_away:
        additionalInfo.fh_total_cards_2to3_percentage_away ||
        stats.fh_total_cards_2to3_percentage_away ||
        stats.awayCards1H_2to3_percentage ||
        0,
      cards1H_over3_percentage_away:
        additionalInfo.fh_total_cards_over3_percentage_away ||
        stats.fh_total_cards_over3_percentage_away ||
        stats.awayCards1H_over3_percentage ||
        0,

      // 2nd Half Cards Under/Between/Over ranges
      cards2H_under2_percentage_overall:
        additionalInfo['2h_total_cards_under2_percentage_overall'] ||
        stats['2h_total_cards_under2_percentage_overall'] ||
        stats.cards2H_under2_percentage ||
        0,
      cards2H_2to3_percentage_overall:
        additionalInfo['2h_total_cards_2to3_percentage_overall'] ||
        stats['2h_total_cards_2to3_percentage_overall'] ||
        stats.cards2H_2to3_percentage ||
        0,
      cards2H_over3_percentage_overall:
        additionalInfo['2h_total_cards_over3_percentage_overall'] ||
        stats['2h_total_cards_over3_percentage_overall'] ||
        stats.cards2H_over3_percentage ||
        0,
      cards2H_under2_percentage_home:
        additionalInfo['2h_total_cards_under2_percentage_home'] ||
        stats['2h_total_cards_under2_percentage_home'] ||
        stats.homeCards2H_under2_percentage ||
        0,
      cards2H_2to3_percentage_home:
        additionalInfo['2h_total_cards_2to3_percentage_home'] ||
        stats['2h_total_cards_2to3_percentage_home'] ||
        stats.homeCards2H_2to3_percentage ||
        0,
      cards2H_over3_percentage_home:
        additionalInfo['2h_total_cards_over3_percentage_home'] ||
        stats['2h_total_cards_over3_percentage_home'] ||
        stats.homeCards2H_over3_percentage ||
        0,
      cards2H_under2_percentage_away:
        additionalInfo['2h_total_cards_under2_percentage_away'] ||
        stats['2h_total_cards_under2_percentage_away'] ||
        stats.awayCards2H_under2_percentage ||
        0,
      cards2H_2to3_percentage_away:
        additionalInfo['2h_total_cards_2to3_percentage_away'] ||
        stats['2h_total_cards_2to3_percentage_away'] ||
        stats.awayCards2H_2to3_percentage ||
        0,
      cards2H_over3_percentage_away:
        additionalInfo['2h_total_cards_over3_percentage_away'] ||
        stats['2h_total_cards_over3_percentage_away'] ||
        stats.awayCards2H_over3_percentage ||
        0,

      // Highest cards in halves
      cardsHighest1H_overall: stats.cards_1h_highest_overall || stats.cardsHighest1H_overall || 0,
      cardsHighest1H_home: stats.cards_1h_highest_home || stats.cardsHighest1H_home || 0,
      cardsHighest1H_away: stats.cards_1h_highest_away || stats.cardsHighest1H_away || 0,
      cardsHighest2H_overall: stats.cards_2h_highest_overall || stats.cardsHighest2H_overall || 0,
      cardsHighest2H_home: stats.cards_2h_highest_home || stats.cardsHighest2H_home || 0,
      cardsHighest2H_away: stats.cards_2h_highest_away || stats.cardsHighest2H_away || 0,

      // Lowest cards
      cardsLowest_home: stats.cardsLowest_home || 0,
      cardsLowest_away: stats.cardsLowest_away || 0,
      cardsVsOpponents: additionalInfo.cards_vs_opponents_overall || 0,
      cleanGames: additionalInfo.clean_games_percentage_overall || 0,
      multipleCardsGames: additionalInfo.multiple_cards_games_percentage_overall || 0,
      earlyCards: additionalInfo.early_cards_overall || 0,
      lateCards: additionalInfo.late_cards_overall || 0,
      cardsInWins: additionalInfo.cards_in_wins_overall || 0,
      cardsInLosses: additionalInfo.cards_in_losses_overall || 0,

      // Possession
      possessionPercentage: stats.possessionAVG_overall || 0,
      homePossessionPercentage: stats.possessionAVG_home || 0,
      awayPossessionPercentage: stats.possessionAVG_away || 0,

      // Penalties
      penaltiesWon: additionalInfo.penalties_won_overall || 0,
      penaltiesConceded: additionalInfo.penalties_conceded_overall || 0,
      homePenaltiesWon: additionalInfo.penalties_won_home || 0,
      awayPenaltiesWon: additionalInfo.penalties_won_away || 0,
      homePenaltiesConceded: additionalInfo.penalties_conceded_home || 0,
      awayPenaltiesConceded: additionalInfo.penalties_conceded_away || 0,
      penalty_in_a_match_percentage_overall:
        additionalInfo.penalty_in_a_match_percentage_overall || 0,
      penalty_in_a_match_percentage_home: additionalInfo.penalty_in_a_match_percentage_home || 0,
      penalty_in_a_match_percentage_away: additionalInfo.penalty_in_a_match_percentage_away || 0,

      // Form
      recentForm: additionalInfo.formRun_overall || stats.formRun_overall || '',
      homeForm: additionalInfo.formRun_home || stats.formRun_home || '',
      awayForm: additionalInfo.formRun_away || stats.formRun_away || '',

      // Additional stats
      predictionRisk: apiStats.risk || 0,
      homeAdvantagePercentage: additionalInfo.home_advantage_percentage || 0,
      bigChancesCreated: additionalInfo.big_chances_created_overall || 0,
      bigChancesMissed: additionalInfo.big_chances_missed_overall || 0,

      // Halftime / First Half Stats
      leadingAtHT_overall: stats.leadingAtHT_overall || 0,
      leadingAtHT_home: stats.leadingAtHT_home || 0,
      leadingAtHT_away: stats.leadingAtHT_away || 0,
      leadingAtHTPercentage_overall: stats.leadingAtHTPercentage_overall || 0,
      leadingAtHTPercentage_home: stats.leadingAtHTPercentage_home || 0,
      leadingAtHTPercentage_away: stats.leadingAtHTPercentage_away || 0,

      drawingAtHT_overall: stats.drawingAtHT_overall || 0,
      drawingAtHT_home: stats.drawingAtHT_home || 0,
      drawingAtHT_away: stats.drawingAtHT_away || 0,
      drawingAtHTPercentage_overall: stats.drawingAtHTPercentage_overall || 0,
      drawingAtHTPercentage_home: stats.drawingAtHTPercentage_home || 0,
      drawingAtHTPercentage_away: stats.drawingAtHTPercentage_away || 0,

      trailingAtHT_overall: stats.trailingAtHT_overall || 0,
      trailingAtHT_home: stats.trailingAtHT_home || 0,
      trailingAtHT_away: stats.trailingAtHT_away || 0,
      trailingAtHTPercentage_overall: stats.trailingAtHTPercentage_overall || 0,
      trailingAtHTPercentage_home: stats.trailingAtHTPercentage_home || 0,
      trailingAtHTPercentage_away: stats.trailingAtHTPercentage_away || 0,

      // HT Goals
      scoredGoalsHT_overall: stats.scoredGoalsHT_overall || 0,
      scoredGoalsHT_home: stats.scoredGoalsHT_home || 0,
      scoredGoalsHT_away: stats.scoredGoalsHT_away || 0,
      concededGoalsHT_overall: stats.concededGoalsHT_overall || 0,
      concededGoalsHT_home: stats.concededGoalsHT_home || 0,
      concededGoalsHT_away: stats.concededGoalsHT_away || 0,

      scoredAVGHT_overall: stats.scoredAVGHT_overall || 0,
      scoredAVGHT_home: stats.scoredAVGHT_home || 0,
      scoredAVGHT_away: stats.scoredAVGHT_away || 0,
      concededAVGHT_overall: stats.concededAVGHT_overall || 0,
      concededAVGHT_home: stats.concededAVGHT_home || 0,
      concededAVGHT_away: stats.concededAVGHT_away || 0,

      // HT Clean Sheets & Failed to Score
      seasonCSHT_overall: stats.seasonCSHT_overall || 0,
      seasonCSHT_home: stats.seasonCSHT_home || 0,
      seasonCSHT_away: stats.seasonCSHT_away || 0,
      seasonCSPercentageHT_overall: stats.seasonCSPercentageHT_overall || 0,
      seasonCSPercentageHT_home: stats.seasonCSPercentageHT_home || 0,
      seasonCSPercentageHT_away: stats.seasonCSPercentageHT_away || 0,

      // 2H Clean Sheet percentages
      cs_2hg_percentage_overall:
        stats.cs_2hg_percentage_overall || additionalInfo.cs_2hg_percentage_overall || 0,
      cs_2hg_percentage_home:
        stats.cs_2hg_percentage_home || additionalInfo.cs_2hg_percentage_home || 0,
      cs_2hg_percentage_away:
        stats.cs_2hg_percentage_away || additionalInfo.cs_2hg_percentage_away || 0,

      seasonFTSHT_overall: stats.seasonFTSHT_overall || 0,
      seasonFTSHT_home: stats.seasonFTSHT_home || 0,
      seasonFTSHT_away: stats.seasonFTSHT_away || 0,
      seasonFTSPercentageHT_overall: stats.seasonFTSPercentageHT_overall || 0,
      seasonFTSPercentageHT_home: stats.seasonFTSPercentageHT_home || 0,
      seasonFTSPercentageHT_away: stats.seasonFTSPercentageHT_away || 0,

      // 2nd Half FTS percentages
      fts_2hg_percentage_overall:
        apiStats.fts_2hg_percentage_overall || stats.fts_2hg_percentage_overall || 0,
      fts_2hg_percentage_home:
        apiStats.fts_2hg_percentage_home || stats.fts_2hg_percentage_home || 0,
      fts_2hg_percentage_away:
        apiStats.fts_2hg_percentage_away || stats.fts_2hg_percentage_away || 0,

      // HT BTTS
      seasonBTTSHT_overall: stats.seasonBTTSHT_overall || 0,
      seasonBTTSHT_home: stats.seasonBTTSHT_home || 0,
      seasonBTTSHT_away: stats.seasonBTTSHT_away || 0,
      seasonBTTSPercentageHT_overall: stats.seasonBTTSPercentageHT_overall || 0,
      seasonBTTSPercentageHT_home: stats.seasonBTTSPercentageHT_home || 0,
      seasonBTTSPercentageHT_away: stats.seasonBTTSPercentageHT_away || 0,

      // HT Over/Under
      seasonOver05PercentageHT_overall: stats.seasonOver05PercentageHT_overall || 0,
      seasonOver05PercentageHT_home: stats.seasonOver05PercentageHT_home || 0,
      seasonOver05PercentageHT_away: stats.seasonOver05PercentageHT_away || 0,
      seasonOver15PercentageHT_overall: stats.seasonOver15PercentageHT_overall || 0,
      seasonOver15PercentageHT_home: stats.seasonOver15PercentageHT_home || 0,
      seasonOver15PercentageHT_away: stats.seasonOver15PercentageHT_away || 0,
      seasonOver25PercentageHT_overall: stats.seasonOver25PercentageHT_overall || 0,
      seasonOver25PercentageHT_home: stats.seasonOver25PercentageHT_home || 0,
      seasonOver25PercentageHT_away: stats.seasonOver25PercentageHT_away || 0,

      // 2nd Half Over/Under
      over05_2hg_percentage_overall:
        stats.over05_2hg_percentage_overall || additionalInfo.over05_2hg_percentage_overall || 0,
      over05_2hg_percentage_home:
        stats.over05_2hg_percentage_home || additionalInfo.over05_2hg_percentage_home || 0,
      over05_2hg_percentage_away:
        stats.over05_2hg_percentage_away || additionalInfo.over05_2hg_percentage_away || 0,
      over15_2hg_percentage_overall:
        stats.over15_2hg_percentage_overall || additionalInfo.over15_2hg_percentage_overall || 0,
      over15_2hg_percentage_home:
        stats.over15_2hg_percentage_home || additionalInfo.over15_2hg_percentage_home || 0,
      over15_2hg_percentage_away:
        stats.over15_2hg_percentage_away || additionalInfo.over15_2hg_percentage_away || 0,
      over25_2hg_percentage_overall:
        stats.over25_2hg_percentage_overall || additionalInfo.over25_2hg_percentage_overall || 0,
      over25_2hg_percentage_home:
        stats.over25_2hg_percentage_home || additionalInfo.over25_2hg_percentage_home || 0,
      over25_2hg_percentage_away:
        stats.over25_2hg_percentage_away || additionalInfo.over25_2hg_percentage_away || 0,

      // Goal Timing Statistics
      goals0_15: stats.goals_scored_min_0_to_15 || 0,
      goals16_30: stats.goals_scored_min_16_to_30 || 0,
      goals31_45: stats.goals_scored_min_31_to_45 || 0,
      goals46_60: stats.goals_scored_min_46_to_60 || 0,
      goals61_75: stats.goals_scored_min_61_to_75 || 0,
      goals76_90: stats.goals_scored_min_76_to_90 || 0,

      goalsConc0_15: stats.goals_conceded_min_0_to_15 || 0,
      goalsConc16_30: stats.goals_conceded_min_16_to_30 || 0,
      goalsConc31_45: stats.goals_conceded_min_31_to_45 || 0,
      goalsConc46_60: stats.goals_conceded_min_46_to_60 || 0,
      goalsConc61_75: stats.goals_conceded_min_61_to_75 || 0,
      goalsConc76_90: stats.goals_conceded_min_76_to_90 || 0,

      // Home timing
      homeGoals0_15: stats.goals_scored_min_0_to_15_home || 0,
      homeGoals16_30: stats.goals_scored_min_16_to_30_home || 0,
      homeGoals31_45: stats.goals_scored_min_31_to_45_home || 0,
      homeGoals46_60: stats.goals_scored_min_46_to_60_home || 0,
      homeGoals61_75: stats.goals_scored_min_61_to_75_home || 0,
      homeGoals76_90: stats.goals_scored_min_76_to_90_home || 0,

      homeGoalsConc0_15: stats.goals_conceded_min_0_to_15_home || 0,
      homeGoalsConc16_30: stats.goals_conceded_min_16_to_30_home || 0,
      homeGoalsConc31_45: stats.goals_conceded_min_31_to_45_home || 0,
      homeGoalsConc46_60: stats.goals_conceded_min_46_to_60_home || 0,
      homeGoalsConc61_75: stats.goals_conceded_min_61_to_75_home || 0,
      homeGoalsConc76_90: stats.goals_conceded_min_76_to_90_home || 0,

      // Away timing
      awayGoals0_15: stats.goals_scored_min_0_to_15_away || 0,
      awayGoals16_30: stats.goals_scored_min_16_to_30_away || 0,
      awayGoals31_45: stats.goals_scored_min_31_to_45_away || 0,
      awayGoals46_60: stats.goals_scored_min_46_to_60_away || 0,
      awayGoals61_75: stats.goals_scored_min_61_to_75_away || 0,
      awayGoals76_90: stats.goals_scored_min_76_to_90_away || 0,

      awayGoalsConc0_15: stats.goals_conceded_min_0_to_15_away || 0,
      awayGoalsConc16_30: stats.goals_conceded_min_16_to_30_away || 0,
      awayGoalsConc31_45: stats.goals_conceded_min_31_to_45_away || 0,
      awayGoalsConc46_60: stats.goals_conceded_min_46_to_60_away || 0,
      awayGoalsConc61_75: stats.goals_conceded_min_61_to_75_away || 0,
      awayGoalsConc76_90: stats.goals_conceded_min_76_to_90_away || 0,

      // Goals tab specific fields
      seasonScoredOver05Percentage_overall:
        stats.seasonScoredOver05Percentage_overall ||
        additionalInfo.seasonScoredOver05Percentage_overall ||
        0,
      seasonScoredOver05Percentage_home:
        stats.seasonScoredOver05Percentage_home ||
        additionalInfo.seasonScoredOver05Percentage_home ||
        0,
      seasonScoredOver05Percentage_away:
        stats.seasonScoredOver05Percentage_away ||
        additionalInfo.seasonScoredOver05Percentage_away ||
        0,
      seasonScoredOver15Percentage_overall:
        stats.seasonScoredOver15Percentage_overall ||
        additionalInfo.seasonScoredOver15Percentage_overall ||
        0,
      seasonScoredOver15Percentage_home:
        stats.seasonScoredOver15Percentage_home ||
        additionalInfo.seasonScoredOver15Percentage_home ||
        0,
      seasonScoredOver15Percentage_away:
        stats.seasonScoredOver15Percentage_away ||
        additionalInfo.seasonScoredOver15Percentage_away ||
        0,
      seasonScoredOver25Percentage_overall:
        stats.seasonScoredOver25Percentage_overall ||
        additionalInfo.seasonScoredOver25Percentage_overall ||
        0,
      seasonScoredOver25Percentage_home:
        stats.seasonScoredOver25Percentage_home ||
        additionalInfo.seasonScoredOver25Percentage_home ||
        0,
      seasonScoredOver25Percentage_away:
        stats.seasonScoredOver25Percentage_away ||
        additionalInfo.seasonScoredOver25Percentage_away ||
        0,
      seasonScoredOver35Percentage_overall:
        stats.seasonScoredOver35Percentage_overall ||
        additionalInfo.seasonScoredOver35Percentage_overall ||
        0,
      seasonScoredOver35Percentage_home:
        stats.seasonScoredOver35Percentage_home ||
        additionalInfo.seasonScoredOver35Percentage_home ||
        0,
      seasonScoredOver35Percentage_away:
        stats.seasonScoredOver35Percentage_away ||
        additionalInfo.seasonScoredOver35Percentage_away ||
        0,

      scoredBothHalvesPercentage_overall:
        stats.scoredBothHalvesPercentage_overall ||
        additionalInfo.scoredBothHalvesPercentage_overall ||
        0,
      scoredBothHalvesPercentage_home:
        stats.scoredBothHalvesPercentage_home ||
        additionalInfo.scoredBothHalvesPercentage_home ||
        0,
      scoredBothHalvesPercentage_away:
        stats.scoredBothHalvesPercentage_away ||
        additionalInfo.scoredBothHalvesPercentage_away ||
        0,

      firstGoalScoredPercentage_overall:
        stats.firstGoalScoredPercentage_overall ||
        additionalInfo.firstGoalScoredPercentage_overall ||
        0,
      firstGoalScoredPercentage_home:
        stats.firstGoalScoredPercentage_home || additionalInfo.firstGoalScoredPercentage_home || 0,
      firstGoalScoredPercentage_away:
        stats.firstGoalScoredPercentage_away || additionalInfo.firstGoalScoredPercentage_away || 0,

      seasonHighestScored_overall:
        stats.seasonHighestScored_overall ||
        additionalInfo.seasonHighestScored_overall ||
        Math.max(stats.seasonHighestScored_home || 0, stats.seasonHighestScored_away || 0),
      seasonHighestScored_home:
        stats.seasonHighestScored_home || additionalInfo.seasonHighestScored_home || 0,
      seasonHighestScored_away:
        stats.seasonHighestScored_away || additionalInfo.seasonHighestScored_away || 0,
      highestScored:
        stats.seasonHighestScored_overall ||
        additionalInfo.seasonHighestScored_overall ||
        Math.max(stats.seasonHighestScored_home || 0, stats.seasonHighestScored_away || 0),

      // Scored in 1H/2H percentages
      scoredPercentageHT_overall:
        stats.scoredPercentageHT_overall || additionalInfo.scoredPercentageHT_overall || 0,
      scoredPercentageHT_home:
        stats.scoredPercentageHT_home || additionalInfo.scoredPercentageHT_home || 0,
      scoredPercentageHT_away:
        stats.scoredPercentageHT_away || additionalInfo.scoredPercentageHT_away || 0,

      scoredPercentage2H_overall:
        stats.scoredPercentage2H_overall || additionalInfo.scoredPercentage2H_overall || 0,
      scoredPercentage2H_home:
        stats.scoredPercentage2H_home || additionalInfo.scoredPercentage2H_home || 0,
      scoredPercentage2H_away:
        stats.scoredPercentage2H_away || additionalInfo.scoredPercentage2H_away || 0,

      // 1H/2H goals counts
      scored1HG_overall: stats.scored1HG_overall || additionalInfo.scored1HG_overall || 0,
      scored1HG_home: stats.scored1HG_home || additionalInfo.scored1HG_home || 0,
      scored1HG_away: stats.scored1HG_away || additionalInfo.scored1HG_away || 0,

      scored2HG_overall: stats.scored2HG_overall || additionalInfo.scored2HG_overall || 0,
      scored2HG_home: stats.scored2HG_home || additionalInfo.scored2HG_home || 0,
      scored2HG_away: stats.scored2HG_away || additionalInfo.scored2HG_away || 0,

      // Conceded specific fields
      seasonConcededOver05Percentage_overall:
        stats.seasonConcededOver05Percentage_overall ||
        additionalInfo.seasonConcededOver05Percentage_overall ||
        0,
      seasonConcededOver05Percentage_home:
        stats.seasonConcededOver05Percentage_home ||
        additionalInfo.seasonConcededOver05Percentage_home ||
        0,
      seasonConcededOver05Percentage_away:
        stats.seasonConcededOver05Percentage_away ||
        additionalInfo.seasonConcededOver05Percentage_away ||
        0,
      seasonConcededOver15Percentage_overall:
        stats.seasonConcededOver15Percentage_overall ||
        additionalInfo.seasonConcededOver15Percentage_overall ||
        0,
      seasonConcededOver15Percentage_home:
        stats.seasonConcededOver15Percentage_home ||
        additionalInfo.seasonConcededOver15Percentage_home ||
        0,
      seasonConcededOver15Percentage_away:
        stats.seasonConcededOver15Percentage_away ||
        additionalInfo.seasonConcededOver15Percentage_away ||
        0,
      seasonConcededOver25Percentage_overall:
        stats.seasonConcededOver25Percentage_overall ||
        additionalInfo.seasonConcededOver25Percentage_overall ||
        0,
      seasonConcededOver25Percentage_home:
        stats.seasonConcededOver25Percentage_home ||
        additionalInfo.seasonConcededOver25Percentage_home ||
        0,
      seasonConcededOver25Percentage_away:
        stats.seasonConcededOver25Percentage_away ||
        additionalInfo.seasonConcededOver25Percentage_away ||
        0,

      cleanSheetPercentage_overall:
        stats.cleanSheetPercentage_overall || additionalInfo.cleanSheetPercentage_overall || 0,
      cleanSheetPercentage_home:
        stats.cleanSheetPercentage_home || additionalInfo.cleanSheetPercentage_home || 0,
      cleanSheetPercentage_away:
        stats.cleanSheetPercentage_away || additionalInfo.cleanSheetPercentage_away || 0,

      seasonHighestConceded_overall:
        stats.seasonHighestConceded_overall ||
        additionalInfo.seasonHighestConceded_overall ||
        Math.max(stats.seasonHighestConceded_home || 0, stats.seasonHighestConceded_away || 0),
      seasonHighestConceded_home:
        stats.seasonHighestConceded_home || additionalInfo.seasonHighestConceded_home || 0,
      seasonHighestConceded_away:
        stats.seasonHighestConceded_away || additionalInfo.seasonHighestConceded_away || 0,

      // Conceded in 1H/2H percentages
      concededPercentageHT_overall:
        stats.concededPercentageHT_overall || additionalInfo.concededPercentageHT_overall || 0,
      concededPercentageHT_home:
        stats.concededPercentageHT_home || additionalInfo.concededPercentageHT_home || 0,
      concededPercentageHT_away:
        stats.concededPercentageHT_away || additionalInfo.concededPercentageHT_away || 0,

      conceded_2hg_percentage_overall:
        stats.conceded_2hg_percentage_overall ||
        additionalInfo.conceded_2hg_percentage_overall ||
        0,
      conceded_2hg_percentage_home:
        stats.conceded_2hg_percentage_home || additionalInfo.conceded_2hg_percentage_home || 0,
      conceded_2hg_percentage_away:
        stats.conceded_2hg_percentage_away || additionalInfo.conceded_2hg_percentage_away || 0,

      // Conceded in both halves
      concededBothHalvesPercentage_overall:
        stats.concededBothHalvesPercentage_overall ||
        additionalInfo.concededBothHalvesPercentage_overall ||
        0,
      concededBothHalvesPercentage_home:
        stats.concededBothHalvesPercentage_home ||
        additionalInfo.concededBothHalvesPercentage_home ||
        0,
      concededBothHalvesPercentage_away:
        stats.concededBothHalvesPercentage_away ||
        additionalInfo.concededBothHalvesPercentage_away ||
        0,

      // 1H/2H conceded goals counts
      conceded1HG_overall: stats.conceded1HG_overall || additionalInfo.conceded1HG_overall || 0,
      conceded1HG_home: stats.conceded1HG_home || additionalInfo.conceded1HG_home || 0,
      conceded1HG_away: stats.conceded1HG_away || additionalInfo.conceded1HG_away || 0,

      conceded2HG_overall: stats.conceded2HG_overall || additionalInfo.conceded2HG_overall || 0,
      conceded2HG_home: stats.conceded2HG_home || additionalInfo.conceded2HG_home || 0,
      conceded2HG_away: stats.conceded2HG_away || additionalInfo.conceded2HG_away || 0,

      // 2nd Half Goals Conceded Total
      conceded_2hg_overall: additionalInfo.conceded_2hg_overall || stats.conceded_2hg_overall || 0,
      conceded_2hg_home: additionalInfo.conceded_2hg_home || stats.conceded_2hg_home || 0,
      conceded_2hg_away: additionalInfo.conceded_2hg_away || stats.conceded_2hg_away || 0,

      // BTTS & Over 2.5 combinations
      over25_and_btts_percentage_overall:
        additionalInfo.over25_and_btts_percentage_overall ||
        stats.over25_and_btts_percentage_overall ||
        0,
      over25_and_btts_percentage_home:
        additionalInfo.over25_and_btts_percentage_home ||
        stats.over25_and_btts_percentage_home ||
        0,
      over25_and_btts_percentage_away:
        additionalInfo.over25_and_btts_percentage_away ||
        stats.over25_and_btts_percentage_away ||
        0,

      // BTTS 1H & 2H combinations
      btts_1h2h_yes_yes_percentage_overall:
        additionalInfo.btts_1h2h_yes_yes_percentage_overall ||
        stats.btts_1h2h_yes_yes_percentage_overall ||
        0,
      btts_1h2h_yes_yes_percentage_home:
        additionalInfo.btts_1h2h_yes_yes_percentage_home ||
        stats.btts_1h2h_yes_yes_percentage_home ||
        0,
      btts_1h2h_yes_yes_percentage_away:
        additionalInfo.btts_1h2h_yes_yes_percentage_away ||
        stats.btts_1h2h_yes_yes_percentage_away ||
        0,

      btts_1h2h_yes_no_percentage_overall:
        additionalInfo.btts_1h2h_yes_no_percentage_overall ||
        stats.btts_1h2h_yes_no_percentage_overall ||
        0,
      btts_1h2h_yes_no_percentage_home:
        additionalInfo.btts_1h2h_yes_no_percentage_home ||
        stats.btts_1h2h_yes_no_percentage_home ||
        0,
      btts_1h2h_yes_no_percentage_away:
        additionalInfo.btts_1h2h_yes_no_percentage_away ||
        stats.btts_1h2h_yes_no_percentage_away ||
        0,

      btts_1h2h_no_yes_percentage_overall:
        additionalInfo.btts_1h2h_no_yes_percentage_overall ||
        stats.btts_1h2h_no_yes_percentage_overall ||
        0,
      btts_1h2h_no_yes_percentage_home:
        additionalInfo.btts_1h2h_no_yes_percentage_home ||
        stats.btts_1h2h_no_yes_percentage_home ||
        0,
      btts_1h2h_no_yes_percentage_away:
        additionalInfo.btts_1h2h_no_yes_percentage_away ||
        stats.btts_1h2h_no_yes_percentage_away ||
        0,

      btts_1h2h_no_no_percentage_overall:
        additionalInfo.btts_1h2h_no_no_percentage_overall ||
        stats.btts_1h2h_no_no_percentage_overall ||
        0,
      btts_1h2h_no_no_percentage_home:
        additionalInfo.btts_1h2h_no_no_percentage_home ||
        stats.btts_1h2h_no_no_percentage_home ||
        0,
      btts_1h2h_no_no_percentage_away:
        additionalInfo.btts_1h2h_no_no_percentage_away ||
        stats.btts_1h2h_no_no_percentage_away ||
        0,

      // 2nd Half BTTS
      btts_2hg_percentage_overall:
        additionalInfo.btts_2hg_percentage_overall || stats.btts_2hg_percentage_overall || 0,
      btts_2hg_percentage_home:
        additionalInfo.btts_2hg_percentage_home || stats.btts_2hg_percentage_home || 0,
      btts_2hg_percentage_away:
        additionalInfo.btts_2hg_percentage_away || stats.btts_2hg_percentage_away || 0,

      // Shots statistics
      shotsAVG:
        Math.round((stats.shotsAVG_overall || additionalInfo.shotsAVG_overall || 0) * 100) / 100,
      homeShotsAVG:
        Math.round((stats.shotsAVG_home || additionalInfo.shotsAVG_home || 0) * 100) / 100,
      awayShotsAVG:
        Math.round((stats.shotsAVG_away || additionalInfo.shotsAVG_away || 0) * 100) / 100,

      shotsOnTargetAVG:
        Math.round(
          (stats.shotsOnTargetAVG_overall || additionalInfo.shotsOnTargetAVG_overall || 0) * 100
        ) / 100,
      homeShotsOnTargetAVG:
        Math.round(
          (stats.shotsOnTargetAVG_home || additionalInfo.shotsOnTargetAVG_home || 0) * 100
        ) / 100,
      awayShotsOnTargetAVG:
        Math.round(
          (stats.shotsOnTargetAVG_away || additionalInfo.shotsOnTargetAVG_away || 0) * 100
        ) / 100,

      shotsOffTargetAVG:
        Math.round(
          (stats.shotsOffTargetAVG_overall || additionalInfo.shotsOffTargetAVG_overall || 0) * 100
        ) / 100,
      homeShotsOffTargetAVG:
        Math.round(
          (stats.shotsOffTargetAVG_home || additionalInfo.shotsOffTargetAVG_home || 0) * 100
        ) / 100,
      awayShotsOffTargetAVG:
        Math.round(
          (stats.shotsOffTargetAVG_away || additionalInfo.shotsOffTargetAVG_away || 0) * 100
        ) / 100,

      // Shot conversion and per goal stats
      shotsConversionRate:
        Math.round(
          (stats.shot_conversion_rate_overall || additionalInfo.shot_conversion_rate_overall || 0) *
            100
        ) / 100,
      homeShotsConversionRate:
        Math.round(
          (stats.shot_conversion_rate_home || additionalInfo.shot_conversion_rate_home || 0) * 100
        ) / 100,
      awayShotsConversionRate:
        Math.round(
          (stats.shot_conversion_rate_away || additionalInfo.shot_conversion_rate_away || 0) * 100
        ) / 100,

      shotsPerGoal:
        Math.round(
          (stats.shots_per_goals_scored_overall ||
            additionalInfo.shots_per_goals_scored_overall ||
            0) * 10
        ) / 10,
      homeShotsPerGoal:
        Math.round(
          (stats.shots_per_goals_scored_home || additionalInfo.shots_per_goals_scored_home || 0) *
            10
        ) / 10,
      awayShotsPerGoal:
        Math.round(
          (stats.shots_per_goals_scored_away || additionalInfo.shots_per_goals_scored_away || 0) *
            10
        ) / 10,

      shotsOnTargetPerGoal:
        Math.round(
          (stats.shots_on_target_per_goals_scored_overall ||
            additionalInfo.shots_on_target_per_goals_scored_overall ||
            0) * 10
        ) / 10,
      homeShotsOnTargetPerGoal:
        Math.round(
          (stats.shots_on_target_per_goals_scored_home ||
            additionalInfo.shots_on_target_per_goals_scored_home ||
            0) * 10
        ) / 10,
      awayShotsOnTargetPerGoal:
        Math.round(
          (stats.shots_on_target_per_goals_scored_away ||
            additionalInfo.shots_on_target_per_goals_scored_away ||
            0) * 10
        ) / 10,

      // Team shots over percentages
      shotsOver10_5:
        stats.team_shots_over105_percentage_overall ||
        additionalInfo.team_shots_over105_percentage_overall ||
        0,
      homeShotsOver10_5:
        stats.team_shots_over105_percentage_home ||
        additionalInfo.team_shots_over105_percentage_home ||
        0,
      awayShotsOver10_5:
        stats.team_shots_over105_percentage_away ||
        additionalInfo.team_shots_over105_percentage_away ||
        0,

      shotsOver11_5:
        stats.team_shots_over115_percentage_overall ||
        additionalInfo.team_shots_over115_percentage_overall ||
        0,
      homeShotsOver11_5:
        stats.team_shots_over115_percentage_home ||
        additionalInfo.team_shots_over115_percentage_home ||
        0,
      awayShotsOver11_5:
        stats.team_shots_over115_percentage_away ||
        additionalInfo.team_shots_over115_percentage_away ||
        0,

      shotsOver12_5:
        stats.team_shots_over125_percentage_overall ||
        additionalInfo.team_shots_over125_percentage_overall ||
        0,
      homeShotsOver12_5:
        stats.team_shots_over125_percentage_home ||
        additionalInfo.team_shots_over125_percentage_home ||
        0,
      awayShotsOver12_5:
        stats.team_shots_over125_percentage_away ||
        additionalInfo.team_shots_over125_percentage_away ||
        0,

      shotsOver13_5:
        stats.team_shots_over135_percentage_overall ||
        additionalInfo.team_shots_over135_percentage_overall ||
        0,
      homeShotsOver13_5:
        stats.team_shots_over135_percentage_home ||
        additionalInfo.team_shots_over135_percentage_home ||
        0,
      awayShotsOver13_5:
        stats.team_shots_over135_percentage_away ||
        additionalInfo.team_shots_over135_percentage_away ||
        0,

      shotsOver14_5:
        stats.team_shots_over145_percentage_overall ||
        additionalInfo.team_shots_over145_percentage_overall ||
        0,
      homeShotsOver14_5:
        stats.team_shots_over145_percentage_home ||
        additionalInfo.team_shots_over145_percentage_home ||
        0,
      awayShotsOver14_5:
        stats.team_shots_over145_percentage_away ||
        additionalInfo.team_shots_over145_percentage_away ||
        0,

      shotsOver15_5:
        stats.team_shots_over155_percentage_overall ||
        additionalInfo.team_shots_over155_percentage_overall ||
        0,
      homeShotsOver15_5:
        stats.team_shots_over155_percentage_home ||
        additionalInfo.team_shots_over155_percentage_home ||
        0,
      awayShotsOver15_5:
        stats.team_shots_over155_percentage_away ||
        additionalInfo.team_shots_over155_percentage_away ||
        0,

      // Team shots on target over percentages
      shotsOnTargetOver3_5:
        stats.team_shots_on_target_over35_percentage_overall ||
        additionalInfo.team_shots_on_target_over35_percentage_overall ||
        0,
      homeShotsOnTargetOver3_5:
        stats.team_shots_on_target_over35_percentage_home ||
        additionalInfo.team_shots_on_target_over35_percentage_home ||
        0,
      awayShotsOnTargetOver3_5:
        stats.team_shots_on_target_over35_percentage_away ||
        additionalInfo.team_shots_on_target_over35_percentage_away ||
        0,

      shotsOnTargetOver4_5:
        stats.team_shots_on_target_over45_percentage_overall ||
        additionalInfo.team_shots_on_target_over45_percentage_overall ||
        0,
      homeShotsOnTargetOver4_5:
        stats.team_shots_on_target_over45_percentage_home ||
        additionalInfo.team_shots_on_target_over45_percentage_home ||
        0,
      awayShotsOnTargetOver4_5:
        stats.team_shots_on_target_over45_percentage_away ||
        additionalInfo.team_shots_on_target_over45_percentage_away ||
        0,

      shotsOnTargetOver5_5:
        stats.team_shots_on_target_over55_percentage_overall ||
        additionalInfo.team_shots_on_target_over55_percentage_overall ||
        0,
      homeShotsOnTargetOver5_5:
        stats.team_shots_on_target_over55_percentage_home ||
        additionalInfo.team_shots_on_target_over55_percentage_home ||
        0,
      awayShotsOnTargetOver5_5:
        stats.team_shots_on_target_over55_percentage_away ||
        additionalInfo.team_shots_on_target_over55_percentage_away ||
        0,

      shotsOnTargetOver6_5:
        stats.team_shots_on_target_over65_percentage_overall ||
        additionalInfo.team_shots_on_target_over65_percentage_overall ||
        0,
      homeShotsOnTargetOver6_5:
        stats.team_shots_on_target_over65_percentage_home ||
        additionalInfo.team_shots_on_target_over65_percentage_home ||
        0,
      awayShotsOnTargetOver6_5:
        stats.team_shots_on_target_over65_percentage_away ||
        additionalInfo.team_shots_on_target_over65_percentage_away ||
        0,

      // Match shots over percentages
      matchShotsOver23_5:
        stats.match_shots_over235_percentage_overall ||
        additionalInfo.match_shots_over235_percentage_overall ||
        0,
      homeMatchShotsOver23_5:
        stats.match_shots_over235_percentage_home ||
        additionalInfo.match_shots_over235_percentage_home ||
        0,
      awayMatchShotsOver23_5:
        stats.match_shots_over235_percentage_away ||
        additionalInfo.match_shots_over235_percentage_away ||
        0,

      matchShotsOver24_5:
        stats.match_shots_over245_percentage_overall ||
        additionalInfo.match_shots_over245_percentage_overall ||
        0,
      homeMatchShotsOver24_5:
        stats.match_shots_over245_percentage_home ||
        additionalInfo.match_shots_over245_percentage_home ||
        0,
      awayMatchShotsOver24_5:
        stats.match_shots_over245_percentage_away ||
        additionalInfo.match_shots_over245_percentage_away ||
        0,

      matchShotsOver25_5:
        stats.match_shots_over255_percentage_overall ||
        additionalInfo.match_shots_over255_percentage_overall ||
        0,
      homeMatchShotsOver25_5:
        stats.match_shots_over255_percentage_home ||
        additionalInfo.match_shots_over255_percentage_home ||
        0,
      awayMatchShotsOver25_5:
        stats.match_shots_over255_percentage_away ||
        additionalInfo.match_shots_over255_percentage_away ||
        0,

      matchShotsOver26_5:
        stats.match_shots_over265_percentage_overall ||
        additionalInfo.match_shots_over265_percentage_overall ||
        0,
      homeMatchShotsOver26_5:
        stats.match_shots_over265_percentage_home ||
        additionalInfo.match_shots_over265_percentage_home ||
        0,
      awayMatchShotsOver26_5:
        stats.match_shots_over265_percentage_away ||
        additionalInfo.match_shots_over265_percentage_away ||
        0,

      matchShotsOver27_5:
        stats.match_shots_over275_percentage_overall ||
        additionalInfo.match_shots_over275_percentage_overall ||
        0,
      homeMatchShotsOver27_5:
        stats.match_shots_over275_percentage_home ||
        additionalInfo.match_shots_over275_percentage_home ||
        0,
      awayMatchShotsOver27_5:
        stats.match_shots_over275_percentage_away ||
        additionalInfo.match_shots_over275_percentage_away ||
        0,

      matchShotsOver28_5:
        stats.match_shots_over285_percentage_overall ||
        additionalInfo.match_shots_over285_percentage_overall ||
        0,
      homeMatchShotsOver28_5:
        stats.match_shots_over285_percentage_home ||
        additionalInfo.match_shots_over285_percentage_home ||
        0,
      awayMatchShotsOver28_5:
        stats.match_shots_over285_percentage_away ||
        additionalInfo.match_shots_over285_percentage_away ||
        0,

      // Match shots on target over percentages
      matchShotsOnTargetOver7_5:
        stats.match_shots_on_target_over75_percentage_overall ||
        additionalInfo.match_shots_on_target_over75_percentage_overall ||
        0,
      homeMatchShotsOnTargetOver7_5:
        stats.match_shots_on_target_over75_percentage_home ||
        additionalInfo.match_shots_on_target_over75_percentage_home ||
        0,
      awayMatchShotsOnTargetOver7_5:
        stats.match_shots_on_target_over75_percentage_away ||
        additionalInfo.match_shots_on_target_over75_percentage_away ||
        0,

      matchShotsOnTargetOver8_5:
        stats.match_shots_on_target_over85_percentage_overall ||
        additionalInfo.match_shots_on_target_over85_percentage_overall ||
        0,
      homeMatchShotsOnTargetOver8_5:
        stats.match_shots_on_target_over85_percentage_home ||
        additionalInfo.match_shots_on_target_over85_percentage_home ||
        0,
      awayMatchShotsOnTargetOver8_5:
        stats.match_shots_on_target_over85_percentage_away ||
        additionalInfo.match_shots_on_target_over85_percentage_away ||
        0,

      matchShotsOnTargetOver9_5:
        stats.match_shots_on_target_over95_percentage_overall ||
        additionalInfo.match_shots_on_target_over95_percentage_overall ||
        0,
      homeMatchShotsOnTargetOver9_5:
        stats.match_shots_on_target_over95_percentage_home ||
        additionalInfo.match_shots_on_target_over95_percentage_home ||
        0,
      awayMatchShotsOnTargetOver9_5:
        stats.match_shots_on_target_over95_percentage_away ||
        additionalInfo.match_shots_on_target_over95_percentage_away ||
        0,

      matchShotsOnTargetOver10_5:
        stats.match_shots_on_target_over105_percentage_overall ||
        additionalInfo.match_shots_on_target_over105_percentage_overall ||
        0,
      homeMatchShotsOnTargetOver10_5:
        stats.match_shots_on_target_over105_percentage_home ||
        additionalInfo.match_shots_on_target_over105_percentage_home ||
        0,
      awayMatchShotsOnTargetOver10_5:
        stats.match_shots_on_target_over105_percentage_away ||
        additionalInfo.match_shots_on_target_over105_percentage_away ||
        0,

      matchShotsOnTargetOver11_5:
        stats.match_shots_on_target_over115_percentage_overall ||
        additionalInfo.match_shots_on_target_over115_percentage_overall ||
        0,
      homeMatchShotsOnTargetOver11_5:
        stats.match_shots_on_target_over115_percentage_home ||
        additionalInfo.match_shots_on_target_over115_percentage_home ||
        0,
      awayMatchShotsOnTargetOver11_5:
        stats.match_shots_on_target_over115_percentage_away ||
        additionalInfo.match_shots_on_target_over115_percentage_away ||
        0,

      matchShotsOnTargetOver12_5:
        stats.match_shots_on_target_over125_percentage_overall ||
        additionalInfo.match_shots_on_target_over125_percentage_overall ||
        0,
      homeMatchShotsOnTargetOver12_5:
        stats.match_shots_on_target_over125_percentage_home ||
        additionalInfo.match_shots_on_target_over125_percentage_home ||
        0,
      awayMatchShotsOnTargetOver12_5:
        stats.match_shots_on_target_over125_percentage_away ||
        additionalInfo.match_shots_on_target_over125_percentage_away ||
        0,
        
      // Raw API field mappings for Over/Under Goals
      seasonOver05Percentage_overall: stats.seasonOver05Percentage_overall || 0,
      seasonOver05Percentage_home: stats.seasonOver05Percentage_home || 0,
      seasonOver05Percentage_away: stats.seasonOver05Percentage_away || 0,
      seasonOver15Percentage_overall: stats.seasonOver15Percentage_overall || 0,
      seasonOver15Percentage_home: stats.seasonOver15Percentage_home || 0,
      seasonOver15Percentage_away: stats.seasonOver15Percentage_away || 0,
      seasonOver25Percentage_overall: stats.seasonOver25Percentage_overall || 0,
      seasonOver25Percentage_home: stats.seasonOver25Percentage_home || 0,
      seasonOver25Percentage_away: stats.seasonOver25Percentage_away || 0,
      seasonOver35Percentage_overall: stats.seasonOver35Percentage_overall || 0,
      seasonOver35Percentage_home: stats.seasonOver35Percentage_home || 0,
      seasonOver35Percentage_away: stats.seasonOver35Percentage_away || 0,
      seasonOver45Percentage_overall: stats.seasonOver45Percentage_overall || 0,
      seasonOver45Percentage_home: stats.seasonOver45Percentage_home || 0,
      seasonOver45Percentage_away: stats.seasonOver45Percentage_away || 0,
      seasonOver55Percentage_overall: stats.seasonOver55Percentage_overall || 0,
      seasonOver55Percentage_home: stats.seasonOver55Percentage_home || 0,
      seasonOver55Percentage_away: stats.seasonOver55Percentage_away || 0
    };
  }
}

module.exports = TeamStatisticsProcessor;