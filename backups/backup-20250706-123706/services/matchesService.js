const axios = require('axios');
const moment = require('moment-timezone');

class MatchesService {
  constructor(apiKey, baseUrl, leagueManager) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
    this.leagueManager = leagueManager;
    this.cache = new Map();
    this.CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Get matches for a specific date using todays-matches endpoint
   * @param {string} date - Date in YYYY-MM-DD format (optional)
   * @param {string} timezone - Timezone (optional, defaults to UTC)
   * @param {number} page - Page number for pagination (optional)
   */
  async getMatchesByDate(date = null, timezone = 'Etc/UTC', page = 1) {
    // If no date provided, use today in the specified timezone
    const targetDate = date || moment().tz(timezone).format('YYYY-MM-DD');

    const cacheKey = `matches-${targetDate}-${timezone}-${page}`;
    const cached = this.cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      console.log(`💾 Cache hit: matches for ${targetDate}`);
      return cached.data;
    }

    try {
      console.log(`🌐 Fetching matches for ${targetDate} (${timezone})`);

      const params = {
        key: this.apiKey,
        timezone: timezone,
        date: targetDate,
      };

      if (page > 1) {
        params.page = page;
      }

      const response = await axios.get(`${this.baseUrl}/todays-matches`, {
        params,
        timeout: 10000,
      });

      if (response.data.success && response.data.data) {
        // Get our chosen league IDs for filtering
        const chosenLeagues = await this.leagueManager.getUserLeagueIds();
        const leagueIdMap = new Map(chosenLeagues.map(l => [l.id, l]));

        // Process matches to add league and team information
        const processedMatches = await this.processMatches(response.data.data, leagueIdMap);

        const result = {
          success: true,
          date: targetDate,
          timezone: timezone,
          pager: response.data.pager,
          totalMatches: response.data.pager.total_results,
          matches: processedMatches,
        };

        // Cache the result
        this.cache.set(cacheKey, {
          data: result,
          timestamp: Date.now(),
        });

        console.log(
          `✅ Found ${response.data.data.length} total matches, ${processedMatches.length} in tracked leagues for ${targetDate}`
        );

        // If there are more pages, fetch them recursively
        if (response.data.pager.current_page < response.data.pager.max_page) {
          console.log(`📄 Fetching page ${page + 1} of ${response.data.pager.max_page}`);
          const nextPageResult = await this.getMatchesByDate(date, timezone, page + 1);
          result.matches.push(...nextPageResult.matches);
          result.totalMatches = result.matches.length;
        }

        return result;
      } else {
        throw new Error('Invalid API response');
      }
    } catch (error) {
      console.error(`❌ Failed to fetch matches: ${error.message}`);
      throw error;
    }
  }

  /**
   * Process raw match data and enrich with team/league information
   */
  async processMatches(matches, leagueIdMap) {
    const teamCache = new Map();
    const processedMatches = [];

    // Process matches in parallel for better performance
    const matchPromises = matches.map(async match => {
      try {
        // Get league info from our map
        const leagueInfo =
          leagueIdMap.get(match.competition_id) || leagueIdMap.get(match.league_id);

        if (!leagueInfo) {
          // Skip matches from leagues we don't track
          return null;
        }

        // Get team names from match data if available
        const homeTeam = {
          id: match.homeID,
          name: match.home_name || match.homeName || `Team ${match.homeID}`,
          image: match.home_image || match.homeImage || null,
        };

        const awayTeam = {
          id: match.awayID,
          name: match.away_name || match.awayName || `Team ${match.awayID}`,
          image: match.away_image || match.awayImage || null,
        };

        const processedMatch = {
          id: match.id,
          date: match.date_unix ? new Date(match.date_unix * 1000).toISOString() : null,
          timestamp: match.date_unix,
          status: match.status,
          gameWeek: match.game_week,

          // League info
          league: {
            id: leagueInfo.id,
            name: leagueInfo.name,
            country: leagueInfo.country,
            fullName: leagueInfo.fullName,
            year: leagueInfo.yearDisplay || leagueInfo.year,
          },

          // Home team
          homeTeam: {
            id: match.homeID,
            name: homeTeam?.name || `Team ${match.homeID}`,
            logo: homeTeam?.image || null,
            goals: match.homeGoalCount || 0,
            corners: match.team_a_corners >= 0 ? match.team_a_corners : null,
            yellowCards: match.team_a_yellow_cards || 0,
            redCards: match.team_a_red_cards || 0,
            possession: match.team_a_possession >= 0 ? match.team_a_possession : null,
            shots: match.team_a_shots >= 0 ? match.team_a_shots : null,
            shotsOnTarget: match.team_a_shotsOnTarget >= 0 ? match.team_a_shotsOnTarget : null,
          },

          // Away team
          awayTeam: {
            id: match.awayID,
            name: awayTeam?.name || `Team ${match.awayID}`,
            logo: awayTeam?.image || null,
            goals: match.awayGoalCount || 0,
            corners: match.team_b_corners >= 0 ? match.team_b_corners : null,
            yellowCards: match.team_b_yellow_cards || 0,
            redCards: match.team_b_red_cards || 0,
            possession: match.team_b_possession >= 0 ? match.team_b_possession : null,
            shots: match.team_b_shots >= 0 ? match.team_b_shots : null,
            shotsOnTarget: match.team_b_shotsOnTarget >= 0 ? match.team_b_shotsOnTarget : null,
          },

          // Match stats
          stats: {
            totalGoals: match.totalGoalCount || 0,
            totalCorners: match.totalCornerCount || 0,
            totalCards: (match.team_a_cards_num || 0) + (match.team_b_cards_num || 0),
            homeGoals: match.homeGoals ? JSON.parse(match.homeGoals) : [],
            awayGoals: match.awayGoals ? JSON.parse(match.awayGoals) : [],
          },

          // Odds
          odds: {
            home: match.odds_ft_1 || null,
            draw: match.odds_ft_x || null,
            away: match.odds_ft_2 || null,
          },

          // Stadium info
          stadium: {
            name: match.stadium_name || null,
            location: match.stadium_location || null,
          },
        };

        return processedMatch;
      } catch (error) {
        console.warn(`⚠️ Failed to process match ${match.id}: ${error.message}`);
        return null;
      }
    });

    const results = await Promise.all(matchPromises);
    return results.filter(match => match !== null);
  }

  /**
   * Get team information (with caching)
   */
  async getTeamInfo(teamId, cache) {
    if (cache.has(teamId)) {
      return cache.get(teamId);
    }

    try {
      const response = await axios.get(`${this.baseUrl}/team`, {
        params: {
          key: this.apiKey,
          team_id: teamId,
        },
        timeout: 5000,
      });

      if (response.data.success && response.data.data) {
        const teamInfo = {
          id: teamId,
          name: response.data.data.name,
          fullName: response.data.data.full_name,
          image: response.data.data.image,
          country: response.data.data.country,
        };
        cache.set(teamId, teamInfo);
        return teamInfo;
      }
    } catch (error) {
      console.warn(`⚠️ Failed to fetch team ${teamId} info: ${error.message}`);
    }

    return null;
  }

  /**
   * Get today's matches for all chosen leagues
   */
  async getTodaysMatches(timezone = 'Etc/UTC') {
    return this.getMatchesByDate(null, timezone);
  }

  /**
   * Get matches for a date range
   */
  async getMatchesForDateRange(startDate, endDate, timezone = 'Etc/UTC') {
    const matches = [];
    const start = moment(startDate);
    const end = moment(endDate);

    while (start.isSameOrBefore(end)) {
      const dateStr = start.format('YYYY-MM-DD');
      console.log(`📅 Fetching matches for ${dateStr}`);

      try {
        const result = await this.getMatchesByDate(dateStr, timezone);
        matches.push(...result.matches);
      } catch (error) {
        console.error(`❌ Failed to fetch matches for ${dateStr}: ${error.message}`);
      }

      start.add(1, 'day');
    }

    return {
      success: true,
      startDate,
      endDate,
      timezone,
      totalMatches: matches.length,
      matches: matches.sort((a, b) => a.timestamp - b.timestamp),
    };
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
    console.log('🧹 Matches cache cleared');
  }
}

module.exports = MatchesService;
