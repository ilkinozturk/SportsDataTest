const axios = require('axios');
const fs = require('fs');

const API_KEY = '29581005f929990bf13dc9c964200d537e484ee248f0ac2d0f76910a6ce7aae9';
const BASE_URL = 'https://api.footystats.org/v1';
const SEASON_ID = 13973; // USA MLS - Confirmed working

// This function is copied directly from simple-server-optimized.js
const calculateTeamStats = (matches, teamId) => {
  const stats = {
    totalMatches: matches.length,
    wins: 0,
    draws: 0,
    losses: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    goalDifference: 0,
    homeMatches: 0,
    awayMatches: 0,
    homeWins: 0,
    homeDraws: 0,
    homeLosses: 0,
    awayWins: 0,
    awayDraws: 0,
    awayLosses: 0,
    homeGoalsFor: 0,
    homeGoalsAgainst: 0,
    awayGoalsFor: 0,
    awayGoalsAgainst: 0,
    recentForm: [],
    winPercentage: 0,
    drawPercentage: 0,
    lossPercentage: 0,
    homeWinPercentage: 0,
    awayWinPercentage: 0,
    averageGoalsFor: 0,
    averageGoalsAgainst: 0,
    averageHomeGoalsFor: 0,
    averageAwayGoalsFor: 0,
    cleanSheets: 0,
    failedToScore: 0,
    bigWins: 0,
    bigLosses: 0,
    comebacks: 0,
    lastMinuteGoals: 0,
    currentStreak: { type: '', count: 0 },
    longestWinStreak: 0,
    longestUnbeatenStreak: 0,
    firstHalfGoals: 0,
    secondHalfGoals: 0,
    goalsConced_firstHalf: 0,
    goalsConceded_secondHalf: 0,
    bothTeamsScored: 0,
    over2_5Goals: 0,
    under2_5Goals: 0,
    points: 0,
    pointsPerGame: 0,
    last5Matches: [],
    last10Matches: [],
    formPoints: 0,
    goalsVsTopTeams: 0,
    goalsVsBottomTeams: 0,
    completedMatches: 0,
    upcomingMatches: 0,
  };
  if (matches.length === 0) {
    return stats;
  }
  const sortedMatches = matches.sort((a, b) => {
    const dateA = a.date_unix ? new Date(a.date_unix * 1000) : new Date(a.date || 0);
    const dateB = b.date_unix ? new Date(b.date_unix * 1000) : new Date(b.date || 0);
    return dateA.getTime() - dateB.getTime();
  });
  let currentWinStreak = 0;
  let currentUnbeatenStreak = 0;
  let maxWinStreak = 0;
  let maxUnbeatenStreak = 0;
  const recentResults = [];
  for (const match of sortedMatches) {
    const isHome =
      (match.homeID && match.homeID.toString() === teamId.toString()) ||
      (match.home_id && match.home_id.toString() === teamId.toString());
    const teamGoals = isHome
      ? match.homeGoalCount || match.home_goals || 0
      : match.awayGoalCount || match.away_goals || 0;
    const opponentGoals = isHome
      ? match.awayGoalCount || match.away_goals || 0
      : match.homeGoalCount || match.home_goals || 0;
    const isCompleted =
      match.status === 'complete' ||
      match.status === 'finished' ||
      match.status === 'FT' ||
      (teamGoals >= 0 &&
        opponentGoals >= 0 &&
        (teamGoals > 0 || opponentGoals > 0 || match.status !== 'scheduled'));
    if (isCompleted) {
      stats.completedMatches++;
      stats.goalsFor += teamGoals;
      stats.goalsAgainst += opponentGoals;
      const totalMatchGoals = teamGoals + opponentGoals;
      const goalDiff = teamGoals - opponentGoals;
      let result = '';
      if (goalDiff > 0) {
        stats.wins++;
        stats.points += 3;
        result = 'W';
        currentWinStreak++;
        currentUnbeatenStreak++;
        if (goalDiff >= 3) {
          stats.bigWins++;
        }
      } else if (goalDiff === 0) {
        stats.draws++;
        stats.points += 1;
        result = 'D';
        currentWinStreak = 0;
        currentUnbeatenStreak++;
      } else {
        stats.losses++;
        result = 'L';
        currentWinStreak = 0;
        currentUnbeatenStreak = 0;
        if (goalDiff <= -3) {
          stats.bigLosses++;
        }
      }
      maxWinStreak = Math.max(maxWinStreak, currentWinStreak);
      maxUnbeatenStreak = Math.max(maxUnbeatenStreak, currentUnbeatenStreak);
      recentResults.push(result);
      if (isHome) {
        stats.homeMatches++;
        stats.homeGoalsFor += teamGoals;
        stats.homeGoalsAgainst += opponentGoals;
        if (result === 'W') {
          stats.homeWins++;
        } else if (result === 'D') {
          stats.homeDraws++;
        } else {
          stats.homeLosses++;
        }
      } else {
        stats.awayMatches++;
        stats.awayGoalsFor += teamGoals;
        stats.awayGoalsAgainst += opponentGoals;
        if (result === 'W') {
          stats.awayWins++;
        } else if (result === 'D') {
          stats.awayDraws++;
        } else {
          stats.awayLosses++;
        }
      }
      if (opponentGoals === 0) {
        stats.cleanSheets++;
      }
      if (teamGoals === 0) {
        stats.failedToScore++;
      }
      if (teamGoals > 0 && opponentGoals > 0) {
        stats.bothTeamsScored++;
      }
      if (totalMatchGoals > 2.5) {
        stats.over2_5Goals++;
      } else {
        stats.under2_5Goals++;
      }
      if (stats.recentForm.length < 10) {
        stats.recentForm.unshift(result);
      }
      if (stats.last5Matches.length < 5) {
        stats.last5Matches.push({
          result,
          teamGoals,
          opponentGoals,
          isHome,
          date: match.date_unix,
        });
        if (result === 'W') {
          stats.formPoints += 3;
        } else if (result === 'D') {
          stats.formPoints += 1;
        }
      }
      if (stats.last10Matches.length < 10) {
        stats.last10Matches.push({
          result,
          teamGoals,
          opponentGoals,
          isHome,
          date: match.date_unix,
        });
      }
    } else {
      stats.upcomingMatches++;
    }
  }
  const completedMatches = stats.completedMatches;
  if (completedMatches > 0) {
    stats.winPercentage = Math.round((stats.wins / completedMatches) * 100);
    stats.drawPercentage = Math.round((stats.draws / completedMatches) * 100);
    stats.lossPercentage = Math.round((stats.losses / completedMatches) * 100);
    stats.averageGoalsFor = Math.round((stats.goalsFor / completedMatches) * 100) / 100;
    stats.averageGoalsAgainst = Math.round((stats.goalsAgainst / completedMatches) * 100) / 100;
    stats.pointsPerGame = Math.round((stats.points / completedMatches) * 100) / 100;
    if (stats.homeMatches > 0) {
      stats.homeWinPercentage = Math.round((stats.homeWins / stats.homeMatches) * 100);
      stats.averageHomeGoalsFor = Math.round((stats.homeGoalsFor / stats.homeMatches) * 100) / 100;
    }
    if (stats.awayMatches > 0) {
      stats.awayWinPercentage = Math.round((stats.awayWins / stats.awayMatches) * 100);
      stats.averageAwayGoalsFor = Math.round((stats.awayGoalsFor / stats.awayMatches) * 100) / 100;
    }
  }
  if (recentResults.length > 0) {
    const lastResult = recentResults[recentResults.length - 1];
    let streakCount = 0;
    for (let i = recentResults.length - 1; i >= 0; i--) {
      if (recentResults[i] === lastResult) {
        streakCount++;
      } else {
        break;
      }
    }
    stats.currentStreak = { type: lastResult, count: streakCount };
  }
  stats.goalDifference = stats.goalsFor - stats.goalsAgainst;
  stats.longestWinStreak = maxWinStreak;
  stats.longestUnbeatenStreak = maxUnbeatenStreak;
  stats.totalMatches = matches.length;
  return stats;
};

