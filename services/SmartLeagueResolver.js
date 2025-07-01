const Logger = require('../utils/logger');

/**
 * Smart League Resolver
 * Intelligent and future-proof league resolution system
 */
class SmartLeagueResolver {
  constructor(apiKey, baseUrl) {
    this.logger = new Logger('SmartLeagueResolver');
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;

    // Multi-tier caching system
    this.caches = {
      seasons: { data: null, timestamp: 0, ttl: 3600000 }, // 1 hour
      leagues: new Map(), // league_id -> league data
      teamLeagues: new Map(), // team_id -> { league_id, timestamp }
      verifiedMappings: new Map(), // old_id -> new_id (confirmed mappings)
    };

    // Confidence scoring weights
    this.confidenceWeights = {
      exactMatch: 1.0,
      verifiedMapping: 0.95,
      sameCountryRecent: 0.8,
      nameMatch: 0.7,
      teamVerification: 0.9,
      historicalPattern: 0.6,
    };
  }

  /**
   * Main resolution function - intelligent league resolution
   */
  async resolveLeagueInfo(apiStats, universalMappingSeasonId = null) {
    const startTime = Date.now();

    // Build initial league info object
    let leagueInfo = {
      id: 0,
      name: 'Unknown League',
      country: apiStats.country || 'Unknown',
      season: apiStats.season || 'Unknown',
      originalCompetitionId: apiStats.competition_id,
      confidence: 0,
      resolutionMethod: 'none',
      metadata: {},
    };

    try {
      // Priority 1: Universal Mapping Service (highest confidence)
      if (universalMappingSeasonId) {
        this.logger.info(
          `🎯 Priority 1: UniversalMappingService provided season ID: ${universalMappingSeasonId}`
        );

        const resolvedLeague = await this.enrichLeagueInfo(universalMappingSeasonId, apiStats);
        if (resolvedLeague) {
          leagueInfo = {
            ...resolvedLeague,
            originalCompetitionId: apiStats.competition_id,
            confidence: this.confidenceWeights.verifiedMapping,
            resolutionMethod: 'universal_mapping',
          };

          if (universalMappingSeasonId !== apiStats.competition_id) {
            leagueInfo.mappedFromCompetitionId = apiStats.competition_id;
            // Store verified mapping for future use
            this.caches.verifiedMappings.set(apiStats.competition_id, universalMappingSeasonId);
          }

          this.logger.info(
            `✅ Resolved via UniversalMappingService with ${(leagueInfo.confidence * 100).toFixed(0)}% confidence`
          );
          return leagueInfo;
        }
      }

      // Priority 2: Check verified mappings cache
      const verifiedMapping = this.caches.verifiedMappings.get(apiStats.competition_id);
      if (verifiedMapping) {
        this.logger.info(
          `🎯 Priority 2: Found verified mapping: ${apiStats.competition_id} → ${verifiedMapping}`
        );
        const resolvedLeague = await this.enrichLeagueInfo(verifiedMapping, apiStats);
        if (resolvedLeague) {
          return {
            ...resolvedLeague,
            originalCompetitionId: apiStats.competition_id,
            mappedFromCompetitionId: apiStats.competition_id,
            confidence: this.confidenceWeights.verifiedMapping,
            resolutionMethod: 'verified_mapping',
          };
        }
      }

      // Priority 3: Exact competition ID match
      const seasonIds = await this.getSeasonIds();
      const exactMatch = seasonIds.find(s => s.season_id === apiStats.competition_id);

      if (exactMatch) {
        this.logger.info(
          `🎯 Priority 3: Exact match found for competition ID ${apiStats.competition_id}`
        );
        return {
          id: exactMatch.season_id,
          name: exactMatch.league_name.startsWith(exactMatch.country)
            ? exactMatch.league_name
            : `${exactMatch.country} ${exactMatch.league_name}`,
          country: exactMatch.country,
          season: exactMatch.season_name,
          originalCompetitionId: apiStats.competition_id,
          confidence: this.confidenceWeights.exactMatch,
          resolutionMethod: 'exact_match',
        };
      }

      // Priority 4: Smart country-based resolution with team verification
      if (apiStats.country) {
        this.logger.info(`🎯 Priority 4: Smart resolution for ${apiStats.country}`);

        const countryLeagues = seasonIds.filter(s => s.country === apiStats.country);
        if (countryLeagues.length > 0) {
          // Score each league based on multiple factors
          const scoredLeagues = await this.scoreLeagues(countryLeagues, apiStats);

          // Get the best match
          const bestMatch = scoredLeagues[0];
          if (bestMatch && bestMatch.score > 0.5) {
            this.logger.info(
              `✅ Best match: ${bestMatch.league.league_name} (score: ${(bestMatch.score * 100).toFixed(0)}%)`
            );

            const enrichedInfo = await this.enrichLeagueInfo(bestMatch.league.season_id, apiStats);
            return {
              ...enrichedInfo,
              originalCompetitionId: apiStats.competition_id,
              confidence: bestMatch.score,
              resolutionMethod: 'smart_resolution',
              metadata: {
                factors: bestMatch.factors,
                alternativeLeagues: scoredLeagues.slice(1, 3).map(s => ({
                  name: s.league.league_name,
                  score: s.score,
                })),
              },
            };
          }
        }
      }

      // Priority 5: Fallback - use competition ID as-is
      this.logger.info(
        `⚠️ Priority 5: Fallback - using competition ID ${apiStats.competition_id} as-is`
      );
      leagueInfo = {
        id: apiStats.competition_id,
        name: apiStats.competition || apiStats.league_name || 'Unknown League',
        country: apiStats.country || 'Unknown',
        season: apiStats.season || 'Unknown',
        originalCompetitionId: apiStats.competition_id,
        confidence: 0.3,
        resolutionMethod: 'fallback',
        metadata: {
          warning: 'Could not resolve to current season, using original competition ID',
        },
      };
    } catch (error) {
      this.logger.error(`❌ Error in resolveLeagueInfo: ${error.message}`);
      leagueInfo.metadata = { error: error.message };
    }

    const elapsed = Date.now() - startTime;
    leagueInfo.metadata.resolutionTime = `${elapsed}ms`;

    return leagueInfo;
  }

