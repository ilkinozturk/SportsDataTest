const axios = require('axios');
const fs = require('fs');

// CONFIGURATION
const API_KEY = '29581005f929990bf13dc9c964200d537e484ee248f0ac2d0f76910a6ce7aae9';
const BASE_URL = 'https://api.football-data-api.com';
const SEASON_ID = 13973; // USA MLS - Known working season
const TEAM_NAME_TO_FIND = 'Inter Miami'; // We'll try to find Inter Miami, otherwise we'll use the first team.

// --- COPIED FROM simple-server-optimized.js ---
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
    averageHomeGoalsAgainst: 0,
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
    over1_5Goals: 0,
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
    bttsPercentage: 0,
    over2_5Percentage: 0,
    cleanSheetPercentage: 0,
    failedToScorePercentage: 0,
  };
  if (matches.length === 0) {
    return stats;
  }
  const sortedMatches = matches.sort((a, b) => (a.date_unix || 0) - (b.date_unix || 0));
  let currentWinStreak = 0,
    currentUnbeatenStreak = 0,
    maxWinStreak = 0,
    maxUnbeatenStreak = 0,
    recentResults = [];
  for (const match of sortedMatches) {
    const isHome = (match.homeID || match.home_id)?.toString() === teamId.toString();
    const teamGoals = parseInt(
      isHome
        ? match.homeGoalCount || match.home_goals || 0
        : match.awayGoalCount || match.away_goals || 0
    );
    const opponentGoals = parseInt(
      isHome
        ? match.awayGoalCount || match.away_goals || 0
        : match.homeGoalCount || match.home_goals || 0
    );
    const isCompleted =
      match.status === 'complete' || match.status === 'finished' || match.status === 'FT';
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
      if (totalMatchGoals > 1.5) {
        stats.over1_5Goals++;
      }
      if (totalMatchGoals > 2.5) {
        stats.over2_5Goals++;
      } else {
        stats.under2_5Goals++;
      }
      if (stats.recentForm.length < 10) {
        stats.recentForm.unshift(result);
      }
    } else {
      stats.upcomingMatches++;
    }
  }
  const cm = stats.completedMatches;
  if (cm > 0) {
    stats.winPercentage = Math.round((stats.wins / cm) * 100);
    stats.drawPercentage = Math.round((stats.draws / cm) * 100);
    stats.lossPercentage = Math.round((stats.losses / cm) * 100);
    stats.averageGoalsFor = parseFloat((stats.goalsFor / cm).toFixed(2));
    stats.averageGoalsAgainst = parseFloat((stats.goalsAgainst / cm).toFixed(2));
    stats.pointsPerGame = parseFloat((stats.points / cm).toFixed(2));
    stats.bttsPercentage = Math.round((stats.bothTeamsScored / cm) * 100);
    stats.over2_5Percentage = Math.round((stats.over2_5Goals / cm) * 100);
    stats.cleanSheetPercentage = Math.round((stats.cleanSheets / cm) * 100);
    stats.failedToScorePercentage = Math.round((stats.failedToScore / cm) * 100);
    if (stats.homeMatches > 0) {
      stats.homeWinPercentage = Math.round((stats.homeWins / stats.homeMatches) * 100);
    }
    if (stats.awayMatches > 0) {
      stats.awayWinPercentage = Math.round((stats.awayWins / stats.awayMatches) * 100);
    }
  }
  stats.goalDifference = stats.goalsFor - stats.goalsAgainst;
  stats.longestWinStreak = maxWinStreak;
  stats.longestUnbeatenStreak = maxUnbeatenStreak;
  return stats;
};
// --- END COPIED FUNCTION ---

