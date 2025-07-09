/**
 * Goals Statistics Module
 * Handles all goal-related calculations and analysis
 * Extends BaseStatistics for common functionality
 */

(function (global) {
  'use strict';

  class GoalsStatistics {
    constructor() {
      this.name = 'GoalsStatistics';
      this.version = '1.0.0';

      // Dependencies
      this.baseStats = global.TeamStatsBaseStatistics;
      this.teamService = global.TeamStatsTeamService;

      if (!this.baseStats) {
        console.error('[GoalsStatistics] BaseStatistics module is required');
      }

      // Goal thresholds for over/under calculations
      this.overUnderThresholds = [0.5, 1.5, 2.5, 3.5, 4.5, 5.5];

      // Time intervals for goal timing analysis
      this.timeIntervals = [
        { label: '0-15', start: 0, end: 15 },
        { label: '16-30', start: 16, end: 30 },
        { label: '31-45', start: 31, end: 45 },
        { label: '46-60', start: 46, end: 60 },
        { label: '61-75', start: 61, end: 75 },
        { label: '76-90', start: 76, end: 90 },
      ];

      // Performance metrics
      this.metrics = {
        calculations: 0,
        startTime: Date.now(),
      };
    }

    /**
     * Calculate comprehensive goal statistics
     */
    calculateGoalStatistics(matches, options = {}) {
      if (!Array.isArray(matches) || matches.length === 0) {
        return this.getEmptyStatistics();
      }

      const startTime = performance.now();
      this.metrics.calculations++;

      // Filter matches based on options
      const filteredMatches = this.filterMatches(matches, options);

      const stats = {
        // Basic statistics
        matches: filteredMatches.length,
        totalGoals: this.calculateTotalGoals(filteredMatches),
        goalsFor: this.calculateGoalsFor(filteredMatches, options.teamId),
        goalsAgainst: this.calculateGoalsAgainst(filteredMatches, options.teamId),

        // Averages
        avgGoalsFor: 0,
        avgGoalsAgainst: 0,
        avgTotalGoals: 0,

        // Goal timing
        firstHalfGoals: this.calculateHalfGoals(filteredMatches, 'first'),
        secondHalfGoals: this.calculateHalfGoals(filteredMatches, 'second'),

        // Over/Under statistics
        overUnder: this.calculateOverUnder(filteredMatches),

        // Both teams to score
        btts: this.calculateBTTS(filteredMatches),

        // Clean sheets
        cleanSheets: this.calculateCleanSheets(filteredMatches, options.teamId),
        failedToScore: this.calculateFailedToScore(filteredMatches, options.teamId),

        // Goal timing distribution
        goalTiming: this.calculateGoalTiming(filteredMatches),

        // Scoring patterns
        scoringPatterns: this.calculateScoringPatterns(filteredMatches, options.teamId),

        // Advanced metrics
        expectedGoals: this.calculateExpectedGoals(filteredMatches, options.teamId),
        scoringRate: this.calculateScoringRate(filteredMatches, options.teamId),

        // Form and trends
        form: this.calculateGoalForm(filteredMatches, options.teamId),
        trend: this.calculateGoalTrend(filteredMatches, options.teamId),
      };

      // Calculate averages
      if (stats.matches > 0) {
        stats.avgGoalsFor = this.baseStats.divide(stats.goalsFor, stats.matches);
        stats.avgGoalsAgainst = this.baseStats.divide(stats.goalsAgainst, stats.matches);
        stats.avgTotalGoals = this.baseStats.divide(stats.totalGoals, stats.matches);
      }

      // Add performance metric
      stats.calculationTime = performance.now() - startTime;

      return stats;
    }

    /**
     * Filter matches based on options
     */
    filterMatches(matches, options = {}) {
      let filtered = [...matches];

      // Filter by venue
      if (options.venue && options.venue !== 'overall') {
        filtered = this.baseStats.filterByVenue(filtered, options.venue);
      }

      // Filter by timeframe
      if (options.timeFrame && options.timeFrame !== 'all') {
        const limit = parseInt(options.timeFrame.replace('last', ''));
        if (!isNaN(limit)) {
          filtered = this.baseStats.getLastNMatches(filtered, limit);
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
      if (options.startDate || options.endDate) {
        filtered = this.filterByDateRange(filtered, options.startDate, options.endDate);
      }

      return filtered;
    }

    /**
     * Calculate total goals in matches
     */
    calculateTotalGoals(matches) {
      return matches.reduce((total, match) => {
        const homeGoals = parseInt(match.homeGoals || match.home_goals || 0);
        const awayGoals = parseInt(match.awayGoals || match.away_goals || 0);
        return total + homeGoals + awayGoals;
      }, 0);
    }

    /**
     * Calculate goals scored by team
     */
    calculateGoalsFor(matches, teamId) {
      if (!teamId) return 0;

      return matches.reduce((total, match) => {
        const isHome = String(match.homeTeamId || match.home_team_id) === String(teamId);
        const goalsFor = isHome
          ? parseInt(match.homeGoals || match.home_goals || 0)
          : parseInt(match.awayGoals || match.away_goals || 0);
        return total + goalsFor;
      }, 0);
    }

    /**
     * Calculate goals conceded by team
     */
    calculateGoalsAgainst(matches, teamId) {
      if (!teamId) return 0;

      return matches.reduce((total, match) => {
        const isHome = String(match.homeTeamId || match.home_team_id) === String(teamId);
        const goalsAgainst = isHome
          ? parseInt(match.awayGoals || match.away_goals || 0)
          : parseInt(match.homeGoals || match.home_goals || 0);
        return total + goalsAgainst;
      }, 0);
    }

    /**
     * Calculate goals by half
     */
    calculateHalfGoals(matches, half) {
      return matches.reduce((total, match) => {
        if (half === 'first') {
          return (
            total +
            (parseInt(match.halfTimeHomeGoals || 0) + parseInt(match.halfTimeAwayGoals || 0))
          );
        } else {
          const ftHome = parseInt(match.homeGoals || match.home_goals || 0);
          const ftAway = parseInt(match.awayGoals || match.away_goals || 0);
          const htHome = parseInt(match.halfTimeHomeGoals || 0);
          const htAway = parseInt(match.halfTimeAwayGoals || 0);
          return total + (ftHome - htHome + (ftAway - htAway));
        }
      }, 0);
    }

    /**
     * Calculate over/under statistics
     */
    calculateOverUnder(matches) {
      const stats = {};

      this.overUnderThresholds.forEach(threshold => {
        const key = `over${threshold.toString().replace('.', '_')}`;
        const overMatches = matches.filter(match => {
          const totalGoals = parseInt(match.homeGoals || 0) + parseInt(match.awayGoals || 0);
          return totalGoals > threshold;
        });

        stats[key] = {
          count: overMatches.length,
          percentage: this.baseStats.percentage(overMatches.length, matches.length),
        };

        // Also calculate under
        const underKey = `under${threshold.toString().replace('.', '_')}`;
        stats[underKey] = {
          count: matches.length - overMatches.length,
          percentage: this.baseStats.percentage(
            matches.length - overMatches.length,
            matches.length
          ),
        };
      });

      return stats;
    }

    /**
     * Calculate Both Teams To Score statistics
     */
    calculateBTTS(matches) {
      const bttsMatches = matches.filter(match => {
        const homeGoals = parseInt(match.homeGoals || match.home_goals || 0);
        const awayGoals = parseInt(match.awayGoals || match.away_goals || 0);
        return homeGoals > 0 && awayGoals > 0;
      });

      return {
        yes: {
          count: bttsMatches.length,
          percentage: this.baseStats.percentage(bttsMatches.length, matches.length),
        },
        no: {
          count: matches.length - bttsMatches.length,
          percentage: this.baseStats.percentage(
            matches.length - bttsMatches.length,
            matches.length
          ),
        },
      };
    }

    /**
     * Calculate clean sheets
     */
    calculateCleanSheets(matches, teamId) {
      if (!teamId) return { count: 0, percentage: 0 };

      const cleanSheets = matches.filter(match => {
        const isHome = String(match.homeTeamId || match.home_team_id) === String(teamId);
        const goalsAgainst = isHome
          ? parseInt(match.awayGoals || match.away_goals || 0)
          : parseInt(match.homeGoals || match.home_goals || 0);
        return goalsAgainst === 0;
      });

      return {
        count: cleanSheets.length,
        percentage: this.baseStats.percentage(cleanSheets.length, matches.length),
      };
    }

    /**
     * Calculate failed to score
     */
    calculateFailedToScore(matches, teamId) {
      if (!teamId) return { count: 0, percentage: 0 };

      const failedToScore = matches.filter(match => {
        const isHome = String(match.homeTeamId || match.home_team_id) === String(teamId);
        const goalsFor = isHome
          ? parseInt(match.homeGoals || match.home_goals || 0)
          : parseInt(match.awayGoals || match.away_goals || 0);
        return goalsFor === 0;
      });

      return {
        count: failedToScore.length,
        percentage: this.baseStats.percentage(failedToScore.length, matches.length),
      };
    }

    /**
     * Calculate goal timing distribution
     */
    calculateGoalTiming(matches) {
      const distribution = {};

      // Initialize intervals
      this.timeIntervals.forEach(interval => {
        distribution[interval.label] = {
          goals: 0,
          percentage: 0,
        };
      });

      // Count goals by interval
      let totalGoalsWithTiming = 0;

      matches.forEach(match => {
        if (match.goalTimings && Array.isArray(match.goalTimings)) {
          match.goalTimings.forEach(timing => {
            const minute = parseInt(timing.minute || timing);
            const interval = this.timeIntervals.find(
              int => minute >= int.start && minute <= int.end
            );

            if (interval) {
              distribution[interval.label].goals++;
              totalGoalsWithTiming++;
            }
          });
        }
      });

      // Calculate percentages
      if (totalGoalsWithTiming > 0) {
        Object.keys(distribution).forEach(key => {
          distribution[key].percentage = this.baseStats.percentage(
            distribution[key].goals,
            totalGoalsWithTiming
          );
        });
      }

      return distribution;
    }

    /**
     * Calculate scoring patterns
     */
    calculateScoringPatterns(matches, teamId) {
      if (!teamId) return this.getEmptyScoringPatterns();

      const patterns = {
        scoredFirst: 0,
        concededFirst: 0,
        comebackWins: 0,
        thrownAwayLeads: 0,
        scoringStreak: 0,
        currentStreak: 0,
        highestStreak: 0,
        scorelessStreak: 0,
        currentScorelessStreak: 0,
        highestScorelessStreak: 0,
      };

      let currentScoringStreak = 0;
      let currentScorelessStreak = 0;

      matches.forEach(match => {
        const isHome = String(match.homeTeamId || match.home_team_id) === String(teamId);
        const goalsFor = isHome
          ? parseInt(match.homeGoals || match.home_goals || 0)
          : parseInt(match.awayGoals || match.away_goals || 0);
        const goalsAgainst = isHome
          ? parseInt(match.awayGoals || match.away_goals || 0)
          : parseInt(match.homeGoals || match.home_goals || 0);

        // Scoring streaks
        if (goalsFor > 0) {
          currentScoringStreak++;
          currentScorelessStreak = 0;
          patterns.highestStreak = Math.max(patterns.highestStreak, currentScoringStreak);
        } else {
          currentScorelessStreak++;
          currentScoringStreak = 0;
          patterns.highestScorelessStreak = Math.max(
            patterns.highestScorelessStreak,
            currentScorelessStreak
          );
        }

        // First goal patterns (if data available)
        if (match.firstGoal) {
          const scoredFirst = match.firstGoal.team === teamId;
          if (scoredFirst) {
            patterns.scoredFirst++;
          } else {
            patterns.concededFirst++;
          }

          // Comeback wins and thrown away leads
          if (scoredFirst && goalsFor < goalsAgainst) {
            patterns.thrownAwayLeads++;
          } else if (!scoredFirst && goalsFor > goalsAgainst) {
            patterns.comebackWins++;
          }
        }
      });

      patterns.currentStreak = currentScoringStreak;
      patterns.currentScorelessStreak = currentScorelessStreak;

      return patterns;
    }

    /**
     * Calculate expected goals (if xG data available)
     */
    calculateExpectedGoals(matches, teamId) {
      if (!teamId) return { xGFor: 0, xGAgainst: 0, xGDiff: 0 };

      let xGFor = 0;
      let xGAgainst = 0;
      let matchesWithXG = 0;

      matches.forEach(match => {
        if (match.xG) {
          const isHome = String(match.homeTeamId || match.home_team_id) === String(teamId);

          if (isHome && match.xG.home != null) {
            xGFor += parseFloat(match.xG.home);
            xGAgainst += parseFloat(match.xG.away || 0);
            matchesWithXG++;
          } else if (!isHome && match.xG.away != null) {
            xGFor += parseFloat(match.xG.away);
            xGAgainst += parseFloat(match.xG.home || 0);
            matchesWithXG++;
          }
        }
      });

      return {
        xGFor: this.baseStats.round(xGFor, 2),
        xGAgainst: this.baseStats.round(xGAgainst, 2),
        xGDiff: this.baseStats.round(xGFor - xGAgainst, 2),
        avgXGFor: matchesWithXG > 0 ? this.baseStats.divide(xGFor, matchesWithXG) : 0,
        avgXGAgainst: matchesWithXG > 0 ? this.baseStats.divide(xGAgainst, matchesWithXG) : 0,
        matchesWithData: matchesWithXG,
      };
    }

    /**
     * Calculate scoring rate and efficiency
     */
    calculateScoringRate(matches, teamId) {
      if (!teamId || matches.length === 0) {
        return { rate: 0, efficiency: 0, consistency: 0 };
      }

      const goalsPerMatch = matches.map(match => {
        const isHome = String(match.homeTeamId || match.home_team_id) === String(teamId);
        return isHome
          ? parseInt(match.homeGoals || match.home_goals || 0)
          : parseInt(match.awayGoals || match.away_goals || 0);
      });

      const scoringMatches = goalsPerMatch.filter(goals => goals > 0).length;
      const avgGoals = this.baseStats.average(goalsPerMatch);
      const stdDev = this.baseStats.standardDeviation(goalsPerMatch);

      return {
        rate: this.baseStats.percentage(scoringMatches, matches.length),
        avgGoalsWhenScoring:
          scoringMatches > 0
            ? this.baseStats.divide(
                goalsPerMatch.reduce((sum, g) => sum + g, 0),
                scoringMatches
              )
            : 0,
        efficiency: avgGoals,
        consistency: avgGoals > 0 ? this.baseStats.round((1 - stdDev / avgGoals) * 100, 1) : 0,
      };
    }

    /**
     * Calculate goal form (last 5 matches)
     */
    calculateGoalForm(matches, teamId) {
      const last5 = this.baseStats.getLastNMatches(matches, 5);

      return {
        matches: last5.length,
        goalsFor: this.calculateGoalsFor(last5, teamId),
        goalsAgainst: this.calculateGoalsAgainst(last5, teamId),
        avgGoalsFor:
          last5.length > 0
            ? this.baseStats.divide(this.calculateGoalsFor(last5, teamId), last5.length)
            : 0,
        avgGoalsAgainst:
          last5.length > 0
            ? this.baseStats.divide(this.calculateGoalsAgainst(last5, teamId), last5.length)
            : 0,
        cleanSheets: this.calculateCleanSheets(last5, teamId).count,
        failedToScore: this.calculateFailedToScore(last5, teamId).count,
      };
    }

    /**
     * Calculate goal trend
     */
    calculateGoalTrend(matches, teamId) {
      if (matches.length < 10) {
        return { trend: 'neutral', confidence: 'low' };
      }

      const goalsPerMatch = matches.map(match => {
        const isHome = String(match.homeTeamId || match.home_team_id) === String(teamId);
        return isHome
          ? parseInt(match.homeGoals || match.home_goals || 0)
          : parseInt(match.awayGoals || match.away_goals || 0);
      });

      const trend = this.baseStats.calculateTrend(goalsPerMatch);
      const confidence = matches.length >= 20 ? 'high' : 'medium';

      return { trend, confidence };
    }

    /**
     * Filter matches by date range
     */
    filterByDateRange(matches, startDate, endDate) {
      return matches.filter(match => {
        const matchDate = new Date(match.date || match.matchDate);
        if (startDate && matchDate < new Date(startDate)) return false;
        if (endDate && matchDate > new Date(endDate)) return false;
        return true;
      });
    }

    /**
     * Get empty statistics object
     */
    getEmptyStatistics() {
      return {
        matches: 0,
        totalGoals: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        avgGoalsFor: 0,
        avgGoalsAgainst: 0,
        avgTotalGoals: 0,
        firstHalfGoals: 0,
        secondHalfGoals: 0,
        overUnder: {},
        btts: { yes: { count: 0, percentage: 0 }, no: { count: 0, percentage: 0 } },
        cleanSheets: { count: 0, percentage: 0 },
        failedToScore: { count: 0, percentage: 0 },
        goalTiming: {},
        scoringPatterns: this.getEmptyScoringPatterns(),
        expectedGoals: { xGFor: 0, xGAgainst: 0, xGDiff: 0 },
        scoringRate: { rate: 0, efficiency: 0, consistency: 0 },
        form: {},
        trend: { trend: 'neutral', confidence: 'low' },
      };
    }

    /**
     * Get empty scoring patterns object
     */
    getEmptyScoringPatterns() {
      return {
        scoredFirst: 0,
        concededFirst: 0,
        comebackWins: 0,
        thrownAwayLeads: 0,
        scoringStreak: 0,
        currentStreak: 0,
        highestStreak: 0,
        scorelessStreak: 0,
        currentScorelessStreak: 0,
        highestScorelessStreak: 0,
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
    module.exports = GoalsStatistics;
  } else {
    global.TeamStatsGoalsStatistics = new GoalsStatistics();
  }
})(typeof window !== 'undefined' ? window : this);
