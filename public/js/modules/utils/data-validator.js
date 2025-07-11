/**
 * Data Validator Module
 * Handles data validation for the team stats application
 */

(function (global) {
  'use strict';

  const DataValidator = {
    initialized: false,

    init() {
      if (this.initialized) return;

      this.initialized = true;
    },

    validateTeamData(data) {
      const errors = [];

      if (!data) {
        errors.push('Team data is required');
        return { isValid: false, errors };
      }

      // Validate team ID
      if (!data.teamId || typeof data.teamId !== 'number') {
        errors.push('Valid team ID is required');
      }

      // Validate team name
      if (!data.teamName || typeof data.teamName !== 'string') {
        errors.push('Team name is required');
      }

      // Validate statistics
      if (data.statistics) {
        const statsErrors = this.validateStatistics(data.statistics);
        errors.push(...statsErrors);
      }

      return {
        isValid: errors.length === 0,
        errors,
      };
    },

    validateStatistics(stats) {
      const errors = [];

      if (!stats || typeof stats !== 'object') {
        errors.push('Statistics must be an object');
        return errors;
      }

      // Validate numeric fields
      const numericFields = [
        'goalsFor',
        'goalsAgainst',
        'wins',
        'draws',
        'losses',
        'cardsTotal',
        'cornersTotal',
        'shotsTotal',
      ];

      numericFields.forEach(field => {
        if (stats[field] !== undefined && !this.isValidNumber(stats[field])) {
          errors.push(`${field} must be a valid number`);
        }
      });

      // Validate percentage fields
      const percentageFields = ['winPercentage', 'over25GoalsPercentage', 'bttsPercentage'];

      percentageFields.forEach(field => {
        if (stats[field] !== undefined && !this.isValidPercentage(stats[field])) {
          errors.push(`${field} must be a percentage between 0 and 100`);
        }
      });

      return errors;
    },

    validateMatchData(match) {
      const errors = [];

      if (!match) {
        errors.push('Match data is required');
        return { isValid: false, errors };
      }

      // Validate match ID
      if (!match.matchId) {
        errors.push('Match ID is required');
      }

      // Validate teams
      if (!match.homeTeam || !match.awayTeam) {
        errors.push('Both home and away teams are required');
      }

      // Validate score
      if (match.homeScore !== undefined && !this.isValidNumber(match.homeScore)) {
        errors.push('Home score must be a valid number');
      }

      if (match.awayScore !== undefined && !this.isValidNumber(match.awayScore)) {
        errors.push('Away score must be a valid number');
      }

      // Validate date
      if (match.date && !this.isValidDate(match.date)) {
        errors.push('Match date must be a valid date');
      }

      return {
        isValid: errors.length === 0,
        errors,
      };
    },

    validateFilterData(filters) {
      const errors = [];

      if (!filters || typeof filters !== 'object') {
        errors.push('Filters must be an object');
        return { isValid: false, errors };
      }

      // Validate venue filter
      if (filters.venue && !['overall', 'home', 'away'].includes(filters.venue)) {
        errors.push('Venue filter must be overall, home, or away');
      }

      // Validate timeframe filter
      if (filters.timeframe && !['all', 'last5', 'last10', 'last15'].includes(filters.timeframe)) {
        errors.push('Timeframe filter must be all, last5, last10, or last15');
      }

      return {
        isValid: errors.length === 0,
        errors,
      };
    },

    isValidNumber(value) {
      return typeof value === 'number' && !isNaN(value) && isFinite(value);
    },

    isValidPercentage(value) {
      return this.isValidNumber(value) && value >= 0 && value <= 100;
    },

    isValidDate(dateStr) {
      if (typeof dateStr !== 'string') return false;

      const date = new Date(dateStr);
      return !isNaN(date.getTime());
    },

    sanitizeInput(input) {
      if (typeof input !== 'string') return input;

      // Remove potentially dangerous characters
      return input
        .replace(/[<>]/g, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+=/gi, '')
        .trim();
    },

    validateAPIResponse(response) {
      const errors = [];

      if (!response) {
        errors.push('API response is required');
        return { isValid: false, errors };
      }

      // Check for expected structure
      if (response.error) {
        errors.push(`API error: ${response.error}`);
      }

      if (!response.data && !response.error) {
        errors.push('API response must contain data or error');
      }

      return {
        isValid: errors.length === 0,
        errors,
      };
    },

    logValidationError(context, errors) {

      // Emit validation error event
      if (global.TeamStatsEventBus) {
        global.TeamStatsEventBus.emit('validation:error', {
          context,
          errors,
        });
      }
    },

    logValidationSuccess(context) {
    },
  };

  // Global registration
  global.TeamStatsDataValidator = DataValidator;

  // Auto-initialize
  DataValidator.init();
})(window);
