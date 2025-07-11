/**
 * Form Analyzer Module
 * Analyzes team form, momentum, and performance trends
 * Extends BaseStatistics for common functionality
 */

(function (global) {
  'use strict';

  class FormAnalyzer {
    constructor() {
      this.name = 'FormAnalyzer';
      this.version = '1.0.0';

      // Dependencies
      this.baseStats = global.TeamStatsBaseStatistics;

      if (!this.baseStats) {
      }

      // Form periods
      this.formPeriods = {
        last3: 3,
        last5: 5,
        last8: 8,
        last10: 10,
        last15: 15,
      };

      // Performance indicators
      this.performanceThresholds = {
        excellent: 2.5, // Points per game
        good: 2.0,
        average: 1.5,
        poor: 1.0,
        terrible: 0.5,
      };

      // Momentum factors
      this.momentumWeights = {
        recent: 0.5, // Last 3 matches
        medium: 0.3, // Matches 4-8
        older: 0.2, // Matches 9-15
      };

      // Performance metrics
      this.metrics = {
        calculations: 0,
        startTime: Date.now(),
      };
    }

    /**
     * Analyze comprehensive team form
     */
    analyzeTeamForm(matches, options = {}) {
      if (!Array.isArray(matches) || matches.length === 0) {
        return this.getEmptyFormAnalysis();
      }

      const startTime = performance.now();
      this.metrics.calculations++;

      // Filter and sort matches (most recent first)
      const filteredMatches = this.filterMatches(matches, options).sort(
        (a, b) => new Date(b.date || b.matchDate) - new Date(a.date || a.matchDate)
      );

      const analysis = {
        // Basic form data
        totalMatches: filteredMatches.length,
        teamId: options.teamId,

        // Form periods analysis
        formPeriods: this.analyzeFormPeriods(filteredMatches, options.teamId),

        // Overall form rating
        currentFormRating: this.calculateFormRating(filteredMatches, options.teamId),

        // Momentum analysis
        momentum: this.analyzeMomentum(filteredMatches, options.teamId),

        // Performance trends
        performanceTrends: this.analyzePerformanceTrends(filteredMatches, options.teamId),

        // Result patterns
        resultPatterns: this.analyzeResultPatterns(filteredMatches, options.teamId),

        // Venue form
        venueForm: this.analyzeVenueForm(filteredMatches, options.teamId),

        // Competition form
        competitionForm: this.analyzeCompetitionForm(filteredMatches, options.teamId),

        // Goal form
        goalForm: this.analyzeGoalForm(filteredMatches, options.teamId),

        // Defensive form
        defensiveForm: this.analyzeDefensiveForm(filteredMatches, options.teamId),

        // Consistency analysis
        consistency: this.analyzeConsistency(filteredMatches, options.teamId),

        // Recent vs Historical
        recentVsHistorical: this.compareRecentVsHistorical(filteredMatches, options.teamId),

        // Form streaks
        streaks: this.analyzeStreaks(filteredMatches, options.teamId),

        // Predictive indicators
        predictiveIndicators: this.calculatePredictiveIndicators(filteredMatches, options.teamId),

        // Form stability
        stability: this.analyzeFormStability(filteredMatches, options.teamId),
      };

      // Add performance metric
      analysis.calculationTime = performance.now() - startTime;

      return analysis;
    }

    /**
     * Analyze form across different periods
     */
    analyzeFormPeriods(matches, teamId) {
      const periods = {};

      Object.entries(this.formPeriods).forEach(([periodName, matchCount]) => {
        const periodMatches = matches.slice(0, matchCount);
        if (periodMatches.length > 0) {
          const periodForm = this.calculatePeriodForm(periodMatches, teamId);
          // Calculate form rating separately to avoid circular dependency
          periodForm.formRating = this.calculateFormRating(periodMatches, teamId);
          periods[periodName] = periodForm;
        }
      });

      return periods;
    }

    /**
     * Calculate form for a specific period
     */
    calculatePeriodForm(matches, teamId) {
      if (!teamId) return this.getEmptyPeriodForm();

      let points = 0;
      let wins = 0;
      let draws = 0;
      let losses = 0;
      let goalsFor = 0;
      let goalsAgainst = 0;
      let cleanSheets = 0;
      let failedToScore = 0;

      matches.forEach(match => {
        const isHome = String(match.homeTeamId || match.home_team_id) === String(teamId);
        const teamGoals = isHome
          ? parseInt(match.homeGoals || match.home_goals || 0)
          : parseInt(match.awayGoals || match.away_goals || 0);
        const opponentGoals = isHome
          ? parseInt(match.awayGoals || match.away_goals || 0)
          : parseInt(match.homeGoals || match.home_goals || 0);

        goalsFor += teamGoals;
        goalsAgainst += opponentGoals;

        if (opponentGoals === 0) cleanSheets++;
        if (teamGoals === 0) failedToScore++;

        if (teamGoals > opponentGoals) {
          wins++;
          points += 3;
        } else if (teamGoals === opponentGoals) {
          draws++;
          points += 1;
        } else {
          losses++;
        }
      });

      const totalMatches = matches.length;

      return {
        matches: totalMatches,
        wins,
        draws,
        losses,
        points,
        pointsPerGame: this.baseStats.divide(points, totalMatches),
        goalsFor,
        goalsAgainst,
        goalDifference: goalsFor - goalsAgainst,
        avgGoalsFor: this.baseStats.divide(goalsFor, totalMatches),
        avgGoalsAgainst: this.baseStats.divide(goalsAgainst, totalMatches),
        cleanSheets,
        cleanSheetPercentage: this.baseStats.percentage(cleanSheets, totalMatches),
        failedToScore,
        failedToScorePercentage: this.baseStats.percentage(failedToScore, totalMatches),
        winPercentage: this.baseStats.percentage(wins, totalMatches),
        formString: this.generateFormString(matches, teamId),
        formRating: 0, // Will be calculated separately to avoid circular dependency
      };
    }

    /**
     * Generate form string (W-D-L-W-W)
     */
    generateFormString(matches, teamId, limit = 5) {
      if (!teamId) return '';

      const recentMatches = matches.slice(0, limit);
      return recentMatches
        .map(match => {
          const isHome = String(match.homeTeamId || match.home_team_id) === String(teamId);
          const teamGoals = isHome
            ? parseInt(match.homeGoals || match.home_goals || 0)
            : parseInt(match.awayGoals || match.away_goals || 0);
          const opponentGoals = isHome
            ? parseInt(match.awayGoals || match.away_goals || 0)
            : parseInt(match.homeGoals || match.home_goals || 0);

          if (teamGoals > opponentGoals) return 'W';
          if (teamGoals === opponentGoals) return 'D';
          return 'L';
        })
        .join('-');
    }

    /**
     * Calculate overall form rating (0-100)
     */
    calculateFormRating(matches, teamId) {
      if (!teamId || matches.length === 0) return 0;

      const recent = matches.slice(0, 5);

      // Calculate basic stats without calling calculatePeriodForm to avoid circular dependency
      let points = 0;
      let goalsFor = 0;
      let goalsAgainst = 0;
      let cleanSheets = 0;
      let failedToScore = 0;

      recent.forEach(match => {
        const isHome = String(match.homeTeamId || match.home_team_id) === String(teamId);
        const teamGoals = isHome
          ? parseInt(match.homeGoals || match.home_goals || 0)
          : parseInt(match.awayGoals || match.away_goals || 0);
        const opponentGoals = isHome
          ? parseInt(match.awayGoals || match.away_goals || 0)
          : parseInt(match.homeGoals || match.home_goals || 0);

        goalsFor += teamGoals;
        goalsAgainst += opponentGoals;

        if (opponentGoals === 0) cleanSheets++;
        if (teamGoals === 0) failedToScore++;

        if (teamGoals > opponentGoals) {
          points += 3;
        } else if (teamGoals === opponentGoals) {
          points += 1;
        }
      });

      const pointsPerGame = this.baseStats.divide(points, recent.length);
      const goalDifference = goalsFor - goalsAgainst;
      const cleanSheetPercentage = this.baseStats.percentage(cleanSheets, recent.length);
      const failedToScorePercentage = this.baseStats.percentage(failedToScore, recent.length);

      // Base rating from points per game
      let rating = (pointsPerGame / 3) * 60; // Max 60 points

      // Goal difference bonus/penalty
      const goalDiffPerGame = goalDifference / recent.length;
      rating += Math.min(Math.max(goalDiffPerGame * 10, -15), 15);

      // Clean sheet bonus
      rating += cleanSheetPercentage * 0.15;

      // Failed to score penalty
      rating -= failedToScorePercentage * 0.1;

      // Consistency bonus (less variation in results)
      const consistency = this.calculateConsistencyScore(recent, teamId);
      rating += consistency * 10;

      return Math.min(Math.max(Math.round(rating), 0), 100);
    }

    /**
     * Analyze momentum
     */
    analyzeMomentum(matches, teamId) {
      if (!teamId || matches.length < 3) {
        return { score: 0, direction: 'neutral', confidence: 'low' };
      }

      // Weight recent matches more heavily
      const recentMatches = matches.slice(0, 3);
      const mediumMatches = matches.slice(3, 8);
      const olderMatches = matches.slice(8, 15);

      const recentScore =
        this.calculateMomentumScore(recentMatches, teamId) * this.momentumWeights.recent;
      const mediumScore =
        this.calculateMomentumScore(mediumMatches, teamId) * this.momentumWeights.medium;
      const olderScore =
        this.calculateMomentumScore(olderMatches, teamId) * this.momentumWeights.older;

      const totalScore = recentScore + mediumScore + olderScore;

      let direction = 'neutral';
      let confidence = 'low';

      if (totalScore > 0.6) {
        direction = 'positive';
        confidence = totalScore > 0.8 ? 'high' : 'medium';
      } else if (totalScore < 0.4) {
        direction = 'negative';
        confidence = totalScore < 0.2 ? 'high' : 'medium';
      } else {
        confidence = 'medium';
      }

      return {
        score: this.baseStats.round(totalScore, 2),
        direction,
        confidence,
        recentScore: this.baseStats.round(recentScore, 2),
        mediumScore: this.baseStats.round(mediumScore, 2),
        olderScore: this.baseStats.round(olderScore, 2),
      };
    }

    /**
     * Calculate momentum score for a set of matches
     */
    calculateMomentumScore(matches, teamId) {
      if (matches.length === 0) return 0.5;

      let totalScore = 0;
      let totalWeight = 0;

      matches.forEach((match, index) => {
        const weight = 1 / (index + 1); // More recent matches have higher weight
        const matchScore = this.getMatchMomentumScore(match, teamId);

        totalScore += matchScore * weight;
        totalWeight += weight;
      });

      return totalWeight > 0 ? totalScore / totalWeight : 0.5;
    }

    /**
     * Get momentum score for a single match
     */
    getMatchMomentumScore(match, teamId) {
      const isHome = String(match.homeTeamId || match.home_team_id) === String(teamId);
      const teamGoals = isHome
        ? parseInt(match.homeGoals || match.home_goals || 0)
        : parseInt(match.awayGoals || match.away_goals || 0);
      const opponentGoals = isHome
        ? parseInt(match.awayGoals || match.away_goals || 0)
        : parseInt(match.homeGoals || match.home_goals || 0);

      const goalDiff = teamGoals - opponentGoals;

      // Base score from result
      let score = 0.5; // Neutral starting point

      if (goalDiff > 0) {
        // Win
        score = 0.8 + Math.min(goalDiff * 0.05, 0.2); // Max 1.0
      } else if (goalDiff === 0) {
        // Draw
        score = 0.5;
      } else {
        // Loss
        score = 0.2 - Math.min(Math.abs(goalDiff) * 0.05, 0.2); // Min 0.0
      }

      return Math.min(Math.max(score, 0), 1);
    }

    /**
     * Analyze performance trends
     */
    analyzePerformanceTrends(matches, teamId) {
      if (matches.length < 5) return this.getEmptyPerformanceTrends();

      const periodicData = this.getPeriodicPerformanceData(matches, teamId);

      return {
        pointsTrend: this.calculateTrend(periodicData.points),
        goalsScoredTrend: this.calculateTrend(periodicData.goalsFor),
        goalsConcededTrend: this.calculateTrend(periodicData.goalsAgainst),
        cleanSheetsTrend: this.calculateTrend(periodicData.cleanSheets),
        performanceStability: this.calculatePerformanceStability(periodicData),
        improvementAreas: this.identifyImprovementAreas(periodicData),
        strengthAreas: this.identifyStrengthAreas(periodicData),
      };
    }

    /**
     * Get periodic performance data
     */
    getPeriodicPerformanceData(matches, teamId) {
      const data = {
        points: [],
        goalsFor: [],
        goalsAgainst: [],
        cleanSheets: [],
      };

      // Group matches into periods of 5
      for (let i = 0; i < matches.length; i += 5) {
        const periodMatches = matches.slice(i, i + 5);
        const periodForm = this.calculatePeriodForm(periodMatches, teamId);

        data.points.push(periodForm.pointsPerGame);
        data.goalsFor.push(periodForm.avgGoalsFor);
        data.goalsAgainst.push(periodForm.avgGoalsAgainst);
        data.cleanSheets.push(periodForm.cleanSheetPercentage);
      }

      return data;
    }

    /**
     * Calculate trend direction and strength
     */
    calculateTrend(values) {
      if (values.length < 2) return { direction: 'stable', strength: 0 };

      const trend = this.baseStats.calculateTrend(values);
      let strength = 0;

      if (values.length >= 3) {
        const slope = this.calculateSlope(values);
        strength = Math.abs(slope);
      }

      return {
        direction: trend,
        strength: this.baseStats.round(strength, 2),
        confidence: values.length >= 4 ? 'high' : 'medium',
      };
    }

    /**
     * Calculate slope of values
     */
    calculateSlope(values) {
      if (values.length < 2) return 0;

      const n = values.length;
      const x = Array.from({ length: n }, (_, i) => i);
      const y = values;

      const sumX = x.reduce((a, b) => a + b, 0);
      const sumY = y.reduce((a, b) => a + b, 0);
      const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
      const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);

      const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
      return isNaN(slope) ? 0 : slope;
    }

    /**
     * Analyze result patterns
     */
    analyzeResultPatterns(matches, teamId) {
      if (!teamId) return this.getEmptyResultPatterns();

      const patterns = {
        consecutiveWins: 0,
        consecutiveDraws: 0,
        consecutiveLosses: 0,
        longestWinStreak: 0,
        longestWinlessStreak: 0,
        longestUnbeatenStreak: 0,
        alternatingResults: 0,
        comeFromBehindWins: 0,
        leadLosses: 0,
        bigWins: 0, // 3+ goal margin
        bigLosses: 0,
        narrowWins: 0, // 1 goal margin
        narrowLosses: 0,
      };

      let currentWins = 0;
      let currentDraws = 0;
      let currentLosses = 0;
      let currentUnbeaten = 0;
      let currentWinless = 0;
      let lastResult = null;
      let alternating = 0;

      matches.forEach(match => {
        const result = this.getMatchResult(match, teamId);
        const goalDiff = this.getGoalDifference(match, teamId);

        // Track current streaks
        if (result === 'W') {
          currentWins++;
          currentUnbeaten++;
          currentDraws = 0;
          currentLosses = 0;
          currentWinless = 0;

          patterns.longestWinStreak = Math.max(patterns.longestWinStreak, currentWins);

          if (Math.abs(goalDiff) >= 3) patterns.bigWins++;
          if (Math.abs(goalDiff) === 1) patterns.narrowWins++;
        } else if (result === 'D') {
          currentDraws++;
          currentUnbeaten++;
          currentWinless++;
          currentWins = 0;
          currentLosses = 0;
        } else {
          // Loss
          currentLosses++;
          currentWinless++;
          currentWins = 0;
          currentDraws = 0;
          currentUnbeaten = 0;

          if (Math.abs(goalDiff) >= 3) patterns.bigLosses++;
          if (Math.abs(goalDiff) === 1) patterns.narrowLosses++;
        }

        patterns.longestUnbeatenStreak = Math.max(patterns.longestUnbeatenStreak, currentUnbeaten);
        patterns.longestWinlessStreak = Math.max(patterns.longestWinlessStreak, currentWinless);

        // Check for alternating pattern
        if (lastResult && result !== lastResult) {
          alternating++;
        } else {
          alternating = 0;
        }
        patterns.alternatingResults = Math.max(patterns.alternatingResults, alternating);

        lastResult = result;
      });

      // Set current streaks
      patterns.consecutiveWins = currentWins;
      patterns.consecutiveDraws = currentDraws;
      patterns.consecutiveLosses = currentLosses;

      return patterns;
    }

    /**
     * Analyze venue-specific form
     */
    analyzeVenueForm(matches, teamId) {
      const homeMatches = matches.filter(
        match => String(match.homeTeamId || match.home_team_id) === String(teamId)
      );
      const awayMatches = matches.filter(
        match => String(match.awayTeamId || match.away_team_id) === String(teamId)
      );

      return {
        home: this.calculatePeriodForm(homeMatches, teamId),
        away: this.calculatePeriodForm(awayMatches, teamId),
        homeAdvantage: this.calculateHomeAdvantage(homeMatches, awayMatches, teamId),
      };
    }

    /**
     * Calculate home advantage
     */
    calculateHomeAdvantage(homeMatches, awayMatches, teamId) {
      if (homeMatches.length === 0 || awayMatches.length === 0) {
        return { exists: false, magnitude: 0 };
      }

      const homeForm = this.calculatePeriodForm(homeMatches, teamId);
      const awayForm = this.calculatePeriodForm(awayMatches, teamId);

      const ppgDifference = homeForm.pointsPerGame - awayForm.pointsPerGame;
      const goalDifference = homeForm.avgGoalsFor - awayForm.avgGoalsFor;

      return {
        exists: ppgDifference > 0.3,
        magnitude: this.baseStats.round(ppgDifference, 2),
        goalDifference: this.baseStats.round(goalDifference, 2),
        homePPG: homeForm.pointsPerGame,
        awayPPG: awayForm.pointsPerGame,
      };
    }

    /**
     * Analyze streaks
     */
    analyzeStreaks(matches, teamId) {
      if (!teamId) return this.getEmptyStreaks();

      const streaks = {
        current: { type: 'none', length: 0 },
        longest: {
          win: 0,
          unbeaten: 0,
          winless: 0,
          loss: 0,
          scoring: 0,
          cleanSheet: 0,
        },
      };

      let currentWin = 0;
      let currentUnbeaten = 0;
      let currentWinless = 0;
      let currentLoss = 0;
      let currentScoring = 0;
      let currentCleanSheet = 0;

      matches.forEach(match => {
        const result = this.getMatchResult(match, teamId);
        const teamGoals = this.getTeamGoals(match, teamId);
        const opponentGoals = this.getOpponentGoals(match, teamId);

        // Win streak
        if (result === 'W') {
          currentWin++;
          currentUnbeaten++;
          currentWinless = 0;
          currentLoss = 0;
        } else {
          streaks.longest.win = Math.max(streaks.longest.win, currentWin);
          currentWin = 0;
          currentWinless++;

          if (result === 'L') {
            currentLoss++;
            currentUnbeaten = 0;
          } else {
            currentUnbeaten++;
            streaks.longest.loss = Math.max(streaks.longest.loss, currentLoss);
            currentLoss = 0;
          }
        }

        // Scoring streak
        if (teamGoals > 0) {
          currentScoring++;
          currentCleanSheet = 0;
        } else {
          streaks.longest.scoring = Math.max(streaks.longest.scoring, currentScoring);
          currentScoring = 0;
        }

        // Clean sheet streak
        if (opponentGoals === 0) {
          currentCleanSheet++;
        } else {
          streaks.longest.cleanSheet = Math.max(streaks.longest.cleanSheet, currentCleanSheet);
          currentCleanSheet = 0;
        }
      });

      // Update longest streaks with current if they're ongoing
      streaks.longest.win = Math.max(streaks.longest.win, currentWin);
      streaks.longest.unbeaten = Math.max(streaks.longest.unbeaten, currentUnbeaten);
      streaks.longest.winless = Math.max(streaks.longest.winless, currentWinless);
      streaks.longest.loss = Math.max(streaks.longest.loss, currentLoss);
      streaks.longest.scoring = Math.max(streaks.longest.scoring, currentScoring);
      streaks.longest.cleanSheet = Math.max(streaks.longest.cleanSheet, currentCleanSheet);

      // Determine current streak
      if (currentWin > 0) {
        streaks.current = { type: 'win', length: currentWin };
      } else if (currentLoss > 0) {
        streaks.current = { type: 'loss', length: currentLoss };
      } else if (currentUnbeaten > 0) {
        streaks.current = { type: 'unbeaten', length: currentUnbeaten };
      } else if (currentWinless > 0) {
        streaks.current = { type: 'winless', length: currentWinless };
      }

      return streaks;
    }

    /**
     * Filter matches based on options
     */
    filterMatches(matches, options = {}) {
      let filtered = [...matches];

      // Filter by venue
      if (options.venue && options.venue !== 'overall') {
        if (options.venue === 'home') {
          filtered = filtered.filter(
            match => String(match.homeTeamId || match.home_team_id) === String(options.teamId)
          );
        } else if (options.venue === 'away') {
          filtered = filtered.filter(
            match => String(match.awayTeamId || match.away_team_id) === String(options.teamId)
          );
        }
      }

      // Filter by competition
      if (options.competition) {
        filtered = filtered.filter(
          match =>
            match.competition === options.competition || match.competitionId === options.competition
        );
      }

      // Filter by date range
      if (options.dateFrom || options.dateTo) {
        filtered = filtered.filter(match => {
          const matchDate = new Date(match.date || match.matchDate);
          if (options.dateFrom && matchDate < new Date(options.dateFrom)) return false;
          if (options.dateTo && matchDate > new Date(options.dateTo)) return false;
          return true;
        });
      }

      return filtered;
    }

    /**
     * Helper methods
     */
    getMatchResult(match, teamId) {
      const isHome = String(match.homeTeamId || match.home_team_id) === String(teamId);
      const teamGoals = isHome
        ? parseInt(match.homeGoals || match.home_goals || 0)
        : parseInt(match.awayGoals || match.away_goals || 0);
      const opponentGoals = isHome
        ? parseInt(match.awayGoals || match.away_goals || 0)
        : parseInt(match.homeGoals || match.home_goals || 0);

      if (teamGoals > opponentGoals) return 'W';
      if (teamGoals === opponentGoals) return 'D';
      return 'L';
    }

    getGoalDifference(match, teamId) {
      const isHome = String(match.homeTeamId || match.home_team_id) === String(teamId);
      const teamGoals = isHome
        ? parseInt(match.homeGoals || match.home_goals || 0)
        : parseInt(match.awayGoals || match.away_goals || 0);
      const opponentGoals = isHome
        ? parseInt(match.awayGoals || match.away_goals || 0)
        : parseInt(match.homeGoals || match.home_goals || 0);

      return teamGoals - opponentGoals;
    }

    getTeamGoals(match, teamId) {
      const isHome = String(match.homeTeamId || match.home_team_id) === String(teamId);
      return isHome
        ? parseInt(match.homeGoals || match.home_goals || 0)
        : parseInt(match.awayGoals || match.away_goals || 0);
    }

    getOpponentGoals(match, teamId) {
      const isHome = String(match.homeTeamId || match.home_team_id) === String(teamId);
      return isHome
        ? parseInt(match.awayGoals || match.away_goals || 0)
        : parseInt(match.homeGoals || match.home_goals || 0);
    }

    /**
     * Additional analysis methods (stubs for now)
     */
    analyzeCompetitionForm(matches, teamId) {
      // Group by competition and analyze
      return {};
    }

    analyzeGoalForm(matches, teamId) {
      const last10 = matches.slice(0, 10);
      return this.calculatePeriodForm(last10, teamId);
    }

    analyzeDefensiveForm(matches, teamId) {
      const last10 = matches.slice(0, 10);
      return this.calculatePeriodForm(last10, teamId);
    }

    analyzeConsistency(matches, teamId) {
      if (matches.length < 5) return { score: 0, level: 'unknown' };

      const results = matches.slice(0, 10).map(match => this.getMatchResult(match, teamId));
      const consistency = this.calculateConsistencyScore(matches.slice(0, 10), teamId);

      return {
        score: consistency,
        level: consistency > 0.7 ? 'high' : consistency > 0.4 ? 'medium' : 'low',
        variance: this.calculateResultVariance(results),
      };
    }

    calculateConsistencyScore(matches, teamId) {
      if (matches.length === 0) return 0;

      const points = matches.map(match => {
        const result = this.getMatchResult(match, teamId);
        return result === 'W' ? 3 : result === 'D' ? 1 : 0;
      });

      const mean = this.baseStats.average(points);

      // Calculate variance manually since baseStats.variance might not be available
      let variance = 0;
      if (points.length > 1) {
        const squaredDiffs = points.map(p => Math.pow(p - mean, 2));
        variance = this.baseStats.average(squaredDiffs);
      }

      // Normalize consistency (lower variance = higher consistency)
      return Math.max(0, 1 - variance / 9); // Max variance is 9 (3^2)
    }

    calculateResultVariance(results) {
      const counts = { W: 0, D: 0, L: 0 };
      results.forEach(result => counts[result]++);

      const total = results.length;
      const expected = total / 3; // Expected if perfectly distributed

      return Math.sqrt(
        (Math.pow(counts.W - expected, 2) +
          Math.pow(counts.D - expected, 2) +
          Math.pow(counts.L - expected, 2)) /
          3
      );
    }

    compareRecentVsHistorical(matches, teamId) {
      const recent = matches.slice(0, 5);
      const historical = matches.slice(5, 20);

      if (recent.length === 0 || historical.length === 0) {
        return { comparison: 'insufficient_data' };
      }

      const recentForm = this.calculatePeriodForm(recent, teamId);
      const historicalForm = this.calculatePeriodForm(historical, teamId);

      return {
        recent: recentForm,
        historical: historicalForm,
        improvement: {
          points: recentForm.pointsPerGame - historicalForm.pointsPerGame,
          goals: recentForm.avgGoalsFor - historicalForm.avgGoalsFor,
          defense: historicalForm.avgGoalsAgainst - recentForm.avgGoalsAgainst,
        },
        comparison:
          recentForm.pointsPerGame > historicalForm.pointsPerGame
            ? 'improving'
            : recentForm.pointsPerGame < historicalForm.pointsPerGame
              ? 'declining'
              : 'stable',
      };
    }

    calculatePredictiveIndicators(matches, teamId) {
      // Placeholder for predictive analysis
      return {
        nextMatchProbability: { win: 33, draw: 33, loss: 34 },
        formMomentum: 0.5,
        consistency: 0.5,
      };
    }

    analyzeFormStability(matches, teamId) {
      if (matches.length < 10) return { stable: false, volatility: 0 };

      const results = matches.slice(0, 10).map(match => {
        const result = this.getMatchResult(match, teamId);
        return result === 'W' ? 3 : result === 'D' ? 1 : 0;
      });

      const volatility = this.baseStats.standardDeviation(results);

      return {
        stable: volatility < 1.2,
        volatility: this.baseStats.round(volatility, 2),
        stability: Math.max(0, 1 - volatility / 3),
      };
    }

    calculatePerformanceStability(periodicData) {
      const pointsStd = this.baseStats.standardDeviation(periodicData.points);
      const goalsStd = this.baseStats.standardDeviation(periodicData.goalsFor);

      return {
        points: 1 - Math.min(pointsStd / 2, 1),
        goals: 1 - Math.min(goalsStd / 2, 1),
      };
    }

    identifyImprovementAreas(periodicData) {
      const areas = [];

      if (this.calculateTrend(periodicData.goalsAgainst).direction === 'increasing') {
        areas.push('defense');
      }
      if (this.calculateTrend(periodicData.goalsFor).direction === 'decreasing') {
        areas.push('attack');
      }
      if (this.calculateTrend(periodicData.points).direction === 'decreasing') {
        areas.push('overall_performance');
      }

      return areas;
    }

    identifyStrengthAreas(periodicData) {
      const areas = [];

      if (this.calculateTrend(periodicData.goalsFor).direction === 'increasing') {
        areas.push('attack');
      }
      if (this.calculateTrend(periodicData.goalsAgainst).direction === 'decreasing') {
        areas.push('defense');
      }
      if (this.calculateTrend(periodicData.cleanSheets).direction === 'increasing') {
        areas.push('clean_sheets');
      }

      return areas;
    }

    /**
     * Empty data structures
     */
    getEmptyFormAnalysis() {
      return {
        totalMatches: 0,
        teamId: null,
        formPeriods: {},
        currentFormRating: 0,
        momentum: { score: 0, direction: 'neutral', confidence: 'low' },
        performanceTrends: this.getEmptyPerformanceTrends(),
        resultPatterns: this.getEmptyResultPatterns(),
        venueForm: { home: this.getEmptyPeriodForm(), away: this.getEmptyPeriodForm() },
        competitionForm: {},
        goalForm: this.getEmptyPeriodForm(),
        defensiveForm: this.getEmptyPeriodForm(),
        consistency: { score: 0, level: 'unknown' },
        recentVsHistorical: { comparison: 'insufficient_data' },
        streaks: this.getEmptyStreaks(),
        predictiveIndicators: {},
        stability: { stable: false, volatility: 0 },
      };
    }

    getEmptyPeriodForm() {
      return {
        matches: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        points: 0,
        pointsPerGame: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        goalDifference: 0,
        avgGoalsFor: 0,
        avgGoalsAgainst: 0,
        cleanSheets: 0,
        cleanSheetPercentage: 0,
        failedToScore: 0,
        failedToScorePercentage: 0,
        winPercentage: 0,
        formString: '',
        formRating: 0,
      };
    }

    getEmptyPerformanceTrends() {
      return {
        pointsTrend: { direction: 'stable', strength: 0 },
        goalsScoredTrend: { direction: 'stable', strength: 0 },
        goalsConcededTrend: { direction: 'stable', strength: 0 },
        cleanSheetsTrend: { direction: 'stable', strength: 0 },
        performanceStability: { points: 0, goals: 0 },
        improvementAreas: [],
        strengthAreas: [],
      };
    }

    getEmptyResultPatterns() {
      return {
        consecutiveWins: 0,
        consecutiveDraws: 0,
        consecutiveLosses: 0,
        longestWinStreak: 0,
        longestWinlessStreak: 0,
        longestUnbeatenStreak: 0,
        alternatingResults: 0,
        comeFromBehindWins: 0,
        leadLosses: 0,
        bigWins: 0,
        bigLosses: 0,
        narrowWins: 0,
        narrowLosses: 0,
      };
    }

    getEmptyStreaks() {
      return {
        current: { type: 'none', length: 0 },
        longest: {
          win: 0,
          unbeaten: 0,
          winless: 0,
          loss: 0,
          scoring: 0,
          cleanSheet: 0,
        },
      };
    }

    /**
     * Get performance metrics
     */
    getMetrics() {
      return {
        ...this.metrics,
        uptime: Date.now() - this.metrics.startTime,
        avgCalculationTime:
          this.metrics.calculations > 0
            ? this.baseStats.round(this.metrics.totalTime / this.metrics.calculations, 3)
            : 0,
      };
    }
  }

  // Export
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = FormAnalyzer;
  } else {
    global.TeamStatsFormAnalyzer = new FormAnalyzer();
  }
})(typeof window !== 'undefined' ? window : this);