const generateHTML = (teamInfo, stats) => {
  // A more detailed HTML structure based on the reference link
  return `
<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${teamInfo.name} İstatistikleri | SportsData.AI</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        .stat-card { background-color: #1F2937; border-radius: 0.75rem; padding: 1.5rem; }
        .stat-title { font-size: 1.125rem; font-weight: 600; color: #9CA3AF; margin-bottom: 1rem; }
        .stat-row { display: flex; justify-content: space-between; align-items: center; padding: 0.75rem 0; border-bottom: 1px solid #374151; }
        .stat-label { color: #D1D5DB; }
        .stat-value { color: #F9FAFB; font-weight: 700; }
        .progress-bar { background-color: #374151; border-radius: 9999px; height: 0.75rem; overflow: hidden; }
        .progress-fill { height: 100%; border-radius: 9999px; }
    </style>
</head>
<body class="bg-gray-900 text-white">
    <div class="container mx-auto p-4 md:p-8">
        <!-- Header -->
        <div class="flex items-center gap-6 mb-8">
            <img src="${teamInfo.image}" alt="${teamInfo.name}" class="w-24 h-24 rounded-full border-4 border-gray-700">
            <div>
                <h1 class="text-4xl font-bold">${teamInfo.name}</h1>
                <p class="text-xl text-gray-400">${teamInfo.country} - Sezon 2025</p>
            </div>
        </div>

        <!-- Stats Grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            <!-- Genel Form -->
            <div class="stat-card">
                <h2 class="stat-title">Genel Sezon Formu</h2>
                <div class="stat-row"><span class="stat-label">Oynanan Maç</span><span class="stat-value">${stats.completedMatches}</span></div>
                <div class="stat-row"><span class="stat-label">Galibiyet %</span><span class="stat-value">${stats.winPercentage}%</span></div>
                <div class="stat-row"><span class="stat-label">Beraberlik %</span><span class="stat-value">${stats.drawPercentage}%</span></div>
                <div class="stat-row"><span class="stat-label">Mağlubiyet %</span><span class="stat-value">${stats.lossPercentage}%</span></div>
                <div class="stat-row"><span class="stat-label">Puan/Maç</span><span class="stat-value">${stats.pointsPerGame}</span></div>
            </div>

            <!-- Gol İstatistikleri -->
            <div class="stat-card">
                <h2 class="stat-title">Gol İstatistikleri</h2>
                <div class="stat-row"><span class="stat-label">Atılan Gol Ort.</span><span class="stat-value">${stats.averageGoalsFor}</span></div>
                <div class="stat-row"><span class="stat-label">Yenilen Gol Ort.</span><span class="stat-value">${stats.averageGoalsAgainst}</span></div>
                <div class="stat-row"><span class="stat-label">Gol Atılamayan Maç</span><span class="stat-value">${stats.failedToScorePercentage}%</span></div>
                <div class="stat-row"><span class="stat-label">Gol Yenilmeyen Maç</span><span class="stat-value">${stats.cleanSheetPercentage}%</span></div>
                <div class="stat-row"><span class="stat-label">Averaj</span><span class="stat-value">${stats.goalDifference}</span></div>
            </div>

            <!-- Bahis İstatistikleri -->
            <div class="stat-card">
                <h2 class="stat-title">Maç İstatistikleri (KG Var / Üst)</h2>
                <div class="stat-row">
                    <span class="stat-label">KG Var (BTTS)</span>
                    <div class="w-1/2 text-right"><span class="stat-value">${stats.bttsPercentage}%</span>
                        <div class="progress-bar mt-1"><div class="progress-fill bg-blue-500" style="width: ${stats.bttsPercentage}%"></div></div>
                    </div>
                </div>
                <div class="stat-row">
                    <span class="stat-label">2.5 Üstü Gol</span>
                    <div class="w-1/2 text-right"><span class="stat-value">${stats.over2_5Percentage}%</span>
                        <div class="progress-bar mt-1"><div class="progress-fill bg-green-500" style="width: ${stats.over2_5Percentage}%"></div></div>
                    </div>
                </div>
            </div>

            <!-- İç Saha Performansı -->
            <div class="stat-card lg:col-span-2">
                <h2 class="stat-title">İç Saha Performansı</h2>
                <div class="grid grid-cols-2 gap-x-8">
                    <div class="stat-row"><span class="stat-label">Galibiyet %</span><span class="stat-value">${stats.homeWinPercentage}%</span></div>
                    <div class="stat-row"><span class="stat-label">Maçlar</span><span class="stat-value">${stats.homeMatches}</span></div>
                    <div class="stat-row"><span class="stat-label">Atılan Gol</span><span class="stat-value">${stats.homeGoalsFor}</span></div>
                    <div class="stat-row"><span class="stat-label">Yenilen Gol</span><span class="stat-value">${stats.homeGoalsAgainst}</span></div>
                </div>
            </div>

            <!-- Deplasman Performansı -->
            <div class="stat-card lg:col-span-1">
                 <h2 class="stat-title">Deplasman Performansı</h2>
                 <div class="stat-row"><span class="stat-label">Galibiyet %</span><span class="stat-value">${stats.awayWinPercentage}%</span></div>
                 <div class="stat-row"><span class="stat-label">Maçlar</span><span class="stat-value">${stats.awayMatches}</span></div>
            </div>

        </div>
    </div>
</body>
</html>`;
};

