const express = require('express');
const cors = require('cors');
const axios = require('axios');
const moment = require('moment');
const path = require('path');

const app = express();
const PORT = 3001;

// API Key
const API_KEY = '29581005f929990bf13dc9c964200d537e484ee248f0ac2d0f76910a6ce7aae9';
const BASE_URL = 'https://api.football-data-api.com';

// Middleware
app.use(cors());
app.use(express.json());
app.use('/utils', express.static(path.join(__dirname, 'utils')));
app.use(express.static(__dirname));

// Rate limiting cache
let requestCount = 0;
let lastRequestTime = 0;

const rateLimit = async () => {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;

  if (timeSinceLastRequest < 1000) {
    // 1 second delay
    await new Promise(resolve => setTimeout(resolve, 1000 - timeSinceLastRequest));
  }

  lastRequestTime = Date.now();
  requestCount++;
};

// Helper function to make API requests
const makeApiRequest = async (endpoint, params = {}) => {
  try {
    await rateLimit();

    console.log(`🌐 API Request #${requestCount}: ${endpoint}`);

    const response = await axios.get(`${BASE_URL}${endpoint}`, {
      params: { key: API_KEY, ...params },
      timeout: 10000,
    });

    console.log(`✅ API Response: ${response.status}`);
    return response.data;
  } catch (error) {
    console.error(`❌ API Error: ${error.message}`);
    throw error;
  }
};

// Format match data
const formatMatch = match => ({
  id:
    match.id ||
    `${match.homeID || match.home_id}-${match.awayID || match.away_id}-${match.date_unix}`,
  homeTeam: {
    id: match.homeID || match.home_id,
    name: match.home_name,
    logo: match.home_image,
  },
  awayTeam: {
    id: match.awayID || match.away_id,
    name: match.away_name,
    logo: match.away_image,
  },
  league: {
    id: match.competition_id || match.league_id,
    name: match.competition || 'Unknown League',
    country: match.country || 'Unknown',
  },
  date: match.date_unix ? new Date(match.date_unix * 1000).toISOString() : new Date().toISOString(),
  status: match.status || 'scheduled',
  homeScore: match.homeGoalCount || match.home_goals,
  awayScore: match.awayGoalCount || match.away_goals,
  venue: match.stadium_name || match.venue,
});

