const axios = require('axios');
const TeamSearchService = require('./TeamSearchService');
const KnownTeamMappings = require('./KnownTeamMappings');
const ChosenLeaguesOnlyResolver = require('./ChosenLeaguesOnlyResolver');
const Logger = require('../utils/logger');

/**
 * Intelligent Team Resolver
 * Akıllı takım çözümleme sistemi - yanlış ID'leri tespit edip doğrularını bulur
 * Sadece chosen leagues içindeki takımlarla çalışır
 */
class IntelligentTeamResolver {
  constructor(apiKey, baseUrl) {
    this.logger = new Logger('IntelligentTeamResolver');
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;

    // Team Search Service'i başlat
    this.searchService = new TeamSearchService(apiKey, baseUrl);

    // Chosen Leagues Resolver'ı başlat
    this.chosenLeaguesResolver = new ChosenLeaguesOnlyResolver(apiKey, baseUrl);

    // Takım parmak izleri - bir takımı tanımlamak için kullanılan özellikler
    this.teamFingerprints = {
      'Manchester City': {
        country: 'England',
        league: 'Premier League',
        aliases: ['Man City', 'MCFC', 'Manchester City FC'],
        colors: ['sky blue', 'white'],
        founded: 1880,
        stadium: 'Etihad',
        searchTerms: ['manchester', 'city', 'citizens'],
      },
      'Manchester United': {
        country: 'England',
        league: 'Premier League',
        aliases: ['Man United', 'Man Utd', 'MUFC', 'Manchester United FC'],
        colors: ['red', 'white'],
        founded: 1878,
        stadium: 'Old Trafford',
        searchTerms: ['manchester', 'united', 'red devils'],
      },
      'Inter Miami': {
        country: 'USA',
        league: 'MLS',
        aliases: ['Inter Miami CF', 'Miami', 'IMCF'],
        colors: ['pink', 'black'],
        founded: 2018,
        stadium: 'DRV PNK',
        searchTerms: ['inter', 'miami', 'florida'],
      },
    };

    // Doğrulanmış ID eşlemeleri (öğrenildikçe büyüyecek)
    this.verifiedMappings = new Map();

    // Arama sonuçları cache'i
    this.searchCache = new Map();
    this.CACHE_TTL = 24 * 60 * 60 * 1000; // 24 saat

    // Güven eşikleri
    this.confidenceThresholds = {
      high: 0.85,
      medium: 0.65,
      low: 0.4,
    };
  }

