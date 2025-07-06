# Team Stats HTML - Complete Field Analysis

## Overview
This document contains ALL data fields found in team-stats.html, organized by tab and section.

---

## Header Section (Always Visible)
- `teamLogo` - Team logo display
- `teamName` - Team name
- `seasonInfo` - Season information (e.g., "2024/25 Season")
- `leagueInfo` - League name
- `leaguePosition` - League position (e.g., "4th out of 18")

## Top Statistics Cards (Visible on All/Goals tabs)
- `ppgValue` - Points per game value
- `recentForm` - Recent form badges container
- `formText` - Form description text
- `goalsPerMatch` - Goals scored per match
- `concededPerMatch` - Goals conceded per match
- `concededPerMatchCard` - Goals conceded per match (card variant)
- `concededAvg1HCard` - 1st half conceded average (card)
- `concededAvg2HCard` - 2nd half conceded average (card)

## Main Statistics Table (All Stats tab)
### Home Form Row
- `homePlayed` - Home matches played
- `homeWins` - Home wins
- `homeDraws` - Home draws
- `homeLosses` - Home losses
- `homeGoalsFor` - Home goals for
- `homeGoalsAgainst` - Home goals against
- `homeGD` - Home goal difference
- `homePPG` - Home points per game
- `homeFormDisplay` - Home form badges

### Away Form Row
- `awayPlayed` - Away matches played
- `awayWins` - Away wins
- `awayDraws` - Away draws
- `awayLosses` - Away losses
- `awayGoalsFor` - Away goals for
- `awayGoalsAgainst` - Away goals against
- `awayGD` - Away goal difference
- `awayPPG` - Away points per game
- `awayFormDisplay` - Away form badges

### Overall Row
- `totalPlayed` - Total matches played
- `totalWins` - Total wins
- `totalDraws` - Total draws
- `totalLosses` - Total losses
- `totalGoalsFor` - Total goals for
- `totalGoalsAgainst` - Total goals against
- `totalGD` - Total goal difference
- `totalPPG` - Total points per game
- `overallFormDisplay` - Overall form badges

### Prediction Info
- `predictionRisk` - Prediction risk percentage
- `homeAdvantage` - Home advantage percentage

### Team Description Fields
- `teamDescription` - Main description container
- `leagueName` - League name in description
- `teamNameDesc` - Team name in description (1st occurrence)
- `overallFormDesc` - Overall form description
- `winsDesc` - Wins count in description
- `drawsDesc` - Draws count in description
- `lossesDesc` - Losses count in description
- `teamNameDesc2` - Team name (2nd occurrence)
- `positionDesc` - Position description
- `leagueNameDesc` - League name description
- `winPercentageDesc` - Win percentage
- `teamNameDesc3` - Team name (3rd occurrence)
- `homeFormDesc` - Home form description
- `homeResultsDesc` - Home results description
- `awayFormDesc` - Away form description
- `awayResultsDesc` - Away results description
- `teamNameDesc4` - Team name (4th occurrence)
- `totalGoalsDesc` - Total goals description
- `leagueNameDesc2` - League name (2nd occurrence)

---

## ALL STATS TAB

### Basic Statistics Category
- `winsPercentage` - Win percentage
- `drawsPercentage` - Draw percentage
- `lossesPercentage` - Loss percentage
- `goalsForPerMatch` - Goals for per match
- `goalsAgainstPerMatch` - Goals against per match
- `xgForPerMatch` - xG for per match
- `xgAgainstPerMatch` - xG against per match
- `cleanSheetsPercentage` - Clean sheets percentage
- `failedToScorePercentage` - Failed to score percentage
- `pointsPerGame` - Points per game
- `ballPossession` - Ball possession percentage
- `penaltiesWon` - Penalties won
- `penaltiesConceded` - Penalties conceded

