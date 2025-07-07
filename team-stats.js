// Global variables
let globalStatistics = null;
let currentFilter = 'overall';
let currentCardsFilter = 'overall';
let currentXgFilter = 'overall';
let currentHalftimeFilter = 'overall';
let currentTimingFilter = 'overall';
let currentGoalTimingsFilter = 'overall';
let currentShotsFilter = 'overall';
let currentCornersFilter = 'overall';
let currentTeamCornersFilter = 'overall';
let currentTab = 'all';

// Tab functionality
window.showTab = function (tabName, event) {
  currentTab = tabName;

  // Update active tab button
  document.querySelectorAll('.tab-button').forEach(btn => {
    btn.classList.remove('active');
  });

  // If event exists, use it. Otherwise find the button by content
  if (event && event.target) {
    event.target.closest('.tab-button').classList.add('active');
  } else {
    // Find and activate the correct tab button
    document.querySelectorAll('.tab-button').forEach(btn => {
      if (
        btn.textContent.toLowerCase().includes(tabName) ||
        (tabName === 'all' && btn.textContent.includes('All Stats'))
      ) {
        btn.classList.add('active');
      }
    });
  }

  // Show/hide content based on tab
  document.body.setAttribute('data-active-tab', tabName);

  // Show/hide stat categories based on tab
  const categories = document.querySelectorAll('.stats-category');
  categories.forEach(category => {
    const categoryTab = category.getAttribute('data-tab');
    if (!categoryTab) {
      // If no data-tab attribute, show in all tabs
      category.style.display = 'block';
    } else if (tabName === 'all') {
      // In 'all' tab, only show categories that include 'all' in their data-tab
      if (categoryTab.includes('all')) {
        category.style.display = 'block';
      } else {
        category.style.display = 'none';
      }
    } else if (categoryTab.includes(tabName)) {
      // Show categories that include the tab name
      category.style.display = 'block';
    } else {
      category.style.display = 'none';
    }
  });

  // Hide/show entire sections based on tab
  const sections = document.querySelectorAll(
    '.main-stats-section, .filterable-section, .goal-timing, .match-list, .top-stats[data-tab]'
  );
  sections.forEach(section => {
    const sectionTab = section.getAttribute('data-tab');

    if (!sectionTab) {
      // If no data-tab attribute, hide in filtered tabs
      section.style.display = tabName === 'all' ? 'block' : 'none';
    } else if (sectionTab.includes(tabName)) {
      section.style.display = 'block';
    } else {
      section.style.display = 'none';
    }
  });
  
  // Special handling for Timing Analytics section
  const timingAnalytics = document.getElementById('timing-analytics-section');
  if (timingAnalytics) {
    timingAnalytics.style.display = tabName === 'goals' ? 'block' : 'none';
  }

  // Special handling for cards sections
  if (tabName === 'cards') {
    // Show only cards related statistics
    document.querySelectorAll('.stats-category').forEach(cat => {
      const title = cat.querySelector('.category-title')?.textContent.toLowerCase() || '';
      if (title.includes('card') || title.includes('disciplinary')) {
        cat.style.display = 'block';
      }
    });
  }

  // Update top stats based on active tab
  updateTopStatsForTab(tabName);

  // Update corner statistics when switching to corners tab
  if (tabName === 'corners' && globalStatistics) {
    updateCornerStatistics(globalStatistics, currentCornersFilter);
    updateTeamCornersStatistics(globalStatistics, currentTeamCornersFilter);
  }
  
  // Emit tab change event for modular system
  if (window.TeamStatsEventBus) {
    window.TeamStatsEventBus.emit('tab:change', tabName);
  }
};

// Function to update Goals tab statistics
function updateGoalsTabStatistics(statistics) {
  if (!statistics) {
    return;
  }

  // Get filter values - overall, home, away
  const filter = currentFilter;
  const isHome = filter === 'home';
  const isAway = filter === 'away';

  // Scored Per Game section
  const matches = isHome
    ? statistics.homeMatches
    : (isAway ? statistics.awayMatches : statistics.totalMatches) || 0;
  const goalsScored = isHome
    ? statistics.homeGoalsFor
    : (isAway ? statistics.awayGoalsFor : statistics.goalsFor) || 0;
  const scoredPerMatch = isHome
    ? statistics.homeGoalsForPerMatch
    : (isAway ? statistics.awayGoalsForPerMatch : statistics.goalsForPerMatch) || 0;

  // Update scoredPerMatch in both places
  updateElementText('scoredPerMatch', scoredPerMatch ? scoredPerMatch.toFixed(2) : '0.00');

  // Minutes per goal - only if goals > 0
  const minutesPerGoal = goalsScored > 0 ? Math.round((matches * 90) / goalsScored) : 0;
  updateElementText('minutesPerGoal', minutesPerGoal > 0 ? `${minutesPerGoal} min` : 'N/A');

  // Scored Over X.5 FT - from API
  const scoredOver05 = isHome
    ? statistics.seasonScoredOver05Percentage_home
    : (isAway
        ? statistics.seasonScoredOver05Percentage_away
        : statistics.seasonScoredOver05Percentage_overall) || 0;
  const scoredOver15 = isHome
    ? statistics.seasonScoredOver15Percentage_home
    : (isAway
        ? statistics.seasonScoredOver15Percentage_away
        : statistics.seasonScoredOver15Percentage_overall) || 0;
  const scoredOver25 = isHome
    ? statistics.seasonScoredOver25Percentage_home
    : (isAway
        ? statistics.seasonScoredOver25Percentage_away
        : statistics.seasonScoredOver25Percentage_overall) || 0;

  updateElementText('scoredOver05', `${scoredOver05}%`);
  updateElementText('scoredOver15', `${scoredOver15}%`);
  updateElementText('scoredOver25', `${scoredOver25}%`);

  // Scored in both halves
  const scoredBothHalves = isHome
    ? statistics.scoredBothHalvesPercentage_home
    : (isAway
        ? statistics.scoredBothHalvesPercentage_away
        : statistics.scoredBothHalvesPercentage_overall) || 0;
  updateElementText('scoredBothHalves', `${scoredBothHalves}%`);
  updateElementText('scoredBothHalves2', `${scoredBothHalves}%`); // Second instance

  // First to score
  const firstToScore = isHome
    ? statistics.firstGoalScoredPercentage_home
    : (isAway
        ? statistics.firstGoalScoredPercentage_away
        : statistics.firstGoalScoredPercentage_overall) || 0;
  updateElementText('firstToScore', `${firstToScore}%`);

  // Failed to score
  const failedToScore = isHome
    ? statistics.homeFailedToScorePercentage
    : (isAway ? statistics.awayFailedToScorePercentage : statistics.failedToScorePercentage) || 0;
  updateElementText('failedToScoreGoals', `${failedToScore}%`);

  // Highest scored
  let highestScored;
  if (isHome) {
    highestScored = statistics.seasonHighestScored_home || 0;
  } else if (isAway) {
    highestScored = statistics.seasonHighestScored_away || 0;
  } else {
    // Overall durumu için home ve away değerlerinden en yükseğini al
    const homeHighest = statistics.seasonHighestScored_home || 0;
    const awayHighest = statistics.seasonHighestScored_away || 0;
    highestScored = Math.max(homeHighest, awayHighest);
  }
  updateElementText('highestScored', `${highestScored} Goals`);

  // Penalties
  const penaltiesWon = isHome
    ? statistics.homePenaltiesWon
    : (isAway ? statistics.awayPenaltiesWon : statistics.penaltiesWon) || 0;
  const penaltiesConceded = isHome
    ? statistics.homePenaltiesConceded
    : (isAway ? statistics.awayPenaltiesConceded : statistics.penaltiesConceded) || 0;
  updateElementText('penaltiesWonGoals', `${penaltiesWon} in ${matches}`);
  updateElementText('penaltiesConcededGoals', `${penaltiesConceded} in ${matches}`);

  // Penalty in a match percentage
  const penaltyInMatch = isHome
    ? statistics.penalty_in_a_match_percentage_home
    : (isAway
        ? statistics.penalty_in_a_match_percentage_away
        : statistics.penalty_in_a_match_percentage_overall) || 0;
  updateElementText('penaltyInMatch', `${penaltyInMatch}%`);

  // Scored 1st/2nd Half section
  const scoredAvg1H = isHome
    ? statistics.scoredAVGHT_home
    : (isAway ? statistics.scoredAVGHT_away : statistics.scoredAVGHT_overall) || 0;
  const scoredAvg2H = isHome
    ? statistics.scored_2hg_avg_home
    : (isAway ? statistics.scored_2hg_avg_away : statistics.scored_2hg_avg_overall) || 0;

  updateElementText('scoredAvg1H', scoredAvg1H ? scoredAvg1H.toFixed(2) : '0.00');
  updateElementText('scoredAvg2H', scoredAvg2H ? scoredAvg2H.toFixed(2) : '0.00');

  // Scored in half percentages
  // 1st Half - Direkt FTS'den hesapla (scoredPercentageHT genelde 0 geliyor)
  const fts1H = isHome
    ? statistics.seasonFTSPercentageHT_home || 0
    : isAway
      ? statistics.seasonFTSPercentageHT_away || 0
      : statistics.seasonFTSPercentageHT_overall || 0;
  const scoredIn1H = 100 - fts1H;

  // 2nd Half - FTS değerlerinden hesapla
  let fts2H = null;
  let scoredIn2H = null;

  // API'de bu alanlar yoksa null bırak
  if (isHome) {
    fts2H = statistics.fts_2hg_percentage_home;
  } else if (isAway) {
    fts2H = statistics.fts_2hg_percentage_away;
  } else {
    fts2H = statistics.fts_2hg_percentage_overall;
  }

  // FTS değeri varsa scored'ı hesapla
  if (fts2H !== null && fts2H !== undefined) {
    scoredIn2H = 100 - fts2H;
  }

  updateElementText('scoredIn1H', `${scoredIn1H}%`);
  updateElementText('scoredIn2H', scoredIn2H !== null ? `${scoredIn2H}%` : 'N/A');

  // Failed to score in halves
  const failedToScore1H = isHome
    ? statistics.seasonFTSPercentageHT_home
    : (isAway ? statistics.seasonFTSPercentageHT_away : statistics.seasonFTSPercentageHT_overall) ||
      0;
  const failedToScore2H = fts2H; // FTS 2HG değeri direkt olarak failed to score 2H'yi verir

  updateElementText('failedToScore1H', `${failedToScore1H}%`);
  updateElementText(
    'failedToScore2H',
    failedToScore2H !== null && failedToScore2H !== undefined ? `${failedToScore2H}%` : 'N/A'
  );

  // Goals in halves - directly from API
  // Use scoredGoalsHT_overall for 1H goals
  const goalsScored1H = isHome
    ? statistics.scoredGoalsHT_home || statistics.scored1HG_home
    : (isAway
        ? statistics.scoredGoalsHT_away || statistics.scored1HG_away
        : statistics.scoredGoalsHT_overall || statistics.scored1HG_overall) || 0;
  // Use scored_2hg_overall for 2H goals
  const goalsScored2H = isHome
    ? statistics.scored_2hg_home || statistics.scored2HG_home
    : (isAway
        ? statistics.scored_2hg_away || statistics.scored2HG_away
        : statistics.scored_2hg_overall || statistics.scored2HG_overall) || 0;

  updateElementText('goals1HScored', `${goalsScored1H} in ${matches}`);
  updateElementText('goals2HScored', `${goalsScored2H} in ${matches}`);

  // CONCEDED SECTION
  // Conceded Per Game section
  const goalsConceded = isHome
    ? statistics.homeGoalsAgainst
    : (isAway ? statistics.awayGoalsAgainst : statistics.goalsAgainst) || 0;
  // Use seasonConcededAVG_overall for conceded per match
  const concededPerMatch = isHome
    ? statistics.seasonConcededAVG_home || statistics.homeGoalsAgainstPerMatch
    : (isAway
        ? statistics.seasonConcededAVG_away || statistics.awayGoalsAgainstPerMatch
        : statistics.seasonConcededAVG_overall || statistics.goalsAgainstPerMatch) || 0;

  // Update both concededPerMatch elements - top card and stats section
  updateElementText('concededPerMatch', concededPerMatch ? concededPerMatch.toFixed(2) : '0.00'); // Top card
  updateElementText(
    'concededPerMatchStats',
    concededPerMatch ? concededPerMatch.toFixed(2) : '0.00'
  ); // Stats section

  // Update Conceded top cards
  updateElementText(
    'concededPerMatchCard',
    concededPerMatch ? concededPerMatch.toFixed(2) : '0.00'
  );

  // Minutes per goal conceded - only if goals > 0
  const minutesPerGoalConceded = goalsConceded > 0 ? Math.round((matches * 90) / goalsConceded) : 0;
  updateElementText(
    'minutesPerGoalConceded',
    minutesPerGoalConceded > 0 ? `${minutesPerGoalConceded} min` : 'N/A'
  );

  // Conceded Over X.5 FT - from API
  const concededOver05 = isHome
    ? statistics.seasonConcededOver05Percentage_home
    : (isAway
        ? statistics.seasonConcededOver05Percentage_away
        : statistics.seasonConcededOver05Percentage_overall) || 0;
  const concededOver15 = isHome
    ? statistics.seasonConcededOver15Percentage_home
    : (isAway
        ? statistics.seasonConcededOver15Percentage_away
        : statistics.seasonConcededOver15Percentage_overall) || 0;
  const concededOver25 = isHome
    ? statistics.seasonConcededOver25Percentage_home
    : (isAway
        ? statistics.seasonConcededOver25Percentage_away
        : statistics.seasonConcededOver25Percentage_overall) || 0;

  updateElementText('concededOver05', `${concededOver05}%`);
  updateElementText('concededOver15', `${concededOver15}%`);
  updateElementText('concededOver25', `${concededOver25}%`);

  // Clean sheets
  const cleanSheetsPercentage = isHome
    ? statistics.cleanSheetPercentage_home
    : (isAway ? statistics.cleanSheetPercentage_away : statistics.cleanSheetPercentage_overall) ||
      0;
  updateElementText('cleanSheetsGoals', `${cleanSheetsPercentage}%`);

  // Highest conceded
  let highestConceded;
  if (isHome) {
    highestConceded = statistics.seasonHighestConceded_home || 0;
  } else if (isAway) {
    highestConceded = statistics.seasonHighestConceded_away || 0;
  } else {
    // Overall durumu için home ve away değerlerinden en yükseğini al
    const homeHighest = statistics.seasonHighestConceded_home || 0;
    const awayHighest = statistics.seasonHighestConceded_away || 0;
    highestConceded = Math.max(homeHighest, awayHighest);
  }
  updateElementText('highestConceded', `${highestConceded} Goals`);

  // Conceded 1st/2nd Half section
  const concededAvg1H = isHome
    ? statistics.concededAVGHT_home
    : (isAway ? statistics.concededAVGHT_away : statistics.concededAVGHT_overall) || 0;
  const concededAvg2H = isHome
    ? statistics.conceded_2hg_avg_home
    : (isAway ? statistics.conceded_2hg_avg_away : statistics.conceded_2hg_avg_overall) || 0;

  updateElementText('concededAvg1H', concededAvg1H ? concededAvg1H.toFixed(2) : '0.00');
  updateElementText('concededAvg2H', concededAvg2H ? concededAvg2H.toFixed(2) : '0.00');

  // Update Conceded half cards
  updateElementText('concededAvg1HCard', concededAvg1H || '0.00');
  updateElementText('concededAvg2HCard', concededAvg2H || '0.00');

  // Clean sheet in halves - get from API first
  const cleanSheet1HPercentage = isHome
    ? statistics.seasonCSPercentageHT_home || statistics.seasonCSHT_home
    : (isAway
        ? statistics.seasonCSPercentageHT_away || statistics.seasonCSHT_away
        : statistics.seasonCSPercentageHT_overall || statistics.seasonCSHT_overall) || 0;

  const cleanSheet2HPercentage = isHome
    ? statistics.cs_2hg_percentage_home || statistics.seasonCS2H_home
    : (isAway
        ? statistics.cs_2hg_percentage_away || statistics.seasonCS2H_away
        : statistics.cs_2hg_percentage_overall || statistics.seasonCS2H_overall) || 0;

  // Clean sheet percentages verified

  // Conceded in half percentages - calculate from clean sheet percentages
  const conceded1HPercentage = 100 - cleanSheet1HPercentage;
  const conceded2HPercentage = cleanSheet2HPercentage ? 100 - cleanSheet2HPercentage : null;

  updateElementText('concededIn1H', `${conceded1HPercentage}%`);
  updateElementText(
    'concededIn2H',
    conceded2HPercentage !== null ? `${conceded2HPercentage}%` : 'N/A'
  );

  updateElementText('cleanSheet1H', `${cleanSheet1HPercentage}%`);
  updateElementText('cleanSheet2H', `${cleanSheet2HPercentage}%`);

  // Goals conceded in halves - directly from API
  // Use concededGoalsHT_overall for 1H goals conceded
  const goalsConceded1H = isHome
    ? statistics.concededGoalsHT_home || statistics.conceded1HG_home
    : (isAway
        ? statistics.concededGoalsHT_away || statistics.conceded1HG_away
        : statistics.concededGoalsHT_overall || statistics.conceded1HG_overall) || 0;
  // Use conceded_2hg_overall for 2H goals conceded
  const goalsConceded2H = isHome
    ? statistics.conceded_2hg_home || statistics.conceded2HG_home
    : (isAway
        ? statistics.conceded_2hg_away || statistics.conceded2HG_away
        : statistics.conceded_2hg_overall || statistics.conceded2HG_overall) || 0;

  updateElementText('goals1HConceded', `${goalsConceded1H} in ${matches}`);
  updateElementText('goals2HConceded', `${goalsConceded2H} in ${matches}`);

  // OVER/UNDER GOALS SECTION
  // Use the Over/Under specific filter
  const ouFilter = currentOverUnderFilter || 'overall';
  const isOUHome = ouFilter === 'home';
  const isOUAway = ouFilter === 'away';

  // Match Goals Average calculations
  const matchGoalsAvgFT = isOUHome
    ? ((statistics.homeGoalsFor || 0) + (statistics.homeGoalsAgainst || 0)) /
      (statistics.homeMatches || 1)
    : isOUAway
      ? ((statistics.awayGoalsFor || 0) + (statistics.awayGoalsAgainst || 0)) /
        (statistics.awayMatches || 1)
      : statistics.avgMatchGoals || 0;

  updateElementText('matchGoalsAvgFT', matchGoalsAvgFT ? matchGoalsAvgFT.toFixed(2) : '0.00');

  // Full Time Over/Under
  const over05FT = isOUHome
    ? statistics.seasonScoredOver05Percentage_home
    : (isOUAway
        ? statistics.seasonScoredOver05Percentage_away
        : statistics.seasonScoredOver05Percentage_overall) || 0;
  const over15FT = isOUHome
    ? statistics.homeOver15GoalsPercentage
    : (isOUAway ? statistics.awayOver15GoalsPercentage : statistics.over15GoalsPercentage) || 0;
  const over25FT = isOUHome
    ? statistics.homeOver25GoalsPercentage
    : (isOUAway ? statistics.awayOver25GoalsPercentage : statistics.over25GoalsPercentage) || 0;
  const over35FT = isOUHome
    ? statistics.homeOver35GoalsPercentage
    : (isOUAway ? statistics.awayOver35GoalsPercentage : statistics.over35GoalsPercentage) || 0;
  const over45FT = isOUHome
    ? statistics.homeOver45GoalsPercentage
    : (isOUAway ? statistics.awayOver45GoalsPercentage : statistics.over45GoalsPercentage) || 0;

  updateElementText('over05FT', `${over05FT}%`);
  updateElementText('over15FT', `${over15FT}%`);
  updateElementText('over25FT', `${over25FT}%`);
  updateElementText('over35FT', `${over35FT}%`);
  updateElementText('over45FT', `${over45FT}%`);

  // Under values are 100 - Over values
  updateElementText('under05FT', `${100 - over05FT}%`);
  updateElementText('under15FT', `${100 - over15FT}%`);
  updateElementText('under25FT', `${100 - over25FT}%`);
  updateElementText('under35FT', `${100 - over35FT}%`);
  updateElementText('under45FT', `${100 - over45FT}%`);

  // 1st Half Match Goals Average
  const scoredAvg1HForAvg = isOUHome
    ? statistics.scoredAVGHT_home || 0
    : isOUAway
      ? statistics.scoredAVGHT_away || 0
      : statistics.scoredAVGHT_overall || 0;
  const concededAvg1HForAvg = isOUHome
    ? statistics.concededAVGHT_home || 0
    : isOUAway
      ? statistics.concededAVGHT_away || 0
      : statistics.concededAVGHT_overall || 0;
  const matchGoalsAvgHT = scoredAvg1HForAvg + concededAvg1HForAvg;

  updateElementText('matchGoalsAvgHT', matchGoalsAvgHT ? matchGoalsAvgHT.toFixed(2) : '0.00');

  // 1st Half Over/Under
  const over05HT = isOUHome
    ? statistics.seasonOver05PercentageHT_home
    : (isOUAway
        ? statistics.seasonOver05PercentageHT_away
        : statistics.seasonOver05PercentageHT_overall) || 0;
  const over15HT = isOUHome
    ? statistics.seasonOver15PercentageHT_home
    : (isOUAway
        ? statistics.seasonOver15PercentageHT_away
        : statistics.seasonOver15PercentageHT_overall) || 0;
  const over25HT = isOUHome
    ? statistics.seasonOver25PercentageHT_home
    : (isOUAway
        ? statistics.seasonOver25PercentageHT_away
        : statistics.seasonOver25PercentageHT_overall) || 0;

  updateElementText('over05HT', `${over05HT}%`);
  updateElementText('over15HT', `${over15HT}%`);
  updateElementText('over25HT', `${over25HT}%`);

  // Under values for 1st Half
  updateElementText('under05HT', `${100 - over05HT}%`);
  updateElementText('under15HT', `${100 - over15HT}%`);
  updateElementText('under25HT', `${100 - over25HT}%`);

  // 2nd Half Match Goals Average
  const scoredAvg2HForAvg = isOUHome
    ? statistics.scored_2hg_avg_home || 0
    : isOUAway
      ? statistics.scored_2hg_avg_away || 0
      : statistics.scored_2hg_avg_overall || 0;
  const concededAvg2HForAvg = isOUHome
    ? statistics.conceded_2hg_avg_home || 0
    : isOUAway
      ? statistics.conceded_2hg_avg_away || 0
      : statistics.conceded_2hg_avg_overall || 0;
  const matchGoalsAvg2H = scoredAvg2HForAvg + concededAvg2HForAvg;

  updateElementText('matchGoalsAvg2H', matchGoalsAvg2H ? matchGoalsAvg2H.toFixed(2) : '0.00');

  // 2nd Half Over/Under
  const over052H = isOUHome
    ? statistics.over05_2hg_percentage_home
    : (isOUAway
        ? statistics.over05_2hg_percentage_away
        : statistics.over05_2hg_percentage_overall) || 0;
  const over152H = isOUHome
    ? statistics.over15_2hg_percentage_home
    : (isOUAway
        ? statistics.over15_2hg_percentage_away
        : statistics.over15_2hg_percentage_overall) || 0;
  const over252H = isOUHome
    ? statistics.over25_2hg_percentage_home
    : (isOUAway
        ? statistics.over25_2hg_percentage_away
        : statistics.over25_2hg_percentage_overall) || 0;

  updateElementText('over052H', `${over052H}%`);
  updateElementText('over152H', `${over152H}%`);
  updateElementText('over252H', `${over252H}%`);

  // Under values for 2nd Half
  updateElementText('under052H', `${100 - over052H}%`);
  updateElementText('under152H', `${100 - over152H}%`);
  updateElementText('under252H', `${100 - over252H}%`);

  // Additional Conceded fields that might be missing
  // Failed to keep clean sheet stats (opposite of clean sheets)
  // These calculations are kept for potential future use
  // const failedCleanSheet1H = 100 - cleanSheet1HPercentage;
  // const failedCleanSheet2H = conceded2HPercentage;

  // BOTH TEAMS TO SCORE (BTTS) SECTION
  // Use the BTTS specific filter
  const bttsFilter = currentBTTSFilter || 'overall';
  const isBTTSHome = bttsFilter === 'home';
  const isBTTSAway = bttsFilter === 'away';

  // Full Match BTTS
  const bttsPercentage = isBTTSHome
    ? statistics.homeBothTeamsScoredPercentage
    : (isBTTSAway
        ? statistics.awayBothTeamsScoredPercentage
        : statistics.bothTeamsScoredPercentage) || 0;
  const bttsAndWin = isBTTSHome
    ? statistics.homeBttsAndWinPercentage
    : (isBTTSAway ? statistics.awayBttsAndWinPercentage : statistics.bttsAndWinPercentage) || 0;
  const bttsAndDraw = isBTTSHome
    ? statistics.homeBttsAndDrawPercentage
    : (isBTTSAway ? statistics.awayBttsAndDrawPercentage : statistics.bttsAndDrawPercentage) || 0;
  const bttsAndLose = isBTTSHome
    ? statistics.homeBttsAndLosePercentage
    : (isBTTSAway ? statistics.awayBttsAndLosePercentage : statistics.bttsAndLosePercentage) || 0;

  updateElementText('bttsPercentage', `${bttsPercentage}%`);
  updateElementText('bttsAndWin', `${bttsAndWin}%`);
  updateElementText('bttsAndDraw', `${bttsAndDraw}%`);
  updateElementText('bttsAndLose', `${bttsAndLose}%`);
  // BTTS & Over 2.5
  const bttsAndOver25 = isBTTSHome
    ? statistics.over25_and_btts_percentage_home
    : (isBTTSAway
        ? statistics.over25_and_btts_percentage_away
        : statistics.over25_and_btts_percentage_overall) || 0;
  updateElementText('bttsAndOver25', `${bttsAndOver25}%`);

  // BTTS 1H & 2H combinations
  const btts1H2HYesYes = isBTTSHome
    ? statistics.btts_1h2h_yes_yes_percentage_home
    : (isBTTSAway
        ? statistics.btts_1h2h_yes_yes_percentage_away
        : statistics.btts_1h2h_yes_yes_percentage_overall) || 0;
  const btts1H2HYesNo = isBTTSHome
    ? statistics.btts_1h2h_yes_no_percentage_home
    : (isBTTSAway
        ? statistics.btts_1h2h_yes_no_percentage_away
        : statistics.btts_1h2h_yes_no_percentage_overall) || 0;
  const btts1H2HNoYes = isBTTSHome
    ? statistics.btts_1h2h_no_yes_percentage_home
    : (isBTTSAway
        ? statistics.btts_1h2h_no_yes_percentage_away
        : statistics.btts_1h2h_no_yes_percentage_overall) || 0;
  const btts1H2HNoNo = isBTTSHome
    ? statistics.btts_1h2h_no_no_percentage_home
    : (isBTTSAway
        ? statistics.btts_1h2h_no_no_percentage_away
        : statistics.btts_1h2h_no_no_percentage_overall) || 0;

  updateElementText('btts1H2HYesYes', `${btts1H2HYesYes}%`);
  updateElementText('btts1H2HYesNo', `${btts1H2HYesNo}%`);
  updateElementText('btts1H2HNoYes', `${btts1H2HNoYes}%`);
  updateElementText('btts1H2HNoNo', `${btts1H2HNoNo}%`);

  updateElementText('noBtts', `${100 - bttsPercentage}%`);

  // 1st Half BTTS
  const bttsPercentageHT = isBTTSHome
    ? statistics.seasonBTTSPercentageHT_home
    : (isBTTSAway
        ? statistics.seasonBTTSPercentageHT_away
        : statistics.seasonBTTSPercentageHT_overall) || 0;
  const bttsMatchesHT = isBTTSHome
    ? statistics.seasonBTTSHT_home
    : (isBTTSAway ? statistics.seasonBTTSHT_away : statistics.seasonBTTSHT_overall) || 0;
  const matchesForBTTS = isBTTSHome
    ? statistics.homeMatches
    : (isBTTSAway ? statistics.awayMatches : statistics.totalMatches) || 0;

  updateElementText('bttsPercentageHT', `${bttsPercentageHT}%`);
  updateElementText('bttsMatchesHT', `${bttsMatchesHT} in ${matchesForBTTS}`);
  updateElementText('noBttsHT', `${100 - bttsPercentageHT}%`);

  // 2nd Half BTTS
  const bttsPercentage2H = isBTTSHome
    ? statistics.btts_2hg_percentage_home
    : (isBTTSAway ? statistics.btts_2hg_percentage_away : statistics.btts_2hg_percentage_overall) ||
      0;

  updateElementText('bttsPercentage2H', `${bttsPercentage2H}%`);
  updateElementText('noBtts2H', `${100 - bttsPercentage2H}%`);

  // Goal Timings by 15 minutes
  updateGoalTimingBars(statistics);

  // Shots, xG & Offsides
  updateShotsStatistics(statistics);

  // Common Scorelines and Exact Goals

  // BTTS Trends
  const teamScored =
    100 -
    (isBTTSHome
      ? statistics.homeFailedToScorePercentage
      : (isBTTSAway
          ? statistics.awayFailedToScorePercentage
          : statistics.failedToScorePercentage) || 0);
  const teamFailedToScore = isBTTSHome
    ? statistics.homeFailedToScorePercentage
    : (isBTTSAway ? statistics.awayFailedToScorePercentage : statistics.failedToScorePercentage) ||
      0;
  const cleanSheets = isBTTSHome
    ? statistics.cleanSheetPercentage_home
    : (isBTTSAway
        ? statistics.cleanSheetPercentage_away
        : statistics.cleanSheetPercentage_overall) || 0;
  const opponentScored = 100 - cleanSheets;

  updateElementText('teamScored', `${teamScored}%`);
  updateElementText('teamFailedToScore', `${teamFailedToScore}%`);
  updateElementText('opponentScored', `${opponentScored}%`);
  updateElementText('cleanSheetsBTTS', `${cleanSheets}%`);
}