// Root route - serve demo page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'demo.html'));
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// API test
app.get('/api/test', async (req, res) => {
  try {
    const data = await makeApiRequest('/league-list');
    res.json({
      success: true,
      message: 'API connection successful',
      data: { leagues: data.data?.length || 0 },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Get today's matches
app.get('/api/matches/today', async (req, res) => {
  try {
    console.log("📅 Fetching today's matches...");

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const currentYear = today.getFullYear();

    // Try different date ranges for current season
    const startOfSeason = new Date(currentYear, 7, 1); // August 1st
    const endOfSeason = new Date(currentYear + 1, 5, 30); // June 30th next year

    console.log(`Looking for matches on: ${todayStr}`);
    console.log(
      `Season range: ${startOfSeason.toISOString().split('T')[0]} to ${endOfSeason.toISOString().split('T')[0]}`
    );

    // Active leagues from FootyStats subscription (26 leagues discovered)
    const activeLeagues = [
      // North America
      { id: 13973, name: 'USA MLS' },

      // Europe - Nordic/Scandinavian
      { id: 13987, name: 'Norway Eliteserien' },
      { id: 13990, name: 'Norway First Division' },
      { id: 13963, name: 'Sweden Allsvenskan' },
      { id: 13975, name: 'Sweden Superettan' },
      { id: 7151, name: 'Sweden Division 1' },
      { id: 14089, name: 'Finland Veikkausliiga' },
      { id: 14119, name: 'Finland Ykkösliiga' },
      { id: 14017, name: 'Iceland Úrvalsdeild' },
      { id: 14036, name: 'Iceland 1. Deild' },

      // Europe - Baltic States
      { id: 14275, name: 'Latvia Virsliga' },
      { id: 14165, name: 'Estonia Meistriliiga' },
      { id: 14233, name: 'Estonia Esiliiga' },

      // Europe - Ireland
      { id: 13952, name: 'Ireland Premier Division' },
      { id: 13950, name: 'Ireland First Division' },

      // South America
      { id: 14231, name: 'Brazil Serie A' },
      { id: 14305, name: 'Brazil Serie B' },
      { id: 495, name: 'Chile Primera División' },
      { id: 500, name: 'Chile Primera B' },

      // Asia
      { id: 14153, name: 'China Super League' },
      { id: 14400, name: 'China League One' },
      { id: 13960, name: 'Japan J1 League' },
      { id: 13961, name: 'Japan J2 League' },
      { id: 14069, name: 'South Korea K League 1' },
      { id: 14095, name: 'South Korea K League 2' },

      // Legacy
      { id: 1625, name: 'Legacy League' },
    ];

    const allMatches = [];

    for (const league of activeLeagues) {
      try {
        console.log(`🔍 Checking ${league.name} (ID: ${league.id})...`);

        // Use confirmed working season IDs directly
        const data = await makeApiRequest('/league-matches', { league_id: league.id });

        if (data.success && data.data && data.data.length > 0) {
          console.log(`📊 Found ${data.data.length} total matches in ${league.name}`);

          // Get date range of available matches
          const dates = data.data
            .map(m => (m.date_unix ? new Date(m.date_unix * 1000) : null))
            .filter(d => d);
          if (dates.length > 0) {
            const minDate = new Date(Math.min(...dates)).toISOString().split('T')[0];
            const maxDate = new Date(Math.max(...dates)).toISOString().split('T')[0];
            console.log(`📅 Available date range: ${minDate} to ${maxDate}`);
          }

          // Filter for today and upcoming days (within 7 days)
          const recentMatches = data.data
            .filter(match => {
              if (!match.date_unix) {
                return false;
              }
              const matchDate = new Date(match.date_unix * 1000);
              const daysDiff = (matchDate - today) / (1000 * 60 * 60 * 24);
              return daysDiff >= -1 && daysDiff <= 7; // Yesterday to 7 days from now
            })
            .map(match => {
              const formatted = formatMatch(match);
              // Add league info
              formatted.league.name = league.name;
              return formatted;
            });

          console.log(`✅ Found ${recentMatches.length} recent/upcoming matches in ${league.name}`);
          allMatches.push(...recentMatches);
        } else {
          console.log(`❌ No data found for ${league.name}`);
        }
      } catch (error) {
        console.warn(`⚠️ Failed to fetch matches from ${league.name}:`, error.message);
      }
    }

    // Sort by date
    allMatches.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Filter for today specifically
    const todayMatches = allMatches.filter(match => {
      const matchDate = new Date(match.date).toISOString().split('T')[0];
      return matchDate === todayStr;
    });

    console.log(
      `🎯 Final result: ${todayMatches.length} matches today, ${allMatches.length} total recent matches`
    );

    // If no matches today, return recent matches for demo
    const resultMatches = todayMatches.length > 0 ? todayMatches : allMatches.slice(0, 10);

    res.json({
      success: true,
      data: resultMatches,
      meta: {
        todayCount: todayMatches.length,
        totalRecentCount: allMatches.length,
        searchDate: todayStr,
        note:
          todayMatches.length === 0
            ? 'No matches today, showing recent matches'
            : "Today's matches",
      },
    });
  } catch (error) {
    console.error("❌ Failed to fetch today's matches:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Get upcoming matches
app.get('/api/matches/upcoming', async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7;
    console.log(`🔮 Fetching upcoming matches for ${days} days...`);

    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(now.getDate() + days);

    const activeLeagueIds = [
      1, 16, 23, 24, 44, 45, 46, 58, 59, 60, 61, 62, 63, 64, 72, 100, 101, 102, 103, 104, 105, 106,
      107, 108, 109, 110, 111, 113, 127, 128, 129, 130, 131, 132, 152, 153, 154, 155, 156, 160, 162,
      163, 193,
    ];
    const allMatches = [];

    for (const leagueId of activeLeagueIds) {
      try {
        const data = await makeApiRequest('/league-matches', { league_id: leagueId });

        if (data.success && data.data) {
          const upcomingMatches = data.data
            .filter(match => {
              if (!match.date_unix) {
                return false;
              }
              const matchDate = new Date(match.date_unix * 1000);
              return matchDate >= now && matchDate <= futureDate;
            })
            .map(formatMatch);

          allMatches.push(...upcomingMatches);
        }
      } catch (error) {
        console.warn(`⚠️  Failed to fetch matches from league ${leagueId}:`, error.message);
      }
    }

    // Sort by date
    allMatches.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    console.log(`✅ Found ${allMatches.length} upcoming matches`);

    res.json({
      success: true,
      data: allMatches,
    });
  } catch (error) {
    console.error('❌ Failed to fetch upcoming matches:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// API stats
app.get('/api/stats', (req, res) => {
  res.json({
    success: true,
    data: {
      requestCount,
      lastRequestTime,
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    },
  });
});

// Error handling
app.use((error, req, res, next) => {
  console.error('Server error:', error);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`🔑 API Key configured: ${!!API_KEY}`);
  console.log(`📊 Environment: development`);
});

module.exports = app;