### Scored Per Game (All Stats tab)
- `scoredPerMatchAll` - Scored per match
- `minutesPerGoalAll` - Minutes per goal
- `scoredOver05All` - Scored over 0.5 percentage
- `scoredOver15All` - Scored over 1.5 percentage
- `scoredOver25All` - Scored over 2.5 percentage
- `scoredBothHalvesAll` - Scored in both halves percentage
- `firstToScoreAll` - First to score percentage
- `failedToScoreGoalsAll` - Failed to score percentage
- `highestScoredAll` - Highest scored in a match
- `penaltiesWonGoalsAll` - Penalties won stats
- `penaltiesConcededGoalsAll` - Penalties conceded stats
- `penaltyInMatchAll` - Penalty in match percentage

### Corner Stats (All Stats tab)
- `cornersEarnedPerMatch` - Corners earned per match
- `cornersAgainstPerMatch` - Corners against per match
- `totalCornersPerMatch` - Total corners per match
- `cornersOver65` - Corners over 6.5 percentage
- `cornersOver75` - Corners over 7.5 percentage
- `cornersOver85` - Corners over 8.5 percentage
- `over95Corners` - Over 9.5 corners percentage
- `over105Corners` - Over 10.5 corners percentage
- `cornersOver115` - Corners over 11.5 percentage
- `cornersOver125` - Corners over 12.5 percentage
- `cornersOver135` - Corners over 13.5 percentage

### Card & Discipline Statistics (All Stats tab)
- `cardsOverallFilter` - Overall filter button
- `cardsHomeFilter` - Home filter button
- `cardsAwayFilter` - Away filter button
- `cardsStatsContainer` - Stats container
- `totalCards` - Total cards
- `cardsPerMatch` - Cards per match
- `homeCards` - Home cards
- `awayCards` - Away cards
- `homeCardsPerMatch` - Home cards per match
- `awayCardsPerMatch` - Away cards per match
- `cardsHighest` - Highest cards in match
- `cardsLowest` - Lowest cards in match
- `cardsOver05` - Cards over 0.5 percentage
- `cardsOver15` - Cards over 1.5 percentage
- `cardsOver25` - Cards over 2.5 percentage
- `cardsOver35` - Cards over 3.5 percentage
- `cardsOver45` - Cards over 4.5 percentage
- `cardsOver55` - Cards over 5.5 percentage

### Expected Goals (xG) Analysis (All Stats tab)
- `xgOverallFilter` - Overall filter button
- `xgHomeFilter` - Home filter button
- `xgAwayFilter` - Away filter button
- `xgForTotal` - xG for per match
- `xgAgainstTotal` - xG against per match
- `xgDifference` - xG difference per match
- `goalsForAvg` - Goals for average
- `goalsAgainstAvg` - Goals against average
- `goalDifferenceAvg` - Goal difference average

### First Half & Halftime Analysis (All Stats tab)
- `halftimeOverallFilter` - Overall filter button
- `halftimeHomeFilter` - Home filter button
- `halftimeAwayFilter` - Away filter button
- `halftimeColumnHeader` - Column header text
- `firstHalfGoalsScored` - 1st half goals scored
- `firstHalfGoalsScoredMatches` - 1st half goals scored matches
- `firstHalfGoalsScoredPerc` - 1st half goals scored percentage
- `firstHalfGoalsConceded` - 1st half goals conceded
- `firstHalfGoalsConcededMatches` - 1st half goals conceded matches
- `firstHalfGoalsConcededPerc` - 1st half goals conceded percentage
- `leadingAtHT` - Leading at halftime count
- `leadingAtHTMatches` - Leading at HT matches
- `leadingAtHTPerc` - Leading at HT percentage
- `drawingAtHT` - Drawing at halftime count
- `drawingAtHTMatches` - Drawing at HT matches
- `drawingAtHTPerc` - Drawing at HT percentage
- `losingAtHT` - Losing at halftime count
- `losingAtHTMatches` - Losing at HT matches
- `losingAtHTPerc` - Losing at HT percentage

