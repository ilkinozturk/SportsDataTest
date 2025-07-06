const express = require('express');
const app = express();

// Basit test endpoint'i
app.get('/api/teams/data', (req, res) => {
  const teamId = req.query.teamId;
  
  // Statik test verisi - Shanghai SIPG FC için
  const testData = {
    success: true,
    data: {
      teamInfo: {
        id: 836,
        name: "Shanghai SIPG FC",
        country: "China"
      },
      statistics: {
        // Basic stats
        winPercentage: 63,
        drawPercentage: 25,
        lossPercentage: 13,
        goalsForPerMatch: 2.25,
        goalsAgainstPerMatch: 1.25,
        xgForPerMatch: 1.91,
        xgAgainstPerMatch: 1.61,
        cleanSheetPercentage: 19,
        failedToScorePercentage: 0,
        pointsPerGame: 2.13,
        
        // Corner stats
        cornersAVG: 4.75,
        cornersAgainstAVG: 4.88,
        cornersTotalAVG: 9.6,
        
        // Card stats
        totalCards: 37,
        cardsPerMatch: 2.31,
        cardsHighest: 5,
        cardsLowest: 0,
        homeCards: 22,
        awayCards: 15,
        homeCardsPerMatch: 2.44,
        awayCardsPerMatch: 2.14,
        
        // Cards percentages
        cardsOver05: 94,
        cardsOver15: 88,
        cardsOver25: 81,
        cardsOver35: 69,
        cardsOver45: 44,
        cardsOver55: 31,
        
        // Goals scored stats
        scoredOver05: 94,
        scoredOver15: 81,
        scoredOver25: 56,
        scoredBothHalves: 31,
        firstToScore: 69,
        highestScored: 3,
        
        // Half-time cards
        cards1H_AVG_overall: 1.2,
        cards2H_AVG_overall: 1.1,
        
        // Penalty stats  
        penaltiesWon: 2,
        penaltiesConceded: 2,
        
        // Form data
        homeMatches: 8,
        awayMatches: 8,
        homeWins: 5,
        homeDraws: 2,
        homeLosses: 1,
        awayWins: 5,
        awayDraws: 2,
        awayLosses: 1,
        homeGoalsFor: 18,
        homeGoalsAgainst: 10,
        awayGoalsFor: 18,
        awayGoalsAgainst: 10
      }
    }
  };
  
  res.json(testData);
});

// Static dosya servisi
app.use(express.static('.'));

app.listen(3001, () => {
  console.log('✅ Simple test server running on http://localhost:3001');
  console.log('🔗 Test URL: http://localhost:3001/team-stats.html?teamId=836');
});