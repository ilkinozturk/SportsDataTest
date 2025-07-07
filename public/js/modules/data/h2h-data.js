/**
 * H2H Data Module
 * Handles fetching and processing head-to-head match data
 * Part of the modular match-details system
 */

export class H2HData {
  constructor(eventBus, apiClient) {
    this.eventBus = eventBus;
    this.apiClient = apiClient;
    this.cache = new Map();
    this.CACHE_TTL = 5 * 60 * 1000; // 5 minutes
    
    this.attachEventListeners();
  }

  attachEventListeners() {
    // Listen for H2H data requests
    this.eventBus.on('request-h2h-data', (params) => {
      this.fetchH2HData(params);
    });
    
    // Listen for match data to extract team IDs
    this.eventBus.on('match-data-loaded', (matchData) => {
      if (matchData?.homeTeam?.id && matchData?.awayTeam?.id) {
        this.fetchH2HData({
          homeTeamId: matchData.homeTeam.id,
          awayTeamId: matchData.awayTeam.id,
          matchId: matchData.id
        });
      }
    });
  }

  async fetchH2HData(params) {
    const { homeTeamId, awayTeamId, matchId } = params;
    const cacheKey = `h2h_${homeTeamId}_${awayTeamId}`;
    
    // Check cache
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      console.log('H2H data from cache');
      this.emitH2HData(cached);
      return;
    }
    
    try {
      // Emit loading state
      this.eventBus.emit('h2h-loading', true);
      
      // Fetch H2H data from the match details endpoint
      // The server already includes H2H data in the match details response
      if (matchId) {
        const response = await this.apiClient.get(`/api/matches/${matchId}/details`);
        
        if (response.success && response.data?.h2h) {
          const h2hData = this.processH2HData(response.data.h2h, response.data);
          this.setCache(cacheKey, h2hData);
          this.emitH2HData(h2hData);
        } else {
          throw new Error('No H2H data in response');
        }
      } else {
        // If no matchId, we need to calculate H2H from team matches
        const h2hData = await this.calculateH2HFromTeamMatches(homeTeamId, awayTeamId);
        this.setCache(cacheKey, h2hData);
        this.emitH2HData(h2hData);
      }
      
    } catch (error) {
      console.error('Error fetching H2H data:', error);
      this.eventBus.emit('h2h-error', {
        message: 'Failed to load H2H data',
        error
      });
      
      // Emit empty H2H data
      this.emitH2HData({
        summary: { homeWins: 0, awayWins: 0, draws: 0 },
        matches: [],
        hasData: false
      });
    } finally {
      this.eventBus.emit('h2h-loading', false);
    }
  }

  processH2HData(h2hData, matchData) {
    // Ensure we have valid data structure
    const processed = {
      summary: {
        homeWins: h2hData?.summary?.homeWins || 0,
        awayWins: h2hData?.summary?.awayWins || 0,
        draws: h2hData?.summary?.draws || 0
      },
      matches: h2hData?.matches || [],
      homeTeam: matchData?.homeTeam,
      awayTeam: matchData?.awayTeam,
      hasData: true
    };
    
    // Calculate total matches
    processed.summary.totalMatches = 
      processed.summary.homeWins + 
      processed.summary.awayWins + 
      processed.summary.draws;
    
    return processed;
  }

  calculateH2HFromTeamMatches(_homeTeamId, _awayTeamId) {
    // This would typically fetch team matches and calculate H2H
    // For now, return empty data structure
    return {
      summary: {
        homeWins: 0,
        awayWins: 0,
        draws: 0,
        totalMatches: 0
      },
      matches: [],
      hasData: false
    };
  }

  emitH2HData(h2hData) {
    // Emit processed H2H data
    this.eventBus.emit('h2h-data-loaded', h2hData);
    
    // Also emit specific events for different UI components
    this.eventBus.emit('h2h-summary-data', h2hData.summary);
    this.eventBus.emit('h2h-matches-data', h2hData.matches);
  }

  getFromCache(key) {
    const item = this.cache.get(key);
    if (item && Date.now() - item.timestamp < this.CACHE_TTL) {
      return item.data;
    }
    this.cache.delete(key);
    return null;
  }

  setCache(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  clearCache() {
    this.cache.clear();
  }
}

export default H2HData;