const buildStaticPage = async () => {
  console.log(`🚀 Statik sayfa oluşturma işlemi başlıyor...`);
  try {
    console.log(`1️⃣ API'den maç verileri çekiliyor (Sezon ID: ${SEASON_ID})...`);
    const response = await axios.get(`${BASE_URL}/league-matches`, {
      params: { key: API_KEY, league_id: SEASON_ID },
    });

    if (!response.data.success || !response.data.data || response.data.data.length === 0) {
      throw new Error("API'den maç verisi çekilemedi veya sezon için maç bulunamadı.");
    }

    const allMatches = response.data.data;
    console.log(`✅ ${allMatches.length} adet maç verisi başarıyla çekildi.`);

    // Find the specific team or fall back to the first team
    let targetTeamId = null;
    let teamInfo = {};

    const specificTeamMatch = allMatches.find(
      m => m.home_name === TEAM_NAME_TO_FIND || m.away_name === TEAM_NAME_TO_FIND
    );

    if (specificTeamMatch) {
      targetTeamId =
        specificTeamMatch.home_name === TEAM_NAME_TO_FIND
          ? specificTeamMatch.homeID
          : specificTeamMatch.awayID;
      teamInfo = {
        id: targetTeamId,
        name: TEAM_NAME_TO_FIND,
        image:
          specificTeamMatch.home_name === TEAM_NAME_TO_FIND
            ? specificTeamMatch.home_image
            : specificTeamMatch.away_image,
        country: specificTeamMatch.country,
      };
      console.log(`✅ Hedef takım bulundu: ${TEAM_NAME_TO_FIND} (ID: ${targetTeamId})`);
    } else {
      const firstMatch = allMatches[0];
      targetTeamId = firstMatch.homeID;
      teamInfo = {
        id: targetTeamId,
        name: firstMatch.home_name,
        image: firstMatch.home_image,
        country: firstMatch.country,
      };
      console.warn(
        `⚠️ "${TEAM_NAME_TO_FIND}" bulunamadı. İlk takım kullanılıyor: ${teamInfo.name} (ID: ${targetTeamId})`
      );
    }

    const teamMatches = allMatches.filter(
      m =>
        m.homeID?.toString() === targetTeamId.toString() ||
        m.awayID?.toString() === targetTeamId.toString()
    );

    console.log(`2️⃣ ${teamInfo.name} için istatistikler hesaplanıyor...`);
    const stats = calculateTeamStats(teamMatches, targetTeamId);
    console.log('✅ İstatistikler başarıyla hesaplandı.');

    console.log('3️⃣ HTML içeriği oluşturuluyor...');
    const htmlContent = generateHTML(teamInfo, stats);
    console.log('✅ HTML içeriği başarıyla oluşturuldu.');

    const outputPath = 'team-stats-clone.html';
    fs.writeFileSync(outputPath, htmlContent);
    console.log(`🎉 Başarılı! Statik sayfa oluşturuldu: ${outputPath}`);
    console.log('Bu dosyayı tarayıcınızda açarak sonucu görebilirsiniz.');
  } catch (error) {
    console.error('❌ Statik sayfa oluşturma işlemi sırasında bir hata oluştu:');
    console.error(error.message);
    if (error.response) {
      console.error('API Yanıtı:', JSON.stringify(error.response.data, null, 2));
    }
  }
};

buildStaticPage();
