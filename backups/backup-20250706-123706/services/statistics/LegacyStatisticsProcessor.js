/**
 * Legacy Statistics Processor - processStatisticsLegacy refactored
 * Bu sınıf büyük monolitik processStatisticsLegacy fonksiyonunu modüler hale getirir
 */

const Logger = require('../../utils/logger');
const BasicStatsProcessor = require('./processors/BasicStatsProcessor');
const GoalsStatsProcessor = require('./processors/GoalsStatsProcessor');
const HomeAwayStatsProcessor = require('./processors/HomeAwayStatsProcessor');
const CardsStatsProcessor = require('./processors/CardsStatsProcessor');
const CornersStatsProcessor = require('./processors/CornersStatsProcessor');
const FormStatsProcessor = require('./processors/FormStatsProcessor');
const StreakStatsProcessor = require('./processors/StreakStatsProcessor');
const PercentageStatsProcessor = require('./processors/PercentageStatsProcessor');
const ShotsStatsProcessor = require('./processors/ShotsStatsProcessor');
const XGStatsProcessor = require('./processors/XGStatsProcessor');
const MiscStatsProcessor = require('./processors/MiscStatsProcessor');

class LegacyStatisticsProcessor {
  constructor() {
    this.logger = new Logger('LegacyStatisticsProcessor');
    
    // Initialize all processors
    this.basicProcessor = new BasicStatsProcessor();
    this.goalsProcessor = new GoalsStatsProcessor();
    this.homeAwayProcessor = new HomeAwayStatsProcessor();
    this.cardsProcessor = new CardsStatsProcessor();
    this.cornersProcessor = new CornersStatsProcessor();
    this.formProcessor = new FormStatsProcessor();
    this.streakProcessor = new StreakStatsProcessor();
    this.percentageProcessor = new PercentageStatsProcessor();
    this.shotsProcessor = new ShotsStatsProcessor();
    this.xgProcessor = new XGStatsProcessor();
    this.miscProcessor = new MiscStatsProcessor();
  }

  /**
   * Ana processing fonksiyonu - legacy processStatisticsLegacy'nin refactored versiyonu
   * @param {Object} apiStats - API'den gelen ham veriler
   * @param {Array} matches - Maç verileri
   * @param {String|Number} teamId - Takım ID'si
   * @returns {Object} İşlenmiş istatistikler
   */
  processStatistics(apiStats, matches = [], teamId = null) {
    try {
      this.logger.info(`🔄 Processing statistics for team ${teamId}`);
      
      // DEBUG: Log incoming apiStats
      console.log('[DEBUG] LegacyStatisticsProcessor çağrılıyor, apiStats keys:', Object.keys(apiStats || {}));
      console.log('[DEBUG] apiStats.stats keys:', Object.keys(apiStats?.stats || {}));
      console.log('[DEBUG] apiStats.additional_info keys:', Object.keys(apiStats?.additional_info || {}));
      console.log('[DEBUG] apiStats.stats.additional_info keys:', Object.keys(apiStats?.stats?.additional_info || {}));
      
      // Veri kaynaklarını hazırla
      const dataSources = this.prepareDataSources(apiStats);
      
      console.log('[DEBUG] Prepared dataSources:', {
        statsKeys: Object.keys(dataSources.stats),
        additionalInfoKeys: Object.keys(dataSources.additionalInfo),
        hasAdditionalInfo: dataSources._meta.hasAdditionalInfo
      });
      
      // Her kategori için ayrı ayrı process et
      const basicStats = this.basicProcessor.process(dataSources, matches, teamId);
      const goalsStats = this.goalsProcessor.process(dataSources, matches, teamId);
      const homeAwayStats = this.homeAwayProcessor.process(dataSources, matches, teamId);
      const cardsStats = this.cardsProcessor.process(dataSources, matches, teamId);
      console.log('[DEBUG] CardsProcessor result:', { cards1H_AVG: cardsStats.cards1H_AVG });
      
      const cornersStats = this.cornersProcessor.process(dataSources, matches, teamId);
      const formStats = this.formProcessor.process(dataSources, matches, teamId);
      const streakStats = this.streakProcessor.process(dataSources, matches, teamId);
      const percentageStats = this.percentageProcessor.process(dataSources, matches, teamId);
      const shotsStats = this.shotsProcessor.process(dataSources, matches, teamId);
      const xgStats = this.xgProcessor.process(dataSources, matches, teamId);
      const miscStats = this.miscProcessor.process(dataSources, matches, teamId);

      // Tüm sonuçları birleştir
      const result = {
        ...basicStats,
        ...goalsStats,
        ...homeAwayStats,
        ...cardsStats,
        ...cornersStats,
        ...formStats,
        ...streakStats,
        ...percentageStats,
        ...shotsStats,
        ...xgStats,
        ...miscStats
      };

      console.log('[DEBUG] LegacyStatisticsProcessor final result:', {
        cards1H_AVG: result.cards1H_AVG,
        cards1H_AVG_overall: result.cards1H_AVG_overall,
        cardsAverage: result.cardsAverage,
        cardsTotal: result.cardsTotal
      });

      this.logger.success(`✅ Statistics processed successfully for team ${teamId}`);
      return result;

    } catch (error) {
      this.logger.error(`❌ Error processing statistics for team ${teamId}:`, error);
      return this.getDefaultStats();
    }
  }

