/**
 * Lineup Predictions Module
 * Handles fetching and processing lineup predictions and injury data
 */

class LineupPredictions {
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.matchData = null;
    this.lineupData = null;
    this.playerDetailsQueue = [];
    this.isProcessingQueue = false;
    this.playerCache = new Map(); // Cache player data
    this.isProcessing = false; // Prevent multiple processing
    // Use ENV configuration for high-traffic system
    this.apiCallDelay = (window.ENV && window.ENV.API_RATE_LIMIT_DELAY) || 50;
    this.batchSize = (window.ENV && window.ENV.PLAYER_BATCH_SIZE) || 10;
    
    this.initialize();
  }

  initialize() {
    // Listen for match data
    this.eventBus.on('match-data-loaded', matchData => {
      this.matchData = matchData;
      console.log('[LineupPredictions] Match data loaded:', matchData);
      
      // Check if match data contains lineup information
      if (matchData.lineups || matchData.bench) {
        console.log('[LineupPredictions] Found lineup data in match response');
        this.processMatchLineupData(matchData);
      }
    });
    
    // Listen for tab switches to Lineups tab
    this.eventBus.on('tab-switched', tabName => {
      console.log('[LineupPredictions] Tab switched to:', tabName);
      if (tabName === 'lineups') {
        console.log('[LineupPredictions] Lineups tab selected, matchData:', this.matchData);
        if (this.matchData && this.lineupData) {
          console.log('[LineupPredictions] Lineup data already processed, re-emitting');
          this.emitProcessedLineupData();
        } else if (this.matchData && (this.matchData.lineups || this.matchData.bench)) {
          console.log('[LineupPredictions] Processing lineup data from match');
          this.processMatchLineupData(this.matchData);
        }
      }
    });
  }

  async processMatchLineupData(matchData) {
    // Prevent multiple simultaneous processing
    if (this.isProcessing) {
      console.log('[LineupPredictions] Already processing lineup data, skipping...');
      return;
    }
    
    this.isProcessing = true;
    
    try {
      console.log('[LineupPredictions] Processing lineup data from match:', matchData);
      
      // Extract lineup and bench data
      const lineups = matchData.lineups || {};
      const bench = matchData.bench || {};
      
      // Process home team lineup
      const homeLineup = await this.processTeamLineup(
        lineups.team_a || [], 
        bench.team_a || [],
        matchData.homeID || matchData.homeTeam?.id,
        matchData.home_name || matchData.homeTeam?.name
      );
      
      // Process away team lineup  
      const awayLineup = await this.processTeamLineup(
        lineups.team_b || [],
        bench.team_b || [],
        matchData.awayID || matchData.awayTeam?.id,
        matchData.away_name || matchData.awayTeam?.name
      );
      
      // Store processed lineup data
      this.lineupData = {
        homeTeam: homeLineup,
        awayTeam: awayLineup
      };
      
      console.log('[LineupPredictions] Processed lineup data:', this.lineupData);
      
      // Emit processed data
      this.emitProcessedLineupData();
      
    } catch (error) {
      console.error('[LineupPredictions] Error processing lineup data:', error);
      this.eventBus.emit('lineup-data-error', error);
    } finally {
      this.isProcessing = false;
    }
  }

  async processTeamLineup(startingPlayers, benchPlayers, teamId, teamName) {
    try {
      const processedLineup = {
        teamId: teamId,
        teamName: teamName,
        formation: '',
        lastUpdated: new Date().toISOString(),
        starting11: {
          forwards: [],
          midfielders: [],
          defenders: [],
          goalkeeper: []
        },
        substitutes: {
          forwards: [],
          midfielders: [],
          defenders: [],
          goalkeeper: []
        },
        injuries: [],
        suspensions: []
      };

      // Collect all player IDs to fetch
      const playerIds = [];
      if (Array.isArray(startingPlayers)) {
        startingPlayers.forEach(player => {
          if (player.player_id) playerIds.push({ id: player.player_id, type: 'starting', data: player });
        });
      }
      if (Array.isArray(benchPlayers)) {
        benchPlayers.forEach(sub => {
          if (sub.player_in_id) playerIds.push({ id: sub.player_in_id, type: 'substitute', data: sub });
        });
      }

      // Fetch player details with rate limiting
      const playerDetailsMap = await this.fetchPlayersWithRateLimit(playerIds);

      // Process starting lineup
      if (Array.isArray(startingPlayers)) {
        console.log('[LineupPredictions] Processing starting lineup:', startingPlayers.length, 'players');
        for (const player of startingPlayers) {
          const playerData = playerDetailsMap.get(player.player_id);
          console.log('[LineupPredictions] Player', player.player_id, 'data:', playerData?.known_as || 'NOT FOUND');
          const processedPlayer = {
            id: player.player_id,
            number: player.shirt_number || '-',
            name: playerData?.known_as || playerData?.full_name || `Player ${player.player_id}`,
            nationality: playerData?.nationality || '',
            position: playerData?.position || '',
            status: '-',
            events: player.player_events || []
          };
          
          const positionCategory = this.getPlayerPositionCategory(processedPlayer.position);
          processedLineup.starting11[positionCategory].push(processedPlayer);
        }
      }

      // Process substitutes
      if (Array.isArray(benchPlayers)) {
        for (const sub of benchPlayers) {
          const playerData = playerDetailsMap.get(sub.player_in_id);
          const processedPlayer = {
            id: sub.player_in_id,
            number: sub.player_in_shirt_number || '-',
            name: playerData?.known_as || playerData?.full_name || `Player ${sub.player_in_id}`,
            nationality: playerData?.nationality || '',
            position: playerData?.position || '',
            status: '-',
            substituteInfo: {
              playerOutId: sub.player_out_id,
              playerOutTime: sub.player_out_time,
              events: sub.player_in_events || []
            }
          };
          
          const positionCategory = this.getPlayerPositionCategory(processedPlayer.position);
          processedLineup.substitutes[positionCategory].push(processedPlayer);
        }
      }

      return processedLineup;
      
    } catch (error) {
      console.error('[LineupPredictions] Error processing team lineup:', error);
      return null;
    }
  }

  async fetchPlayersWithRateLimit(playerIds) {
    const playerDetailsMap = new Map();
    const delayBetweenBatches = 1000; // 1 second between batches
    const maxBatchSize = 3; // Only 3 players per batch to avoid rate limiting
    
    for (let i = 0; i < playerIds.length; i += maxBatchSize) {
      const batch = playerIds.slice(i, i + maxBatchSize);
      
      // Process batch in parallel
      const batchPromises = batch.map(async (playerInfo) => {
        const details = await this.fetchPlayerDetails(playerInfo.id);
        if (details) {
          playerDetailsMap.set(playerInfo.id, details);
        }
      });
      
      await Promise.all(batchPromises);
      
      // Add longer delay between batches
      if (i + maxBatchSize < playerIds.length) {
        console.log(`[LineupPredictions] Waiting ${delayBetweenBatches}ms before next batch...`);
        await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
      }
    }
    
    return playerDetailsMap;
  }

  async fetchPlayerDetails(playerId) {
    if (!playerId) return null;
    
    // Check cache first
    if (this.playerCache.has(playerId)) {
      console.log(`[LineupPredictions] Using cached data for player ${playerId}`);
      return this.playerCache.get(playerId);
    }
    
    try {
      const apiClient = window.TeamStatsAPIClient || window.APIClient || {
        get: async (url) => {
          const response = await fetch(url);
          if (!response.ok) {
            // Log rate limiting but don't throw error
            if (response.status === 429) {
              console.warn(`[LineupPredictions] Rate limited for player ${playerId}`);
            }
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          return await response.json();
        }
      };

      const response = await apiClient.get(`/api/player-stats?player_id=${playerId}`);
      
      if (response.success && response.data && response.data.length > 0) {
        const playerData = response.data[0];
        console.log(`[LineupPredictions] Successfully fetched player ${playerId}:`, playerData.known_as);
        // Cache the player data
        this.playerCache.set(playerId, playerData);
        return playerData;
      }
      
      return null;
    } catch (error) {
      console.warn(`[LineupPredictions] Could not fetch player ${playerId} details:`, error.message);
      // Return null instead of throwing to allow graceful degradation
      return null;
    }
  }

  emitProcessedLineupData() {
    if (!this.lineupData || !this.matchData) return;
    
    const { homeTeam: homeLineup, awayTeam: awayLineup } = this.lineupData;
    
    // Extract lineup information with proper team data
    const processedData = {
      homeTeam: {
        id: homeLineup.teamId || this.matchData.homeID,
        name: homeLineup.teamName || this.matchData.home_name || this.matchData.homeTeam?.name,
        logo: this.matchData.home_image || this.matchData.homeTeam?.logo,
        formation: homeLineup.formation,
        lastUpdated: homeLineup.lastUpdated,
        starting11: homeLineup.starting11,
        substitutes: homeLineup.substitutes,
        injuries: homeLineup.injuries || [],
        suspensions: homeLineup.suspensions || []
      },
      awayTeam: {
        id: awayLineup.teamId || this.matchData.awayID,
        name: awayLineup.teamName || this.matchData.away_name || this.matchData.awayTeam?.name,
        logo: this.matchData.away_image || this.matchData.awayTeam?.logo,
        formation: awayLineup.formation,
        lastUpdated: awayLineup.lastUpdated,
        starting11: awayLineup.starting11,
        substitutes: awayLineup.substitutes,
        injuries: awayLineup.injuries || [],
        suspensions: awayLineup.suspensions || []
      }
    };
    
    console.log('[LineupPredictions] Emitting processed lineup data:', processedData);
    
    // Emit processed lineup data
    this.eventBus.emit('lineup-predictions-calculated', processedData);
  }

  getPlayerPositionCategory(position) {
    if (!position) return 'midfielders';
    
    const pos = position.toLowerCase();
    
    if (pos.includes('gk') || pos.includes('goalkeeper')) {
      return 'goalkeeper';
    } else if (pos.includes('def') || pos.includes('back')) {
      return 'defenders';
    } else if (pos.includes('mid')) {
      return 'midfielders';
    } else if (pos.includes('for') || pos.includes('striker') || pos.includes('wing')) {
      return 'forwards';
    }
    
    return 'midfielders'; // Default
  }
}

// Singleton pattern to prevent multiple instances
let lineupPredictionsInstance = null;

export default function getLineupPredictions(eventBus) {
  if (!lineupPredictionsInstance && eventBus) {
    lineupPredictionsInstance = new LineupPredictions(eventBus);
  }
  return lineupPredictionsInstance;
}

export { LineupPredictions };