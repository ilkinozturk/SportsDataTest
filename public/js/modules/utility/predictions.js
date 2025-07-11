/**
 * Predictions Module
 * Handles prediction calculations for the team stats application
 */

(function (global) {
  'use strict';

  const PredictionsEngine = {
    initialized: false,
    models: new Map(),

    init() {
      if (this.initialized) return;

      this.setupPredictionModels();

      this.initialized = true;
    },

    setupPredictionModels() {
      // Register basic prediction models
      this.registerModel('goals', this.goalsModel);
      this.registerModel('result', this.resultModel);
      this.registerModel('cards', this.cardsModel);
      this.registerModel('corners', this.cornersModel);
      this.registerModel('btts', this.bttsModel);
    },

    registerModel(name, modelFunction) {
      this.models.set(name, modelFunction);
    },

    predict(modelName, teamData, opponentData = null) {
      const model = this.models.get(modelName);

      if (!model) {
        return null;
      }

      try {
        return model.call(this, teamData, opponentData);
      } catch (error) {
        return null;
      }
    },

    // Goals prediction model
    goalsModel(teamData, opponentData) {
      const stats = teamData.statistics || {};

      // Basic goals prediction based on averages
      const homeGoals = stats.goalsForPerMatch_home || stats.goalsForPerMatch || 1.5;
      const awayGoals = stats.goalsForPerMatch_away || stats.goalsForPerMatch || 1.5;
      const overallGoals = stats.goalsForPerMatch || 1.5;

      const concededHome = stats.goalsAgainstPerMatch_home || stats.goalsAgainstPerMatch || 1.0;
      const concededAway = stats.goalsAgainstPerMatch_away || stats.goalsAgainstPerMatch || 1.0;

      // Factor in recent form
      const formFactor = this.calculateFormFactor(teamData);

      return {
        homeGoals: Math.max(0, homeGoals * formFactor),
        awayGoals: Math.max(0, awayGoals * formFactor),
        overallGoals: Math.max(0, overallGoals * formFactor),
        expectedConceded: {
          home: Math.max(0, concededHome),
          away: Math.max(0, concededAway),
        },
        confidence: this.calculateConfidence(stats, 'goals'),
      };
    },

    // Result prediction model
    resultModel(teamData, opponentData) {
      const stats = teamData.statistics || {};

      const winPercentage = stats.winPercentage || 0;
      const drawPercentage = stats.drawPercentage || 0;
      const lossPercentage = stats.lossPercentage || 0;

      // Adjust for venue
      const homeWinBonus = 10; // Home advantage
      const adjustedWinPercentage = Math.min(100, winPercentage + homeWinBonus);

      // Factor in recent form
      const formFactor = this.calculateFormFactor(teamData);

      return {
        win: Math.max(0, Math.min(100, adjustedWinPercentage * formFactor)),
        draw: Math.max(0, Math.min(100, drawPercentage)),
        loss: Math.max(0, Math.min(100, lossPercentage * (2 - formFactor))),
        confidence: this.calculateConfidence(stats, 'result'),
      };
    },

    // Cards prediction model
    cardsModel(teamData, opponentData) {
      const stats = teamData.statistics || {};

      const cardsPerMatch = stats.cardsAVG_overall || stats.cardsForPerMatch || 2.0;
      const cardsAgainst = stats.cardsAgainstPerMatch || 2.0;

      return {
        totalCards: cardsPerMatch + cardsAgainst,
        teamCards: cardsPerMatch,
        opponentCards: cardsAgainst,
        over15Cards: this.calculateOverUnderProbability(cardsPerMatch + cardsAgainst, 1.5),
        over25Cards: this.calculateOverUnderProbability(cardsPerMatch + cardsAgainst, 2.5),
        over35Cards: this.calculateOverUnderProbability(cardsPerMatch + cardsAgainst, 3.5),
        confidence: this.calculateConfidence(stats, 'cards'),
      };
    },

    // Corners prediction model
    cornersModel(teamData, opponentData) {
      const stats = teamData.statistics || {};

      const cornersFor = stats.cornersForPerMatch || 5.0;
      const cornersAgainst = stats.cornersAgainstPerMatch || 5.0;

      return {
        totalCorners: cornersFor + cornersAgainst,
        teamCorners: cornersFor,
        opponentCorners: cornersAgainst,
        over85Corners: this.calculateOverUnderProbability(cornersFor + cornersAgainst, 8.5),
        over95Corners: this.calculateOverUnderProbability(cornersFor + cornersAgainst, 9.5),
        over105Corners: this.calculateOverUnderProbability(cornersFor + cornersAgainst, 10.5),
        confidence: this.calculateConfidence(stats, 'corners'),
      };
    },

    // Both teams to score model
    bttsModel(teamData, opponentData) {
      const stats = teamData.statistics || {};

      const bttsPercentage = stats.bttsPercentage || 50;
      const goalsFor = stats.goalsForPerMatch || 1.5;
      const goalsAgainst = stats.goalsAgainstPerMatch || 1.0;

      // Higher probability if team scores and concedes regularly
      const scoringConsistency = Math.min(goalsFor / 2, 1);
      const concedingConsistency = Math.min(goalsAgainst / 1.5, 1);

      const adjustedBtts = (bttsPercentage * (scoringConsistency + concedingConsistency)) / 2;

      return {
        bttsYes: Math.min(100, adjustedBtts),
        bttsNo: Math.max(0, 100 - adjustedBtts),
        confidence: this.calculateConfidence(stats, 'btts'),
      };
    },

    // Helper methods
    calculateFormFactor(teamData) {
      const recentMatches = teamData.recentMatches || [];

      if (recentMatches.length === 0) return 1.0;

      let formPoints = 0;
      const maxMatches = Math.min(5, recentMatches.length);

      for (let i = 0; i < maxMatches; i++) {
        const match = recentMatches[i];
        if (match.result === 'win') formPoints += 3;
        else if (match.result === 'draw') formPoints += 1;
      }

      const maxPossiblePoints = maxMatches * 3;
      const formPercentage = formPoints / maxPossiblePoints;

      // Convert to factor (0.5 to 1.5 range)
      return 0.5 + formPercentage;
    },

    calculateConfidence(stats, predictionType) {
      // Calculate confidence based on data completeness and sample size
      let confidence = 0;

      const totalMatches = (stats.wins || 0) + (stats.draws || 0) + (stats.losses || 0);

      // Sample size factor
      if (totalMatches >= 20) confidence += 40;
      else if (totalMatches >= 10) confidence += 25;
      else confidence += 10;

      // Data completeness factor
      const requiredFields = this.getRequiredFields(predictionType);
      const availableFields = requiredFields.filter(field => stats[field] !== undefined).length;
      const completeness = availableFields / requiredFields.length;

      confidence += completeness * 40;

      // Recent data factor
      if (stats.lastUpdated) {
        const daysSinceUpdate = (Date.now() - new Date(stats.lastUpdated)) / (1000 * 60 * 60 * 24);
        if (daysSinceUpdate <= 7) confidence += 20;
        else if (daysSinceUpdate <= 30) confidence += 10;
      }

      return Math.min(100, Math.max(0, confidence));
    },

    getRequiredFields(predictionType) {
      const fieldMap = {
        goals: ['goalsForPerMatch', 'goalsAgainstPerMatch', 'totalMatches'],
        result: ['winPercentage', 'drawPercentage', 'lossPercentage'],
        cards: ['cardsForPerMatch', 'cardsAgainstPerMatch'],
        corners: ['cornersForPerMatch', 'cornersAgainstPerMatch'],
        btts: ['bttsPercentage', 'goalsForPerMatch', 'goalsAgainstPerMatch'],
      };

      return fieldMap[predictionType] || [];
    },

    calculateOverUnderProbability(average, threshold) {
      // Simple Poisson-based probability calculation
      const lambda = average;

      // P(X > threshold) for Poisson distribution approximation
      let probability = 0;

      // Use normal approximation for large lambda
      if (lambda > 10) {
        const mean = lambda;
        const variance = lambda;
        const standardScore = (threshold - mean) / Math.sqrt(variance);

        // Rough normal distribution approximation
        probability = 0.5 - 0.5 * this.erf(standardScore / Math.sqrt(2));
      } else {
        // Direct calculation for smaller lambda
        let cumulativeProbability = 0;
        let factorial = 1;

        for (let k = 0; k <= Math.floor(threshold); k++) {
          if (k > 0) factorial *= k;

          const poissonProb = (Math.pow(lambda, k) * Math.exp(-lambda)) / factorial;
          cumulativeProbability += poissonProb;
        }

        probability = 1 - cumulativeProbability;
      }

      return Math.max(0, Math.min(100, probability * 100));
    },

    // Error function approximation
    erf(x) {
      const a1 = 0.254829592;
      const a2 = -0.284496736;
      const a3 = 1.421413741;
      const a4 = -1.453152027;
      const a5 = 1.061405429;
      const p = 0.3275911;

      const sign = x >= 0 ? 1 : -1;
      x = Math.abs(x);

      const t = 1.0 / (1.0 + p * x);
      const y = 1.0 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

      return sign * y;
    },

    // Batch predictions
    predictAll(teamData, opponentData = null) {
      const predictions = {};

      this.models.forEach((model, name) => {
        predictions[name] = this.predict(name, teamData, opponentData);
      });

      return predictions;
    },

    // Prediction accuracy tracking
    recordActualResult(predictionId, actualResult) {
      // Store actual results for model validation
      const key = `prediction_result_${predictionId}`;
      try {
        localStorage.setItem(
          key,
          JSON.stringify({
            timestamp: Date.now(),
            actualResult: actualResult,
          })
        );
      } catch (error) {
      }
    },

    // Model validation
    validateModel(modelName) {
      // This would compare predictions vs actual results
      // Implementation would depend on stored prediction results
      return { accuracy: 0, sampleSize: 0 };
    },
  };

  // Global registration
  global.TeamStatsPredictionsEngine = PredictionsEngine;

  // Auto-initialize
  PredictionsEngine.init();
})(window);