  /**
   * Veri kaynaklarını organize et
   * @param {Object} apiStats - API verisi
   * @returns {Object} Organize edilmiş veri kaynakları
   */
  prepareDataSources(apiStats) {
    // BUGFIX: API stats yapısı düzgün kontrol edilmeli
    if (!apiStats) {
      console.log('[DEBUG] prepareDataSources: apiStats is null/undefined');
      return {
        stats: {},
        additionalInfo: {},
        apiStats: {},
        _meta: {
          hasAdditionalInfo: false,
          additionalInfoKeys: [],
          statsKeys: [],
          dataSource: null
        }
      };
    }

    const stats = apiStats.stats || {};
    const additionalInfo = stats.additional_info || apiStats.additional_info || {};

    console.log('[DEBUG] prepareDataSources result:', {
      'stats.additional_info exists': !!stats.additional_info,
      'apiStats.additional_info exists': !!apiStats.additional_info,
      'additionalInfo keys count': Object.keys(additionalInfo).length,
      'sample additionalInfo keys': Object.keys(additionalInfo).slice(0, 10)
    });

    return {
      stats,
      additionalInfo,
      apiStats,
      // Debug bilgileri
      _meta: {
        hasAdditionalInfo: !!additionalInfo,
        additionalInfoKeys: Object.keys(additionalInfo),
        statsKeys: Object.keys(stats),
        dataSource: apiStats._dataSource
      }
    };
  }

  /**
   * Hata durumunda varsayılan istatistikler
   * @returns {Object} Varsayılan istatistik seti
   */
  getDefaultStats() {
    return {
      // Basic stats
      totalMatches: 0,
      completedMatches: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      points: 0,
      pointsPerGame: 0,

      // Goals
      goalsFor: 0,
      goalsAgainst: 0,
      goalDifference: 0,
      averageGoalsFor: 0,
      averageGoalsAgainst: 0,

      // Home/Away
      homeMatches: 0,
      homeWins: 0,
      homeDraws: 0,
      homeLosses: 0,
      awayMatches: 0,
      awayWins: 0,
      awayDraws: 0,
      awayLosses: 0,

      // Cards
      cardsTotal: 0,
      cardsAverage: 0,
      cardsFor: 0,
      cardsAgainst: 0,

      // Corners
      cornersFor: 0,
      cornersAgainst: 0,
      cornersAverage: 0,

      // Form
      last5Form: 'NNNNN',
      currentStreak: 0,
      streakType: 'none',

      // Percentages
      btts: 0,
      bttsNo: 0,
      over25: 0,
      under25: 0,

      _error: true,
      _message: 'Error occurred during processing'
    };
  }

  /**
   * Debugging için data sources bilgilerini logla
   * @param {Object} dataSources - Veri kaynakları
   */
  debugDataSources(dataSources) {
    this.logger.info('🔍 DEBUG DATA SOURCES:');
    this.logger.info('✓ Has stats:', !!dataSources.stats);
    this.logger.info('✓ Has additionalInfo:', !!dataSources.additionalInfo);
    this.logger.info('✓ AdditionalInfo keys count:', dataSources._meta.additionalInfoKeys.length);
    this.logger.info('✓ Stats keys count:', dataSources._meta.statsKeys.length);
    
    if (dataSources._meta.additionalInfoKeys.length > 0) {
      this.logger.info('📊 Sample additionalInfo keys:', 
        dataSources._meta.additionalInfoKeys.slice(0, 5));
    }
  }
}

module.exports = LegacyStatisticsProcessor;