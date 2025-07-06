const axios = require('axios');
const Logger = require('../utils/logger');

/**
 * Competition Type Resolver
 * Intelligently determines whether a competition is a cup or league
 * and fetches the appropriate data
 */
class CompetitionTypeResolver {
  constructor(apiKey, baseUrl) {
    this.logger = new Logger('CompetitionTypeResolver');
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
    this.competitionCache = new Map();
    this.CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

    // Known cup competition patterns
    this.cupPatterns = [
      /cup/i,
      /kupa/i,
      /copa/i,
      /pokal/i,
      /trophy/i,
      /shield/i,
      /super\s?cup/i,
      /league\s?cup/i,
      /fa\s?cup/i,
      /dfb[\s-]?pokal/i,
      /coupe/i,
      /coppa/i,
      /taça/i,
      /beker/i,
      /cupa/i,
      /kubok/i,
      /qualification/i,
      /playoff/i,
      /champions/i,
      /europa/i,
      /conference/i,
      /world\s?cup/i,
      /nations\s?league/i,
      /friendly/i,
      /friendlies/i,
    ];

    // Known league patterns
    this.leaguePatterns = [
      /league$/i,
      /liga/i,
      /ligue/i,
      /serie\s?[a-d]/i,
      /division/i,
      /premier/i,
      /championship/i,
      /eredivisie/i,
      /bundesliga/i,
      /superliga/i,
      /allsvenskan/i,
      /eliteserien/i,
      /veikkausliiga/i,
      /ekstraklasa/i,
      /primeira/i,
      /segunda/i,
      /mls/i,
      /j[1-3]\s?league/i,
      /k\s?league/i,
      /a\s?league/i,
      /super\s?lig/i,
      /pro\s?league/i,
      /primeira\s?liga/i,
      /vysshaya/i,
      /ykkösliiga/i,
      /ykkönen/i,
      /kakkonen/i,
    ];

    // Special cases that are definitely cups despite having "league" in name
    this.definitelyCups = [
      'champions league',
      'europa league',
      'conference league',
      'nations league',
      'league cup',
      'youth league',
    ];

    // Competition format indicators
    this.formatIndicators = {
      cup: ['Knockout', 'Cup', 'Playoff', 'Final', 'Semi-final', 'Quarter-final'],
      league: ['Domestic League', 'League', 'Regular Season', 'Round Robin'],
    };
  }

  /**
   * Determine competition type from name and metadata
   */
  async determineCompetitionType(competitionId, competitionName = null, seasonFormat = null) {
    const cacheKey = `comp_type_${competitionId}`;
    const cached = this.getCached(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      // If we don't have competition name, fetch it
      if (!competitionName) {
        const compData = await this.fetchCompetitionData(competitionId);
        if (compData) {
          competitionName = compData.name || compData.competition || '';
          seasonFormat = compData.season_format || seasonFormat;
        }
      }

      // Analyze the competition
      const analysis = this.analyzeCompetition(competitionName, seasonFormat);

      // Get additional context from API if needed
      if (analysis.confidence < 0.7) {
        const apiContext = await this.getCompetitionContext(competitionId);
        if (apiContext) {
          analysis.apiEvidence = apiContext;
          analysis.confidence = this.recalculateConfidence(analysis);
        }
      }

      const result = {
        type: analysis.type,
        confidence: analysis.confidence,
        isLeague: analysis.type === 'league',
        isCup: analysis.type === 'cup',
        isMixed: analysis.type === 'mixed',
        competitionName: competitionName,
        seasonFormat: seasonFormat,
        analysis: analysis,
      };

      this.setCache(cacheKey, result);
      return result;
    } catch (error) {
      this.logger.error(`Error determining competition type: ${error.message}`);
      return {
        type: 'unknown',
        confidence: 0,
        isLeague: false,
        isCup: false,
        isMixed: false,
        error: error.message,
      };
    }
  }