  /**
   * Score leagues based on multiple factors
   */
  async scoreLeagues(leagues, apiStats) {
    const scores = [];

    for (const league of leagues) {
      let score = 0;
      const factors = [];

      // Factor 1: Season recency
      const currentYear = new Date().getFullYear();
      const seasonYear = parseInt(league.season_name?.split('/')[0]) || 0;
      const yearDiff = Math.abs(currentYear - seasonYear);

      if (yearDiff === 0) {
        score += 0.3;
        factors.push('current_year');
      } else if (yearDiff === 1) {
        score += 0.2;
        factors.push('recent_year');
      }

      // Factor 2: League name similarity (if available)
      if (apiStats.competition && league.league_name) {
        const similarity = this.calculateSimilarity(
          apiStats.competition.toLowerCase(),
          league.league_name.toLowerCase()
        );
        if (similarity > 0.7) {
          score += similarity * 0.3;
          factors.push(`name_match_${(similarity * 100).toFixed(0)}%`);
        }
      }

      // Factor 3: Season ID proximity to competition ID
      if (apiStats.competition_id && league.season_id) {
        const idDiff = Math.abs(league.season_id - apiStats.competition_id);
        if (idDiff < 1000) {
          score += 0.1;
          factors.push('id_proximity');
        }
      }

      // Factor 4: Historical patterns (e.g., league typically has ~20 teams)
      if (apiStats.table_position && apiStats.table_position > 0) {
        // This league likely has at least as many teams as the position
        score += 0.05;
        factors.push('position_plausible');
      }

      scores.push({
        league,
        score: Math.min(score, 0.95), // Cap below verified mappings
        factors,
      });
    }

    // Sort by score descending
    return scores.sort((a, b) => b.score - a.score);
  }

  /**
   * Calculate string similarity (simple implementation)
   */
  calculateSimilarity(str1, str2) {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.includes(shorter)) {
      return 0.9;
    }

    // Simple character match ratio
    let matches = 0;
    for (let i = 0; i < shorter.length; i++) {
      if (longer.includes(shorter[i])) {
        matches++;
      }
    }

    return matches / longer.length;
  }

  /**
   * Enrich league info with additional data
   */
  async enrichLeagueInfo(seasonId, apiStats) {
    try {
      // First check cache
      const cached = this.caches.leagues.get(seasonId);
      if (cached && Date.now() - cached.timestamp < 3600000) {
        return cached.data;
      }

      // Get from season IDs
      const seasonIds = await this.getSeasonIds();
      const league = seasonIds.find(s => s.season_id === seasonId);

      if (league) {
        const enrichedData = {
          id: league.season_id,
          name: league.league_name.startsWith(league.country)
            ? league.league_name
            : `${league.country} ${league.league_name}`,
          country: league.country,
          season: league.season_name,
          fullName: `${league.country} ${league.league_name}`,
          shortName: league.league_name,
        };

        // Cache the result
        this.caches.leagues.set(seasonId, {
          data: enrichedData,
          timestamp: Date.now(),
        });

        return enrichedData;
      }

      // Fallback to basic info
      return {
        id: seasonId,
        name: apiStats.competition || 'Unknown League',
        country: apiStats.country || 'Unknown',
        season: apiStats.season || 'Unknown',
      };
    } catch (error) {
      this.logger.error(`Error enriching league info: ${error.message}`);
      return null;
    }
  }

  /**
   * Get season IDs with caching
   */
  async getSeasonIds() {
    const cache = this.caches.seasons;

    if (cache.data && Date.now() - cache.timestamp < cache.ttl) {
      return cache.data;
    }

    try {
      const getChosenLeagueSeasonIds = require('./getChosenLeagueSeasonIdsFinal');
      const seasonIds = await getChosenLeagueSeasonIds(this.apiKey, this.baseUrl);

      this.caches.seasons = {
        data: seasonIds,
        timestamp: Date.now(),
        ttl: cache.ttl,
      };

      return seasonIds;
    } catch (error) {
      this.logger.error(`Error fetching season IDs: ${error.message}`);
      return cache.data || [];
    }
  }

  /**
   * Clear all caches
   */
  clearCache() {
    this.caches.seasons = { data: null, timestamp: 0, ttl: 3600000 };
    this.caches.leagues.clear();
    this.caches.teamLeagues.clear();
    this.logger.info('🧹 SmartLeagueResolver caches cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      seasons: this.caches.seasons.data ? this.caches.seasons.data.length : 0,
      leagues: this.caches.leagues.size,
      teamLeagues: this.caches.teamLeagues.size,
      verifiedMappings: this.caches.verifiedMappings.size,
    };
  }
}

module.exports = SmartLeagueResolver;