### Timing Analytics (All Stats tab)
- `timingOverallFilter` - Overall filter button
- `timingHomeFilter` - Home filter button
- `timingAwayFilter` - Away filter button
- `timingScoredFilter` - Goals scored filter
- `timingConcededFilter` - Goals conceded filter
- `timingTitle` - Section title
- `goals0_15Bar` - 0-15 min bar width
- `goals0_15Text` - 0-15 min value
- `goals16_30Bar` - 16-30 min bar width
- `goals16_30Text` - 16-30 min value
- `goals31_45Bar` - 31-45 min bar width
- `goals31_45Text` - 31-45 min value
- `goals46_60Bar` - 46-60 min bar width
- `goals46_60Text` - 46-60 min value
- `goals61_75Bar` - 61-75 min bar width
- `goals61_75Text` - 61-75 min value
- `goals76_90Bar` - 76-90 min bar width
- `goals76_90Text` - 76-90 min value

### Match List (All Stats tab)
- `matchesList` - Matches container

---

## GOALS TAB

### Scored Statistics Section
- `mainStatsTitle` - Section title
- `scoredPerMatch` - Scored per match
- `minutesPerGoal` - Minutes per goal
- `scoredOver05` - Scored over 0.5 percentage
- `scoredOver15` - Scored over 1.5 percentage
- `scoredOver25` - Scored over 2.5 percentage
- `scoredBothHalves` - Scored in both halves
- `firstToScore` - First to score percentage
- `failedToScoreGoals` - Failed to score percentage
- `highestScored` - Highest scored in match
- `penaltiesWonGoals` - Penalties won
- `penaltiesConcededGoals` - Penalties conceded
- `penaltyInMatch` - Penalty in match percentage

### Scored 1st Half
- `scoredAvg1H` - 1st half scored average
- `scoredIn1H` - Scored in 1st half percentage
- `failedToScore1H` - Failed to score 1st half
- `goals1HScored` - Goals scored 1st half

### Scored 2nd Half
- `scoredAvg2H` - 2nd half scored average
- `scoredIn2H` - Scored in 2nd half percentage
- `failedToScore2H` - Failed to score 2nd half
- `goals2HScored` - Goals scored 2nd half

### Conceded Statistics Section
- `concededPerMatchStats` - Conceded per match
- `minutesPerGoalConceded` - Minutes per goal conceded
- `concededOver05` - Conceded over 0.5 percentage
- `concededOver15` - Conceded over 1.5 percentage
- `concededOver25` - Conceded over 2.5 percentage
- `cleanSheetsGoals` - Clean sheets percentage
- `highestConceded` - Highest conceded in match

### Conceded 1st Half
- `concededAvg1H` - 1st half conceded average
- `concededIn1H` - Conceded in 1st half percentage
- `cleanSheet1H` - Clean sheet 1st half percentage
- `goals1HConceded` - Goals conceded 1st half

### Conceded 2nd Half
- `concededAvg2H` - 2nd half conceded average
- `concededIn2H` - Conceded in 2nd half percentage
- `cleanSheet2H` - Clean sheet 2nd half percentage
- `goals2HConceded` - Goals conceded 2nd half

### Over/Under Goals Section
#### Full Time
- `matchGoalsAvgFT` - Match goals average FT
- `over05FT` - Over 0.5 FT percentage
- `over15FT` - Over 1.5 FT percentage
- `over25FT` - Over 2.5 FT percentage
- `over35FT` - Over 3.5 FT percentage
- `over45FT` - Over 4.5 FT percentage
- `under05FT` - Under 0.5 FT percentage
- `under15FT` - Under 1.5 FT percentage
- `under25FT` - Under 2.5 FT percentage
- `under35FT` - Under 3.5 FT percentage
- `under45FT` - Under 4.5 FT percentage