  /**
   * Analyze competition name and format
   */
  analyzeCompetition(name, format) {
    if (!name) {
      return { type: 'unknown', confidence: 0, evidence: ['No name provided'] };
    }

    const nameLower = name.toLowerCase();
    const evidence = [];
    let cupScore = 0;
    let leagueScore = 0;

    // Check definite cups first
    for (const defCup of this.definitelyCups) {
      if (nameLower.includes(defCup)) {
        evidence.push(`Definitely cup: contains "${defCup}"`);
        cupScore += 10;
      }
    }

    // Check cup patterns
    for (const pattern of this.cupPatterns) {
      if (pattern.test(name)) {
        evidence.push(`Cup pattern match: ${pattern}`);
        cupScore += 2;
      }
    }

    // Check league patterns
    for (const pattern of this.leaguePatterns) {
      if (pattern.test(name)) {
        evidence.push(`League pattern match: ${pattern}`);
        leagueScore += 2;
      }
    }

    // Check format
    if (format) {
      const formatLower = format.toLowerCase();

      // Check format indicators
      for (const cupFormat of this.formatIndicators.cup) {
        if (formatLower.includes(cupFormat.toLowerCase())) {
          evidence.push(`Cup format: ${cupFormat}`);
          cupScore += 3;
        }
      }

      for (const leagueFormat of this.formatIndicators.league) {
        if (formatLower.includes(leagueFormat.toLowerCase())) {
          evidence.push(`League format: ${leagueFormat}`);
          leagueScore += 3;
        }
      }
    }

    // Analyze structure hints
    if (nameLower.includes('round') && !nameLower.includes('round robin')) {
      evidence.push('Contains "round" (cup indicator)');
      cupScore += 1;
    }

    if (nameLower.includes('group') || nameLower.includes('stage')) {
      evidence.push('Contains group/stage (mixed format indicator)');
      cupScore += 0.5;
      leagueScore += 0.5;
    }

    // Country + League pattern is usually a league
    const countryLeaguePattern = /^[a-z\s]+ (premier|first|second|third|1st|2nd|3rd)/i;
    if (countryLeaguePattern.test(name)) {
      evidence.push('Country + division pattern');
      leagueScore += 2;
    }

    // Calculate type and confidence
    let type = 'unknown';
    let confidence = 0;

    if (cupScore > leagueScore * 1.5) {
      type = 'cup';
      confidence = Math.min(cupScore / (cupScore + leagueScore), 0.95);
    } else if (leagueScore > cupScore * 1.5) {
      type = 'league';
      confidence = Math.min(leagueScore / (cupScore + leagueScore), 0.95);
    } else if (cupScore > 0 && leagueScore > 0) {
      type = 'mixed';
      confidence = 0.5;
    }

    return {
      type,
      confidence,
      cupScore,
      leagueScore,
      evidence,
    };
  }

  /**
   * Get additional context from API
   */
  async getCompetitionContext(competitionId) {
    try {
      // Try to get league-list to see if it's a chosen league
      const response = await axios.get(`${this.baseUrl}/league-list`, {
        params: {
          key: this.apiKey,
          chosen_leagues_only: 'true',
        },
        timeout: 5000,
      });

      if (response.data.success && response.data.data) {
        const leagues = response.data.data;

        // Check if this competition ID exists in chosen leagues
        for (const league of leagues) {
          if (league.season && Array.isArray(league.season)) {
            for (const season of league.season) {
              if (season.id == competitionId) {
                return {
                  inChosenLeagues: true,
                  leagueName: league.name,
                  country: league.country,
                  isRegularLeague: true,
                };
              }
            }
          }
        }
      }

      return { inChosenLeagues: false };
    } catch (error) {
      console.warn(`Could not get competition context: ${error.message}`);
      return null;
    }
  }

  /**
   * Recalculate confidence with API evidence
   */
  recalculateConfidence(analysis) {
    let confidence = analysis.confidence;

    if (analysis.apiEvidence) {
      if (analysis.apiEvidence.inChosenLeagues && analysis.apiEvidence.isRegularLeague) {
        // If it's in chosen leagues, it's very likely a league
        if (analysis.type === 'league') {
          confidence = Math.min(confidence + 0.2, 0.95);
        } else {
          confidence = confidence * 0.8; // Reduce confidence if we thought it was a cup
        }
      }
    }

    return confidence;
  }

  /**
   * Get team data from appropriate endpoint based on competition type
   */
  async getTeamDataSmart(teamId, competitionId, competitionName = null) {
    // First determine competition type
    const compType = await this.determineCompetitionType(competitionId, competitionName);

    this.logger.info(
      `🎯 Competition type for ${competitionName || competitionId}: ${compType.type} (confidence: ${(compType.confidence * 100).toFixed(0)}%)`
    );

    // If it's a cup or mixed competition, we should prefer league data
    if (compType.isCup || compType.isMixed || compType.confidence < 0.7) {
      this.logger.info(`⚠️ Competition appears to be ${compType.type}, will try to find league data`);

      // Try to find the team's main league competition
      const leagueData = await this.findTeamMainLeague(teamId);
      if (leagueData) {
        this.logger.info(`✅ Found main league: ${leagueData.leagueName} (ID: ${leagueData.seasonId})`);
        return {
          useLeagueEndpoint: true,
          seasonId: leagueData.seasonId,
          competitionType: 'league',
          originalCompetitionType: compType.type,
          confidence: leagueData.confidence,
        };
      }
    }

    // If it's clearly a league or we couldn't find alternative
    return {
      useLeagueEndpoint: compType.isLeague,
      seasonId: competitionId,
      competitionType: compType.type,
      confidence: compType.confidence,
    };
  }