// Function to update top stats based on active tab
function updateTopStatsForTab(tabName) {
  if (!globalStatistics) {
    return;
  }

  const ppgElement = document.querySelector('.top-stats .top-stat-card:nth-child(1)');
  const scoredElement = document.querySelector('.top-stats .top-stat-card:nth-child(2)');
  const concededElement = document.querySelector('.top-stats .top-stat-card:nth-child(3)');

  if (tabName === 'goals') {
    // Update labels and values for Goals tab - make it Scored focused
    ppgElement.querySelector('.label').textContent = 'Scored / Match';
    ppgElement.querySelector('h3').textContent =
      globalStatistics.goalsForPerMatch || globalStatistics.seasonScoredAVG_overall || '0.00';

    // Hide form display and performance text in Goals tab
    const formDisplay = ppgElement.querySelector('.form-display');
    const perfText = ppgElement.querySelector('.performance-text');
    if (formDisplay) {
      formDisplay.style.display = 'none';
    }
    if (perfText) {
      perfText.style.display = 'none';
    }

    scoredElement.querySelector('.label').textContent = '1st Half Scored';
    scoredElement.querySelector('h3').textContent = globalStatistics.scoredAVGHT_overall || '0.00';

    concededElement.querySelector('.label').textContent = '2nd Half Scored';
    concededElement.querySelector('h3').textContent =
      globalStatistics.scored_2hg_avg_overall || '0.00';
  } else if (tabName === 'corners') {
    // Update labels and values for Corners tab
    ppgElement.querySelector('.label').textContent = 'Corners / Match';
    ppgElement.querySelector('h3').textContent = globalStatistics.cornersAVG || '0.00';

    // Hide form display and performance text in Corners tab
    const formDisplay = ppgElement.querySelector('.form-display');
    const perfText = ppgElement.querySelector('.performance-text');
    if (formDisplay) {
      formDisplay.style.display = 'none';
    }
    if (perfText) {
      perfText.style.display = 'none';
    }

    scoredElement.querySelector('.label').textContent = 'Corners Against / Match';
    scoredElement.querySelector('h3').textContent = globalStatistics.cornersAgainstAVG || '0.00';

    // Hide performance text in second card
    const scoredPerfText = scoredElement.querySelector('.performance-text');
    if (scoredPerfText) {
      scoredPerfText.style.display = 'none';
    }

    concededElement.querySelector('.label').textContent = 'Total Corners / Match';
    concededElement.querySelector('h3').textContent = globalStatistics.cornersTotalAVG || '0.00';

    // Hide performance text in third card
    const concededPerfText = concededElement.querySelector('.performance-text');
    if (concededPerfText) {
      concededPerfText.style.display = 'none';
    }
  } else if (tabName === 'cards') {
    // Update labels and values for Cards tab
    ppgElement.querySelector('.label').textContent = 'Cards / Match';
    ppgElement.querySelector('h3').textContent = globalStatistics.cardsPerMatch || '0.00';

    // Hide form display and performance text in Cards tab
    const formDisplay = ppgElement.querySelector('.form-display');
    const perfText = ppgElement.querySelector('.performance-text');
    if (formDisplay) {
      formDisplay.style.display = 'none';
    }
    if (perfText) {
      perfText.style.display = 'none';
    }

    scoredElement.querySelector('.label').textContent = 'Match Cards AVG 1H';
    scoredElement.querySelector('h3').textContent =
      globalStatistics.cards1H_AVG || globalStatistics.cards1H_AVG_overall || '0.00';

    // Hide performance text in second card
    const scoredPerfText = scoredElement.querySelector('.performance-text');
    if (scoredPerfText) {
      scoredPerfText.style.display = 'none';
    }

    concededElement.querySelector('.label').textContent = 'Match Cards AVG 2H';
    concededElement.querySelector('h3').textContent =
      globalStatistics.cards2H_AVG || globalStatistics.cards2H_AVG_overall || '0.00';

    // Hide performance text in third card
    const concededPerfText = concededElement.querySelector('.performance-text');
    if (concededPerfText) {
      concededPerfText.style.display = 'none';
    }
  } else {
    // Restore original labels and values for other tabs
    ppgElement.querySelector('.label').textContent = 'Points Per Game';
    ppgElement.querySelector('h3').textContent = globalStatistics.pointsPerGame || '0.00';

    // Show form display and performance text in other tabs
    const formDisplay = ppgElement.querySelector('.form-display');
    const perfText = ppgElement.querySelector('.performance-text');
    if (formDisplay) {
      formDisplay.style.display = 'flex';
    }
    if (perfText) {
      perfText.style.display = 'block';
    }

    scoredElement.querySelector('.label').textContent = 'Scored / Match';
    scoredElement.querySelector('h3').textContent =
      globalStatistics.goalsForPerMatch || globalStatistics.seasonScoredAVG_overall || '0.00';

    // Show performance text in second card
    const scoredPerfText = scoredElement.querySelector('.performance-text');
    if (scoredPerfText) {
      scoredPerfText.style.display = 'block';
    }

    concededElement.querySelector('.label').textContent = 'Conceded / Match';
    concededElement.querySelector('h3').textContent =
      globalStatistics.goalsAgainstPerMatch || globalStatistics.seasonConcededAVG_overall || '0.00';

    // Show performance text in third card
    const concededPerfText = concededElement.querySelector('.performance-text');
    if (concededPerfText) {
      concededPerfText.style.display = 'block';
    }
  }
}

// Get team ID from URL parameter
// NOTE: This is now handled in DOMContentLoaded to ensure modules are loaded
// const urlParams = new URLSearchParams(window.location.search);
// const teamId = urlParams.get('teamId');

// if (teamId) {
//   loadTeamData(teamId);
// }

async function loadTeamData(teamId) {
  try {
    // Use API Client instead of direct fetch
    const result = await TeamStatsAPIClient.getTeamData(teamId);
    
    // API Client returns the data directly (success is handled internally)
    displayDetailedTeamData(result);
  } catch (error) {
    console.error('Error loading team data:', error);
    // Show error in loading section if error section doesn't exist
    const errorSection = document.getElementById('errorSection');
    if (errorSection) {
      errorSection.style.display = 'block';
      errorSection.textContent = `Hata: ${error.message}`;
    } else {
      const loadingSection = document.getElementById('loadingSection');
      if (loadingSection) {
        loadingSection.innerHTML = `<p style="color: red;">Hata: ${error.message}</p>`;
      }
    }
    document.getElementById('loadingSection').style.display = 'none';
  }
}

// Helper function to safely set element content
function safeSetContent(elementId, content) {
  const element = document.getElementById(elementId);
  if (element) {
    element.textContent = content;
  } else {
    console.warn(`Element with ID '${elementId}' not found`);
  }
}

// Alias for safeSetContent for backward compatibility
function updateElementText(elementId, content) {
  safeSetContent(elementId, content);
}

// Filter functions
window.setMainFilter = function (filter) {
  currentFilter = filter;

  // Update all section filter appearances
  document.querySelectorAll('.section-filter').forEach(tab => {
    if (
      tab.textContent.toLowerCase().includes(filter) ||
      (filter === 'overall' && tab.textContent === 'Overall') ||
      (filter === 'home' && tab.textContent === 'At Home') ||
      (filter === 'away' && tab.textContent === 'At Away')
    ) {
      tab.classList.add('active');
    } else {
      tab.classList.remove('active');
    }
  });

  // Update statistics if data is loaded
  if (globalStatistics) {
    // Update all statistics with new filter
    updateStatisticsWithFilter(globalStatistics, filter);

    // Update Goals tab if it's active
    if (currentTab === 'goals') {
      updateGoalsTabStatistics(globalStatistics);
    }
  }
};

// Over/Under filter
let currentOverUnderFilter = 'overall';

window.setOverUnderFilter = function (filter) {
  currentOverUnderFilter = filter;

  // Update filter tabs appearance
  document.querySelectorAll('.section-filters button').forEach(tab => {
    const parent = tab.closest('.filterable-section');
    if (
      parent &&
      parent.querySelector('.section-title')?.textContent.includes('Over / Under Goals')
    ) {
      if (
        tab.textContent.toLowerCase().includes(filter) ||
        (filter === 'overall' && tab.textContent === 'Overall') ||
        (filter === 'home' && tab.textContent === 'At Home') ||
        (filter === 'away' && tab.textContent === 'At Away')
      ) {
        tab.classList.add('active');
      } else {
        tab.classList.remove('active');
      }
    }
  });

  // Update Over/Under statistics
  if (globalStatistics) {
    updateGoalsTabStatistics(globalStatistics);
  }
};

// BTTS filter
let currentBTTSFilter = 'overall';

window.setBTTSFilter = function (filter) {
  currentBTTSFilter = filter;

  // Update filter tabs appearance
  document.querySelectorAll('.section-filters button').forEach(tab => {
    const parent = tab.closest('.filterable-section');
    if (
      parent &&
      parent.querySelector('.section-title')?.textContent.includes('Both Teams To Score')
    ) {
      if (
        tab.textContent.toLowerCase().includes(filter) ||
        (filter === 'overall' && tab.textContent === 'Overall') ||
        (filter === 'home' && tab.textContent === 'At Home') ||
        (filter === 'away' && tab.textContent === 'At Away')
      ) {
        tab.classList.add('active');
      } else {
        tab.classList.remove('active');
      }
    }
  });

  // Update BTTS statistics
  if (globalStatistics) {
    updateGoalsTabStatistics(globalStatistics);
  }
};

// Goal Timings filter
window.setGoalTimingsFilter = function (filter) {
  currentGoalTimingsFilter = filter;

  // Update filter tabs appearance
  document.querySelectorAll('.section-filters button').forEach(tab => {
    const parent = tab.closest('.filterable-section');
    if (
      parent &&
      parent.querySelector('.section-title')?.textContent.includes('Goal Timings by 15 Minutes')
    ) {
      if (
        tab.textContent.toLowerCase().includes(filter) ||
        (filter === 'overall' && tab.textContent === 'Overall') ||
        (filter === 'home' && tab.textContent === 'At Home') ||
        (filter === 'away' && tab.textContent === 'At Away')
      ) {
        tab.classList.add('active');
      } else {
        tab.classList.remove('active');
      }
    }
  });

  // Update Goal Timings statistics
  if (globalStatistics) {
    updateGoalTimingBars(globalStatistics);
  }
};

// Shots filter
window.setShotsFilter = function (filter) {
  currentShotsFilter = filter;

  // Update filter tabs appearance
  document.querySelectorAll('.section-filters button').forEach(tab => {
    const parent = tab.closest('.filterable-section');
    if (
      parent &&
      parent.querySelector('.section-title')?.textContent.includes('Shots, xG & Offsides')
    ) {
      if (
        tab.textContent.toLowerCase().includes(filter) ||
        (filter === 'overall' && tab.textContent === 'Overall') ||
        (filter === 'home' && tab.textContent === 'At Home') ||
        (filter === 'away' && tab.textContent === 'At Away')
      ) {
        tab.classList.add('active');
      } else {
        tab.classList.remove('active');
      }
    }
  });

  // Update Shots statistics
  if (globalStatistics) {
    updateShotsStatistics(globalStatistics);
  }
};