  /**
   * Takımı akıllıca çöz - yanlış ID'yi tespit et ve doğrusunu bul
   */
  async resolveTeam(requestedTeamId, apiTeamData) {
    const resolution = {
      originalId: requestedTeamId,
      resolvedId: requestedTeamId,
      confidence: 0,
      method: 'none',
      teamData: apiTeamData,
      warnings: [],
      suggestions: [],
    };

    try {
      // 0. Önce chosen leagues kontrolü yap
      const chosenLeaguesCheck = await this.chosenLeaguesResolver.resolveTeam(
        requestedTeamId,
        apiTeamData
      );

      if (!chosenLeaguesCheck.isAccessible) {
        resolution.warnings = chosenLeaguesCheck.warnings;
        resolution.confidence = 0.2;
        resolution.method = 'team_not_in_chosen_leagues';
        resolution.metadata = chosenLeaguesCheck.metadata;
        this.logger.info(`⚠️ Team not in chosen leagues: ${apiTeamData.name}`);
        return resolution;
      }

      // 1. Bilinen sorunlu ID'leri kontrol et
      const knownIssue = KnownTeamMappings.checkTeamExpectation(requestedTeamId, apiTeamData);

      if (knownIssue.hasIssue) {
        const report = KnownTeamMappings.generateResolutionReport(requestedTeamId, apiTeamData);

        resolution.warnings.push({
          type: 'known_mismatch',
          message: report.message,
          severity: report.severity,
        });

        resolution.metadata = {
          knownIssue: report,
          expectedTeam: report.expected,
          actualTeam: report.actual,
          chosenLeaguesInfo: chosenLeaguesCheck.metadata,
        };

        // Eğer lig seçili değilse, mevcut veriyi kullan ama düşük güvenle
        if (report.resolution === 'NOT_IN_CHOSEN_LEAGUES') {
          resolution.confidence = 0.3;
          resolution.method = 'known_issue_not_in_leagues';
          this.logger.info(`⚠️ Known issue: ${report.expected.name} not in chosen leagues`);
          return resolution;
        }
      }

      // 1. Önce verified mappings'e bak
      if (this.verifiedMappings.has(requestedTeamId)) {
        const verified = this.verifiedMappings.get(requestedTeamId);
        if (Date.now() - verified.timestamp < this.CACHE_TTL) {
          resolution.resolvedId = verified.correctId;
          resolution.confidence = 1.0;
          resolution.method = 'verified_mapping';
          resolution.teamData = verified.teamData;
          this.logger.info(`✅ Using verified mapping: ${requestedTeamId} → ${verified.correctId}`);
          return resolution;
        }
      }

      // 2. API'den gelen veriyi analiz et
      const expectedTeam = this.identifyExpectedTeam(requestedTeamId);

      if (expectedTeam) {
        const matchScore = this.calculateMatchScore(apiTeamData, expectedTeam);

        if (matchScore < this.confidenceThresholds.low) {
          // Büyük uyumsuzluk var, doğru takımı ara
          this.logger.info(
            `🔍 Team mismatch detected for ID ${requestedTeamId}. Searching for correct team...`
          );

          resolution.warnings.push({
            type: 'team_mismatch',
            message: `Expected ${expectedTeam.name} but got ${apiTeamData.name}`,
            severity: 'high',
          });

          // Doğru takımı bul - sadece chosen leagues içinde ara
          const searchResult = await this.findCorrectTeamInChosenLeagues(expectedTeam);

          if (searchResult.found) {
            resolution.resolvedId = searchResult.teamId;
            resolution.confidence = searchResult.confidence;
            resolution.method = searchResult.method;
            resolution.teamData = searchResult.teamData;

            // Başarılı aramayı kaydet
            this.verifiedMappings.set(requestedTeamId, {
              correctId: searchResult.teamId,
              teamData: searchResult.teamData,
              timestamp: Date.now(),
            });

            this.logger.info(
              `✅ Found correct team: ${searchResult.teamData.name} (ID: ${searchResult.teamId})`
            );
          } else {
            resolution.confidence = matchScore;
            resolution.method = 'mismatch_unresolved';
            resolution.suggestions = searchResult.suggestions || [];

            // Eğer takım chosen leagues dışındaysa özel mesaj ekle
            if (
              expectedTeam.country &&
              !(await this.isCountryInChosenLeagues(expectedTeam.country))
            ) {
              resolution.warnings.push({
                type: 'expected_team_not_in_chosen_leagues',
                message: `${expectedTeam.name} from ${expectedTeam.country} is not accessible in chosen leagues`,
                severity: 'info',
              });
            }
          }
        } else {
          // Kısmi eşleşme
          resolution.confidence = matchScore;
          resolution.method = 'partial_match';

          if (matchScore < this.confidenceThresholds.medium) {
            resolution.warnings.push({
              type: 'low_confidence_match',
              message: `Team data has low confidence: ${(matchScore * 100).toFixed(0)}%`,
              severity: 'medium',
            });
          }
        }
      } else {
        // Beklenen takım yok, API verisine güven
        resolution.confidence = 0.75;
        resolution.method = 'api_data_accepted';
      }
    } catch (error) {
      this.logger.error(`Error resolving team ${requestedTeamId}: ${error.message}`);
      resolution.warnings.push({
        type: 'resolution_error',
        message: error.message,
        severity: 'high',
      });
    }

    return resolution;
  }

  /**
   * Beklenen takımı tanımla
   */
  identifyExpectedTeam(teamId) {
    // Bilinen problemli ID'ler
    const knownProblems = {
      4: 'Manchester City',
      5: 'Manchester United',
      5569: 'Inter Miami',
    };

    const teamName = knownProblems[teamId];
    if (teamName && this.teamFingerprints[teamName]) {
      return {
        name: teamName,
        ...this.teamFingerprints[teamName],
      };
    }

    return null;
  }

