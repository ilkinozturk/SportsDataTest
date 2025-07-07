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
    this.currentMatchData = null;

    this.attachEventListeners();
  }

  attachEventListeners() {
    // Listen for H2H data requests
    this.eventBus.on('request-h2h-data', params => {
      this.fetchH2HData(params);
    });

    // Listen for match data to extract team IDs
    this.eventBus.on('match-data-loaded', matchData => {
      this.currentMatchData = matchData; // Store match data for later use
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

    // Check if h2h data has the API structure
    if (h2hData?.previous_matches_results) {
      // API format - extract summary from previous_matches_results
      const results = h2hData.previous_matches_results;
      const processed = {
        summary: {
          homeWins: results.team_a_wins || 0,
          awayWins: results.team_b_wins || 0,
          draws: results.draw || 0,
          totalMatches: results.totalMatches || 0,
        },
        matches: h2hData.matches || [], // Check if API provides match details
        homeTeam: matchData?.homeTeam,
        awayTeam: matchData?.awayTeam,
        hasData: true,
      };

      console.log('Processed H2H from API format:', processed);
      return processed;
    }

    // Fallback to existing format
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
    console.log(`Fetching H2H matches for teams ${homeTeamId} vs ${awayTeamId}`);

    try {
      // First try the H2H endpoint
      const h2hResponse = await this.apiClient.get(`/api/matches/h2h/${homeTeamId}/${awayTeamId}`);

      if (
        h2hResponse.success &&
        h2hResponse.data &&
        h2hResponse.data.matches &&
        h2hResponse.data.matches.length > 0
      ) {
        console.log(`H2H endpoint returned ${h2hResponse.data.matches.length} matches`);
        return this.processH2HData(h2hResponse.data, {
          homeTeam: { id: homeTeamId },
          awayTeam: { id: awayTeamId },
        });
      }

      console.log('H2H endpoint returned no matches, trying alternative approach...');

      // Use stored match data
      const matchData = this.currentMatchData;

      if (!matchData) {
        console.log('No match data available');
        return {
          summary: { homeWins: 0, awayWins: 0, draws: 0, totalMatches: 0 },
          matches: [],
          hasData: false,
        };
      }

      // Check if we have team matches from the match data
      const homeTeamData = matchData.homeTeam;
      const awayTeamData = matchData.awayTeam;

      if (!homeTeamData || !awayTeamData) {
        console.log('No team data available for H2H calculation');
        return {
          summary: { homeWins: 0, awayWins: 0, draws: 0, totalMatches: 0 },
          matches: [],
          hasData: false,
        };
      }

      // Get matches from team data
      const homeMatches = homeTeamData.recentMatches || [];
      const awayMatches = awayTeamData.recentMatches || [];

      console.log(
        `Home team has ${homeMatches.length} recent matches, Away team has ${awayMatches.length} recent matches`
      );

      // Find H2H matches by matching IDs
      const h2hMatches = [];
      const processedIds = new Set();

      // Check all matches for H2H
      [...homeMatches, ...awayMatches].forEach(match => {
        if (!processedIds.has(match.id)) {
          const isH2H =
            (match.homeTeam?.id === homeTeamId && match.awayTeam?.id === awayTeamId) ||
            (match.homeTeam?.id === awayTeamId && match.awayTeam?.id === homeTeamId);

          if (isH2H && match.status === 'complete') {
            processedIds.add(match.id);

            // Normalize match data
            const normalizedMatch = {
              id: match.id,
              date: match.date,
              status: match.status,
              homeID: match.homeTeam.id,
              awayID: match.awayTeam.id,
              home_name: match.homeTeam.name,
              away_name: match.awayTeam.name,
              homeGoalCount: match.homeScore || 0,
              awayGoalCount: match.awayScore || 0,
              competition: match.competition,
              stadium: match.stadium,
            };

            h2hMatches.push(normalizedMatch);
          }
        }
      });

      // Sort by date (newest first)
      h2hMatches.sort((a, b) => new Date(b.date) - new Date(a.date));

      console.log(`Found ${h2hMatches.length} H2H matches from team data`);

      // Calculate summary
      const summary = {
        homeWins: 0,
        awayWins: 0,
        draws: 0,
        totalMatches: h2hMatches.length,
      };

      h2hMatches.forEach(match => {
        const homeGoals = match.homeGoalCount;
        const awayGoals = match.awayGoalCount;

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

      const processedData = {
        summary,
        matches: h2hMatches,
        hasData: h2hMatches.length > 0,
        homeTeam: { id: homeTeamId, name: homeTeamData.name, logo: homeTeamData.logo },
        awayTeam: { id: awayTeamId, name: awayTeamData.name, logo: awayTeamData.logo },
      };

      return processedData;
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
      // Note: This endpoint returns team's recent matches, not just H2H
      // We'll filter for H2H matches in calculateH2HFromTeamMatches
      const response = await this.apiClient.get(`/api/teams/${teamId}/matches`);

      if (response.success && response.data) {
        console.log(`Fetched ${response.data.length} matches for team ${teamId}`);
        return response.data;
      }
      return [];
    } catch (error) {
      console.error(`Error fetching matches for team ${teamId}:`, error);
      // If team matches endpoint fails, return empty array
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
