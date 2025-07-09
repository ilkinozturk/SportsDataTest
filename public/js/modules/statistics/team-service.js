/**
 * Team Service Module
 * Handles all team data operations, API calls, and caching
 * Part of the modular statistics system
 */

(function (global) {
  'use strict';

  class TeamService {
    constructor() {
      this.config = window.TeamStatsConfig || {};
      this.cache = new Map();
      this.pendingRequests = new Map();
      this.cacheTimeout = 5 * 60 * 1000; // 5 minutes

      // API endpoints - matching actual server endpoints
      this.endpoints = {
        teamData: '/api/teams/data',
        teamStats: '/api/teams/data', // Using same endpoint with different params
        teamMatches: '/api/teams/:teamId/matches',
        headToHead: '/api/teams/compare',
        predictions: '/api/teams/predictions',
        search: '/api/search',
        batch: '/api/teams/batch',
      };

      // Request configuration
      this.requestConfig = {
        timeout: 30000,
        retries: 3,
        retryDelay: 1000,
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
      };

      // Metrics
      this.metrics = {
        requests: 0,
        cacheHits: 0,
        cacheMisses: 0,
        errors: 0,
        totalResponseTime: 0,
      };

      this.initialize();
    }

    initialize() {
      // Set up periodic cache cleanup
      setInterval(() => this.cleanupCache(), 60000); // Every minute

      // Listen for online/offline events
      if (typeof window !== 'undefined') {
        window.addEventListener('online', () => this.handleOnline());
        window.addEventListener('offline', () => this.handleOffline());
      }

      console.log('[TeamService] Initialized');
    }

    /**
     * Get team data by ID
     */
    async getTeamData(teamId, options = {}) {
      if (!teamId) {
        throw new Error('Team ID is required');
      }

      const cacheKey = `team-data-${teamId}`;
      const cached = this.getFromCache(cacheKey);

      if (cached && !options.forceRefresh) {
        this.metrics.cacheHits++;
        return cached;
      }

      this.metrics.cacheMisses++;

      try {
        const data = await this.request(this.endpoints.teamData, {
          params: { teamId, ...options },
        });

        this.setCache(cacheKey, data);
        return data;
      } catch (error) {
        console.error('[TeamService] Error fetching team data:', error);
        throw error;
      }
    }

    /**
     * Get team statistics
     */
    async getTeamStats(teamId, options = {}) {
      const {
        season = 'current',
        venue = 'overall',
        timeFrame = 'all',
        includeAdvanced = true,
      } = options;

      const cacheKey = `team-stats-${teamId}-${season}-${venue}-${timeFrame}`;
      const cached = this.getFromCache(cacheKey);

      if (cached && !options.forceRefresh) {
        this.metrics.cacheHits++;
        return cached;
      }

      try {
        const stats = await this.request(this.endpoints.teamStats, {
          params: {
            teamId,
            season,
            venue,
            timeFrame,
            includeAdvanced,
          },
        });

        this.setCache(cacheKey, stats);
        return stats;
      } catch (error) {
        console.error('[TeamService] Error fetching team stats:', error);
        throw error;
      }
    }

    /**
     * Get team matches
     */
    async getTeamMatches(teamId, options = {}) {
      const {
        limit = 10,
        offset = 0,
        status = 'all',
        venue = 'all',
        competition = 'all',
      } = options;

      const cacheKey = `team-matches-${teamId}-${limit}-${offset}-${status}-${venue}`;
      const cached = this.getFromCache(cacheKey);

      if (cached && !options.forceRefresh) {
        this.metrics.cacheHits++;
        return cached;
      }

      try {
        // Replace :teamId in the URL
        const url = this.endpoints.teamMatches.replace(':teamId', teamId);
        const matches = await this.request(url, {
          params: {
            limit,
            offset,
            status,
            venue,
            competition,
          },
        });

        this.setCache(cacheKey, matches, 60000); // 1 minute cache for matches
        return matches;
      } catch (error) {
        console.error('[TeamService] Error fetching team matches:', error);
        throw error;
      }
    }

    /**
     * Get head to head data
     */
    async getHeadToHead(team1Id, team2Id, options = {}) {
      if (!team1Id || !team2Id) {
        throw new Error('Both team IDs are required');
      }

      const cacheKey = `h2h-${team1Id}-${team2Id}`;
      const cached = this.getFromCache(cacheKey);

      if (cached && !options.forceRefresh) {
        this.metrics.cacheHits++;
        return cached;
      }

      try {
        const h2h = await this.request(this.endpoints.headToHead, {
          params: {
            teamIds: `${team1Id},${team2Id}`,
            limit: options.limit || 10,
          },
        });

        this.setCache(cacheKey, h2h);
        return h2h;
      } catch (error) {
        console.error('[TeamService] Error fetching H2H data:', error);
        throw error;
      }
    }

    /**
     * Search teams - using batch endpoint as workaround
     */
    async searchTeams(query, options = {}) {
      if (!query || query.length < 2) {
        return [];
      }

      const cacheKey = `search-${query.toLowerCase()}`;
      const cached = this.getFromCache(cacheKey);

      if (cached) {
        this.metrics.cacheHits++;
        return cached;
      }

      try {
        // Since there's no search endpoint, return empty array
        // In real implementation, you could use league-teams endpoint
        console.warn('[TeamService] Search endpoint not available');
        return [];
      } catch (error) {
        console.error('[TeamService] Error searching teams:', error);
        return [];
      }
    }

    /**
     * Batch fetch multiple teams
     */
    async getMultipleTeams(teamIds, options = {}) {
      if (!Array.isArray(teamIds) || teamIds.length === 0) {
        return [];
      }

      const cacheKey = `batch-${teamIds.join('-')}`;
      const cached = this.getFromCache(cacheKey);

      if (cached && !options.forceRefresh) {
        this.metrics.cacheHits++;
        return cached;
      }

      try {
        // Use batch endpoint
        const response = await this.request(this.endpoints.batch, {
          method: 'POST',
          body: { teamIds },
        });

        this.setCache(cacheKey, response);
        return response;
      } catch (error) {
        console.error('[TeamService] Batch request failed, falling back to individual requests');

        // Fallback to individual requests
        const results = await Promise.allSettled(teamIds.map(id => this.getTeamData(id, options)));

        const teams = results
          .filter(result => result.status === 'fulfilled')
          .map(result => result.value);

        this.setCache(cacheKey, teams);
        return teams;
      }
    }

    /**
     * Core request method with retry logic
     */
    async request(url, options = {}) {
      const requestKey = `${url}-${JSON.stringify(options.params || {})}`;

      // Check if request is already pending
      if (this.pendingRequests.has(requestKey)) {
        return this.pendingRequests.get(requestKey);
      }

      const requestPromise = this.executeRequest(url, options);
      this.pendingRequests.set(requestKey, requestPromise);

      try {
        const result = await requestPromise;
        this.pendingRequests.delete(requestKey);
        return result;
      } catch (error) {
        this.pendingRequests.delete(requestKey);
        throw error;
      }
    }

    async executeRequest(url, options = {}) {
      const startTime = performance.now();
      let lastError;

      for (let attempt = 0; attempt < this.requestConfig.retries; attempt++) {
        try {
          this.metrics.requests++;

          const controller = new AbortController();
          const timeoutId = setTimeout(
            () => controller.abort(),
            options.timeout || this.requestConfig.timeout
          );

          const response = await fetch(url + this.buildQueryString(options.params), {
            method: options.method || 'GET',
            headers: {
              ...this.requestConfig.headers,
              ...options.headers,
            },
            body: options.body ? JSON.stringify(options.body) : undefined,
            signal: controller.signal,
          });

          clearTimeout(timeoutId);

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }

          const data = await response.json();

          this.metrics.totalResponseTime += performance.now() - startTime;

          return data;
        } catch (error) {
          lastError = error;
          this.metrics.errors++;

          if (attempt < this.requestConfig.retries - 1) {
            await this.delay(this.requestConfig.retryDelay * (attempt + 1));
          }
        }
      }

      throw lastError;
    }

    /**
     * Cache management
     */
    getFromCache(key) {
      const cached = this.cache.get(key);

      if (!cached) return null;

      if (Date.now() > cached.expiry) {
        this.cache.delete(key);
        return null;
      }

      return cached.data;
    }

    setCache(key, data, timeout = this.cacheTimeout) {
      this.cache.set(key, {
        data,
        expiry: Date.now() + timeout,
      });
    }

    clearCache(pattern) {
      if (!pattern) {
        this.cache.clear();
        return;
      }

      for (const key of this.cache.keys()) {
        if (key.includes(pattern)) {
          this.cache.delete(key);
        }
      }
    }

    cleanupCache() {
      const now = Date.now();
      let cleaned = 0;

      for (const [key, value] of this.cache.entries()) {
        if (now > value.expiry) {
          this.cache.delete(key);
          cleaned++;
        }
      }

      if (cleaned > 0) {
        console.log(`[TeamService] Cleaned ${cleaned} expired cache entries`);
      }
    }

    /**
     * Utility methods
     */
    buildQueryString(params) {
      if (!params || Object.keys(params).length === 0) {
        return '';
      }

      const query = Object.entries(params)
        .filter(([_, value]) => value != null)
        .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
        .join('&');

      return '?' + query;
    }

    delay(ms) {
      return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Network status handlers
     */
    handleOnline() {
      console.log('[TeamService] Network connection restored');
      // Could trigger refresh of failed requests
    }

    handleOffline() {
      console.log('[TeamService] Network connection lost');
      // Could show offline notification
    }

    /**
     * Get service metrics
     */
    getMetrics() {
      const hitRate =
        this.metrics.requests > 0
          ? (this.metrics.cacheHits / (this.metrics.cacheHits + this.metrics.cacheMisses)) * 100
          : 0;

      const avgResponseTime =
        this.metrics.requests > 0 ? this.metrics.totalResponseTime / this.metrics.requests : 0;

      return {
        ...this.metrics,
        cacheHitRate: hitRate.toFixed(2) + '%',
        averageResponseTime: avgResponseTime.toFixed(2) + 'ms',
        cacheSize: this.cache.size,
        pendingRequests: this.pendingRequests.size,
      };
    }

    /**
     * Reset metrics
     */
    resetMetrics() {
      this.metrics = {
        requests: 0,
        cacheHits: 0,
        cacheMisses: 0,
        errors: 0,
        totalResponseTime: 0,
      };
    }
  }

  // Export
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = TeamService;
  } else {
    global.TeamStatsTeamService = new TeamService();
  }
})(typeof window !== 'undefined' ? window : this);
