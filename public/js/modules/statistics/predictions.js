/**
 * Predictions Statistics Module
 * Handles prediction calculations and analysis for team statistics
 */

(function (global) {
  'use strict';

  const PredictionsStatistics = {
    initialized: false,
    predictionModels: new Map(),

    init() {
      if (this.initialized) {
        return;
      }

      this.setupPredictionModels();

      this.initialized = true;
    },

    setupPredictionModels() {
      // Register prediction models
      this.predictionModels.set('goals', this.predictGoals.bind(this));
      this.predictionModels.set('result', this.predictResult.bind(this));
      this.predictionModels.set('cards', this.predictCards.bind(this));
      this.predictionModels.set('corners', this.predictCorners.bind(this));
      this.predictionModels.set('btts', this.predictBTTS.bind(this));
      this.predictionModels.set('overUnder', this.predictOverUnder.bind(this));
    },

    generatePredictions(teamData, opponentData = null, venue = 'home') {
      if (!teamData || !teamData.statistics) {
        return null;
      }

      const predictions = {};

      // Generate predictions for each model
      this.predictionModels.forEach((predictor, type) => {
        try {
          predictions[type] = predictor(teamData, opponentData, venue);
        } catch (error) {
          predictions[type] = null;
        }
      });

      // Add metadata
      predictions.metadata = {
        teamId: teamData.teamId,
        teamName: teamData.teamName,
        venue: venue,
        generatedAt: new Date().toISOString(),
        confidence: this.calculateOverallConfidence(predictions),
      };

      return predictions;
    },

    predictGoals(teamData, opponentData, venue) {
      const stats = teamData.statistics;
      const venuePrefix = venue === 'home' ? 'home' : venue === 'away' ? 'away' : '';

      // Get goals for/against averages for primary team
      const goalsFor = this.getStatValue(stats, 'goalsForPerMatch', venuePrefix) || 1.5;
      const goalsAgainst = this.getStatValue(stats, 'goalsAgainstPerMatch', venuePrefix) || 1.0;

      // Factor in recent form
      const formFactor = this.calculateFormFactor(teamData);

      // If opponent data is available, use improved calculation
      if (opponentData && opponentData.statistics) {
        const oppVenuePrefix = venue === 'home' ? 'away' : venue === 'away' ? 'home' : '';
        const oppGoalsFor =
          this.getStatValue(opponentData.statistics, 'goalsForPerMatch', oppVenuePrefix) || 1.5;
        const oppGoalsAgainst =
          this.getStatValue(opponentData.statistics, 'goalsAgainstPerMatch', oppVenuePrefix) || 1.0;

        // Expected goals = (Team's scoring ability + Opponent's conceding ability) / 2
        const expectedGoalsFor = Math.max(0, ((goalsFor + oppGoalsAgainst) / 2) * formFactor);
        const expectedGoalsAgainst = Math.max(0, (oppGoalsFor + goalsAgainst) / 2);

        return {
          expectedGoalsFor,
          expectedGoalsAgainst,
          totalGoals: expectedGoalsFor + expectedGoalsAgainst,
          confidence: this.calculateConfidence(stats, ['goalsForPerMatch', 'goalsAgainstPerMatch']),
        };
      }

      // Fallback to simple calculation if no opponent data
      return {
        expectedGoalsFor: Math.max(0, goalsFor * formFactor),
        expectedGoalsAgainst: Math.max(0, goalsAgainst),
        totalGoals: goalsFor + goalsAgainst,
        confidence: this.calculateConfidence(stats, ['goalsForPerMatch', 'goalsAgainstPerMatch']),
      };
    },

    predictResult(teamData, opponentData, venue) {
      const stats = teamData.statistics;

      let winPercentage = stats.winPercentage || 0;
      let drawPercentage = stats.drawPercentage || 0;
      let lossPercentage = stats.lossPercentage || 0;

      // Adjust for venue
      if (venue === 'home') {
        winPercentage = Math.min(100, winPercentage * 1.2); // Home advantage
      } else if (venue === 'away') {
        winPercentage = Math.max(0, winPercentage * 0.8); // Away disadvantage
      }

      // Normalize percentages
      const total = winPercentage + drawPercentage + lossPercentage;
      if (total > 0) {
        winPercentage = (winPercentage / total) * 100;
        drawPercentage = (drawPercentage / total) * 100;
        lossPercentage = (lossPercentage / total) * 100;
      }

      return {
        win: Math.round(winPercentage),
        draw: Math.round(drawPercentage),
        loss: Math.round(lossPercentage),
        confidence: this.calculateConfidence(stats, [
          'winPercentage',
          'drawPercentage',
          'lossPercentage',
        ]),
      };
    },

    predictCards(teamData, opponentData, venue) {
      const stats = teamData.statistics;
      const venuePrefix = venue === 'home' ? 'home' : venue === 'away' ? 'away' : '';

      const cardsFor = this.getStatValue(stats, 'cardsAVG', venuePrefix) || 2.0;
      const cardsAgainst = this.getStatValue(stats, 'cardsAgainstPerMatch', venuePrefix) || 2.0;

      const totalCards = cardsFor + cardsAgainst;

      return {
        expectedCards: totalCards,
        teamCards: cardsFor,
        opponentCards: cardsAgainst,
        over15Cards: this.calculateOverProbability(totalCards, 1.5),
        over25Cards: this.calculateOverProbability(totalCards, 2.5),
        over35Cards: this.calculateOverProbability(totalCards, 3.5),
        confidence: this.calculateConfidence(stats, ['cardsAVG']),
      };
    },

    predictCorners(teamData, opponentData, venue) {
      const stats = teamData.statistics;
      const venuePrefix = venue === 'home' ? 'home' : venue === 'away' ? 'away' : '';

      const cornersFor = this.getStatValue(stats, 'cornersForPerMatch', venuePrefix) || 5.0;
      const cornersAgainst = this.getStatValue(stats, 'cornersAgainstPerMatch', venuePrefix) || 5.0;

      const totalCorners = cornersFor + cornersAgainst;

      return {
        expectedCorners: totalCorners,
        teamCorners: cornersFor,
        opponentCorners: cornersAgainst,
        over85Corners: this.calculateOverProbability(totalCorners, 8.5),
        over95Corners: this.calculateOverProbability(totalCorners, 9.5),
        over105Corners: this.calculateOverProbability(totalCorners, 10.5),
        confidence: this.calculateConfidence(stats, [
          'cornersForPerMatch',
          'cornersAgainstPerMatch',
        ]),
      };
    },

    predictBTTS(teamData, opponentData, venue) {
      const stats = teamData.statistics;

      const bttsPercentage = stats.bttsPercentage || 50;
      const goalsFor =
        this.getStatValue(
          stats,
          'goalsForPerMatch',
          venue === 'home' ? 'home' : venue === 'away' ? 'away' : ''
        ) || 1.5;
      const goalsAgainst =
        this.getStatValue(
          stats,
          'goalsAgainstPerMatch',
          venue === 'home' ? 'home' : venue === 'away' ? 'away' : ''
        ) || 1.0;

      // Adjust based on scoring/conceding tendencies
      const scoringFactor = Math.min(goalsFor / 1.5, 1.5);
      const concedingFactor = Math.min(goalsAgainst / 1.0, 1.5);

      const adjustedBTTS = bttsPercentage * ((scoringFactor + concedingFactor) / 2);

      return {
        bttsYes: Math.min(100, Math.round(adjustedBTTS)),
        bttsNo: Math.max(0, Math.round(100 - adjustedBTTS)),
        confidence: this.calculateConfidence(stats, [
          'bttsPercentage',
          'goalsForPerMatch',
          'goalsAgainstPerMatch',
        ]),
      };
    },

    predictOverUnder(teamData, opponentData, venue) {
      const goalsData = this.predictGoals(teamData, opponentData, venue);
      const totalGoals = goalsData.totalGoals;

      return {
        over05: this.calculateOverProbability(totalGoals, 0.5),
        over15: this.calculateOverProbability(totalGoals, 1.5),
        over25: this.calculateOverProbability(totalGoals, 2.5),
        over35: this.calculateOverProbability(totalGoals, 3.5),
        over45: this.calculateOverProbability(totalGoals, 4.5),
        under25: 100 - this.calculateOverProbability(totalGoals, 2.5),
        under35: 100 - this.calculateOverProbability(totalGoals, 3.5),
        confidence: goalsData.confidence,
      };
    },

    // Helper methods
    getStatValue(stats, baseName, venuePrefix) {
      if (venuePrefix) {
        const venueKey = `${venuePrefix}${baseName.charAt(0).toUpperCase()}${baseName.slice(1)}`;
        if (stats[venueKey] !== undefined) {
          return stats[venueKey];
        }

        const suffixKey = `${baseName}_${venuePrefix}`;
        if (stats[suffixKey] !== undefined) {
          return stats[suffixKey];
        }
      }

      return stats[baseName];
    },

    calculateFormFactor(teamData) {
      const recentMatches = teamData.recentMatches || [];
      if (recentMatches.length === 0) {
        return 1.0;
      }

      let formPoints = 0;
      const maxMatches = Math.min(5, recentMatches.length);

      for (let i = 0; i < maxMatches; i++) {
        const match = recentMatches[i];
        if (match.result === 'win') {
          formPoints += 3;
        } else if (match.result === 'draw') {
          formPoints += 1;
        }
      }

      const formPercentage = formPoints / (maxMatches * 3);
      return 0.7 + formPercentage * 0.6; // Range: 0.7 to 1.3
    },

    calculateOverProbability(average, threshold) {
      // Simple Poisson approximation
      if (average <= 0) {
        return 0;
      }

      // For small values, use direct calculation
      if (average < 10) {
        let probability = 0;
        let factorial = 1;

        for (let k = 0; k <= Math.floor(threshold); k++) {
          if (k > 0) {
            factorial *= k;
          }
          probability += (Math.pow(average, k) * Math.exp(-average)) / factorial;
        }

        return Math.round((1 - probability) * 100);
      }

      // For larger values, use normal approximation
      const mean = average;
      const variance = average;
      const standardScore = (threshold - mean) / Math.sqrt(variance);

      // Rough normal distribution approximation
      const probability = 0.5 - 0.5 * this.erf(standardScore / Math.sqrt(2));
      return Math.round(Math.max(0, Math.min(100, probability * 100)));
    },

    erf(x) {
      // Error function approximation
      const sign = x >= 0 ? 1 : -1;
      x = Math.abs(x);

      const a1 = 0.254829592;
      const a2 = -0.284496736;
      const a3 = 1.421413741;
      const a4 = -1.453152027;
      const a5 = 1.061405429;
      const p = 0.3275911;

      const t = 1.0 / (1.0 + p * x);
      const y = 1.0 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

      return sign * y;
    },

    calculateConfidence(stats, requiredFields) {
      let confidence = 0;

      // Sample size factor
      const totalMatches = (stats.wins || 0) + (stats.draws || 0) + (stats.losses || 0);
      if (totalMatches >= 20) {
        confidence += 40;
      } else if (totalMatches >= 10) {
        confidence += 25;
      } else {
        confidence += 10;
      }

      // Data completeness factor
      const availableFields = requiredFields.filter(field => stats[field] !== undefined).length;
      const completeness = availableFields / requiredFields.length;
      confidence += completeness * 40;

      // Recency factor
      if (stats.lastUpdated) {
        const daysSinceUpdate = (Date.now() - new Date(stats.lastUpdated)) / (1000 * 60 * 60 * 24);
        if (daysSinceUpdate <= 7) {
          confidence += 20;
        } else if (daysSinceUpdate <= 30) {
          confidence += 10;
        }
      }

      return Math.min(100, Math.max(0, Math.round(confidence)));
    },

    calculateOverallConfidence(predictions) {
      const confidenceValues = Object.values(predictions)
        .filter(p => p && typeof p.confidence === 'number')
        .map(p => p.confidence);

      if (confidenceValues.length === 0) {
        return 0;
      }

      return Math.round(
        confidenceValues.reduce((sum, val) => sum + val, 0) / confidenceValues.length
      );
    },

    // Public API methods
    getPrediction(type, teamData, opponentData, venue) {
      const predictor = this.predictionModels.get(type);
      if (!predictor) {
        return null;
      }

      return predictor(teamData, opponentData, venue);
    },

    getAllPredictions(teamData, opponentData, venue) {
      return this.generatePredictions(teamData, opponentData, venue);
    },
  };

  // Global registration
  global.TeamStatsPredictionsStatistics = PredictionsStatistics;

  // Auto-initialize
  PredictionsStatistics.init();
})(window);
