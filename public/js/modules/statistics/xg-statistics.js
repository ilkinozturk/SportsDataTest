/**
 * Expected Goals (xG) Statistics Module
 * Handles all xG-related calculations and analysis
 * Extends BaseStatistics for common functionality
 */

(function (global) {
  'use strict';

  class XGStatistics {
    constructor() {
      this.name = 'XGStatistics';
      this.version = '1.0.0';

      // Dependencies
      this.baseStats = global.TeamStatsBaseStatistics;

      if (!this.baseStats) {
      }

      // xG thresholds for analysis
      this.xgThresholds = [0.5, 1.0, 1.5, 2.0, 2.5, 3.0];

      // Shot quality categories
      this.shotQuality = {
        VERY_LOW: { min: 0, max: 0.05, label: 'Very Low' },
        LOW: { min: 0.05, max: 0.15, label: 'Low' },
        MEDIUM: { min: 0.15, max: 0.3, label: 'Medium' },
        HIGH: { min: 0.3, max: 0.5, label: 'High' },
        VERY_HIGH: { min: 0.5, max: 1.0, label: 'Very High' },
      };

      // Shot locations
      this.shotLocations = {
        BOX: 'box',
        OUTSIDE_BOX: 'outside_box',
        SIX_YARD: 'six_yard',
        PENALTY: 'penalty',
      };

      // Performance metrics
      this.metrics = {
        calculations: 0,
        startTime: Date.now(),
      };
    }

    /**
     * Calculate comprehensive xG statistics
     */
    calculateXGStatistics(matches, options = {}) {
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
        matchesWithXG: this.countMatchesWithXG(filteredMatches),

        // xG totals
        totalXGFor: this.calculateTotalXGFor(filteredMatches, options.teamId),
        totalXGAgainst: this.calculateTotalXGAgainst(filteredMatches, options.teamId),
        totalXG: this.calculateTotalXG(filteredMatches),

        // Averages
        avgXGFor: 0,
        avgXGAgainst: 0,
        avgTotalXG: 0,

        // xG difference
        xGDifference: 0,
        avgXGDifference: 0,

        // Performance vs xG
        performanceVsXG: this.calculatePerformanceVsXG(filteredMatches, options.teamId),

        // xG over/under
        xgOverUnder: this.calculateXGOverUnder(filteredMatches),

        // Team xG thresholds
        teamXGOver: this.calculateTeamXGOver(filteredMatches, options.teamId),

        // Shot quality analysis
        shotQualityAnalysis: this.analyzeShotQuality(filteredMatches, options.teamId),

        // xG by match situation
        xgBySituation: this.calculateXGBySituation(filteredMatches, options.teamId),

        // xG timing
        xgTiming: this.calculateXGTiming(filteredMatches, options.teamId),

        // xG efficiency
        xgEfficiency: this.calculateXGEfficiency(filteredMatches, options.teamId),

        // xG trends
        xgTrends: this.calculateXGTrends(filteredMatches, options.teamId),

        // High xG matches
        highXGMatches: this.getHighXGMatches(filteredMatches),

        // xG by result
        xgByResult: this.calculateXGByResult(filteredMatches, options.teamId),

        // Form and trends
        form: this.calculateXGForm(filteredMatches, options.teamId),
        trend: this.calculateXGTrend(filteredMatches, options.teamId),

        // Advanced metrics
        xgChain: this.calculateXGChain(filteredMatches, options.teamId),
        nonPenaltyXG: this.calculateNonPenaltyXG(filteredMatches, options.teamId),
        bigChances: this.calculateBigChances(filteredMatches, options.teamId),
      };

      // Calculate averages
      if (stats.matchesWithXG > 0) {
        stats.avgXGFor = this.baseStats.divide(stats.totalXGFor, stats.matchesWithXG);
        stats.avgXGAgainst = this.baseStats.divide(stats.totalXGAgainst, stats.matchesWithXG);
        stats.avgTotalXG = this.baseStats.divide(stats.totalXG, stats.matchesWithXG);
        stats.xGDifference = stats.totalXGFor - stats.totalXGAgainst;
        stats.avgXGDifference = this.baseStats.divide(stats.xGDifference, stats.matchesWithXG);
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

      // Filter only matches with xG data
      if (options.xgOnly) {
        filtered = filtered.filter(match => match.xG || match.expectedGoals || match.xg);
      }

      return filtered;
    }

    /**
     * Count matches with xG data
     */
    countMatchesWithXG(matches) {
      return matches.filter(
        match =>
          (match.homeXG !== undefined && match.awayXG !== undefined) ||
          match.xG ||
          match.expectedGoals ||
          match.xg
      ).length;
    }

    /**
     * Calculate total xG for team
     */
    calculateTotalXGFor(matches, teamId) {
      if (!teamId) return 0;

      return matches.reduce((total, match) => {
        const isHome = String(match.homeTeamId || match.home_team_id) === String(teamId);

        // Try different xG field formats
        let xgFor = 0;
        if (match.homeXG !== undefined && match.awayXG !== undefined) {
          // Direct format: homeXG, awayXG
          xgFor = isHome ? parseFloat(match.homeXG || 0) : parseFloat(match.awayXG || 0);
        } else if (match.xG) {
          // Nested format: xG.home, xG.away
          xgFor = isHome
            ? parseFloat(match.xG.home || match.xG.homeXG || 0)
            : parseFloat(match.xG.away || match.xG.awayXG || 0);
        } else if (match.expectedGoals) {
          // Alternative nested format
          xgFor = isHome
            ? parseFloat(match.expectedGoals.home || 0)
            : parseFloat(match.expectedGoals.away || 0);
        }

        return total + xgFor;
      }, 0);
    }

    /**
     * Calculate total xG against team
     */
    calculateTotalXGAgainst(matches, teamId) {
      if (!teamId) return 0;

      return matches.reduce((total, match) => {
        const isHome = String(match.homeTeamId || match.home_team_id) === String(teamId);

        // Try different xG field formats
        let xgAgainst = 0;
        if (match.homeXG !== undefined && match.awayXG !== undefined) {
          // Direct format: homeXG, awayXG
          xgAgainst = isHome ? parseFloat(match.awayXG || 0) : parseFloat(match.homeXG || 0);
        } else if (match.xG) {
          // Nested format: xG.home, xG.away
          xgAgainst = isHome
            ? parseFloat(match.xG.away || match.xG.awayXG || 0)
            : parseFloat(match.xG.home || match.xG.homeXG || 0);
        } else if (match.expectedGoals) {
          // Alternative nested format
          xgAgainst = isHome
            ? parseFloat(match.expectedGoals.away || 0)
            : parseFloat(match.expectedGoals.home || 0);
        }

        return total + xgAgainst;
      }, 0);
    }

    /**
     * Calculate total xG in matches
     */
    calculateTotalXG(matches) {
      return matches.reduce((total, match) => {
        let homeXG = 0;
        let awayXG = 0;

        if (match.homeXG !== undefined && match.awayXG !== undefined) {
          // Direct format: homeXG, awayXG
          homeXG = parseFloat(match.homeXG || 0);
          awayXG = parseFloat(match.awayXG || 0);
        } else if (match.xG) {
          // Nested format: xG.home, xG.away
          homeXG = parseFloat(match.xG.home || match.xG.homeXG || 0);
          awayXG = parseFloat(match.xG.away || match.xG.awayXG || 0);
        } else if (match.expectedGoals) {
          // Alternative nested format
          homeXG = parseFloat(match.expectedGoals.home || 0);
          awayXG = parseFloat(match.expectedGoals.away || 0);
        }

        return total + homeXG + awayXG;
      }, 0);
    }

    /**
     * Calculate performance vs xG
     */
    calculatePerformanceVsXG(matches, teamId) {
      if (!teamId) return this.getEmptyPerformanceVsXG();

      let actualGoalsFor = 0;
      let actualGoalsAgainst = 0;
      let xGFor = 0;
      let xGAgainst = 0;
      let matchesWithData = 0;

      matches.forEach(match => {
        // Check if match has xG data
        const hasXGData =
          (match.homeXG !== undefined && match.awayXG !== undefined) ||
          match.xG ||
          match.expectedGoals ||
          match.xg;
        if (!hasXGData) return;

        const isHome = String(match.homeTeamId || match.home_team_id) === String(teamId);

        // Actual goals
        actualGoalsFor += isHome
          ? parseInt(match.homeGoals || match.home_goals || 0)
          : parseInt(match.awayGoals || match.away_goals || 0);
        actualGoalsAgainst += isHome
          ? parseInt(match.awayGoals || match.away_goals || 0)
          : parseInt(match.homeGoals || match.home_goals || 0);

        // Expected goals - try different formats
        let matchXGFor = 0;
        let matchXGAgainst = 0;

        if (match.homeXG !== undefined && match.awayXG !== undefined) {
          // Direct format
          matchXGFor = isHome ? parseFloat(match.homeXG || 0) : parseFloat(match.awayXG || 0);
          matchXGAgainst = isHome ? parseFloat(match.awayXG || 0) : parseFloat(match.homeXG || 0);
        } else if (match.xG) {
          // Nested format
          matchXGFor = isHome
            ? parseFloat(match.xG.home || match.xG.homeXG || 0)
            : parseFloat(match.xG.away || match.xG.awayXG || 0);
          matchXGAgainst = isHome
            ? parseFloat(match.xG.away || match.xG.awayXG || 0)
            : parseFloat(match.xG.home || match.xG.homeXG || 0);
        }

        xGFor += matchXGFor;
        xGAgainst += matchXGAgainst;
        matchesWithData++;
      });

      const overperformanceFor = actualGoalsFor - xGFor;
      const overperformanceAgainst = xGAgainst - actualGoalsAgainst;

      return {
        actualGoalsFor,
        actualGoalsAgainst,
        xGFor: this.baseStats.round(xGFor, 2),
        xGAgainst: this.baseStats.round(xGAgainst, 2),
        overperformanceFor: this.baseStats.round(overperformanceFor, 2),
        overperformanceAgainst: this.baseStats.round(overperformanceAgainst, 2),
        scoringEfficiency: xGFor > 0 ? this.baseStats.percentage(actualGoalsFor, xGFor) : 0,
        defensiveEfficiency:
          xGAgainst > 0 ? this.baseStats.percentage(actualGoalsAgainst, xGAgainst) : 0,
        matchesAnalyzed: matchesWithData,
      };
    }

    /**
     * Calculate xG over/under
     */
    calculateXGOverUnder(matches) {
      const stats = {};

      this.xgThresholds.forEach(threshold => {
        const key = `over${threshold.toString().replace('.', '_')}`;
        const overMatches = matches.filter(match => {
          const xgData = match.xG || match.expectedGoals || match.xg;
          if (!xgData) return false;

          const totalXG = parseFloat(xgData.home || 0) + parseFloat(xgData.away || 0);
          return totalXG > threshold;
        });

        stats[key] = {
          count: overMatches.length,
          percentage: this.baseStats.percentage(
            overMatches.length,
            this.countMatchesWithXG(matches)
          ),
        };
      });

      return stats;
    }

    /**
     * Calculate team xG over thresholds
     */
    calculateTeamXGOver(matches, teamId) {
      if (!teamId) return {};

      const stats = {};
      const thresholds = [0.5, 1.0, 1.5, 2.0, 2.5];

      thresholds.forEach(threshold => {
        const key = `over${threshold.toString().replace('.', '_')}`;
        const overMatches = matches.filter(match => {
          const xgData = match.xG || match.expectedGoals || match.xg;
          if (!xgData) return false;

          const isHome = String(match.homeTeamId || match.home_team_id) === String(teamId);
          const teamXG = isHome ? parseFloat(xgData.home || 0) : parseFloat(xgData.away || 0);
          return teamXG > threshold;
        });

        stats[key] = {
          count: overMatches.length,
          percentage: this.baseStats.percentage(
            overMatches.length,
            this.countMatchesWithXG(matches)
          ),
        };
      });

      return stats;
    }

    /**
     * Analyze shot quality
     */
    analyzeShotQuality(matches, teamId) {
      if (!teamId) return this.getEmptyShotQuality();

      const analysis = {
        totalShots: 0,
        shotsOnTarget: 0,
        avgShotXG: 0,
        distribution: {},
        bestChance: 0,
        shotLocations: {},
      };

      // Initialize distribution
      Object.values(this.shotQuality).forEach(quality => {
        analysis.distribution[quality.label] = { count: 0, percentage: 0 };
      });

      // Initialize locations
      Object.values(this.shotLocations).forEach(location => {
        analysis.shotLocations[location] = { count: 0, xg: 0 };
      });

      let allShotXGs = [];

      matches.forEach(match => {
        if (!match.shots || !Array.isArray(match.shots)) return;

        const isHome = String(match.homeTeamId || match.home_team_id) === String(teamId);
        const teamShots = match.shots.filter(
          shot => (isHome && shot.team === 'home') || (!isHome && shot.team === 'away')
        );

        teamShots.forEach(shot => {
          analysis.totalShots++;

          if (shot.onTarget) {
            analysis.shotsOnTarget++;
          }

          const shotXG = parseFloat(shot.xg || shot.expectedGoals || 0);
          allShotXGs.push(shotXG);

          // Best chance
          if (shotXG > analysis.bestChance) {
            analysis.bestChance = shotXG;
          }

          // Quality distribution
          const quality = this.categorizeShot(shotXG);
          if (quality) {
            analysis.distribution[quality].count++;
          }

          // Location
          if (shot.location) {
            const location = shot.location.toLowerCase();
            if (analysis.shotLocations[location]) {
              analysis.shotLocations[location].count++;
              analysis.shotLocations[location].xg += shotXG;
            }
          }
        });
      });

      // Calculate averages and percentages
      if (analysis.totalShots > 0) {
        analysis.avgShotXG = this.baseStats.average(allShotXGs);

        Object.keys(analysis.distribution).forEach(quality => {
          analysis.distribution[quality].percentage = this.baseStats.percentage(
            analysis.distribution[quality].count,
            analysis.totalShots
          );
        });
      }

      analysis.bestChance = this.baseStats.round(analysis.bestChance, 3);

      return analysis;
    }

    /**
     * Categorize shot by xG value
     */
    categorizeShot(xg) {
      for (const [key, quality] of Object.entries(this.shotQuality)) {
        if (xg >= quality.min && xg < quality.max) {
          return quality.label;
        }
      }
      return null;
    }

    /**
     * Calculate xG by match situation
     */
    calculateXGBySituation(matches, teamId) {
      if (!teamId) return this.getEmptyXGBySituation();

      const situations = {
        openPlay: { xg: 0, goals: 0, shots: 0 },
        setPlay: { xg: 0, goals: 0, shots: 0 },
        penalty: { xg: 0, goals: 0, shots: 0 },
        counter: { xg: 0, goals: 0, shots: 0 },
      };

      matches.forEach(match => {
        if (!match.shots || !Array.isArray(match.shots)) return;

        const isHome = String(match.homeTeamId || match.home_team_id) === String(teamId);
        const teamShots = match.shots.filter(
          shot => (isHome && shot.team === 'home') || (!isHome && shot.team === 'away')
        );

        teamShots.forEach(shot => {
          const situation = shot.situation || shot.type || 'openPlay';
          const xg = parseFloat(shot.xg || shot.expectedGoals || 0);

          if (situations[situation]) {
            situations[situation].xg += xg;
            situations[situation].shots++;
            if (shot.goal || shot.scored) {
              situations[situation].goals++;
            }
          }
        });
      });

      // Calculate conversion rates
      Object.keys(situations).forEach(situation => {
        const data = situations[situation];
        data.xg = this.baseStats.round(data.xg, 2);
        data.conversionRate =
          data.shots > 0 ? this.baseStats.percentage(data.goals, data.shots) : 0;
        data.xgPerShot = data.shots > 0 ? this.baseStats.divide(data.xg, data.shots) : 0;
      });

      return situations;
    }

    /**
     * Calculate xG timing
     */
    calculateXGTiming(matches, teamId) {
      const intervals = [
        { label: '0-15', start: 0, end: 15 },
        { label: '16-30', start: 16, end: 30 },
        { label: '31-45', start: 31, end: 45 },
        { label: '46-60', start: 46, end: 60 },
        { label: '61-75', start: 61, end: 75 },
        { label: '76-90', start: 76, end: 90 },
      ];

      const timing = {};
      intervals.forEach(interval => {
        timing[interval.label] = {
          xg: 0,
          shots: 0,
          goals: 0,
          avgXG: 0,
        };
      });

      matches.forEach(match => {
        if (!match.shots || !Array.isArray(match.shots)) return;

        const isHome = String(match.homeTeamId || match.home_team_id) === String(teamId);
        const teamShots = match.shots.filter(
          shot => (isHome && shot.team === 'home') || (!isHome && shot.team === 'away')
        );

        teamShots.forEach(shot => {
          const minute = parseInt(shot.minute || shot.time || 0);
          const interval = intervals.find(int => minute >= int.start && minute <= int.end);

          if (interval) {
            const xg = parseFloat(shot.xg || shot.expectedGoals || 0);
            timing[interval.label].xg += xg;
            timing[interval.label].shots++;
            if (shot.goal || shot.scored) {
              timing[interval.label].goals++;
            }
          }
        });
      });

      // Calculate averages
      Object.keys(timing).forEach(interval => {
        const data = timing[interval];
        data.xg = this.baseStats.round(data.xg, 2);
        data.avgXG = data.shots > 0 ? this.baseStats.divide(data.xg, data.shots, 3) : 0;
      });

      return timing;
    }

    /**
     * Calculate xG efficiency
     */
    calculateXGEfficiency(matches, teamId) {
      if (!teamId) return this.getEmptyXGEfficiency();

      const efficiency = {
        scoringEfficiency: 0,
        defensiveEfficiency: 0,
        overallEfficiency: 0,
        shotConversion: 0,
        xgPerShot: 0,
        shotsPerGoal: 0,
        xgPerGoal: 0,
        wastedXG: 0,
      };

      let totalShots = 0;
      let totalGoals = 0;
      let totalXG = 0;
      let matchesWithData = 0;

      matches.forEach(match => {
        const xgData = match.xG || match.expectedGoals || match.xg;
        if (!xgData) return;

        const isHome = String(match.homeTeamId || match.home_team_id) === String(teamId);

        const goals = isHome
          ? parseInt(match.homeGoals || match.home_goals || 0)
          : parseInt(match.awayGoals || match.away_goals || 0);
        const xg = isHome
          ? parseFloat(xgData.home || xgData.homeXG || 0)
          : parseFloat(xgData.away || xgData.awayXG || 0);
        const shots = isHome
          ? parseInt(match.homeShots || match.home_shots || 0)
          : parseInt(match.awayShots || match.away_shots || 0);

        totalGoals += goals;
        totalXG += xg;
        totalShots += shots;
        matchesWithData++;
      });

      if (matchesWithData > 0 && totalXG > 0) {
        efficiency.scoringEfficiency = this.baseStats.percentage(totalGoals, totalXG);
        efficiency.overallEfficiency = efficiency.scoringEfficiency;
      }

      if (totalShots > 0) {
        efficiency.shotConversion = this.baseStats.percentage(totalGoals, totalShots);
        efficiency.xgPerShot = this.baseStats.divide(totalXG, totalShots, 3);
      }

      if (totalGoals > 0) {
        efficiency.shotsPerGoal = this.baseStats.divide(totalShots, totalGoals);
        efficiency.xgPerGoal = this.baseStats.divide(totalXG, totalGoals);
      }

      efficiency.wastedXG = this.baseStats.round(totalXG - totalGoals, 2);

      return efficiency;
    }

    /**
     * Calculate xG trends
     */
    calculateXGTrends(matches, teamId) {
      const trends = {
        xgForTrend: [],
        xgAgainstTrend: [],
        xgDiffTrend: [],
        rollingAverage: { xgFor: [], xgAgainst: [] },
      };

      const windowSize = 5;

      matches.forEach((match, index) => {
        const xgData = match.xG || match.expectedGoals || match.xg;
        if (!xgData) return;

        const isHome = String(match.homeTeamId || match.home_team_id) === String(teamId);
        const xgFor = isHome ? parseFloat(xgData.home || 0) : parseFloat(xgData.away || 0);
        const xgAgainst = isHome ? parseFloat(xgData.away || 0) : parseFloat(xgData.home || 0);

        trends.xgForTrend.push(xgFor);
        trends.xgAgainstTrend.push(xgAgainst);
        trends.xgDiffTrend.push(xgFor - xgAgainst);

        // Rolling average
        if (index >= windowSize - 1) {
          const forWindow = trends.xgForTrend.slice(index - windowSize + 1, index + 1);
          const againstWindow = trends.xgAgainstTrend.slice(index - windowSize + 1, index + 1);

          trends.rollingAverage.xgFor.push(this.baseStats.average(forWindow));
          trends.rollingAverage.xgAgainst.push(this.baseStats.average(againstWindow));
        }
      });

      return trends;
    }

    /**
     * Get high xG matches
     */
    getHighXGMatches(matches, limit = 5) {
      return matches
        .filter(match => match.xG || match.expectedGoals || match.xg)
        .map(match => {
          const xgData = match.xG || match.expectedGoals || match.xg;
          const homeXG = parseFloat(xgData.home || xgData.homeXG || 0);
          const awayXG = parseFloat(xgData.away || xgData.awayXG || 0);

          return {
            ...match,
            totalXG: homeXG + awayXG,
            homeXG,
            awayXG,
          };
        })
        .sort((a, b) => b.totalXG - a.totalXG)
        .slice(0, limit)
        .map(match => ({
          date: match.date || match.matchDate,
          homeTeam: match.homeTeamName || match.home_team,
          awayTeam: match.awayTeamName || match.away_team,
          homeGoals: match.homeGoals || match.home_goals || 0,
          awayGoals: match.awayGoals || match.away_goals || 0,
          homeXG: this.baseStats.round(match.homeXG, 2),
          awayXG: this.baseStats.round(match.awayXG, 2),
          totalXG: this.baseStats.round(match.totalXG, 2),
          xgDiff: this.baseStats.round(Math.abs(match.homeXG - match.awayXG), 2),
        }));
    }

    /**
     * Calculate xG by result
     */
    calculateXGByResult(matches, teamId) {
      if (!teamId) return this.getEmptyXGByResult();

      const results = {
        wins: { matches: 0, xgFor: 0, xgAgainst: 0, avgXGFor: 0, avgXGAgainst: 0 },
        draws: { matches: 0, xgFor: 0, xgAgainst: 0, avgXGFor: 0, avgXGAgainst: 0 },
        losses: { matches: 0, xgFor: 0, xgAgainst: 0, avgXGFor: 0, avgXGAgainst: 0 },
      };

      matches.forEach(match => {
        const xgData = match.xG || match.expectedGoals || match.xg;
        if (!xgData) return;

        const isHome = String(match.homeTeamId || match.home_team_id) === String(teamId);

        const goalsFor = isHome
          ? parseInt(match.homeGoals || match.home_goals || 0)
          : parseInt(match.awayGoals || match.away_goals || 0);
        const goalsAgainst = isHome
          ? parseInt(match.awayGoals || match.away_goals || 0)
          : parseInt(match.homeGoals || match.home_goals || 0);
        const xgFor = isHome ? parseFloat(xgData.home || 0) : parseFloat(xgData.away || 0);
        const xgAgainst = isHome ? parseFloat(xgData.away || 0) : parseFloat(xgData.home || 0);

        let result;
        if (goalsFor > goalsAgainst) result = 'wins';
        else if (goalsFor < goalsAgainst) result = 'losses';
        else result = 'draws';

        results[result].matches++;
        results[result].xgFor += xgFor;
        results[result].xgAgainst += xgAgainst;
      });

      // Calculate averages
      Object.keys(results).forEach(result => {
        if (results[result].matches > 0) {
          results[result].avgXGFor = this.baseStats.divide(
            results[result].xgFor,
            results[result].matches
          );
          results[result].avgXGAgainst = this.baseStats.divide(
            results[result].xgAgainst,
            results[result].matches
          );
          results[result].xgFor = this.baseStats.round(results[result].xgFor, 2);
          results[result].xgAgainst = this.baseStats.round(results[result].xgAgainst, 2);
        }
      });

      return results;
    }

    /**
     * Calculate xG form (last 5 matches)
     */
    calculateXGForm(matches, teamId) {
      const last5 = this.baseStats.getLastNMatches(matches, 5);
      const withXG = last5.filter(match => match.xG || match.expectedGoals || match.xg);

      return {
        matches: withXG.length,
        xgFor: this.baseStats.round(this.calculateTotalXGFor(withXG, teamId), 2),
        xgAgainst: this.baseStats.round(this.calculateTotalXGAgainst(withXG, teamId), 2),
        avgXGFor:
          withXG.length > 0
            ? this.baseStats.divide(this.calculateTotalXGFor(withXG, teamId), withXG.length)
            : 0,
        avgXGAgainst:
          withXG.length > 0
            ? this.baseStats.divide(this.calculateTotalXGAgainst(withXG, teamId), withXG.length)
            : 0,
        xgDiff: 0,
      };
    }

    /**
     * Calculate xG trend
     */
    calculateXGTrend(matches, teamId) {
      const withXG = matches.filter(match => match.xG || match.expectedGoals || match.xg);

      if (withXG.length < 10) {
        return { trend: 'neutral', confidence: 'low' };
      }

      const xgPerMatch = withXG.map(match => {
        const xgData = match.xG || match.expectedGoals || match.xg;
        const isHome = String(match.homeTeamId || match.home_team_id) === String(teamId);
        return isHome ? parseFloat(xgData.home || 0) : parseFloat(xgData.away || 0);
      });

      const trend = this.baseStats.calculateTrend(xgPerMatch);
      const confidence = withXG.length >= 20 ? 'high' : 'medium';

      return { trend, confidence };
    }

    /**
     * Calculate xG chain (open play xG)
     */
    calculateXGChain(matches, teamId) {
      let totalXGChain = 0;
      let matchesWithData = 0;

      matches.forEach(match => {
        if (!match.xgChain) return;

        const isHome = String(match.homeTeamId || match.home_team_id) === String(teamId);
        const xgChain = isHome
          ? parseFloat(match.xgChain.home || 0)
          : parseFloat(match.xgChain.away || 0);

        totalXGChain += xgChain;
        matchesWithData++;
      });

      return {
        total: this.baseStats.round(totalXGChain, 2),
        average: matchesWithData > 0 ? this.baseStats.divide(totalXGChain, matchesWithData) : 0,
        matches: matchesWithData,
      };
    }

    /**
     * Calculate non-penalty xG
     */
    calculateNonPenaltyXG(matches, teamId) {
      let totalNPxG = 0;
      let totalPenaltyXG = 0;
      let matchesWithData = 0;

      matches.forEach(match => {
        const xgData = match.xG || match.expectedGoals || match.xg;
        if (!xgData) return;

        const isHome = String(match.homeTeamId || match.home_team_id) === String(teamId);

        // Non-penalty xG
        if (match.npxg) {
          const npxg = isHome ? parseFloat(match.npxg.home || 0) : parseFloat(match.npxg.away || 0);
          totalNPxG += npxg;
        } else {
          // Calculate from total xG minus penalty xG
          const totalXG = isHome ? parseFloat(xgData.home || 0) : parseFloat(xgData.away || 0);
          const penaltyXG = match.penaltyXG
            ? isHome
              ? parseFloat(match.penaltyXG.home || 0)
              : parseFloat(match.penaltyXG.away || 0)
            : 0;

          totalNPxG += totalXG - penaltyXG;
          totalPenaltyXG += penaltyXG;
        }

        matchesWithData++;
      });

      return {
        totalNPxG: this.baseStats.round(totalNPxG, 2),
        totalPenaltyXG: this.baseStats.round(totalPenaltyXG, 2),
        avgNPxG: matchesWithData > 0 ? this.baseStats.divide(totalNPxG, matchesWithData) : 0,
        avgPenaltyXG:
          matchesWithData > 0 ? this.baseStats.divide(totalPenaltyXG, matchesWithData) : 0,
        matches: matchesWithData,
      };
    }

    /**
     * Calculate big chances
     */
    calculateBigChances(matches, teamId) {
      let bigChancesFor = 0;
      let bigChancesAgainst = 0;
      let bigChancesScoredFor = 0;
      let bigChancesScoredAgainst = 0;
      let matchesWithData = 0;

      matches.forEach(match => {
        if (!match.bigChances) return;

        const isHome = String(match.homeTeamId || match.home_team_id) === String(teamId);

        if (isHome) {
          bigChancesFor += parseInt(match.bigChances.home || 0);
          bigChancesAgainst += parseInt(match.bigChances.away || 0);
          bigChancesScoredFor += parseInt(match.bigChances.homeScored || 0);
          bigChancesScoredAgainst += parseInt(match.bigChances.awayScored || 0);
        } else {
          bigChancesFor += parseInt(match.bigChances.away || 0);
          bigChancesAgainst += parseInt(match.bigChances.home || 0);
          bigChancesScoredFor += parseInt(match.bigChances.awayScored || 0);
          bigChancesScoredAgainst += parseInt(match.bigChances.homeScored || 0);
        }

        matchesWithData++;
      });

      return {
        bigChancesFor,
        bigChancesAgainst,
        bigChancesScoredFor,
        bigChancesScoredAgainst,
        conversionRateFor:
          bigChancesFor > 0 ? this.baseStats.percentage(bigChancesScoredFor, bigChancesFor) : 0,
        conversionRateAgainst:
          bigChancesAgainst > 0
            ? this.baseStats.percentage(bigChancesScoredAgainst, bigChancesAgainst)
            : 0,
        avgBigChancesFor:
          matchesWithData > 0 ? this.baseStats.divide(bigChancesFor, matchesWithData) : 0,
        avgBigChancesAgainst:
          matchesWithData > 0 ? this.baseStats.divide(bigChancesAgainst, matchesWithData) : 0,
        matches: matchesWithData,
      };
    }

    /**
     * Get empty statistics object
     */
    getEmptyStatistics() {
      return {
        matches: 0,
        matchesWithXG: 0,
        totalXGFor: 0,
        totalXGAgainst: 0,
        totalXG: 0,
        avgXGFor: 0,
        avgXGAgainst: 0,
        avgTotalXG: 0,
        xGDifference: 0,
        avgXGDifference: 0,
        performanceVsXG: this.getEmptyPerformanceVsXG(),
        xgOverUnder: {},
        teamXGOver: {},
        shotQualityAnalysis: this.getEmptyShotQuality(),
        xgBySituation: this.getEmptyXGBySituation(),
        xgTiming: {},
        xgEfficiency: this.getEmptyXGEfficiency(),
        xgTrends: {
          xgForTrend: [],
          xgAgainstTrend: [],
          xgDiffTrend: [],
          rollingAverage: { xgFor: [], xgAgainst: [] },
        },
        highXGMatches: [],
        xgByResult: this.getEmptyXGByResult(),
        form: {},
        trend: { trend: 'neutral', confidence: 'low' },
        xgChain: { total: 0, average: 0, matches: 0 },
        nonPenaltyXG: { totalNPxG: 0, totalPenaltyXG: 0, avgNPxG: 0, avgPenaltyXG: 0, matches: 0 },
        bigChances: {
          bigChancesFor: 0,
          bigChancesAgainst: 0,
          bigChancesScoredFor: 0,
          bigChancesScoredAgainst: 0,
          conversionRateFor: 0,
          conversionRateAgainst: 0,
          avgBigChancesFor: 0,
          avgBigChancesAgainst: 0,
          matches: 0,
        },
      };
    }

    getEmptyPerformanceVsXG() {
      return {
        actualGoalsFor: 0,
        actualGoalsAgainst: 0,
        xGFor: 0,
        xGAgainst: 0,
        overperformanceFor: 0,
        overperformanceAgainst: 0,
        scoringEfficiency: 0,
        defensiveEfficiency: 0,
        matchesAnalyzed: 0,
      };
    }

    getEmptyShotQuality() {
      return {
        totalShots: 0,
        shotsOnTarget: 0,
        avgShotXG: 0,
        distribution: {},
        bestChance: 0,
        shotLocations: {},
      };
    }

    getEmptyXGBySituation() {
      return {
        openPlay: { xg: 0, goals: 0, shots: 0, conversionRate: 0, xgPerShot: 0 },
        setPlay: { xg: 0, goals: 0, shots: 0, conversionRate: 0, xgPerShot: 0 },
        penalty: { xg: 0, goals: 0, shots: 0, conversionRate: 0, xgPerShot: 0 },
        counter: { xg: 0, goals: 0, shots: 0, conversionRate: 0, xgPerShot: 0 },
      };
    }

    getEmptyXGEfficiency() {
      return {
        scoringEfficiency: 0,
        defensiveEfficiency: 0,
        overallEfficiency: 0,
        shotConversion: 0,
        xgPerShot: 0,
        shotsPerGoal: 0,
        xgPerGoal: 0,
        wastedXG: 0,
      };
    }

    getEmptyXGByResult() {
      return {
        wins: { matches: 0, xgFor: 0, xgAgainst: 0, avgXGFor: 0, avgXGAgainst: 0 },
        draws: { matches: 0, xgFor: 0, xgAgainst: 0, avgXGFor: 0, avgXGAgainst: 0 },
        losses: { matches: 0, xgFor: 0, xgAgainst: 0, avgXGFor: 0, avgXGAgainst: 0 },
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
    module.exports = XGStatistics;
  } else {
    global.TeamStatsXGStatistics = new XGStatistics();
  }
})(typeof window !== 'undefined' ? window : this);
