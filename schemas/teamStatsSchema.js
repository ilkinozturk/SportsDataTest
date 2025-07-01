/**
 * Team Statistics Schema Definition
 * Defines the mapping between API fields and frontend fields
 */

const TeamStatsSchema = {
  // Basic Statistics
  basic: {
    gamesPlayed: {
      sources: ['seasonMatchesPlayed', 'matches_played', 'games_played', 'total_matches'],
      default: 0,
    },
    wins: {
      sources: ['seasonWinsNum', 'wins', 'total_wins', 'w'],
      default: 0,
    },
    draws: {
      sources: ['seasonDrawsNum', 'draws', 'total_draws', 'd'],
      default: 0,
    },
    losses: {
      sources: ['seasonLossesNum', 'losses', 'total_losses', 'l'],
      default: 0,
    },
    points: {
      sources: ['seasonPoints', 'points', 'total_points', 'pts'],
      default: 0,
    },
    pointsPerGame: {
      sources: ['seasonPPG', 'ppg', 'points_per_game', 'avg_points'],
      default: 0,
    },
  },

  // Goal Statistics
  goals: {
    // Scored
    goalsScored: {
      sources: ['seasonGoals', 'seasonScoredNum', 'goals_scored', 'total_goals_scored', 'gf'],
      default: 0,
    },
    goalsPerMatch: {
      sources: ['seasonScoredAVG', 'goals_per_match', 'avg_goals_scored', 'gpg'],
      default: 0,
    },
    goalsScored1H: {
      sources: ['goals_scored_first_half', 'first_half_goals_scored', 'gf_1h'],
      default: 0,
    },
    goalsScored2H: {
      sources: ['goals_scored_second_half', 'second_half_goals_scored', 'gf_2h'],
      default: 0,
    },

    // Conceded
    goalsConceded: {
      sources: [
        'seasonConceded',
        'seasonConcededNum',
        'goals_conceded',
        'total_goals_conceded',
        'ga',
      ],
      default: 0,
    },
    goalsConcededPerMatch: {
      sources: ['seasonConcededAVG', 'goals_conceded_per_match', 'avg_goals_conceded', 'gapg'],
      default: 0,
    },
    goalsConceded1H: {
      sources: ['goals_conceded_first_half', 'first_half_goals_conceded', 'ga_1h'],
      default: 0,
    },
    goalsConceded2H: {
      sources: ['goals_conceded_second_half', 'second_half_goals_conceded', 'ga_2h'],
      default: 0,
    },

    // Clean Sheets
    cleanSheets: {
      sources: ['seasonCS_overall', 'seasonCS', 'clean_sheets', 'total_clean_sheets', 'cs'],
      default: 0,
    },
    cleanSheetPercentage: {
      sources: ['clean_sheet_percentage', 'cs_percentage', 'cs_pct'],
      default: 0,
    },

    // Failed To Score
    failedToScore: {
      sources: ['seasonFTS', 'failed_to_score', 'fts'],
      default: 0,
    },
    failedToScorePercentage: {
      sources: ['seasonFTSPercentage', 'failed_to_score_percentage', 'fts_percentage'],
      default: 0,
    },

    // BTTS (Both Teams To Score)
    btts: {
      sources: ['btts_count', 'both_teams_scored', 'btts'],
      default: 0,
    },
    bttsPercentage: {
      sources: ['btts_percentage', 'btts_pct', 'both_teams_scored_percentage'],
      default: 0,
    },

    // Over/Under
    over15: {
      sources: ['over_15_count', 'over15', 'matches_over_15_goals'],
      default: 0,
    },
    over15Percentage: {
      sources: ['over_15_percentage', 'over15_percentage', 'over15_pct'],
      default: 0,
    },
    over25: {
      sources: ['over_25_count', 'over25', 'matches_over_25_goals'],
      default: 0,
    },
    over25Percentage: {
      sources: ['over_25_percentage', 'over25_percentage', 'over25_pct'],
      default: 0,
    },
    over35: {
      sources: ['over_35_count', 'over35', 'matches_over_35_goals'],
      default: 0,
    },
    over35Percentage: {
      sources: ['over_35_percentage', 'over35_percentage', 'over35_pct'],
      default: 0,
    },
  },

  // Corner Statistics
  corners: {
    // Basic Corner Stats
    cornersFor: {
      sources: ['corners_for_total', 'total_corners_for', 'corners_earned'],
      default: 0,
    },
    cornersAgainst: {
      sources: ['corners_against_total', 'total_corners_against', 'corners_conceded'],
      default: 0,
    },
    cornersPerMatch: {
      sources: ['corners_per_match', 'avg_corners', 'corners_avg'],
      default: 0,
    },

    // Corners For/Earned
    cornersForPerMatch: {
      sources: [
        'cornersAVG',
        'avg_corners_for',
        'corners_for_per_match',
        'corners_earned_per_match',
      ],
      default: 0,
    },
    winMostCornersPercentage: {
      sources: [
        'team_with_most_corners_win_percentage',
        'win_most_corners_percentage',
        'most_corners_win_pct',
      ],
      default: 0,
    },
    over25CornersForPercentage: {
      sources: [
        'over_25_corners_for_percentage',
        'over25_corners_for_pct',
        'corners_for_over25_pct',
      ],
      default: 0,
    },
    over35CornersForPercentage: {
      sources: [
        'over_35_corners_for_percentage',
        'over35_corners_for_pct',
        'corners_for_over35_pct',
      ],
      default: 0,
    },
    over45CornersForPercentage: {
      sources: [
        'over_45_corners_for_percentage',
        'over45_corners_for_pct',
        'corners_for_over45_pct',
      ],
      default: 0,
    },
    over55CornersForPercentage: {
      sources: [
        'over_55_corners_for_percentage',
        'over55_corners_for_pct',
        'corners_for_over55_pct',
      ],
      default: 0,
    },
    over65CornersForPercentage: {
      sources: [
        'over_65_corners_for_percentage',
        'over65_corners_for_pct',
        'corners_for_over65_pct',
      ],
      default: 0,
    },
    over75CornersForPercentage: {
      sources: [
        'over_75_corners_for_percentage',
        'over75_corners_for_pct',
        'corners_for_over75_pct',
      ],
      default: 0,
    },
    over85CornersForPercentage: {
      sources: [
        'over_85_corners_for_percentage',
        'over85_corners_for_pct',
        'corners_for_over85_pct',
      ],
      default: 0,
    },

    // Corners Against
    cornersAgainstPerMatch: {
      sources: [
        'cornersAgainstAVG',
        'avg_corners_against',
        'corners_against_per_match',
        'corners_conceded_per_match',
      ],
      default: 0,
    },
    over25CornersAgainstPercentage: {
      sources: [
        'over_25_corners_against_percentage',
        'over25_corners_against_pct',
        'corners_against_over25_pct',
      ],
      default: 0,
    },
    over35CornersAgainstPercentage: {
      sources: [
        'over_35_corners_against_percentage',
        'over35_corners_against_pct',
        'corners_against_over35_pct',
      ],
      default: 0,
    },
    over45CornersAgainstPercentage: {
      sources: [
        'over_45_corners_against_percentage',
        'over45_corners_against_pct',
        'corners_against_over45_pct',
      ],
      default: 0,
    },
    over55CornersAgainstPercentage: {
      sources: [
        'over_55_corners_against_percentage',
        'over55_corners_against_pct',
        'corners_against_over55_pct',
      ],
      default: 0,
    },
    over65CornersAgainstPercentage: {
      sources: [
        'over_65_corners_against_percentage',
        'over65_corners_against_pct',
        'corners_against_over65_pct',
      ],
      default: 0,
    },
    over75CornersAgainstPercentage: {
      sources: [
        'over_75_corners_against_percentage',
        'over75_corners_against_pct',
        'corners_against_over75_pct',
      ],
      default: 0,
    },
    over85CornersAgainstPercentage: {
      sources: [
        'over_85_corners_against_percentage',
        'over85_corners_against_pct',
        'corners_against_over85_pct',
      ],
      default: 0,
    },

    // Total Corners Over/Under
    over85: {
      sources: ['over_85_count', 'over85', 'matches_over_85_corners'],
      default: 0,
    },
    over85Percentage: {
      sources: ['over_85_percentage', 'over85_percentage', 'over85_corners_pct'],
      default: 0,
    },
    over95: {
      sources: ['over_95_count', 'over95', 'matches_over_95_corners'],
      default: 0,
    },
    over95Percentage: {
      sources: ['over_95_percentage', 'over95_percentage', 'over95_corners_pct'],
      default: 0,
    },
    over105: {
      sources: ['over_105_count', 'over105', 'matches_over_105_corners'],
      default: 0,
    },
    over105Percentage: {
      sources: ['over_105_percentage', 'over105_percentage', 'over105_corners_pct'],
      default: 0,
    },
    over115: {
      sources: ['over_115_count', 'over115', 'matches_over_115_corners'],
      default: 0,
    },
    over115Percentage: {
      sources: ['over_115_percentage', 'over115_percentage', 'over115_corners_pct'],
      default: 0,
    },
    over125: {
      sources: ['over_125_count', 'over125', 'matches_over_125_corners'],
      default: 0,
    },
    over125Percentage: {
      sources: ['over_125_percentage', 'over125_percentage', 'over125_corners_pct'],
      default: 0,
    },
    over135: {
      sources: ['over_135_count', 'over135', 'matches_over_135_corners'],
      default: 0,
    },
    over135Percentage: {
      sources: ['over_135_percentage', 'over135_percentage', 'over135_corners_pct'],
      default: 0,
    },
  },

  // Card Statistics
  cards: {
    // Yellow Cards
    yellowCards: {
      sources: ['yellowCardsTotal', 'yellow_cards_total', 'total_yellow_cards', 'yc'],
      default: 0,
    },
    yellowCardsPerMatch: {
      sources: ['yellow_cards_per_match', 'avg_yellow_cards', 'yc_per_match'],
      default: 0,
    },
    yellowCardsFor: {
      sources: ['yellow_cards_for', 'yellow_cards_received', 'yc_for'],
      default: 0,
    },
    yellowCardsAgainst: {
      sources: ['yellow_cards_against', 'yellow_cards_opponents', 'yc_against'],
      default: 0,
    },

    // Red Cards
    redCards: {
      sources: ['redCardsTotal', 'red_cards_total', 'total_red_cards', 'rc'],
      default: 0,
    },
    redCardsPerMatch: {
      sources: ['red_cards_per_match', 'avg_red_cards', 'rc_per_match'],
      default: 0,
    },
    redCardsFor: {
      sources: ['red_cards_for', 'red_cards_received', 'rc_for'],
      default: 0,
    },
    redCardsAgainst: {
      sources: ['red_cards_against', 'red_cards_opponents', 'rc_against'],
      default: 0,
    },

    // Total Cards
    totalCards: {
      sources: ['cardsTotal', 'cards_total', 'total_cards', 'cards'],
      default: 0,
    },
    cardsPerMatch: {
      sources: ['cardsAVG', 'cards_per_match', 'avg_cards', 'cards_avg'],
      default: 0,
    },
    cardsFor: {
      sources: ['cards_for', 'cards_for_total', 'cards_for_overall'],
      default: 0,
      additionalInfo: true,
    },
    cardsAgainst: {
      sources: ['cards_against', 'cards_against_total', 'cards_against_overall'],
      default: 0,
      additionalInfo: true,
    },
    cardsForPerMatch: {
      sources: ['cards_for_avg', 'cards_for_per_match', 'cards_for_avg_overall'],
      default: 0,
      additionalInfo: true,
    },
    cardsAgainstPerMatch: {
      sources: ['cards_against_avg', 'cards_against_per_match', 'cards_against_avg_overall'],
      default: 0,
      additionalInfo: true,
    },

    // Cards Over/Under
    over05Cards: {
      sources: ['over05Cards', 'over_05_cards_count', 'matches_over_05_cards'],
      default: 0,
    },
    over05CardsPercentage: {
      sources: [
        'over05CardsPercentage',
        'over_05_cards_percentage',
        'over05_cards_pct',
        'cardsOver05',
      ],
      default: 0,
    },
    over15Cards: {
      sources: ['over15Cards', 'over_15_cards_count', 'matches_over_15_cards'],
      default: 0,
    },
    over15CardsPercentage: {
      sources: ['over15CardsPercentage', 'over_15_cards_percentage', 'over15_cards_pct'],
      default: 0,
    },
    over25Cards: {
      sources: ['over25Cards', 'over_25_cards_count', 'matches_over_25_cards'],
      default: 0,
    },
    over25CardsPercentage: {
      sources: ['over25CardsPercentage', 'over_25_cards_percentage', 'over25_cards_pct'],
      default: 0,
    },
    over35Cards: {
      sources: ['over35Cards', 'over_35_cards_count', 'matches_over_35_cards'],
      default: 0,
    },
    over35CardsPercentage: {
      sources: ['over35CardsPercentage', 'over_35_cards_percentage', 'over35_cards_pct'],
      default: 0,
    },
    over45Cards: {
      sources: ['over45Cards', 'over_45_cards_count', 'matches_over_45_cards'],
      default: 0,
    },
    over45CardsPercentage: {
      sources: ['over45CardsPercentage', 'over_45_cards_percentage', 'over45_cards_pct'],
      default: 0,
    },
    over55Cards: {
      sources: ['over55Cards', 'over_55_cards_count', 'matches_over_55_cards'],
      default: 0,
    },
    over55CardsPercentage: {
      sources: ['over55CardsPercentage', 'over_55_cards_percentage', 'over55_cards_pct'],
      default: 0,
    },
    over65Cards: {
      sources: ['over65Cards', 'over_65_cards_count', 'matches_over_65_cards'],
      default: 0,
    },
    over65CardsPercentage: {
      sources: ['over65CardsPercentage', 'over_65_cards_percentage', 'over65_cards_pct'],
      default: 0,
    },

    // Cards For Over/Under
    over15CardsFor: {
      sources: ['over15CardsFor', 'over_15_cards_for_count'],
      default: 0,
    },
    over15CardsForPercentage: {
      sources: [
        'over15CardsForPercentage',
        'over_15_cards_for_percentage',
        'over15_cards_for_percentage_overall',
      ],
      default: 0,
      additionalInfo: true,
    },
    over25CardsFor: {
      sources: ['over25CardsFor', 'over_25_cards_for_count'],
      default: 0,
    },
    over25CardsForPercentage: {
      sources: ['over25CardsForPercentage', 'over_25_cards_for_percentage'],
      default: 0,
    },
    over35CardsFor: {
      sources: ['over35CardsFor', 'over_35_cards_for_count'],
      default: 0,
    },
    over35CardsForPercentage: {
      sources: ['over35CardsForPercentage', 'over_35_cards_for_percentage'],
      default: 0,
    },

    // Cards Against Over/Under
    over05CardsAgainst: {
      sources: ['over05CardsAgainst', 'over_05_cards_against_count'],
      default: 0,
    },
    over05CardsAgainstPercentage: {
      sources: ['over05CardsAgainstPercentage', 'over_05_cards_against_percentage'],
      default: 0,
    },
    over15CardsAgainst: {
      sources: ['over15CardsAgainst', 'over_15_cards_against_count'],
      default: 0,
    },
    over15CardsAgainstPercentage: {
      sources: ['over15CardsAgainstPercentage', 'over_15_cards_against_percentage'],
      default: 0,
    },
    over25CardsAgainst: {
      sources: ['over25CardsAgainst', 'over_25_cards_against_count'],
      default: 0,
    },
    over25CardsAgainstPercentage: {
      sources: ['over25CardsAgainstPercentage', 'over_25_cards_against_percentage'],
      default: 0,
    },

    // Card Timing
    firstHalfCards: {
      sources: ['fh_cards_total', 'first_half_cards_total'],
      default: 0,
    },
    secondHalfCards: {
      sources: ['2h_cards_total', 'second_half_cards_total'],
      default: 0,
    },
    firstHalfCardsFor: {
      sources: ['fh_cards_for', 'first_half_cards_for'],
      default: 0,
    },
    secondHalfCardsFor: {
      sources: ['2h_cards_for', 'second_half_cards_for'],
      default: 0,
    },
    firstHalfCardsAgainst: {
      sources: ['fh_cards_against', 'first_half_cards_against'],
      default: 0,
    },
    secondHalfCardsAgainst: {
      sources: ['2h_cards_against', 'second_half_cards_against'],
      default: 0,
    },

    // Card Timing Averages
    cards1H_AVG: {
      sources: ['fh_cards_total_avg_overall', 'fh_cards_total_avg', 'cards1H_AVG', 'first_half_cards_avg'],
      default: 0,
    },
    cards2H_AVG: {
      sources: ['2h_cards_total_avg_overall', '2h_cards_total_avg', 'cards2H_AVG', 'second_half_cards_avg'],
      default: 0,
    },

    // Card Timing Over Percentages
    cards1H_over05_percentage: {
      sources: ['fh_total_cards_over05_percentage', 'cards1H_over05_percentage'],
      default: 0,
    },
    cards1H_over15_percentage: {
      sources: ['fh_total_cards_over15_percentage', 'cards1H_over15_percentage'],
      default: 0,
    },
    cards1H_over25_percentage: {
      sources: ['fh_total_cards_over25_percentage', 'cards1H_over25_percentage'],
      default: 0,
    },
    cards2H_over05_percentage: {
      sources: ['2h_total_cards_over05_percentage', 'cards2H_over05_percentage'],
      default: 0,
    },
    cards2H_over15_percentage: {
      sources: ['2h_total_cards_over15_percentage', 'cards2H_over15_percentage'],
      default: 0,
    },
    cards2H_over25_percentage: {
      sources: ['2h_total_cards_over25_percentage', 'cards2H_over25_percentage'],
      default: 0,
    },

    // Card Timing Under/Between/Over Percentages
    cards1H_under2_percentage: {
      sources: ['fh_total_cards_under2_percentage', 'cards1H_under2_percentage'],
      default: 0,
    },
    cards1H_2to3_percentage: {
      sources: ['fh_total_cards_2to3_percentage', 'cards1H_2to3_percentage'],
      default: 0,
    },
    cards1H_over3_percentage: {
      sources: ['fh_total_cards_over3_percentage', 'cards1H_over3_percentage'],
      default: 0,
    },
    cards2H_under2_percentage: {
      sources: ['2h_total_cards_under2_percentage', 'cards2H_under2_percentage'],
      default: 0,
    },
    cards2H_2to3_percentage: {
      sources: ['2h_total_cards_2to3_percentage', 'cards2H_2to3_percentage'],
      default: 0,
    },
    cards2H_over3_percentage: {
      sources: ['2h_total_cards_over3_percentage', 'cards2H_over3_percentage'],
      default: 0,
    },
  },

  // Match Result Statistics
  results: {
    // Win/Draw/Loss Percentages
    winPercentage: {
      sources: ['winPercentage', 'win_percentage', 'win_pct', 'w_percentage'],
      default: 0,
    },
    drawPercentage: {
      sources: ['draw_percentage', 'draw_pct', 'd_percentage'],
      default: 0,
    },
    lossPercentage: {
      sources: ['loss_percentage', 'loss_pct', 'l_percentage'],
      default: 0,
    },

    // Form
    form: {
      sources: ['form', 'recent_form', 'last_5_form'],
      default: '',
    },
    homeForm: {
      sources: ['home_form', 'form_home', 'home_recent_form'],
      default: '',
    },
    awayForm: {
      sources: ['away_form', 'form_away', 'away_recent_form'],
      default: '',
    },
  },

  // xG Statistics
  xg: {
    xGFor: {
      sources: ['xg_for', 'expected_goals_for', 'xgf'],
      default: 0,
    },
    xGAgainst: {
      sources: ['xg_against', 'expected_goals_against', 'xga'],
      default: 0,
    },
    xGDifference: {
      sources: ['xg_difference', 'xg_diff', 'xgd'],
      default: 0,
    },
  },
};

