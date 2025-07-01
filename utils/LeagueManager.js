const axios = require('axios');
const Logger = require('./logger');

class LeagueManager {
  constructor(apiKey, baseUrl = 'https://api.football-data-api.com') {
    this.logger = new Logger('LeagueManager');
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
    this.leagueCache = new Map();
  }

  /**
   * Determine the current season based on league type and current date
   */
  getCurrentSeason(league, availableSeasons) {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // 0-indexed

    // Sort seasons by year descending
    const sortedSeasons = [...availableSeasons].sort((a, b) => {
      // Handle special cases like "20252026"
      const yearA = parseInt(a.year.toString().substring(0, 4));
      const yearB = parseInt(b.year.toString().substring(0, 4));
      return yearB - yearA;
    });

    // Special handling for different league types
    const leagueName = league.name.toLowerCase();
    const country = league.country.toLowerCase();

    // Calendar year leagues (mostly Asia, Scandinavia, Eastern Europe, Americas)
    const calendarYearCountries = [
      'china',
      'japan',
      'south korea',
      'australia',
      'sweden',
      'norway',
      'finland',
      'iceland',
      'estonia',
      'latvia',
      'kazakhstan',
      'georgia',
      'faroe islands',
      'moldova',
      'usa',
      'brazil',
    ];

    // Check if this is a calendar year league
    const isCalendarYear = calendarYearCountries.some(c => country.includes(c));

    if (isCalendarYear) {
      // For calendar year leagues, use current year
      const currentYearSeason = sortedSeasons.find(s => {
        const seasonYear = parseInt(s.year.toString().substring(0, 4));
        return seasonYear === currentYear;
      });

      if (currentYearSeason) {
        return currentYearSeason;
      }

      // If current year not found and we're in early months, might use previous year
      if (currentMonth <= 3) {
        const prevYearSeason = sortedSeasons.find(s => {
          const seasonYear = parseInt(s.year.toString().substring(0, 4));
          return seasonYear === currentYear - 1;
        });
        if (prevYearSeason) {
          return prevYearSeason;
        }
      }
    } else {
      // For split-year leagues (Europe, Americas)
      // These typically run from August to May
      let targetYear;

      if (currentMonth >= 8) {
        // August-December: current year season (e.g., 2024/2025 in Dec 2024)
        targetYear = currentYear;
      } else {
        // January-July: previous year season (e.g., 2023/2024 in Jan 2024)
        targetYear = currentYear - 1;
      }

      // First try exact year match
      const exactMatch = sortedSeasons.find(s => {
        const seasonYear = parseInt(s.year.toString().substring(0, 4));
        return seasonYear === targetYear;
      });

      if (exactMatch) {
        return exactMatch;
      }

      // Handle special formats like "20242025"
      const splitYearMatch = sortedSeasons.find(s => {
        const yearStr = s.year.toString();
        if (yearStr.length === 8) {
          const startYear = parseInt(yearStr.substring(0, 4));
          return startYear === targetYear;
        }
        return false;
      });

      if (splitYearMatch) {
        return splitYearMatch;
      }
    }

    // Fallback: return the most recent season
    this.logger.warn(`Could not determine current season for ${league.name}, using most recent`);
    return sortedSeasons[0];
  }

  /**
   * Get chosen leagues from FootyStats (premium/featured leagues)
   */
  async getChosenLeagues() {
    const cacheKey = 'chosen_leagues';
    const cached = this.leagueCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < 60 * 60 * 1000) {
      // 1 hour cache
      return cached.data;
    }

    try {
      this.logger.info('Fetching chosen leagues from FootyStats API...');
      const response = await axios.get(`${this.baseUrl}/league-list`, {
        params: {
          key: this.apiKey,
          chosen_leagues_only: 'true',
        },
        timeout: 10000,
      });

      if (response.data.success && response.data.data) {
        this.leagueCache.set(cacheKey, {
          data: response.data.data,
          timestamp: Date.now(),
        });
        this.logger.success(`Fetched ${response.data.data.length} chosen leagues from API`);
        return response.data.data;
      } else {
        throw new Error('Invalid API response');
      }
    } catch (error) {
      this.logger.error(`Failed to fetch leagues: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Get league info with intelligent season selection
   */
  getLeagueInfo(league) {
    const seasons = league.season || [];

    if (seasons.length === 0) {
      this.logger.error(`No seasons available for ${league.name}`);
      return null;
    }

    // Use intelligent season selection
    const currentSeason = this.getCurrentSeason(league, seasons);

    if (currentSeason) {
      const yearDisplay =
        currentSeason.year.toString().length === 8
          ? `${currentSeason.year.toString().substring(0, 4)}/${currentSeason.year.toString().substring(4)}`
          : currentSeason.year;

      this.logger.info(`${league.country} - ${league.name} -> Current season: ${yearDisplay} (ID: ${currentSeason.id})`);

      return {
        id: currentSeason.id,
        name: league.name,
        year: currentSeason.year,
        yearDisplay: yearDisplay,
        country: league.country,
        fullName: `${league.country} - ${league.name}`,
      };
    }

    return null;
  }

  /**
   * Get all chosen league IDs with 2025 season priority
   */
  async getUserLeagueIds() {
    const cacheKey = 'chosen_league_ids';
    const cached = this.leagueCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < 30 * 60 * 1000) {
      // 30 minutes cache
      this.logger.info(`Using cached league IDs (${cached.leagues.length} leagues)`);
      return cached.leagues;
    }

    try {
      const chosenLeagues = await this.getChosenLeagues();
      const leagueInfos = [];

      this.logger.info(`Processing ${chosenLeagues.length} chosen leagues...`);

      for (const league of chosenLeagues) {
        const leagueInfo = this.getLeagueInfo(league);
        if (leagueInfo) {
          leagueInfos.push(leagueInfo);
          // Already logged in getLeagueInfo
        } else {
          this.logger.warn(`No valid season found for: ${league.name}`);
        }
      }

      // Cache the results
      this.leagueCache.set(cacheKey, {
        leagues: leagueInfos,
        timestamp: Date.now(),
      });

      this.logger.success(`Total leagues available: ${leagueInfos.length}`);
      return leagueInfos;
    } catch (error) {
      this.logger.error(`Failed to get league IDs: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Get simple array of league IDs
   */
  async getUserLeagueIdArray() {
    const leagues = await this.getUserLeagueIds();
    return leagues.map(league => league.id);
  }

  /**
   * Get leagues formatted for server use
   */
  async getUserLeaguesForServer() {
    const leagues = await this.getUserLeagueIds();
    return leagues.map(league => ({
      id: league.id,
      name: league.name,
      country: league.country,
      year: league.year,
      fullName: league.fullName,
    }));
  }

  /**
   * Get stats
   */
  getStats() {
    return {
      cacheSize: this.leagueCache.size,
      apiSource: 'chosen_leagues_only',
    };
  }

  /**
   * Cleanup resources
   */
  destroy() {
    this.leagueCache.clear();
  }
}

module.exports = LeagueManager;
