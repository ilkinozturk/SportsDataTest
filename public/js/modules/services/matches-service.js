/**
 * Matches Service Module
 * Independent service for fetching and managing match data
 *
 * Features:
 * - Fetch matches independently from TeamDataService
 * - Cache management
 * - Season detection
 * - Error handling
 */

(function (global) {
  'use strict';

  class MatchesService {
    constructor() {
      this.name = 'MatchesService';
      this.version = '1.0.0';
      this.cache = new Map();
      this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
      this.apiEndpoint = '/api/teams/:teamId/matches';
    }

    /**
     * Initialize the service
     */
    initialize() {

      // Subscribe to events if EventBus is available
      if (global.TeamStatsEventBus) {
        global.TeamStatsEventBus.on('team:loaded', data => this.handleTeamLoaded(data));
      }

    }

    /**
     * Handle team loaded event
     */
    handleTeamLoaded(data) {
      const teamId = data.teamInfo?.id || data.teamId;
      const seasonId = data.seasonId || data.teamInfo?.seasonId;

      if (teamId && seasonId) {
        this.fetchMatches(teamId, seasonId);
      }
    }

    /**
     * Fetch matches for a team
     */
    async fetchMatches(teamId, seasonId, options = {}) {
      const cacheKey = `matches_${teamId}_${seasonId}`;

      // Check cache first
      const cached = this.getCachedData(cacheKey);
      if (cached && !options.forceRefresh) {
        this.publishMatches(cached);
        return cached;
      }

      try {

        // Build API URL
        const apiUrl = this.apiEndpoint.replace(':teamId', teamId);

        // Fetch from API
        const response = await fetch(apiUrl, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`API request failed: ${response.status}`);
        }

        const data = await response.json();

        if (data.success && data.data) {
          const matches = this.processMatches(data.data);

          // Cache the results
          this.setCachedData(cacheKey, matches);

          // Publish via EventBus
          this.publishMatches(matches);

          return matches;
        } else {
          throw new Error('Invalid API response format');
        }
      } catch (error) {

        // Try to get from TeamDataService as fallback
        return this.fetchFromTeamData(teamId);
      }
    }

    /**
     * Fetch matches from existing team data as fallback
     */
    async fetchFromTeamData(teamId) {
      try {
        const response = await fetch(`/api/teams/data?teamId=${teamId}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`Team data request failed: ${response.status}`);
        }

        const data = await response.json();

        if (data.success && data.data) {
          const matches = data.data.allMatches || data.data.recentMatches || [];
          const processedMatches = this.processMatches(matches);

          // Publish via EventBus
          this.publishMatches(processedMatches);

          return processedMatches;
        }
      } catch (error) {
        return [];
      }
    }

    /**
     * Process raw match data
     */
    processMatches(matches) {
      if (!Array.isArray(matches)) {
        return [];
      }

      return matches
        .map(match => {
          // Ensure consistent format
          return {
            id: match.id || match.match_id,
            date: match.date || match.match_date,
            time: match.time || match.match_time,
            status: match.status || (match.is_finished ? 'complete' : 'scheduled'),
            competition: match.competition || match.league_name || 'League',
            homeTeam: {
              id: match.home_id || match.homeTeam?.id,
              name: match.home_name || match.homeTeam?.name || 'Home Team',
            },
            awayTeam: {
              id: match.away_id || match.awayTeam?.id,
              name: match.away_name || match.awayTeam?.name || 'Away Team',
            },
            homeScore: match.home_score !== undefined ? match.home_score : match.homeScore,
            awayScore: match.away_score !== undefined ? match.away_score : match.awayScore,
            venue: match.venue || (match.is_home ? 'Home' : 'Away'),
            round: match.round || match.match_round,
            // Additional data
            halfTimeHome: match.ht_home_score || match.halfTimeHome,
            halfTimeAway: match.ht_away_score || match.halfTimeAway,
            referee: match.referee,
            attendance: match.attendance,
          };
        })
        .sort((a, b) => {
          // Sort by date descending (most recent first)
          return new Date(b.date) - new Date(a.date);
        });
    }

    /**
     * Publish matches via EventBus
     */
    publishMatches(matches) {
      if (global.TeamStatsEventBus) {
        global.TeamStatsEventBus.emit('matches:loaded', {
          matches: matches,
          timestamp: Date.now(),
        });
      }
    }

    /**
     * Get cached data
     */
    getCachedData(key) {
      const cached = this.cache.get(key);
      if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }
      return null;
    }

    /**
     * Set cached data
     */
    setCachedData(key, data) {
      this.cache.set(key, {
        data: data,
        timestamp: Date.now(),
      });
    }

    /**
     * Clear cache
     */
    clearCache() {
      this.cache.clear();
    }

    /**
     * Get matches by filter
     */
    getMatchesByFilter(matches, filter = 'all', teamId) {
      if (!matches || !Array.isArray(matches)) return [];

      switch (filter) {
        case 'home':
          return matches.filter(m => m.homeTeam.id === teamId);
        case 'away':
          return matches.filter(m => m.awayTeam.id === teamId);
        case 'wins':
          return matches.filter(m => {
            if (m.status !== 'complete') return false;
            const isHome = m.homeTeam.id === teamId;
            return isHome ? m.homeScore > m.awayScore : m.awayScore > m.homeScore;
          });
        case 'draws':
          return matches.filter(m => m.status === 'complete' && m.homeScore === m.awayScore);
        case 'losses':
          return matches.filter(m => {
            if (m.status !== 'complete') return false;
            const isHome = m.homeTeam.id === teamId;
            return isHome ? m.homeScore < m.awayScore : m.awayScore < m.homeScore;
          });
        case 'recent':
          return matches.slice(0, 10);
        case 'last5':
          return matches.slice(0, 5);
        default:
          return matches;
      }
    }

    /**
     * Get match statistics
     */
    getMatchStatistics(matches, teamId) {
      const completed = matches.filter(m => m.status === 'complete');

      let wins = 0,
        draws = 0,
        losses = 0;
      let goalsFor = 0,
        goalsAgainst = 0;
      let cleanSheets = 0;

      completed.forEach(match => {
        const isHome = match.homeTeam.id === teamId;
        const teamScore = isHome ? match.homeScore : match.awayScore;
        const opponentScore = isHome ? match.awayScore : match.homeScore;

        goalsFor += teamScore;
        goalsAgainst += opponentScore;

        if (teamScore > opponentScore) wins++;
        else if (teamScore === opponentScore) draws++;
        else losses++;

        if (opponentScore === 0) cleanSheets++;
      });

      return {
        played: completed.length,
        wins,
        draws,
        losses,
        goalsFor,
        goalsAgainst,
        goalDifference: goalsFor - goalsAgainst,
        cleanSheets,
        points: wins * 3 + draws,
        avgGoalsFor: completed.length > 0 ? (goalsFor / completed.length).toFixed(2) : 0,
        avgGoalsAgainst: completed.length > 0 ? (goalsAgainst / completed.length).toFixed(2) : 0,
      };
    }

    /**
     * Get form string (last 5 matches)
     */
    getFormString(matches, teamId) {
      const last5 = matches.filter(m => m.status === 'complete').slice(0, 5);

      return last5
        .map(match => {
          const isHome = match.homeTeam.id === teamId;
          const teamScore = isHome ? match.homeScore : match.awayScore;
          const opponentScore = isHome ? match.awayScore : match.homeScore;

          if (teamScore > opponentScore) return 'W';
          else if (teamScore === opponentScore) return 'D';
          else return 'L';
        })
        .join('');
    }
  }

  // Create singleton instance
  const matchesService = new MatchesService();

  // Auto-initialize
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => matchesService.initialize());
  } else {
    matchesService.initialize();
  }

  // Export to global scope
  global.TeamStatsMatchesService = matchesService;

})(window);
