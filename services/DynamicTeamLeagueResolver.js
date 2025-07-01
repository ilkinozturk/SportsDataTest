const axios = require('axios');
const getChosenLeagueSeasonIdsFinal = require('./getChosenLeagueSeasonIdsFinal');
const Logger = require('../utils/logger');

/**
 * Dynamic Team-League Resolver
 * Dinamik olarak takımın hangi ligde olduğunu bulur
 * Statik mapping'lere ihtiyaç duymaz
 */
class DynamicTeamLeagueResolver {
  constructor(apiKey, baseUrl) {
    this.logger = new Logger('DynamicTeamLeagueResolver');
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
    this.cache = new Map();
    this.CACHE_TTL = 30 * 60 * 1000; // 30 dakika
  }

  /**
   * Takım için doğru season ID'yi dinamik olarak bul
   */
  async resolveTeamSeason(teamId) {
    const cacheKey = `team_season_${teamId}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      this.logger.info(`\n🔍 Dinamik takım-lig çözümleme: Team ${teamId}`);

      // 1. Takım bilgilerini al
      const teamData = await this.getTeamData(teamId);
      if (!teamData) {
        throw new Error(`Takım ${teamId} bulunamadı`);
      }

      const { name: teamName, country, competition_id } = teamData;
      this.logger.info(`📌 ${teamName} (${country}) - Competition ID: ${competition_id}`);

      // 2. Chosen ligleri al
      const chosenLeagues = await getChosenLeagueSeasonIdsFinal(this.apiKey, this.baseUrl);

      // 3. Takımın ülkesindeki ligleri bul
      const countryLeagues = chosenLeagues.filter(
        league => league.country === country && league.season_id
      );

      this.logger.info(`🌍 ${country} ülkesinde ${countryLeagues.length} lig bulundu`);

      // 4. Her ligde takımı ara
      for (const league of countryLeagues) {
        const teamExists = await this.checkTeamInLeague(teamId, league.season_id);
        if (teamExists) {
          this.logger.info(`✅ Takım bulundu: ${league.name} (Season ${league.season_id})`);

          const result = {
            seasonId: league.season_id,
            leagueName: league.name,
            country: league.country,
            confidence: 1.0,
            method: 'dynamic_search',
          };

          this.setCache(cacheKey, result);
          return result;
        }
      }

      // 5. Takım bulunamadıysa, competition_id'yi dene
      this.logger.info(
        `⚠️ Takım chosen liglerde bulunamadı, competition ID kullanılıyor: ${competition_id}`
      );

      // Competition ID'nin geçerli bir sezon olup olmadığını kontrol et
      const isValidSeason = await this.checkSeasonValid(competition_id);
      if (isValidSeason) {
        const result = {
          seasonId: competition_id,
          leagueName: 'Unknown League',
          country: country,
          confidence: 0.5,
          method: 'competition_id_fallback',
        };

        this.setCache(cacheKey, result);
        return result;
      }

      throw new Error(`Takım ${teamName} için geçerli lig bulunamadı`);
    } catch (error) {
      this.logger.error(`❌ Dinamik çözümleme hatası: ${error.message}`);
      return null;
    }
  }

  /**
   * Takımın belirli bir ligde olup olmadığını kontrol et
   */
  async checkTeamInLeague(teamId, seasonId) {
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
        return teams.some(team => team.id === teamId);
      }

      return false;
    } catch (error) {
      // 417 hatası = lig seçili değil
      if (error.response?.status === 417) {
        this.logger.info(`   ⚠️ Lig ${seasonId} kullanıcı tarafından seçilmemiş`);
      }
      return false;
    }
  }

  /**
   * Season ID'nin geçerli olup olmadığını kontrol et
   */
  async checkSeasonValid(seasonId) {
    try {
      const response = await axios.get(`${this.baseUrl}/league-season`, {
        params: {
          key: this.apiKey,
          season_id: seasonId,
        },
        timeout: 5000,
      });

      return response.data.success === true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Takım verilerini al
   */
  async getTeamData(teamId) {
    try {
      const response = await axios.get(`${this.baseUrl}/team`, {
        params: {
          key: this.apiKey,
          team_id: teamId,
        },
        timeout: 10000,
      });

      if (response.data.success && response.data.data?.length > 0) {
        return response.data.data[0];
      }

      return null;
    } catch (error) {
      this.logger.error(`❌ Takım verisi alınamadı: ${error.message}`);
      return null;
    }
  }

  /**
   * Cache yönetimi
   */
  getFromCache(key) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      this.logger.info(`💾 Cache hit: ${key}`);
      return cached.data;
    }
    return null;
  }

  setCache(key, data) {
    this.cache.set(key, {
      data: data,
      timestamp: Date.now(),
    });
  }

  clearCache() {
    this.cache.clear();
    this.logger.info('🧹 DynamicTeamLeagueResolver cache temizlendi');
  }
}

module.exports = DynamicTeamLeagueResolver;
