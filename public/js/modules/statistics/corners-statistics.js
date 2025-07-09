/**
 * Corners Statistics Module
 * Handles all corner-related calculations and analysis
 * Extends BaseStatistics for common functionality
 */

(function (global) {
  'use strict';

  class CornersStatistics {
    constructor() {
      this.name = 'CornersStatistics';
      this.version = '1.0.0';

      // Dependencies
      this.baseStats = global.TeamStatsBaseStatistics;

      if (!this.baseStats) {
        console.error('[CornersStatistics] BaseStatistics module is required');
      }

      // Corner thresholds for over/under calculations
      this.overUnderThresholds = [6.5, 7.5, 8.5, 9.5, 10.5, 11.5, 12.5];

      // Time intervals for corner timing analysis
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
     * Calculate comprehensive corner statistics
     */
    calculateCornerStatistics(matches, options = {}) {
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
        totalCorners: this.calculateTotalCorners(filteredMatches),
        cornersFor: this.calculateCornersFor(filteredMatches, options.teamId),
        cornersAgainst: this.calculateCornersAgainst(filteredMatches, options.teamId),

        // Averages
        avgCornersFor: 0,
        avgCornersAgainst: 0,
        avgTotalCorners: 0,

        // Corner timing
        firstHalfCorners: this.calculateHalfCorners(filteredMatches, 'first'),
        secondHalfCorners: this.calculateHalfCorners(filteredMatches, 'second'),

        // Over/Under statistics
        overUnder: this.calculateOverUnder(filteredMatches),

        // Team corners analysis
        teamCornersOver: this.calculateTeamCornersOver(filteredMatches, options.teamId),
        opponentCornersOver: this.calculateOpponentCornersOver(filteredMatches, options.teamId),

        // Corner timing distribution
        cornerTiming: this.calculateCornerTiming(filteredMatches),

        // Corner patterns
        cornerPatterns: this.calculateCornerPatterns(filteredMatches, options.teamId),

        // Early/Late corners
        earlyCorners: this.calculateEarlyCorners(filteredMatches),
        lateCorners: this.calculateLateCorners(filteredMatches),

        // Corner sequences
        cornerSequences: this.calculateCornerSequences(filteredMatches, options.teamId),

        // High corner matches
        highCornerMatches: this.getHighCornerMatches(filteredMatches),

        // Form and trends
        form: this.calculateCornerForm(filteredMatches, options.teamId),
        trend: this.calculateCornerTrend(filteredMatches, options.teamId),

        // Corner efficiency
        cornerEfficiency: this.calculateCornerEfficiency(filteredMatches, options.teamId),

        // Corner handicap
        cornerHandicap: this.calculateCornerHandicap(filteredMatches, options.teamId),

        // Match periods analysis
        periodAnalysis: this.calculatePeriodAnalysis(filteredMatches),
      };

      // Calculate averages
      if (stats.matches > 0) {
        stats.avgCornersFor = this.baseStats.divide(stats.cornersFor, stats.matches);
        stats.avgCornersAgainst = this.baseStats.divide(stats.cornersAgainst, stats.matches);
        stats.avgTotalCorners = this.baseStats.divide(stats.totalCorners, stats.matches);
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

      // Filter by corner range
      if (options.minCorners || options.maxCorners) {
        filtered = filtered.filter(match => {
          const totalCorners =
            this.getMatchCorners(match, 'home') + this.getMatchCorners(match, 'away');
          if (options.minCorners && totalCorners < options.minCorners) return false;
          if (options.maxCorners && totalCorners > options.maxCorners) return false;
          return true;
        });
      }

      return filtered;
    }

    /**
     * Calculate total corners in matches
     */
    calculateTotalCorners(matches) {
      return matches.reduce((total, match) => {
        const homeCorners = this.getMatchCorners(match, 'home');
        const awayCorners = this.getMatchCorners(match, 'away');
        return total + homeCorners + awayCorners;
      }, 0);
    }

    /**
     * Calculate corners won by team
     */
    calculateCornersFor(matches, teamId) {
      if (!teamId) return 0;

      return matches.reduce((total, match) => {
        const isHome = String(match.homeTeamId || match.home_team_id) === String(teamId);
        const corners = isHome
          ? this.getMatchCorners(match, 'home')
          : this.getMatchCorners(match, 'away');
        return total + corners;
      }, 0);
    }

    /**
     * Calculate corners conceded by team
     */
    calculateCornersAgainst(matches, teamId) {
      if (!teamId) return 0;

      return matches.reduce((total, match) => {
        const isHome = String(match.homeTeamId || match.home_team_id) === String(teamId);
        const corners = isHome
          ? this.getMatchCorners(match, 'away')
          : this.getMatchCorners(match, 'home');
        return total + corners;
      }, 0);
    }

    /**
     * Get corners from match data
     */
    getMatchCorners(match, side) {
      // Try different possible field names
      return parseInt(
        match[`${side}Corners`] ||
          match[`${side}_corners`] ||
          match[`${side}Corner`] ||
          match[`corners_${side}`] ||
          0
      );
    }

    /**
     * Calculate corners by half
     */
    calculateHalfCorners(matches, half) {
      return matches.reduce((total, match) => {
        if (half === 'first') {
          const firstHalfCorners =
            parseInt(match.firstHalfHomeCorners || match.fh_home_corners || 0) +
            parseInt(match.firstHalfAwayCorners || match.fh_away_corners || 0);
          return total + firstHalfCorners;
        } else {
          // Calculate second half corners (total - first half)
          const totalCorners =
            this.getMatchCorners(match, 'home') + this.getMatchCorners(match, 'away');
          const firstHalfCorners =
            parseInt(match.firstHalfHomeCorners || match.fh_home_corners || 0) +
            parseInt(match.firstHalfAwayCorners || match.fh_away_corners || 0);
          return total + (totalCorners - firstHalfCorners);
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
          const totalCorners =
            this.getMatchCorners(match, 'home') + this.getMatchCorners(match, 'away');
          return totalCorners > threshold;
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

      // Add exact corners statistics
      for (let i = 0; i <= 15; i++) {
        const exactMatches = matches.filter(match => {
          const totalCorners =
            this.getMatchCorners(match, 'home') + this.getMatchCorners(match, 'away');
          return totalCorners === i;
        });

        if (exactMatches.length > 0) {
          stats[`exactly${i}`] = {
            count: exactMatches.length,
            percentage: this.baseStats.percentage(exactMatches.length, matches.length),
          };
        }
      }

      return stats;
    }

    /**
     * Calculate team corners over thresholds
     */
    calculateTeamCornersOver(matches, teamId) {
      if (!teamId) return {};

      const stats = {};
      const thresholds = [2.5, 3.5, 4.5, 5.5, 6.5];

      thresholds.forEach(threshold => {
        const key = `over${threshold.toString().replace('.', '_')}`;
        const overMatches = matches.filter(match => {
          const isHome = String(match.homeTeamId || match.home_team_id) === String(teamId);
          const teamCorners = isHome
            ? this.getMatchCorners(match, 'home')
            : this.getMatchCorners(match, 'away');
          return teamCorners > threshold;
        });

        stats[key] = {
          count: overMatches.length,
          percentage: this.baseStats.percentage(overMatches.length, matches.length),
        };
      });

      return stats;
    }

    /**
     * Calculate opponent corners over thresholds
     */
    calculateOpponentCornersOver(matches, teamId) {
      if (!teamId) return {};

      const stats = {};
      const thresholds = [2.5, 3.5, 4.5, 5.5, 6.5];

      thresholds.forEach(threshold => {
        const key = `over${threshold.toString().replace('.', '_')}`;
        const overMatches = matches.filter(match => {
          const isHome = String(match.homeTeamId || match.home_team_id) === String(teamId);
          const opponentCorners = isHome
            ? this.getMatchCorners(match, 'away')
            : this.getMatchCorners(match, 'home');
          return opponentCorners > threshold;
        });

        stats[key] = {
          count: overMatches.length,
          percentage: this.baseStats.percentage(overMatches.length, matches.length),
        };
      });

      return stats;
    }

    /**
     * Calculate corner timing distribution
     */
    calculateCornerTiming(matches) {
      const distribution = {};

      // Initialize intervals
      this.timeIntervals.forEach(interval => {
        distribution[interval.label] = {
          corners: 0,
          percentage: 0,
          avgPerMatch: 0,
        };
      });

      // Count corners by interval
      let totalCornersWithTiming = 0;

      matches.forEach(match => {
        if (match.cornerTimings && Array.isArray(match.cornerTimings)) {
          match.cornerTimings.forEach(corner => {
            const minute = parseInt(corner.minute || corner.time);
            const interval = this.timeIntervals.find(
              int => minute >= int.start && minute <= int.end
            );

            if (interval) {
              distribution[interval.label].corners++;
              totalCornersWithTiming++;
            }
          });
        }
      });

      // Calculate percentages and averages
      if (totalCornersWithTiming > 0) {
        Object.keys(distribution).forEach(key => {
          distribution[key].percentage = this.baseStats.percentage(
            distribution[key].corners,
            totalCornersWithTiming
          );
          distribution[key].avgPerMatch = this.baseStats.divide(
            distribution[key].corners,
            matches.length
          );
        });
      }

      return distribution;
    }

    /**
     * Calculate corner patterns
     */
    calculateCornerPatterns(matches, teamId) {
      if (!teamId) return this.getEmptyCornerPatterns();

      const patterns = {
        firstCorner: 0,
        lastCorner: 0,
        mostCornersHalf: { first: 0, second: 0 },
        cornerStreak: 0,
        currentStreak: 0,
        highestStreak: 0,
        noCornerStreak: 0,
        currentNoCornerStreak: 0,
        highestNoCornerStreak: 0,
        avgMinuteFirstCorner: 0,
        avgMinuteLastCorner: 0,
        cornersByResult: {
          wins: { total: 0, avg: 0, count: 0 },
          draws: { total: 0, avg: 0, count: 0 },
          losses: { total: 0, avg: 0, count: 0 },
        },
        cornerDominance: 0, // Percentage of matches with more corners than opponent
        cornerBalance: 0, // Average corner difference
      };

      let currentCornerStreak = 0;
      let currentNoCornerStreak = 0;
      let firstCornerMinutes = [];
      let lastCornerMinutes = [];
      let cornerDifferences = [];

      matches.forEach(match => {
        const isHome = String(match.homeTeamId || match.home_team_id) === String(teamId);
        const teamCorners = isHome
          ? this.getMatchCorners(match, 'home')
          : this.getMatchCorners(match, 'away');
        const opponentCorners = isHome
          ? this.getMatchCorners(match, 'away')
          : this.getMatchCorners(match, 'home');

        // Corner streaks
        if (teamCorners > 0) {
          currentCornerStreak++;
          currentNoCornerStreak = 0;
          patterns.highestStreak = Math.max(patterns.highestStreak, currentCornerStreak);

          // Corner dominance
          if (teamCorners > opponentCorners) {
            patterns.cornerDominance++;
          }

          // Corner timing
          if (match.cornerTimings && match.cornerTimings.length > 0) {
            const teamCornerTimings = match.cornerTimings.filter(corner => {
              return (isHome && corner.team === 'home') || (!isHome && corner.team === 'away');
            });
            if (teamCornerTimings.length > 0) {
              firstCornerMinutes.push(parseInt(teamCornerTimings[0].minute || 0));
              lastCornerMinutes.push(
                parseInt(teamCornerTimings[teamCornerTimings.length - 1].minute || 90)
              );
            }
          }
        } else {
          currentNoCornerStreak++;
          currentCornerStreak = 0;
          patterns.highestNoCornerStreak = Math.max(
            patterns.highestNoCornerStreak,
            currentNoCornerStreak
          );
        }

        // Corner difference
        cornerDifferences.push(teamCorners - opponentCorners);

        // First/Last corner
        if (match.firstCorner && match.firstCorner.team === (isHome ? 'home' : 'away')) {
          patterns.firstCorner++;
        }
        if (match.lastCorner && match.lastCorner.team === (isHome ? 'home' : 'away')) {
          patterns.lastCorner++;
        }

        // Most corners half
        const firstHalfTeamCorners = parseInt(
          isHome ? match.firstHalfHomeCorners || 0 : match.firstHalfAwayCorners || 0
        );
        const secondHalfTeamCorners = teamCorners - firstHalfTeamCorners;

        if (firstHalfTeamCorners > secondHalfTeamCorners) {
          patterns.mostCornersHalf.first++;
        } else if (secondHalfTeamCorners > firstHalfTeamCorners) {
          patterns.mostCornersHalf.second++;
        }

        // Corners by result
        const goalsFor = isHome
          ? parseInt(match.homeGoals || match.home_goals || 0)
          : parseInt(match.awayGoals || match.away_goals || 0);
        const goalsAgainst = isHome
          ? parseInt(match.awayGoals || match.away_goals || 0)
          : parseInt(match.homeGoals || match.home_goals || 0);

        if (goalsFor > goalsAgainst) {
          patterns.cornersByResult.wins.total += teamCorners;
          patterns.cornersByResult.wins.count++;
        } else if (goalsFor < goalsAgainst) {
          patterns.cornersByResult.losses.total += teamCorners;
          patterns.cornersByResult.losses.count++;
        } else {
          patterns.cornersByResult.draws.total += teamCorners;
          patterns.cornersByResult.draws.count++;
        }
      });

      patterns.currentStreak = currentCornerStreak;
      patterns.currentNoCornerStreak = currentNoCornerStreak;

      // Calculate averages
      if (firstCornerMinutes.length > 0) {
        patterns.avgMinuteFirstCorner = this.baseStats.average(firstCornerMinutes, 1);
      }
      if (lastCornerMinutes.length > 0) {
        patterns.avgMinuteLastCorner = this.baseStats.average(lastCornerMinutes, 1);
      }

      // Corner dominance percentage
      patterns.cornerDominance = this.baseStats.percentage(
        patterns.cornerDominance,
        matches.length
      );

      // Corner balance
      patterns.cornerBalance = this.baseStats.average(cornerDifferences);

      // Corners by result averages
      ['wins', 'draws', 'losses'].forEach(result => {
        if (patterns.cornersByResult[result].count > 0) {
          patterns.cornersByResult[result].avg = this.baseStats.divide(
            patterns.cornersByResult[result].total,
            patterns.cornersByResult[result].count
          );
        }
      });

      return patterns;
    }

    /**
     * Calculate early corners (0-30 minutes)
     */
    calculateEarlyCorners(matches) {
      let earlyCorners = 0;
      let matchesWithEarlyCorners = 0;

      matches.forEach(match => {
        let hasEarlyCorner = false;
        if (match.cornerTimings && Array.isArray(match.cornerTimings)) {
          const early = match.cornerTimings.filter(
            corner => parseInt(corner.minute || corner.time) <= 30
          );
          if (early.length > 0) {
            earlyCorners += early.length;
            hasEarlyCorner = true;
          }
        }
        if (hasEarlyCorner) matchesWithEarlyCorners++;
      });

      return {
        total: earlyCorners,
        matches: matchesWithEarlyCorners,
        percentage: this.baseStats.percentage(matchesWithEarlyCorners, matches.length),
        avgPerMatch: this.baseStats.divide(earlyCorners, matches.length),
      };
    }

    /**
     * Calculate late corners (75-90 minutes)
     */
    calculateLateCorners(matches) {
      let lateCorners = 0;
      let matchesWithLateCorners = 0;

      matches.forEach(match => {
        let hasLateCorner = false;
        if (match.cornerTimings && Array.isArray(match.cornerTimings)) {
          const late = match.cornerTimings.filter(
            corner => parseInt(corner.minute || corner.time) >= 75
          );
          if (late.length > 0) {
            lateCorners += late.length;
            hasLateCorner = true;
          }
        }
        if (hasLateCorner) matchesWithLateCorners++;
      });

      return {
        total: lateCorners,
        matches: matchesWithLateCorners,
        percentage: this.baseStats.percentage(matchesWithLateCorners, matches.length),
        avgPerMatch: this.baseStats.divide(lateCorners, matches.length),
      };
    }

    /**
     * Calculate corner sequences
     */
    calculateCornerSequences(matches, teamId) {
      if (!teamId) return this.getEmptyCornerSequences();

      const sequences = {
        consecutiveCorners: 0,
        maxConsecutive: 0,
        quickCorners: 0, // Corners within 5 minutes of each other
        cornerRuns: [], // Periods of high corner activity
      };

      matches.forEach(match => {
        if (match.cornerTimings && Array.isArray(match.cornerTimings)) {
          const isHome = String(match.homeTeamId || match.home_team_id) === String(teamId);
          const teamCornerTimings = match.cornerTimings
            .filter(
              corner => (isHome && corner.team === 'home') || (!isHome && corner.team === 'away')
            )
            .sort((a, b) => (a.minute || a.time) - (b.minute || b.time));

          let consecutive = 0;
          for (let i = 0; i < teamCornerTimings.length; i++) {
            consecutive++;
            sequences.maxConsecutive = Math.max(sequences.maxConsecutive, consecutive);

            // Check for quick corners
            if (i > 0) {
              const timeDiff =
                (teamCornerTimings[i].minute || teamCornerTimings[i].time) -
                (teamCornerTimings[i - 1].minute || teamCornerTimings[i - 1].time);
              if (timeDiff <= 5) {
                sequences.quickCorners++;
              }
            }

            // Check if opponent had a corner (breaks consecutive)
            if (i < match.cornerTimings.length - 1) {
              const nextCorner = match.cornerTimings[i + 1];
              if (
                (isHome && nextCorner.team === 'away') ||
                (!isHome && nextCorner.team === 'home')
              ) {
                consecutive = 0;
              }
            }
          }

          sequences.consecutiveCorners += consecutive;
        }
      });

      return sequences;
    }

    /**
     * Get high corner matches
     */
    getHighCornerMatches(matches, limit = 5) {
      return matches
        .map(match => ({
          ...match,
          totalCorners: this.getMatchCorners(match, 'home') + this.getMatchCorners(match, 'away'),
        }))
        .sort((a, b) => b.totalCorners - a.totalCorners)
        .slice(0, limit)
        .map(match => ({
          date: match.date || match.matchDate,
          homeTeam: match.homeTeamName || match.home_team,
          awayTeam: match.awayTeamName || match.away_team,
          homeCorners: this.getMatchCorners(match, 'home'),
          awayCorners: this.getMatchCorners(match, 'away'),
          totalCorners: match.totalCorners,
          result: `${match.homeGoals || 0}-${match.awayGoals || 0}`,
        }));
    }

    /**
     * Calculate corner form (last 5 matches)
     */
    calculateCornerForm(matches, teamId) {
      const last5 = this.baseStats.getLastNMatches(matches, 5);

      return {
        matches: last5.length,
        cornersFor: this.calculateCornersFor(last5, teamId),
        cornersAgainst: this.calculateCornersAgainst(last5, teamId),
        avgCornersFor:
          last5.length > 0
            ? this.baseStats.divide(this.calculateCornersFor(last5, teamId), last5.length)
            : 0,
        avgCornersAgainst:
          last5.length > 0
            ? this.baseStats.divide(this.calculateCornersAgainst(last5, teamId), last5.length)
            : 0,
        totalCorners: last5.reduce(
          (sum, match) =>
            sum + this.getMatchCorners(match, 'home') + this.getMatchCorners(match, 'away'),
          0
        ),
        over9_5: last5.filter(
          match => this.getMatchCorners(match, 'home') + this.getMatchCorners(match, 'away') > 9.5
        ).length,
      };
    }

    /**
     * Calculate corner trend
     */
    calculateCornerTrend(matches, teamId) {
      if (matches.length < 10) {
        return { trend: 'neutral', confidence: 'low' };
      }

      const cornersPerMatch = matches.map(match => {
        const isHome = String(match.homeTeamId || match.home_team_id) === String(teamId);
        return isHome ? this.getMatchCorners(match, 'home') : this.getMatchCorners(match, 'away');
      });

      const trend = this.baseStats.calculateTrend(cornersPerMatch);
      const confidence = matches.length >= 20 ? 'high' : 'medium';

      return { trend, confidence };
    }

    /**
     * Calculate corner efficiency
     */
    calculateCornerEfficiency(matches, teamId) {
      if (!teamId) return { goalsFromCorners: 0, efficiency: 0 };

      let goalsFromCorners = 0;
      let totalCorners = 0;

      matches.forEach(match => {
        const isHome = String(match.homeTeamId || match.home_team_id) === String(teamId);
        const teamCorners = isHome
          ? this.getMatchCorners(match, 'home')
          : this.getMatchCorners(match, 'away');

        totalCorners += teamCorners;

        // If we have goal details, count goals from corners
        if (match.goalDetails && Array.isArray(match.goalDetails)) {
          const teamGoalsFromCorners = match.goalDetails.filter(goal => {
            const isTeamGoal =
              (isHome && goal.team === 'home') || (!isHome && goal.team === 'away');
            return isTeamGoal && goal.type === 'corner';
          }).length;
          goalsFromCorners += teamGoalsFromCorners;
        }
      });

      return {
        goalsFromCorners,
        totalCorners,
        efficiency:
          totalCorners > 0 ? this.baseStats.percentage(goalsFromCorners, totalCorners) : 0,
        cornersPerGoal:
          goalsFromCorners > 0 ? this.baseStats.divide(totalCorners, goalsFromCorners) : 0,
      };
    }

    /**
     * Calculate corner handicap statistics
     */
    calculateCornerHandicap(matches, teamId) {
      if (!teamId) return {};

      const handicaps = [-3.5, -2.5, -1.5, -0.5, 0.5, 1.5, 2.5, 3.5];
      const stats = {};

      handicaps.forEach(handicap => {
        const wins = matches.filter(match => {
          const isHome = String(match.homeTeamId || match.home_team_id) === String(teamId);
          const teamCorners = isHome
            ? this.getMatchCorners(match, 'home')
            : this.getMatchCorners(match, 'away');
          const opponentCorners = isHome
            ? this.getMatchCorners(match, 'away')
            : this.getMatchCorners(match, 'home');

          return teamCorners + handicap > opponentCorners;
        }).length;

        const key = handicap >= 0 ? `plus${handicap}` : `minus${Math.abs(handicap)}`;
        stats[key] = {
          wins,
          percentage: this.baseStats.percentage(wins, matches.length),
        };
      });

      return stats;
    }

    /**
     * Calculate period analysis
     */
    calculatePeriodAnalysis(matches) {
      const periods = {
        '0-10': { corners: 0, matches: 0 },
        '11-20': { corners: 0, matches: 0 },
        '21-30': { corners: 0, matches: 0 },
        '31-40': { corners: 0, matches: 0 },
        '41-45': { corners: 0, matches: 0 },
        '46-55': { corners: 0, matches: 0 },
        '56-65': { corners: 0, matches: 0 },
        '66-75': { corners: 0, matches: 0 },
        '76-85': { corners: 0, matches: 0 },
        '86-90': { corners: 0, matches: 0 },
      };

      matches.forEach(match => {
        if (match.cornerTimings && Array.isArray(match.cornerTimings)) {
          const matchPeriods = new Set();

          match.cornerTimings.forEach(corner => {
            const minute = parseInt(corner.minute || corner.time);
            let period = null;

            if (minute <= 10) period = '0-10';
            else if (minute <= 20) period = '11-20';
            else if (minute <= 30) period = '21-30';
            else if (minute <= 40) period = '31-40';
            else if (minute <= 45) period = '41-45';
            else if (minute <= 55) period = '46-55';
            else if (minute <= 65) period = '56-65';
            else if (minute <= 75) period = '66-75';
            else if (minute <= 85) period = '76-85';
            else period = '86-90';

            if (period) {
              periods[period].corners++;
              matchPeriods.add(period);
            }
          });

          // Count matches with corners in each period
          matchPeriods.forEach(period => {
            periods[period].matches++;
          });
        }
      });

      // Calculate percentages
      Object.keys(periods).forEach(period => {
        periods[period].matchPercentage = this.baseStats.percentage(
          periods[period].matches,
          matches.length
        );
        periods[period].avgPerMatch = this.baseStats.divide(
          periods[period].corners,
          matches.length
        );
      });

      return periods;
    }

    /**
     * Get empty statistics object
     */
    getEmptyStatistics() {
      return {
        matches: 0,
        totalCorners: 0,
        cornersFor: 0,
        cornersAgainst: 0,
        avgCornersFor: 0,
        avgCornersAgainst: 0,
        avgTotalCorners: 0,
        firstHalfCorners: 0,
        secondHalfCorners: 0,
        overUnder: {},
        teamCornersOver: {},
        opponentCornersOver: {},
        cornerTiming: {},
        cornerPatterns: this.getEmptyCornerPatterns(),
        earlyCorners: { total: 0, matches: 0, percentage: 0, avgPerMatch: 0 },
        lateCorners: { total: 0, matches: 0, percentage: 0, avgPerMatch: 0 },
        cornerSequences: this.getEmptyCornerSequences(),
        highCornerMatches: [],
        form: {},
        trend: { trend: 'neutral', confidence: 'low' },
        cornerEfficiency: { goalsFromCorners: 0, efficiency: 0 },
        cornerHandicap: {},
        periodAnalysis: {},
      };
    }

    /**
     * Get empty corner patterns object
     */
    getEmptyCornerPatterns() {
      return {
        firstCorner: 0,
        lastCorner: 0,
        mostCornersHalf: { first: 0, second: 0 },
        cornerStreak: 0,
        currentStreak: 0,
        highestStreak: 0,
        noCornerStreak: 0,
        currentNoCornerStreak: 0,
        highestNoCornerStreak: 0,
        avgMinuteFirstCorner: 0,
        avgMinuteLastCorner: 0,
        cornersByResult: {
          wins: { total: 0, avg: 0, count: 0 },
          draws: { total: 0, avg: 0, count: 0 },
          losses: { total: 0, avg: 0, count: 0 },
        },
        cornerDominance: 0,
        cornerBalance: 0,
      };
    }

    /**
     * Get empty corner sequences object
     */
    getEmptyCornerSequences() {
      return {
        consecutiveCorners: 0,
        maxConsecutive: 0,
        quickCorners: 0,
        cornerRuns: [],
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
    module.exports = CornersStatistics;
  } else {
    global.TeamStatsCornersStatistics = new CornersStatistics();
  }
})(typeof window !== 'undefined' ? window : this);
