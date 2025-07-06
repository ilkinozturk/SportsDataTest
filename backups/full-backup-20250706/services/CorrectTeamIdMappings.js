/**
 * Correct Team ID Mappings
 * FootyStats API'de yanlış ID'lerle gelen takımların doğru eşleşmeleri
 *
 * Bu dosya, test sonuçlarına göre oluşturulmuştur.
 * API'den beklediğimizden farklı takımlar geldiği tespit edilmiştir.
 */

const correctTeamMappings = {
  // USA - MLS Takımları
  // ID 4: New York RB (Doğru)
  // ID 7: Chicago Fire (Doğru)
  // ID 10: LA Galaxy geliyor ama Columbus Crew bekliyorduk
  10: {
    expectedTeam: 'Columbus Crew',
    actualTeam: 'LA Galaxy',
    correctId: null, // Columbus Crew'un doğru ID'sini bulmamız gerekiyor
    league: 'MLS',
    country: 'USA',
  },

  // ID 86: Sparta Praha geliyor ama Seattle Sounders bekliyorduk
  86: {
    expectedTeam: 'Seattle Sounders',
    actualTeam: 'Sparta Praha',
    correctId: null, // Seattle Sounders'ın doğru ID'sini bulmamız gerekiyor
    league: 'MLS',
    country: 'USA',
    note: 'Sparta Praha Czech Republic takımı, chosen leagues dışında',
  },

  // ID 124: Crusaders geliyor ama LA Galaxy bekliyorduk
  124: {
    expectedTeam: 'LA Galaxy',
    actualTeam: 'Crusaders',
    correctId: 10, // LA Galaxy'nin gerçek ID'si 10
    league: 'MLS',
    country: 'USA',
    note: 'Crusaders Northern Ireland takımı, chosen leagues dışında',
  },

  // Brazil Takımları - Hepsi yanlış
  134: {
    expectedTeam: 'Flamengo',
    actualTeam: 'PBDKT T-Team',
    correctId: null,
    league: 'Serie A',
    country: 'Brazil',
    note: 'PBDKT T-Team Malaysia takımı',
  },

  142: {
    expectedTeam: 'Palmeiras',
    actualTeam: 'West Bromwich Albion',
    correctId: null,
    league: 'Serie A',
    country: 'Brazil',
    note: 'West Brom England takımı, chosen leagues dışında',
  },

  146: {
    expectedTeam: 'Santos',
    actualTeam: 'Southampton',
    correctId: null,
    league: 'Serie A',
    country: 'Brazil',
    note: 'Southampton England takımı, chosen leagues dışında',
  },

  148: {
    expectedTeam: 'Sao Paulo',
    actualTeam: 'AFC Bournemouth',
    correctId: null,
    league: 'Serie A',
    country: 'Brazil',
    note: 'Bournemouth England takımı, chosen leagues dışında',
  },

  // Sweden Takımları - Hepsi yanlış
  368: {
    expectedTeam: 'AIK',
    actualTeam: 'Roda JC',
    correctId: null,
    league: 'Allsvenskan',
    country: 'Sweden',
    note: 'Roda JC Netherlands takımı, chosen leagues dışında',
  },

  372: {
    expectedTeam: 'Djurgardens',
    actualTeam: 'Groningen',
    correctId: null,
    league: 'Allsvenskan',
    country: 'Sweden',
    note: 'Groningen Netherlands takımı, chosen leagues dışında',
  },

  375: {
    expectedTeam: 'Hammarby',
    actualTeam: 'Twente',
    correctId: null,
    league: 'Allsvenskan',
    country: 'Sweden',
    note: 'Twente Netherlands takımı, chosen leagues dışında',
  },

  // Japan Takımları - Hepsi yanlış
  438: {
    expectedTeam: 'Kawasaki Frontale',
    actualTeam: 'Metz',
    correctId: null,
    league: 'J1 League',
    country: 'Japan',
    note: 'Metz France takımı, chosen leagues dışında',
  },

  441: {
    expectedTeam: 'Vissel Kobe',
    actualTeam: 'Lille',
    correctId: null,
    league: 'J1 League',
    country: 'Japan',
    note: 'Lille France takımı, chosen leagues dışında',
  },

  2269: {
    expectedTeam: 'Urawa Red Diamonds',
    actualTeam: 'Universitario Pando',
    correctId: null,
    league: 'J1 League',
    country: 'Japan',
    note: 'Universitario Pando Bolivia takımı',
  },

  // Norway Takımları - Hepsi yanlış
  361: {
    expectedTeam: 'Bodo/Glimt',
    actualTeam: 'Bucaspor',
    correctId: null,
    league: 'Eliteserien',
    country: 'Norway',
    note: 'Bucaspor Turkey takımı, chosen leagues dışında',
  },

  362: {
    expectedTeam: 'Brann',
    actualTeam: 'Orduspor',
    correctId: null,
    league: 'Eliteserien',
    country: 'Norway',
    note: 'Orduspor Turkey takımı, chosen leagues dışında',
  },

  363: {
    expectedTeam: 'Molde',
    actualTeam: 'Tavşanlı Linyitspor',
    correctId: null,
    league: 'Eliteserien',
    country: 'Norway',
    note: 'Tavşanlı Linyitspor Turkey takımı, chosen leagues dışında',
  },

  // Finland Takımları
  // ID 412: HJK (Doğru)

  413: {
    expectedTeam: 'KuPS',
    actualTeam: 'Lahti',
    correctId: null,
    league: 'Veikkausliiga',
    country: 'Finland',
    note: 'Lahti farklı ligde (Ykkösliiga)',
  },

  414: {
    expectedTeam: 'Haka',
    actualTeam: 'PK-35 Vantaa',
    correctId: null,
    league: 'Veikkausliiga',
    country: 'Finland',
    note: 'PK-35 Vantaa eski sezon verisi (2016)',
  },

  // China Takımları
  // ID 836: Shanghai SIPG (Doğru ama istatistik sorunu var)

  1093: {
    expectedTeam: 'Guangzhou FC',
    actualTeam: 'Skonto',
    correctId: null,
    league: 'Chinese Super League',
    country: 'China',
    note: 'Skonto Latvia takımı',
  },

  9306: {
    expectedTeam: 'Beijing Guoan',
    actualTeam: 'Fyllingsdalen II',
    correctId: null,
    league: 'Chinese Super League',
    country: 'China',
    note: 'Fyllingsdalen II Norway takımı',
  },

  // Australia
  // ID 5500: Green Gully (Doğru ama istatistik sorunu var)
};