function getFilteredStats(statistics, filter) {
  // Return filtered stats based on the selected filter
  if (filter === 'home') {
    // Calculate home-specific stats from available data
    const homeMatches = statistics.homeMatches || 0;
    const homeGoalsFor = statistics.homeGoalsFor || 0;
    const homeGoalsAgainst = statistics.homeGoalsAgainst || 0;
    const homeWins = statistics.homeWins || 0;
    const homeDraws = statistics.homeDraws || 0;
    const homeLosses = statistics.homeLosses || 0;

    return {
      matches: homeMatches,
      winPercentage:
        statistics.homeWinPercentage ||
        (homeMatches > 0 ? Math.round((homeWins / homeMatches) * 100) : 0),
      drawPercentage: homeMatches > 0 ? Math.round((homeDraws / homeMatches) * 100) : 0,
      lossPercentage: homeMatches > 0 ? Math.round((homeLosses / homeMatches) * 100) : 0,
      goalsForPerMatch: homeMatches > 0 ? (homeGoalsFor / homeMatches).toFixed(2) : '0.00',
      goalsAgainstPerMatch: homeMatches > 0 ? (homeGoalsAgainst / homeMatches).toFixed(2) : '0.00',
      xgForPerMatch: statistics.homeXgForPerMatch || '0.00',
      xgAgainstPerMatch: statistics.homeXgAgainstPerMatch || '0.00',
      cleanSheetPercentage: statistics.homeCleanSheetPercentage || 0,
      failedToScorePercentage: statistics.homeFailedToScorePercentage || 0,
      pointsPerGame: statistics.homePointsPerGame || '0.00',
      over15GoalsPercentage: statistics.homeOver15GoalsPercentage || 0,
      over25GoalsPercentage: statistics.homeOver25GoalsPercentage || 0,
      over35GoalsPercentage: statistics.homeOver35GoalsPercentage || 0,
      over45GoalsPercentage: statistics.homeOver45GoalsPercentage || 0,
      bothTeamsScoredPercentage: statistics.homeBothTeamsScoredPercentage || 0,
      avgMatchGoals:
        homeMatches > 0 ? ((homeGoalsFor + homeGoalsAgainst) / homeMatches).toFixed(2) : '0.00',
      bttsAndWinPercentage: statistics.homeBttsAndWinPercentage || 0,
      bttsAndDrawPercentage: statistics.homeBttsAndDrawPercentage || 0,
      bttsAndLosePercentage: statistics.homeBttsAndLosePercentage || 0,
      cornersEarnedPerMatch: statistics.homeCornersAVG || '0.00',
      cornersAgainstPerMatch: statistics.homeCornersAgainstAVG || '0.00',
      totalCornersPerMatch: statistics.homeCornersTotalAVG || '0.00',
      goalsFor: homeGoalsFor,
      goalsAgainst: homeGoalsAgainst,
      cleanSheets: statistics.homeCleanSheets || 0,
      failedToScore: statistics.homeFailedToScore || 0,
      totalMatches: homeMatches,
      possessionPercentage: statistics.homePossessionPercentage || 0,
      penaltiesWon: statistics.homePenaltiesWon || 0,
      penaltiesConceded: statistics.homePenaltiesConceded || 0,
    };
  } else if (filter === 'away') {
    // Calculate away-specific stats from available data
    const awayMatches = statistics.awayMatches || 0;
    const awayGoalsFor = statistics.awayGoalsFor || 0;
    const awayGoalsAgainst = statistics.awayGoalsAgainst || 0;
    const awayWins = statistics.awayWins || 0;
    const awayDraws = statistics.awayDraws || 0;
    const awayLosses = statistics.awayLosses || 0;

    return {
      matches: awayMatches,
      winPercentage:
        statistics.awayWinPercentage ||
        (awayMatches > 0 ? Math.round((awayWins / awayMatches) * 100) : 0),
      drawPercentage: awayMatches > 0 ? Math.round((awayDraws / awayMatches) * 100) : 0,
      lossPercentage: awayMatches > 0 ? Math.round((awayLosses / awayMatches) * 100) : 0,
      goalsForPerMatch: awayMatches > 0 ? (awayGoalsFor / awayMatches).toFixed(2) : '0.00',
      goalsAgainstPerMatch: awayMatches > 0 ? (awayGoalsAgainst / awayMatches).toFixed(2) : '0.00',
      xgForPerMatch: statistics.awayXgForPerMatch || '0.00',
      xgAgainstPerMatch: statistics.awayXgAgainstPerMatch || '0.00',
      cleanSheetPercentage: statistics.awayCleanSheetPercentage || 0,
      failedToScorePercentage: statistics.awayFailedToScorePercentage || 0,
      pointsPerGame: statistics.awayPointsPerGame || '0.00',
      over15GoalsPercentage: statistics.awayOver15GoalsPercentage || 0,
      over25GoalsPercentage: statistics.awayOver25GoalsPercentage || 0,
      over35GoalsPercentage: statistics.awayOver35GoalsPercentage || 0,
      over45GoalsPercentage: statistics.awayOver45GoalsPercentage || 0,
      bothTeamsScoredPercentage: statistics.awayBothTeamsScoredPercentage || 0,
      avgMatchGoals:
        awayMatches > 0 ? ((awayGoalsFor + awayGoalsAgainst) / awayMatches).toFixed(2) : '0.00',
      bttsAndWinPercentage: statistics.awayBttsAndWinPercentage || 0,
      bttsAndDrawPercentage: statistics.awayBttsAndDrawPercentage || 0,
      bttsAndLosePercentage: statistics.awayBttsAndLosePercentage || 0,
      cornersEarnedPerMatch: statistics.awayCornersAVG || '0.00',
      cornersAgainstPerMatch: statistics.awayCornersAgainstAVG || '0.00',
      totalCornersPerMatch: statistics.awayCornersTotalAVG || '0.00',
      goalsFor: awayGoalsFor,
      goalsAgainst: awayGoalsAgainst,
      cleanSheets: statistics.awayCleanSheets || 0,
      failedToScore: statistics.awayFailedToScore || 0,
      totalMatches: awayMatches,
      possessionPercentage: statistics.awayPossessionPercentage || 0,
      penaltiesWon: statistics.awayPenaltiesWon || 0,
      penaltiesConceded: statistics.awayPenaltiesConceded || 0,
    };
  }

  // Default to overall stats - RESTORED LEGACY
  return {
    matches: statistics.matches,
    winPercentage: statistics.winPercentage,
    drawPercentage: statistics.drawPercentage,
    lossPercentage: statistics.lossPercentage,
    goalsForPerMatch: statistics.goalsForPerMatch,
    goalsAgainstPerMatch: statistics.goalsAgainstPerMatch,
    xgForPerMatch: statistics.xgForPerMatch,
    xgAgainstPerMatch: statistics.xgAgainstPerMatch,
    cleanSheetPercentage: statistics.cleanSheetPercentage,
    failedToScorePercentage: statistics.failedToScorePercentage,
    pointsPerGame: statistics.pointsPerGame,
    over15GoalsPercentage: statistics.over15GoalsPercentage,
    over25GoalsPercentage: statistics.over25GoalsPercentage,
    over35GoalsPercentage: statistics.over35GoalsPercentage,
    over45GoalsPercentage: statistics.over45GoalsPercentage,
    bothTeamsScoredPercentage: statistics.bothTeamsScoredPercentage,
    avgMatchGoals: statistics.avgMatchGoals,
    bttsAndWinPercentage: statistics.bttsAndWinPercentage,
    bttsAndDrawPercentage: statistics.bttsAndDrawPercentage,
    bttsAndLosePercentage: statistics.bttsAndLosePercentage,
    cornersEarnedPerMatch: statistics.cornersAVG || '0.00',
    cornersAgainstPerMatch: statistics.cornersAgainstAVG || '0.00',
    totalCornersPerMatch: statistics.cornersTotalAVG || '0.00',
    goalsFor: statistics.goalsFor || 0,
    goalsAgainst: statistics.goalsAgainst || 0,
    cleanSheets: statistics.cleanSheets || 0,
    failedToScore: statistics.failedToScore || 0,
    totalMatches: statistics.totalMatches || 0,
    possessionPercentage: statistics.possessionPercentage || 0,
    penaltiesWon: statistics.penaltiesWon || 0,
    penaltiesConceded: statistics.penaltiesConceded || 0,
  };
}

function updateStatisticsWithFilter(statistics, filter) {
  const filteredStats = getFilteredStats(statistics, filter);
  updateStatisticsCategories(statistics, filteredStats, filter);
}

// Cards filter functions
window.setCardsFilter = function (filter) {
  currentCardsFilter = filter;

  // Update tab appearance - only Cards section filters
  document
    .querySelectorAll('#cardsOverallFilter, #cardsHomeFilter, #cardsAwayFilter')
    .forEach(tab => tab.classList.remove('active'));
  document
    .getElementById(`cards${filter.charAt(0).toUpperCase()}${filter.slice(1)}Filter`)
    .classList.add('active');

  // Update card statistics if data is loaded
  if (globalStatistics) {
    updateCardStatistics(globalStatistics, filter);
  }
};

// Corner filter function
window.setCornersFilter = function (filter) {
  currentCornersFilter = filter;

  // Update tab appearance - only Corners section filters
  document
    .querySelectorAll(
      '#filter-cornersOverallFilter, #filter-cornersHomeFilter, #filter-cornersAwayFilter'
    )
    .forEach(tab => tab.classList.remove('active'));
  document
    .getElementById(`filter-corners${filter.charAt(0).toUpperCase()}${filter.slice(1)}Filter`)
    .classList.add('active');

  // Update corner statistics if data is loaded
  if (globalStatistics) {
    updateCornerStatistics(globalStatistics, filter);
  }
};

