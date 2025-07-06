const axios = require('axios');
const Logger = require('../utils/logger');

/**
 * Team Search Service
 * FootyStats API'de takım arama servisi - Sadece chosen leagues içinde arama yapar
 */
class TeamSearchService {
  constructor(apiKey, baseUrl) {
    this.logger = new Logger('TeamSearchService');
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
    this.searchCache = new Map();
    this.CACHE_TTL = 60 * 60 * 1000; // 1 saat

    // Chosen leagues dışında olduğu bilinen ülkeler
    this.outOfScopeCountries = [
      'England',
      'Spain',
      'Italy',
      'Germany',
      'France',
      'Netherlands',
      'Portugal',
      'Belgium',
      'Scotland',
      'Turkey',
      'Greece',
      'Russia',
      'Ukraine',
    ];
  }

  /**
   * Tüm chosen leagues'de takım ara
   */
  async searchTeamInAllLeagues(teamName, country = null) {
    // Eğer ülke belirtilmişse ve chosen leagues dışındaysa direkt boş dön
    if (country && this.outOfScopeCountries.includes(country)) {
      this.logger.info(`❌ ${country} is not in chosen leagues, skipping search`);
      return [];
    }

    this.logger.info(
      `🔍 Searching for "${teamName}" ${country ? `in ${country}` : 'globally'} (chosen leagues only)...`
    );

    const results = [];

    try {
      // Önce seçili ligleri al
      const leaguesResponse = await axios.get(`${this.baseUrl}/league-list`, {
        params: {
          key: this.apiKey,
          chosen_leagues_only: true,
        },
      });

      if (!leaguesResponse.data.success) {
        throw new Error('Failed to fetch leagues');
      }

      const leagues = leaguesResponse.data.data || [];

      // Ülkeye göre filtrele
      const targetLeagues = country ? leagues.filter(l => l.country === country) : leagues;

      this.logger.info(`📋 Checking ${targetLeagues.length} leagues...`);

      // Her ligde ara
      for (const league of targetLeagues) {
        if (league.season && league.season.length > 0) {
          // En güncel sezonu al
          const currentSeason = league.season.sort((a, b) => {
            const yearA = parseInt(a.year?.toString().split('/')[0]) || 0;
            const yearB = parseInt(b.year?.toString().split('/')[0]) || 0;
            return yearB - yearA;
          })[0];

          if (currentSeason && currentSeason.id) {
            const teams = await this.getTeamsInSeason(currentSeason.id);

            // Takım ismine göre filtrele
            const matchingTeams = teams.filter(team => {
              const teamNameLower = team.name.toLowerCase();
              const searchNameLower = teamName.toLowerCase();

              return (
                teamNameLower.includes(searchNameLower) ||
                searchNameLower.includes(teamNameLower) ||
                this.fuzzyMatch(teamNameLower, searchNameLower)
              );
            });

            if (matchingTeams.length > 0) {
              matchingTeams.forEach(team => {
                results.push({
                  team: team,
                  league: {
                    id: currentSeason.id,
                    name: league.name,
                    country: league.country,
                    season: currentSeason.year,
                  },
                  matchScore: this.calculateMatchScore(team.name, teamName),
                });
              });
            }
          }
        }
      }

      // Sonuçları skora göre sırala
      results.sort((a, b) => b.matchScore - a.matchScore);

      if (results.length > 0) {
        this.logger.info(`✅ Found ${results.length} matches for "${teamName}" in chosen leagues`);
      } else {
        this.logger.info(`❌ No matches found for "${teamName}" in chosen leagues`);

        // Eğer ülke belirtilmemişse ve sonuç yoksa, out of scope ülkeleri hatırlat
        if (!country) {
          this.logger.info(
            `💡 Note: Teams from ${this.outOfScopeCountries.slice(0, 5).join(', ')} etc. are not in chosen leagues`
          );
        }
      }
    } catch (error) {
      this.logger.error(`Error searching teams: ${error.message}`);
    }

    return results;
  }

  /**
   * Belirli bir sezondaki takımları getir
   */
  async getTeamsInSeason(seasonId) {
    const cacheKey = `teams_${seasonId}`;
    const cached = this.searchCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data;
    }

    try {
      const response = await axios.get(`${this.baseUrl}/league-teams`, {
        params: {
          key: this.apiKey,
          season_id: seasonId,
        },
        timeout: 10000,
      });

      if (response.data.success && response.data.data) {
        const teams = response.data.data;

        // Cache'e kaydet
        this.searchCache.set(cacheKey, {
          data: teams,
          timestamp: Date.now(),
        });

        return teams;
      }
    } catch (error) {
      // 422 hatası alırsak muhtemelen sezon aktif değil
      if (error.response && error.response.status === 422) {
        return [];
      }
      console.warn(`Error fetching teams for season ${seasonId}: ${error.message}`);
    }

