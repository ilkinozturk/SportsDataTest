const axios = require('axios');
const getChosenLeagueSeasonIds = require('./getChosenLeagueSeasonIdsFinal');
const { getTeamPositionFromTable } = require('./getLeagueTable');
const { getTeamPositionUniversal } = require('./getTeamPositionUniversal');
const UniversalMappingService = require('./UniversalMappingService');
const SmartLeagueResolver = require('./SmartLeagueResolver');
const TeamStatisticsValidator = require('./TeamStatisticsValidator');
const TeamDataEnhancer = require('./TeamDataEnhancer');
const IntelligentTeamResolver = require('./IntelligentTeamResolver');
const CompetitionTypeResolver = require('./CompetitionTypeResolver');
const MatchesFetcher = require('./MatchesFetcher');
const FullyDynamicTeamService = require('./FullyDynamicTeamService');
const SchemaMapper = require('./SchemaMapper');
const Logger = require('../utils/logger');
const { trackApiError, trackError } = require('../middleware/errorTracking');

class TeamDataService {
  constructor(apiKey, baseUrl, leagueManager) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
    this.leagueManager = leagueManager;
    this.teamCache = new Map();
    this.CACHE_TTL = 15 * 60 * 1000; // 15 minutes
    this.seasonIdsCache = null;
    this.seasonIdsCacheTime = 0;
    this.leagueTeamsCache = new Map(); // Cache for league teams
    this.leagueTeamsCacheTime = new Map();

    // Initialize logger
    this.logger = new Logger('TeamDataService');

    // Initialize Fully Dynamic Team Service FIRST (others will use it)
    this.fullyDynamicService = new FullyDynamicTeamService(apiKey, baseUrl);
    this.logger.success('FullyDynamicTeamService initialized');

    // Initialize Universal Mapping Service
    this.mappingService = new UniversalMappingService(apiKey, baseUrl);

    // Initialize Smart League Resolver
    this.smartLeagueResolver = new SmartLeagueResolver(apiKey, baseUrl);

    // Initialize Statistics Validator
    this.statsValidator = new TeamStatisticsValidator(apiKey, baseUrl);

    // Initialize Data Enhancer
    this.dataEnhancer = new TeamDataEnhancer();

    // Initialize Intelligent Team Resolver
    this.teamResolver = new IntelligentTeamResolver(apiKey, baseUrl);

    // Initialize Competition Type Resolver
    this.competitionTypeResolver = new CompetitionTypeResolver(apiKey, baseUrl);

    // Initialize Matches Fetcher
    this.matchesFetcher = new MatchesFetcher(apiKey, baseUrl);

    // Initialize Schema Mapper
    this.schemaMapper = new SchemaMapper();


