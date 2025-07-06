/**
 * Known Team ID Mappings
 * Manuel olarak doğrulanmış takım ID eşlemeleri
 *
 * Bu dosya, FootyStats API'de yanlış takımları döndüren ID'ler için
 * manuel olarak oluşturulmuş eşlemeleri içerir.
 */

const knownMappings = {
  // ID 4: API'den "New York RB" geliyor ama biz "Manchester City" bekliyoruz
  // Ancak Manchester City bizim seçili liglerden değil, bu yüzden alternatif çözüm:
  4: {
    expectedTeam: {
      name: 'Manchester City',
      country: 'England',
      league: 'Premier League',
    },
    actualTeam: {
      id: 4,
      name: 'New York RB',
      country: 'USA',
      league: 'MLS',
    },
    resolution: 'NOT_IN_CHOSEN_LEAGUES',
    message: 'Manchester City is not available in chosen leagues. Showing New York RB instead.',
    alternativeSuggestion: 'Add Premier League to chosen leagues to access Manchester City',
  },

  // ID 5: Muhtemelen "Manchester United" bekleniyor
  5: {
    expectedTeam: {
      name: 'Manchester United',
      country: 'England',
      league: 'Premier League',
    },
    actualTeam: {
      id: 5,
      name: 'Unknown', // API'den gelen değer kontrol edilmeli
      country: 'Unknown',
      league: 'Unknown',
    },
    resolution: 'NOT_IN_CHOSEN_LEAGUES',
    message: 'Manchester United is not available in chosen leagues.',
    alternativeSuggestion: 'Add Premier League to chosen leagues to access Manchester United',
  },

  // ID 303: "Gimnàstic de Tarragona" geliyor ama başka bir takım bekleniyor olabilir
  303: {
    expectedTeam: {
      name: 'Unknown',
      country: 'Unknown',
      league: 'Unknown',
    },
    actualTeam: {
      id: 303,
      name: 'Gimnàstic de Tarragona',
      country: 'Spain',
      league: 'Segunda División',
    },
    resolution: 'NOT_IN_CHOSEN_LEAGUES',
    message: 'Spanish Segunda División is not in chosen leagues.',
    alternativeSuggestion: 'This ID returns a Spanish team which is not accessible',
  },

  // ID 5569: API'den "North Geelong Warriors" geliyor ama biz "Inter Miami" bekliyoruz
  5569: {
    expectedTeam: {
      name: 'Inter Miami',
      country: 'USA',
      league: 'MLS',
    },
    actualTeam: {
      id: 5569,
      name: 'North Geelong Warriors',
      country: 'Australia',
      league: 'Victoria NPL',
    },
    resolution: 'SEARCH_IN_MLS',
    message:
      'This ID returns an Australian team. Inter Miami might have a different ID in the API.',
    searchSuggestions: [
      'Try searching for "Inter Miami" in MLS teams',
      'Check recent MLS team additions',
      'ID might be in 14000+ range for newer teams',
    ],
  },

  // Premier League takımları - chosen leagues'de değil
  11: {
    expectedTeam: { name: 'Liverpool', country: 'England', league: 'Premier League' },
    resolution: 'NOT_IN_CHOSEN_LEAGUES',
  },
  15: {
    expectedTeam: { name: 'Chelsea', country: 'England', league: 'Premier League' },
    resolution: 'NOT_IN_CHOSEN_LEAGUES',
  },
  18: {
    expectedTeam: { name: 'Arsenal', country: 'England', league: 'Premier League' },
    resolution: 'NOT_IN_CHOSEN_LEAGUES',
  },
  22: {
    expectedTeam: { name: 'Tottenham', country: 'England', league: 'Premier League' },
    resolution: 'NOT_IN_CHOSEN_LEAGUES',
  },

  // La Liga takımları - chosen leagues'de değil
  81: {
    expectedTeam: { name: 'Barcelona', country: 'Spain', league: 'La Liga' },
    resolution: 'NOT_IN_CHOSEN_LEAGUES',
  },
  92: {
    expectedTeam: { name: 'Real Madrid', country: 'Spain', league: 'La Liga' },
    resolution: 'NOT_IN_CHOSEN_LEAGUES',
  },
  93: {
    expectedTeam: { name: 'Atletico Madrid', country: 'Spain', league: 'La Liga' },
    resolution: 'NOT_IN_CHOSEN_LEAGUES',
  },

  // Serie A takımları - chosen leagues'de değil
  102: {
    expectedTeam: { name: 'Juventus', country: 'Italy', league: 'Serie A' },
    resolution: 'NOT_IN_CHOSEN_LEAGUES',
  },
  110: {
    expectedTeam: { name: 'Inter Milan', country: 'Italy', league: 'Serie A' },
    resolution: 'NOT_IN_CHOSEN_LEAGUES',
  },
  113: {
    expectedTeam: { name: 'AC Milan', country: 'Italy', league: 'Serie A' },
    resolution: 'NOT_IN_CHOSEN_LEAGUES',
  },

  // Bundesliga takımları - chosen leagues'de değil
  40: {
    expectedTeam: { name: 'Bayern Munich', country: 'Germany', league: 'Bundesliga' },
    resolution: 'NOT_IN_CHOSEN_LEAGUES',
  },
  9: {
    expectedTeam: { name: 'Borussia Dortmund', country: 'Germany', league: 'Bundesliga' },
    resolution: 'NOT_IN_CHOSEN_LEAGUES',
  },

  // Diğer bilinen sorunlu ID'ler buraya eklenebilir
};

