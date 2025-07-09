/**
 * Data Processor Module
 * Handles data processing and transformation for the team stats application
 */

(function (global) {
  'use strict';

  const DataProcessor = {
    initialized: false,

    init() {
      if (this.initialized) return;

      this.initialized = true;
      console.log('[DataProcessor] Initialized');
    },

    processTeamData(rawData) {
      if (!rawData) return null;

      try {
        const processedData = {
          ...rawData,
          processed: true,
          processedAt: new Date().toISOString(),
        };

        // Process statistics if they exist
        if (rawData.statistics) {
          processedData.statistics = this.processStatistics(rawData.statistics);
        }

        // Process matches if they exist
        if (rawData.matches) {
          processedData.matches = this.processMatches(rawData.matches);
        }

        return processedData;
      } catch (error) {
        console.error('[DataProcessor] Failed to process team data:', error);
        return rawData;
      }
    },

    processStatistics(stats) {
      const processed = { ...stats };

      // Calculate derived statistics
      processed.totalMatches = (stats.wins || 0) + (stats.draws || 0) + (stats.losses || 0);

      if (processed.totalMatches > 0) {
        processed.winPercentage = Math.round(((stats.wins || 0) / processed.totalMatches) * 100);
        processed.drawPercentage = Math.round(((stats.draws || 0) / processed.totalMatches) * 100);
        processed.lossPercentage = Math.round(((stats.losses || 0) / processed.totalMatches) * 100);

        // Goals per match
        processed.goalsForPerMatch = Number(
          ((stats.goalsFor || 0) / processed.totalMatches).toFixed(2)
        );
        processed.goalsAgainstPerMatch = Number(
          ((stats.goalsAgainst || 0) / processed.totalMatches).toFixed(2)
        );
        processed.goalDifferencePerMatch = Number(
          (processed.goalsForPerMatch - processed.goalsAgainstPerMatch).toFixed(2)
        );
      }

      // Goal difference
      processed.goalDifference = (stats.goalsFor || 0) - (stats.goalsAgainst || 0);

      return processed;
    },

    processMatches(matches) {
      if (!Array.isArray(matches)) return [];

      return matches.map(match => {
        const processed = { ...match };

        // Parse date if it's a string
        if (typeof match.date === 'string') {
          processed.dateObject = new Date(match.date);
        }

        // Calculate result
        if (match.homeScore !== undefined && match.awayScore !== undefined) {
          if (match.homeScore > match.awayScore) {
            processed.result = 'home_win';
          } else if (match.awayScore > match.homeScore) {
            processed.result = 'away_win';
          } else {
            processed.result = 'draw';
          }

          processed.totalGoals = match.homeScore + match.awayScore;
        }

        return processed;
      });
    },

    calculatePercentages(stats, total) {
      if (!stats || total === 0) return {};

      const percentages = {};

      Object.keys(stats).forEach(key => {
        if (typeof stats[key] === 'number') {
          percentages[`${key}Percentage`] = Math.round((stats[key] / total) * 100);
        }
      });

      return percentages;
    },

    filterByDateRange(data, startDate, endDate) {
      if (!Array.isArray(data)) return data;

      const start = new Date(startDate);
      const end = new Date(endDate);

      return data.filter(item => {
        const itemDate = new Date(item.date || item.dateObject);
        return itemDate >= start && itemDate <= end;
      });
    },

    filterByVenue(data, venue) {
      if (!Array.isArray(data) || venue === 'overall') return data;

      return data.filter(item => {
        if (venue === 'home') {
          return item.isHome === true || item.venue === 'home';
        } else if (venue === 'away') {
          return item.isHome === false || item.venue === 'away';
        }
        return true;
      });
    },

    aggregateStatistics(matches) {
      if (!Array.isArray(matches) || matches.length === 0) {
        return {
          totalMatches: 0,
          wins: 0,
          draws: 0,
          losses: 0,
          goalsFor: 0,
          goalsAgainst: 0,
        };
      }

      const stats = {
        totalMatches: matches.length,
        wins: 0,
        draws: 0,
        losses: 0,
        goalsFor: 0,
        goalsAgainst: 0,
      };

      matches.forEach(match => {
        // Count results
        if (match.result === 'win') stats.wins++;
        else if (match.result === 'draw') stats.draws++;
        else if (match.result === 'loss') stats.losses++;

        // Sum goals
        if (typeof match.goalsFor === 'number') stats.goalsFor += match.goalsFor;
        if (typeof match.goalsAgainst === 'number') stats.goalsAgainst += match.goalsAgainst;
      });

      return stats;
    },

    normalizeValue(value, min = 0, max = 100) {
      if (typeof value !== 'number') return 0;

      const normalized = ((value - min) / (max - min)) * 100;
      return Math.max(0, Math.min(100, normalized));
    },

    formatValue(value, type = 'number') {
      if (value === null || value === undefined) return '-';

      switch (type) {
        case 'percentage':
          return `${Math.round(value)}%`;
        case 'decimal':
          return Number(value).toFixed(2);
        case 'integer':
          return Math.round(value);
        case 'currency':
          return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
          }).format(value);
        default:
          return value.toString();
      }
    },
  };

  // Global registration
  global.TeamStatsDataProcessor = DataProcessor;

  // Auto-initialize
  DataProcessor.init();
})(window);