    return [];
  }

  /**
   * ID aralığında takım ara - ARTIK KULLANILMAMALI
   * Not: Bu metod chosen leagues dışındaki takımları bulabilir ama erişemezsiniz
   */
  async searchTeamsByIdRange(startId, endId, targetName) {
    console.warn(
      '⚠️ searchTeamsByIdRange is deprecated. Teams outside chosen leagues are not accessible.'
    );
    console.warn('🔒 Use searchTeamInAllLeagues instead to search within chosen leagues only.');

    return [];
  }

  /**
   * Belirli bir ID'yi kontrol et
   */
  async checkTeamId(teamId, targetName) {
    try {
      const response = await axios.get(`${this.baseUrl}/team`, {
        params: {
          key: this.apiKey,
          team_id: teamId,
        },
        timeout: 5000,
      });

      if (response.data.success && response.data.data && response.data.data.length > 0) {
        const team = response.data.data[0];
        const matchScore = this.calculateMatchScore(team.name, targetName);

        if (matchScore > 0.5) {
          this.logger.info(
            `  ✓ ID ${teamId}: ${team.name} (${team.country}) - Score: ${matchScore.toFixed(2)}`
          );
          return {
            teamId: teamId,
            team: team,
            matchScore: matchScore,
          };
        }
      }
    } catch (error) {
      // Hataları sessizce geç
    }

    return null;
  }

  /**
   * İsim eşleşme skoru hesapla
   */
  calculateMatchScore(actualName, searchName) {
    const normalize = str => str.toLowerCase().replace(/[^a-z0-9]/g, '');

    const actualNorm = normalize(actualName);
    const searchNorm = normalize(searchName);

    // Tam eşleşme
    if (actualNorm === searchNorm) {
      return 1.0;
    }

    // İçerme kontrolü
    if (actualNorm.includes(searchNorm) || searchNorm.includes(actualNorm)) {
      return 0.8;
    }

    // Kelime bazlı kontrol
    const actualWords = actualName.toLowerCase().split(/\s+/);
    const searchWords = searchName.toLowerCase().split(/\s+/);

    let matchedWords = 0;
    for (const word of searchWords) {
      if (actualWords.some(w => w === word || w.includes(word) || word.includes(w))) {
        matchedWords++;
      }
    }

    return (matchedWords / searchWords.length) * 0.7;
  }

  /**
   * Fuzzy matching
   */
  fuzzyMatch(str1, str2) {
    // Basit Levenshtein mesafesi kontrolü
    if (Math.abs(str1.length - str2.length) > 5) {
      return false;
    }

    // Ortak karakter sayısı
    const chars1 = str1.split('');
    const chars2 = str2.split('');

    let common = 0;
    for (const char of chars1) {
      if (chars2.includes(char)) {
        common++;
      }
    }

    return common / Math.max(chars1.length, chars2.length) > 0.7;
  }

  /**
   * Bilinen takımların doğru ID'lerini bul - Sadece chosen leagues içinde
   */
  async findKnownTeamIds() {
    const knownTeams = [
      // Chosen leagues içindeki takımlar
      { name: 'Inter Miami', country: 'USA' },
      { name: 'LA Galaxy', country: 'USA' },
      { name: 'New York City', country: 'USA' },
      { name: 'Chicago Fire', country: 'USA' },
      { name: 'New York RB', country: 'USA' },
      { name: 'Shanghai SIPG', country: 'China' },
      { name: 'Shanghai Shenhua', country: 'China' },
      { name: 'Flamengo', country: 'Brazil' },
      { name: 'Palmeiras', country: 'Brazil' },
      { name: 'AIK', country: 'Sweden' },
      { name: 'Hammarby', country: 'Sweden' },
    ];

    const foundMappings = {};

    for (const team of knownTeams) {
      this.logger.info(`\n🔍 Searching for ${team.name} (${team.country})...`);

      // Önce liglerde ara
      const results = await this.searchTeamInAllLeagues(team.name, team.country);

      if (results.length > 0) {
        const best = results[0];
        foundMappings[team.name] = {
          id: best.team.id,
          actualName: best.team.name,
          league: best.league.name,
          confidence: best.matchScore,
        };

        this.logger.info(`✅ Found: ID ${best.team.id} - ${best.team.name} in ${best.league.name}`);
      } else {
        this.logger.info(`❌ Not found in chosen leagues`);

        if (this.outOfScopeCountries.includes(team.country)) {
          this.logger.info(`💡 ${team.name} is from ${team.country} which is not in chosen leagues`);
        }
      }
    }

    return foundMappings;
  }

  /**
   * Cache'i temizle
   */
  clearCache() {
    this.searchCache.clear();
    this.logger.info('🧹 Search cache cleared');
  }
}

module.exports = TeamSearchService;
