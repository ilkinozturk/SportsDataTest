const Logger = require('../utils/logger');

/**
 * Chosen Leagues Only Resolver
 * Sadece chosen leagues'deki takımlarla çalışan çözümleme sistemi
 */
class ChosenLeaguesOnlyResolver {
  constructor(apiKey, baseUrl) {
    this.logger = new Logger('ChosenLeaguesOnlyResolver');
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;

    // Chosen leagues dışında olduğu bilinen takımlar
    this.outOfScopeTeams = {
      // Premier League takımları - chosen leagues'de değil
      4: {
        actualName: 'Manchester City',
        league: 'Premier League',
        country: 'England',
        message: 'Premier League is not in chosen leagues. This ID returns a different team.',
      },
      5: {
        actualName: 'Manchester United',
        league: 'Premier League',
        country: 'England',
        message: 'Premier League is not in chosen leagues. This ID returns a different team.',
      },

      // Diğer erişilemeyen takımlar buraya eklenebilir
    };

    // Chosen leagues listesi cache
    this.chosenLeaguesCache = null;
    this.cacheTimestamp = 0;
    this.CACHE_TTL = 60 * 60 * 1000; // 1 saat
  }

  /**
   * Takımın chosen leagues'de olup olmadığını kontrol et
   */
  async isTeamInChosenLeagues(teamData) {
    const leagues = await this.getChosenLeagues();

    // Takımın ülkesinin chosen leagues'de olup olmadığını kontrol et
    const countryInScope = leagues.some(league => league.country === teamData.country);

    if (!countryInScope) {
      return {
        inScope: false,
        reason: 'country_not_in_chosen_leagues',
        message: `${teamData.country} is not in our chosen leagues`,
      };
    }

    // Competition ID'nin chosen leagues'de olup olmadığını kontrol et
    const leagueInScope = leagues.some(
      league => league.season && league.season.some(s => s.id === teamData.competition_id)
    );

    if (!leagueInScope) {
      return {
        inScope: false,
        reason: 'league_not_in_chosen_leagues',
        message: `This league/competition is not in our chosen leagues`,
      };
    }

    return {
      inScope: true,
      reason: 'in_chosen_leagues',
      message: 'Team is accessible in chosen leagues',
    };
  }

  /**
   * Takım çözümleme - sadece chosen leagues kapsamında
   */
  async resolveTeam(teamId, apiTeamData) {
    const resolution = {
      teamId: teamId,
      isAccessible: true,
      warnings: [],
      metadata: {},
    };

    // 1. Bilinen erişilemeyen takım mı kontrol et
    const outOfScope = this.outOfScopeTeams[teamId];
    if (outOfScope) {
      resolution.warnings.push({
        type: 'out_of_scope_team',
        severity: 'info',
        message: outOfScope.message,
        expectedTeam: outOfScope.actualName,
        expectedLeague: outOfScope.league,
        actualTeam: apiTeamData.name,
        explanation: 'This ID originally belonged to a team outside chosen leagues',
      });

      resolution.metadata.originalTeam = outOfScope;
      resolution.metadata.scopeStatus = 'id_reassigned_in_api';
    }

    // 2. Mevcut takımın chosen leagues'de olup olmadığını kontrol et
    const scopeCheck = await this.isTeamInChosenLeagues(apiTeamData);

    if (!scopeCheck.inScope) {
      resolution.isAccessible = false;
      resolution.warnings.push({
        type: 'team_not_accessible',
        severity: 'warning',
        message: scopeCheck.message,
        reason: scopeCheck.reason,
      });
    }

    // 3. Chosen leagues bilgisini ekle
    resolution.metadata.chosenLeaguesStatus = scopeCheck;

    return resolution;
  }

  /**
   * Chosen leagues listesini al
   */
  async getChosenLeagues() {
    // Cache kontrolü
    if (this.chosenLeaguesCache && Date.now() - this.cacheTimestamp < this.CACHE_TTL) {
      return this.chosenLeaguesCache;
    }

    try {
      const axios = require('axios');
      const response = await axios.get(`${this.baseUrl}/league-list`, {
        params: {
          key: this.apiKey,
          chosen_leagues_only: true,
        },
      });

      if (response.data.success && response.data.data) {
        this.chosenLeaguesCache = response.data.data;
        this.cacheTimestamp = Date.now();
        return response.data.data;
      }

      return [];
    } catch (error) {
      this.logger.error('Error fetching chosen leagues:', error.message);
      return this.chosenLeaguesCache || [];
    }
  }

  /**
   * Mevcut chosen leagues'deki ülkeleri listele
   */
  async getAvailableCountries() {
    const leagues = await this.getChosenLeagues();
    const countries = [...new Set(leagues.map(l => l.country))].sort();
    return countries;
  }

  /**
   * Belirli bir ülkedeki chosen leagues'leri getir
   */
  async getLeaguesByCountry(country) {
    const leagues = await this.getChosenLeagues();
    return leagues.filter(l => l.country === country);
  }

  /**
   * Takım arama - sadece chosen leagues içinde
   */
  async searchTeamInChosenLeagues(teamName, country = null) {
    const leagues = await this.getChosenLeagues();
    const results = [];

    // Ülke filtresi
    const targetLeagues = country ? leagues.filter(l => l.country === country) : leagues;

    this.logger.info(`🔍 Searching for "${teamName}" in ${targetLeagues.length} chosen leagues...`);

    // Not: Gerçek implementasyonda burada league-teams API çağrıları yapılacak
    // Şimdilik konsept olarak bırakıyoruz

    return {
      searched: true,
      scope: 'chosen_leagues_only',
      leaguesSearched: targetLeagues.length,
      results: results,
      message: 'Search limited to chosen leagues only',
    };
  }

  /**
   * Kapsamı açıklayan rapor oluştur
   */
  generateScopeReport() {
    return {
      scope: 'chosen_leagues_only',
      explanation: 'This system only has access to teams in chosen leagues',
      limitations: [
        'Premier League teams (England) are not accessible',
        'La Liga teams (Spain) are not accessible',
        'Serie A teams (Italy) are not accessible',
        'Bundesliga teams (Germany) are not accessible',
        'Ligue 1 teams (France) are not accessible',
      ],
      availableLeagues: [
        'MLS (USA)',
        'Chinese Super League (China)',
        'Allsvenskan (Sweden)',
        'Eliteserien (Norway)',
        'Serie A (Brazil)',
        'J1 League (Japan)',
        'And 34 more leagues...',
      ],
      recommendation: 'To access teams from other leagues, they must be added to chosen leagues',
    };
  }

  /**
   * ID'nin yeniden atanmış olup olmadığını kontrol et
   */
  checkIfIdReassigned(teamId, currentTeamData) {
    const knownOriginal = this.outOfScopeTeams[teamId];

    if (!knownOriginal) {
      return {
        isReassigned: false,
      };
    }

    // ID farklı bir takıma atanmış
    if (currentTeamData.name !== knownOriginal.actualName) {
      return {
        isReassigned: true,
        originalTeam: knownOriginal.actualName,
        originalLeague: knownOriginal.league,
        currentTeam: currentTeamData.name,
        currentCountry: currentTeamData.country,
        explanation: `ID ${teamId} originally belonged to ${knownOriginal.actualName} (${knownOriginal.league}) which is not in chosen leagues. The API has reassigned this ID to ${currentTeamData.name}.`,
      };
    }

    return {
      isReassigned: false,
    };
  }
}

module.exports = ChosenLeaguesOnlyResolver;