#### 1st Half
- `matchGoalsAvgHT` - Match goals average HT
- `over05HT` - Over 0.5 HT percentage
- `over15HT` - Over 1.5 HT percentage
- `over25HT` - Over 2.5 HT percentage
- `under05HT` - Under 0.5 HT percentage
- `under15HT` - Under 1.5 HT percentage
- `under25HT` - Under 2.5 HT percentage

#### 2nd Half
- `matchGoalsAvg2H` - Match goals average 2H
- `over052H` - Over 0.5 2H percentage
- `over152H` - Over 1.5 2H percentage
- `over252H` - Over 2.5 2H percentage
- `under052H` - Under 0.5 2H percentage
- `under152H` - Under 1.5 2H percentage
- `under252H` - Under 2.5 2H percentage

### Both Teams To Score (BTTS) Section
#### Full Match BTTS
- `bttsPercentage` - BTTS percentage
- `bttsAndWin` - BTTS and win percentage
- `bttsAndDraw` - BTTS and draw percentage
- `bttsAndLose` - BTTS and lose percentage
- `bttsAndOver25` - BTTS and over 2.5 percentage
- `btts1H2HYesYes` - BTTS 1H & 2H Yes/Yes
- `btts1H2HYesNo` - BTTS 1H & 2H Yes/No
- `btts1H2HNoYes` - BTTS 1H & 2H No/Yes
- `btts1H2HNoNo` - BTTS 1H & 2H No/No
- `noBtts` - No BTTS percentage

#### 1st Half BTTS
- `bttsPercentageHT` - BTTS 1st half percentage
- `noBttsHT` - No BTTS 1st half percentage

#### 2nd Half BTTS
- `bttsPercentage2H` - BTTS 2nd half percentage
- `noBtts2H` - No BTTS 2nd half percentage

### Goal Timings by 15 Minutes Section
- `goalTimingsOverallFilter` - Overall filter button
- `goalTimingsHomeFilter` - Home filter button
- `goalTimingsAwayFilter` - Away filter button

#### Goals Scored Bars
- `scored0_15Bar` - 0-15 min bar
- `scored0_15Value` - 0-15 min value
- `scored16_30Bar` - 16-30 min bar
- `scored16_30Value` - 16-30 min value
- `scored31_45Bar` - 31-45 min bar
- `scored31_45Value` - 31-45 min value
- `scored46_60Bar` - 46-60 min bar
- `scored46_60Value` - 46-60 min value
- `scored61_75Bar` - 61-75 min bar
- `scored61_75Value` - 61-75 min value
- `scored76_90Bar` - 76-90 min bar
- `scored76_90Value` - 76-90 min value

#### Goals Conceded Bars
- `conceded0_15Bar` - 0-15 min bar
- `conceded0_15Value` - 0-15 min value
- `conceded16_30Bar` - 16-30 min bar
- `conceded16_30Value` - 16-30 min value
- `conceded31_45Bar` - 31-45 min bar
- `conceded31_45Value` - 31-45 min value
- `conceded46_60Bar` - 46-60 min bar
- `conceded46_60Value` - 46-60 min value
- `conceded61_75Bar` - 61-75 min bar
- `conceded61_75Value` - 61-75 min value
- `conceded76_90Bar` - 76-90 min bar
- `conceded76_90Value` - 76-90 min value

### Shots, xG & Offsides Section
- `shotsOverallFilter` - Overall filter button
- `shotsHomeFilter` - Home filter button
- `shotsAwayFilter` - Away filter button

#### Team Shots
- `shotsPerMatch` - Shots per match
- `shotsOnTargetPerMatch` - Shots on target per match
- `shotsOffTargetPerMatch` - Shots off target per match
- `shotsConversionRate` - Shots conversion rate
- `shotsPerGoal` - Shots per goal
- `shotsOnTargetPerGoal` - Shots on target per goal
- `teamShotsOver10_5` - Team shots over 10.5
- `teamShotsOver11_5` - Team shots over 11.5
- `teamShotsOver12_5` - Team shots over 12.5
- `teamShotsOver13_5` - Team shots over 13.5
- `teamShotsOver14_5` - Team shots over 14.5
- `teamShotsOver15_5` - Team shots over 15.5
- `teamShotsOnTargetOver3_5` - Team shots on target over 3.5
- `teamShotsOnTargetOver4_5` - Team shots on target over 4.5
- `teamShotsOnTargetOver5_5` - Team shots on target over 5.5
- `teamShotsOnTargetOver6_5` - Team shots on target over 6.5