  /**
   * Takım eşleşme skorunu hesapla
   */
  calculateMatchScore(apiData, expectedTeam) {
    let score = 0;
    let factors = 0;

    // Ülke eşleşmesi (en önemli)
    if (apiData.country === expectedTeam.country) {
      score += 0.4;
    }
    factors += 0.4;

    // İsim benzerliği
    const nameSimilarity = this.calculateNameSimilarity(
      apiData.name,
      expectedTeam.name,
      expectedTeam.aliases
    );
    score += nameSimilarity * 0.3;
    factors += 0.3;

    // Lig eşleşmesi
    if (apiData.competition && expectedTeam.league) {
      if (
        apiData.competition.toLowerCase().includes(expectedTeam.league.toLowerCase()) ||
        expectedTeam.league.toLowerCase().includes(apiData.competition.toLowerCase())
      ) {
        score += 0.2;
      }
    }
    factors += 0.2;

    // Kuruluş yılı (varsa)
    if (apiData.founded && expectedTeam.founded) {
      const yearDiff = Math.abs(parseInt(apiData.founded) - expectedTeam.founded);
      if (yearDiff === 0) {
        score += 0.1;
      } else if (yearDiff <= 2) {
        score += 0.05;
      }
    }
    factors += 0.1;

    return score / factors;
  }

  /**
   * İsim benzerliği hesapla
   */
  calculateNameSimilarity(apiName, expectedName, aliases = []) {
    const normalize = str => str.toLowerCase().replace(/[^a-z0-9]/g, '');

    const apiNorm = normalize(apiName);
    const expectedNorm = normalize(expectedName);

    // Tam eşleşme
    if (apiNorm === expectedNorm) {
      return 1.0;
    }

    // Alias kontrolü
    for (const alias of aliases) {
      if (apiNorm === normalize(alias)) {
        return 0.95;
      }
    }

    // Kısmi eşleşme
    if (apiNorm.includes(expectedNorm) || expectedNorm.includes(apiNorm)) {
      return 0.7;
    }

    // Kelime bazlı kontrol
    const apiWords = apiName.toLowerCase().split(/\s+/);
    const expectedWords = expectedName.toLowerCase().split(/\s+/);

    let matchedWords = 0;
    for (const word of expectedWords) {
      if (apiWords.some(w => w.includes(word) || word.includes(w))) {
        matchedWords++;
      }
    }

    return (matchedWords / Math.max(expectedWords.length, 1)) * 0.6;
  }

  /**
   * Ülkenin chosen leagues içinde olup olmadığını kontrol et
   */
  async isCountryInChosenLeagues(country) {
    const countries = await this.chosenLeaguesResolver.getAvailableCountries();
    return countries.includes(country);
  }

  /**
   * Doğru takımı bul - sadece chosen leagues içinde
   */
  async findCorrectTeamInChosenLeagues(expectedTeam) {
    // Önce ülkenin chosen leagues'de olup olmadığını kontrol et
    if (expectedTeam.country && !(await this.isCountryInChosenLeagues(expectedTeam.country))) {
      this.logger.info(`❌ ${expectedTeam.country} is not in chosen leagues, skipping search`);
      return {
        found: false,
        teamId: null,
        teamData: null,
        confidence: 0,
        method: 'country_not_in_chosen_leagues',
        suggestions: [],
      };
    }

    return this.findCorrectTeam(expectedTeam);
  }