/**
 * İstatistik sorunları olan takımlar
 * API'den gelen W/D/L değerleri ile league-tables'daki değerler uyuşmuyor
 */
const teamsWithStatisticsIssues = [
  {
    id: 836,
    name: 'Shanghai SIPG',
    issue: 'API: W=2, L=6 ama League Table: W=0, L=0',
    possibleCause: 'Sezon henüz başlamamış veya farklı sezon verileri',
  },
  {
    id: 5500,
    name: 'Green Gully',
    issue: 'API: W=7, L=7 ama League Table: W=0, L=0',
    possibleCause: 'Sezon henüz başlamamış veya farklı sezon verileri',
  },
  {
    id: 412,
    name: 'HJK',
    issue: 'API: W=3, L=5 ama League Table: W=0, L=0',
    possibleCause: 'Sezon henüz başlamamış veya farklı sezon verileri',
  },
  {
    id: 413,
    name: 'Lahti',
    issue: 'API: W=3, L=2 ama League Table: W=0, L=0',
    possibleCause: 'Sezon henüz başlamamış veya farklı sezon verileri',
  },
];

/**
 * Takım ID'sini düzelt
 */
function getCorrectTeamId(teamId) {
  const mapping = correctTeamMappings[teamId];
  if (mapping && mapping.correctId) {
    return mapping.correctId;
  }
  return teamId;
}

/**
 * Takımın beklenen mi yoksa farklı bir takım mı olduğunu kontrol et
 */
function checkTeamMismatch(teamId, actualTeamName, actualCountry) {
  const mapping = correctTeamMappings[teamId];
  if (!mapping) {
    return {
      hasMismatch: false,
      expectedTeam: null,
      actualTeam: actualTeamName,
    };
  }

  // İsim veya ülke uyuşmazlığı var mı?
  const nameMismatch =
    mapping.actualTeam && actualTeamName.toLowerCase() !== mapping.expectedTeam.toLowerCase();

  const countryMismatch =
    mapping.country &&
    actualCountry &&
    actualCountry.toLowerCase() !== mapping.country.toLowerCase();

  return {
    hasMismatch: nameMismatch || countryMismatch,
    expectedTeam: mapping.expectedTeam,
    actualTeam: actualTeamName,
    mapping: mapping,
  };
}

/**
 * Çözüm önerileri
 */
const solutions = {
  idMismatch: [
    "Takımların doğru ID'lerini bulmak için TeamSearchService kullanın",
    'Chosen leagues içindeki takımları listeleyin ve manuel olarak eşleştirin',
    "UniversalMappingService'e bu yeni eşlemeleri ekleyin",
  ],

  statisticsIssue: [
    "API'den gelen season_id ile league-tables'daki season_id'yi karşılaştırın",
    'Güncel sezon verilerini kullandığınızdan emin olun',
    'API response\'unda "season" alanını kontrol edin',
    "League-tables endpoint'inde doğru season_id parametresini kullanın",
  ],

  outOfScope: [
    'Chosen leagues dışındaki takımlar erişilemez',
    "Bu takımları görmek için liglerini chosen leagues'e ekleyin",
    'Alternatif olarak, chosen leagues içindeki benzer takımları kullanın',
  ],
};

module.exports = {
  correctTeamMappings,
  teamsWithStatisticsIssues,
  getCorrectTeamId,
  checkTeamMismatch,
  solutions,
};