#### Match Shots
- `matchShotsOver23_5` - Match shots over 23.5
- `matchShotsOver24_5` - Match shots over 24.5
- `matchShotsOver25_5` - Match shots over 25.5
- `matchShotsOver26_5` - Match shots over 26.5
- `matchShotsOnTargetOver7_5` - Match shots on target over 7.5
- `matchShotsOnTargetOver8_5` - Match shots on target over 8.5
- `matchShotsOnTargetOver9_5` - Match shots on target over 9.5

#### Offsides
- `matchOffsidesAvg` - Match offsides average
- `matchOffsidesOver0_5` - Match offsides over 0.5
- `matchOffsidesOver1_5` - Match offsides over 1.5
- `matchOffsidesOver2_5` - Match offsides over 2.5
- `matchOffsidesOver3_5` - Match offsides over 3.5
- `teamOffsidesAvg` - Team offsides average
- `teamOffsidesOver0_5` - Team offsides over 0.5
- `teamOffsidesOver1_5` - Team offsides over 1.5
- `teamOffsidesOver2_5` - Team offsides over 2.5

#### Expected Goals (Bottom)
- `xgFor` - xG for
- `xgAgainst` - xG against

---

## CORNERS TAB

### Corner Stats Section (Filterable)
- `filter-cornersOverallFilter` - Overall filter button
- `filter-cornersHomeFilter` - Home filter button
- `filter-cornersAwayFilter` - Away filter button
- `filter-cornersEarnedPerMatch` - Corners earned per match
- `filter-cornersAgainstPerMatch` - Corners against per match
- `filter-totalCornersPerMatch` - Total corners per match
- `filter-cornersOver65` - Corners over 6.5
- `filter-cornersOver75` - Corners over 7.5
- `filter-cornersOver85` - Corners over 8.5
- `filter-over95Corners` - Over 9.5 corners
- `filter-over105Corners` - Over 10.5 corners
- `filter-cornersOver115` - Corners over 11.5
- `filter-cornersOver125` - Corners over 12.5
- `filter-cornersOver135` - Corners over 13.5

### Team Corners Section
- `teamCornersOverallFilter` - Overall filter button
- `teamCornersHomeFilter` - Home filter button
- `teamCornersAwayFilter` - Away filter button

#### Corners Earned
- `teamCorners-avgEarned` - Corners earned per match
- `teamCorners-moreThanOpponent` - More corners than opponent percentage
- `teamCorners-earnedOver25` - Over 2.5 earned percentage
- `teamCorners-earnedOver35` - Over 3.5 earned percentage
- `teamCorners-earnedOver45` - Over 4.5 earned percentage
- `teamCorners-earnedOver55` - Over 5.5 earned percentage
- `teamCorners-earnedOver65` - Over 6.5 earned percentage
- `teamCorners-earnedOver75` - Over 7.5 earned percentage
- `teamCorners-earnedOver85` - Over 8.5 earned percentage
- `teamCorners-totalEarned` - Total corners earned

#### Corners Against
- `teamCorners-avgAgainst` - Corners against per match
- `teamCorners-againstOver25` - Over 2.5 against percentage
- `teamCorners-againstOver35` - Over 3.5 against percentage
- `teamCorners-againstOver45` - Over 4.5 against percentage
- `teamCorners-againstOver55` - Over 5.5 against percentage
- `teamCorners-againstOver65` - Over 6.5 against percentage
- `teamCorners-againstOver75` - Over 7.5 against percentage
- `teamCorners-againstOver85` - Over 8.5 against percentage
- `teamCorners-totalAgainst` - Total corners against