// Update corner statistics based on filter
function updateCornerStatistics(statistics, filter) {
  if (!statistics) {
    console.error('updateCornerStatistics: No statistics data provided');
    return;
  }

  let cornersAVG, cornersAgainstAVG, cornersTotalAVG;
  let cornersOver65, cornersOver75, cornersOver85, over95Corners, over105Corners;
  let cornersOver115, cornersOver125, cornersOver135;

  if (filter === 'home') {
    cornersAVG = statistics.homeCornersAVG || '0.00';
    cornersAgainstAVG = statistics.homeCornersAgainstAVG || '0.00';
    cornersTotalAVG = statistics.homeCornersTotalAVG || '0.00';
    // Try multiple possible property names for home values
    cornersOver65 =
      statistics.over65CornersPercentage_home ||
      statistics.cornersOver65_home ||
      statistics.homeOver65Corners ||
      0;
    cornersOver75 =
      statistics.over75CornersPercentage_home ||
      statistics.cornersOver75_home ||
      statistics.homeOver75Corners ||
      0;
    cornersOver85 =
      statistics.over85CornersPercentage_home ||
      statistics.cornersOver85_home ||
      statistics.homeOver85Corners ||
      0;
    over95Corners =
      statistics.over95CornersPercentage_home ||
      statistics.over95Corners_home ||
      statistics.homeOver95Corners ||
      0;
    over105Corners =
      statistics.over105CornersPercentage_home ||
      statistics.over105Corners_home ||
      statistics.homeOver105Corners ||
      0;
    cornersOver115 =
      statistics.over115CornersPercentage_home ||
      statistics.cornersOver115_home ||
      statistics.homeOver115Corners ||
      0;
    cornersOver125 =
      statistics.over125CornersPercentage_home ||
      statistics.cornersOver125_home ||
      statistics.homeOver125Corners ||
      0;
    cornersOver135 =
      statistics.over135CornersPercentage_home ||
      statistics.cornersOver135_home ||
      statistics.homeOver135Corners ||
      0;
  } else if (filter === 'away') {
    cornersAVG = statistics.awayCornersAVG || '0.00';
    cornersAgainstAVG = statistics.awayCornersAgainstAVG || '0.00';
    cornersTotalAVG = statistics.awayCornersTotalAVG || '0.00';
    // Try multiple possible property names for away values
    cornersOver65 =
      statistics.over65CornersPercentage_away ||
      statistics.cornersOver65_away ||
      statistics.awayOver65Corners ||
      0;
    cornersOver75 =
      statistics.over75CornersPercentage_away ||
      statistics.cornersOver75_away ||
      statistics.awayOver75Corners ||
      0;
    cornersOver85 =
      statistics.over85CornersPercentage_away ||
      statistics.cornersOver85_away ||
      statistics.awayOver85Corners ||
      0;
    over95Corners =
      statistics.over95CornersPercentage_away ||
      statistics.over95Corners_away ||
      statistics.awayOver95Corners ||
      0;
    over105Corners =
      statistics.over105CornersPercentage_away ||
      statistics.over105Corners_away ||
      statistics.awayOver105Corners ||
      0;
    cornersOver115 =
      statistics.over115CornersPercentage_away ||
      statistics.cornersOver115_away ||
      statistics.awayOver115Corners ||
      0;
    cornersOver125 =
      statistics.over125CornersPercentage_away ||
      statistics.cornersOver125_away ||
      statistics.awayOver125Corners ||
      0;
    cornersOver135 =
      statistics.over135CornersPercentage_away ||
      statistics.cornersOver135_away ||
      statistics.awayOver135Corners ||
      0;
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
  const updateElement = (id, value) => {
    const element = document.getElementById(id);
    if (element) {
      element.textContent = value;
    } else {
      console.warn(`Element not found: ${id}`);
    }
  };

  updateElement('filter-cornersEarnedPerMatch', cornersAVG);
  updateElement('filter-cornersAgainstPerMatch', cornersAgainstAVG);
  updateElement('filter-totalCornersPerMatch', cornersTotalAVG);
  // Format percentage values
  const formatPercentage = value => {
    return `${value}%`;
  };

  updateElement('filter-cornersOver65', formatPercentage(cornersOver65));
  updateElement('filter-cornersOver75', formatPercentage(cornersOver75));
  updateElement('filter-cornersOver85', formatPercentage(cornersOver85));
  updateElement('filter-over95Corners', formatPercentage(over95Corners));
  updateElement('filter-over105Corners', formatPercentage(over105Corners));
  updateElement('filter-cornersOver115', formatPercentage(cornersOver115));
  updateElement('filter-cornersOver125', formatPercentage(cornersOver125));
  updateElement('filter-cornersOver135', formatPercentage(cornersOver135));
}

function getFilteredCardStats(statistics, filter) {
  switch (filter) {
    case 'home':
      return {
        matches: statistics.homeMatches,
        wins: statistics.homeWins,
        draws: statistics.homeDraws,
        losses: statistics.homeLosses,
        // Home teams typically get fewer cards due to referee bias
        cardMultiplier: 0.85,
      };
    case 'away':
      return {
        matches: statistics.awayMatches,
        wins: statistics.awayWins,
        draws: statistics.awayDraws,
        losses: statistics.awayLosses,
        // Away teams typically get more cards
        cardMultiplier: 1.25,
      };
    default: // overall
      return {
        matches: statistics.completedMatches,
        wins: statistics.wins,
        draws: statistics.draws,
        losses: statistics.losses,
        cardMultiplier: 1.0,
      };
  }
}

function updateCardStatistics(statistics, filter) {
  const filteredStats = getFilteredCardStats(statistics, filter);
  const completedMatches = filteredStats.matches || 1;

  // Direct from API - filter-based card fields
  if (filter === 'home') {
    document.getElementById('totalCards').textContent = statistics.homeCards || 0;
    document.getElementById('cardsPerMatch').textContent = (
      statistics.homeCardsPerMatch || 0
    ).toFixed(1);
    document.getElementById('homeCards').textContent = statistics.homeCards || 0;
    document.getElementById('awayCards').textContent = statistics.awayCards || 0;
    document.getElementById('homeCardsPerMatch').textContent = (
      statistics.homeCardsPerMatch || 0
    ).toFixed(1);
    document.getElementById('awayCardsPerMatch').textContent = (
      statistics.awayCardsPerMatch || 0
    ).toFixed(1);
    document.getElementById('cardsHighest').textContent = statistics.cardsHighest || 0;
    document.getElementById('cardsLowest').textContent = statistics.cardsLowest || 0;

    // Card Over statistics - Home
    document.getElementById('cardsOver05').textContent = `${statistics.homeCardsOver05 || 0}%`;
    document.getElementById('cardsOver15').textContent = `${statistics.homeCardsOver15 || 0}%`;
    document.getElementById('cardsOver25').textContent = `${statistics.homeCardsOver25 || 0}%`;
    document.getElementById('cardsOver35').textContent = `${statistics.homeCardsOver35 || 0}%`;
    document.getElementById('cardsOver45').textContent = `${statistics.homeCardsOver45 || 0}%`;
    document.getElementById('cardsOver55').textContent = `${statistics.homeCardsOver55 || 0}%`;
  } else if (filter === 'away') {
    document.getElementById('totalCards').textContent = statistics.awayCards || 0;
    document.getElementById('cardsPerMatch').textContent = (
      statistics.awayCardsPerMatch || 0
    ).toFixed(1);
    document.getElementById('homeCards').textContent = statistics.homeCards || 0;
    document.getElementById('awayCards').textContent = statistics.awayCards || 0;
    document.getElementById('homeCardsPerMatch').textContent = (
      statistics.homeCardsPerMatch || 0
    ).toFixed(1);
    document.getElementById('awayCardsPerMatch').textContent = (
      statistics.awayCardsPerMatch || 0
    ).toFixed(1);
    document.getElementById('cardsHighest').textContent = statistics.cardsHighest || 0;
    document.getElementById('cardsLowest').textContent = statistics.cardsLowest || 0;

    // Card Over statistics - Away
    document.getElementById('cardsOver05').textContent = `${statistics.awayCardsOver05 || 0}%`;
    document.getElementById('cardsOver15').textContent = `${statistics.awayCardsOver15 || 0}%`;
    document.getElementById('cardsOver25').textContent = `${statistics.awayCardsOver25 || 0}%`;
    document.getElementById('cardsOver35').textContent = `${statistics.awayCardsOver35 || 0}%`;
    document.getElementById('cardsOver45').textContent = `${statistics.awayCardsOver45 || 0}%`;
    document.getElementById('cardsOver55').textContent = `${statistics.awayCardsOver55 || 0}%`;
  } else {
    // Overall
    document.getElementById('totalCards').textContent = statistics.totalCards || 0;
    document.getElementById('cardsPerMatch').textContent = (statistics.cardsPerMatch || 0).toFixed(
      1
    );
    document.getElementById('homeCards').textContent = statistics.homeCards || 0;
    document.getElementById('awayCards').textContent = statistics.awayCards || 0;
    document.getElementById('homeCardsPerMatch').textContent = (
      statistics.homeCardsPerMatch || 0
    ).toFixed(1);
    document.getElementById('awayCardsPerMatch').textContent = (
      statistics.awayCardsPerMatch || 0
    ).toFixed(1);
    document.getElementById('cardsHighest').textContent = statistics.cardsHighest || 0;
    document.getElementById('cardsLowest').textContent = statistics.cardsLowest || 0;

    // Card Over statistics - Overall
    document.getElementById('cardsOver05').textContent = `${statistics.cardsOver05 || 0}%`;
    document.getElementById('cardsOver15').textContent = `${statistics.cardsOver15 || 0}%`;
    document.getElementById('cardsOver25').textContent = `${statistics.cardsOver25 || 0}%`;
    document.getElementById('cardsOver35').textContent = `${statistics.cardsOver35 || 0}%`;
    document.getElementById('cardsOver45').textContent = `${statistics.cardsOver45 || 0}%`;
    document.getElementById('cardsOver55').textContent = `${statistics.cardsOver55 || 0}%`;
  }

  // Disciplinary record (adjusted for home/away) - check if elements exist
  if (document.getElementById('cleanGames')) {
    document.getElementById('cleanGames').textContent = `${statistics.cleanGames || 0}%`;
  }

  if (document.getElementById('multipleCardsGames')) {
    document.getElementById('multipleCardsGames').textContent =
      `${statistics.multipleCardsGames || 0}%`;
  }

  if (document.getElementById('earlyCards')) {
    document.getElementById('earlyCards').textContent = statistics.earlyCards || 0;
  }
  if (document.getElementById('lateCards')) {
    document.getElementById('lateCards').textContent = statistics.lateCards || 0;
  }
  // Cards in Wins/Losses removed from UI
  // if (document.getElementById('cardsInWins')) {
  //     document.getElementById('cardsInWins').textContent = statistics.cardsInWins || 0;
  // }
  // if (document.getElementById('cardsInLosses')) {
  //     document.getElementById('cardsInLosses').textContent = statistics.cardsInLosses || 0;
  // }
}

// xG filter functions
window.setXgFilter = function (filter) {
  currentXgFilter = filter;

  // Update tab appearance
  document
    .querySelectorAll('#xgOverallFilter, #xgHomeFilter, #xgAwayFilter')
    .forEach(tab => tab.classList.remove('active'));
  document
    .getElementById(`xg${filter.charAt(0).toUpperCase()}${filter.slice(1)}Filter`)
    .classList.add('active');

  // Update xG statistics if data is loaded
  if (globalStatistics) {
    updateXgStatistics(globalStatistics, filter);
  }
};

function updateXgStatistics(statistics, filter) {
  const filteredStats = getFilteredStats(statistics, filter);
  const completedMatches = filteredStats.matches || 1;

  // Left side - Current Selection Stats (changes based on filter)
  if (filter === 'home') {
    // Home filter - show home-specific data
    document.getElementById('xgForTotal').textContent = (statistics.homeXgForPerMatch || 0).toFixed(
      2
    );
    document.getElementById('xgAgainstTotal').textContent = (
      statistics.homeXgAgainstPerMatch || 0
    ).toFixed(2);
    const homeDiff = (statistics.homeXgForPerMatch || 0) - (statistics.homeXgAgainstPerMatch || 0);
    document.getElementById('xgDifference').textContent =
      (homeDiff >= 0 ? '+' : '') + homeDiff.toFixed(2);

    document.getElementById('goalsForAvg').textContent = (
      statistics.homeGoalsForPerMatch || 0
    ).toFixed(2);
    document.getElementById('goalsAgainstAvg').textContent = (
      statistics.homeGoalsAgainstPerMatch || 0
    ).toFixed(2);
    const homeGoalDiff =
      (statistics.homeGoalsForPerMatch || 0) - (statistics.homeGoalsAgainstPerMatch || 0);
    document.getElementById('goalDifferenceAvg').textContent =
      (homeGoalDiff >= 0 ? '+' : '') + homeGoalDiff.toFixed(2);
  } else if (filter === 'away') {
    // Away filter - show away-specific data
    document.getElementById('xgForTotal').textContent = (statistics.awayXgForPerMatch || 0).toFixed(
      2
    );
    document.getElementById('xgAgainstTotal').textContent = (
      statistics.awayXgAgainstPerMatch || 0
    ).toFixed(2);
    const awayDiff = (statistics.awayXgForPerMatch || 0) - (statistics.awayXgAgainstPerMatch || 0);
    document.getElementById('xgDifference').textContent =
      (awayDiff >= 0 ? '+' : '') + awayDiff.toFixed(2);

    document.getElementById('goalsForAvg').textContent = (
      statistics.awayGoalsForPerMatch || 0
    ).toFixed(2);
    document.getElementById('goalsAgainstAvg').textContent = (
      statistics.awayGoalsAgainstPerMatch || 0
    ).toFixed(2);
    const awayGoalDiff =
      (statistics.awayGoalsForPerMatch || 0) - (statistics.awayGoalsAgainstPerMatch || 0);
    document.getElementById('goalDifferenceAvg').textContent =
      (awayGoalDiff >= 0 ? '+' : '') + awayGoalDiff.toFixed(2);
  } else {
    // Overall filter - show overall data
    document.getElementById('xgForTotal').textContent = (statistics.xgForPerMatch || 0).toFixed(2);
    document.getElementById('xgAgainstTotal').textContent = (
      statistics.xgAgainstPerMatch || 0
    ).toFixed(2);
    const overallDiff = statistics.xgDifferencePerMatch || 0;
    document.getElementById('xgDifference').textContent =
      (overallDiff >= 0 ? '+' : '') + overallDiff.toFixed(2);

    document.getElementById('goalsForAvg').textContent = (statistics.goalsForPerMatch || 0).toFixed(
      2
    );
    document.getElementById('goalsAgainstAvg').textContent = (
      statistics.averageGoalsAgainst || 0
    ).toFixed(2);
    const goalDiff = (statistics.goalsForPerMatch || 0) - (statistics.goalsAgainstPerMatch || 0);
    document.getElementById('goalDifferenceAvg').textContent =
      (goalDiff >= 0 ? '+' : '') + goalDiff.toFixed(2);
  }
}

// Halftime filter functions
window.setHalftimeFilter = function (filter) {
  currentHalftimeFilter = filter;

  // Update tab appearance
  document
    .querySelectorAll('#halftimeOverallFilter, #halftimeHomeFilter, #halftimeAwayFilter')
    .forEach(tab => tab.classList.remove('active'));
  document
    .getElementById(`halftime${filter.charAt(0).toUpperCase()}${filter.slice(1)}Filter`)
    .classList.add('active');

  // Update column header
  const headerText = filter === 'home' ? 'At Home' : filter === 'away' ? 'At Away' : 'Overall';
  document.getElementById('halftimeColumnHeader').textContent = headerText;

  // Update halftime statistics if data is loaded
  if (globalStatistics) {
    updateHalftimeStatistics(globalStatistics, filter);
  }
};

function updateHalftimeStatistics(statistics, filter) {
  const suffix = filter === 'home' ? '_home' : filter === 'away' ? '_away' : '_overall';
  // Get matches based on filter
  let completedMatches;
  if (filter === 'home') {
    completedMatches = statistics.homeMatches || 0;
  } else if (filter === 'away') {
    completedMatches = statistics.awayMatches || 0;
  } else {
    completedMatches = statistics.completedMatches || statistics.totalMatches || 0;
  }

  // Get real API data for halftime goals
  const firstHalfGoalsFor = statistics[`scoredGoalsHT${suffix}`] || 0;
  const firstHalfGoalsAgainst = statistics[`concededGoalsHT${suffix}`] || 0;
  const scoredAVGHT = statistics[`scoredAVGHT${suffix}`] || 0;
  const concededAVGHT = statistics[`concededAVGHT${suffix}`] || 0;

  // Get real halftime results from API
  const leadingAtHT = statistics[`leadingAtHT${suffix}`] || 0;
  const drawingAtHT = statistics[`drawingAtHT${suffix}`] || 0;
  const trailingAtHT = statistics[`trailingAtHT${suffix}`] || 0;
  const leadingAtHTPerc = statistics[`leadingAtHTPercentage${suffix}`] || 0;
  const drawingAtHTPerc = statistics[`drawingAtHTPercentage${suffix}`] || 0;
  const trailingAtHTPerc = statistics[`trailingAtHTPercentage${suffix}`] || 0;

  // Calculate percentages for goals scored/conceded
  let goalsPerMatch, goalsAgainstPerMatch;
  if (filter === 'home') {
    goalsPerMatch = statistics.homeGoalsForPerMatch || statistics.averageGoalsFor || 0;
    goalsAgainstPerMatch =
      statistics.homeGoalsAgainstPerMatch || statistics.averageGoalsAgainst || 0;
  } else if (filter === 'away') {
    goalsPerMatch = statistics.awayGoalsForPerMatch || statistics.averageGoalsFor || 0;
    goalsAgainstPerMatch =
      statistics.awayGoalsAgainstPerMatch || statistics.averageGoalsAgainst || 0;
  } else {
    goalsPerMatch = statistics.averageGoalsFor || 0;
    goalsAgainstPerMatch = statistics.averageGoalsAgainst || 0;
  }

  const firstHalfGoalsScoredPerc =
    goalsPerMatch > 0 ? Math.round((scoredAVGHT / goalsPerMatch) * 100) : 0;
  const firstHalfGoalsConcededPerc =
    goalsAgainstPerMatch > 0 ? Math.round((concededAVGHT / goalsAgainstPerMatch) * 100) : 0;

  // Update table values
  document.getElementById('firstHalfGoalsScored').textContent = firstHalfGoalsFor;
  document.getElementById('firstHalfGoalsScoredMatches').textContent = completedMatches;
  document.getElementById('firstHalfGoalsScoredPerc').textContent = `${firstHalfGoalsScoredPerc}%`;

  document.getElementById('firstHalfGoalsConceded').textContent = firstHalfGoalsAgainst;
  document.getElementById('firstHalfGoalsConcededMatches').textContent = completedMatches;
  document.getElementById('firstHalfGoalsConcededPerc').textContent =
    `${firstHalfGoalsConcededPerc}%`;

  document.getElementById('leadingAtHT').textContent = leadingAtHT;
  document.getElementById('leadingAtHTMatches').textContent = completedMatches;
  document.getElementById('leadingAtHTPerc').textContent = `${leadingAtHTPerc}%`;

  document.getElementById('drawingAtHT').textContent = drawingAtHT;
  document.getElementById('drawingAtHTMatches').textContent = completedMatches;
  document.getElementById('drawingAtHTPerc').textContent = `${drawingAtHTPerc}%`;

  document.getElementById('losingAtHT').textContent = trailingAtHT;
  document.getElementById('losingAtHTMatches').textContent = completedMatches;
  document.getElementById('losingAtHTPerc').textContent = `${trailingAtHTPerc}%`;
}

// Timing filter functions
window.setTimingFilter = function (filter) {
  currentTimingFilter = filter;

  // Update tab appearance
  document
    .querySelectorAll(
      '#timingOverallFilter, #timingHomeFilter, #timingAwayFilter, #timingScoredFilter, #timingConcededFilter'
    )
    .forEach(tab => tab.classList.remove('active'));
  document
    .getElementById(`timing${filter.charAt(0).toUpperCase()}${filter.slice(1)}Filter`)
    .classList.add('active');

  // Update timing statistics if data is loaded
  // DISABLED: Now handled by modular system (goals-display.js)
  // if (globalStatistics) {
  //   updateTimingStatistics(globalStatistics, filter);
  // }
  
  // Emit event for modular system
  if (window.TeamStatsEventBus) {
    window.TeamStatsEventBus.emit('filters:timing:change', filter);
  }
  
  // Update state if StateManager exists
  if (window.TeamStatsStateManager) {
    window.TeamStatsStateManager.set('filters.timing', filter);
  }
};

// DISABLED: This function is now handled by the modular system (goals-display.js)
// to avoid conflicts with DOM updates
function updateTimingStatistics_DISABLED(statistics, filter) {
  // Use REAL API data directly - no calculations needed
  const baseScoredPeriods = [
    statistics.goals0_15 || 0,
    statistics.goals16_30 || 0,
    statistics.goals31_45 || 0,
    statistics.goals46_60 || 0,
    statistics.goals61_75 || 0,
    statistics.goals76_90 || 0,
  ];

  // Generate conceded goals pattern from API data
  const baseConcededPeriods = [
    statistics.goalsConc0_15 || 0,
    statistics.goalsConc16_30 || 0,
    statistics.goalsConc31_45 || 0,
    statistics.goalsConc46_60 || 0,
    statistics.goalsConc61_75 || 0,
    statistics.goalsConc76_90 || 0,
  ];

  let scoredPeriods = [...baseScoredPeriods];
  let concededPeriods = [...baseConcededPeriods];
  let titleText = 'Goal Distribution by Time Periods';
  let summaryText = 'Scored vs Conceded';
  let showBothTypes = true;

  // Apply filter-specific modifications
  switch (filter) {
    case 'home':
      scoredPeriods = [
        statistics.homeGoals0_15 || 0,
        statistics.homeGoals16_30 || 0,
        statistics.homeGoals31_45 || 0,
        statistics.homeGoals46_60 || 0,
        statistics.homeGoals61_75 || 0,
        statistics.homeGoals76_90 || 0,
      ];
      concededPeriods = [
        statistics.homeGoalsConc0_15 || 0,
        statistics.homeGoalsConc16_30 || 0,
        statistics.homeGoalsConc31_45 || 0,
        statistics.homeGoalsConc46_60 || 0,
        statistics.homeGoalsConc61_75 || 0,
        statistics.homeGoalsConc76_90 || 0,
      ];
      titleText = 'Home Goals Distribution by Time Periods';
      summaryText = 'Scored vs Conceded at home';
      break;
    case 'away':
      scoredPeriods = [
        statistics.awayGoals0_15 || 0,
        statistics.awayGoals16_30 || 0,
        statistics.awayGoals31_45 || 0,
        statistics.awayGoals46_60 || 0,
        statistics.awayGoals61_75 || 0,
        statistics.awayGoals76_90 || 0,
      ];
      concededPeriods = [
        statistics.awayGoalsConc0_15 || 0,
        statistics.awayGoalsConc16_30 || 0,
        statistics.awayGoalsConc31_45 || 0,
        statistics.awayGoalsConc46_60 || 0,
        statistics.awayGoalsConc61_75 || 0,
        statistics.awayGoalsConc76_90 || 0,
      ];
      titleText = 'Away Goals Distribution by Time Periods';
      summaryText = 'Scored vs Conceded away';
      break;
    case 'scored':
      concededPeriods = [0, 0, 0, 0, 0, 0]; // Hide conceded
      titleText = 'Goals Scored Distribution by Time Periods';
      summaryText = 'Goals scored by team';
      showBothTypes = false;
      break;
    case 'conceded':
      scoredPeriods = [0, 0, 0, 0, 0, 0]; // Hide scored
      titleText = 'Goals Conceded Distribution by Time Periods';
      summaryText = 'Goals conceded by team';
      showBothTypes = false;
      break;
    default: // overall
      titleText = 'Goal Distribution by Time Periods';
      summaryText = 'Scored vs Conceded overall';
  }

  // Calculate totals from the arrays
  const totalScored = scoredPeriods.reduce((sum, goals) => sum + goals, 0);
  const totalConceded = concededPeriods.reduce((sum, goals) => sum + goals, 0);
  
  // Get actual totals from statistics to check for missing 90+ minute goals
  const actualTotalScored = statistics.goalsFor || statistics.totalGoalsScored || totalScored;
  const actualTotalConceded = statistics.goalsAgainst || statistics.totalGoalsConceded || totalConceded;
  
  // Calculate missing goals (likely 90+ minutes)
  const missingScored = actualTotalScored - totalScored;
  const missingConceded = actualTotalConceded - totalConceded;
  
  const maxValue = Math.max(...scoredPeriods, ...concededPeriods, 1);

  // Update header info
  document.getElementById('timingTitle').textContent = titleText;
  
  // Update note about missing goals
  const noteElement = document.getElementById('timingNote');
  if (noteElement) {
    if (missingScored > 0 || missingConceded > 0) {
      let noteText = '*Note: ';
      if (missingScored > 0) {
        noteText += `${missingScored} goal${missingScored > 1 ? 's' : ''} scored`;
      }
      if (missingScored > 0 && missingConceded > 0) {
        noteText += ' and ';
      }
      if (missingConceded > 0) {
        noteText += `${missingConceded} goal${missingConceded > 1 ? 's' : ''} conceded`;
      }
      noteText += ' in 90+ minutes not included in timing data';
      noteElement.textContent = noteText;
      noteElement.style.display = 'block';
    } else {
      noteElement.style.display = 'none';
    }
  }

  // Update timing chart with dual bars
  const periodIds = [
    'goals0_15',
    'goals16_30',
    'goals31_45',
    'goals46_60',
    'goals61_75',
    'goals76_90',
  ];
  const periodLabels = ["0-15'", "16-30'", "31-45'", "46-60'", "61-75'", "76-90'"];

  scoredPeriods.forEach((scoredGoals, index) => {
    const concededGoals = concededPeriods[index];

    // Calculate percentages
    const scoredPerc = totalScored > 0 ? Math.round((scoredGoals / totalScored) * 100) : 0;
    const concededPerc = totalConceded > 0 ? Math.round((concededGoals / totalConceded) * 100) : 0;

    // Calculate widths based on percentage for full width utilization
    const scoredWidth = scoredPerc; // Use percentage directly for width
    const concededWidth = concededPerc; // Use percentage directly for width

    // Update scored bar
    const scoredBarElement = document.getElementById(`${periodIds[index]}ScoredBar`);
    const scoredValueElement = document.getElementById(`${periodIds[index]}ScoredText`);
    
    // Update conceded bar
    const concededBarElement = document.getElementById(`${periodIds[index]}ConcededBar`);
    const concededValueElement = document.getElementById(`${periodIds[index]}ConcededText`);

    // Always show both bars first
    if (scoredBarElement && scoredBarElement.parentElement) {
      scoredBarElement.parentElement.style.display = 'block';
    }
    if (concededBarElement && concededBarElement.parentElement) {
      concededBarElement.parentElement.style.display = 'block';
    }

    // Handle filters
    if (filter === 'scored') {
      // Show only scored - hide conceded bar completely
      if (scoredBarElement) scoredBarElement.style.width = `${scoredWidth}%`;
      if (scoredValueElement) scoredValueElement.textContent = `${scoredGoals} (${scoredPerc}%)`;
      if (concededBarElement && concededBarElement.parentElement) {
        concededBarElement.parentElement.style.display = 'none';
      }
    } else if (filter === 'conceded') {
      // Show only conceded - hide scored bar completely
      if (scoredBarElement && scoredBarElement.parentElement) {
        scoredBarElement.parentElement.style.display = 'none';
      }
      if (concededBarElement) concededBarElement.style.width = `${concededWidth}%`;
      if (concededValueElement) concededValueElement.textContent = `${concededGoals} (${concededPerc}%)`;
    } else {
      // Show both for overall, home, away
      if (scoredBarElement) scoredBarElement.style.width = `${scoredWidth}%`;
      if (scoredValueElement) scoredValueElement.textContent = `${scoredGoals} (${scoredPerc}%)`;
      if (concededBarElement) concededBarElement.style.width = `${concededWidth}%`;
      if (concededValueElement) concededValueElement.textContent = `${concededGoals} (${concededPerc}%)`;
    }
  });
}

function displayDetailedTeamData(data) {
  const { teamInfo, league, statistics, allMatches, leaguePosition } = data;

  // API'deki tüm alanları kontrol et
  if (statistics) {
    Object.keys(statistics).forEach(key => {
      if (
        key.toLowerCase().includes('2hg') ||
        key.toLowerCase().includes('second') ||
        key.toLowerCase().includes('half')
      ) {
      }
    });
  }

  // Store statistics globally for filtering
  globalStatistics = statistics;
  
  // Emit data loaded event for modular system
  if (window.TeamStatsEventBus) {
    console.log('[team-stats.js] Emitting data:team:loaded event');
    window.TeamStatsEventBus.emit('data:team:loaded', {
      data: { 
        statistics: statistics,
        teamInfo: teamInfo,
        league: league
      }
    });
  }

  // Hide loading, show team section
  document.getElementById('loadingSection').style.display = 'none';
  document.getElementById('teamSection').style.display = 'block';

  // Update header information
  document.getElementById('teamName').textContent = teamInfo.name || 'Unknown Team';
  document.getElementById('seasonInfo').textContent = teamInfo.season || '2025 Season';
  document.getElementById('leagueInfo').textContent = league?.name || 'Unknown League';

  // Set team logo
  if (teamInfo.image) {
    document.getElementById('teamLogo').innerHTML =
      `<img src="${teamInfo.image}" alt="${teamInfo.name}" style="width: 80px; height: 80px; border-radius: 50%; object-fit: contain; background: white;">`;
  } else if (teamInfo.logo) {
    document.getElementById('teamLogo').innerHTML =
      `<img src="${teamInfo.logo}" alt="${teamInfo.name}" style="width: 80px; height: 80px; border-radius: 50%; object-fit: contain; background: white;">`;
  } else if (teamInfo.crest) {
    document.getElementById('teamLogo').innerHTML =
      `<img src="${teamInfo.crest}" alt="${teamInfo.name}" style="width: 80px; height: 80px; border-radius: 50%; object-fit: contain; background: white;">`;
  } else {
    // Keep text logo as fallback
    document.getElementById('teamLogo').textContent = teamInfo.name
      ? teamInfo.name.substring(0, 3).toUpperCase()
      : 'TM';
  }

  // NO CALCULATIONS - Direct from API
  const completedMatches = statistics.completedMatches || 1;
  const ppg = statistics.pointsPerGame || 0;
  const goalsPerMatch = statistics.goalsForPerMatch || statistics.seasonScoredAVG_overall || 0;
  const concededPerMatch =
    statistics.goalsAgainstPerMatch || statistics.seasonConcededAVG_overall || 0;
  const winPercentage = statistics.winPercentage || 0;

  // Performance ratings
  const getFormText = ppg => {
    if (ppg >= 2.5) {
      return 'Excellent Form';
    }
    if (ppg >= 2.0) {
      return 'Very Good Form';
    }
    if (ppg >= 1.5) {
      return 'Good Form';
    }
    if (ppg >= 1.0) {
      return 'Average Form';
    }
    return 'Poor Form';
  };

  const getGoalsText = (avg, type) => {
    if (type === 'for') {
      if (avg >= 2.5) {
        return 'Excellent';
      }
      if (avg >= 2.0) {
        return 'Very Good';
      }
      if (avg >= 1.5) {
        return 'Good';
      }
      if (avg >= 1.0) {
        return 'Average';
      }
      return 'Poor';
    } else {
      if (avg <= 0.8) {
        return 'Excellent';
      }
      if (avg <= 1.2) {
        return 'Very Good';
      }
      if (avg <= 1.5) {
        return 'Average';
      }
      if (avg <= 2.0) {
        return 'Poor';
      }
      return 'Very Poor';
    }
  };

  // Update top stats
  document.getElementById('ppgValue').textContent = ppg;
  document.getElementById('goalsPerMatch').textContent = goalsPerMatch;
  document.getElementById('concededPerMatch').textContent = concededPerMatch;
  document.getElementById('formText').textContent = getFormText(ppg);

  // Update main stats title
  document.getElementById('mainStatsTitle').textContent = `2025 ${teamInfo.name} Statistics`;

  // Form indicators - convert string to array if needed
  let recentForm = statistics.recentForm || [];
  if (typeof recentForm === 'string') {
    // Take last 5 characters for most recent matches
    recentForm = recentForm
      .slice(-5)
      .toUpperCase()
      .split('')
      .map(char => {
        if (char === 'W') {
          return 'W';
        }
        if (char === 'D') {
          return 'D';
        }
        if (char === 'L') {
          return 'L';
        }
        return null;
      })
      .filter(x => x !== null);
  }
  updateFormDisplay('recentForm', recentForm);

  // League position
  if (leaguePosition && leaguePosition.position) {
    if (leaguePosition.totalTeams && leaguePosition.totalTeams > 0) {
      document.getElementById('leaguePosition').textContent =
        `${leaguePosition.position} / ${leaguePosition.totalTeams}`;
    } else {
      document.getElementById('leaguePosition').textContent = `${leaguePosition.position}`;
    }
  } else {
    document.getElementById('leaguePosition').textContent = 'N/A';
  }

  // NO CALCULATIONS - Direct from API
  const homePPG = statistics.homePointsPerGame || 0;
  const awayPPG = statistics.awayPointsPerGame || 0;

  // Update main statistics table
  document.getElementById('homePlayed').textContent = statistics.homeMatches || 0;
  document.getElementById('homeWins').textContent = statistics.homeWins || 0;
  document.getElementById('homeDraws').textContent = statistics.homeDraws || 0;
  document.getElementById('homeLosses').textContent = statistics.homeLosses || 0;
  document.getElementById('homeGoalsFor').textContent = statistics.homeGoalsFor || 0;
  document.getElementById('homeGoalsAgainst').textContent = statistics.homeGoalsAgainst || 0;
  document.getElementById('homeGD').textContent = statistics.homeGoalDifference || 0;
  document.getElementById('homePPG').textContent = homePPG;

  document.getElementById('awayPlayed').textContent = statistics.awayMatches || 0;
  document.getElementById('awayWins').textContent = statistics.awayWins || 0;
  document.getElementById('awayDraws').textContent = statistics.awayDraws || 0;
  document.getElementById('awayLosses').textContent = statistics.awayLosses || 0;
  document.getElementById('awayGoalsFor').textContent = statistics.awayGoalsFor || 0;
  document.getElementById('awayGoalsAgainst').textContent = statistics.awayGoalsAgainst || 0;
  document.getElementById('awayGD').textContent = statistics.awayGoalDifference || 0;
  document.getElementById('awayPPG').textContent = awayPPG;

  document.getElementById('totalPlayed').textContent = completedMatches;
  document.getElementById('totalWins').textContent = statistics.wins || 0;
  document.getElementById('totalDraws').textContent = statistics.draws || 0;
  document.getElementById('totalLosses').textContent = statistics.losses || 0;
  document.getElementById('totalGoalsFor').textContent = statistics.goalsFor || 0;
  document.getElementById('totalGoalsAgainst').textContent = statistics.goalsAgainst || 0;
  document.getElementById('totalGD').textContent =
    `${statistics.goalDifference >= 0 ? '+' : ''}${statistics.goalDifference || 0}`;
  document.getElementById('totalPPG').textContent = statistics.pointsPerGame || 0;

  // Update form displays for table
  let homeForm = statistics.homeForm || [];
  let awayForm = statistics.awayForm || [];

  // Convert string forms to arrays
  if (typeof homeForm === 'string') {
    // Take last 5 characters for most recent matches
    homeForm = homeForm
      .slice(-5)
      .toUpperCase()
      .split('')
      .map(char => {
        if (char === 'W') {
          return 'W';
        }
        if (char === 'D') {
          return 'D';
        }
        if (char === 'L') {
          return 'L';
        }
        return null;
      })
      .filter(x => x !== null);
  }

  if (typeof awayForm === 'string') {
    // Take last 5 characters for most recent matches
    awayForm = awayForm
      .slice(-5)
      .toUpperCase()
      .split('')
      .map(char => {
        if (char === 'W') {
          return 'W';
        }
        if (char === 'D') {
          return 'D';
        }
        if (char === 'L') {
          return 'L';
        }
        return null;
      })
      .filter(x => x !== null);
  }

  updateFormDisplay('homeFormDisplay', homeForm);
  updateFormDisplay('awayFormDisplay', awayForm);
  updateFormDisplay('overallFormDisplay', recentForm);

  // Prediction risk and home advantage
  const risk = statistics.predictionRisk || 0; // Direct from API
  const homeAdvantage = statistics.homeAdvantagePercentage || 0;
  document.getElementById('predictionRisk').textContent = `${risk}%`;
  document.getElementById('homeAdvantage').textContent = `+${homeAdvantage}%`;

  // Team description
  updateTeamDescription(teamInfo, league, statistics, leaguePosition, winPercentage);

  // Statistics categories
  const initialFilteredStats = getFilteredStats(statistics, 'overall');
  updateStatisticsCategories(statistics, initialFilteredStats, 'overall');

  // Card statistics (initialize with overall)
  updateCardStatistics(statistics, 'overall');

  // xG statistics (initialize with overall)
  updateXgStatistics(statistics, 'overall');

  // Halftime statistics (initialize with overall)
  updateHalftimeStatistics(statistics, 'overall');

  // Timing statistics (initialize with overall)
  // DISABLED: Now handled by modular system
  // updateTimingStatistics(statistics, 'overall');

  // Match list
  populateMatchList(allMatches, teamInfo.id);
}

function updateFormDisplay(elementId, formArray) {
  const container = document.getElementById(elementId);
  if (!container) {
    return;
  }

  const formDisplay = container.querySelector('.form-display') || container;
  formDisplay.innerHTML = '';

  if (!formArray || formArray.length === 0) {
    formDisplay.innerHTML = '<span style="opacity: 0.6; font-size: 0.9em;">No form data</span>';
    return;
  }

  formArray.forEach(result => {
    const badge = document.createElement('div');
    badge.className = `form-badge form-${result}`;
    badge.textContent = result;
    formDisplay.appendChild(badge);
  });
}

function updateTeamDescription(teamInfo, league, statistics, leaguePosition, winPercentage) {
  const overallForm =
    statistics.winPercentage >= 60
      ? 'Excellent'
      : statistics.winPercentage >= 50
        ? 'Very Good'
        : statistics.winPercentage >= 40
          ? 'Good'
          : 'Average';

  const homeForm =
    statistics.homeWinPercentage >= 60
      ? 'excellent'
      : statistics.homeWinPercentage >= 50
        ? 'very good'
        : statistics.homeWinPercentage >= 40
          ? 'good'
          : 'average';

  const awayForm =
    statistics.awayWinPercentage >= 60
      ? 'excellent'
      : statistics.awayWinPercentage >= 50
        ? 'very good'
        : statistics.awayWinPercentage >= 40
          ? 'good'
          : 'average';

  const elements = ['teamNameDesc', 'teamNameDesc2', 'teamNameDesc3', 'teamNameDesc4'];
  elements.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.textContent = teamInfo.name;
    }
  });

  const leagueElements = ['leagueName', 'leagueNameDesc', 'leagueNameDesc2'];
  leagueElements.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.textContent = league?.name || 'League';
    }
  });

  document.getElementById('overallFormDesc').textContent = overallForm;
  document.getElementById('winsDesc').textContent = statistics.wins || 0;
  document.getElementById('drawsDesc').textContent = statistics.draws || 0;
  document.getElementById('lossesDesc').textContent = statistics.losses || 0;
  document.getElementById('positionDesc').textContent = leaguePosition?.positionText || 'Unknown';
  document.getElementById('winPercentageDesc').textContent = `${winPercentage}%`;
  document.getElementById('homeFormDesc').textContent = homeForm;
  document.getElementById('awayFormDesc').textContent = awayForm;
  document.getElementById('homeResultsDesc').textContent =
    `${statistics.homeWins || 0} wins, ${statistics.homeDraws || 0} draws, and ${statistics.homeLosses || 0} losses`;
  document.getElementById('awayResultsDesc').textContent =
    `${statistics.awayWins || 0} wins, ${statistics.awayDraws || 0} draws, and ${statistics.awayLosses || 0} losses`;
  document.getElementById('totalGoalsDesc').textContent = statistics.goalsFor || 0;
}