  /**
   * Find team's main league competition
   */
  async findTeamMainLeague(teamId) {
    try {
      // Get team data first
      const teamResponse = await axios.get(`${this.baseUrl}/team`, {
        params: {
          key: this.apiKey,
          team_id: teamId,
        },
        timeout: 5000,
      });

      if (!teamResponse.data.success || !teamResponse.data.data || !teamResponse.data.data[0]) {
        return null;
      }

      const team = teamResponse.data.data[0];
      const country = team.country;

      // Get chosen leagues for this country
      const leaguesResponse = await axios.get(`${this.baseUrl}/league-list`, {
        params: {
          key: this.apiKey,
          chosen_leagues_only: 'true',
        },
        timeout: 5000,
      });

      if (!leaguesResponse.data.success || !leaguesResponse.data.data) {
        return null;
      }

      // Find leagues for this country
      const countryLeagues = leaguesResponse.data.data.filter(l => l.country === country);

      // Sort by priority (main leagues first)
      const priorityLeagues = countryLeagues.sort((a, b) => {
        // Prioritize main leagues
        const aIsMain = this.isMainLeague(a.name);
        const bIsMain = this.isMainLeague(b.name);

        if (aIsMain && !bIsMain) {
          return -1;
        }
        if (!aIsMain && bIsMain) {
          return 1;
        }

        return 0;
      });

      // Check each league to see if team exists there
      for (const league of priorityLeagues) {
        if (league.season && league.season.length > 0) {
          // Get most recent season
          const currentSeason = league.season[0];

          // Check if team exists in this league
          try {
            const teamsResponse = await axios.get(`${this.baseUrl}/league-teams`, {
              params: {
                key: this.apiKey,
                season_id: currentSeason.id,
              },
              timeout: 5000,
            });

            if (teamsResponse.data.success && teamsResponse.data.data) {
              const teamExists = teamsResponse.data.data.some(t => t.id == teamId);

              if (teamExists) {
                return {
                  seasonId: currentSeason.id,
                  leagueName: `${league.country} ${league.name}`,
                  country: league.country,
                  confidence: 0.9,
                };
              }
            }
          } catch (error) {
            // Continue to next league
          }
        }
      }

      return null;
    } catch (error) {
      this.logger.error(`Error finding team main league: ${error.message}`);
      return null;
    }
  }

  /**
   * Check if league name indicates it's a main/top league
   */
  isMainLeague(leagueName) {
    const mainLeaguePatterns = [
      /premier/i,
      /primera/i,
      /serie\s?a/i,
      /bundesliga/i,
      /ligue\s?1/i,
      /eredivisie/i,
      /super\s?lig/i,
      /allsvenskan/i,
      /eliteserien/i,
      /veikkausliiga/i,
      /mls/i,
      /j1\s?league/i,
      /k\s?league\s?1/i,
      /a\s?league/i,
      /chinese\s?super/i,
      /brazil.*serie\s?a/i,
      /primera\s?división/i,
      /pro\s?league/i,
      /vysshaya/i,
      /ekstraklasa/i,
    ];

    const lowerName = leagueName.toLowerCase();

    // Check if it's NOT a secondary division
    if (
      lowerName.includes('2') ||
      lowerName.includes('second') ||
      lowerName.includes('championship') ||
      lowerName.includes('league one') ||
      lowerName.includes('serie b') ||
      lowerName.includes('2. ') ||
      lowerName.includes('ykkösliiga') ||
      lowerName.includes('ykkönen')
    ) {
      return false;
    }

    // Check main league patterns
    for (const pattern of mainLeaguePatterns) {
      if (pattern.test(leagueName)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Fetch competition data
   */
  async fetchCompetitionData(competitionId) {
    try {
      // Try to get from league-list first
      const response = await axios.get(`${this.baseUrl}/league-list`, {
        params: {
          key: this.apiKey,
        },
        timeout: 5000,
      });

      if (response.data.success && response.data.data) {
        for (const league of response.data.data) {
          if (league.season && Array.isArray(league.season)) {
            for (const season of league.season) {
              if (season.id == competitionId) {
                return {
                  id: competitionId,
                  name: `${league.country} ${league.name}`,
                  competition: league.name,
                  country: league.country,
                  season_format: 'Domestic League',
                };
              }
            }
          }
        }
      }

      return null;
    } catch (error) {
      this.logger.error(`Error fetching competition data: ${error.message}`);
      return null;
    }
  }

  // Cache helpers
  getCached(key) {
    const item = this.competitionCache.get(key);
    if (item && Date.now() - item.timestamp < this.CACHE_TTL) {
      return item.data;
    }
    return null;
  }

  setCache(key, data) {
    this.competitionCache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  clearCache() {
    this.competitionCache.clear();
    this.logger.info('🧹 Competition type cache cleared');
  }

  /**
   * Get debug info
   */
  getDebugInfo() {
    return {
      cacheSize: this.competitionCache.size,
      cupPatterns: this.cupPatterns.length,
      leaguePatterns: this.leaguePatterns.length,
      definitelyCups: this.definitelyCups,
    };
  }
}

module.exports = CompetitionTypeResolver;
