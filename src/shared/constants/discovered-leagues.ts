// AUTO-GENERATED ACTIVE LEAGUES FROM FOOTYSTATS SUBSCRIPTION
// Generated on: 2025-06-25T12:28:03.407Z
// Total Active Leagues: 25 (out of 1695 available)
// Discovery Status: Tested 200 leagues, found 25 active

/**
 * All leagues that are currently activated in the FootyStats subscription
 * These leagues have been verified to return valid data for teams and matches
 * Updated through systematic API testing, not dashboard scraping
 */
export const DISCOVERED_ACTIVE_LEAGUES = {
  // === FIRST DISCOVERY BATCH (1-50) === //

  // North America
  USA_MLS: 13973, // USA MLS (USA) - 30 teams, 510 matches

  // Europe - Nordic/Scandinavian
  NORWAY_ELITESERIEN: 13987, // Norway Eliteserien (Norway) - 16 teams, 240 matches
  FINLAND_VEIKKAUSLIIGA: 14089, // Finland Veikkausliiga (Finland) - 12 teams, 132 matches
  FINLAND_YKKOSLIIGA: 14119, // Finland Ykkösliiga (Finland) - 10 teams, 90 matches
  SWEDEN_ALLSVENSKAN: 13963, // Sweden Allsvenskan (Sweden) - 16 teams, 240 matches
  SWEDEN_SUPERETTAN: 13975, // Sweden Superettan (Sweden) - 16 teams, 240 matches

  // South America
  BRAZIL_SERIE_A: 14231, // Brazil Serie A (Brazil) - 20 teams, 380 matches
  BRAZIL_SERIE_B: 14305, // Brazil Serie B (Brazil) - 20 teams, 380 matches

  // Asia
  CHINA_SUPER_LEAGUE: 14153, // China Chinese Super League (China) - 16 teams, 240 matches
  CHINA_LEAGUE_ONE: 14400, // China China League One (China) - 16 teams, 240 matches
  JAPAN_J1_LEAGUE: 13960, // Japan J1 League (Japan) - 20 teams, 380 matches
  JAPAN_J2_LEAGUE: 13961, // Japan J2 League (Japan) - 20 teams, 380 matches

  // === EXTENDED DISCOVERY BATCH (51-200) === //

  // Europe - Baltic States
  LATVIA_VIRSLIGA: 14275, // Latvia Virsliga (Latvia) - 10 teams, 180 matches
  ESTONIA_MEISTRILIIGA: 14165, // Estonia Meistriliiga (Estonia) - 10 teams, 180 matches
  ESTONIA_ESILIIGA: 14233, // Estonia Esiliiga (Estonia) - 10 teams, 180 matches

  // Europe - Nordic Extended
  NORWAY_FIRST_DIVISION: 13990, // Norway First Division (Norway) - 16 teams, 240 matches
  ICELAND_URVALSDEILD: 14017, // Iceland Úrvalsdeild (Iceland) - 12 teams, 132 matches
  ICELAND_1_DEILD: 14036, // Iceland 1. Deild (Iceland) - 12 teams, 132 matches
  SWEDEN_DIVISION_1: 7151, // Sweden Division 1 (Sweden) - 32 teams, 480 matches

  // Europe - Ireland
  IRELAND_PREMIER_DIVISION: 13952, // Republic of Ireland Premier Division (Republic of Ireland) - 10 teams, 180 matches
  IRELAND_FIRST_DIVISION: 13950, // Republic of Ireland First Division (Republic of Ireland) - 10 teams, 180 matches

  // South America - Chile
  CHILE_PRIMERA_DIVISION: 495, // Chile Primera División (Chile) - 16 teams, 241 matches
  CHILE_PRIMERA_B: 500, // Chile Primera B (Chile) - 15 teams, 210 matches

  // Asia - South Korea
  SOUTH_KOREA_K_LEAGUE_1: 14069, // South Korea K League 1 (South Korea) - 12 teams, 198 matches
  SOUTH_KOREA_K_LEAGUE_2: 14095, // South Korea K League 2 (South Korea) - 14 teams, 273 matches
} as const;

/**
 * Legacy working league ID that was previously discovered
 * Kept for backward compatibility
 */
export const LEGACY_WORKING_LEAGUES = {
  LEGACY_ID: 1625, // This ID still works from previous investigations
} as const;

/**
 * All active leagues combined (discovered + legacy)
 */
export const ALL_ACTIVE_LEAGUES = {
  ...DISCOVERED_ACTIVE_LEAGUES,
  ...LEGACY_WORKING_LEAGUES,
} as const;

/**
 * Leagues grouped by continent for better organization
 */
