// Auto-generated active leagues from FootyStats subscription
// Generated on: 2025-06-25T12:28:03.407Z

export const DISCOVERED_ACTIVE_LEAGUES = {
  USA_MLS_USA: 13973, // USA MLS (USA) (30 teams, 510 matches)
  NORWAY_ELITESERIEN_NORWAY: 13987, // Norway Eliteserien (Norway) (16 teams, 240 matches)
  FINLAND_VEIKKAUSLIIGA_FINLAND: 14089, // Finland Veikkausliiga (Finland) (12 teams, 132 matches)
  FINLAND_YKK_SLIIGA_FINLAND: 14119, // Finland Ykkösliiga (Finland) (10 teams, 90 matches)
  BRAZIL_SERIE_A_BRAZIL: 14231, // Brazil Serie A (Brazil) (20 teams, 380 matches)
  BRAZIL_SERIE_B_BRAZIL: 14305, // Brazil Serie B (Brazil) (20 teams, 380 matches)
  SWEDEN_ALLSVENSKAN_SWEDEN: 13963, // Sweden Allsvenskan (Sweden) (16 teams, 240 matches)
  SWEDEN_SUPERETTAN_SWEDEN: 13975, // Sweden Superettan (Sweden) (16 teams, 240 matches)
  CHINA_CHINESE_SUPER_LEAGUE_CHINA: 14153, // China Chinese Super League (China) (16 teams, 240 matches)
  JAPAN_J2_LEAGUE_JAPAN: 13961, // Japan J2 League (Japan) (20 teams, 380 matches)
  CHINA_CHINA_LEAGUE_ONE_CHINA: 14400, // China China League One (China) (16 teams, 240 matches)
  JAPAN_J1_LEAGUE_JAPAN: 13960, // Japan J1 League (Japan) (20 teams, 380 matches)
} as const;

// Helper function to get all active league IDs
export const getActiveLeagueIds = (): number[] => {
  return Object.values(DISCOVERED_ACTIVE_LEAGUES);
};

// Helper function to get league by ID
export const getLeagueNameById = (id: number): string | undefined => {
  const entry = Object.entries(DISCOVERED_ACTIVE_LEAGUES).find(([, leagueId]) => leagueId === id);
  return entry ? entry[0].replace(/_/g, ' ') : undefined;
};
