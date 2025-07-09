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
        matches: [], // Will be populated from previous_matches_ids
        homeTeam: matchData?.homeTeam,
        awayTeam: matchData?.awayTeam,
        hasData: true,
        teamNames: h2hData.teamNames || {
          teamA: matchData?.homeTeam?.name || 'Home Team',
          teamB: matchData?.awayTeam?.name || 'Away Team',
        },
      };

      // Process previous_matches_ids if available
      if (h2hData.previous_matches_ids && Array.isArray(h2hData.previous_matches_ids)) {
        // Get current team IDs from h2h data, fallback to matchData
        const currentTeamAId = h2hData.team_a_id || matchData?.homeTeam?.id;
        const currentTeamBId = h2hData.team_b_id || matchData?.awayTeam?.id;

        // Get current team names from match data or API response
        const teamAName = h2hData.teamNames?.teamA || matchData?.homeTeam?.name || 'Team A';
        const teamBName = h2hData.teamNames?.teamB || matchData?.awayTeam?.name || 'Team B';

        // Store team names in processed object
        processed.teamNames = {
          teamA: teamAName,
          teamB: teamBName,
        };

        processed.matches = h2hData.previous_matches_ids.map(match => {
          // Convert Unix timestamp to date
          const date = new Date(match.date_unix * 1000).toISOString();

          // In previous_matches_ids:
          // team_a_id is the HOME team in that specific match
          // team_b_id is the AWAY team in that specific match

          // Since team IDs change across seasons, we cannot reliably determine
          // which current team corresponds to which historical team ID.
          // Instead, we'll show the actual home/away teams from each match.

          // For display purposes, try to match by partial name if possible
          let homeName = `Team ${match.team_a_id}`;
          let awayName = `Team ${match.team_b_id}`;

          // Check if we have team ID to name mapping from the API
          if (h2hData.teamIdMapping) {
            homeName = h2hData.teamIdMapping[match.team_a_id] || homeName;
            awayName = h2hData.teamIdMapping[match.team_b_id] || awayName;
          }

          // Use current match team names for known IDs
          // These are the IDs from the current match
          if (match.team_a_id === currentTeamAId) {
            homeName = teamAName;
          } else if (match.team_a_id === currentTeamBId) {
            homeName = teamBName;
          }

          if (match.team_b_id === currentTeamAId) {
            awayName = teamAName;
          } else if (match.team_b_id === currentTeamBId) {
            awayName = teamBName;
          }

          return {
            id: match.id,
            date: date,
            status: 'complete',
            homeID: match.team_a_id,
            awayID: match.team_b_id,
            home_name: homeName,
            away_name: awayName,
            homeGoalCount: match.team_a_goals || 0,
            awayGoalCount: match.team_b_goals || 0,
            // Add additional fields for better display
            homeScore: match.team_a_goals || 0,
            awayScore: match.team_b_goals || 0,
            team_a_goals: match.team_a_goals || 0,
            team_b_goals: match.team_b_goals || 0,
            // Current match team info
            currentTeamA: teamAName,
            currentTeamB: teamBName,
            currentTeamAId: currentTeamAId,
            currentTeamBId: currentTeamBId,
            // Flag if this is a historical match with different IDs
            isHistorical: true, // Always true for previous_matches_ids
          };
        });

        // Sort by date (newest first)
        processed.matches.sort((a, b) => new Date(b.date) - new Date(a.date));
      }

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
      teamNames: h2hData?.teamNames || {
        teamA: matchData?.homeTeam?.name || 'Home Team',
        teamB: matchData?.awayTeam?.name || 'Away Team',
      },
    };

    // Calculate total matches
    processed.summary.totalMatches =
      processed.summary.homeWins + processed.summary.awayWins + processed.summary.draws;

    // Calculate Over/Under and BTTS statistics
    if (processed.matches && processed.matches.length > 0) {
      processed.overUnderStats = this.calculateOverUnderStats(processed.matches);
      processed.bttsStats = this.calculateBTTSStats(processed.matches);
    } else if (h2hData?.betting_stats) {
      // Use betting_stats from API if no match details available
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
    } else {
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

    matches.forEach(match => {
      // Check different possible field names for goals
      const homeGoals =
        match.homeGoalCount ||
        match.home_goal_count ||
        match.homeScore ||
        match.home_score ||
        match.team_a_goals ||
        match.homeGoals ||
        0;
      const awayGoals =
        match.awayGoalCount ||
        match.away_goal_count ||
        match.awayScore ||
        match.away_score ||
        match.team_b_goals ||
        match.awayGoals ||
        0;
      const totalGoals = homeGoals + awayGoals;

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

    return stats;
  }

  calculateBTTSStats(matches) {
    let bttsYes = 0;
    let bttsNo = 0;

    matches.forEach(match => {
      const homeGoals = match.homeGoalCount || match.team_a_goals || match.homeGoals || 0;
      const awayGoals = match.awayGoalCount || match.team_b_goals || match.awayGoals || 0;

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
    try {
      // First try the H2H endpoint
      const h2hResponse = await this.apiClient.get(`/api/matches/h2h/${homeTeamId}/${awayTeamId}`);

      if (
        h2hResponse.success &&
        h2hResponse.data &&
        h2hResponse.data.matches &&
        h2hResponse.data.matches.length > 0
      ) {
        return this.processH2HData(h2hResponse.data, {
          homeTeam: { id: homeTeamId },
          awayTeam: { id: awayTeamId },
        });
      }

      // Use stored match data
      const matchData = this.currentMatchData;

      if (!matchData) {
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
        return {
          summary: { homeWins: 0, awayWins: 0, draws: 0, totalMatches: 0 },
          matches: [],
          hasData: false,
        };
      }

      // Get matches from team data
      const homeMatches = homeTeamData.recentMatches || [];
      const awayMatches = awayTeamData.recentMatches || [];

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
        return response.data;
      }
      return [];
    } catch (error) {
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