// Special field mappings that require context-aware resolution
const SpecialMappings = {
  // Fields that exist in additional_info object
  additionalInfoFields: [
    'team_with_most_corners_win_percentage_overall',
    'team_with_most_corners_win_percentage_home',
    'team_with_most_corners_win_percentage_away',
  ],

  // Fields that require suffix handling (overall/home/away)
  suffixFields: [
    'gamesPlayed',
    'wins',
    'draws',
    'losses',
    'points',
    'pointsPerGame',
    'goalsScored',
    'goalsConceded',
    'cleanSheets',
    'failedToScore',
    'failedToScorePercentage',
    'winPercentage',
    'totalCards',
    'yellowCards',
    'redCards',
    'cardsPerMatch',
    'cardsFor',
    'cardsAgainst',
    'cardsForPerMatch',
    'cardsAgainstPerMatch',
    'over05Cards',
    'over05CardsPercentage',
    'over15Cards',
    'over15CardsPercentage',
    'over25Cards',
    'over25CardsPercentage',
    'over35Cards',
    'over35CardsPercentage',
    'over45Cards',
    'over45CardsPercentage',
    'over55Cards',
    'over55CardsPercentage',
    'over65Cards',
    'over65CardsPercentage',
    'over15CardsFor',
    'over15CardsForPercentage',
    'over25CardsFor',
    'over25CardsForPercentage',
    'over35CardsFor',
    'over35CardsForPercentage',
    'over05CardsAgainst',
    'over05CardsAgainstPercentage',
    'over15CardsAgainst',
    'over15CardsAgainstPercentage',
    'over25CardsAgainst',
    'over25CardsAgainstPercentage',
    'firstHalfCards',
    'secondHalfCards',
    'firstHalfCardsFor',
    'secondHalfCardsFor',
    'firstHalfCardsAgainst',
    'secondHalfCardsAgainst',
    'cards1H_AVG',
    'cards2H_AVG',
    'cards1H_over05_percentage',
    'cards1H_over15_percentage',
    'cards1H_over25_percentage',
    'cards2H_over05_percentage',
    'cards2H_over15_percentage',
    'cards2H_over25_percentage',
    'cards1H_under2_percentage',
    'cards1H_2to3_percentage',
    'cards1H_over3_percentage',
    'cards2H_under2_percentage',
    'cards2H_2to3_percentage',
    'cards2H_over3_percentage',
    'winMostCornersPercentage',
    'over25CornersForPercentage',
    'over35CornersForPercentage',
    'over45CornersForPercentage',
    'over55CornersForPercentage',
    'over65CornersForPercentage',
    'over75CornersForPercentage',
    'over85CornersForPercentage',
    'over25CornersAgainstPercentage',
    'over35CornersAgainstPercentage',
    'over45CornersAgainstPercentage',
    'over55CornersAgainstPercentage',
    'over65CornersAgainstPercentage',
    'over75CornersAgainstPercentage',
    'over85CornersAgainstPercentage',
    'cornersFor',
    'cornersAgainst',
    'cornersForPerMatch',
    'cornersAgainstPerMatch',
  ],
};

module.exports = {
  TeamStatsSchema,
  SpecialMappings,
};
