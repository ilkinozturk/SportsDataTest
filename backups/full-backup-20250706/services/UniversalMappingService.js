const axios = require('axios');
const getChosenLeagueSeasonIdsFinal = require('./getChosenLeagueSeasonIdsFinal');
const FullyDynamicTeamService = require('./FullyDynamicTeamService');
const Logger = require('../utils/logger');

/**
 * Universal Mapping Service
 * Handles all ID mappings (team, league, season) with intelligent resolution
 * Solves complexity by providing a single source of truth
 */
class UniversalMappingService {
  constructor(apiKey, baseUrl) {
    this.logger = new Logger('UniversalMappingService');
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;

    // Initialize FullyDynamicTeamService
    this.dynamicTeamService = new FullyDynamicTeamService(apiKey, baseUrl);
    this.logger.success('FullyDynamicTeamService integrated successfully');

    // Caches with TTL
    this.seasonCache = new Map();
    this.teamCache = new Map();
    this.competitionMapCache = new Map();
    this.CACHE_TTL = 60 * 60 * 1000; // 1 hour

    // Known competition ID to current season mappings (manual overrides)
    this.knownMappings = {
      // China Chinese Super League
      13356: 14153, // 2024 -> 2025

      // Faroe Islands
      11236: 14079, // 1. Deild 2024 -> 2025
      11160: 14084, // Premier League 2024 -> 2025
      12278: 14084, // B36's competition ID -> Faroe Islands Premier League 2025

      // Finland
      13882: 14119, // Lahti's old competition ID -> Ykkösliiga 2025

      // USA - MLS
      13925: 13973, // LA Galaxy's old competition ID -> MLS 2025

      // Add more as discovered
    };

    // Known wrong team ID mappings
    // These IDs return completely different teams than expected
    this.wrongTeamIdMappings = {
      // Expected Columbus Crew but ID 10 returns LA Galaxy
      // Expected LA Galaxy but ID 124 returns Crusaders
      10: { correctId: 124, note: 'ID 10 is LA Galaxy, not Columbus Crew' },
      124: { correctId: 10, note: 'ID 124 is Crusaders, not LA Galaxy' },

      // These IDs return teams from non-chosen leagues
      86: { correctId: null, note: 'Returns Sparta Praha (CZ), not Seattle Sounders' },
      134: { correctId: null, note: 'Returns PBDKT T-Team (MY), not Flamengo' },
      142: { correctId: null, note: 'Returns West Brom (EN), not Palmeiras' },
      146: { correctId: null, note: 'Returns Southampton (EN), not Santos' },
      148: { correctId: null, note: 'Returns Bournemouth (EN), not Sao Paulo' },
      368: { correctId: null, note: 'Returns Roda JC (NL), not AIK' },
      372: { correctId: null, note: 'Returns Groningen (NL), not Djurgardens' },
      375: { correctId: null, note: 'Returns Twente (NL), not Hammarby' },
      438: { correctId: null, note: 'Returns Metz (FR), not Kawasaki Frontale' },
      441: { correctId: null, note: 'Returns Lille (FR), not Vissel Kobe' },
      2269: { correctId: null, note: 'Returns Universitario Pando (BO), not Urawa' },
      361: { correctId: null, note: 'Returns Bucaspor (TR), not Bodo/Glimt' },
      362: { correctId: null, note: 'Returns Orduspor (TR), not Brann' },
      363: { correctId: null, note: 'Returns Tavşanlı (TR), not Molde' },
      413: { correctId: null, note: 'Returns Lahti (different league), not KuPS' },
      414: { correctId: null, note: 'Returns PK-35 Vantaa (old data), not Haka' },
      1093: { correctId: null, note: 'Returns Skonto (LV), not Guangzhou FC' },
      9306: { correctId: null, note: 'Returns Fyllingsdalen II (NO), not Beijing' },
    };

    // Last refresh timestamps
    this.lastSeasonRefresh = 0;
    this.lastCompetitionMapRefresh = 0;
  }