function updateStatisticsCategories(statistics, filteredStats, filter) {
  const completedMatches = filteredStats.matches || 1;

  // Basic stats
  document.getElementById('winsPercentage').textContent = `${filteredStats.winPercentage || 0}%`;
  document.getElementById('drawsPercentage').textContent = `${filteredStats.drawPercentage || 0}%`;
  document.getElementById('lossesPercentage').textContent = `${filteredStats.lossPercentage || 0}%`;

  // Goals per match
  document.getElementById('goalsForPerMatch').textContent =
    filteredStats.goalsForPerMatch || '0.00';
  document.getElementById('goalsAgainstPerMatch').textContent =
    filteredStats.goalsAgainstPerMatch || '0.00';

  // xG stats from API
  document.getElementById('xgForPerMatch').textContent = filteredStats.xgForPerMatch || '0.00';
  document.getElementById('xgAgainstPerMatch').textContent =
    filteredStats.xgAgainstPerMatch || '0.00';

  const cleanSheetPercent = filteredStats.cleanSheetPercentage || 0;
  const failedToScorePercent = filteredStats.failedToScorePercentage || 0;

  document.getElementById('cleanSheetsPercentage').textContent = `${cleanSheetPercent}%`;
  document.getElementById('failedToScorePercentage').textContent = `${failedToScorePercent}%`;
  document.getElementById('pointsPerGame').textContent = filteredStats.pointsPerGame || '0.00';
  document.getElementById('ballPossession').textContent =
    `${filteredStats.possessionPercentage || 0}%`;

  // Penalty stats
  const penaltiesWon = filteredStats.penaltiesWon || 0;
  const penaltiesConceded = filteredStats.penaltiesConceded || 0;
  const penaltyMatches = filteredStats.totalMatches || 0;

  document.getElementById('penaltiesWon').textContent = `${penaltiesWon} (${penaltyMatches} maçta)`;
  document.getElementById('penaltiesConceded').textContent =
    `${penaltiesConceded} (${penaltyMatches} maçta)`;

  // Over/BTTS stats
  const over15Percent = filteredStats.over15GoalsPercentage || 0;
  const over25Percent = filteredStats.over25GoalsPercentage || 0;
  const over35Percent = filteredStats.over35GoalsPercentage || 0;
  const over45Percent = filteredStats.over45GoalsPercentage || 0;
  const bttsPercent = filteredStats.bothTeamsScoredPercentage || 0;
  const avgMatchGoals = filteredStats.avgMatchGoals || '0.00';

  // These elements don't exist in HTML - commenting out to avoid warnings
  // updateElementText('over15Goals', `${over15Percent}%`);
  // updateElementText('over25Goals', `${over25Percent}%`);
  // updateElementText('over35Goals', `${over35Percent}%`);
  // updateElementText('over45Goals', `${over45Percent}%`);

  // Goals Scored/Conceded/Clean Sheets/Failed to Score
  const goalsFor = filteredStats.goalsFor || 0;
  const goalsAgainst = filteredStats.goalsAgainst || 0;
  const cleanSheets = filteredStats.cleanSheets || 0;
  const failedToScore = filteredStats.failedToScore || 0;
  const matches = filteredStats.totalMatches || 0;

  // These elements don't exist in HTML - commenting out to avoid warnings
  // updateElementText('goalsScored', `${goalsFor} gol (${matches} maçta)`);
  // updateElementText('goalsConceded', `${goalsAgainst} gol (${matches} maçta)`);
  // updateElementText('cleanSheets', `${cleanSheets} (${matches} maçta)`);
  // updateElementText('failedToScore', `${failedToScore} (${matches} maçta)`);

  // updateElementText('bttsPercentage', `${bttsPercent}%`);
  // updateElementText('bttsAndWin', `${filteredStats.bttsAndWinPercentage || 0}%`);
  // updateElementText('bttsAndDraw', `${filteredStats.bttsAndDrawPercentage || 0}%`);
  // updateElementText('bttsAndLose', `${filteredStats.bttsAndLosePercentage || 0}%`);
  // updateElementText('avgMatchGoals', avgMatchGoals);

  // Corner statistics from API
  const cornersEarned = statistics.cornersEarned || 0; // Direct from API
  const cornersAgainst = statistics.cornersAgainst || 0; // Direct from API
  const totalCorners = statistics.totalCorners || 0;

  // Update All Stats corner statistics (always update these)
  updateElementText('cornersEarnedPerMatch', filteredStats.cornersEarnedPerMatch || '0.0');
  updateElementText('cornersAgainstPerMatch', filteredStats.cornersAgainstPerMatch || '0.0');
  updateElementText('totalCornersPerMatch', filteredStats.totalCornersPerMatch || '0.0');

  // Corners Over statistics for All Stats
  updateElementText('cornersOver65', `${statistics.cornersOver65 || 0}%`);
  updateElementText('cornersOver75', `${statistics.cornersOver75 || 0}%`);
  updateElementText('cornersOver85', `${statistics.cornersOver85 || 0}%`);
  updateElementText('over95Corners', `${statistics.over95Corners || 0}%`);
  updateElementText('over105Corners', `${statistics.over105Corners || 0}%`);
  updateElementText('cornersOver115', `${statistics.cornersOver115 || 0}%`);
  updateElementText('cornersOver125', `${statistics.cornersOver125 || 0}%`);
  updateElementText('cornersOver135', `${statistics.cornersOver135 || 0}%`);

  // Card statistics - Direct from API
  const estimatedCards = statistics.totalCards || 0;
  const yellowCards = statistics.yellowCards || 0;
  const redCards = statistics.redCards || 0;

  // Update existing card elements
  if (document.getElementById('totalCards')) {
    document.getElementById('totalCards').textContent = statistics.totalCards || 0;
  }
  if (document.getElementById('cardsPerMatch')) {
    document.getElementById('cardsPerMatch').textContent = statistics.cardsPerMatch || '0.0';
  }

  // Disciplinary record - Only update if elements exist
  if (document.getElementById('cleanGames')) {
    document.getElementById('cleanGames').textContent = `${statistics.cleanGames || 0}%`;
  }
  if (document.getElementById('multipleCardsGames')) {
    document.getElementById('multipleCardsGames').textContent =
      `${statistics.multipleCardsGames || 0}%`;
  }
  if (document.getElementById('earlyCards')) {
    document.getElementById('earlyCards').textContent = statistics.earlyCards || 0;
  }
  if (document.getElementById('lateCards')) {
    document.getElementById('lateCards').textContent = statistics.lateCards || 0;
  }
  // Cards in Wins/Losses removed from UI
  // if (document.getElementById('cardsInWins')) {
  //     document.getElementById('cardsInWins').textContent = statistics.cardsInWins || 0;
  // }
  // if (document.getElementById('cardsInLosses')) {
  //     document.getElementById('cardsInLosses').textContent = statistics.cardsInLosses || 0;
  // }

  // xG statistics - Direct from API
  const xgFor = statistics.xgFor || 0;
  const xgAgainst = statistics.xgAgainst || 0;

  // Update only existing xG elements
  if (document.getElementById('xgForTotal')) {
    document.getElementById('xgForTotal').textContent = statistics.xgForPerMatch || '0.00';
  }
  if (document.getElementById('xgAgainstTotal')) {
    document.getElementById('xgAgainstTotal').textContent = statistics.xgAgainstPerMatch || '0.00';
  }
  if (document.getElementById('xgDifference')) {
    document.getElementById('xgDifference').textContent = statistics.xgDifferencePerMatch || '0.00';
  }

  // These elements were removed in the xG redesign - skip them
  // goalsVsXg, overperformance, xgConversionRate, bigChancesCreated, bigChancesMissed

  // Note: First half and halftime statistics are now handled by updateHalftimeStatistics function

  // Update All Stats Scored Per Game data
  const isHome = filter === 'home';
  const isAway = filter === 'away';

  // matches already declared above at line 1325
  const goalsScored = filteredStats.goalsFor || 0;
  const scoredPerMatch = filteredStats.goalsForPerMatch || 0;

  updateElementText('scoredPerMatchAll', scoredPerMatch);

  const minutesPerGoal = goalsScored > 0 ? Math.round((matches * 90) / goalsScored) : 0;
  updateElementText('minutesPerGoalAll', minutesPerGoal > 0 ? `${minutesPerGoal} min` : 'N/A');

  const scoredOver05 = isHome
    ? statistics.seasonScoredOver05Percentage_home
    : (isAway
        ? statistics.seasonScoredOver05Percentage_away
        : statistics.seasonScoredOver05Percentage_overall) || 0;
  const scoredOver15 = isHome
    ? statistics.seasonScoredOver15Percentage_home
    : (isAway
        ? statistics.seasonScoredOver15Percentage_away
        : statistics.seasonScoredOver15Percentage_overall) || 0;
  const scoredOver25 = isHome
    ? statistics.seasonScoredOver25Percentage_home
    : (isAway
        ? statistics.seasonScoredOver25Percentage_away
        : statistics.seasonScoredOver25Percentage_overall) || 0;

  updateElementText('scoredOver05All', `${scoredOver05}%`);
  updateElementText('scoredOver15All', `${scoredOver15}%`);
  updateElementText('scoredOver25All', `${scoredOver25}%`);

  const scoredBothHalves = isHome
    ? statistics.scoredBothHalvesPercentage_home
    : (isAway
        ? statistics.scoredBothHalvesPercentage_away
        : statistics.scoredBothHalvesPercentage_overall) || 0;
  updateElementText('scoredBothHalvesAll', `${scoredBothHalves}%`);

  const firstToScore = isHome
    ? statistics.firstGoalScoredPercentage_home
    : (isAway
        ? statistics.firstGoalScoredPercentage_away
        : statistics.firstGoalScoredPercentage_overall) || 0;
  updateElementText('firstToScoreAll', `${firstToScore}%`);

  const failedToScoreAll = isHome
    ? statistics.seasonFTSPercentage_home
    : (isAway ? statistics.seasonFTSPercentage_away : statistics.seasonFTSPercentage_overall) || 0;
  updateElementText('failedToScoreGoalsAll', `${failedToScoreAll}%`);

  let highestScored;
  if (isHome) {
    highestScored = statistics.seasonHighestScored_home || 0;
  } else if (isAway) {
    highestScored = statistics.seasonHighestScored_away || 0;
  } else {
    const homeHighest = statistics.seasonHighestScored_home || 0;
    const awayHighest = statistics.seasonHighestScored_away || 0;
    highestScored = Math.max(homeHighest, awayHighest);
  }
  updateElementText('highestScoredAll', `${highestScored} Goals`);

  // penaltiesWon and penaltiesConceded already declared above at line 1299-1300
  updateElementText('penaltiesWonGoalsAll', `${penaltiesWon} in ${matches}`);
  updateElementText('penaltiesConcededGoalsAll', `${penaltiesConceded} in ${matches}`);

  const penaltyInMatch = isHome
    ? statistics.penalty_in_a_match_percentage_home
    : (isAway
        ? statistics.penalty_in_a_match_percentage_away
        : statistics.penalty_in_a_match_percentage_overall) || 0;
  updateElementText('penaltyInMatchAll', `${penaltyInMatch}%`);

  // Update Goals tab statistics
  updateGoalsTabStatistics(statistics);

  // Update Corner statistics with current filter
  updateCornerStatistics(statistics, currentCornersFilter);

  // Update Team Corners statistics with current filter
  updateTeamCornersStatistics(statistics, currentTeamCornersFilter);

  // Update Match Cards statistics with current filter
  updateMatchCardsStatistics(statistics, currentMatchCardsFilter);

  // Update Team Cards statistics with current filter
  updateTeamCardsStatistics(statistics, currentTeamCardsFilter);

  // Update Cards tab top stats
  updateCardsTopStats(statistics);

  // IMPORTANT: Re-apply tab visibility after data load
  showTab(currentTab || 'all');
}

function populateMatchList(matches, teamId) {
  const container = document.getElementById('matchesList');
  container.innerHTML = '';

  if (matches && matches.length > 0) {
    const completedMatches = matches
      .filter(
        match =>
          match.status === 'complete' &&
          match.homeScore !== undefined &&
          match.awayScore !== undefined
      )
      .slice(0, 15);

    completedMatches.forEach(match => {
      const isHome = match.homeTeam.id.toString() === teamId.toString();
      const teamScore = isHome ? match.homeScore : match.awayScore;
      const opponentScore = isHome ? match.awayScore : match.homeScore;

      let result = 'D';
      if (teamScore > opponentScore) {
        result = 'W';
      } else if (teamScore < opponentScore) {
        result = 'L';
      }

      const totalGoals = match.homeScore + match.awayScore;

      const matchRow = document.createElement('div');
      matchRow.className = 'match-row';

      // Takım isimlerini belirle ve hangi takımın sayfasında olduğumuzu vurgula
      const homeTeamClass = isHome ? 'match-teams current-team' : 'match-teams';
      const awayTeamClass = !isHome ? 'match-teams current-team' : 'match-teams';

      // Maç detayları için tooltip verisi hazırla
      const hasStats =
        match.stats && (match.stats.corners || match.stats.cards || match.stats.possession);
      const matchId = match.id;

      // Tooltip için başlangıç içeriği
      const tooltipContent =
        hasStats || match.halfTime
          ? `
                <div class="match-tooltip" data-match-id="${matchId}">
                    <div class="tooltip-loading" style="display: none;">
                        <span>Gol detayları yükleniyor...</span>
                    </div>
                    <div class="tooltip-content">
                        ${match.halfTime ? `<div class="tooltip-row"><span>İlk Yarı:</span><strong>${match.halfTime.home || 0} - ${match.halfTime.away || 0}</strong></div>` : ''}
                        <div class="tooltip-row half-time-info" style="display: none;"><span>İlk Yarı:</span><strong class="half-time-score">-</strong></div>
                        ${match.stats?.possession ? `<div class="tooltip-row"><span>Top Kontrolü:</span><strong>${match.stats.possession.home}% - ${match.stats.possession.away}%</strong></div>` : ''}
                        ${match.stats?.corners ? `<div class="tooltip-row"><span>Köşe Vuruşları:</span><strong>${match.stats.corners.home} - ${match.stats.corners.away}</strong></div>` : ''}
                        ${match.stats?.cards ? `<div class="tooltip-row"><span>Kartlar:</span><strong>${match.stats.cards.home} - ${match.stats.cards.away}</strong></div>` : ''}
                        ${match.stadium ? `<div class="tooltip-row"><span>Stadyum:</span><strong>${match.stadium}</strong></div>` : ''}
                        <div class="goal-details" style="display: none;"></div>
                    </div>
                </div>
            `
          : '';

      matchRow.innerHTML = `
                <div class="match-date">${new Date(match.date).toLocaleDateString('tr-TR', { month: 'short', day: 'numeric' })}</div>
                <div class="${homeTeamClass}">${match.homeTeam.name}</div>
                <div class="match-score-wrapper">
                    <div class="match-score" ${hasStats || match.halfTime ? 'data-tooltip="true"' : ''}>${match.homeScore} - ${match.awayScore}</div>
                    ${tooltipContent}
                </div>
                <div class="${awayTeamClass}">${match.awayTeam.name}</div>
                <div class="form-badge form-${result}">${result}</div>
            `;
      container.appendChild(matchRow);
    });
  }

  if (container.children.length === 0) {
    container.innerHTML =
      '<div style="text-align: center; padding: 40px; opacity: 0.7;">Henüz tamamlanan maç verisi bulunmuyor</div>';
  }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  // Set initial data-active-tab attribute
  document.body.setAttribute('data-active-tab', 'all');

  // FIRST: Initialize with 'all' tab to properly hide/show categories
  showTab('all');

  const urlParams = new URLSearchParams(window.location.search);
  const teamId = urlParams.get('id') || urlParams.get('teamId');

  // Commented out - loadTeamData is called in DOMContentLoaded
  // if (teamId) {
  //   loadTeamData(teamId);
  // }

  // Initialize match details hover functionality
  initializeMatchDetailsHover();
});