  /**
   * Doğru takımı bul
   */
  async findCorrectTeam(expectedTeam) {
    const result = {
      found: false,
      teamId: null,
      teamData: null,
      confidence: 0,
      method: 'not_found',
      suggestions: [],
    };

    try {
      // Önce cache'e bak
      const cacheKey = `search_${expectedTeam.name}_${expectedTeam.country}`;
      const cached = this.searchCache.get(cacheKey);

      if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
        return cached.result;
      }

      // Strateji 1: Ülke ve lige göre ara - sadece chosen leagues'de
      if (expectedTeam.country && expectedTeam.league) {
        // Önce ligin chosen leagues'de olup olmadığını kontrol et
        const leaguesInCountry = await this.chosenLeaguesResolver.getLeaguesByCountry(
          expectedTeam.country
        );
        const isLeagueAvailable = leaguesInCountry.some(
          l =>
            l.name.toLowerCase().includes(expectedTeam.league.toLowerCase()) ||
            expectedTeam.league.toLowerCase().includes(l.name.toLowerCase())
        );

        if (isLeagueAvailable) {
          const leagueTeams = await this.searchTeamsByLeague(
            expectedTeam.country,
            expectedTeam.league
          );

          for (const team of leagueTeams) {
            const similarity = this.calculateNameSimilarity(
              team.name,
              expectedTeam.name,
              expectedTeam.aliases
            );

            if (similarity > this.confidenceThresholds.high) {
              result.found = true;
              result.teamId = team.id;
              result.teamData = team;
              result.confidence = similarity;
              result.method = 'league_search';
              break;
            } else if (similarity > this.confidenceThresholds.medium) {
              result.suggestions.push({
                team: team,
                similarity: similarity,
              });
            }
          }
        } else {
          this.logger.info(`⚠️ League ${expectedTeam.league} not available in chosen leagues`);
        }
      }

      // Strateji 2: Anahtar kelimelerle ara
      if (!result.found && expectedTeam.searchTerms) {
        for (const term of expectedTeam.searchTerms) {
          const searchResults = await this.searchTeamsByKeyword(term);

          for (const team of searchResults) {
            if (team.country === expectedTeam.country) {
              const similarity = this.calculateNameSimilarity(
                team.name,
                expectedTeam.name,
                expectedTeam.aliases
              );

              if (similarity > this.confidenceThresholds.medium) {
                result.found = true;
                result.teamId = team.id;
                result.teamData = team;
                result.confidence = similarity;
                result.method = 'keyword_search';
                break;
              }
            }
          }

          if (result.found) {
            break;
          }
        }
      }

      // Sonucu cache'le
      this.searchCache.set(cacheKey, {
        result: result,
        timestamp: Date.now(),
      });
    } catch (error) {
      this.logger.error(`Error searching for team: ${error.message}`);
    }

    return result;
  }

  /**
   * Lige göre takım ara
   */
  async searchTeamsByLeague(country, leagueName) {
    const results = await this.searchService.searchTeamInAllLeagues(leagueName, country);
    return results.map(r => ({
      id: r.team.id,
      name: r.team.name,
      country: r.team.country || country,
      league: r.league.name,
      matchScore: r.matchScore,
    }));
  }

  /**
   * Anahtar kelimeye göre takım ara
   */
  async searchTeamsByKeyword(keyword) {
    const results = await this.searchService.searchTeamInAllLeagues(keyword);
    return results.map(r => ({
      id: r.team.id,
      name: r.team.name,
      country: r.team.country,
      league: r.league.name,
      matchScore: r.matchScore,
    }));
  }

  /**
   * Çözüm raporunu oluştur
   */
  generateResolutionReport(resolution) {
    const report = {
      summary: '',
      details: [],
      recommendations: [],
    };

    if (resolution.originalId === resolution.resolvedId) {
      if (resolution.confidence > this.confidenceThresholds.high) {
        report.summary = 'Team data is accurate';
      } else {
        report.summary = 'Team data has low confidence but no better match found';
      }
    } else {
      report.summary = `Team ID corrected: ${resolution.originalId} → ${resolution.resolvedId}`;
    }

    report.details.push(`Resolution method: ${resolution.method}`);
    report.details.push(`Confidence: ${(resolution.confidence * 100).toFixed(0)}%`);

    if (resolution.warnings.length > 0) {
      report.details.push(`Warnings: ${resolution.warnings.length}`);
    }

    // Öneriler
    if (resolution.confidence < this.confidenceThresholds.medium) {
      report.recommendations.push('Manual verification recommended');
    }

    if (resolution.suggestions.length > 0) {
      report.recommendations.push(
        `Consider these alternatives: ${resolution.suggestions.map(s => s.team.name).join(', ')}`
      );
    }

    return report;
  }

  /**
   * Cache'i temizle
   */
  clearCache() {
    this.searchCache.clear();
    this.logger.info('🧹 Team resolver cache cleared');
  }

  /**
   * Öğrenilen eşlemeleri dışa aktar
   */
  exportMappings() {
    const mappings = {};
    this.verifiedMappings.forEach((value, key) => {
      mappings[key] = {
        correctId: value.correctId,
        teamName: value.teamData.name,
        timestamp: new Date(value.timestamp).toISOString(),
      };
    });
    return mappings;
  }
}

module.exports = IntelligentTeamResolver;