export const LEAGUES_BY_CONTINENT = {
  NORTH_AMERICA: {
    USA_MLS: 13973,
  },
  SOUTH_AMERICA: {
    BRAZIL_SERIE_A: 14231,
    BRAZIL_SERIE_B: 14305,
    CHILE_PRIMERA_DIVISION: 495,
    CHILE_PRIMERA_B: 500,
  },
  EUROPE: {
    // Nordic Countries
    NORWAY_ELITESERIEN: 13987,
    NORWAY_FIRST_DIVISION: 13990,
    SWEDEN_ALLSVENSKAN: 13963,
    SWEDEN_SUPERETTAN: 13975,
    SWEDEN_DIVISION_1: 7151,
    FINLAND_VEIKKAUSLIIGA: 14089,
    FINLAND_YKKOSLIIGA: 14119,
    ICELAND_URVALSDEILD: 14017,
    ICELAND_1_DEILD: 14036,

    // Baltic States
    LATVIA_VIRSLIGA: 14275,
    ESTONIA_MEISTRILIIGA: 14165,
    ESTONIA_ESILIIGA: 14233,

    // Ireland
    IRELAND_PREMIER_DIVISION: 13952,
    IRELAND_FIRST_DIVISION: 13950,
  },
  ASIA: {
    CHINA_SUPER_LEAGUE: 14153,
    CHINA_LEAGUE_ONE: 14400,
    JAPAN_J1_LEAGUE: 13960,
    JAPAN_J2_LEAGUE: 13961,
    SOUTH_KOREA_K_LEAGUE_1: 14069,
    SOUTH_KOREA_K_LEAGUE_2: 14095,
  },
} as const;

/**
 * Major European leagues that are available but NOT activated
 * These would need to be activated in the FootyStats dashboard
 */
export const MAJOR_EUROPEAN_LEAGUES_NOT_ACTIVATED = {
  PREMIER_LEAGUE: 12325, // England Premier League 2024-25
  LA_LIGA: 12316, // Spain La Liga 2024-25
  BUNDESLIGA: 12529, // Germany Bundesliga 2024-25
  SERIE_A: 12530, // Italy Serie A 2024-25
  LIGUE_1: 12337, // France Ligue 1 2024-25
  CHAMPIONS_LEAGUE: 12321, // UEFA Champions League 2024-25
  EUROPA_LEAGUE: 12327, // UEFA Europa League 2024-25
} as const;

// === HELPER FUNCTIONS === //

/**
 * Get all active league IDs as an array
 */
export const getActiveLeagueIds = (): number[] => {
  return Object.values(ALL_ACTIVE_LEAGUES);
};

/**
 * Get league name by ID
 */
export const getLeagueNameById = (id: number): string | undefined => {
  const entry = Object.entries(ALL_ACTIVE_LEAGUES).find(([, leagueId]) => leagueId === id);
  return entry ? entry[0].replace(/_/g, ' ') : undefined;
};

/**
 * Get leagues by continent
 */
export const getLeaguesByContinent = (continent: keyof typeof LEAGUES_BY_CONTINENT): number[] => {
  return Object.values(LEAGUES_BY_CONTINENT[continent]);
};

/**
 * Check if a league ID is active
 */
export const isLeagueActive = (leagueId: number): boolean => {
  return getActiveLeagueIds().includes(leagueId);
};

/**
 * Get total number of active leagues
 */
export const getActiveLeagueCount = (): number => {
  return getActiveLeagueIds().length;
};

/**
 * Get discovery statistics
 */
export const getDiscoveryStats = () => {
  return {
    totalActiveLeagues: getActiveLeagueCount(),
    discoveredLeagues: Object.keys(DISCOVERED_ACTIVE_LEAGUES).length,
    legacyLeagues: Object.keys(LEGACY_WORKING_LEAGUES).length,
    continents: Object.keys(LEAGUES_BY_CONTINENT).length,
    countriesRepresented: [
      'USA',
      'Brazil',
      'Chile',
      'Norway',
      'Sweden',
      'Finland',
      'Iceland',
      'Latvia',
      'Estonia',
      'Ireland',
      'China',
      'Japan',
      'South Korea',
    ].length,
    lastUpdated: '2025-06-25T12:28:03.407Z',
  };
};

// === BACKWARDS COMPATIBILITY === //

/**
 * @deprecated Use DISCOVERED_ACTIVE_LEAGUES instead
 * Kept for backward compatibility with existing code
 */
export const WORKING_LEAGUES = DISCOVERED_ACTIVE_LEAGUES;

/**
 * @deprecated Use ALL_ACTIVE_LEAGUES instead
 * Kept for backward compatibility with existing code
 */
export const MAJOR_LEAGUES = ALL_ACTIVE_LEAGUES;