    // Team ID mappings - NOW DYNAMIC!
    this.teamIdMappings = {}; // Will be populated dynamically
  }

  /**
   * Get comprehensive team data with smart ID resolution
   */
  async getTeamData(teamId) {
    const startTime = Date.now();
    this.logger.info(`\n🏟️ ====== TAKIMM VERİSİ ALMA BAŞLADI: ID ${teamId} ======`);

    // ADIM 1: Tam dinamik servisten takımı kontrol et
    this.logger.info(`\n📊 ADIM 1: Dinamik takım kontrolü`);
    const dynamicTeamInfo = await this.fullyDynamicService.getTeamById(teamId);

    if (dynamicTeamInfo) {
      this.logger.info(`✅ Takım dinamik serviste bulundu:`);
      this.logger.info(`   İsim: ${dynamicTeamInfo.name}`);
      this.logger.info(`   Ülke: ${dynamicTeamInfo.country}`);
      this.logger.info(`   Lig sayısı: ${dynamicTeamInfo.leagues.length}`);
      dynamicTeamInfo.leagues.forEach(league => {
        this.logger.info(`   - ${league.name} (ID: ${league.id})`);
      });
    } else {
      this.logger.info(`⚠️ Takım ID ${teamId} dinamik serviste bulunamadı`);
    }

    // Check if team ID needs correction
    const originalTeamId = teamId;
    teamId = this.statsValidator.getCorrectTeamId(teamId);

    if (originalTeamId !== teamId) {
      this.logger.info(`\n🔄 Takım ID düzeltildi: ${originalTeamId} → ${teamId}`);
    }

    // Check cache first
    const cacheKey = `team_${teamId}`;
    const cached = this.teamCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      this.logger.info(`💾 Team cache hit for ID: ${teamId}`);
      this.logger.info(`🏁 ====== TAKIM VERİSİ TAMAMLANDI (${Date.now() - startTime}ms) ======\n`);
      return cached.data;
    }

    try {
      // ADIM 2: Dinamik bilgilerle season ID bul
      this.logger.info(`\n📊 ADIM 2: Season ID belirleme`);
      let correctSeasonId = null;

      if (dynamicTeamInfo && dynamicTeamInfo.leagues.length > 0) {
        // Dinamik servisten gelen ilk ligi kullan
        correctSeasonId = dynamicTeamInfo.leagues[0].id;
        this.logger.info(
          `✅ Dinamik servisten season ID: ${correctSeasonId} (${dynamicTeamInfo.leagues[0].name})`
        );
      } else {
        // Fallback: eski mapping servisi
        correctSeasonId = await this.mappingService.getTeamSeasonId(teamId);
        this.logger.info(`⚠️ Eski mapping servisinden season ID: ${correctSeasonId}`);
      }

      // ADIM 3: Takım istatistiklerini al - OPTIMIZE EDILMIŞ
      this.logger.info(`\n📊 ADIM 3: Takım istatistikleri alınıyor (Optimize edilmiş)`);
      let teamStats = null;

      // ÖNCE: league-teams endpoint'inden dene (DAHA VERİMLİ)
      if (correctSeasonId) {
        this.logger.info(`🚀 Önce league-teams endpoint'i deneniyor (Season ID: ${correctSeasonId})`);

        // Check cache first
        const cacheKey = `league_teams_${correctSeasonId}`;
        const cached = this.leagueTeamsCache.get(cacheKey);
        const cacheTime = this.leagueTeamsCacheTime.get(cacheKey);

        let teams;
        if (cached && cacheTime && Date.now() - cacheTime < this.CACHE_TTL) {
          this.logger.info(`💾 League-teams cache'den alınıyor`);
          teams = cached;
        } else {
          try {
            const response = await axios.get(`${this.baseUrl}/league-teams`, {
              params: {
                key: this.apiKey,
                season_id: correctSeasonId,
                include: 'stats',
              },
              timeout: 10000,
            });

            if (response.data.success && response.data.data) {
              teams = response.data.data;
              // Cache the data
              this.leagueTeamsCache.set(cacheKey, teams);
              this.leagueTeamsCacheTime.set(cacheKey, Date.now());
              this.logger.info(`✅ ${teams.length} takım cache'lendi`);
            }
          } catch (error) {
            this.logger.info(`⚠️ League-teams hatası: ${error.message}`);
          }
        }

        if (teams) {
          const teamData = teams.find(t => t.id?.toString() === teamId.toString());
          if (teamData) {
            this.logger.info(
              `✅ Takım league-teams'den bulundu (PPG: ${teamData.stats?.seasonPPG_overall || 'N/A'})`
            );

            // seasonHighestScored alanlarını kontrol et
            if (teamData.stats) {
              this.logger.info('🏆 Highest Scored alanları kontrol ediliyor:');
              const highestFields = Object.keys(teamData.stats).filter(
                k =>
                  k.toLowerCase().includes('highest') ||
                  (k.toLowerCase().includes('max') && k.toLowerCase().includes('scored'))
              );
              highestFields.forEach(field => {
                this.logger.info(`  - ${field}: ${teamData.stats[field]}`);
              });

              // Özel olarak beklenen alanları kontrol et
              this.logger.info('📊 Beklenen alanlar:');
              this.logger.info(
                `  - seasonHighestScored_home: ${teamData.stats.seasonHighestScored_home}`
              );
              this.logger.info(
                `  - seasonHighestScored_away: ${teamData.stats.seasonHighestScored_away}`
              );
              this.logger.info(
                `  - seasonHighestScored_overall: ${teamData.stats.seasonHighestScored_overall}`
              );
            }

            teamStats = teamData;
            // Add competition_id for compatibility
            teamStats.competition_id = correctSeasonId;
            // Mark data source
            teamStats._dataSource = 'league-teams';
          }
        }
      }

      // SONRA: Eğer bulunamazsa /team endpoint'ini kullan
      if (!teamStats) {
        this.logger.info(`⚠️ League-teams'de bulunamadı, /team endpoint'i deneniyor`);
        if (correctSeasonId) {
          this.logger.info(`🔍 Season ID ${correctSeasonId} ile istatistikler alınıyor...`);
          teamStats = await this.fetchTeamStats(teamId, correctSeasonId);
        }

        // If that fails, try without season ID
        if (!teamStats) {
          this.logger.info(`🔍 Season ID olmadan deneniyor...`);
          teamStats = await this.fetchTeamStats(teamId);
        }
      }

      if (!teamStats) {
        throw new Error(`Team ${teamId} FootyStats API'de bulunamadı`);
      }

      // 1.5. Use Intelligent Team Resolver to verify and possibly correct the team
      const resolution = await this.teamResolver.resolveTeam(originalTeamId, teamStats);

      if (resolution.resolvedId !== teamId && resolution.confidence > 0.7) {
        this.logger.info(`🔄 Intelligent resolution: Team ${originalTeamId} → ${resolution.resolvedId}`);
        this.logger.info(
          `   Method: ${resolution.method}, Confidence: ${(resolution.confidence * 100).toFixed(0)}%`
        );

        // Yeni ID ile tekrar veri çek
        if (resolution.teamData) {
          // Zaten doğru veri varsa kullan
          Object.assign(teamStats, resolution.teamData);
        } else {
          // Yoksa yeni ID ile çek
          const correctedStats = await this.fetchTeamStats(resolution.resolvedId, correctSeasonId);
          if (correctedStats) {
            Object.assign(teamStats, correctedStats);
            teamId = resolution.resolvedId;
          }
        }
      }

      // 2. Extract team info and league info
      const teamInfo = this.extractTeamInfo(teamStats);

      // Use Smart League Resolver for intelligent resolution
      const leagueInfo = await this.smartLeagueResolver.resolveLeagueInfo(
        teamStats,
        correctSeasonId
      );

      // CRITICAL FIX: Ensure league info uses the correct season ID
      if (leagueInfo && correctSeasonId && leagueInfo.id !== correctSeasonId) {
        this.logger.info(
          `⚠️ League info has wrong season ID: ${leagueInfo.id}, correcting to ${correctSeasonId}`
        );
        leagueInfo.id = correctSeasonId;
      }

      // 3. Get league position and total teams
      const leaguePosition = await this.getLeaguePosition(teamId, teamStats, leagueInfo);

      // 4. Get recent matches (moved up to use in processStatistics)
      const matches = await this.getTeamMatches(teamId, leagueInfo);
      this.logger.info(`📅 Matches fetched for team ${teamId}:`, matches ? matches.length : 'null'); // DEBUG

      // 5. Process statistics using refactored modular system
      // 🚀 NEW SENIOR DEVELOPER LEVEL İSTATİSTİK İŞLEME - MAPPING HATASI KABUL EDİLMEZ
      const rawStatistics = this.processStatisticsLegacy(teamStats.stats || teamStats, (teamStats.stats && teamStats.stats.additional_info) || teamStats.additional_info || {}, matches, teamId);

      // 6. Validate and correct statistics
      const validation = await this.statsValidator.validateTeamStats(
        originalTeamId, // Use original ID for validation
        rawStatistics,
        leagueInfo,
        teamInfo
      );

      const statistics = validation.correctedStats || rawStatistics;

      // 6.1 PPG güncelleme artık gerekli değil - league-teams'den doğru geliyor
      // Sadece /team endpoint'inden gelince güncelle
      if (teamStats._dataSource !== 'league-teams' && leagueInfo && leagueInfo.id) {
        const accuratePPG = await this.getAccuratePPG(teamId, leagueInfo.id);
        if (accuratePPG !== null && accuratePPG !== statistics.pointsPerGame) {
          this.logger.info(
            `📊 /team endpoint PPG düzeltiliyor: ${statistics.pointsPerGame} → ${accuratePPG}`
          );
          statistics.pointsPerGame = accuratePPG;
        }
      }

      // Log validation issues if any
      if (!validation.isValid) {
        this.logger.info(`⚠️ Statistics validation issues for team ${teamId}:`);
        validation.issues.forEach(issue => this.logger.info(`   - ${issue}`));
      }

      // 7. Enhance data with quality checks
      const enhancements = this.dataEnhancer.enhanceTeamData(
        originalTeamId,
        teamInfo,
        leagueInfo,
        statistics
      );

      // 8. Build response
      const responseData = {
        teamInfo,
        league: leagueInfo,
        statistics,
        leaguePosition,
        allMatches: matches,
        recentMatches: matches.slice(0, 15),
        nextMatch: this.getNextMatch(matches),
        seasonStats: {
          totalMatches: statistics.totalMatches || 0,
          completedMatches: statistics.completedMatches || 0,
          upcomingMatches: matches.filter(m => m.status === 'upcoming').length,
        },
        competitionInfo: {
          type: teamStats._competitionType || 'unknown',
          confidence: teamStats._competitionConfidence || 0,
          dataSource: teamStats._dataSource || 'team',
          isLeagueData: teamStats._competitionType === 'league',
          isCupData: teamStats._competitionType === 'cup',
          competitionName:
            teamStats.competition || teamStats.competition_name || 'Unknown Competition',
          allCompetitionData: teamStats._allCompetitionData || null,
          message: this.getCompetitionMessage(teamStats),
          warning:
            teamStats._competitionType === 'cup'
              ? 'Kupa verileri gösteriliyor. Lig performansı farklı olabilir.'
              : null,
        },
        validation: {
          isValid: validation.isValid,
          confidence: validation.confidence,
          issues: validation.issues,
          originalTeamId: originalTeamId !== teamId ? originalTeamId : undefined,
        },
        dataQuality: {
          score: enhancements.metadata.dataQualityScore,
          warnings: enhancements.warnings,
          corrections: enhancements.corrections,
          recommendation: this.dataEnhancer.getDataRecommendation(
            enhancements.metadata.dataQualityScore
          ),
          metadata: enhancements.metadata,
        },
        teamResolution: {
          originalId: originalTeamId,
          resolvedId: teamId,
          wasResolved: resolution.resolvedId !== originalTeamId,
          confidence: resolution.confidence,
          method: resolution.method,
          report: this.teamResolver.generateResolutionReport(resolution),
        },
      };

      // Cache the result
      this.teamCache.set(cacheKey, {
        data: responseData,
        timestamp: Date.now(),
      });

      this.logger.info(`⚡ Team data fetched in ${Date.now() - startTime}ms`);
      return responseData;
    } catch (error) {
      this.logger.error(`❌ Failed to fetch team data: ${error.message}`);
      console.error('FULL ERROR STACK:', error.stack);
      throw error;
    }
  }

  /**
   * Fetch both cup and league data for a team
   */
  async fetchAllCompetitionData(teamId) {
    const mappedId = this.teamIdMappings[teamId] || teamId;
    const competitionData = {
      cup: null,
      league: null,
      primary: null,
      hasCupData: false,
      hasLeagueData: false,
    };

    try {
      // First, get initial team data to understand competitions
      const params = {
        key: this.apiKey,
        team_id: mappedId,
        include: 'stats',
      };

      const response = await axios.get(`${this.baseUrl}/team`, {
        params,
        timeout: 10000,
      });

      if (response.data.success && response.data.data && response.data.data.length > 0) {
        const teamData = response.data.data[0];

        // Check competition type
        if (teamData.competition_id || teamData.competition) {
          const compType = await this.competitionTypeResolver.determineCompetitionType(
            teamData.competition_id,
            teamData.competition || teamData.competition_name
          );

          if (compType.isCup) {
            this.logger.info(`🏆 Found cup data: ${compType.competitionName}`);
            competitionData.cup = teamData;
            competitionData.hasCupData = true;

            // Now try to find league data
            const leagueData = await this.competitionTypeResolver.findTeamMainLeague(mappedId);
            if (leagueData) {
              this.logger.info(`⚽ Found league data: ${leagueData.leagueName}`);
              const leagueStats = await this.fetchLeagueData(mappedId, leagueData.seasonId);
              if (leagueStats) {
                competitionData.league = leagueStats;
                competitionData.hasLeagueData = true;
              }
            }
          } else {
            // It's league data
            this.logger.info(`⚽ Found league data: ${compType.competitionName}`);
            competitionData.league = teamData;
            competitionData.hasLeagueData = true;

            // Check if there's cup data available
            // This would require additional API calls to check other competitions
          }
        }
      }

      // Determine primary data based on user preference or data availability
      if (competitionData.hasCupData && competitionData.hasLeagueData) {
        // If both are available, let user choose or use cup as requested
        competitionData.primary = competitionData.cup;
        this.logger.info(`📊 Both cup and league data available - showing cup data as requested`);
      } else if (competitionData.hasLeagueData) {
        competitionData.primary = competitionData.league;
      } else if (competitionData.hasCupData) {
        competitionData.primary = competitionData.cup;
      }

      return competitionData;
    } catch (error) {
      this.logger.error(`❌ Error fetching competition data: ${error.message}`);
      return competitionData;
    }
  }

  /**
   * Fetch league data specifically
   */
  async fetchLeagueData(teamId, seasonId) {
    try {
      const leagueResponse = await axios.get(`${this.baseUrl}/league-teams`, {
        params: {
          key: this.apiKey,
          season_id: seasonId,
          include: 'stats',
        },
        timeout: 10000,
      });

      if (leagueResponse.data.success && leagueResponse.data.data) {
        const teamInLeague = leagueResponse.data.data.find(t => t.id == teamId);
        if (teamInLeague) {
          teamInLeague._competitionType = 'league';
          teamInLeague._dataSource = 'league-teams';
          return teamInLeague;
        }
      }
      return null;
    } catch (error) {
      this.logger.error(`❌ Error fetching league data: ${error.message}`);
      return null;
    }
  }

  /**
   * Fetch team stats from FootyStats API with intelligent competition type detection
   */
  async fetchTeamStats(teamId, seasonId = null) {
    try {
      this.logger.info(
        `🌐 Fetching team stats for ID: ${teamId}${seasonId ? ` in season ${seasonId}` : ''}`
      );

      // Use mapped team ID if available
      const mappedId = this.teamIdMappings[teamId] || teamId;

      // Build request parameters
      const params = {
        key: this.apiKey,
        team_id: mappedId,
        include: 'stats',
      };

      // If season ID provided, use it
      if (seasonId) {
        params.season_id = seasonId;
      }

      // Fetch team data
      const response = await axios.get(`${this.baseUrl}/team`, {
        params,
        timeout: 10000,
      });

      if (response.data.success && response.data.data && response.data.data.length > 0) {
        const teamData = response.data.data[0];
        this.logger.info(`✅ Found team: ${teamData.name} (${teamData.country})`);
        
        // DEBUG: Log the structure of teamData
        console.log('[DEBUG] fetchTeamStats - Team data structure:', {
          hasStats: !!teamData.stats,
          hasAdditionalInfo: !!teamData.additional_info,
          statsHasAdditionalInfo: !!teamData.stats?.additional_info,
          statsKeys: Object.keys(teamData.stats || {}).slice(0, 10),
          additionalInfoKeys: Object.keys(teamData.additional_info || {}).slice(0, 10),
          statsAdditionalInfoKeys: Object.keys(teamData.stats?.additional_info || {}).slice(0, 10)
        });
        
        // Check for card fields
        if (teamData.stats?.additional_info) {
          const cardFields = Object.keys(teamData.stats.additional_info).filter(k => 
            k.includes('fh_cards_total_avg') || k.includes('cards1H_AVG')
          );
          console.log('[DEBUG] Card fields in stats.additional_info:', cardFields);
          cardFields.forEach(field => {
            console.log(`[DEBUG]   ${field}: ${teamData.stats.additional_info[field]}`);
          });
        }
        
        return teamData;
      }

      // Only try fallback if we have a good reason (e.g., wrong season ID)
      if (seasonId && !response.data.data?.length) {
        this.logger.info(
          `⚠️ No data found with season ${seasonId}, checking if team exists in league-teams`
        );

        // First check if team exists in league-teams data before making another API call
        const teams = await this.getLeagueTeamsData(seasonId);
        if (teams && !teams.find(t => t.id?.toString() === mappedId.toString())) {
          // Team not in this season, try without season filter
          this.logger.info(`🔄 Team not found in season ${seasonId}, trying without season filter`);
          delete params.season_id;

          const fallbackResponse = await axios.get(`${this.baseUrl}/team`, {
            params,
            timeout: 10000,
          });

          if (
            fallbackResponse.data.success &&
            fallbackResponse.data.data &&
            fallbackResponse.data.data.length > 0
          ) {
            return fallbackResponse.data.data[0];
          }
        }
      }

      return null;
    } catch (error) {
      this.logger.error(`❌ Error fetching team stats: ${error.message}`);
      return null;
    }
  }

  /**
   * Extract team information from API response
   */
  extractTeamInfo(teamStats) {
    return {
      id: teamStats.id,
      name: teamStats.name || 'Unknown Team',
      fullName: teamStats.full_name || teamStats.name,
      englishName: teamStats.english_name || teamStats.name,
      image: teamStats.image || teamStats.logo || teamStats.crest || teamStats.badge_url || null,
      country: teamStats.country,
      founded: teamStats.founded,
      season: teamStats.season,
      competition_id: teamStats.competition_id,
      risk: teamStats.risk,
      performance_rank: teamStats.performance_rank,
    };
  }

  /**
   * DEPRECATED: Legacy league resolution - kept for backward compatibility
   * Use SmartLeagueResolver instead
   * @deprecated
   */
  async resolveLeagueInfoLegacy(teamStats, correctSeasonId = null) {
    this.logger.info(
      `📌 resolveLeagueInfo called with correctSeasonId: ${correctSeasonId}, competition_id: ${teamStats.competition_id}`
    );

    // If we already have the correct season ID from UniversalMappingService, use it
    if (correctSeasonId) {
      this.logger.info(
        `🔍 Using UniversalMappingService season ID: ${correctSeasonId} (original: ${teamStats.competition_id})`
      );
    }

    let leagueInfo = {
      id: correctSeasonId || teamStats.competition_id || 0,
      name: teamStats.competition || teamStats.league_name || 'Unknown League',
      country: teamStats.country || 'Unknown',
      season: teamStats.season,
      originalCompetitionId: teamStats.competition_id,
    };

    this.logger.info(
      `🔍 Resolving league for competition_id: ${teamStats.competition_id}, country: ${teamStats.country}`
    );

    // If we already have the correct season ID from UniversalMappingService, skip the rest
    if (correctSeasonId) {
      this.logger.info(`✅ Using season ID from UniversalMappingService: ${correctSeasonId}`);
      // Still need to get league name from cache if possible
      if (!this.seasonIdsCache || Date.now() - this.seasonIdsCacheTime > 3600000) {
        this.seasonIdsCache = await getChosenLeagueSeasonIds(this.apiKey, this.baseUrl);
        this.seasonIdsCacheTime = Date.now();
      }

      const leagueMatch = this.seasonIdsCache.find(l => l.season_id === correctSeasonId);
      if (leagueMatch) {
        leagueInfo.name = `${leagueMatch.country} ${leagueMatch.league_name}`;
        leagueInfo.country = leagueMatch.country;
        leagueInfo.season = leagueMatch.season_name;
      }

      // If UniversalMappingService provided a different ID, mark it as mapped
      if (correctSeasonId !== teamStats.competition_id) {
        leagueInfo.mappedFromCompetitionId = teamStats.competition_id;
        this.logger.info(`📍 Mapped: ${teamStats.competition_id} → ${correctSeasonId}`);
      }

      return leagueInfo;
    }

    // First, try to get the correct season ID from our cached season IDs
    try {
      if (!this.seasonIdsCache || Date.now() - this.seasonIdsCacheTime > 3600000) {
        this.logger.info(`🔄 Refreshing season IDs cache...`);
        this.seasonIdsCache = await getChosenLeagueSeasonIds(this.apiKey, this.baseUrl);
        this.seasonIdsCacheTime = Date.now();
      }

      // Remove the slow competition mapping for now

      // FIRST: Try to find exact match by competition_id
      if (this.seasonIdsCache && teamStats.competition_id) {
        this.logger.info(
          `🔎 Looking for exact match: competition_id ${teamStats.competition_id} (type: ${typeof teamStats.competition_id})`
        );
        const exactMatch = this.seasonIdsCache.find(l => {
          const matches = l.season_id === teamStats.competition_id;
          if (matches) {
            this.logger.info(`   ✓ Found match: ${l.league_name} season_id ${l.season_id}`);
          }
          return matches;
        });
        if (exactMatch) {
          leagueInfo = {
            id: exactMatch.season_id,
            name: `${exactMatch.country} ${exactMatch.league_name}`,
            country: exactMatch.country,
            season: exactMatch.season_name,
            fullName: `${exactMatch.country} ${exactMatch.league_name}`,
          };
          this.logger.info(`✅ Found exact league match: ${leagueInfo.name} (ID: ${leagueInfo.id})`);
          return leagueInfo;
        }
      }

      // SECOND: If no exact match but we have country, try to find the right league
      if (this.seasonIdsCache && teamStats.country && teamStats.competition_id) {
        // Find all leagues for this country
        const countryLeagues = this.seasonIdsCache.filter(l => l.country === teamStats.country);

        if (countryLeagues.length > 0) {
          // Sort leagues by season year AND season_id (newest first) to check current seasons first
          const sortedLeagues = [...countryLeagues].sort((a, b) => {
            // Extract year from season_name (e.g., "2025" from "2025" or "2024/2025")
            const yearA = parseInt(a.season_name.split('/')[0]) || 0;
            const yearB = parseInt(b.season_name.split('/')[0]) || 0;

            // If years are different, sort by year
            if (yearA !== yearB) {
              return yearB - yearA; // Newest year first
            }

            // If same year, sort by season_id (higher ID = newer season)
            return b.season_id - a.season_id;
          });

          this.logger.info(`📊 Found ${sortedLeagues.length} leagues for ${teamStats.country}:`);
          sortedLeagues.forEach(l => {
            this.logger.info(`   - ${l.league_name} (${l.season_name}) ID: ${l.season_id}`);
          });

          // Try to get the league data to see which one contains our team
          for (const league of sortedLeagues) {
            try {
              this.logger.info(
                `🔍 Checking if team ${teamStats.id} is in ${league.league_name} (${league.season_name})...`
              );
              const teamsResponse = await axios.get(`${this.baseUrl}/league-teams`, {
                params: {
                  key: this.apiKey,
                  season_id: league.season_id,
                },
                timeout: 5000,
              });

              if (teamsResponse.data.success && teamsResponse.data.data) {
                const teamInLeague = teamsResponse.data.data.find(t => t.id == teamStats.id);
                if (teamInLeague) {
                  leagueInfo = {
                    id: league.season_id,
                    name: `${league.country} ${league.league_name}`,
                    country: league.country,
                    season: league.season_name,
                    fullName: `${league.country} ${league.league_name}`,
                  };
                  this.logger.info(
                    `✅ Found team in ${leagueInfo.name} (${league.season_name}) - ID: ${leagueInfo.id}`
                  );
                  return leagueInfo; // Return the FIRST (newest) match
                }
              }
            } catch (error) {
              // Continue to next league
            }
          }
          this.logger.info(`⚠️ Team not found in any ${teamStats.country} leagues`);
        }
      }

      // FALLBACK: Try to find by country - ONLY if we don't have a competition_id
      if (this.seasonIdsCache && teamStats.country && !teamStats.competition_id) {
        let matchingLeague = null;

        // Special handling for USA teams - they're likely MLS (but only if no exact match found)
        if (teamStats.country === 'USA' && teamStats.name && !teamStats.name.includes('USL')) {
          matchingLeague = this.seasonIdsCache.find(
            l => l.country === 'USA' && l.league_name === 'MLS'
          );
        }
        // Special handling for China teams
        else if (teamStats.country === 'China') {
          // Check if it's a top division team by looking at the team name or other indicators
          matchingLeague = this.seasonIdsCache.find(
            l => l.country === 'China' && l.league_name === 'Chinese Super League'
          );
        }
        // For other countries, try exact match first
        else {
          // Try to match by country and find the main league
          const countryLeagues = this.seasonIdsCache.filter(l => l.country === teamStats.country);
          if (countryLeagues.length === 1) {
            matchingLeague = countryLeagues[0];
          } else if (countryLeagues.length > 1) {
            // Try to find the main/top league
            matchingLeague =
              countryLeagues.find(
                l =>
                  !l.league_name.includes('Division') &&
                  !l.league_name.includes('League One') &&
                  !l.league_name.includes('League Two') &&
                  !l.league_name.includes('Championship')
              ) || countryLeagues[0];
          }
        }

        if (matchingLeague) {
          leagueInfo = {
            id: matchingLeague.season_id,
            name: `${matchingLeague.country} ${matchingLeague.league_name}`,
            country: matchingLeague.country,
            season: matchingLeague.season_name,
            fullName: `${matchingLeague.country} ${matchingLeague.league_name}`,
          };
          this.logger.info(`✅ Found league from season IDs: ${leagueInfo.name} (ID: ${leagueInfo.id})`);
          return leagueInfo;
        } else {
          this.logger.info(`⚠️ No matching league found for country: ${teamStats.country}`);
        }
      }
    } catch (error) {
      this.logger.warn(`⚠️ Error resolving from season IDs: ${error.message}`);
    }

    // Fallback: Try to get league info from league manager
    if (this.leagueManager && teamStats.competition_id) {
      try {
        const leagues = await this.leagueManager.getUserLeaguesForServer();
        const foundLeague = leagues.find(l => l.id === teamStats.competition_id);

        if (foundLeague) {
          leagueInfo = {
            id: foundLeague.id,
            name: foundLeague.name,
            country: foundLeague.country,
            season: foundLeague.year || teamStats.season,
            fullName: foundLeague.fullName,
          };
          this.logger.info(`✅ Found league info from manager: ${foundLeague.name}`);
        } else {
          this.logger.info(
            `⚠️ League not found in manager for competition_id: ${teamStats.competition_id}`
          );
          this.logger.info(`   Available league IDs: ${leagues.map(l => l.id).join(', ')}`);
        }
      } catch (error) {
        this.logger.warn(`⚠️ Could not get league info from manager: ${error.message}`);
      }
    }

    // If UniversalMappingService provided a different ID, mark it as mapped
    if (correctSeasonId && correctSeasonId !== teamStats.competition_id) {
      leagueInfo.mappedFromCompetitionId = teamStats.competition_id;
      this.logger.info(`📍 Mapped: ${teamStats.competition_id} → ${correctSeasonId}`);
    }

    // Final validation: if we still have the original competition_id and haven't found a proper match
    // This handles cases where the API has newer season IDs than our chosen leagues cache
    if (leagueInfo.id === teamStats.competition_id && !leagueInfo.fullName) {
      this.logger.info(
        `📌 Using original competition_id ${teamStats.competition_id} - league details may be incomplete`
      );
      leagueInfo.note =
        "League information may be incomplete - using team's competition ID directly";
    }

    return leagueInfo;
  }

  /**
   * Get team's position in league
   */
  async getLeaguePosition(teamId, teamStats, leagueInfo) {
    // FootyStats API position data is unreliable for current seasons
    // The API returns incorrect table_position values

    let position = null;
    let totalTeams = null; // Will be set dynamically from league data

    // Store initial position from team API
    const apiPosition = teamStats.table_position;

    // Get position from team API response
    if (teamStats.table_position !== undefined && teamStats.table_position !== null) {
      position = teamStats.table_position;
      this.logger.info(`📊 Team API returned table_position: ${position}`);

      // Handle common API issues
      if (position === 0) {
        this.logger.info(`⚠️ API returned position 0, data likely unavailable`);
        position = null;
      } else if (position === 1 && teamStats.stats?.seasonMatchesPlayed_overall > 10) {
        // Position 1 is suspicious for teams that have played many matches
        this.logger.info(
          `⚠️ Position 1 may be incorrect for team with ${teamStats.stats?.seasonMatchesPlayed_overall} matches played`
        );
      }
    }

    // Try to get better position data from league-tables endpoint
    if (leagueInfo && leagueInfo.id) {
      try {
        this.logger.info(`🔍 Fetching position from league-tables endpoint...`);

        // Get the correct season ID
        let seasonId = leagueInfo.id;

        try {
          // Cache season IDs for 1 hour
          if (!this.seasonIdsCache || Date.now() - this.seasonIdsCacheTime > 3600000) {
            this.logger.info(`🔄 Refreshing season IDs cache...`);
            this.seasonIdsCache = await getChosenLeagueSeasonIds(this.apiKey, this.baseUrl);
            this.seasonIdsCacheTime = Date.now();
          }

          // Find matching season for this league
          if (this.seasonIdsCache && this.seasonIdsCache.length > 0) {
            // Try exact match first
            let matchingLeague = this.seasonIdsCache.find(l => l.season_id === leagueInfo.id);

            // If no exact match, try by country and league name
            if (!matchingLeague && leagueInfo.name && leagueInfo.country) {
              matchingLeague = this.seasonIdsCache.find(l => {
                // Remove country prefix from league names for better matching
                const cleanLeagueName = leagueInfo.name.replace(`${leagueInfo.country} `, '');
                const cleanStoredName = l.league_name;

                return (
                  l.country === leagueInfo.country &&
                  (cleanLeagueName.includes(cleanStoredName) ||
                    cleanStoredName.includes(cleanLeagueName) ||
                    leagueInfo.name.includes(l.league_name) ||
                    l.league_name.includes(leagueInfo.name))
                );
              });
            }

            if (matchingLeague) {
              seasonId = matchingLeague.season_id;
              this.logger.info(
                `📅 Using season ID ${seasonId} for ${matchingLeague.country} - ${matchingLeague.league_name} (${matchingLeague.season_name})`
              );
            } else {
              this.logger.info(
                `⚠️ No matching season found for ${leagueInfo.country} - ${leagueInfo.name}, using ID: ${seasonId}`
              );
            }
          }
        } catch (error) {
          this.logger.warn(`⚠️ Error getting season IDs: ${error.message}`);
        }

        // First try to get position from cached league teams data
        const teams = await this.getLeagueTeamsData(seasonId);
        if (teams) {
          const teamData = teams.find(t => t.id?.toString() === teamId.toString());
          if (teamData && teamData.table_position) {
            position = teamData.table_position;
            totalTeams = teams.length;
            this.logger.info(`✅ Got position from cached league-teams: ${position}/${totalTeams}`);
          } else {
            // Fallback to universal position resolver
            const positionData = await getTeamPositionUniversal(
              this.apiKey,
              this.baseUrl,
              seasonId,
              teamId
            );

            if (positionData) {
              position = positionData.position;
              totalTeams = positionData.total_teams;
              this.logger.info(`✅ Got position from ${positionData.source}: ${position}/${totalTeams}`);
            } else {
              this.logger.info(`⚠️ No position data available from API`);
              position = null;
              totalTeams = null;
            }
          }
        } else {
          // Fallback to universal position resolver if no cached data
          const positionData = await getTeamPositionUniversal(
            this.apiKey,
            this.baseUrl,
            seasonId,
            teamId
          );

          if (positionData) {
            position = positionData.position;
            totalTeams = positionData.total_teams;
            this.logger.info(`✅ Got position from ${positionData.source}: ${position}/${totalTeams}`);
          } else {
            this.logger.info(`⚠️ No position data available from API`);
            position = null;
            totalTeams = null;
          }
        }
      } catch (error) {
        this.logger.warn(`⚠️ Could not fetch position data: ${error.message}`);
        // Fall back to API position
        position = apiPosition;
      }
    } else {
      // No league info, use API position
      position = apiPosition;
    }

    // If position is still 0 or null, convert to null for display
    if (position === 0) {
      position = null;
    }

    // Determine if position data is reliable
    const isUnreliable =
      position === null || (position === 1 && teamStats.stats?.seasonMatchesPlayed_overall > 10);

    return {
      position: position,
      totalTeams: totalTeams,
      positionText: position && totalTeams ? `${position}/${totalTeams}` : 'N/A',
      isReliable: !isUnreliable,
      note: isUnreliable ? 'Position data temporarily unavailable' : null,
    };
  }

  /**
   * Get accurate PPG from league-teams endpoint
   */
  async getAccuratePPG(teamId, seasonId) {
    try {
      this.logger.info(`📊 Getting accurate PPG for team ${teamId} in season ${seasonId}`);

      // Use shared method to get league teams
      const teams = await this.getLeagueTeamsData(seasonId);

      if (teams) {
        const teamData = teams.find(t => t.id?.toString() === teamId.toString());
        if (teamData && teamData.stats) {
          const ppg = teamData.stats.seasonPPG_overall || 0;
          this.logger.info(`✅ Found accurate PPG from league-teams: ${ppg}`);
          return ppg;
        }
      }
    } catch (error) {
      this.logger.info(`⚠️ Could not fetch PPG from league-teams: ${error.message}`);
    }
    return null;
  }

  /**
   * Shared method to get league teams data with caching
   */
  async getLeagueTeamsData(seasonId) {
    if (!seasonId) {
      return null;
    }

    // Check cache first
    const cacheKey = `league_teams_${seasonId}`;
    const cached = this.leagueTeamsCache.get(cacheKey);
    const cacheTime = this.leagueTeamsCacheTime.get(cacheKey);

    if (cached && cacheTime && Date.now() - cacheTime < this.CACHE_TTL) {
      this.logger.info(`💾 Using cached league-teams data for season ${seasonId}`);
      return cached;
    }

    try {
      this.logger.info(`🌐 Fetching league-teams for season ${seasonId}`);
      const response = await axios.get(`${this.baseUrl}/league-teams`, {
        params: {
          key: this.apiKey,
          season_id: seasonId,
          include: 'stats',
        },
        timeout: 10000,
      });

      if (response.data.success && response.data.data) {
        const teams = response.data.data;
        
        // DEBUG: Check data structure
        console.log('[DEBUG] getLeagueTeamsData - Response structure:');
        if (teams.length > 0) {
          const sampleTeam = teams[0];
          console.log({
            teamCount: teams.length,
            firstTeamName: sampleTeam.name,
            hasStats: !!sampleTeam.stats,
            hasAdditionalInfo: !!sampleTeam.additional_info,
            statsHasAdditionalInfo: !!sampleTeam.stats?.additional_info,
            statsKeys: Object.keys(sampleTeam.stats || {}).slice(0, 5),
            additionalInfoKeys: Object.keys(sampleTeam.additional_info || {}).slice(0, 5),
            statsAdditionalInfoKeys: Object.keys(sampleTeam.stats?.additional_info || {}).slice(0, 5)
          });
          
          // Check for card fields in first team
          if (sampleTeam.stats?.additional_info) {
            const cardFields = Object.keys(sampleTeam.stats.additional_info).filter(k => 
              k.includes('fh_cards_total_avg') || k.includes('fh_total_cards_avg')
            );
            if (cardFields.length > 0) {
              console.log('[DEBUG] Card average fields found in league-teams:', cardFields);
            }
          }
        }
        
        // Cache the data
        this.leagueTeamsCache.set(cacheKey, teams);
        this.leagueTeamsCacheTime.set(cacheKey, Date.now());
        return teams;
      }
    } catch (error) {
      this.logger.info(`⚠️ Could not fetch league-teams: ${error.message}`);
    }

    return null;
  }

  /**
   * Process team statistics using schema-based approach
   */
  processStatisticsWithSchema(teamStats, matches = [], teamId = null) {
    try {
      // First get all fields from refactored legacy method to ensure nothing is missing
      // 🚀 NEW SENIOR DEVELOPER LEVEL - Schema mapping için de yeni processor kullan
      const dataSources = {
        stats: teamStats.stats || teamStats,
        additionalInfo: (teamStats.stats && teamStats.stats.additional_info) || teamStats.additional_info || {}
      };
      const legacyFields = this.processStatisticsLegacy(teamStats.stats || teamStats, (teamStats.stats && teamStats.stats.additional_info) || teamStats.additional_info || {}, matches, teamId);

      // Debug logging
      this.logger.info('\n🔍 SCHEMA MAPPING DEBUG:');
      this.logger.info('Sample fields from legacy:');
      this.logger.info('  - winPercentage:', legacyFields.winPercentage);
      this.logger.info('  - cleanSheets:', legacyFields.cleanSheets);
      this.logger.info('  - totalCards:', legacyFields.totalCards);
      this.logger.info('  - cornersAgainstPerMatch:', legacyFields.cornersAgainstPerMatch);

      // Use SchemaMapper to map fields that are defined in schema
      const mappedStats = {
        overall: this.schemaMapper.mapTeamStats(teamStats, 'overall'),
        home: this.schemaMapper.mapTeamStats(teamStats, 'home'),
        away: this.schemaMapper.mapTeamStats(teamStats, 'away'),
      };

      this.logger.info('Schema mapped fields (overall):');
      this.logger.info('  - winPercentage:', mappedStats.overall.results?.winPercentage);
      this.logger.info('  - cleanSheets:', mappedStats.overall.goals?.cleanSheets);
      this.logger.info('  - totalCards:', mappedStats.overall.cards?.totalCards);
      this.logger.info(
        '  - cornersAgainstPerMatch:',
        mappedStats.overall.corners?.cornersAgainstPerMatch
      );

      // Start with legacy fields as base
      const result = { ...legacyFields };

      // Override with schema-mapped fields for overall context
      Object.keys(mappedStats.overall).forEach(category => {
        Object.keys(mappedStats.overall[category]).forEach(field => {
          // Only override if schema mapper found a non-zero value
          const mappedValue = mappedStats.overall[category][field];
          if (mappedValue !== undefined && mappedValue !== null && mappedValue !== 0) {
            result[field] = mappedValue;
            // Also add with _overall suffix for fields that need it
            if (field === 'cards1H_AVG' || field === 'cards2H_AVG') {
              result[`${field}_overall`] = mappedValue;
            }
          } else if (mappedValue === 0 && !result.hasOwnProperty(field)) {
            // Only set to 0 if field doesn't exist in legacy
            result[field] = 0;
            // Also add with _overall suffix for fields that need it
            if (field === 'cards1H_AVG' || field === 'cards2H_AVG') {
              result[`${field}_overall`] = 0;
            }
          }
        });
      });

      // Add home/away specific fields
      Object.keys(mappedStats.home).forEach(category => {
        Object.keys(mappedStats.home[category]).forEach(field => {
          const homeFieldName = `home${field.charAt(0).toUpperCase()}${field.slice(1)}`;
          if (
            mappedStats.home[category][field] !== undefined &&
            mappedStats.home[category][field] !== null
          ) {
            result[homeFieldName] = mappedStats.home[category][field];
            // Also add with _home suffix for specific fields
            if (field === 'cards1H_AVG' || field === 'cards2H_AVG') {
              result[`${field}_home`] = mappedStats.home[category][field];
            }
          }
        });
      });

      Object.keys(mappedStats.away).forEach(category => {
        Object.keys(mappedStats.away[category]).forEach(field => {
          const awayFieldName = `away${field.charAt(0).toUpperCase()}${field.slice(1)}`;
          if (
            mappedStats.away[category][field] !== undefined &&
            mappedStats.away[category][field] !== null
          ) {
            result[awayFieldName] = mappedStats.away[category][field];
            // Also add with _away suffix for specific fields
            if (field === 'cards1H_AVG' || field === 'cards2H_AVG') {
              result[`${field}_away`] = mappedStats.away[category][field];
            }
          }
        });
      });

      // Add suffix fields from legacy (overall/home/away)
      ['_overall', '_home', '_away'].forEach(suffix => {
        Object.keys(legacyFields).forEach(key => {
          if (
            key.endsWith(suffix) &&
            legacyFields[key] !== undefined &&
            legacyFields[key] !== null
          ) {
            result[key] = legacyFields[key];
          }
        });
      });

      return result;
    } catch (error) {
      this.logger.error('Error in schema-based processing, falling back to refactored legacy:', error);
      // 🚀 NEW SENIOR DEVELOPER LEVEL - Fallback için de yeni processor kullan
      const dataSources = {
        stats: teamStats.stats || teamStats,
        additionalInfo: (teamStats.stats && teamStats.stats.additional_info) || teamStats.additional_info || {}
      };
      return this.processStatisticsLegacy(teamStats.stats || teamStats, (teamStats.stats && teamStats.stats.additional_info) || teamStats.additional_info || {}, matches, teamId);
    }
  }

  /**
   * Process statistics using modular processors (NEW SYSTEM)
   * @param {Object} teamStats - Raw API statistics data
   * @param {Array} matches - Team matches data
   * @param {string} teamId - Team ID
   * @returns {Object} Processed statistics using modular system
   */
  processStatisticsModular(teamStats, matches = [], teamId = null) {
    try {
      this.logger.info('\n🔄 MODULAR PROCESSING: Starting...');
      const startTime = Date.now();

      // Extract statistics and additional info
      const stats = teamStats.stats || {};
      const additionalInfo = stats.additional_info || teamStats.additional_info || {};

      // Debug logging
      this.logger.info('📊 Processing with modular system:');
      this.logger.info(`   Stats fields: ${Object.keys(stats).length}`);
      this.logger.info(`   Additional info fields: ${Object.keys(additionalInfo).length}`);

      // Process using modular system
      const modularResult = this.statisticsFactory.processAllStatistics(stats, additionalInfo);

      // Add matches played from stats if available
      if (stats.matchesPlayed_overall) {
        modularResult.matchesPlayed_overall = stats.matchesPlayed_overall;
      }
      if (stats.matchesPlayed_home) {
        modularResult.matchesPlayed_home = stats.matchesPlayed_home;
      }
      if (stats.matchesPlayed_away) {
        modularResult.matchesPlayed_away = stats.matchesPlayed_away;
      }

      // Add basic team info from matches if needed
      if (matches && matches.length > 0) {
        const totalMatches = matches.length;
        const homeMatches = matches.filter(m => m.homeID == teamId).length;
        const awayMatches = matches.filter(m => m.awayID == teamId).length;

        if (!modularResult.matchesPlayed_overall) {
          modularResult.matchesPlayed_overall = totalMatches;
        }
        if (!modularResult.matchesPlayed_home) {
          modularResult.matchesPlayed_home = homeMatches;
        }
        if (!modularResult.matchesPlayed_away) {
          modularResult.matchesPlayed_away = awayMatches;
        }
      }

      // Get processing summary
      const summary = this.statisticsFactory.getStatisticsSummary(modularResult);
      const processingTime = Date.now() - startTime;

      this.logger.info('✅ MODULAR PROCESSING: Completed');
      this.logger.info(`   Processed ${summary.totalFields} fields in ${processingTime}ms`);
      this.logger.info(`   Context distribution: Overall: ${summary.contexts.overall}, Home: ${summary.contexts.home}, Away: ${summary.contexts.away}`);
      this.logger.info(`   Category distribution: ${Object.entries(summary.categories).map(([cat, count]) => `${cat}: ${count}`).join(', ')}`);

      return modularResult;

    } catch (error) {
      this.logger.error('❌ Error in modular processing, falling back to legacy:', error.message);
      trackError('modular_processing_error', error, { teamId, teamStatsKeys: Object.keys(teamStats) });
      
      // Fallback to refactored legacy processing
      // 🚀 NEW SENIOR DEVELOPER LEVEL - Fallback için de yeni processor kullan
      const dataSources = {
        stats: teamStats.stats || teamStats,
        additionalInfo: (teamStats.stats && teamStats.stats.additional_info) || teamStats.additional_info || {}
      };
      return this.processStatisticsLegacy(teamStats.stats || teamStats, (teamStats.stats && teamStats.stats.additional_info) || teamStats.additional_info || {}, matches, teamId);
    }
  }

  /**
   * Legacy process team statistics from API response
   * @deprecated Bu fonksiyon artık LegacyStatisticsProcessor tarafından modüler halde işleniyor
   * Geriye uyumluluk için bırakıldı, yeni kodlarda this.legacyProcessor.processStatistics() kullanın
   */
  processStatisticsLegacy(stats, additionalInfo = {}, matches = [], teamId = null) {

    return {
      // Basic stats
      totalMatches: stats.seasonMatchesPlayed_overall || 0,
      completedMatches: stats.seasonMatchesPlayed_overall || 0,
      wins: stats.seasonWinsNum_overall || 0,
      draws: stats.seasonDrawsNum_overall || 0,
      losses: stats.seasonLossesNum_overall || 0,
      points: stats.seasonPoints_overall || 0,
      pointsPerGame: stats.seasonPPG_overall || 0,

      // Goals
      goalsFor: stats.seasonGoals_overall || stats.seasonScoredNum_overall || 0,
      goalsAgainst: stats.seasonConceded_overall || stats.seasonConcededNum_overall || 0,
      goalDifference: stats.seasonGoalDifference_overall || 0,
      averageGoalsFor: stats.seasonScoredAVG_overall || 0,
      averageGoalsAgainst: stats.seasonConcededAVG_overall || 0,
      goalsForPerMatch: stats.seasonScoredAVG_overall || 0,
      goalsAgainstPerMatch: stats.seasonConcededAVG_overall || 0,
      seasonConcededAVG_overall: stats.seasonConcededAVG_overall || 0,
      seasonConcededAVG_home: stats.seasonConcededAVG_home || 0,
      seasonConcededAVG_away: stats.seasonConcededAVG_away || 0,
      avgMatchGoals: stats.seasonAVG_overall || 0,
      seasonScoredAVG_overall: stats.seasonScoredAVG_overall || 0,

      // 2nd Half Goals Average - additional_info içinde olabilir
      scored_2hg_avg_overall:
        additionalInfo.scored_2hg_avg_overall || stats.scored_2hg_avg_overall || 0,
      scored_2hg_avg_home: additionalInfo.scored_2hg_avg_home || stats.scored_2hg_avg_home || 0,
      scored_2hg_avg_away: additionalInfo.scored_2hg_avg_away || stats.scored_2hg_avg_away || 0,
      
      // Alternative field names for 2nd Half Goals Average (for compatibility with goals-display.js)
      secondHalfGoalsAVG_overall:
        additionalInfo.scored_2hg_avg_overall || stats.scored_2hg_avg_overall || 0,
      secondHalfGoalsAVG_home: additionalInfo.scored_2hg_avg_home || stats.scored_2hg_avg_home || 0,
      secondHalfGoalsAVG_away: additionalInfo.scored_2hg_avg_away || stats.scored_2hg_avg_away || 0,
      scoredAVG2H_overall:
        additionalInfo.scored_2hg_avg_overall || stats.scored_2hg_avg_overall || 0,
      scoredAVG2H_home: additionalInfo.scored_2hg_avg_home || stats.scored_2hg_avg_home || 0,
      scoredAVG2H_away: additionalInfo.scored_2hg_avg_away || stats.scored_2hg_avg_away || 0,

      // 2nd Half Goals Total
      scored_2hg_overall: additionalInfo.scored_2hg_overall || stats.scored_2hg_overall || 0,
      scored_2hg_home: additionalInfo.scored_2hg_home || stats.scored_2hg_home || 0,
      scored_2hg_away: additionalInfo.scored_2hg_away || stats.scored_2hg_away || 0,

      // Home stats
      homeMatches: stats.seasonMatchesPlayed_home || 0,
      homeWins: stats.seasonWinsNum_home || 0,
      homeDraws: stats.seasonDrawsNum_home || 0,
      homeLosses: stats.seasonLossesNum_home || 0,
      homeGoalsFor: stats.seasonScoredNum_home || stats.seasonGoals_home || 0,
      homeGoalsAgainst: stats.seasonConcededNum_home || stats.seasonConceded_home || 0,
      homePointsPerGame: stats.seasonPPG_home || 0,
      homeGoalDifference: stats.seasonGoalDifference_home || 0,

      // Away stats
      awayMatches: stats.seasonMatchesPlayed_away || 0,
      awayWins: stats.seasonWinsNum_away || 0,
      awayDraws: stats.seasonDrawsNum_away || 0,
      awayLosses: stats.seasonLossesNum_away || 0,
      awayGoalsFor: stats.seasonScoredNum_away || stats.seasonGoals_away || 0,
      awayGoalsAgainst: stats.seasonConcededNum_away || stats.seasonConceded_away || 0,
      awayPointsPerGame: stats.seasonPPG_away || 0,
      awayGoalDifference: stats.seasonGoalDifference_away || 0,

      // Percentages
      winPercentage: stats.winPercentage_overall || 0,
      drawPercentage: stats.drawPercentage_overall || 0,
      lossPercentage: stats.losePercentage_overall || 0,
      homeWinPercentage: stats.winPercentage_home || 0,
      awayWinPercentage: stats.winPercentage_away || 0,

      // Clean sheets & failed to score
      cleanSheets: stats.seasonCS_overall || 0,
      failedToScore: stats.seasonFTS_overall || 0,
      cleanSheetPercentage: stats.seasonCSPercentage_overall || 0,
      failedToScorePercentage: stats.seasonFTSPercentage_overall || 0,
      homeCleanSheets: stats.seasonCS_home || 0,
      awayCleanSheets: stats.seasonCS_away || 0,
      homeFailedToScore: stats.seasonFTS_home || 0,
      awayFailedToScore: stats.seasonFTS_away || 0,
      homeCleanSheetPercentage: stats.seasonCSPercentage_home || 0,
      awayCleanSheetPercentage: stats.seasonCSPercentage_away || 0,
      homeFailedToScorePercentage: stats.seasonFTSPercentage_home || 0,
      awayFailedToScorePercentage: stats.seasonFTSPercentage_away || 0,

      // Over/Under goals
      over05GoalsPercentage: stats.seasonOver05Percentage_overall || 0,
      over15GoalsPercentage: stats.seasonOver15Percentage_overall || 0,
      over25GoalsPercentage: stats.seasonOver25Percentage_overall || 0,
      over35GoalsPercentage: stats.seasonOver35Percentage_overall || 0,
      over45GoalsPercentage: stats.seasonOver45Percentage_overall || 0,
      bothTeamsScoredPercentage: stats.seasonBTTSPercentage_overall || 0,
      bttsAndWinPercentage: stats.BTTS_and_win_percentage_overall || 0,
      bttsAndDrawPercentage: stats.BTTS_and_draw_percentage_overall || 0,
      bttsAndLosePercentage: stats.BTTS_and_lose_percentage_overall || 0,

      // Home Over/Under
      homeOver05GoalsPercentage: stats.seasonOver05Percentage_home || 0,
      homeOver15GoalsPercentage: stats.seasonOver15Percentage_home || 0,
      homeOver25GoalsPercentage: stats.seasonOver25Percentage_home || 0,
      homeOver35GoalsPercentage: stats.seasonOver35Percentage_home || 0,
      homeOver45GoalsPercentage: stats.seasonOver45Percentage_home || 0,
      homeBothTeamsScoredPercentage: stats.seasonBTTSPercentage_home || 0,
      homeBttsAndWinPercentage: stats.BTTS_and_win_percentage_home || 0,
      homeBttsAndDrawPercentage: stats.BTTS_and_draw_percentage_home || 0,
      homeBttsAndLosePercentage: stats.BTTS_and_lose_percentage_home || 0,

      // Away Over/Under
      awayOver05GoalsPercentage: stats.seasonOver05Percentage_away || 0,
      awayOver15GoalsPercentage: stats.seasonOver15Percentage_away || 0,
      awayOver25GoalsPercentage: stats.seasonOver25Percentage_away || 0,
      awayOver35GoalsPercentage: stats.seasonOver35Percentage_away || 0,
      awayOver45GoalsPercentage: stats.seasonOver45Percentage_away || 0,
      awayBothTeamsScoredPercentage: stats.seasonBTTSPercentage_away || 0,
      awayBttsAndWinPercentage: stats.BTTS_and_win_percentage_away || 0,
      awayBttsAndDrawPercentage: stats.BTTS_and_draw_percentage_away || 0,
      awayBttsAndLosePercentage: stats.BTTS_and_lose_percentage_away || 0,

      // xG stats - using per match average values directly from API
      xgFor: stats.xg_for_avg_overall || 0,
      xgAgainst: stats.xg_against_avg_overall || 0,
      xgForPerMatch: stats.xg_for_avg_overall || 0,
      xgAgainstPerMatch: stats.xg_against_avg_overall || 0,
      xgDifferencePerMatch: (stats.xg_for_avg_overall || 0) - (stats.xg_against_avg_overall || 0),
      homeXgFor: stats.xg_for_avg_home || 0,
      homeXgAgainst: stats.xg_against_avg_home || 0,
      homeXgForPerMatch: stats.xg_for_avg_home || 0,
      homeXgAgainstPerMatch: stats.xg_against_avg_home || 0,
      awayXgFor: stats.xg_for_avg_away || 0,
      awayXgAgainst: stats.xg_against_avg_away || 0,
      awayXgForPerMatch: stats.xg_for_avg_away || 0,
      awayXgAgainstPerMatch: stats.xg_against_avg_away || 0,

      // Goals averages for comparison with xG
      goalsForPerMatch: stats.seasonScoredAVG_overall || 0,
      goalsAgainstPerMatch: stats.seasonConcededAVG_overall || 0,
      seasonConcededAVG_overall: stats.seasonConcededAVG_overall || 0,
      seasonConcededAVG_home: stats.seasonConcededAVG_home || 0,
      seasonConcededAVG_away: stats.seasonConcededAVG_away || 0,
      homeGoalsForPerMatch: stats.seasonScoredAVG_home || 0,
      awayGoalsForPerMatch: stats.seasonScoredAVG_away || 0,
      homeGoalsAgainstPerMatch: stats.seasonConcededAVG_home || 0,
      awayGoalsAgainstPerMatch: stats.seasonConcededAVG_away || 0,

      // Corners
      cornersAVG: stats.cornersAVG_overall || 0,
      cornersAgainstAVG: stats.cornersAgainstAVG_overall || 0,
      cornersTotalAVG: stats.cornersTotalAVG_overall || 0,
      cornersEarnedPerMatch: stats.cornersAVG_overall || 0,
      cornersAgainstPerMatch: stats.cornersAgainstAVG_overall || 0,
      totalCornersPerMatch: stats.cornersTotalAVG_overall || 0,
      homeCornersAVG: stats.cornersAVG_home || 0,
      homeCornersAgainstAVG: stats.cornersAgainstAVG_home || 0,
      homeCornersTotalAVG: stats.cornersTotalAVG_home || 0,
      awayCornersAVG: stats.cornersAVG_away || 0,
      awayCornersAgainstAVG: stats.cornersAgainstAVG_away || 0,
      awayCornersTotalAVG: stats.cornersTotalAVG_away || 0,
      // Corners Over statistics - Overall
      cornersOver65: stats.over65CornersPercentage_overall || 0,
      cornersOver75: stats.over75CornersPercentage_overall || 0,
      cornersOver85: stats.over85CornersPercentage_overall || 0,
      over95Corners: stats.over95CornersPercentage_overall || 0,
      over105Corners: stats.over105CornersPercentage_overall || 0,
      cornersOver115: stats.over115CornersPercentage_overall || 0,
      cornersOver125: stats.over125CornersPercentage_overall || 0,
      cornersOver135: stats.over135CornersPercentage_overall || 0,

      // Team-specific corner FOR statistics
      over25CornersForPercentage_overall: stats.over25CornersForPercentage_overall || 0,
      over35CornersForPercentage_overall: stats.over35CornersForPercentage_overall || 0,
      over45CornersForPercentage_overall: stats.over45CornersForPercentage_overall || 0,
      over55CornersForPercentage_overall: stats.over55CornersForPercentage_overall || 0,
      over65CornersForPercentage_overall: stats.over65CornersForPercentage_overall || 0,
      over75CornersForPercentage_overall: stats.over75CornersForPercentage_overall || 0,
      over85CornersForPercentage_overall: stats.over85CornersForPercentage_overall || 0,

      over25CornersForPercentage_home: stats.over25CornersForPercentage_home || 0,
      over35CornersForPercentage_home: stats.over35CornersForPercentage_home || 0,
      over45CornersForPercentage_home: stats.over45CornersForPercentage_home || 0,
      over55CornersForPercentage_home: stats.over55CornersForPercentage_home || 0,
      over65CornersForPercentage_home: stats.over65CornersForPercentage_home || 0,
      over75CornersForPercentage_home: stats.over75CornersForPercentage_home || 0,
      over85CornersForPercentage_home: stats.over85CornersForPercentage_home || 0,

      over25CornersForPercentage_away: stats.over25CornersForPercentage_away || 0,
      over35CornersForPercentage_away: stats.over35CornersForPercentage_away || 0,
      over45CornersForPercentage_away: stats.over45CornersForPercentage_away || 0,
      over55CornersForPercentage_away: stats.over55CornersForPercentage_away || 0,
      over65CornersForPercentage_away: stats.over65CornersForPercentage_away || 0,
      over75CornersForPercentage_away: stats.over75CornersForPercentage_away || 0,
      over85CornersForPercentage_away: stats.over85CornersForPercentage_away || 0,

      // Team-specific corner AGAINST statistics
      over25CornersAgainstPercentage_overall: stats.over25CornersAgainstPercentage_overall || 0,
      over35CornersAgainstPercentage_overall: stats.over35CornersAgainstPercentage_overall || 0,
      over45CornersAgainstPercentage_overall: stats.over45CornersAgainstPercentage_overall || 0,
      over55CornersAgainstPercentage_overall: stats.over55CornersAgainstPercentage_overall || 0,
      over65CornersAgainstPercentage_overall: stats.over65CornersAgainstPercentage_overall || 0,
      over75CornersAgainstPercentage_overall: stats.over75CornersAgainstPercentage_overall || 0,
      over85CornersAgainstPercentage_overall: stats.over85CornersAgainstPercentage_overall || 0,

      over25CornersAgainstPercentage_home: stats.over25CornersAgainstPercentage_home || 0,
      over35CornersAgainstPercentage_home: stats.over35CornersAgainstPercentage_home || 0,
      over45CornersAgainstPercentage_home: stats.over45CornersAgainstPercentage_home || 0,
      over55CornersAgainstPercentage_home: stats.over55CornersAgainstPercentage_home || 0,
      over65CornersAgainstPercentage_home: stats.over65CornersAgainstPercentage_home || 0,
      over75CornersAgainstPercentage_home: stats.over75CornersAgainstPercentage_home || 0,
      over85CornersAgainstPercentage_home: stats.over85CornersAgainstPercentage_home || 0,

      over25CornersAgainstPercentage_away: stats.over25CornersAgainstPercentage_away || 0,
      over35CornersAgainstPercentage_away: stats.over35CornersAgainstPercentage_away || 0,
      over45CornersAgainstPercentage_away: stats.over45CornersAgainstPercentage_away || 0,
      over55CornersAgainstPercentage_away: stats.over55CornersAgainstPercentage_away || 0,
      over65CornersAgainstPercentage_away: stats.over65CornersAgainstPercentage_away || 0,
      over75CornersAgainstPercentage_away: stats.over75CornersAgainstPercentage_away || 0,
      over85CornersAgainstPercentage_away: stats.over85CornersAgainstPercentage_away || 0,

      // Overall corner over statistics (same values, different property names)
      over65CornersPercentage_overall: stats.over65CornersPercentage_overall || 0,
      over75CornersPercentage_overall: stats.over75CornersPercentage_overall || 0,
      over85CornersPercentage_overall: stats.over85CornersPercentage_overall || 0,
      over95CornersPercentage_overall: stats.over95CornersPercentage_overall || 0,
      over105CornersPercentage_overall: stats.over105CornersPercentage_overall || 0,
      over115CornersPercentage_overall: stats.over115CornersPercentage_overall || 0,
      over125CornersPercentage_overall: stats.over125CornersPercentage_overall || 0,
      over135CornersPercentage_overall: stats.over135CornersPercentage_overall || 0,

      // Home corner over statistics
      over65CornersPercentage_home: stats.over65CornersPercentage_home || 0,
      over75CornersPercentage_home: stats.over75CornersPercentage_home || 0,
      over85CornersPercentage_home: stats.over85CornersPercentage_home || 0,
      over95CornersPercentage_home: stats.over95CornersPercentage_home || 0,
      over105CornersPercentage_home: stats.over105CornersPercentage_home || 0,
      over115CornersPercentage_home: stats.over115CornersPercentage_home || 0,
      over125CornersPercentage_home: stats.over125CornersPercentage_home || 0,
      over135CornersPercentage_home: stats.over135CornersPercentage_home || 0,

      // Away corner over statistics
      over65CornersPercentage_away: stats.over65CornersPercentage_away || 0,
      over75CornersPercentage_away: stats.over75CornersPercentage_away || 0,
      over85CornersPercentage_away: stats.over85CornersPercentage_away || 0,
      over95CornersPercentage_away: stats.over95CornersPercentage_away || 0,
      over105CornersPercentage_away: stats.over105CornersPercentage_away || 0,
      over115CornersPercentage_away: stats.over115CornersPercentage_away || 0,
      over125CornersPercentage_away: stats.over125CornersPercentage_away || 0,
      over135CornersPercentage_away: stats.over135CornersPercentage_away || 0,

      // Corner additional statistics
      corners1H_AVG_overall:
        stats.corners1H_AVG_overall || additionalInfo.corners1H_AVG_overall || 0,
      corners2H_AVG_overall:
        stats.corners2H_AVG_overall || additionalInfo.corners2H_AVG_overall || 0,
      corners1H_AVG_home: stats.corners1H_AVG_home || additionalInfo.corners1H_AVG_home || 0,
      corners2H_AVG_home: stats.corners2H_AVG_home || additionalInfo.corners2H_AVG_home || 0,
      corners1H_AVG_away: stats.corners1H_AVG_away || additionalInfo.corners1H_AVG_away || 0,
      corners2H_AVG_away: stats.corners2H_AVG_away || additionalInfo.corners2H_AVG_away || 0,

      cornerDrawPercentage_overall:
        stats.cornerDrawPercentage_overall || additionalInfo.cornerDrawPercentage_overall || 0,
      cornerDrawPercentage_home:
        stats.cornerDrawPercentage_home || additionalInfo.cornerDrawPercentage_home || 0,
      cornerDrawPercentage_away:
        stats.cornerDrawPercentage_away || additionalInfo.cornerDrawPercentage_away || 0,

      winMostCornersPercentage_overall:
        additionalInfo.team_with_most_corners_win_percentage_overall ||
        stats.team_with_most_corners_win_percentage_overall ||
        stats.winMostCornersPercentage_overall ||
        additionalInfo.winMostCornersPercentage_overall ||
        0,
      winMostCornersPercentage_home:
        additionalInfo.team_with_most_corners_win_percentage_home ||
        stats.team_with_most_corners_win_percentage_home ||
        stats.winMostCornersPercentage_home ||
        additionalInfo.winMostCornersPercentage_home ||
        0,
      winMostCornersPercentage_away:
        additionalInfo.team_with_most_corners_win_percentage_away ||
        stats.team_with_most_corners_win_percentage_away ||
        stats.winMostCornersPercentage_away ||
        additionalInfo.winMostCornersPercentage_away ||
        0,

      loseMostCornersPercentage_overall:
        stats.loseMostCornersPercentage_overall ||
        additionalInfo.loseMostCornersPercentage_overall ||
        0,
      loseMostCornersPercentage_home:
        stats.loseMostCornersPercentage_home || additionalInfo.loseMostCornersPercentage_home || 0,
      loseMostCornersPercentage_away:
        stats.loseMostCornersPercentage_away || additionalInfo.loseMostCornersPercentage_away || 0,

      corners04Percentage_overall:
        stats.corners04Percentage_overall || additionalInfo.corners04Percentage_overall || 0,
      corners04Percentage_home:
        stats.corners04Percentage_home || additionalInfo.corners04Percentage_home || 0,
      corners04Percentage_away:
        stats.corners04Percentage_away || additionalInfo.corners04Percentage_away || 0,

      corners56Percentage_overall:
        stats.corners56Percentage_overall || additionalInfo.corners56Percentage_overall || 0,
      corners56Percentage_home:
        stats.corners56Percentage_home || additionalInfo.corners56Percentage_home || 0,
      corners56Percentage_away:
        stats.corners56Percentage_away || additionalInfo.corners56Percentage_away || 0,

      corners78Percentage_overall:
        stats.corners78Percentage_overall || additionalInfo.corners78Percentage_overall || 0,
      corners78Percentage_home:
        stats.corners78Percentage_home || additionalInfo.corners78Percentage_home || 0,
      corners78Percentage_away:
        stats.corners78Percentage_away || additionalInfo.corners78Percentage_away || 0,

      corners910Percentage_overall:
        stats.corners910Percentage_overall || additionalInfo.corners910Percentage_overall || 0,
      corners910Percentage_home:
        stats.corners910Percentage_home || additionalInfo.corners910Percentage_home || 0,
      corners910Percentage_away:
        stats.corners910Percentage_away || additionalInfo.corners910Percentage_away || 0,

      corners11PlusPercentage_overall:
        stats.corners11PlusPercentage_overall ||
        additionalInfo.corners11PlusPercentage_overall ||
        0,
      corners11PlusPercentage_home:
        stats.corners11PlusPercentage_home || additionalInfo.corners11PlusPercentage_home || 0,
      corners11PlusPercentage_away:
        stats.corners11PlusPercentage_away || additionalInfo.corners11PlusPercentage_away || 0,

      // Cards - Using available API fields
      totalCards: stats.cardsTotal_overall || 0,
      cardsPerMatch: stats.cardsAVG_overall || 0,
      homeCards: stats.cardsTotal_home || 0,
      awayCards: stats.cardsTotal_away || 0,
      homeCardsPerMatch: stats.cardsAVG_home || 0,
      awayCardsPerMatch: stats.cardsAVG_away || 0,
      cardsHighest: stats.cardsHighest_overall || 0,
      cardsLowest: stats.cardsLowest_overall || 0,

      // Cards For/Against - From additional_info
      cardsFor: additionalInfo.cards_for || additionalInfo.cards_for_overall || 0,
      cardsAgainst: additionalInfo.cards_against || additionalInfo.cards_against_overall || 0,
      cardsForPerMatch: additionalInfo.cards_for_avg || additionalInfo.cards_for_avg_overall || 0,
      cardsAgainstPerMatch:
        additionalInfo.cards_against_avg || additionalInfo.cards_against_avg_overall || 0,

      // Home/Away Cards For/Against
      homeCardsFor: additionalInfo.cards_for_home || 0,
      homeCardsAgainst: additionalInfo.cards_against_home || 0,
      awayCardsFor: additionalInfo.cards_for_away || 0,
      awayCardsAgainst: additionalInfo.cards_against_away || 0,

      // Cards For Over Percentages
      over05CardsForPercentage:
        stats.over05CardsForPercentage_overall ||
        additionalInfo.over05CardsForPercentage_overall ||
        additionalInfo.over05_cards_for_percentage ||
        0,
      over15CardsForPercentage:
        stats.over15CardsForPercentage_overall ||
        additionalInfo.over15_cards_for_percentage || 
        additionalInfo.over15CardsForPercentage || 
        0,
      over25CardsForPercentage:
        stats.over25CardsForPercentage_overall ||
        additionalInfo.over25_cards_for_percentage || 
        additionalInfo.over25CardsForPercentage || 
        0,
      over35CardsForPercentage:
        stats.over35CardsForPercentage_overall ||
        additionalInfo.over35_cards_for_percentage || 
        additionalInfo.over35CardsForPercentage || 
        0,
      over45CardsForPercentage:
        stats.over45CardsForPercentage_overall ||
        additionalInfo.over45_cards_for_percentage || 
        additionalInfo.over45CardsForPercentage || 
        0,
      over55CardsForPercentage:
        stats.over55CardsForPercentage_overall ||
        additionalInfo.over55_cards_for_percentage || 
        additionalInfo.over55CardsForPercentage || 
        0,
      over65CardsForPercentage:
        stats.over65CardsForPercentage_overall ||
        additionalInfo.over65_cards_for_percentage || 
        additionalInfo.over65CardsForPercentage || 
        0,

      // Cards Against Over Percentages
      over05CardsAgainstPercentage:
        stats.over05CardsAgainstPercentage_overall ||
        additionalInfo.over05_cards_against_percentage ||
        additionalInfo.over05CardsAgainstPercentage ||
        0,
      over15CardsAgainstPercentage:
        stats.over15CardsAgainstPercentage_overall ||
        additionalInfo.over15_cards_against_percentage ||
        additionalInfo.over15CardsAgainstPercentage ||
        0,
      over25CardsAgainstPercentage:
        stats.over25CardsAgainstPercentage_overall ||
        additionalInfo.over25_cards_against_percentage ||
        additionalInfo.over25CardsAgainstPercentage ||
        0,
      over35CardsAgainstPercentage:
        stats.over35CardsAgainstPercentage_overall ||
        additionalInfo.over35_cards_against_percentage ||
        additionalInfo.over35CardsAgainstPercentage ||
        0,
      over45CardsAgainstPercentage:
        stats.over45CardsAgainstPercentage_overall ||
        additionalInfo.over45_cards_against_percentage ||
        additionalInfo.over45CardsAgainstPercentage ||
        0,
      over55CardsAgainstPercentage:
        stats.over55CardsAgainstPercentage_overall ||
        additionalInfo.over55_cards_against_percentage ||
        additionalInfo.over55CardsAgainstPercentage ||
        0,
      over65CardsAgainstPercentage:
        stats.over65CardsAgainstPercentage_overall ||
        additionalInfo.over65_cards_against_percentage ||
        additionalInfo.over65CardsAgainstPercentage ||
        0,

      // Home Cards For/Against Over Percentages
      homeOver05CardsForPercentage:
        stats.over05CardsForPercentage_home ||
        additionalInfo.over05CardsForPercentage_home ||
        additionalInfo.over05_cards_for_percentage_home ||
        0,
      homeOver15CardsForPercentage: 
        stats.over15CardsForPercentage_home ||
        additionalInfo.over15_cards_for_percentage_home || 
        0,
      homeOver25CardsForPercentage: 
        stats.over25CardsForPercentage_home ||
        additionalInfo.over25_cards_for_percentage_home || 
        0,
      homeOver35CardsForPercentage: 
        stats.over35CardsForPercentage_home ||
        additionalInfo.over35_cards_for_percentage_home || 
        0,
      homeOver45CardsForPercentage: 
        stats.over45CardsForPercentage_home ||
        additionalInfo.over45_cards_for_percentage_home || 
        0,
      homeOver55CardsForPercentage: 
        stats.over55CardsForPercentage_home ||
        additionalInfo.over55_cards_for_percentage_home || 
        0,
      homeOver65CardsForPercentage: 
        stats.over65CardsForPercentage_home ||
        additionalInfo.over65_cards_for_percentage_home || 
        0,

      homeOver05CardsAgainstPercentage: 
        stats.over05CardsAgainstPercentage_home ||
        additionalInfo.over05_cards_against_percentage_home || 
        0,
      homeOver15CardsAgainstPercentage: 
        stats.over15CardsAgainstPercentage_home ||
        additionalInfo.over15_cards_against_percentage_home || 
        0,
      homeOver25CardsAgainstPercentage: 
        stats.over25CardsAgainstPercentage_home ||
        additionalInfo.over25_cards_against_percentage_home || 
        0,
      homeOver35CardsAgainstPercentage: 
        stats.over35CardsAgainstPercentage_home ||
        additionalInfo.over35_cards_against_percentage_home || 
        0,

      // Away Cards For/Against Over Percentages
      awayOver05CardsForPercentage:
        stats.over05CardsForPercentage_away ||
        additionalInfo.over05CardsForPercentage_away ||
        additionalInfo.over05_cards_for_percentage_away ||
        0,
      awayOver15CardsForPercentage: 
        stats.over15CardsForPercentage_away ||
        additionalInfo.over15_cards_for_percentage_away || 
        0,
      awayOver25CardsForPercentage: 
        stats.over25CardsForPercentage_away ||
        additionalInfo.over25_cards_for_percentage_away || 
        0,
      awayOver35CardsForPercentage: 
        stats.over35CardsForPercentage_away ||
        additionalInfo.over35_cards_for_percentage_away || 
        0,
      awayOver45CardsForPercentage: 
        stats.over45CardsForPercentage_away ||
        additionalInfo.over45_cards_for_percentage_away || 
        0,
      awayOver55CardsForPercentage: 
        stats.over55CardsForPercentage_away ||
        additionalInfo.over55_cards_for_percentage_away || 
        0,
      awayOver65CardsForPercentage: 
        stats.over65CardsForPercentage_away ||
        additionalInfo.over65_cards_for_percentage_away || 
        0,

      awayOver05CardsAgainstPercentage: 
        stats.over05CardsAgainstPercentage_away ||
        additionalInfo.over05_cards_against_percentage_away || 
        0,
      awayOver15CardsAgainstPercentage: 
        stats.over15CardsAgainstPercentage_away ||
        additionalInfo.over15_cards_against_percentage_away || 
        0,
      awayOver25CardsAgainstPercentage: 
        stats.over25CardsAgainstPercentage_away ||
        additionalInfo.over25_cards_against_percentage_away || 
        0,
      awayOver35CardsAgainstPercentage: 
        stats.over35CardsAgainstPercentage_away ||
        additionalInfo.over35_cards_against_percentage_away || 
        0,

      // Card Over statistics - Overall
      cardsOver05:
        stats.over05CardsPercentage_overall ||
        additionalInfo.over05_cards_percentage ||
        additionalInfo.over_05_cards_percentage ||
        0,
      cardsOver15:
        stats.over15CardsPercentage_overall ||
        additionalInfo.over15_cards_percentage ||
        additionalInfo.over_15_cards_percentage ||
        0,
      cardsOver25:
        stats.over25CardsPercentage_overall ||
        additionalInfo.over25_cards_percentage ||
        additionalInfo.over_25_cards_percentage ||
        0,
      cardsOver35:
        stats.over35CardsPercentage_overall ||
        additionalInfo.over35_cards_percentage ||
        additionalInfo.over_35_cards_percentage ||
        0,
      cardsOver45:
        stats.over45CardsPercentage_overall ||
        additionalInfo.over45_cards_percentage ||
        additionalInfo.over_45_cards_percentage ||
        0,
      cardsOver55:
        stats.over55CardsPercentage_overall ||
        additionalInfo.over55_cards_percentage ||
        additionalInfo.over_55_cards_percentage ||
        0,

      // Card Over statistics - Home
      homeCardsOver05:
        stats.over05CardsPercentage_home ||
        additionalInfo.over05_cards_percentage_home ||
        additionalInfo.over_05_cards_percentage_home ||
        0,
      homeCardsOver15:
        stats.over15CardsPercentage_home ||
        additionalInfo.over15_cards_percentage_home ||
        additionalInfo.over_15_cards_percentage_home ||
        0,
      homeCardsOver25:
        stats.over25CardsPercentage_home ||
        additionalInfo.over25_cards_percentage_home ||
        additionalInfo.over_25_cards_percentage_home ||
        0,
      homeCardsOver35:
        stats.over35CardsPercentage_home ||
        additionalInfo.over35_cards_percentage_home ||
        additionalInfo.over_35_cards_percentage_home ||
        0,
      homeCardsOver45:
        stats.over45CardsPercentage_home ||
        additionalInfo.over45_cards_percentage_home ||
        additionalInfo.over_45_cards_percentage_home ||
        0,
      homeCardsOver55:
        stats.over55CardsPercentage_home ||
        additionalInfo.over55_cards_percentage_home ||
        additionalInfo.over_55_cards_percentage_home ||
        0,

      // Card Over statistics - Away
      awayCardsOver05:
        stats.over05CardsPercentage_away ||
        additionalInfo.over05_cards_percentage_away ||
        additionalInfo.over_05_cards_percentage_away ||
        0,
      awayCardsOver15:
        stats.over15CardsPercentage_away ||
        additionalInfo.over15_cards_percentage_away ||
        additionalInfo.over_15_cards_percentage_away ||
        0,
      awayCardsOver25:
        stats.over25CardsPercentage_away ||
        additionalInfo.over25_cards_percentage_away ||
        additionalInfo.over_25_cards_percentage_away ||
        0,
      awayCardsOver35:
        stats.over35CardsPercentage_away ||
        additionalInfo.over35_cards_percentage_away ||
        additionalInfo.over_35_cards_percentage_away ||
        0,
      awayCardsOver45:
        stats.over45CardsPercentage_away ||
        additionalInfo.over45_cards_percentage_away ||
        additionalInfo.over_45_cards_percentage_away ||
        0,
      awayCardsOver55:
        stats.over55CardsPercentage_away ||
        additionalInfo.over55_cards_percentage_away ||
        additionalInfo.over_55_cards_percentage_away ||
        0,

      // 1st Half & 2nd Half Cards
      cards1H_AVG_overall: additionalInfo.fh_cards_total_avg_overall || stats.cards_1h_avg_overall || stats.cards1H_AVG_overall || 0,
      cards1H_AVG_home: additionalInfo.fh_cards_total_avg_home || stats.cards_1h_avg_home || stats.cards1H_AVG_home || 0,
      cards1H_AVG_away: additionalInfo.fh_cards_total_avg_away || stats.cards_1h_avg_away || stats.cards1H_AVG_away || 0,
      cards2H_AVG_overall: additionalInfo['2h_cards_total_avg_overall'] || stats.cards_2h_avg_overall || stats.cards2H_AVG_overall || 0,
      cards2H_AVG_home: additionalInfo['2h_cards_total_avg_home'] || stats.cards_2h_avg_home || stats.cards2H_AVG_home || 0,
      cards2H_AVG_away: additionalInfo['2h_cards_total_avg_away'] || stats.cards_2h_avg_away || stats.cards2H_AVG_away || 0,

      // 1st Half Cards Over percentages (DEPRECATED - Using under2/2to3/over3 format now)
      // cards1H_over05_percentage_overall: stats.cards_1h_over05_percentage_overall || 0,
      // cards1H_over15_percentage_overall: stats.cards_1h_over15_percentage_overall || 0,
      // cards1H_over25_percentage_overall: stats.cards_1h_over25_percentage_overall || 0,
      // cards1H_over05_percentage_home: stats.cards_1h_over05_percentage_home || 0,
      // cards1H_over15_percentage_home: stats.cards_1h_over15_percentage_home || 0,
      // cards1H_over25_percentage_home: stats.cards_1h_over25_percentage_home || 0,
      // cards1H_over05_percentage_away: stats.cards_1h_over05_percentage_away || 0,
      // cards1H_over15_percentage_away: stats.cards_1h_over15_percentage_away || 0,
      // cards1H_over25_percentage_away: stats.cards_1h_over25_percentage_away || 0,

      // 1st Half Cards Under/Between/Over ranges
      cards1H_under2_percentage_overall:
        additionalInfo.fh_total_cards_under2_percentage_overall ||
        stats.fh_total_cards_under2_percentage_overall ||
        stats.cards1H_under2_percentage ||
        0,
      cards1H_2to3_percentage_overall:
        additionalInfo.fh_total_cards_2to3_percentage_overall ||
        stats.fh_total_cards_2to3_percentage_overall ||
        stats.cards1H_2to3_percentage ||
        0,
      cards1H_over3_percentage_overall:
        additionalInfo.fh_total_cards_over3_percentage_overall ||
        stats.fh_total_cards_over3_percentage_overall ||
        stats.cards1H_over3_percentage ||
        0,
      cards1H_under2_percentage_home:
        additionalInfo.fh_total_cards_under2_percentage_home ||
        stats.fh_total_cards_under2_percentage_home ||
        stats.homeCards1H_under2_percentage ||
        0,
      cards1H_2to3_percentage_home:
        additionalInfo.fh_total_cards_2to3_percentage_home ||
        stats.fh_total_cards_2to3_percentage_home ||
        stats.homeCards1H_2to3_percentage ||
        0,
      cards1H_over3_percentage_home:
        additionalInfo.fh_total_cards_over3_percentage_home ||
        stats.fh_total_cards_over3_percentage_home ||
        stats.homeCards1H_over3_percentage ||
        0,
      cards1H_under2_percentage_away:
        additionalInfo.fh_total_cards_under2_percentage_away ||
        stats.fh_total_cards_under2_percentage_away ||
        stats.awayCards1H_under2_percentage ||
        0,
      cards1H_2to3_percentage_away:
        additionalInfo.fh_total_cards_2to3_percentage_away ||
        stats.fh_total_cards_2to3_percentage_away ||
        stats.awayCards1H_2to3_percentage ||
        0,
      cards1H_over3_percentage_away:
        additionalInfo.fh_total_cards_over3_percentage_away ||
        stats.fh_total_cards_over3_percentage_away ||
        stats.awayCards1H_over3_percentage ||
        0,

      // 2nd Half Cards Over percentages (DEPRECATED - Using under2/2to3/over3 format now)
      // cards2H_over05_percentage_overall: stats.cards_2h_over05_percentage_overall || 0,
      // cards2H_over15_percentage_overall: stats.cards_2h_over15_percentage_overall || 0,
      // cards2H_over25_percentage_overall: stats.cards_2h_over25_percentage_overall || 0,
      // cards2H_over05_percentage_home: stats.cards_2h_over05_percentage_home || 0,
      // cards2H_over15_percentage_home: stats.cards_2h_over15_percentage_home || 0,
      // cards2H_over25_percentage_home: stats.cards_2h_over25_percentage_home || 0,
      // cards2H_over05_percentage_away: stats.cards_2h_over05_percentage_away || 0,
      // cards2H_over15_percentage_away: stats.cards_2h_over15_percentage_away || 0,
      // cards2H_over25_percentage_away: stats.cards_2h_over25_percentage_away || 0,

      // 2nd Half Cards Under/Between/Over ranges
      cards2H_under2_percentage_overall:
        additionalInfo['2h_total_cards_under2_percentage_overall'] ||
        stats['2h_total_cards_under2_percentage_overall'] ||
        stats.cards2H_under2_percentage ||
        0,
      cards2H_2to3_percentage_overall:
        additionalInfo['2h_total_cards_2to3_percentage_overall'] ||
        stats['2h_total_cards_2to3_percentage_overall'] ||
        stats.cards2H_2to3_percentage ||
        0,
      cards2H_over3_percentage_overall:
        additionalInfo['2h_total_cards_over3_percentage_overall'] ||
        stats['2h_total_cards_over3_percentage_overall'] ||
        stats.cards2H_over3_percentage ||
        0,
      cards2H_under2_percentage_home:
        additionalInfo['2h_total_cards_under2_percentage_home'] ||
        stats['2h_total_cards_under2_percentage_home'] ||
        stats.homeCards2H_under2_percentage ||
        0,
      cards2H_2to3_percentage_home:
        additionalInfo['2h_total_cards_2to3_percentage_home'] ||
        stats['2h_total_cards_2to3_percentage_home'] ||
        stats.homeCards2H_2to3_percentage ||
        0,
      cards2H_over3_percentage_home:
        additionalInfo['2h_total_cards_over3_percentage_home'] ||
        stats['2h_total_cards_over3_percentage_home'] ||
        stats.homeCards2H_over3_percentage ||
        0,
      cards2H_under2_percentage_away:
        additionalInfo['2h_total_cards_under2_percentage_away'] ||
        stats['2h_total_cards_under2_percentage_away'] ||
        stats.awayCards2H_under2_percentage ||
        0,
      cards2H_2to3_percentage_away:
        additionalInfo['2h_total_cards_2to3_percentage_away'] ||
        stats['2h_total_cards_2to3_percentage_away'] ||
        stats.awayCards2H_2to3_percentage ||
        0,
      cards2H_over3_percentage_away:
        additionalInfo['2h_total_cards_over3_percentage_away'] ||
        stats['2h_total_cards_over3_percentage_away'] ||
        stats.awayCards2H_over3_percentage ||
        0,

      // Highest cards in halves
      cardsHighest1H_overall: stats.cards_1h_highest_overall || stats.cardsHighest1H_overall || 0,
      cardsHighest1H_home: stats.cards_1h_highest_home || stats.cardsHighest1H_home || 0,
      cardsHighest1H_away: stats.cards_1h_highest_away || stats.cardsHighest1H_away || 0,
      cardsHighest2H_overall: stats.cards_2h_highest_overall || stats.cardsHighest2H_overall || 0,
      cardsHighest2H_home: stats.cards_2h_highest_home || stats.cardsHighest2H_home || 0,
      cardsHighest2H_away: stats.cards_2h_highest_away || stats.cardsHighest2H_away || 0,

      // Lowest cards
      cardsLowest_home: stats.cardsLowest_home || 0,
      cardsLowest_away: stats.cardsLowest_away || 0,
      cardsVsOpponents: additionalInfo.cards_vs_opponents_overall || 0,
      cleanGames: additionalInfo.clean_games_percentage_overall || 0,
      multipleCardsGames: additionalInfo.multiple_cards_games_percentage_overall || 0,
      earlyCards: additionalInfo.early_cards_overall || 0,
      lateCards: additionalInfo.late_cards_overall || 0,
      cardsInWins: additionalInfo.cards_in_wins_overall || 0,
      cardsInLosses: additionalInfo.cards_in_losses_overall || 0,

      // Possession
      possessionPercentage: stats.possessionAVG_overall || 0,
      homePossessionPercentage: stats.possessionAVG_home || 0,
      awayPossessionPercentage: stats.possessionAVG_away || 0,

      // Penalties
      penaltiesWon: additionalInfo.penalties_won_overall || 0,
      penaltiesConceded: additionalInfo.penalties_conceded_overall || 0,
      homePenaltiesWon: additionalInfo.penalties_won_home || 0,
      awayPenaltiesWon: additionalInfo.penalties_won_away || 0,
      homePenaltiesConceded: additionalInfo.penalties_conceded_home || 0,
      awayPenaltiesConceded: additionalInfo.penalties_conceded_away || 0,
      penalty_in_a_match_percentage_overall:
        additionalInfo.penalty_in_a_match_percentage_overall || 0,
      penalty_in_a_match_percentage_home: additionalInfo.penalty_in_a_match_percentage_home || 0,
      penalty_in_a_match_percentage_away: additionalInfo.penalty_in_a_match_percentage_away || 0,

      // Form
      recentForm: additionalInfo.formRun_overall || stats.formRun_overall || '',
      homeForm: additionalInfo.formRun_home || stats.formRun_home || '',
      awayForm: additionalInfo.formRun_away || stats.formRun_away || '',

      // Additional stats
      predictionRisk: stats.risk || 0,
      homeAdvantagePercentage: additionalInfo.home_advantage_percentage || 0,
      bigChancesCreated: additionalInfo.big_chances_created_overall || 0,
      bigChancesMissed: additionalInfo.big_chances_missed_overall || 0,

      // Halftime / First Half Stats
      // HT Results
      leadingAtHT_overall: stats.leadingAtHT_overall || 0,
      leadingAtHT_home: stats.leadingAtHT_home || 0,
      leadingAtHT_away: stats.leadingAtHT_away || 0,
      leadingAtHTPercentage_overall: stats.leadingAtHTPercentage_overall || 0,
      leadingAtHTPercentage_home: stats.leadingAtHTPercentage_home || 0,
      leadingAtHTPercentage_away: stats.leadingAtHTPercentage_away || 0,

      drawingAtHT_overall: stats.drawingAtHT_overall || 0,
      drawingAtHT_home: stats.drawingAtHT_home || 0,
      drawingAtHT_away: stats.drawingAtHT_away || 0,
      drawingAtHTPercentage_overall: stats.drawingAtHTPercentage_overall || 0,
      drawingAtHTPercentage_home: stats.drawingAtHTPercentage_home || 0,
      drawingAtHTPercentage_away: stats.drawingAtHTPercentage_away || 0,

      trailingAtHT_overall: stats.trailingAtHT_overall || 0,
      trailingAtHT_home: stats.trailingAtHT_home || 0,
      trailingAtHT_away: stats.trailingAtHT_away || 0,
      trailingAtHTPercentage_overall: stats.trailingAtHTPercentage_overall || 0,
      trailingAtHTPercentage_home: stats.trailingAtHTPercentage_home || 0,
      trailingAtHTPercentage_away: stats.trailingAtHTPercentage_away || 0,

      // HT Goals
      scoredGoalsHT_overall: stats.scoredGoalsHT_overall || 0,
      scoredGoalsHT_home: stats.scoredGoalsHT_home || 0,
      scoredGoalsHT_away: stats.scoredGoalsHT_away || 0,
      concededGoalsHT_overall: stats.concededGoalsHT_overall || 0,
      concededGoalsHT_home: stats.concededGoalsHT_home || 0,
      concededGoalsHT_away: stats.concededGoalsHT_away || 0,

      scoredAVGHT_overall: stats.scoredAVGHT_overall || 0,
      scoredAVGHT_home: stats.scoredAVGHT_home || 0,
      scoredAVGHT_away: stats.scoredAVGHT_away || 0,
      
      // Alternative field names for 1st Half Goals Average (for compatibility with goals-display.js)
      firstHalfGoalsAVG_overall: stats.scoredAVGHT_overall || 0,
      firstHalfGoalsAVG_home: stats.scoredAVGHT_home || 0,
      firstHalfGoalsAVG_away: stats.scoredAVGHT_away || 0,
      
      // First Half Failed To Score (FTSHT) - IMPORTANT FOR GOALS DISPLAY
      seasonFTSHT_overall: stats.seasonFTSHT_overall || additionalInfo.seasonFTSHT_overall || 0,
      seasonFTSHT_home: stats.seasonFTSHT_home || additionalInfo.seasonFTSHT_home || 0,
      seasonFTSHT_away: stats.seasonFTSHT_away || additionalInfo.seasonFTSHT_away || 0,
      
      // Second Half Failed To Score (FTS2H)
      seasonFTS2H_overall: stats.fts_2hg_overall || additionalInfo.fts_2hg_overall || 0,
      seasonFTS2H_home: stats.fts_2hg_home || additionalInfo.fts_2hg_home || 0,
      seasonFTS2H_away: stats.fts_2hg_away || additionalInfo.fts_2hg_away || 0,
      concededAVGHT_overall: stats.concededAVGHT_overall || 0,
      concededAVGHT_home: stats.concededAVGHT_home || 0,
      concededAVGHT_away: stats.concededAVGHT_away || 0,

      // HT Clean Sheets & Failed to Score
      seasonCSHT_overall: stats.seasonCSHT_overall || 0,
      seasonCSHT_home: stats.seasonCSHT_home || 0,
      seasonCSHT_away: stats.seasonCSHT_away || 0,
      seasonCSPercentageHT_overall: stats.seasonCSPercentageHT_overall || 0,
      seasonCSPercentageHT_home: stats.seasonCSPercentageHT_home || 0,
      seasonCSPercentageHT_away: stats.seasonCSPercentageHT_away || 0,

      // 2H Clean Sheet percentages
      cs_2hg_percentage_overall:
        stats.cs_2hg_percentage_overall || additionalInfo.cs_2hg_percentage_overall || 0,
      cs_2hg_percentage_home:
        stats.cs_2hg_percentage_home || additionalInfo.cs_2hg_percentage_home || 0,
      cs_2hg_percentage_away:
        stats.cs_2hg_percentage_away || additionalInfo.cs_2hg_percentage_away || 0,

      seasonFTSHT_overall: stats.seasonFTSHT_overall || 0,
      seasonFTSHT_home: stats.seasonFTSHT_home || 0,
      seasonFTSHT_away: stats.seasonFTSHT_away || 0,
      seasonFTSPercentageHT_overall: stats.seasonFTSPercentageHT_overall || 0,
      seasonFTSPercentageHT_home: stats.seasonFTSPercentageHT_home || 0,
      seasonFTSPercentageHT_away: stats.seasonFTSPercentageHT_away || 0,

      // 2nd Half FTS percentages - API'de doğrudan ana objede olabilir
      fts_2hg_percentage_overall:
        additionalInfo.fts_2hg_percentage_overall || stats.fts_2hg_percentage_overall || 0,
      fts_2hg_percentage_home:
        additionalInfo.fts_2hg_percentage_home || stats.fts_2hg_percentage_home || 0,
      fts_2hg_percentage_away:
        additionalInfo.fts_2hg_percentage_away || stats.fts_2hg_percentage_away || 0,

      // HT BTTS
      seasonBTTSHT_overall: stats.seasonBTTSHT_overall || 0,
      seasonBTTSHT_home: stats.seasonBTTSHT_home || 0,
      seasonBTTSHT_away: stats.seasonBTTSHT_away || 0,
      seasonBTTSPercentageHT_overall: stats.seasonBTTSPercentageHT_overall || 0,
      seasonBTTSPercentageHT_home: stats.seasonBTTSPercentageHT_home || 0,
      seasonBTTSPercentageHT_away: stats.seasonBTTSPercentageHT_away || 0,

      // FT Over/Under (Full Time)
      seasonOver05Percentage_overall: stats.seasonOver05Percentage_overall || 0,
      seasonOver05Percentage_home: stats.seasonOver05Percentage_home || 0,
      seasonOver05Percentage_away: stats.seasonOver05Percentage_away || 0,
      seasonOver15Percentage_overall: stats.seasonOver15Percentage_overall || 0,
      seasonOver15Percentage_home: stats.seasonOver15Percentage_home || 0,
      seasonOver15Percentage_away: stats.seasonOver15Percentage_away || 0,
      seasonOver25Percentage_overall: stats.seasonOver25Percentage_overall || 0,
      seasonOver25Percentage_home: stats.seasonOver25Percentage_home || 0,
      seasonOver25Percentage_away: stats.seasonOver25Percentage_away || 0,
      seasonOver35Percentage_overall: stats.seasonOver35Percentage_overall || 0,
      seasonOver35Percentage_home: stats.seasonOver35Percentage_home || 0,
      seasonOver35Percentage_away: stats.seasonOver35Percentage_away || 0,
      seasonOver45Percentage_overall: stats.seasonOver45Percentage_overall || 0,
      seasonOver45Percentage_home: stats.seasonOver45Percentage_home || 0,
      seasonOver45Percentage_away: stats.seasonOver45Percentage_away || 0,

      // HT Over/Under
      seasonOver05PercentageHT_overall: stats.seasonOver05PercentageHT_overall || 0,
      seasonOver05PercentageHT_home: stats.seasonOver05PercentageHT_home || 0,
      seasonOver05PercentageHT_away: stats.seasonOver05PercentageHT_away || 0,
      seasonOver15PercentageHT_overall: stats.seasonOver15PercentageHT_overall || 0,
      seasonOver15PercentageHT_home: stats.seasonOver15PercentageHT_home || 0,
      seasonOver15PercentageHT_away: stats.seasonOver15PercentageHT_away || 0,
      seasonOver25PercentageHT_overall: stats.seasonOver25PercentageHT_overall || 0,
      seasonOver25PercentageHT_home: stats.seasonOver25PercentageHT_home || 0,
      seasonOver25PercentageHT_away: stats.seasonOver25PercentageHT_away || 0,

      // 2nd Half Over/Under
      over05_2hg_percentage_overall:
        stats.over05_2hg_percentage_overall || additionalInfo.over05_2hg_percentage_overall || 0,
      over05_2hg_percentage_home:
        stats.over05_2hg_percentage_home || additionalInfo.over05_2hg_percentage_home || 0,
      over05_2hg_percentage_away:
        stats.over05_2hg_percentage_away || additionalInfo.over05_2hg_percentage_away || 0,
      over15_2hg_percentage_overall:
        stats.over15_2hg_percentage_overall || additionalInfo.over15_2hg_percentage_overall || 0,
      over15_2hg_percentage_home:
        stats.over15_2hg_percentage_home || additionalInfo.over15_2hg_percentage_home || 0,
      over15_2hg_percentage_away:
        stats.over15_2hg_percentage_away || additionalInfo.over15_2hg_percentage_away || 0,
      over25_2hg_percentage_overall:
        stats.over25_2hg_percentage_overall || additionalInfo.over25_2hg_percentage_overall || 0,
      over25_2hg_percentage_home:
        stats.over25_2hg_percentage_home || additionalInfo.over25_2hg_percentage_home || 0,
      over25_2hg_percentage_away:
        stats.over25_2hg_percentage_away || additionalInfo.over25_2hg_percentage_away || 0,

      // Goal Timing Statistics (15-minute intervals)
      // Overall
      goals0_15: stats.goals_scored_min_0_to_15 || 0,
      goals16_30: stats.goals_scored_min_16_to_30 || 0,
      goals31_45: stats.goals_scored_min_31_to_45 || 0,
      goals46_60: stats.goals_scored_min_46_to_60 || 0,
      goals61_75: stats.goals_scored_min_61_to_75 || 0,
      goals76_90: stats.goals_scored_min_76_to_90 || 0,

      goalsConc0_15: stats.goals_conceded_min_0_to_15 || 0,
      goalsConc16_30: stats.goals_conceded_min_16_to_30 || 0,
      goalsConc31_45: stats.goals_conceded_min_31_to_45 || 0,
      goalsConc46_60: stats.goals_conceded_min_46_to_60 || 0,
      goalsConc61_75: stats.goals_conceded_min_61_to_75 || 0,
      goalsConc76_90: stats.goals_conceded_min_76_to_90 || 0,

      // Home timing
      homeGoals0_15: stats.goals_scored_min_0_to_15_home || 0,
      homeGoals16_30: stats.goals_scored_min_16_to_30_home || 0,
      homeGoals31_45: stats.goals_scored_min_31_to_45_home || 0,
      homeGoals46_60: stats.goals_scored_min_46_to_60_home || 0,
      homeGoals61_75: stats.goals_scored_min_61_to_75_home || 0,
      homeGoals76_90: stats.goals_scored_min_76_to_90_home || 0,

      homeGoalsConc0_15: stats.goals_conceded_min_0_to_15_home || 0,
      homeGoalsConc16_30: stats.goals_conceded_min_16_to_30_home || 0,
      homeGoalsConc31_45: stats.goals_conceded_min_31_to_45_home || 0,
      homeGoalsConc46_60: stats.goals_conceded_min_46_to_60_home || 0,
      homeGoalsConc61_75: stats.goals_conceded_min_61_to_75_home || 0,
      homeGoalsConc76_90: stats.goals_conceded_min_76_to_90_home || 0,

      // Away timing
      awayGoals0_15: stats.goals_scored_min_0_to_15_away || 0,
      awayGoals16_30: stats.goals_scored_min_16_to_30_away || 0,
      awayGoals31_45: stats.goals_scored_min_31_to_45_away || 0,
      awayGoals46_60: stats.goals_scored_min_46_to_60_away || 0,
      awayGoals61_75: stats.goals_scored_min_61_to_75_away || 0,
      awayGoals76_90: stats.goals_scored_min_76_to_90_away || 0,

      awayGoalsConc0_15: stats.goals_conceded_min_0_to_15_away || 0,
      awayGoalsConc16_30: stats.goals_conceded_min_16_to_30_away || 0,
      awayGoalsConc31_45: stats.goals_conceded_min_31_to_45_away || 0,
      awayGoalsConc46_60: stats.goals_conceded_min_46_to_60_away || 0,
      awayGoalsConc61_75: stats.goals_conceded_min_61_to_75_away || 0,
      awayGoalsConc76_90: stats.goals_conceded_min_76_to_90_away || 0,

      // Goals tab specific fields
      seasonScoredOver05Percentage_overall:
        stats.seasonScoredOver05Percentage_overall ||
        additionalInfo.seasonScoredOver05Percentage_overall ||
        0,
      seasonScoredOver05Percentage_home:
        stats.seasonScoredOver05Percentage_home ||
        additionalInfo.seasonScoredOver05Percentage_home ||
        0,
      seasonScoredOver05Percentage_away:
        stats.seasonScoredOver05Percentage_away ||
        additionalInfo.seasonScoredOver05Percentage_away ||
        0,
      seasonScoredOver15Percentage_overall:
        stats.seasonScoredOver15Percentage_overall ||
        additionalInfo.seasonScoredOver15Percentage_overall ||
        0,
      seasonScoredOver15Percentage_home:
        stats.seasonScoredOver15Percentage_home ||
        additionalInfo.seasonScoredOver15Percentage_home ||
        0,
      seasonScoredOver15Percentage_away:
        stats.seasonScoredOver15Percentage_away ||
        additionalInfo.seasonScoredOver15Percentage_away ||
        0,
      seasonScoredOver25Percentage_overall:
        stats.seasonScoredOver25Percentage_overall ||
        additionalInfo.seasonScoredOver25Percentage_overall ||
        0,
      seasonScoredOver25Percentage_home:
        stats.seasonScoredOver25Percentage_home ||
        additionalInfo.seasonScoredOver25Percentage_home ||
        0,
      seasonScoredOver25Percentage_away:
        stats.seasonScoredOver25Percentage_away ||
        additionalInfo.seasonScoredOver25Percentage_away ||
        0,

      scoredBothHalvesPercentage_overall:
        stats.scoredBothHalvesPercentage_overall ||
        additionalInfo.scoredBothHalvesPercentage_overall ||
        0,
      scoredBothHalvesPercentage_home:
        stats.scoredBothHalvesPercentage_home ||
        additionalInfo.scoredBothHalvesPercentage_home ||
        0,
      scoredBothHalvesPercentage_away:
        stats.scoredBothHalvesPercentage_away ||
        additionalInfo.scoredBothHalvesPercentage_away ||
        0,

      firstGoalScoredPercentage_overall:
        stats.firstGoalScoredPercentage_overall ||
        additionalInfo.firstGoalScoredPercentage_overall ||
        0,
      firstGoalScoredPercentage_home:
        stats.firstGoalScoredPercentage_home || additionalInfo.firstGoalScoredPercentage_home || 0,
      firstGoalScoredPercentage_away:
        stats.firstGoalScoredPercentage_away || additionalInfo.firstGoalScoredPercentage_away || 0,

      seasonHighestScored_overall:
        stats.seasonHighestScored_overall ||
        additionalInfo.seasonHighestScored_overall ||
        Math.max(stats.seasonHighestScored_home || 0, stats.seasonHighestScored_away || 0),
      seasonHighestScored_home:
        stats.seasonHighestScored_home || additionalInfo.seasonHighestScored_home || 0,
      seasonHighestScored_away:
        stats.seasonHighestScored_away || additionalInfo.seasonHighestScored_away || 0,
      highestScored:
        stats.seasonHighestScored_overall ||
        additionalInfo.seasonHighestScored_overall ||
        Math.max(stats.seasonHighestScored_home || 0, stats.seasonHighestScored_away || 0),

      // Scored in 1H/2H percentages
      scoredPercentageHT_overall:
        stats.scoredPercentageHT_overall || additionalInfo.scoredPercentageHT_overall || 0,
      scoredPercentageHT_home:
        stats.scoredPercentageHT_home || additionalInfo.scoredPercentageHT_home || 0,
      scoredPercentageHT_away:
        stats.scoredPercentageHT_away || additionalInfo.scoredPercentageHT_away || 0,

      scoredPercentage2H_overall:
        stats.scoredPercentage2H_overall || additionalInfo.scoredPercentage2H_overall || 0,
      scoredPercentage2H_home:
        stats.scoredPercentage2H_home || additionalInfo.scoredPercentage2H_home || 0,
      scoredPercentage2H_away:
        stats.scoredPercentage2H_away || additionalInfo.scoredPercentage2H_away || 0,

      // 1H/2H goals counts
      scored1HG_overall: stats.scored1HG_overall || additionalInfo.scored1HG_overall || 0,
      scored1HG_home: stats.scored1HG_home || additionalInfo.scored1HG_home || 0,
      scored1HG_away: stats.scored1HG_away || additionalInfo.scored1HG_away || 0,

      scored2HG_overall: stats.scored2HG_overall || additionalInfo.scored2HG_overall || 0,
      scored2HG_home: stats.scored2HG_home || additionalInfo.scored2HG_home || 0,
      scored2HG_away: stats.scored2HG_away || additionalInfo.scored2HG_away || 0,

      // Conceded specific fields
      seasonConcededOver05Percentage_overall:
        stats.seasonConcededOver05Percentage_overall ||
        additionalInfo.seasonConcededOver05Percentage_overall ||
        0,
      seasonConcededOver05Percentage_home:
        stats.seasonConcededOver05Percentage_home ||
        additionalInfo.seasonConcededOver05Percentage_home ||
        0,
      seasonConcededOver05Percentage_away:
        stats.seasonConcededOver05Percentage_away ||
        additionalInfo.seasonConcededOver05Percentage_away ||
        0,
      seasonConcededOver15Percentage_overall:
        stats.seasonConcededOver15Percentage_overall ||
        additionalInfo.seasonConcededOver15Percentage_overall ||
        0,
      seasonConcededOver15Percentage_home:
        stats.seasonConcededOver15Percentage_home ||
        additionalInfo.seasonConcededOver15Percentage_home ||
        0,
      seasonConcededOver15Percentage_away:
        stats.seasonConcededOver15Percentage_away ||
        additionalInfo.seasonConcededOver15Percentage_away ||
        0,
      seasonConcededOver25Percentage_overall:
        stats.seasonConcededOver25Percentage_overall ||
        additionalInfo.seasonConcededOver25Percentage_overall ||
        0,
      seasonConcededOver25Percentage_home:
        stats.seasonConcededOver25Percentage_home ||
        additionalInfo.seasonConcededOver25Percentage_home ||
        0,
      seasonConcededOver25Percentage_away:
        stats.seasonConcededOver25Percentage_away ||
        additionalInfo.seasonConcededOver25Percentage_away ||
        0,

      cleanSheetPercentage_overall:
        stats.cleanSheetPercentage_overall || additionalInfo.cleanSheetPercentage_overall || 0,
      cleanSheetPercentage_home:
        stats.cleanSheetPercentage_home || additionalInfo.cleanSheetPercentage_home || 0,
      cleanSheetPercentage_away:
        stats.cleanSheetPercentage_away || additionalInfo.cleanSheetPercentage_away || 0,

      seasonHighestConceded_overall:
        stats.seasonHighestConceded_overall ||
        additionalInfo.seasonHighestConceded_overall ||
        Math.max(stats.seasonHighestConceded_home || 0, stats.seasonHighestConceded_away || 0),
      seasonHighestConceded_home:
        stats.seasonHighestConceded_home || additionalInfo.seasonHighestConceded_home || 0,
      seasonHighestConceded_away:
        stats.seasonHighestConceded_away || additionalInfo.seasonHighestConceded_away || 0,

      // Conceded in 1H/2H percentages
      concededPercentageHT_overall:
        stats.concededPercentageHT_overall || additionalInfo.concededPercentageHT_overall || 0,
      concededPercentageHT_home:
        stats.concededPercentageHT_home || additionalInfo.concededPercentageHT_home || 0,
      concededPercentageHT_away:
        stats.concededPercentageHT_away || additionalInfo.concededPercentageHT_away || 0,

      conceded_2hg_percentage_overall:
        stats.conceded_2hg_percentage_overall ||
        additionalInfo.conceded_2hg_percentage_overall ||
        0,
      conceded_2hg_percentage_home:
        stats.conceded_2hg_percentage_home || additionalInfo.conceded_2hg_percentage_home || 0,
      conceded_2hg_percentage_away:
        stats.conceded_2hg_percentage_away || additionalInfo.conceded_2hg_percentage_away || 0,

      // Conceded in both halves
      concededBothHalvesPercentage_overall:
        stats.concededBothHalvesPercentage_overall ||
        additionalInfo.concededBothHalvesPercentage_overall ||
        0,
      concededBothHalvesPercentage_home:
        stats.concededBothHalvesPercentage_home ||
        additionalInfo.concededBothHalvesPercentage_home ||
        0,
      concededBothHalvesPercentage_away:
        stats.concededBothHalvesPercentage_away ||
        additionalInfo.concededBothHalvesPercentage_away ||
        0,

      // 1H/2H conceded goals counts
      conceded1HG_overall: stats.conceded1HG_overall || additionalInfo.conceded1HG_overall || 0,
      conceded1HG_home: stats.conceded1HG_home || additionalInfo.conceded1HG_home || 0,
      conceded1HG_away: stats.conceded1HG_away || additionalInfo.conceded1HG_away || 0,

      conceded2HG_overall: stats.conceded2HG_overall || additionalInfo.conceded2HG_overall || 0,
      conceded2HG_home: stats.conceded2HG_home || additionalInfo.conceded2HG_home || 0,
      conceded2HG_away: stats.conceded2HG_away || additionalInfo.conceded2HG_away || 0,

      // 2H average conceded
      conceded_2hg_avg_overall:
        stats.conceded_2hg_avg_overall || additionalInfo.conceded_2hg_avg_overall || 0,
      conceded_2hg_avg_home:
        stats.conceded_2hg_avg_home || additionalInfo.conceded_2hg_avg_home || 0,
      conceded_2hg_avg_away:
        stats.conceded_2hg_avg_away || additionalInfo.conceded_2hg_avg_away || 0,

      // 2nd Half Goals Conceded Total
      conceded_2hg_overall: additionalInfo.conceded_2hg_overall || stats.conceded_2hg_overall || 0,
      conceded_2hg_home: additionalInfo.conceded_2hg_home || stats.conceded_2hg_home || 0,
      conceded_2hg_away: additionalInfo.conceded_2hg_away || stats.conceded_2hg_away || 0,

      // BTTS & Over 2.5 combinations
      over25_and_btts_percentage_overall:
        additionalInfo.over25_and_btts_percentage_overall ||
        stats.over25_and_btts_percentage_overall ||
        0,
      over25_and_btts_percentage_home:
        additionalInfo.over25_and_btts_percentage_home ||
        stats.over25_and_btts_percentage_home ||
        0,
      over25_and_btts_percentage_away:
        additionalInfo.over25_and_btts_percentage_away ||
        stats.over25_and_btts_percentage_away ||
        0,

      // BTTS 1H & 2H combinations
      btts_1h2h_yes_yes_percentage_overall:
        additionalInfo.btts_1h2h_yes_yes_percentage_overall ||
        stats.btts_1h2h_yes_yes_percentage_overall ||
        0,
      btts_1h2h_yes_yes_percentage_home:
        additionalInfo.btts_1h2h_yes_yes_percentage_home ||
        stats.btts_1h2h_yes_yes_percentage_home ||
        0,
      btts_1h2h_yes_yes_percentage_away:
        additionalInfo.btts_1h2h_yes_yes_percentage_away ||
        stats.btts_1h2h_yes_yes_percentage_away ||
        0,

      btts_1h2h_yes_no_percentage_overall:
        additionalInfo.btts_1h2h_yes_no_percentage_overall ||
        stats.btts_1h2h_yes_no_percentage_overall ||
        0,
      btts_1h2h_yes_no_percentage_home:
        additionalInfo.btts_1h2h_yes_no_percentage_home ||
        stats.btts_1h2h_yes_no_percentage_home ||
        0,
      btts_1h2h_yes_no_percentage_away:
        additionalInfo.btts_1h2h_yes_no_percentage_away ||
        stats.btts_1h2h_yes_no_percentage_away ||
        0,

      btts_1h2h_no_yes_percentage_overall:
        additionalInfo.btts_1h2h_no_yes_percentage_overall ||
        stats.btts_1h2h_no_yes_percentage_overall ||
        0,
      btts_1h2h_no_yes_percentage_home:
        additionalInfo.btts_1h2h_no_yes_percentage_home ||
        stats.btts_1h2h_no_yes_percentage_home ||
        0,
      btts_1h2h_no_yes_percentage_away:
        additionalInfo.btts_1h2h_no_yes_percentage_away ||
        stats.btts_1h2h_no_yes_percentage_away ||
        0,

      btts_1h2h_no_no_percentage_overall:
        additionalInfo.btts_1h2h_no_no_percentage_overall ||
        stats.btts_1h2h_no_no_percentage_overall ||
        0,
      btts_1h2h_no_no_percentage_home:
        additionalInfo.btts_1h2h_no_no_percentage_home ||
        stats.btts_1h2h_no_no_percentage_home ||
        0,
      btts_1h2h_no_no_percentage_away:
        additionalInfo.btts_1h2h_no_no_percentage_away ||
        stats.btts_1h2h_no_no_percentage_away ||
        0,

      // 2nd Half BTTS
      btts_2hg_percentage_overall:
        additionalInfo.btts_2hg_percentage_overall || stats.btts_2hg_percentage_overall || 0,
      btts_2hg_percentage_home:
        additionalInfo.btts_2hg_percentage_home || stats.btts_2hg_percentage_home || 0,
      btts_2hg_percentage_away:
        additionalInfo.btts_2hg_percentage_away || stats.btts_2hg_percentage_away || 0,

      // Shots statistics
      shotsAVG:
        Math.round((stats.shotsAVG_overall || additionalInfo.shotsAVG_overall || 0) * 100) / 100,
      homeShotsAVG:
        Math.round((stats.shotsAVG_home || additionalInfo.shotsAVG_home || 0) * 100) / 100,
      awayShotsAVG:
        Math.round((stats.shotsAVG_away || additionalInfo.shotsAVG_away || 0) * 100) / 100,

      shotsOnTargetAVG:
        Math.round(
          (stats.shotsOnTargetAVG_overall || additionalInfo.shotsOnTargetAVG_overall || 0) * 100
        ) / 100,
      homeShotsOnTargetAVG:
        Math.round(
          (stats.shotsOnTargetAVG_home || additionalInfo.shotsOnTargetAVG_home || 0) * 100
        ) / 100,
      awayShotsOnTargetAVG:
        Math.round(
          (stats.shotsOnTargetAVG_away || additionalInfo.shotsOnTargetAVG_away || 0) * 100
        ) / 100,

      shotsOffTargetAVG:
        Math.round(
          (stats.shotsOffTargetAVG_overall || additionalInfo.shotsOffTargetAVG_overall || 0) * 100
        ) / 100,
      homeShotsOffTargetAVG:
        Math.round(
          (stats.shotsOffTargetAVG_home || additionalInfo.shotsOffTargetAVG_home || 0) * 100
        ) / 100,
      awayShotsOffTargetAVG:
        Math.round(
          (stats.shotsOffTargetAVG_away || additionalInfo.shotsOffTargetAVG_away || 0) * 100
        ) / 100,

      // Shot conversion and per goal stats
      shotsConversionRate:
        Math.round(
          (stats.shot_conversion_rate_overall || additionalInfo.shot_conversion_rate_overall || 0) *
            100
        ) / 100,
      homeShotsConversionRate:
        Math.round(
          (stats.shot_conversion_rate_home || additionalInfo.shot_conversion_rate_home || 0) * 100
        ) / 100,
      awayShotsConversionRate:
        Math.round(
          (stats.shot_conversion_rate_away || additionalInfo.shot_conversion_rate_away || 0) * 100
        ) / 100,

      shotsPerGoal:
        Math.round(
          (stats.shots_per_goals_scored_overall ||
            additionalInfo.shots_per_goals_scored_overall ||
            0) * 10
        ) / 10,
      homeShotsPerGoal:
        Math.round(
          (stats.shots_per_goals_scored_home || additionalInfo.shots_per_goals_scored_home || 0) *
            10
        ) / 10,
      awayShotsPerGoal:
        Math.round(
          (stats.shots_per_goals_scored_away || additionalInfo.shots_per_goals_scored_away || 0) *
            10
        ) / 10,

      shotsOnTargetPerGoal:
        Math.round(
          (stats.shots_on_target_per_goals_scored_overall ||
            additionalInfo.shots_on_target_per_goals_scored_overall ||
            0) * 10
        ) / 10,
      homeShotsOnTargetPerGoal:
        Math.round(
          (stats.shots_on_target_per_goals_scored_home ||
            additionalInfo.shots_on_target_per_goals_scored_home ||
            0) * 10
        ) / 10,
      awayShotsOnTargetPerGoal:
        Math.round(
          (stats.shots_on_target_per_goals_scored_away ||
            additionalInfo.shots_on_target_per_goals_scored_away ||
            0) * 10
        ) / 10,

      // Team shots over percentages
      shotsOver10_5:
        stats.team_shots_over105_percentage_overall ||
        additionalInfo.team_shots_over105_percentage_overall ||
        0,
      homeShotsOver10_5:
        stats.team_shots_over105_percentage_home ||
        additionalInfo.team_shots_over105_percentage_home ||
        0,
      awayShotsOver10_5:
        stats.team_shots_over105_percentage_away ||
        additionalInfo.team_shots_over105_percentage_away ||
        0,

      shotsOver11_5:
        stats.team_shots_over115_percentage_overall ||
        additionalInfo.team_shots_over115_percentage_overall ||
        0,
      homeShotsOver11_5:
        stats.team_shots_over115_percentage_home ||
        additionalInfo.team_shots_over115_percentage_home ||
        0,
      awayShotsOver11_5:
        stats.team_shots_over115_percentage_away ||
        additionalInfo.team_shots_over115_percentage_away ||
        0,

      shotsOver12_5:
        stats.team_shots_over125_percentage_overall ||
        additionalInfo.team_shots_over125_percentage_overall ||
        0,
      homeShotsOver12_5:
        stats.team_shots_over125_percentage_home ||
        additionalInfo.team_shots_over125_percentage_home ||
        0,
      awayShotsOver12_5:
        stats.team_shots_over125_percentage_away ||
        additionalInfo.team_shots_over125_percentage_away ||
        0,

      shotsOver13_5:
        stats.team_shots_over135_percentage_overall ||
        additionalInfo.team_shots_over135_percentage_overall ||
        0,
      homeShotsOver13_5:
        stats.team_shots_over135_percentage_home ||
        additionalInfo.team_shots_over135_percentage_home ||
        0,
      awayShotsOver13_5:
        stats.team_shots_over135_percentage_away ||
        additionalInfo.team_shots_over135_percentage_away ||
        0,

      shotsOver14_5:
        stats.team_shots_over145_percentage_overall ||
        additionalInfo.team_shots_over145_percentage_overall ||
        0,
      homeShotsOver14_5:
        stats.team_shots_over145_percentage_home ||
        additionalInfo.team_shots_over145_percentage_home ||
        0,
      awayShotsOver14_5:
        stats.team_shots_over145_percentage_away ||
        additionalInfo.team_shots_over145_percentage_away ||
        0,

      shotsOver15_5:
        stats.team_shots_over155_percentage_overall ||
        additionalInfo.team_shots_over155_percentage_overall ||
        0,
      homeShotsOver15_5:
        stats.team_shots_over155_percentage_home ||
        additionalInfo.team_shots_over155_percentage_home ||
        0,
      awayShotsOver15_5:
        stats.team_shots_over155_percentage_away ||
        additionalInfo.team_shots_over155_percentage_away ||
        0,

      // Team shots on target over percentages
      shotsOnTargetOver3_5:
        stats.team_shots_on_target_over35_percentage_overall ||
        additionalInfo.team_shots_on_target_over35_percentage_overall ||
        0,
      homeShotsOnTargetOver3_5:
        stats.team_shots_on_target_over35_percentage_home ||
        additionalInfo.team_shots_on_target_over35_percentage_home ||
        0,
      awayShotsOnTargetOver3_5:
        stats.team_shots_on_target_over35_percentage_away ||
        additionalInfo.team_shots_on_target_over35_percentage_away ||
        0,

      shotsOnTargetOver4_5:
        stats.team_shots_on_target_over45_percentage_overall ||
        additionalInfo.team_shots_on_target_over45_percentage_overall ||
        0,
      homeShotsOnTargetOver4_5:
        stats.team_shots_on_target_over45_percentage_home ||
        additionalInfo.team_shots_on_target_over45_percentage_home ||
        0,
      awayShotsOnTargetOver4_5:
        stats.team_shots_on_target_over45_percentage_away ||
        additionalInfo.team_shots_on_target_over45_percentage_away ||
        0,

      shotsOnTargetOver5_5:
        stats.team_shots_on_target_over55_percentage_overall ||
        additionalInfo.team_shots_on_target_over55_percentage_overall ||
        0,
      homeShotsOnTargetOver5_5:
        stats.team_shots_on_target_over55_percentage_home ||
        additionalInfo.team_shots_on_target_over55_percentage_home ||
        0,
      awayShotsOnTargetOver5_5:
        stats.team_shots_on_target_over55_percentage_away ||
        additionalInfo.team_shots_on_target_over55_percentage_away ||
        0,

      shotsOnTargetOver6_5:
        stats.team_shots_on_target_over65_percentage_overall ||
        additionalInfo.team_shots_on_target_over65_percentage_overall ||
        0,
      homeShotsOnTargetOver6_5:
        stats.team_shots_on_target_over65_percentage_home ||
        additionalInfo.team_shots_on_target_over65_percentage_home ||
        0,
      awayShotsOnTargetOver6_5:
        stats.team_shots_on_target_over65_percentage_away ||
        additionalInfo.team_shots_on_target_over65_percentage_away ||
        0,

      // Match shots over percentages
      matchShotsOver23_5:
        stats.match_shots_over235_percentage_overall ||
        additionalInfo.match_shots_over235_percentage_overall ||
        0,
      homeMatchShotsOver23_5:
        stats.match_shots_over235_percentage_home ||
        additionalInfo.match_shots_over235_percentage_home ||
        0,
      awayMatchShotsOver23_5:
        stats.match_shots_over235_percentage_away ||
        additionalInfo.match_shots_over235_percentage_away ||
        0,

      matchShotsOver24_5:
        stats.match_shots_over245_percentage_overall ||
        additionalInfo.match_shots_over245_percentage_overall ||
        0,
      homeMatchShotsOver24_5:
        stats.match_shots_over245_percentage_home ||
        additionalInfo.match_shots_over245_percentage_home ||
        0,
      awayMatchShotsOver24_5:
        stats.match_shots_over245_percentage_away ||
        additionalInfo.match_shots_over245_percentage_away ||
        0,

      matchShotsOver25_5:
        stats.match_shots_over255_percentage_overall ||
        additionalInfo.match_shots_over255_percentage_overall ||
        0,
      homeMatchShotsOver25_5:
        stats.match_shots_over255_percentage_home ||
        additionalInfo.match_shots_over255_percentage_home ||
        0,
      awayMatchShotsOver25_5:
        stats.match_shots_over255_percentage_away ||
        additionalInfo.match_shots_over255_percentage_away ||
        0,

      matchShotsOver26_5:
        stats.match_shots_over265_percentage_overall ||
        additionalInfo.match_shots_over265_percentage_overall ||
        0,
      homeMatchShotsOver26_5:
        stats.match_shots_over265_percentage_home ||
        additionalInfo.match_shots_over265_percentage_home ||
        0,
      awayMatchShotsOver26_5:
        stats.match_shots_over265_percentage_away ||
        additionalInfo.match_shots_over265_percentage_away ||
        0,

      // Match shots on target over percentages
      matchShotsOnTargetOver7_5:
        stats.match_shots_on_target_over75_percentage_overall ||
        additionalInfo.match_shots_on_target_over75_percentage_overall ||
        0,
      homeMatchShotsOnTargetOver7_5:
        stats.match_shots_on_target_over75_percentage_home ||
        additionalInfo.match_shots_on_target_over75_percentage_home ||
        0,
      awayMatchShotsOnTargetOver7_5:
        stats.match_shots_on_target_over75_percentage_away ||
        additionalInfo.match_shots_on_target_over75_percentage_away ||
        0,

      matchShotsOnTargetOver8_5:
        stats.match_shots_on_target_over85_percentage_overall ||
        additionalInfo.match_shots_on_target_over85_percentage_overall ||
        0,
      homeMatchShotsOnTargetOver8_5:
        stats.match_shots_on_target_over85_percentage_home ||
        additionalInfo.match_shots_on_target_over85_percentage_home ||
        0,
      awayMatchShotsOnTargetOver8_5:
        stats.match_shots_on_target_over85_percentage_away ||
        additionalInfo.match_shots_on_target_over85_percentage_away ||
        0,

      matchShotsOnTargetOver9_5:
        stats.match_shots_on_target_over95_percentage_overall ||
        additionalInfo.match_shots_on_target_over95_percentage_overall ||
        0,
      homeMatchShotsOnTargetOver9_5:
        stats.match_shots_on_target_over95_percentage_home ||
        additionalInfo.match_shots_on_target_over95_percentage_home ||
        0,
      awayMatchShotsOnTargetOver9_5:
        stats.match_shots_on_target_over95_percentage_away ||
        additionalInfo.match_shots_on_target_over95_percentage_away ||
        0,

      // Offsides averages
      offsidesAvg:
        Math.round(
          (stats.offsidesTeamAVG_overall || additionalInfo.offsidesTeamAVG_overall || 0) * 100
        ) / 100,
      homeOffsidesAvg:
        Math.round((stats.offsidesTeamAVG_home || additionalInfo.offsidesTeamAVG_home || 0) * 100) /
        100,
      awayOffsidesAvg:
        Math.round((stats.offsidesTeamAVG_away || additionalInfo.offsidesTeamAVG_away || 0) * 100) /
        100,

      matchOffsidesAvg:
        Math.round((stats.offsidesAVG_overall || additionalInfo.offsidesAVG_overall || 0) * 100) /
        100,
      homeMatchOffsidesAvg:
        Math.round((stats.offsidesAVG_home || additionalInfo.offsidesAVG_home || 0) * 100) / 100,
      awayMatchOffsidesAvg:
        Math.round((stats.offsidesAVG_away || additionalInfo.offsidesAVG_away || 0) * 100) / 100,

      // Team offsides over percentages
      offsidesOver0_5:
        stats.over05OffsidesTeamPercentage_overall ||
        additionalInfo.over05OffsidesTeamPercentage_overall ||
        0,
      homeOffsidesOver0_5:
        stats.over05OffsidesTeamPercentage_home ||
        additionalInfo.over05OffsidesTeamPercentage_home ||
        0,
      awayOffsidesOver0_5:
        stats.over05OffsidesTeamPercentage_away ||
        additionalInfo.over05OffsidesTeamPercentage_away ||
        0,

      offsidesOver1_5:
        stats.over15OffsidesTeamPercentage_overall ||
        additionalInfo.over15OffsidesTeamPercentage_overall ||
        0,
      homeOffsidesOver1_5:
        stats.over15OffsidesTeamPercentage_home ||
        additionalInfo.over15OffsidesTeamPercentage_home ||
        0,
      awayOffsidesOver1_5:
        stats.over15OffsidesTeamPercentage_away ||
        additionalInfo.over15OffsidesTeamPercentage_away ||
        0,

      offsidesOver2_5:
        stats.over25OffsidesTeamPercentage_overall ||
        additionalInfo.over25OffsidesTeamPercentage_overall ||
        0,
      homeOffsidesOver2_5:
        stats.over25OffsidesTeamPercentage_home ||
        additionalInfo.over25OffsidesTeamPercentage_home ||
        0,
      awayOffsidesOver2_5:
        stats.over25OffsidesTeamPercentage_away ||
        additionalInfo.over25OffsidesTeamPercentage_away ||
        0,

      // Half with most goals - check additional_info first
      halfWithMostGoalsIs1HPercentage_overall:
        additionalInfo.half_with_most_goals_is_1h_percentage_overall ||
        stats.half_with_most_goals_is_1h_percentage_overall ||
        0,
      halfWithMostGoalsIs2HPercentage_overall:
        additionalInfo.half_with_most_goals_is_2h_percentage_overall ||
        stats.half_with_most_goals_is_2h_percentage_overall ||
        0,
      halfWithMostGoalsIsBothPercentage_overall:
        additionalInfo.half_with_most_goals_is_both_percentage_overall ||
        stats.half_with_most_goals_is_both_percentage_overall ||
        0,

      // Match offsides over percentages
      matchOffsidesOver0_5:
        stats.over05OffsidesPercentage_overall ||
        additionalInfo.over05OffsidesPercentage_overall ||
        0,
      homeMatchOffsidesOver0_5:
        stats.over05OffsidesPercentage_home || additionalInfo.over05OffsidesPercentage_home || 0,
      awayMatchOffsidesOver0_5:
        stats.over05OffsidesPercentage_away || additionalInfo.over05OffsidesPercentage_away || 0,

      matchOffsidesOver1_5:
        stats.over15OffsidesPercentage_overall ||
        additionalInfo.over15OffsidesPercentage_overall ||
        0,
      homeMatchOffsidesOver1_5:
        stats.over15OffsidesPercentage_home || additionalInfo.over15OffsidesPercentage_home || 0,
      awayMatchOffsidesOver1_5:
        stats.over15OffsidesPercentage_away || additionalInfo.over15OffsidesPercentage_away || 0,

      matchOffsidesOver2_5:
        stats.over25OffsidesPercentage_overall ||
        additionalInfo.over25OffsidesPercentage_overall ||
        0,
      homeMatchOffsidesOver2_5:
        stats.over25OffsidesPercentage_home || additionalInfo.over25OffsidesPercentage_home || 0,
      awayMatchOffsidesOver2_5:
        stats.over25OffsidesPercentage_away || additionalInfo.over25OffsidesPercentage_away || 0,

      matchOffsidesOver3_5:
        stats.over35OffsidesPercentage_overall ||
        additionalInfo.over35OffsidesPercentage_overall ||
        0,
      homeMatchOffsidesOver3_5:
        stats.over35OffsidesPercentage_home || additionalInfo.over35OffsidesPercentage_home || 0,
      awayMatchOffsidesOver3_5:
        stats.over35OffsidesPercentage_away || additionalInfo.over35OffsidesPercentage_away || 0,
    };

    // Copy non-suffixed card percentage values to suffixed versions if they don't exist
    if (stats.cards1H_under2_percentage && !processedStats.cards1H_under2_percentage_overall) {
      processedStats.cards1H_under2_percentage_overall = stats.cards1H_under2_percentage;
    }
    if (stats.cards1H_2to3_percentage && !processedStats.cards1H_2to3_percentage_overall) {
      processedStats.cards1H_2to3_percentage_overall = stats.cards1H_2to3_percentage;
    }
    if (stats.cards1H_over3_percentage && !processedStats.cards1H_over3_percentage_overall) {
      processedStats.cards1H_over3_percentage_overall = stats.cards1H_over3_percentage;
    }
    if (stats.cards2H_under2_percentage && !processedStats.cards2H_under2_percentage_overall) {
      processedStats.cards2H_under2_percentage_overall = stats.cards2H_under2_percentage;
    }
    if (stats.cards2H_2to3_percentage && !processedStats.cards2H_2to3_percentage_overall) {
      processedStats.cards2H_2to3_percentage_overall = stats.cards2H_2to3_percentage;
    }
    if (stats.cards2H_over3_percentage && !processedStats.cards2H_over3_percentage_overall) {
      processedStats.cards2H_over3_percentage_overall = stats.cards2H_over3_percentage;
    }

    // Copy home versions
    if (stats.homeCards1H_under2_percentage && !processedStats.cards1H_under2_percentage_home) {
      processedStats.cards1H_under2_percentage_home = stats.homeCards1H_under2_percentage;
    }
    if (stats.homeCards1H_2to3_percentage && !processedStats.cards1H_2to3_percentage_home) {
      processedStats.cards1H_2to3_percentage_home = stats.homeCards1H_2to3_percentage;
    }
    if (stats.homeCards1H_over3_percentage && !processedStats.cards1H_over3_percentage_home) {
      processedStats.cards1H_over3_percentage_home = stats.homeCards1H_over3_percentage;
    }
    if (stats.homeCards2H_under2_percentage && !processedStats.cards2H_under2_percentage_home) {
      processedStats.cards2H_under2_percentage_home = stats.homeCards2H_under2_percentage;
    }
    if (stats.homeCards2H_2to3_percentage && !processedStats.cards2H_2to3_percentage_home) {
      processedStats.cards2H_2to3_percentage_home = stats.homeCards2H_2to3_percentage;
    }
    if (stats.homeCards2H_over3_percentage && !processedStats.cards2H_over3_percentage_home) {
      processedStats.cards2H_over3_percentage_home = stats.homeCards2H_over3_percentage;
    }

    // Copy away versions
    if (stats.awayCards1H_under2_percentage && !processedStats.cards1H_under2_percentage_away) {
      processedStats.cards1H_under2_percentage_away = stats.awayCards1H_under2_percentage;
    }
    if (stats.awayCards1H_2to3_percentage && !processedStats.cards1H_2to3_percentage_away) {
      processedStats.cards1H_2to3_percentage_away = stats.awayCards1H_2to3_percentage;
    }
    if (stats.awayCards1H_over3_percentage && !processedStats.cards1H_over3_percentage_away) {
      processedStats.cards1H_over3_percentage_away = stats.awayCards1H_over3_percentage;
    }
    if (stats.awayCards2H_under2_percentage && !processedStats.cards2H_under2_percentage_away) {
      processedStats.cards2H_under2_percentage_away = stats.awayCards2H_under2_percentage;
    }
    if (stats.awayCards2H_2to3_percentage && !processedStats.cards2H_2to3_percentage_away) {
      processedStats.cards2H_2to3_percentage_away = stats.awayCards2H_2to3_percentage;
    }
    if (stats.awayCards2H_over3_percentage && !processedStats.cards2H_over3_percentage_away) {
      processedStats.cards2H_over3_percentage_away = stats.awayCards2H_over3_percentage;
    }

    return processedStats;
  }

  /**
   * Get team matches using the new MatchesFetcher
   */
  async getTeamMatches(teamId, leagueInfo) {
    try {
      this.logger.info(`📅 Fetching matches for team ${teamId} in league ${leagueInfo?.id}`);

      // Use the correct team ID mapping if available
      const mappedId = this.teamIdMappings[teamId] || teamId;

      // If we don't have a season ID, we can't fetch matches
      if (!leagueInfo || !leagueInfo.id) {
        this.logger.info(`⚠️ No league info available for team ${teamId}`);
        return [];
      }

      // Use the new MatchesFetcher module
      const matches = await this.matchesFetcher.getTeamMatches(mappedId, leagueInfo.id);

      // Add league name to matches
      return matches.map(match => ({
        ...match,
        competition: leagueInfo.name || 'Unknown Competition',
      }));
    } catch (error) {
      this.logger.error(`❌ Error in getTeamMatches: ${error.message}`);
      return [];
    }
  }

  /**
   * Get league teams for caching team names
   */
  async getLeagueTeams(seasonId) {
    // Use shared method to get league teams data
    const teamsArray = await this.getLeagueTeamsData(seasonId);

    if (teamsArray) {
      // Convert array to object format for backward compatibility
      const teams = {};
      teamsArray.forEach(team => {
        teams[team.id] = team.name;
      });
      return teams;
    }

    // Fallback to league-season endpoint if needed
    try {
      // First try league-season endpoint which includes team list
      const response = await axios.get(`${this.baseUrl}/league-season`, {
        params: {
          key: this.apiKey,
          season_id: seasonId,
        },
        timeout: 10000,
      });

      if (response.data.success && response.data.data && response.data.data.length > 0) {
        const leagueData = response.data.data[0];
        const teams = {};

        // Check if clubs data exists
        if (leagueData.clubs) {
          try {
            // clubs might be a JSON string
            const clubsData =
              typeof leagueData.clubs === 'string'
                ? JSON.parse(leagueData.clubs)
                : leagueData.clubs;

            if (Array.isArray(clubsData)) {
              clubsData.forEach(team => {
                teams[team.id] = team.name || team.cleanName || `Team ${team.id}`;
              });
            }
          } catch (e) {
            this.logger.error('Error parsing clubs data:', e);
          }
        }

        // If no teams found in clubs, try league-teams endpoint as fallback
        if (Object.keys(teams).length === 0) {
          const teamsResponse = await axios.get(`${this.baseUrl}/league-teams`, {
            params: {
              key: this.apiKey,
              season_id: seasonId,
            },
            timeout: 10000,
          });

          if (teamsResponse.data.success && teamsResponse.data.data) {
            teamsResponse.data.data.forEach(team => {
              teams[team.id] = team.name || team.cleanName || `Team ${team.id}`;
            });
          }
        }

        // Cache the results
        this.leagueTeamsCache.set(seasonId, teams);
        this.leagueTeamsCacheTime.set(seasonId, Date.now());

        this.logger.info(`✅ Cached ${Object.keys(teams).length} team names for season ${seasonId}`);
        return teams;
      }

      return {};
    } catch (error) {
      this.logger.error(`❌ Error fetching league teams: ${error.message}`);

      // Try fallback to league-teams endpoint
      try {
        const teamsResponse = await axios.get(`${this.baseUrl}/league-teams`, {
          params: {
            key: this.apiKey,
            season_id: seasonId,
          },
          timeout: 10000,
        });

        if (teamsResponse.data.success && teamsResponse.data.data) {
          const teams = {};
          teamsResponse.data.data.forEach(team => {
            teams[team.id] = team.name || team.cleanName || `Team ${team.id}`;
          });

          // Cache the results
          this.leagueTeamsCache.set(seasonId, teams);
          this.leagueTeamsCacheTime.set(seasonId, Date.now());

          return teams;
        }
      } catch (fallbackError) {
        this.logger.error(`❌ Fallback error: ${fallbackError.message}`);
      }

      return {};
    }
  }

  /**
   * Helper to get team name from ID (temporary solution)
   */
  getTeamNameFromId(teamId) {
    // This would ideally come from a teams endpoint or cache
    // For now, return null and let the UI handle it
    return null;
  }

  /**
   * Get next upcoming match
   */
  getNextMatch(matches) {
    const now = new Date();
    const upcoming = matches
      .filter(m => {
        const matchDate = new Date(m.date);
        return matchDate > now && m.status === 'upcoming';
      })
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    return upcoming[0] || null;
  }

  /**
   * Get a user-friendly message about the competition data being shown
   */
  getCompetitionMessage(teamStats) {
    if (!teamStats._allCompetitionData) {
      // Old flow
      if (teamStats._competitionType === 'cup') {
        return 'Kupa verileri gösteriliyor';
      } else if (teamStats._competitionType === 'league') {
        return 'Lig verileri gösteriliyor';
      }
      return 'Veri türü belirlenemedi';
    }

    const { hasCupData, hasLeagueData, showingDataType, competitionName } =
      teamStats._allCompetitionData;

    if (hasCupData && hasLeagueData) {
      if (showingDataType === 'cup') {
        return `Takımın hem kupa hem lig maçları var. Şu anda kupa verileri gösteriliyor: ${competitionName}`;
      } else {
        return `Takımın hem kupa hem lig maçları var. Şu anda lig verileri gösteriliyor: ${competitionName}`;
      }
    } else if (hasCupData) {
      return `Kupa verileri gösteriliyor: ${competitionName}`;
    } else if (hasLeagueData) {
      return `Lig verileri gösteriliyor: ${competitionName}`;
    }

    return 'Veri türü belirlenemedi';
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.teamCache.clear();
    if (this.mappingService) {
      this.mappingService.clearCache();
    }
    if (this.smartLeagueResolver) {
      this.smartLeagueResolver.clearCache();
    }
    if (this.statsValidator) {
      this.statsValidator.clearCache();
    }
    if (this.competitionTypeResolver) {
      this.competitionTypeResolver.clearCache();
    }
    if (this.matchesFetcher) {
      this.matchesFetcher.clearCache();
    }
    this.logger.info('🧹 Team data cache cleared');
  }
}

module.exports = TeamDataService;