---

## CARDS TAB

### Top Statistics Cards (Cards Tab Only)
- `cardsForOver15Value` - Cards for over 1.5 percentage
- `teamBookedAvgValue` - Team booked per match
- `opponentsBookedAvgValue` - Opponents booked per match

### Match Cards Section
- `matchCardsOverallFilter` - Overall filter button
- `matchCardsHomeFilter` - Home filter button
- `matchCardsAwayFilter` - Away filter button
- `matchCardsStatsContainer` - Stats container

#### Full-Time Cards
- `matchCardsAvg` - Match cards average
- `matchCardsOver05` - Over 0.5 cards percentage
- `matchCardsOver15` - Over 1.5 cards percentage
- `matchCardsOver25` - Over 2.5 cards percentage
- `matchCardsOver35` - Over 3.5 cards percentage
- `matchCardsOver45` - Over 4.5 cards percentage
- `matchCardsOver55` - Over 5.5 cards percentage
- `matchCardsHighest` - Highest cards in match
- `matchCardsLowest` - Lowest cards in match

#### 1st Half Cards
- `cards1HAvg` - 1st half cards average
- `cards1HUnder2` - 1st half under 2 cards percentage
- `cards1H2to3` - 1st half 2 to 3 cards percentage
- `cards1HOver3` - 1st half over 3 cards percentage

#### 2nd Half Cards
- `cards2HAvg` - 2nd half cards average
- `cards2HUnder2` - 2nd half under 2 cards percentage
- `cards2H2to3` - 2nd half 2 to 3 cards percentage
- `cards2HOver3` - 2nd half over 3 cards percentage

### Team Cards Section
- `teamCardsOverallFilter` - Overall filter button
- `teamCardsHomeFilter` - Home filter button
- `teamCardsAwayFilter` - Away filter button

#### Cards For
- `teamCards-avgFor` - Cards for per match
- `teamCards-totalFor` - Total cards for
- `teamCards-forOver05` - Over 0.5 cards percentage
- `teamCards-forOver15` - Over 1.5 cards percentage
- `teamCards-forOver25` - Over 2.5 cards percentage
- `teamCards-forOver35` - Over 3.5 cards percentage
- `teamCards-forOver45` - Over 4.5 cards percentage
- `teamCards-forOver55` - Over 5.5 cards percentage
- `teamCards-forOver65` - Over 6.5 cards percentage
- `teamCards-highestFor` - Highest cards for

#### Cards Against
- `teamCards-avgAgainst` - Cards against per match
- `teamCards-totalAgainst` - Total cards against
- `teamCards-againstOver05` - Over 0.5 cards percentage
- `teamCards-againstOver15` - Over 1.5 cards percentage
- `teamCards-againstOver25` - Over 2.5 cards percentage
- `teamCards-againstOver35` - Over 3.5 cards percentage
- `teamCards-againstOver45` - Over 4.5 cards percentage
- `teamCards-againstOver55` - Over 5.5 cards percentage
- `teamCards-againstOver65` - Over 6.5 cards percentage
- `teamCards-highestAgainst` - Highest cards against

---

## SYSTEM ELEMENTS
- `loadingSection` - Loading screen
- `teamSection` - Main content section
- `statsCategories` - Stats categories container

---

## TOTAL FIELD COUNT: 387 unique data fields

### Summary by Tab:
- **Header/Common**: 11 fields
- **All Stats Tab**: ~150 fields
- **Goals Tab**: ~140 fields
- **Corners Tab**: ~36 fields
- **Cards Tab**: ~50 fields

### Missing/Notable Fields to Check:
1. Cards tab seems to be missing some "lowest" card statistics
2. Some percentage fields might need "_overall", "_home", "_away" suffixes
3. Form badges might need individual field IDs
4. Some filter buttons might need state tracking