// Match details hover functionality
function initializeMatchDetailsHover() {
  document.addEventListener('mouseover', async e => {
    const matchScore = e.target.closest('.match-score[data-tooltip="true"]');
    if (!matchScore) {
      return;
    }

    const wrapper = matchScore.parentElement;
    const tooltip = wrapper.querySelector('.match-tooltip');
    if (!tooltip) {
      return;
    }

    const matchId = tooltip.getAttribute('data-match-id');
    if (!matchId) {
      return;
    }

    // Check if we already loaded data for this match
    if (tooltip.getAttribute('data-loaded') === 'true') {
      return;
    }

    // Show loading state
    const loadingDiv = tooltip.querySelector('.tooltip-loading');
    const contentDiv = tooltip.querySelector('.tooltip-content');
    if (loadingDiv) {
      loadingDiv.style.display = 'block';
    }

    try {
      // Use API Client instead of direct fetch
      const details = await TeamStatsAPIClient.getMatchDetails(matchId);

      if (details) {

        // Build goal details HTML
        let goalDetailsHTML = '';

        if (details.homeTeam.goalDetails.length > 0 || details.awayTeam.goalDetails.length > 0) {
          goalDetailsHTML =
            '<div class="goal-details-section" style="margin-top: 8px; padding-top: 8px; border-top: 1px solid rgba(255, 255, 255, 0.1);">';
          goalDetailsHTML +=
            '<div style="font-weight: 600; margin-bottom: 4px; color: #4CAF50;">⚽ Gol Detayları</div>';

          // Home team goals
          if (details.homeTeam.goalDetails.length > 0) {
            goalDetailsHTML += `<div style="margin-bottom: 4px;"><span style="color: rgba(255, 255, 255, 0.6);">${details.homeTeam.name}:</span>`;
            details.homeTeam.goalDetails.forEach(goal => {
              goalDetailsHTML += ` <span style="color: #ffeb3b;">${goal.minute}'</span>`;
            });
            goalDetailsHTML += '</div>';
          }

          // Away team goals
          if (details.awayTeam.goalDetails.length > 0) {
            goalDetailsHTML += `<div><span style="color: rgba(255, 255, 255, 0.6);">${details.awayTeam.name}:</span>`;
            details.awayTeam.goalDetails.forEach(goal => {
              goalDetailsHTML += ` <span style="color: #ffeb3b;">${goal.minute}'</span>`;
            });
            goalDetailsHTML += '</div>';
          }

          goalDetailsHTML += '</div>';
        }

        // Update tooltip content with goal details
        const goalDetailsDiv = tooltip.querySelector('.goal-details');
        if (goalDetailsDiv) {
          goalDetailsDiv.innerHTML = goalDetailsHTML;
          goalDetailsDiv.style.display = goalDetailsHTML ? 'block' : 'none';
        }

        // Update half time score if available
        if (
          details.halfTime &&
          (details.halfTime.home !== null || details.halfTime.away !== null)
        ) {
          const halfTimeInfo = tooltip.querySelector('.half-time-info');
          const halfTimeScore = tooltip.querySelector('.half-time-score');
          if (halfTimeInfo && halfTimeScore) {
            halfTimeScore.textContent = `${details.halfTime.home || 0} - ${details.halfTime.away || 0}`;
            halfTimeInfo.style.display = 'flex';
          }
        }

        if (details.stats) {
          // Update possession if not already there
          if (!contentDiv.innerHTML.includes('Top Kontrolü') && details.stats.possession) {
            const possessionRow = `<div class="tooltip-row"><span>Top Kontrolü:</span><strong>${details.stats.possession.home}% - ${details.stats.possession.away}%</strong></div>`;
            contentDiv.insertAdjacentHTML('afterbegin', possessionRow);
          }

          // Update corners if not already there
          if (!contentDiv.innerHTML.includes('Köşe Vuruşları') && details.stats.corners) {
            const cornersRow = `<div class="tooltip-row"><span>Köşe Vuruşları:</span><strong>${details.stats.corners.home} - ${details.stats.corners.away}</strong></div>`;
            contentDiv.insertAdjacentHTML('beforeend', cornersRow);
          }
        }

        // Mark as loaded
        tooltip.setAttribute('data-loaded', 'true');
      }
    } catch (error) {
      console.error('Error fetching match details:', error);
    } finally {
      // Hide loading state
      if (loadingDiv) {
        loadingDiv.style.display = 'none';
      }
    }
  });
}

// Function to update goal timing bars
function updateGoalTimingBars(statistics) {
  if (!statistics) {
    return;
  }

  const filter = currentGoalTimingsFilter;
  const isHome = filter === 'home';
  const isAway = filter === 'away';

  // Goals Scored data based on filter
  const goalsScored = [
    {
      period: '0_15',
      value: isHome
        ? statistics.homeGoals0_15
        : (isAway ? statistics.awayGoals0_15 : statistics.goals0_15) || 0,
    },
    {
      period: '16_30',
      value: isHome
        ? statistics.homeGoals16_30
        : (isAway ? statistics.awayGoals16_30 : statistics.goals16_30) || 0,
    },
    {
      period: '31_45',
      value: isHome
        ? statistics.homeGoals31_45
        : (isAway ? statistics.awayGoals31_45 : statistics.goals31_45) || 0,
    },
    {
      period: '46_60',
      value: isHome
        ? statistics.homeGoals46_60
        : (isAway ? statistics.awayGoals46_60 : statistics.goals46_60) || 0,
    },
    {
      period: '61_75',
      value: isHome
        ? statistics.homeGoals61_75
        : (isAway ? statistics.awayGoals61_75 : statistics.goals61_75) || 0,
    },
    {
      period: '76_90',
      value: isHome
        ? statistics.homeGoals76_90
        : (isAway ? statistics.awayGoals76_90 : statistics.goals76_90) || 0,
    },
  ];

  // Goals Conceded data based on filter
  const goalsConceded = [
    {
      period: '0_15',
      value: isHome
        ? statistics.homeGoalsConc0_15
        : (isAway ? statistics.awayGoalsConc0_15 : statistics.goalsConc0_15) || 0,
    },
    {
      period: '16_30',
      value: isHome
        ? statistics.homeGoalsConc16_30
        : (isAway ? statistics.awayGoalsConc16_30 : statistics.goalsConc16_30) || 0,
    },
    {
      period: '31_45',
      value: isHome
        ? statistics.homeGoalsConc31_45
        : (isAway ? statistics.awayGoalsConc31_45 : statistics.goalsConc31_45) || 0,
    },
    {
      period: '46_60',
      value: isHome
        ? statistics.homeGoalsConc46_60
        : (isAway ? statistics.awayGoalsConc46_60 : statistics.goalsConc46_60) || 0,
    },
    {
      period: '61_75',
      value: isHome
        ? statistics.homeGoalsConc61_75
        : (isAway ? statistics.awayGoalsConc61_75 : statistics.goalsConc61_75) || 0,
    },
    {
      period: '76_90',
      value: isHome
        ? statistics.homeGoalsConc76_90
        : (isAway ? statistics.awayGoalsConc76_90 : statistics.goalsConc76_90) || 0,
    },
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
      bar.style.width = `${Math.max(widthPercentage, 15)}%`; // Minimum 15% width for visibility
      value.innerHTML = `<span>${goal.value}</span><span>(${dataPercentage}%)</span>`;

      // Add highest-value class to the bar with max value
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
      const dataPercentage =
        totalConceded > 0 ? ((goal.value / totalConceded) * 100).toFixed(1) : 0;
      bar.style.width = `${Math.max(widthPercentage, 15)}%`; // Minimum 15% width for visibility
      value.innerHTML = `<span>${goal.value}</span><span>(${dataPercentage}%)</span>`;

      // Add highest-value class to the bar with max value
      if (goal.value === maxConceded && goal.value > 0) {
        bar.classList.add('highest-value');
      } else {
        bar.classList.remove('highest-value');
      }
    }
  });
}

// Function to update shots statistics
function updateShotsStatistics(statistics) {
  if (!statistics) {
    return;
  }

  const filter = currentShotsFilter;
  const isHome = filter === 'home';
  const isAway = filter === 'away';

  // Team Shots - Direct API data
  const shotsPerMatch = isHome
    ? statistics.homeShotsAVG
    : (isAway ? statistics.awayShotsAVG : statistics.shotsAVG) || 0;
  const shotsOnTargetPerMatch = isHome
    ? statistics.homeShotsOnTargetAVG
    : (isAway ? statistics.awayShotsOnTargetAVG : statistics.shotsOnTargetAVG) || 0;
  const shotsOffTargetPerMatch = isHome
    ? statistics.homeShotsOffTargetAVG
    : (isAway ? statistics.awayShotsOffTargetAVG : statistics.shotsOffTargetAVG) || 0;
  const shotsConversionRate = isHome
    ? statistics.homeShotsConversionRate
    : (isAway ? statistics.awayShotsConversionRate : statistics.shotsConversionRate) || 0;
  const shotsPerGoal = isHome
    ? statistics.homeShotsPerGoal
    : (isAway ? statistics.awayShotsPerGoal : statistics.shotsPerGoal) || 0;
  const shotsOnTargetPerGoal = isHome
    ? statistics.homeShotsOnTargetPerGoal
    : (isAway ? statistics.awayShotsOnTargetPerGoal : statistics.shotsOnTargetPerGoal) || 0;

  updateElementText('shotsPerMatch', Math.round(shotsPerMatch * 100) / 100);
  updateElementText('shotsOnTargetPerMatch', Math.round(shotsOnTargetPerMatch * 100) / 100);
  updateElementText('shotsOffTargetPerMatch', Math.round(shotsOffTargetPerMatch * 100) / 100);
  updateElementText('shotsConversionRate', `${Math.round(shotsConversionRate)}%`);
  updateElementText('shotsPerGoal', Math.round(shotsPerGoal * 10) / 10);
  updateElementText('shotsOnTargetPerGoal', Math.round(shotsOnTargetPerGoal * 10) / 10);

  // Over shots percentages
  const shotsOver10_5 = isHome
    ? statistics.homeShotsOver10_5
    : (isAway ? statistics.awayShotsOver10_5 : statistics.shotsOver10_5) || 0;
  const shotsOver11_5 = isHome
    ? statistics.homeShotsOver11_5
    : (isAway ? statistics.awayShotsOver11_5 : statistics.shotsOver11_5) || 0;
  const shotsOver12_5 = isHome
    ? statistics.homeShotsOver12_5
    : (isAway ? statistics.awayShotsOver12_5 : statistics.shotsOver12_5) || 0;
  const shotsOver13_5 = isHome
    ? statistics.homeShotsOver13_5
    : (isAway ? statistics.awayShotsOver13_5 : statistics.shotsOver13_5) || 0;
  const shotsOver14_5 = isHome
    ? statistics.homeShotsOver14_5
    : (isAway ? statistics.awayShotsOver14_5 : statistics.shotsOver14_5) || 0;
  const shotsOver15_5 = isHome
    ? statistics.homeShotsOver15_5
    : (isAway ? statistics.awayShotsOver15_5 : statistics.shotsOver15_5) || 0;

  updateElementText('teamShotsOver10_5', `${shotsOver10_5}%`);
  updateElementText('teamShotsOver11_5', `${shotsOver11_5}%`);
  updateElementText('teamShotsOver12_5', `${shotsOver12_5}%`);
  updateElementText('teamShotsOver13_5', `${shotsOver13_5}%`);
  updateElementText('teamShotsOver14_5', `${shotsOver14_5}%`);
  updateElementText('teamShotsOver15_5', `${shotsOver15_5}%`);

  // Shots on target over percentages
  const shotsOnTargetOver3_5 = isHome
    ? statistics.homeShotsOnTargetOver3_5
    : (isAway ? statistics.awayShotsOnTargetOver3_5 : statistics.shotsOnTargetOver3_5) || 0;
  const shotsOnTargetOver4_5 = isHome
    ? statistics.homeShotsOnTargetOver4_5
    : (isAway ? statistics.awayShotsOnTargetOver4_5 : statistics.shotsOnTargetOver4_5) || 0;
  const shotsOnTargetOver5_5 = isHome
    ? statistics.homeShotsOnTargetOver5_5
    : (isAway ? statistics.awayShotsOnTargetOver5_5 : statistics.shotsOnTargetOver5_5) || 0;
  const shotsOnTargetOver6_5 = isHome
    ? statistics.homeShotsOnTargetOver6_5
    : (isAway ? statistics.awayShotsOnTargetOver6_5 : statistics.shotsOnTargetOver6_5) || 0;

  updateElementText('teamShotsOnTargetOver3_5', `${shotsOnTargetOver3_5}%`);
  updateElementText('teamShotsOnTargetOver4_5', `${shotsOnTargetOver4_5}%`);
  updateElementText('teamShotsOnTargetOver5_5', `${shotsOnTargetOver5_5}%`);
  updateElementText('teamShotsOnTargetOver6_5', `${shotsOnTargetOver6_5}%`);

  // Match Shots - Direct API data
  const matchShotsOver23_5 = isHome
    ? statistics.homeMatchShotsOver23_5
    : (isAway ? statistics.awayMatchShotsOver23_5 : statistics.matchShotsOver23_5) || 0;
  const matchShotsOver24_5 = isHome
    ? statistics.homeMatchShotsOver24_5
    : (isAway ? statistics.awayMatchShotsOver24_5 : statistics.matchShotsOver24_5) || 0;
  const matchShotsOver25_5 = isHome
    ? statistics.homeMatchShotsOver25_5
    : (isAway ? statistics.awayMatchShotsOver25_5 : statistics.matchShotsOver25_5) || 0;
  const matchShotsOver26_5 = isHome
    ? statistics.homeMatchShotsOver26_5
    : (isAway ? statistics.awayMatchShotsOver26_5 : statistics.matchShotsOver26_5) || 0;

  updateElementText('matchShotsOver23_5', `${matchShotsOver23_5}%`);
  updateElementText('matchShotsOver24_5', `${matchShotsOver24_5}%`);
  updateElementText('matchShotsOver25_5', `${matchShotsOver25_5}%`);
  updateElementText('matchShotsOver26_5', `${matchShotsOver26_5}%`);

  // Match Shots On Target Over percentages
  const matchShotsOnTargetOver7_5 = isHome
    ? statistics.homeMatchShotsOnTargetOver7_5
    : (isAway ? statistics.awayMatchShotsOnTargetOver7_5 : statistics.matchShotsOnTargetOver7_5) ||
      0;
  const matchShotsOnTargetOver8_5 = isHome
    ? statistics.homeMatchShotsOnTargetOver8_5
    : (isAway ? statistics.awayMatchShotsOnTargetOver8_5 : statistics.matchShotsOnTargetOver8_5) ||
      0;
  const matchShotsOnTargetOver9_5 = isHome
    ? statistics.homeMatchShotsOnTargetOver9_5
    : (isAway ? statistics.awayMatchShotsOnTargetOver9_5 : statistics.matchShotsOnTargetOver9_5) ||
      0;

  updateElementText('matchShotsOnTargetOver7_5', `${matchShotsOnTargetOver7_5}%`);
  updateElementText('matchShotsOnTargetOver8_5', `${matchShotsOnTargetOver8_5}%`);
  updateElementText('matchShotsOnTargetOver9_5', `${matchShotsOnTargetOver9_5}%`);

  // Offsides - Direct API data
  const matchOffsidesAvg = isHome
    ? statistics.homeMatchOffsidesAvg
    : (isAway ? statistics.awayMatchOffsidesAvg : statistics.matchOffsidesAvg) || 0;
  const matchOffsidesOver0_5 = isHome
    ? statistics.homeMatchOffsidesOver0_5
    : (isAway ? statistics.awayMatchOffsidesOver0_5 : statistics.matchOffsidesOver0_5) || 0;
  const matchOffsidesOver1_5 = isHome
    ? statistics.homeMatchOffsidesOver1_5
    : (isAway ? statistics.awayMatchOffsidesOver1_5 : statistics.matchOffsidesOver1_5) || 0;
  const matchOffsidesOver2_5 = isHome
    ? statistics.homeMatchOffsidesOver2_5
    : (isAway ? statistics.awayMatchOffsidesOver2_5 : statistics.matchOffsidesOver2_5) || 0;
  const matchOffsidesOver3_5 = isHome
    ? statistics.homeMatchOffsidesOver3_5
    : (isAway ? statistics.awayMatchOffsidesOver3_5 : statistics.matchOffsidesOver3_5) || 0;

  updateElementText('matchOffsidesAvg', Math.round(matchOffsidesAvg * 100) / 100);
  updateElementText('matchOffsidesOver0_5', `${Math.round(matchOffsidesOver0_5)}%`);
  updateElementText('matchOffsidesOver1_5', `${Math.round(matchOffsidesOver1_5)}%`);
  updateElementText('matchOffsidesOver2_5', `${Math.round(matchOffsidesOver2_5)}%`);
  updateElementText('matchOffsidesOver3_5', `${Math.round(matchOffsidesOver3_5)}%`);

  // Team Offsides
  const teamOffsidesAvg = isHome
    ? statistics.homeOffsidesAvg
    : (isAway ? statistics.awayOffsidesAvg : statistics.offsidesAvg) || 0;
  const teamOffsidesOver0_5 = isHome
    ? statistics.homeOffsidesOver0_5
    : (isAway ? statistics.awayOffsidesOver0_5 : statistics.offsidesOver0_5) || 0;
  const teamOffsidesOver1_5 = isHome
    ? statistics.homeOffsidesOver1_5
    : (isAway ? statistics.awayOffsidesOver1_5 : statistics.offsidesOver1_5) || 0;
  const teamOffsidesOver2_5 = isHome
    ? statistics.homeOffsidesOver2_5
    : (isAway ? statistics.awayOffsidesOver2_5 : statistics.offsidesOver2_5) || 0;

  updateElementText('teamOffsidesAvg', Math.round(teamOffsidesAvg * 100) / 100);
  updateElementText('teamOffsidesOver0_5', `${Math.round(teamOffsidesOver0_5)}%`);
  updateElementText('teamOffsidesOver1_5', `${Math.round(teamOffsidesOver1_5)}%`);
  updateElementText('teamOffsidesOver2_5', `${Math.round(teamOffsidesOver2_5)}%`);

  // Expected Goals (xG) - Direct from API (xg_for_avg_overall, xg_against_avg_overall)
  const xgFor =
    (isHome ? statistics.homeXgFor : isAway ? statistics.awayXgFor : statistics.xgFor) || 0;
  const xgAgainst =
    (isHome
      ? statistics.homeXgAgainst
      : isAway
        ? statistics.awayXgAgainst
        : statistics.xgAgainst) || 0;

  updateElementText('xgFor', (Math.round(xgFor * 100) / 100).toFixed(2));
  updateElementText('xgAgainst', (Math.round(xgAgainst * 100) / 100).toFixed(2));
}

// Team Corners filter state

// Set Team Corners filter
window.setTeamCornersFilter = function (filter) {
  currentTeamCornersFilter = filter;

  // Update tab appearance
  document
    .querySelectorAll('#teamCornersOverallFilter, #teamCornersHomeFilter, #teamCornersAwayFilter')
    .forEach(tab => tab.classList.remove('active'));
  document
    .getElementById(`teamCorners${filter.charAt(0).toUpperCase()}${filter.slice(1)}Filter`)
    .classList.add('active');

  // Update team corners statistics if data is loaded
  if (globalStatistics) {
    updateTeamCornersStatistics(globalStatistics, filter);
  }
};