  /**
   * Check if team ID is known to be wrong
   */
  isWrongTeamId(teamId) {
    return this.wrongTeamIdMappings.hasOwnProperty(teamId);
  }

  /**
   * Get warning for wrong team ID
   */
  getWrongTeamIdWarning(teamId) {
    const mapping = this.wrongTeamIdMappings[teamId];
    if (mapping) {
      return {
        hasWarning: true,
        message: mapping.note,
        correctId: mapping.correctId,
      };
    }
    return { hasWarning: false };
  }

  /**
   * Get current season ID for a team, with intelligent fallback
   */
  async getTeamSeasonId(teamId) {
    this.logger.info(`\n🌐 UniversalMappingService: Team ${teamId} için season ID arıyoruz`);

    // Önce cache'e bak
    const cacheKey = `team_season_${teamId}`;
    const cached = this.getCached(cacheKey);
    if (cached) {
      this.logger.info(`💾 Cache'den season ID alındı: ${cached}`);
      return cached;
    }

    // ÖNCE: Dinamik servisten kontrol et
    const dynamicTeamInfo = await this.dynamicTeamService.getTeamById(teamId);

    if (dynamicTeamInfo && dynamicTeamInfo.leagues.length > 0) {
      const primaryLeague = dynamicTeamInfo.leagues[0];
      this.logger.info(`✅ DİNAMİK SERVİSTEN BULUNDU:`);
      this.logger.info(`   Takım: ${dynamicTeamInfo.name}`);
      this.logger.info(`   Lig: ${primaryLeague.name}`);
      this.logger.info(`   Season ID: ${primaryLeague.id}`);
      this.setCache(cacheKey, primaryLeague.id);
      return primaryLeague.id;
    }

    this.logger.info(`⚠️ Takım dinamik serviste bulunamadı, eski yöntem kullanılıyor...`);

    // Check if this is a known wrong ID
    const warning = this.getWrongTeamIdWarning(teamId);
    if (warning.hasWarning) {
      this.logger.info(`⚠️ Known issue: ${warning.message}`);
      if (warning.correctId) {
        this.logger.info(`🔄 Using correct ID: ${warning.correctId}`);
        teamId = warning.correctId;
      }
    }

    try {
      this.logger.info(`🔍 Eski yöntemle season ID çözümleniyor...`);

      // Step 1: Get team data
      const teamData = await this.fetchTeamData(teamId);
      if (!teamData) {
        throw new Error(`Team ${teamId} not found`);
      }

      const competitionId = teamData.competition_id;
      const country = teamData.country;

      this.logger.info(
        `   Team: ${teamData.name}, Country: ${country}, Competition ID: ${competitionId}`
      );

      // Step 2: Check known mappings first
      if (this.knownMappings[competitionId]) {
        const mappedSeasonId = this.knownMappings[competitionId];
        this.logger.info(`   ✅ Known mappings'den bulundu: ${competitionId} -> ${mappedSeasonId}`);
        this.setCache(cacheKey, mappedSeasonId);
        return mappedSeasonId;
      }

      // Step 3: Get current season IDs
      const seasonIds = await this.getCurrentSeasonIds();

      // Step 4: Try exact match
      const exactMatch = seasonIds.find(s => s.season_id === competitionId);
      if (exactMatch) {
        this.logger.info(`   ✅ Exact match found: ${competitionId}`);
        this.setCache(cacheKey, competitionId);
        return competitionId;
      }

      // Step 5: Find by country and verify team exists
      const countrySeasons = seasonIds.filter(s => s.country === country);
      this.logger.info(`   Found ${countrySeasons.length} leagues in ${country}`);

      // Check each league to see if team exists there
      for (const season of countrySeasons) {
        const hasTeam = await this.verifyTeamInSeason(teamId, season.season_id);
        if (hasTeam) {
          this.logger.info(`   ✅ Team found in ${season.league_name} (ID: ${season.season_id})`);

          // Update known mappings for future use
          if (competitionId !== season.season_id) {
            this.knownMappings[competitionId] = season.season_id;
            this.logger.info(`   📝 Added to known mappings: ${competitionId} -> ${season.season_id}`);
          }

          this.setCache(cacheKey, season.season_id);
          return season.season_id;
        }
      }

      // Step 6: Fallback - use competition ID if it's recent
      this.logger.info(
        `   ⚠️ Team not found in current seasons, using competition ID: ${competitionId}`
      );
      this.setCache(cacheKey, competitionId);
      return competitionId;
    } catch (error) {
      this.logger.error(`❌ Error resolving team season: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get current season ID for a league by country and name
   */
  async getLeagueSeasonId(country, leagueName) {
    const cacheKey = `league_season_${country}_${leagueName}`;
    const cached = this.getCached(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const seasonIds = await this.getCurrentSeasonIds();

      // Try exact match
      const match = seasonIds.find(
        s =>
          s.country === country &&
          (s.league_name === leagueName ||
            s.league_name.includes(leagueName) ||
            leagueName.includes(s.league_name))
      );

      if (match) {
        this.logger.info(`✅ Found season for ${country} - ${leagueName}: ${match.season_id}`);
        this.setCache(cacheKey, match.season_id);
        return match.season_id;
      }

      this.logger.info(`⚠️ No season found for ${country} - ${leagueName}`);
      return null;
    } catch (error) {
      this.logger.error(`❌ Error getting league season: ${error.message}`);
      return null;
    }
  }

  /**
   * Map old competition ID to current season ID
   */
  async mapCompetitionToSeason(competitionId) {
    // Check known mappings first
    if (this.knownMappings[competitionId]) {
      return this.knownMappings[competitionId];
    }

    // Check if it's already a current season
    const seasonIds = await this.getCurrentSeasonIds();
    const isCurrentSeason = seasonIds.some(s => s.season_id === competitionId);

    return isCurrentSeason ? competitionId : null;
  }

  /**
   * Get team info with correct season context
   */
  async getTeamWithCorrectSeason(teamId) {
    try {
      // Get team data
      const teamData = await this.fetchTeamData(teamId);
      if (!teamData) {
        return null;
      }

      // Get correct season ID
      const correctSeasonId = await this.getTeamSeasonId(teamId);

      // Get team data from correct season
      if (correctSeasonId !== teamData.competition_id) {
        this.logger.info(`🔄 Fetching team data from correct season ${correctSeasonId}`);
        const seasonTeamData = await this.getTeamFromSeason(teamId, correctSeasonId);
        if (seasonTeamData) {
          return {
            ...teamData,
            correctSeasonId,
            seasonData: seasonTeamData,
            hasMismatch: true,
          };
        }
      }

      return {
        ...teamData,
        correctSeasonId,
        hasMismatch: false,
      };
    } catch (error) {
      this.logger.error(`❌ Error getting team with correct season: ${error.message}`);
      return null;
    }
  }

  /**
   * Build complete competition mapping
   */
  async buildCompetitionMap(forceRefresh = false) {
    if (
      !forceRefresh &&
      this.competitionMapCache.size > 0 &&
      Date.now() - this.lastCompetitionMapRefresh < this.CACHE_TTL
    ) {
      return Object.fromEntries(this.competitionMapCache);
    }

    this.logger.info('🔄 Building complete competition map...');
    const mapping = new Map();

    try {
      // Get all chosen leagues
      const response = await axios.get(`${this.baseUrl}/league-list`, {
        params: {
          key: this.apiKey,
          chosen_leagues_only: 'true',
        },
        timeout: 30000,
      });

      if (response.data.success && response.data.data) {
        const leagues = response.data.data;

        for (const league of leagues) {
          if (league.season && Array.isArray(league.season)) {
            // Sort seasons by year (newest first)
            const sortedSeasons = [...league.season].sort((a, b) => {
              const yearA = parseInt(a.year?.toString().split('/')[0]) || 0;
              const yearB = parseInt(b.year?.toString().split('/')[0]) || 0;
              return yearB - yearA;
            });

            if (sortedSeasons.length > 0) {
              const currentSeason = sortedSeasons[0];

              // Map all old seasons to current
              for (const season of sortedSeasons) {
                if (season.id !== currentSeason.id) {
                  mapping.set(season.id, currentSeason.id);
                }
              }
            }
          }
        }
      }

      // Add known mappings
      for (const [oldId, newId] of Object.entries(this.knownMappings)) {
        mapping.set(parseInt(oldId), newId);
      }

      this.competitionMapCache = mapping;
      this.lastCompetitionMapRefresh = Date.now();

      this.logger.info(`✅ Built mapping for ${mapping.size} competition IDs`);
      return Object.fromEntries(mapping);
    } catch (error) {
      this.logger.error(`❌ Error building competition map: ${error.message}`);
      return {};
    }
  }

  // Helper methods

  async getCurrentSeasonIds() {
    if (this.seasonCache.size > 0 && Date.now() - this.lastSeasonRefresh < this.CACHE_TTL) {
      return Array.from(this.seasonCache.values());
    }

    const seasonIds = await getChosenLeagueSeasonIdsFinal(this.apiKey, this.baseUrl);

    // Cache the results
    this.seasonCache.clear();
    seasonIds.forEach(season => {
      this.seasonCache.set(`${season.country}_${season.league_name}`, season);
    });
    this.lastSeasonRefresh = Date.now();

    return seasonIds;
  }

  async fetchTeamData(teamId) {
    const cacheKey = `team_${teamId}`;
    const cached = this.getCached(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const response = await axios.get(`${this.baseUrl}/team`, {
        params: { key: this.apiKey, team_id: teamId },
        timeout: 10000,
      });

      if (response.data.success && response.data.data && response.data.data.length > 0) {
        const teamData = response.data.data[0];
        this.setCache(cacheKey, teamData);
        return teamData;
      }

      return null;
    } catch (error) {
      this.logger.error(`Error fetching team ${teamId}: ${error.message}`);
      return null;
    }
  }

  async verifyTeamInSeason(teamId, seasonId) {
    try {
      const response = await axios.get(`${this.baseUrl}/league-teams`, {
        params: {
          key: this.apiKey,
          season_id: seasonId,
        },
        timeout: 10000,
      });

      if (response.data.success && response.data.data) {
        return response.data.data.some(team => team.id == teamId);
      }

      return false;
    } catch (error) {
      this.logger.error(`Error verifying team in season: ${error.message}`);
      return false;
    }
  }

  async getTeamFromSeason(teamId, seasonId) {
    try {
      const response = await axios.get(`${this.baseUrl}/league-teams`, {
        params: {
          key: this.apiKey,
          season_id: seasonId,
          include: 'stats',
        },
        timeout: 10000,
      });

      if (response.data.success && response.data.data) {
        return response.data.data.find(team => team.id == teamId);
      }

      return null;
    } catch (error) {
      this.logger.error(`Error getting team from season: ${error.message}`);
      return null;
    }
  }

  getCached(key) {
    const item = this.teamCache.get(key);
    if (item && Date.now() - item.timestamp < this.CACHE_TTL) {
      return item.data;
    }
    return null;
  }

  setCache(key, data) {
    this.teamCache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  clearCache() {
    this.seasonCache.clear();
    this.teamCache.clear();
    this.competitionMapCache.clear();
    this.lastSeasonRefresh = 0;
    this.lastCompetitionMapRefresh = 0;
    this.logger.info('🧹 All caches cleared');
  }

  /**
   * Get debug info for troubleshooting
   */
  getDebugInfo() {
    return {
      knownMappings: this.knownMappings,
      cacheStats: {
        seasonCache: this.seasonCache.size,
        teamCache: this.teamCache.size,
        competitionMapCache: this.competitionMapCache.size,
      },
      lastRefresh: {
        seasons: new Date(this.lastSeasonRefresh).toISOString(),
        competitionMap: new Date(this.lastCompetitionMapRefresh).toISOString(),
      },
    };
  }
}

module.exports = UniversalMappingService;