const generateHtml = (teamInfo, stats) => {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${teamInfo.name} Stats</title>
        <script src="https://cdn.tailwindcss.com"></script>
    </head>
    <body class="bg-gray-100">
        <div class="container mx-auto p-4">
            <div class="bg-white rounded-lg shadow-md p-6">
                <div class="flex items-center">
                    <img src="${teamInfo.image}" alt="${teamInfo.name}" class="w-24 h-24 mr-6">
                    <div>
                        <h1 class="text-4xl font-bold">${teamInfo.name}</h1>
                        <p class="text-gray-600">${teamInfo.country}</p>
                    </div>
                </div>
            </div>

            <div class="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div class="bg-white rounded-lg shadow-md p-6">
                    <h2 class="text-xl font-bold mb-4">Overall Form</h2>
                    <div class="flex justify-between">
                        <p>Win %</p>
                        <p>${stats.winPercentage}%</p>
                    </div>
                    <div class="flex justify-between">
                        <p>Draw %</p>
                        <p>${stats.drawPercentage}%</p>
                    </div>
                    <div class="flex justify-between">
                        <p>Loss %</p>
                        <p>${stats.lossPercentage}%</p>
                    </div>
                </div>

                <div class="bg-white rounded-lg shadow-md p-6">
                    <h2 class="text-xl font-bold mb-4">Goals</h2>
                    <div class="flex justify-between">
                        <p>Goals For (avg)</p>
                        <p>${stats.averageGoalsFor}</p>
                    </div>
                    <div class="flex justify-between">
                        <p>Goals Against (avg)</p>
                        <p>${stats.averageGoalsAgainst}</p>
                    </div>
                     <div class="flex justify-between">
                        <p>Goal Difference</p>
                        <p>${stats.goalDifference}</p>
                    </div>
                </div>

                <div class="bg-white rounded-lg shadow-md p-6">
                    <h2 class="text-xl font-bold mb-4">Points</h2>
                    <div class="flex justify-between">
                        <p>Points Per Game</p>
                        <p>${stats.pointsPerGame}</p>
                    </div>
                    <div class="flex justify-between">
                        <p>Total Points</p>
                        <p>${stats.points}</p>
                    </div>
                </div>
            </div>
        </div>
    </body>
    </html>
    `;
};

async function buildPage() {
  console.log('🚀 Starting page build process...');
  try {
    console.log(`1️⃣ Fetching matches for Season ID: ${SEASON_ID}`);
    const response = await axios.get(`${BASE_URL}/league-matches`, {
      params: { key: API_KEY, season_id: SEASON_ID },
    });

    if (!response.data.success || !response.data.data || response.data.data.length === 0) {
      throw new Error('Failed to fetch match data or no matches found.');
    }

    const matches = response.data.data;
    console.log(`✅ Found ${matches.length} matches.`);

    const firstMatch = matches[0];
    const teamId = firstMatch.homeID;
    const teamName = firstMatch.home_name;

    // We need to find the team's info (like logo) from the league-teams endpoint
    const teamsResponse = await axios.get(`${BASE_URL}/league-teams`, {
      params: { key: API_KEY, season_id: SEASON_ID },
    });

    let teamInfo = { name: teamName, country: firstMatch.country, image: '' };
    if (teamsResponse.data.success) {
      const foundTeam = teamsResponse.data.data.find(t => t.id === teamId);
      if (foundTeam) {
        teamInfo = foundTeam;
      }
    }

    console.log(`2️⃣ Calculating stats for ${teamInfo.name} (ID: ${teamId})`);
    const teamMatches = matches.filter(m => m.homeID === teamId || m.awayID === teamId);
    const stats = calculateTeamStats(teamMatches, teamId);
    console.log('✅ Stats calculated successfully.');

    console.log('3️⃣ Generating HTML...');
    const htmlContent = generateHtml(teamInfo, stats);
    console.log('✅ HTML generated.');

    fs.writeFileSync('team-stats-clone.html', htmlContent);
    console.log('🎉 Successfully created team-stats-clone.html');
  } catch (error) {
    console.error('❌ Build process failed:');
    console.error(error.message);
    if (error.response) {
      console.error('API Response:', error.response.data);
    }
  }
}

buildPage();