// Update Team Corners statistics
function updateTeamCornersStatistics(statistics, filter) {
  if (!statistics) {
    console.error('updateTeamCornersStatistics: No statistics data provided');
    return;
  }

  const isHome = filter === 'home';
  const isAway = filter === 'away';

  // Determine which stats to use based on filter
  const filteredStats = isHome
    ? {
        avgCornersFor: statistics.homeCornersAVG || 0,
        totalCornersFor: Math.round(
          (statistics.homeCornersAVG || 0) * (statistics.homeMatches || 0)
        ),
        avgCornersAgainst: statistics.homeCornersAgainstAVG || 0,
        totalCornersAgainst: Math.round(
          (statistics.homeCornersAgainstAVG || 0) * (statistics.homeMatches || 0)
        ),
        cornersFor1H: statistics.corners1H_AVG_home || 0,
        cornersFor2H: statistics.corners2H_AVG_home || 0,
        cornersAgainst1H: statistics.homeCornersAgainst1HAvg || 0,
        cornersAgainst2H: statistics.homeCornersAgainst2HAvg || 0,
        over25CornersFor: statistics.over25CornersForPercentage_home || 0,
        over35CornersFor: statistics.over35CornersForPercentage_home || 0,
        over45CornersFor: statistics.over45CornersForPercentage_home || 0,
        over55CornersFor: statistics.over55CornersForPercentage_home || 0,
        over65CornersFor: statistics.over65CornersForPercentage_home || 0,
        over75CornersFor: statistics.over75CornersForPercentage_home || 0,
        over85CornersFor: statistics.over85CornersForPercentage_home || 0,
        over25CornersAgainst: statistics.over25CornersAgainstPercentage_home || 0,
        over35CornersAgainst: statistics.over35CornersAgainstPercentage_home || 0,
        over45CornersAgainst: statistics.over45CornersAgainstPercentage_home || 0,
        over55CornersAgainst: statistics.over55CornersAgainstPercentage_home || 0,
        over65CornersAgainst: statistics.over65CornersAgainstPercentage_home || 0,
        over75CornersAgainst: statistics.over75CornersAgainstPercentage_home || 0,
        over85CornersAgainst: statistics.over85CornersAgainstPercentage_home || 0,
        highestCornersFor: statistics.cornersForHighest_home || 0,
        highestCornersAgainst: statistics.cornersAgainstHighest_home || 0,
        matches: statistics.homeGames || statistics.homeMatches || 0,
      }
    : isAway
      ? {
          avgCornersFor: statistics.awayCornersAVG || 0,
          totalCornersFor: Math.round(
            (statistics.awayCornersAVG || 0) * (statistics.awayMatches || 0)
          ),
          avgCornersAgainst: statistics.awayCornersAgainstAVG || 0,
          totalCornersAgainst: Math.round(
            (statistics.awayCornersAgainstAVG || 0) * (statistics.awayMatches || 0)
          ),
          cornersFor1H: statistics.corners1H_AVG_away || 0,
          cornersFor2H: statistics.corners2H_AVG_away || 0,
          cornersAgainst1H: statistics.awayCornersAgainst1HAvg || 0,
          cornersAgainst2H: statistics.awayCornersAgainst2HAvg || 0,
          over25CornersFor: statistics.over25CornersForPercentage_away || 0,
          over35CornersFor: statistics.over35CornersForPercentage_away || 0,
          over45CornersFor: statistics.over45CornersForPercentage_away || 0,
          over55CornersFor: statistics.over55CornersForPercentage_away || 0,
          over65CornersFor: statistics.over65CornersForPercentage_away || 0,
          over75CornersFor: statistics.over75CornersForPercentage_away || 0,
          over85CornersFor: statistics.over85CornersForPercentage_away || 0,
          over25CornersAgainst: statistics.over25CornersAgainstPercentage_away || 0,
          over35CornersAgainst: statistics.over35CornersAgainstPercentage_away || 0,
          over45CornersAgainst: statistics.over45CornersAgainstPercentage_away || 0,
          over55CornersAgainst: statistics.over55CornersAgainstPercentage_away || 0,
          over65CornersAgainst: statistics.over65CornersAgainstPercentage_away || 0,
          over75CornersAgainst: statistics.over75CornersAgainstPercentage_away || 0,
          over85CornersAgainst: statistics.over85CornersAgainstPercentage_away || 0,
          highestCornersFor: statistics.cornersForHighest_away || 0,
          highestCornersAgainst: statistics.cornersAgainstHighest_away || 0,
          matches: statistics.awayGames || statistics.awayMatches || 0,
        }
      : {
          avgCornersFor: statistics.cornersAVG || statistics.cornersEarnedPerMatch || 0,
          totalCornersFor: Math.round(
            (statistics.cornersAVG || 0) * (statistics.totalMatches || 0)
          ),
          avgCornersAgainst: statistics.cornersAgainstAVG || statistics.cornersAgainstPerMatch || 0,
          totalCornersAgainst: Math.round(
            (statistics.cornersAgainstAVG || 0) * (statistics.totalMatches || 0)
          ),
          cornersFor1H: statistics.corners1H_AVG_overall || 0,
          cornersFor2H: statistics.corners2H_AVG_overall || 0,
          cornersAgainst1H: statistics.cornersAgainst1HAvg || 0,
          cornersAgainst2H: statistics.cornersAgainst2HAvg || 0,
          over25CornersFor: statistics.over25CornersForPercentage_overall || 0,
          over35CornersFor: statistics.over35CornersForPercentage_overall || 0,
          over45CornersFor: statistics.over45CornersForPercentage_overall || 0,
          over55CornersFor: statistics.over55CornersForPercentage_overall || 0,
          over65CornersFor: statistics.over65CornersForPercentage_overall || 0,
          over75CornersFor: statistics.over75CornersForPercentage_overall || 0,
          over85CornersFor: statistics.over85CornersForPercentage_overall || 0,
          over25CornersAgainst: statistics.over25CornersAgainstPercentage_overall || 0,
          over35CornersAgainst: statistics.over35CornersAgainstPercentage_overall || 0,
          over45CornersAgainst: statistics.over45CornersAgainstPercentage_overall || 0,
          over55CornersAgainst: statistics.over55CornersAgainstPercentage_overall || 0,
          over65CornersAgainst: statistics.over65CornersAgainstPercentage_overall || 0,
          over75CornersAgainst: statistics.over75CornersAgainstPercentage_overall || 0,
          over85CornersAgainst: statistics.over85CornersAgainstPercentage_overall || 0,
          highestCornersFor: statistics.cornersForHighest_overall || 0,
          highestCornersAgainst: statistics.cornersAgainstHighest_overall || 0,
          matches: statistics.completedMatches || statistics.totalMatches || 0,
        };

  // Helper function to update element text
  const updateElement = (id, value) => {
    const element = document.getElementById(id);
    if (element) {
      element.textContent = value;
    }
  };

  // Update Corners Earned stats
  updateElement('teamCorners-avgEarned', filteredStats.avgCornersFor.toFixed(2));
  updateElement('teamCorners-totalEarned', filteredStats.totalCornersFor);

  // More Corners Than Opponent percentage
  const moreThanOpponent = isHome
    ? statistics.winMostCornersPercentage_home
    : (isAway
        ? statistics.winMostCornersPercentage_away
        : statistics.winMostCornersPercentage_overall) || 0;
  updateElement('teamCorners-moreThanOpponent', `${moreThanOpponent}%`);

  // Over percentages for corners earned
  updateElement('teamCorners-earnedOver25', `${filteredStats.over25CornersFor}%`);
  updateElement('teamCorners-earnedOver35', `${filteredStats.over35CornersFor}%`);
  updateElement('teamCorners-earnedOver45', `${filteredStats.over45CornersFor}%`);
  updateElement('teamCorners-earnedOver55', `${filteredStats.over55CornersFor}%`);
  updateElement('teamCorners-earnedOver65', `${filteredStats.over65CornersFor}%`);
  updateElement('teamCorners-earnedOver75', `${filteredStats.over75CornersFor}%`);
  updateElement('teamCorners-earnedOver85', `${filteredStats.over85CornersFor}%`);

  // Update Corners Against stats
  updateElement('teamCorners-avgAgainst', filteredStats.avgCornersAgainst.toFixed(2));
  updateElement('teamCorners-totalAgainst', filteredStats.totalCornersAgainst);

  // Over percentages for corners against
  updateElement('teamCorners-againstOver25', `${filteredStats.over25CornersAgainst}%`);
  updateElement('teamCorners-againstOver35', `${filteredStats.over35CornersAgainst}%`);
  updateElement('teamCorners-againstOver45', `${filteredStats.over45CornersAgainst}%`);
  updateElement('teamCorners-againstOver55', `${filteredStats.over55CornersAgainst}%`);
  updateElement('teamCorners-againstOver65', `${filteredStats.over65CornersAgainst}%`);
  updateElement('teamCorners-againstOver75', `${filteredStats.over75CornersAgainst}%`);
  updateElement('teamCorners-againstOver85', `${filteredStats.over85CornersAgainst}%`);

  // Debug corner data
  console.log('Updated corner statistics:', {
    filter,
    avgCornersFor: filteredStats.avgCornersFor,
    avgCornersAgainst: filteredStats.avgCornersAgainst,
    over25For: filteredStats.over25CornersFor,
    over35For: filteredStats.over35CornersFor,
    over25Against: filteredStats.over25CornersAgainst,
    moreThanOpponent: moreThanOpponent,
  });
}

// Match Cards filter functionality
let currentMatchCardsFilter = 'overall';

window.setMatchCardsFilter = function (filter) {
  currentMatchCardsFilter = filter;

  // Update filter buttons
  document
    .querySelectorAll('#matchCardsOverallFilter, #matchCardsHomeFilter, #matchCardsAwayFilter')
    .forEach(btn => {
      btn.classList.remove('active');
    });
  document
    .getElementById(`matchCards${filter.charAt(0).toUpperCase() + filter.slice(1)}Filter`)
    .classList.add('active');

  // Update match cards statistics
  if (globalStatistics) {
    updateMatchCardsStatistics(globalStatistics, filter);
  }
};

// Function to update Match Cards statistics
function updateMatchCardsStatistics(statistics, filter = 'overall') {
  const isHome = filter === 'home';
  const isAway = filter === 'away';

  // Get filtered data based on selection
  const filteredStats = isHome
    ? {
        cardsAvg: statistics.homeCardsPerMatch || statistics.cardsAVG_home || 0,
        cards1HAvg: statistics.homeCards1H_AVG || statistics.cards1H_AVG_home || 0,
        cards2HAvg: statistics.homeCards2H_AVG || statistics.cards2H_AVG_home || 0,
        cardsOver05:
          statistics.homeCardsOver05 ||
          statistics.homeOver05CardsPercentage ||
          statistics.cardsOver05_home ||
          0,
        cardsOver15: statistics.homeCardsOver15 || 0,
        cardsOver25: statistics.homeCardsOver25 || 0,
        cardsOver35: statistics.homeCardsOver35 || 0,
        cardsOver45: statistics.homeCardsOver45 || 0,
        cardsOver55: statistics.homeCardsOver55 || 0,
        cards1HUnder2:
          statistics.fh_total_cards_under2_percentage_home ||
          statistics.cards1H_under2_percentage_home ||
          0,
        cards1H2to3:
          statistics.fh_total_cards_2to3_percentage_home ||
          statistics.cards1H_2to3_percentage_home ||
          0,
        cards1HOver3:
          statistics.fh_total_cards_over3_percentage_home ||
          statistics.cards1H_over3_percentage_home ||
          0,
        cards2HUnder2:
          statistics['2h_total_cards_under2_percentage_home'] ||
          statistics.cards2H_under2_percentage_home ||
          0,
        cards2H2to3:
          statistics['2h_total_cards_2to3_percentage_home'] ||
          statistics.cards2H_2to3_percentage_home ||
          0,
        cards2HOver3:
          statistics['2h_total_cards_over3_percentage_home'] ||
          statistics.cards2H_over3_percentage_home ||
          0,
        cards1HClean: statistics.cards1H_clean_percentage_home || 0,
        cards2HClean: statistics.cards2H_clean_percentage_home || 0,
        cardsHighest: statistics.cardsHighest_home || statistics.homeCardsHighest || 0,
        cardsLowest: statistics.cardsLowest_home || statistics.homeCardsLowest || 0,
        cards1HMost: statistics.cards1H_highest_home || statistics.cardsHighest1H_home || 0,
        cards2HMost: statistics.cards2H_highest_home || statistics.cardsHighest2H_home || 0,
      }
    : isAway
      ? {
          cardsAvg: statistics.awayCardsPerMatch || statistics.cardsAVG_away || 0,
          cards1HAvg: statistics.awayCards1H_AVG || statistics.cards1H_AVG_away || 0,
          cards2HAvg: statistics.awayCards2H_AVG || statistics.cards2H_AVG_away || 0,
          cardsOver05:
            statistics.awayCardsOver05 ||
            statistics.awayOver05CardsPercentage ||
            statistics.cardsOver05_away ||
            0,
          cardsOver15: statistics.awayCardsOver15 || 0,
          cardsOver25: statistics.awayCardsOver25 || 0,
          cardsOver35: statistics.awayCardsOver35 || 0,
          cardsOver45: statistics.awayCardsOver45 || 0,
          cardsOver55: statistics.awayCardsOver55 || 0,
          cards1HUnder2:
            statistics.fh_total_cards_under2_percentage_away ||
            statistics.cards1H_under2_percentage_away ||
            0,
          cards1H2to3:
            statistics.fh_total_cards_2to3_percentage_away ||
            statistics.cards1H_2to3_percentage_away ||
            0,
          cards1HOver3:
            statistics.fh_total_cards_over3_percentage_away ||
            statistics.cards1H_over3_percentage_away ||
            0,
          cards2HUnder2:
            statistics['2h_total_cards_under2_percentage_away'] ||
            statistics.cards2H_under2_percentage_away ||
            0,
          cards2H2to3:
            statistics['2h_total_cards_2to3_percentage_away'] ||
            statistics.cards2H_2to3_percentage_away ||
            0,
          cards2HOver3:
            statistics['2h_total_cards_over3_percentage_away'] ||
            statistics.cards2H_over3_percentage_away ||
            0,
          cards1HClean: statistics.cards1H_clean_percentage_away || 0,
          cards2HClean: statistics.cards2H_clean_percentage_away || 0,
          cardsHighest: statistics.cardsHighest_away || statistics.awayCardsHighest || 0,
          cardsLowest: statistics.cardsLowest_away || statistics.awayCardsLowest || 0,
          cards1HMost: statistics.cards1H_highest_away || statistics.cardsHighest1H_away || 0,
          cards2HMost: statistics.cards2H_highest_away || statistics.cardsHighest2H_away || 0,
        }
      : {
          cardsAvg: statistics.cardsPerMatch || 0,
          cards1HAvg: statistics.cards1H_AVG || statistics.cards1H_AVG_overall || 0,
          cards2HAvg: statistics.cards2H_AVG || statistics.cards2H_AVG_overall || 0,
          cardsOver05: statistics.cardsOver05 || 0,
          cardsOver15: statistics.cardsOver15 || 0,
          cardsOver25: statistics.cardsOver25 || 0,
          cardsOver35: statistics.cardsOver35 || 0,
          cardsOver45: statistics.cardsOver45 || 0,
          cardsOver55: statistics.cardsOver55 || 0,
          cards1HUnder2:
            statistics.fh_total_cards_under2_percentage_overall ||
            statistics.cards1H_under2_percentage_overall ||
            0,
          cards1H2to3:
            statistics.fh_total_cards_2to3_percentage_overall ||
            statistics.cards1H_2to3_percentage_overall ||
            0,
          cards1HOver3:
            statistics.fh_total_cards_over3_percentage_overall ||
            statistics.cards1H_over3_percentage_overall ||
            0,
          cards2HUnder2:
            statistics['2h_total_cards_under2_percentage_overall'] ||
            statistics.cards2H_under2_percentage_overall ||
            0,
          cards2H2to3:
            statistics['2h_total_cards_2to3_percentage_overall'] ||
            statistics.cards2H_2to3_percentage_overall ||
            0,
          cards2HOver3:
            statistics['2h_total_cards_over3_percentage_overall'] ||
            statistics.cards2H_over3_percentage_overall ||
            0,
          cards1HClean: statistics.cards1H_clean_percentage_overall || 0,
          cards2HClean: statistics.cards2H_clean_percentage_overall || 0,
          cardsHighest: statistics.cardsHighest || statistics.cardsHighest_overall || 0,
          cardsLowest: statistics.cardsLowest || statistics.cardsLowest_overall || 0,
          cards1HMost: statistics.cards1H_highest_overall || statistics.cardsHighest1H_overall || 0,
          cards2HMost: statistics.cards2H_highest_overall || statistics.cardsHighest2H_overall || 0,
        };

  // Helper function to update element
  const updateElement = (id, value) => {
    const element = document.getElementById(id);
    if (element) {
      element.textContent = value;
    }
  };

  // Update Full-Time Cards
  updateElement('matchCardsAvg', filteredStats.cardsAvg.toFixed(2));
  updateElement('matchCardsOver05', `${filteredStats.cardsOver05}%`);
  updateElement('matchCardsOver15', `${filteredStats.cardsOver15}%`);
  updateElement('matchCardsOver25', `${filteredStats.cardsOver25}%`);
  updateElement('matchCardsOver35', `${filteredStats.cardsOver35}%`);
  updateElement('matchCardsOver45', `${filteredStats.cardsOver45}%`);
  updateElement('matchCardsOver55', `${filteredStats.cardsOver55}%`);
  updateElement('matchCardsHighest', filteredStats.cardsHighest);
  updateElement('matchCardsLowest', filteredStats.cardsLowest);

  // Update 1st Half Cards
  console.log('[DEBUG] Updating cards1HAvg element:', {
    filteredStats_cards1HAvg: filteredStats.cards1HAvg,
    displayValue: filteredStats.cards1HAvg.toFixed(2),
    currentFilter: currentCardsFilter
  });
  updateElement('cards1HAvg', filteredStats.cards1HAvg.toFixed(2));
  updateElement('cards1HUnder2', `${filteredStats.cards1HUnder2}%`);
  updateElement('cards1H2to3', `${filteredStats.cards1H2to3}%`);
  updateElement('cards1HOver3', `${filteredStats.cards1HOver3}%`);
  updateElement('cards1HMost', filteredStats.cards1HMost);

  // Update 2nd Half Cards
  updateElement('cards2HAvg', filteredStats.cards2HAvg.toFixed(2));
  updateElement('cards2HUnder2', `${filteredStats.cards2HUnder2}%`);
  updateElement('cards2H2to3', `${filteredStats.cards2H2to3}%`);
  updateElement('cards2HOver3', `${filteredStats.cards2HOver3}%`);
  updateElement('cards2HMost', filteredStats.cards2HMost);
}

// Team Cards filter state and functions
let currentTeamCardsFilter = 'overall';