/**
 * ID eşlemesi al
 */
function getMapping(teamId) {
  return knownMappings[teamId] || null;
}

/**
 * Takım beklentisi kontrolü
 */
function checkTeamExpectation(teamId, actualTeamData) {
  const mapping = knownMappings[teamId];

  if (!mapping) {
    return {
      hasIssue: false,
      mapping: null,
    };
  }

  // Gelen takım beklenen takım mı?
  const isExpected =
    actualTeamData.name === mapping.expectedTeam.name &&
    actualTeamData.country === mapping.expectedTeam.country;

  return {
    hasIssue: !isExpected,
    mapping: mapping,
    isExpected: isExpected,
    severity: mapping.resolution === 'NOT_IN_CHOSEN_LEAGUES' ? 'high' : 'medium',
  };
}

/**
 * Alternatif takım önerisi
 */
function getSuggestedAlternatives(teamName, country) {
  // MLS'deki Inter Miami alternatifi
  if (teamName.toLowerCase().includes('inter miami')) {
    return [
      {
        suggestion: 'Search in MLS current season teams',
        possibleIds: 'Check IDs in 14000-15000 range',
      },
    ];
  }

  // Premier League takımları
  if (country === 'England') {
    return [
      {
        suggestion: 'Premier League is not in chosen leagues',
        action: 'Add Premier League to access English teams',
      },
    ];
  }

  // La Liga takımları
  if (country === 'Spain') {
    return [
      {
        suggestion: 'La Liga is not in chosen leagues',
        action: 'Add La Liga to access Spanish teams',
      },
    ];
  }

  // Serie A takımları
  if (country === 'Italy') {
    return [
      {
        suggestion: 'Serie A is not in chosen leagues',
        action: 'Add Serie A to access Italian teams',
      },
    ];
  }

  // Bundesliga takımları
  if (country === 'Germany') {
    return [
      {
        suggestion: 'Bundesliga is not in chosen leagues',
        action: 'Add Bundesliga to access German teams',
      },
    ];
  }

  // Ligue 1 takımları
  if (country === 'France') {
    return [
      {
        suggestion: 'Ligue 1 is not in chosen leagues',
        action: 'Add Ligue 1 to access French teams',
      },
    ];
  }

  return [];
}

/**
 * Çözüm raporu oluştur
 */
function generateResolutionReport(teamId, actualTeamData) {
  const check = checkTeamExpectation(teamId, actualTeamData);

  if (!check.hasIssue) {
    return {
      status: 'OK',
      message: 'Team data matches expectations',
    };
  }

  const mapping = check.mapping;

  return {
    status: 'MISMATCH',
    severity: check.severity,
    expected: mapping.expectedTeam,
    actual: {
      id: actualTeamData.id,
      name: actualTeamData.name,
      country: actualTeamData.country,
    },
    resolution: mapping.resolution,
    message: mapping.message,
    suggestions:
      mapping.searchSuggestions ||
      getSuggestedAlternatives(mapping.expectedTeam.name, mapping.expectedTeam.country),
    alternativeSuggestion: mapping.alternativeSuggestion,
  };
}

module.exports = {
  knownMappings,
  getMapping,
  checkTeamExpectation,
  getSuggestedAlternatives,
  generateResolutionReport,
};
