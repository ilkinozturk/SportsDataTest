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
    this.eventBus.on('request-h2h-data', params => {
      this.fetchH2HData(params);
    });

    // Listen for match data to extract team IDs
    this.eventBus.on('match-data-loaded', matchData => {
      if (matchData?.homeTeam?.id && matchData?.awayTeam?.id) {
        this.fetchH2HData({
          homeTeamId: matchData.homeTeam.id,
          awayTeamId: matchData.awayTeam.id,
          matchId: matchData.id,
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
          console.log('H2H data from API:', response.data.h2h);
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
        error,
      });

      // Emit empty H2H data
      this.emitH2HData({
        summary: { homeWins: 0, awayWins: 0, draws: 0 },
        matches: [],
        hasData: false,
      });
    } finally {
      this.eventBus.emit('h2h-loading', false);
    }
  }

  processH2HData(h2hData, matchData) {
    console.log('Processing H2H data:', h2hData);

    // Ensure we have valid data structure
    const processed = {
      summary: {
        homeWins: h2hData?.summary?.homeWins || 0,
        awayWins: h2hData?.summary?.awayWins || 0,
        draws: h2hData?.summary?.draws || 0,
      },
      matches: h2hData?.matches || [],
      homeTeam: matchData?.homeTeam,
      awayTeam: matchData?.awayTeam,
      hasData: true,
    };

    // Calculate total matches
    processed.summary.totalMatches =
      processed.summary.homeWins + processed.summary.awayWins + processed.summary.draws;

    console.log('H2H matches count:', processed.matches.length);
    console.log('First few matches:', processed.matches.slice(0, 3));

    // Calculate Over/Under and BTTS statistics
    if (processed.matches && processed.matches.length > 0) {
      processed.overUnderStats = this.calculateOverUnderStats(processed.matches);
      processed.bttsStats = this.calculateBTTSStats(processed.matches);

      console.log('Calculated overUnderStats:', processed.overUnderStats);
      console.log('Calculated bttsStats:', processed.bttsStats);
    } else if (h2hData?.betting_stats) {
      // Use betting_stats from API if no match details available
      console.log('Using betting_stats from API:', h2hData.betting_stats);
      const stats = h2hData.betting_stats;
      const total = processed.summary.totalMatches || stats.total_games || 9;

      processed.overUnderStats = {
        over15: {
          count: stats.over15 || 0,
          percentage: stats.over15Percentage || 0,
          total: total,
        },
        over25: {
          count: stats.over25 || 0,
          percentage: stats.over25Percentage || 0,
          total: total,
        },
        over35: {
          count: stats.over35 || 0,
          percentage: stats.over35Percentage || 0,
          total: total,
        },
      };

      processed.bttsStats = {
        yes: stats.btts || 0,
        no: total - (stats.btts || 0),
        percentage: stats.bttsPercentage || 0,
      };

      console.log('Processed betting stats:', processed.overUnderStats);
    } else {
      console.log('No matches or betting stats to calculate from');
      processed.overUnderStats = {
        over15: { count: 0, percentage: 0, total: 0 },
        over25: { count: 0, percentage: 0, total: 0 },
        over35: { count: 0, percentage: 0, total: 0 },
      };
      processed.bttsStats = {
        yes: 0,
        no: 0,
        percentage: 0,
      };
    }

    return processed;
  }

  calculateOverUnderStats(matches) {
    const stats = {
      over15: { count: 0, percentage: 0, total: matches.length },
      over25: { count: 0, percentage: 0, total: matches.length },
      over35: { count: 0, percentage: 0, total: matches.length },
    };

    console.log('Calculating Over/Under stats for', matches.length, 'matches');

    matches.forEach((match, index) => {
      // Check different possible field names for goals
      const homeGoals =
        match.homeGoalCount || match.home_goal_count || match.homeScore || match.home_score || 0;
      const awayGoals =
        match.awayGoalCount || match.away_goal_count || match.awayScore || match.away_score || 0;
      const totalGoals = homeGoals + awayGoals;

      if (index < 3) {
        console.log(
          `Match ${index + 1}: Home ${homeGoals} - Away ${awayGoals} = Total ${totalGoals}`
        );
        console.log('Match data:', match);
      }

      if (totalGoals > 1.5) {
        stats.over15.count++;
      }
      if (totalGoals > 2.5) {
        stats.over25.count++;
      }
      if (totalGoals > 3.5) {
        stats.over35.count++;
      }
    });

    // Calculate percentages
    if (matches.length > 0) {
      stats.over15.percentage = Math.round((stats.over15.count / matches.length) * 100);
      stats.over25.percentage = Math.round((stats.over25.count / matches.length) * 100);
      stats.over35.percentage = Math.round((stats.over35.count / matches.length) * 100);
    }

    console.log('Final Over/Under stats:', stats);
    return stats;
  }

  calculateBTTSStats(matches) {
    let bttsYes = 0;
    let bttsNo = 0;

    matches.forEach(match => {
      const homeGoals = match.homeGoalCount || 0;
      const awayGoals = match.awayGoalCount || 0;

      if (homeGoals > 0 && awayGoals > 0) {
        bttsYes++;
      } else {
        bttsNo++;
      }
    });

    const percentage = matches.length > 0 ? Math.round((bttsYes / matches.length) * 100) : 0;

    return {
      yes: bttsYes,
      no: bttsNo,
      percentage,
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
      timestamp: Date.now(),
    });
  }

  clearCache() {
    this.cache.clear();
  }

  async calculateH2HFromTeamMatches(homeTeamId, awayTeamId) {
    console.log(`Calculating H2H from team matches for teams ${homeTeamId} vs ${awayTeamId}`);

    try {
      // Fetch recent matches for both teams
      const [homeTeamMatches, awayTeamMatches] = await Promise.all([
        this.fetchTeamMatches(homeTeamId),
        this.fetchTeamMatches(awayTeamId),
      ]);

      console.log(
        `Home team matches: ${homeTeamMatches.length}, Away team matches: ${awayTeamMatches.length}`
      );

      // Find H2H matches
      const h2hMatches = [];
      const processedMatchIds = new Set();

      // Combine all matches and filter for H2H
      const allMatches = [...homeTeamMatches, ...awayTeamMatches];

      allMatches.forEach(match => {
        // Check if this is a match between the two teams
        const isH2HMatch =
          (match.homeID === homeTeamId && match.awayID === awayTeamId) ||
          (match.homeID === awayTeamId && match.awayID === homeTeamId);

        if (isH2HMatch && !processedMatchIds.has(match.id) && match.status === 'complete') {
          processedMatchIds.add(match.id);
          h2hMatches.push(match);
        }
      });

      // Sort by date (newest first)
      h2hMatches.sort((a, b) => {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        return dateB - dateA;
      });

      console.log(`Found ${h2hMatches.length} H2H matches`);

      // Calculate summary
      const summary = {
        homeWins: 0,
        awayWins: 0,
        draws: 0,
        totalMatches: h2hMatches.length,
      };

      h2hMatches.forEach(match => {
        const homeGoals = match.homeGoalCount || match.home_scored || 0;
        const awayGoals = match.awayGoalCount || match.away_scored || 0;

        if (homeGoals > awayGoals) {
          if (match.homeID === homeTeamId) {
            summary.homeWins++;
          } else {
            summary.awayWins++;
          }
        } else if (awayGoals > homeGoals) {
          if (match.awayID === homeTeamId) {
            summary.homeWins++;
          } else {
            summary.awayWins++;
          }
        } else {
          summary.draws++;
        }
      });

      // Return processed H2H data
      const h2hData = {
        summary,
        matches: h2hMatches,
        hasData: h2hMatches.length > 0,
      };

      // Also calculate betting stats if we have matches
      if (h2hMatches.length > 0) {
        h2hData.betting_stats = this.calculateBettingStatsFromMatches(h2hMatches);
      }

      // Get team info from match data
      const matchData = {
        homeTeam: { id: homeTeamId },
        awayTeam: { id: awayTeamId },
      };

      // Try to get team names and logos from first match
      if (h2hMatches.length > 0) {
        const firstMatch = h2hMatches[0];
        if (firstMatch.homeID === homeTeamId) {
          matchData.homeTeam.name = firstMatch.home_name;
          matchData.homeTeam.logo = firstMatch.home_image;
          matchData.awayTeam.name = firstMatch.away_name;
          matchData.awayTeam.logo = firstMatch.away_image;
        } else {
          matchData.homeTeam.name = firstMatch.away_name;
          matchData.homeTeam.logo = firstMatch.away_image;
          matchData.awayTeam.name = firstMatch.home_name;
          matchData.awayTeam.logo = firstMatch.home_image;
        }
      }

      return this.processH2HData(h2hData, matchData);
    } catch (error) {
      console.error('Error calculating H2H from team matches:', error);
      return {
        summary: { homeWins: 0, awayWins: 0, draws: 0, totalMatches: 0 },
        matches: [],
        hasData: false,
      };
    }
  }

  async fetchTeamMatches(teamId) {
    try {
      const response = await this.apiClient.get(`/api/teams/${teamId}/matches`, {
        params: {
          limit: 50, // Get last 50 matches to find H2H
        },
      });

      if (response.success && response.data) {
        return response.data;
      }
      return [];
    } catch (error) {
      console.error(`Error fetching matches for team ${teamId}:`, error);
      return [];
    }
  }

  calculateBettingStatsFromMatches(matches) {
    const stats = {
      total_games: matches.length,
      over15: 0,
      over25: 0,
      over35: 0,
      btts: 0,
    };

    matches.forEach(match => {
      const homeGoals = match.homeGoalCount || match.home_scored || 0;
      const awayGoals = match.awayGoalCount || match.away_scored || 0;
      const totalGoals = homeGoals + awayGoals;

      if (totalGoals > 1.5) {
        stats.over15++;
      }
      if (totalGoals > 2.5) {
        stats.over25++;
      }
      if (totalGoals > 3.5) {
        stats.over35++;
      }
      if (homeGoals > 0 && awayGoals > 0) {
        stats.btts++;
      }
    });

    // Calculate percentages
    stats.over15Percentage = Math.round((stats.over15 / stats.total_games) * 100);
    stats.over25Percentage = Math.round((stats.over25 / stats.total_games) * 100);
    stats.over35Percentage = Math.round((stats.over35 / stats.total_games) * 100);
    stats.bttsPercentage = Math.round((stats.btts / stats.total_games) * 100);

    return stats;
  }
}

export default H2HData;