// Function to update cards statistics
function updateCardsStatistics(stats, filter) {
  const suffix = filter === 'overall' ? '_overall' : `_${filter}`;
  
  // Update Card & Discipline Statistics section
  // Total cards - try multiple field names
  let totalCardsValue = 0;
  if (filter === 'overall') {
    totalCardsValue = stats.cardsTotal_overall || stats.cardsTotal || 0;
  } else if (filter === 'home') {
    totalCardsValue = stats.cardsTotal_home || stats.homeCardsTotal || stats.homeCards || 0;
  } else if (filter === 'away') {
    totalCardsValue = stats.cardsTotal_away || stats.awayCardsTotal || stats.awayCards || 0;
  }
  
  if (document.getElementById('totalCards')) {
    document.getElementById('totalCards').textContent = totalCardsValue;
  }
  
  // Cards per match - try multiple field names
  let cardsPerMatchValue = 0;
  if (filter === 'overall') {
    cardsPerMatchValue = stats.cardsPerMatch || stats.cardsAVG_overall || 0;
  } else if (filter === 'home') {
    cardsPerMatchValue = stats.cardsPerMatch_home || stats.cardsAVG_home || stats.homeCardsPerMatch || 0;
  } else if (filter === 'away') {
    cardsPerMatchValue = stats.cardsPerMatch_away || stats.cardsAVG_away || stats.awayCardsPerMatch || 0;
  }
  
  if (document.getElementById('cardsPerMatch')) {
    document.getElementById('cardsPerMatch').textContent = cardsPerMatchValue.toFixed(2);
  }
  
  // Home/Away cards - show/hide rows based on filter
  const homeCardsRow = document.getElementById('homeCards')?.closest('.stat-row');
  const awayCardsRow = document.getElementById('awayCards')?.closest('.stat-row');
  const homeCardsPerMatchRow = document.getElementById('homeCardsPerMatch')?.closest('.stat-row');
  const awayCardsPerMatchRow = document.getElementById('awayCardsPerMatch')?.closest('.stat-row');
  
  if (filter === 'overall') {
    // Show both home and away rows
    if (homeCardsRow) homeCardsRow.style.display = 'flex';
    if (awayCardsRow) awayCardsRow.style.display = 'flex';
    if (homeCardsPerMatchRow) homeCardsPerMatchRow.style.display = 'flex';
    if (awayCardsPerMatchRow) awayCardsPerMatchRow.style.display = 'flex';
    
    // Update values
    if (document.getElementById('homeCards')) {
      document.getElementById('homeCards').textContent = stats.homeCardsTotal || stats.cardsTotal_home || stats.homeCards || 0;
    }
    if (document.getElementById('awayCards')) {
      document.getElementById('awayCards').textContent = stats.awayCardsTotal || stats.cardsTotal_away || stats.awayCards || 0;
    }
    if (document.getElementById('homeCardsPerMatch')) {
      document.getElementById('homeCardsPerMatch').textContent = (stats.homeCardsPerMatch || stats.cardsPerMatch_home || stats.cardsAVG_home || 0).toFixed(2);
    }
    if (document.getElementById('awayCardsPerMatch')) {
      document.getElementById('awayCardsPerMatch').textContent = (stats.awayCardsPerMatch || stats.cardsPerMatch_away || stats.cardsAVG_away || 0).toFixed(2);
    }
  } else if (filter === 'home') {
    // Hide away rows when home filter is selected
    if (homeCardsRow) homeCardsRow.style.display = 'flex';
    if (awayCardsRow) awayCardsRow.style.display = 'none';
    if (homeCardsPerMatchRow) homeCardsPerMatchRow.style.display = 'flex';
    if (awayCardsPerMatchRow) awayCardsPerMatchRow.style.display = 'none';
  } else if (filter === 'away') {
    // Hide home rows when away filter is selected
    if (homeCardsRow) homeCardsRow.style.display = 'none';
    if (awayCardsRow) awayCardsRow.style.display = 'flex';
    if (homeCardsPerMatchRow) homeCardsPerMatchRow.style.display = 'none';
    if (awayCardsPerMatchRow) awayCardsPerMatchRow.style.display = 'flex';
  }
  
  // Highest/Lowest cards - try multiple field names
  let highestCardsValue = 0;
  let lowestCardsValue = 0;
  
  if (filter === 'overall') {
    highestCardsValue = stats.cardsHighest_overall || stats.cardsHighest || 0;
    lowestCardsValue = stats.cardsLowest_overall || stats.cardsLowest || 0;
  } else if (filter === 'home') {
    highestCardsValue = stats.cardsHighest_home || stats.homeCardsHighest || 0;
    lowestCardsValue = stats.cardsLowest_home || stats.homeCardsLowest || 0;
  } else if (filter === 'away') {
    highestCardsValue = stats.cardsHighest_away || stats.awayCardsHighest || 0;
    lowestCardsValue = stats.cardsLowest_away || stats.awayCardsLowest || 0;
  }
  
  if (document.getElementById('cardsHighest')) {
    document.getElementById('cardsHighest').textContent = highestCardsValue;
  }
  if (document.getElementById('cardsLowest')) {
    document.getElementById('cardsLowest').textContent = lowestCardsValue;
  }
  
  // Card Over Statistics in Card & Discipline section
  const cardOverFields = ['05', '15', '25', '35', '45', '55'];
  cardOverFields.forEach(field => {
    const elementId = `cardsOver${field}`;
    if (document.getElementById(elementId)) {
      let cardOverValue = 0;
      if (filter === 'overall') {
        cardOverValue = stats[`cardsOver${field}_overall`] || stats[`cardsOver${field}`] || stats[`over${field}CardsPercentage_overall`] || 0;
      } else if (filter === 'home') {
        cardOverValue = stats[`cardsOver${field}_home`] || stats[`homeCardsOver${field}`] || stats[`over${field}CardsPercentage_home`] || 0;
      } else if (filter === 'away') {
        cardOverValue = stats[`cardsOver${field}_away`] || stats[`awayCardsOver${field}`] || stats[`over${field}CardsPercentage_away`] || 0;
      }
      document.getElementById(elementId).textContent = `${cardOverValue}%`;
    }
  });
  
  // Match Cards section
  // Cards average
  if (document.getElementById('matchCardsAvg')) {
    document.getElementById('matchCardsAvg').textContent = (stats[`cardsPerMatch${suffix}`] || 0).toFixed(2);
  }
  
  // Match cards over percentages
  cardOverFields.forEach(field => {
    const elementId = `matchCardsOver${field}`;
    if (document.getElementById(elementId)) {
      let cardOverValue = 0;
      if (filter === 'overall') {
        cardOverValue = stats[`cardsOver${field}_overall`] || stats[`cardsOver${field}`] || stats[`over${field}CardsPercentage_overall`] || 0;
      } else if (filter === 'home') {
        cardOverValue = stats[`cardsOver${field}_home`] || stats[`homeCardsOver${field}`] || stats[`over${field}CardsPercentage_home`] || 0;
      } else if (filter === 'away') {
        cardOverValue = stats[`cardsOver${field}_away`] || stats[`awayCardsOver${field}`] || stats[`over${field}CardsPercentage_away`] || 0;
      }
      document.getElementById(elementId).textContent = `${cardOverValue}%`;
    }
  });
  
  // Match cards highest/lowest
  if (document.getElementById('matchCardsHighest')) {
    document.getElementById('matchCardsHighest').textContent = highestCardsValue;
  }
  if (document.getElementById('matchCardsLowest')) {
    document.getElementById('matchCardsLowest').textContent = lowestCardsValue;
  }
  
  // 1st/2nd Half cards
  if (document.getElementById('cards1HAvg')) {
    document.getElementById('cards1HAvg').textContent = (stats[`cards1H_AVG${suffix}`] || 0).toFixed(2);
  }
  if (document.getElementById('cards2HAvg')) {
    document.getElementById('cards2HAvg').textContent = (stats[`cards2H_AVG${suffix}`] || 0).toFixed(2);
  }
  
  // Cards under/over percentages for halves
  const halfCardFields = ['Under2', '2to3', 'Over3'];
  ['1H', '2H'].forEach(half => {
    halfCardFields.forEach(field => {
      const elementId = `cards${half}${field}`;
      const statKey = `cards${half}_${field.toLowerCase()}_percentage${suffix}`;
      
      const elements = document.querySelectorAll(`[id*="${elementId}"]`);
      elements.forEach(el => {
        el.textContent = `${stats[statKey] || 0}%`;
      });
    });
  });
  
  // Team Cards section elements
  updateTeamCardsStatistics(stats, filter);
}

window.setTeamCardsFilter = function (filter) {
  currentTeamCardsFilter = filter;

  // Update tab appearance
  document
    .querySelectorAll('#teamCardsOverallFilter, #teamCardsHomeFilter, #teamCardsAwayFilter')
    .forEach(tab => tab.classList.remove('active'));
  document
    .getElementById(`teamCards${filter.charAt(0).toUpperCase()}${filter.slice(1)}Filter`)
    .classList.add('active');

  // Update team cards statistics if data is loaded
  if (globalStatistics) {
    updateTeamCardsStatistics(globalStatistics, filter);
  }
};

// Update Team Cards statistics
function updateTeamCardsStatistics(statistics, filter) {
  if (!statistics) {
    console.error('updateTeamCardsStatistics: No statistics data provided');
    return;
  }

  console.log('=== Team Cards Debug ===');
  console.log('Filter:', filter);
  console.log('Available fields:');
  console.log('cardsFor:', statistics.cardsFor);
  console.log('cardsFor_overall:', statistics.cardsFor_overall);
  console.log('cardsFor_home:', statistics.cardsFor_home);
  console.log('cardsFor_away:', statistics.cardsFor_away);
  console.log('cardsAgainst:', statistics.cardsAgainst);
  console.log('cardsAgainst_overall:', statistics.cardsAgainst_overall);
  console.log('cardsAgainst_home:', statistics.cardsAgainst_home);
  console.log('cardsAgainst_away:', statistics.cardsAgainst_away);
  console.log('cardsForPerMatch:', statistics.cardsForPerMatch);
  console.log('cardsForPerMatch_overall:', statistics.cardsForPerMatch_overall);
  console.log('cardsForPerMatch_home:', statistics.cardsForPerMatch_home);
  console.log('cardsForPerMatch_away:', statistics.cardsForPerMatch_away);
  console.log('cardsAgainstPerMatch:', statistics.cardsAgainstPerMatch);
  console.log('cardsAgainstPerMatch_overall:', statistics.cardsAgainstPerMatch_overall);
  console.log('cardsAgainstPerMatch_home:', statistics.cardsAgainstPerMatch_home);
  console.log('cardsAgainstPerMatch_away:', statistics.cardsAgainstPerMatch_away);

  // Check for over percentages
  console.log('\nOver percentages:');
  console.log('over15CardsForPercentage:', statistics.over15CardsForPercentage);
  console.log('over15CardsForPercentage_overall:', statistics.over15CardsForPercentage_overall);
  console.log('over15CardsForPercentage_home:', statistics.over15CardsForPercentage_home);
  console.log('over15CardsForPercentage_away:', statistics.over15CardsForPercentage_away);
  console.log('over15CardsAgainstPercentage:', statistics.over15CardsAgainstPercentage);
  console.log(
    'over15CardsAgainstPercentage_overall:',
    statistics.over15CardsAgainstPercentage_overall
  );
  console.log('over15CardsAgainstPercentage_home:', statistics.over15CardsAgainstPercentage_home);
  console.log('over15CardsAgainstPercentage_away:', statistics.over15CardsAgainstPercentage_away);

  // Check all card-related fields
  console.log('\nAll card fields:');
  Object.keys(statistics)
    .filter(k => k.toLowerCase().includes('card'))
    .forEach(key => {
      console.log(`${key}:`, statistics[key]);
    });

  const isHome = filter === 'home';
  const isAway = filter === 'away';

  // Determine which stats to use based on filter
  const filteredStats = isHome
    ? {
        avgCardsFor:
          statistics.cardsForPerMatch_home ||
          statistics.cards_for_avg_home ||
          (statistics.homeCardsFor && statistics.homeMatches
            ? statistics.homeCardsFor / statistics.homeMatches
            : 0),
        totalCardsFor:
          statistics.homeCardsFor || statistics.cardsFor_home || statistics.cards_for_home || 0,
        avgCardsAgainst:
          statistics.cardsAgainstPerMatch_home ||
          statistics.cards_against_avg_home ||
          (statistics.homeCardsAgainst && statistics.homeMatches
            ? statistics.homeCardsAgainst / statistics.homeMatches
            : 0),
        totalCardsAgainst:
          statistics.homeCardsAgainst ||
          statistics.cardsAgainst_home ||
          statistics.cards_against_home ||
          0,
        over05CardsFor:
          statistics.homeOver05CardsForPercentage || statistics.over05CardsForPercentage_home || 0,
        over15CardsFor:
          statistics.homeOver15CardsForPercentage || statistics.over15CardsForPercentage_home || 0,
        over25CardsFor:
          statistics.homeOver25CardsForPercentage || statistics.over25CardsForPercentage_home || 0,
        over35CardsFor:
          statistics.homeOver35CardsForPercentage || statistics.over35CardsForPercentage_home || 0,
        over45CardsFor:
          statistics.homeOver45CardsForPercentage || statistics.over45CardsForPercentage_home || 0,
        over55CardsFor:
          statistics.homeOver55CardsForPercentage || statistics.over55CardsForPercentage_home || 0,
        over65CardsFor:
          statistics.homeOver65CardsForPercentage || statistics.over65CardsForPercentage_home || 0,
        over05CardsAgainst:
          statistics.homeOver05CardsAgainstPercentage ||
          statistics.over05CardsAgainstPercentage_home ||
          0,
        over15CardsAgainst:
          statistics.homeOver15CardsAgainstPercentage ||
          statistics.over15CardsAgainstPercentage_home ||
          0,
        over25CardsAgainst:
          statistics.homeOver25CardsAgainstPercentage ||
          statistics.over25CardsAgainstPercentage_home ||
          0,
        over35CardsAgainst:
          statistics.homeOver35CardsAgainstPercentage ||
          statistics.over35CardsAgainstPercentage_home ||
          0,
        over45CardsAgainst:
          statistics.homeOver45CardsAgainstPercentage ||
          statistics.over45CardsAgainstPercentage_home ||
          0,
        over55CardsAgainst:
          statistics.homeOver55CardsAgainstPercentage ||
          statistics.over55CardsAgainstPercentage_home ||
          0,
        over65CardsAgainst:
          statistics.homeOver65CardsAgainstPercentage ||
          statistics.over65CardsAgainstPercentage_home ||
          0,
        highestCardsFor: statistics.homeCardsForHighest || statistics.cardsForHighest_home || 0,
        highestCardsAgainst:
          statistics.homeCardsAgainstHighest || statistics.cardsAgainstHighest_home || 0,
      }
    : isAway
      ? {
          avgCardsFor:
            statistics.cardsForPerMatch_away ||
            statistics.cards_for_avg_away ||
            (statistics.awayCardsFor && statistics.awayMatches
              ? statistics.awayCardsFor / statistics.awayMatches
              : 0),
          totalCardsFor:
            statistics.awayCardsFor || statistics.cardsFor_away || statistics.cards_for_away || 0,
          avgCardsAgainst:
            statistics.cardsAgainstPerMatch_away ||
            statistics.cards_against_avg_away ||
            (statistics.awayCardsAgainst && statistics.awayMatches
              ? statistics.awayCardsAgainst / statistics.awayMatches
              : 0),
          totalCardsAgainst:
            statistics.awayCardsAgainst ||
            statistics.cardsAgainst_away ||
            statistics.cards_against_away ||
            0,
          over05CardsFor:
            statistics.awayOver05CardsForPercentage ||
            statistics.over05CardsForPercentage_away ||
            0,
          over15CardsFor:
            statistics.awayOver15CardsForPercentage ||
            statistics.over15CardsForPercentage_away ||
            0,
          over25CardsFor:
            statistics.awayOver25CardsForPercentage ||
            statistics.over25CardsForPercentage_away ||
            0,
          over35CardsFor:
            statistics.awayOver35CardsForPercentage ||
            statistics.over35CardsForPercentage_away ||
            0,
          over45CardsFor:
            statistics.awayOver45CardsForPercentage ||
            statistics.over45CardsForPercentage_away ||
            0,
          over55CardsFor:
            statistics.awayOver55CardsForPercentage ||
            statistics.over55CardsForPercentage_away ||
            0,
          over65CardsFor:
            statistics.awayOver65CardsForPercentage ||
            statistics.over65CardsForPercentage_away ||
            0,
          over05CardsAgainst:
            statistics.awayOver05CardsAgainstPercentage ||
            statistics.over05CardsAgainstPercentage_away ||
            0,
          over15CardsAgainst:
            statistics.awayOver15CardsAgainstPercentage ||
            statistics.over15CardsAgainstPercentage_away ||
            0,
          over25CardsAgainst:
            statistics.awayOver25CardsAgainstPercentage ||
            statistics.over25CardsAgainstPercentage_away ||
            0,
          over35CardsAgainst:
            statistics.awayOver35CardsAgainstPercentage ||
            statistics.over35CardsAgainstPercentage_away ||
            0,
          over45CardsAgainst:
            statistics.awayOver45CardsAgainstPercentage ||
            statistics.over45CardsAgainstPercentage_away ||
            0,
          over55CardsAgainst:
            statistics.awayOver55CardsAgainstPercentage ||
            statistics.over55CardsAgainstPercentage_away ||
            0,
          over65CardsAgainst:
            statistics.awayOver65CardsAgainstPercentage ||
            statistics.over65CardsAgainstPercentage_away ||
            0,
          highestCardsFor: statistics.awayCardsForHighest || statistics.cardsForHighest_away || 0,
          highestCardsAgainst:
            statistics.awayCardsAgainstHighest || statistics.cardsAgainstHighest_away || 0,
        }
      : {
          avgCardsFor: statistics.cardsForPerMatch || 0,
          totalCardsFor: statistics.cardsFor || 0,
          avgCardsAgainst: statistics.cardsAgainstPerMatch || 0,
          totalCardsAgainst: statistics.cardsAgainst || 0,
          over05CardsFor: statistics.over05CardsForPercentage || 0,
          over15CardsFor: statistics.over15CardsForPercentage || 0,
          over25CardsFor: statistics.over25CardsForPercentage || 0,
          over35CardsFor: statistics.over35CardsForPercentage || 0,
          over45CardsFor: statistics.over45CardsForPercentage || 0,
          over55CardsFor: statistics.over55CardsForPercentage || 0,
          over65CardsFor: statistics.over65CardsForPercentage || 0,
          over05CardsAgainst: statistics.over05CardsAgainstPercentage || 0,
          over15CardsAgainst: statistics.over15CardsAgainstPercentage || 0,
          over25CardsAgainst: statistics.over25CardsAgainstPercentage || 0,
          over35CardsAgainst: statistics.over35CardsAgainstPercentage || 0,
          over45CardsAgainst: statistics.over45CardsAgainstPercentage || 0,
          over55CardsAgainst: statistics.over55CardsAgainstPercentage || 0,
          over65CardsAgainst: statistics.over65CardsAgainstPercentage || 0,
          highestCardsFor: statistics.cardsForHighest || 0,
          highestCardsAgainst: statistics.cardsAgainstHighest || 0,
        };

  // Debug final values
  console.log('\nFinal filtered stats:', filteredStats);

  // Helper function to update element text
  const updateElement = (id, value) => {
    const element = document.getElementById(id);
    if (element) {
      element.textContent = value;
    }
  };

  // Update Cards For stats
  updateElement('teamCards-avgFor', filteredStats.avgCardsFor.toFixed(2));
  updateElement('teamCards-totalFor', filteredStats.totalCardsFor);
  updateElement('teamCards-forOver05', `${filteredStats.over05CardsFor}%`);
  updateElement('teamCards-forOver15', `${filteredStats.over15CardsFor}%`);
  updateElement('teamCards-forOver25', `${filteredStats.over25CardsFor}%`);
  updateElement('teamCards-forOver35', `${filteredStats.over35CardsFor}%`);
  updateElement('teamCards-forOver45', `${filteredStats.over45CardsFor}%`);
  updateElement('teamCards-forOver55', `${filteredStats.over55CardsFor}%`);
  updateElement('teamCards-forOver65', `${filteredStats.over65CardsFor}%`);
  updateElement('teamCards-highestFor', filteredStats.highestCardsFor);

  // Update Cards Against stats
  updateElement('teamCards-avgAgainst', filteredStats.avgCardsAgainst.toFixed(2));
  updateElement('teamCards-totalAgainst', filteredStats.totalCardsAgainst);
  updateElement('teamCards-againstOver05', `${filteredStats.over05CardsAgainst}%`);
  updateElement('teamCards-againstOver15', `${filteredStats.over15CardsAgainst}%`);
  updateElement('teamCards-againstOver25', `${filteredStats.over25CardsAgainst}%`);
  updateElement('teamCards-againstOver35', `${filteredStats.over35CardsAgainst}%`);
  updateElement('teamCards-againstOver45', `${filteredStats.over45CardsAgainst}%`);
  updateElement('teamCards-againstOver55', `${filteredStats.over55CardsAgainst}%`);
  updateElement('teamCards-againstOver65', `${filteredStats.over65CardsAgainst}%`);
  updateElement('teamCards-highestAgainst', filteredStats.highestCardsAgainst);
}

// Update Cards tab top stats
function updateCardsTopStats(statistics) {
  if (!statistics) {
    return;
  }

  // Cards For Over 1.5 - team receives 2+ cards
  const cardsForOver15 = statistics.over15CardsForPercentage || 0;
  const teamBookedAvg = statistics.cardsForPerMatch || 0;
  const opponentsBookedAvg = statistics.cardsAgainstPerMatch || 0;

  // Update top stats cards
  const updateElement = (id, value) => {
    const element = document.getElementById(id);
    if (element) {
      element.textContent = value;
    }
  };

  updateElement('cardsForOver15Value', `${cardsForOver15}%`);
  updateElement('teamBookedAvgValue', teamBookedAvg.toFixed(2));
  updateElement('opponentsBookedAvgValue', opponentsBookedAvg.toFixed(2));
}

// Add event listeners for tab buttons when DOM is loaded

// Add event listeners for filter buttons
function initializeFilterButtons() {
  // Add click event listeners to all filter buttons
  const filterButtons = document.querySelectorAll('.section-filter[data-filter-type]');
  filterButtons.forEach(button => {
    button.addEventListener('click', function(event) {
      const filterType = this.getAttribute('data-filter-type');
      const filterValue = this.getAttribute('data-filter-value');
      
      if (filterType && filterValue) {
        // Call the appropriate filter function based on type
        switch(filterType) {
          case 'corners':
            setCornersFilter(filterValue);
            break;
          case 'teamCorners':
            setTeamCornersFilter(filterValue);
            break;
          case 'main':
            setMainFilter(filterValue);
            break;
          case 'cards':
            setCardsFilter(filterValue);
            break;
          case 'matchCards':
            setMatchCardsFilter(filterValue);
            break;
          case 'teamCards':
            setTeamCardsFilter(filterValue);
            break;
          case 'overUnder':
            setOverUnderFilter(filterValue);
            break;
          case 'btts':
            setBTTSFilter(filterValue);
            break;
          case 'goalTimings':
            setGoalTimingsFilter(filterValue);
            break;
          case 'xg':
            setXgFilter(filterValue);
            break;
          case 'halftime':
            setHalftimeFilter(filterValue);
            break;
          case 'timing':
            setTimingFilter(filterValue);
            break;
          case 'shots':
            setShotsFilter(filterValue);
            break;
        }
      }
    });
  });
}


document.addEventListener('DOMContentLoaded', function() {
  // Add click event listeners to tab buttons
  const tabButtons = document.querySelectorAll('.tab-button');
  tabButtons.forEach(button => {
    button.addEventListener('click', function(event) {
      const tabName = this.getAttribute('data-tab');
      if (tabName) {
        showTab(tabName, event);
      }
    });
  });

  // Initialize filter buttons
  initializeFilterButtons();
  
  // Load team data if teamId is present in URL
  const urlParams = new URLSearchParams(window.location.search);
  const teamId = urlParams.get('teamId');
  if (teamId) {
    loadTeamData(teamId);
  }
});


