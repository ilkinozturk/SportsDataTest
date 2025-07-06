const axios = require('axios');

/**
 * FINAL PRODUCTION VERSION - Handles 200+ leagues with maximum reliability
 * Properly processes the actual FootyStats API structure
 */

// Comprehensive league season patterns
const SEASON_PATTERNS = {
  // Summer leagues (single calendar year)
  summer: [
    'USA',
    'Brazil',
    'Norway',
    'Sweden',
    'Finland',
    'China',
    'Japan',
    'South Korea',
    'Chile',
    'Iceland',
    'Faroe Islands',
    'Republic of Ireland',
    'Latvia',
    'Estonia',
    'Kazakhstan',
    'Georgia',
    'Lithuania',
    'Belarus',
    'Colombia',
    'Ecuador',
    'Peru',
    'Uruguay',
    'Paraguay',
    'Venezuela',
    'Mexico',
    'Costa Rica',
    'Guatemala',
    'Honduras',
    'El Salvador',
    'Canada',
    'India',
    'Thailand',
    'Vietnam',
    'Singapore',
    'Malaysia',
  ],

  // Winter leagues (across two calendar years)
  winter: [
    'England',
    'Spain',
    'Italy',
    'Germany',
    'France',
    'Portugal',
    'Netherlands',
    'Belgium',
    'Scotland',
    'Turkey',
    'Russia',
    'Ukraine',
    'Poland',
    'Romania',
    'Greece',
    'Austria',
    'Switzerland',
    'Denmark',
    'Croatia',
    'Serbia',
    'Czech Republic',
    'Bulgaria',
    'Hungary',
    'Slovakia',
    'Slovenia',
    'Israel',
    'Cyprus',
    'Albania',
    'Bosnia and Herzegovina',
    'North Macedonia',
    'Montenegro',
    'Kosovo',
    'Armenia',
    'Azerbaijan',
    'Wales',
    'Northern Ireland',
    'Luxembourg',
    'Malta',
    'Gibraltar',
    'Andorra',
    'San Marino',
    'Liechtenstein',
    'Moldova',
  ],

  // Special cases
  special: {
    Australia: { start: 10, end: 5, type: 'cross-year' },
    'New Zealand': { start: 10, end: 5, type: 'cross-year' },
    Argentina: { start: 2, end: 12, type: 'calendar' },
  },
};

/**
 * Determine current season for a league based on its season pattern
 */
function getCurrentSeasonFinal(league, now = new Date()) {
  if (!league || !league.season || !Array.isArray(league.season) || league.season.length === 0) {
    console.warn(`⚠️ Invalid league data for ${league?.name || 'unknown'}`);
    return null;
  }

  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // 1-12
  const country = league.country || league.season[0]?.country;

  // Sort seasons by year (newest first)
  const sortedSeasons = [...league.season].sort((a, b) => {
    const yearA = parseInt(a.year?.toString().split('/')[0]) || 0;
    const yearB = parseInt(b.year?.toString().split('/')[0]) || 0;
    return yearB - yearA;
  });

  // Validate sorted seasons
  if (sortedSeasons.length === 0 || !sortedSeasons[0].id) {
    console.warn(`⚠️ No valid seasons for ${league.name}`);
    return null;
  }

  // Determine league type and target year
  let targetYear = currentYear;
  let confidence = 'high';

  // Check special cases first
  if (SEASON_PATTERNS.special[country]) {
    const special = SEASON_PATTERNS.special[country];
    if (country === 'Australia' || country === 'New Zealand') {
      // Oct-May season
      if (currentMonth >= 10) {
        targetYear = currentYear + 1;
      } else if (currentMonth <= 5) {
        targetYear = currentYear;
      } else {
        targetYear = currentYear;
        confidence = 'medium';
      }
    } else if (country === 'Argentina') {
      // Feb-Dec season
      if (currentMonth >= 2 && currentMonth <= 12) {
        targetYear = currentYear;
      } else {
        targetYear = currentYear - 1;
        confidence = 'medium';
      }
    }
  }
  // Summer leagues
  else if (SEASON_PATTERNS.summer.includes(country)) {
    // Handle league name specific patterns
    const leagueName = league.name.toLowerCase();

    // Special handling for specific leagues
    if (leagueName.includes('mls') || leagueName.includes('usl')) {
      // MLS/USL: March to November
      if (currentMonth >= 3 && currentMonth <= 11) {
        targetYear = currentYear;
      } else if (currentMonth <= 2) {
        targetYear = currentYear - 1;
        confidence = 'medium';
      } else {
        targetYear = currentYear;
      }
    } else if (country === 'Brazil') {
      // Brazilian leagues: April to December
      if (currentMonth >= 4 && currentMonth <= 12) {
        targetYear = currentYear;
      } else {
        targetYear = currentYear - 1;
        confidence = 'medium';
      }
    } else if (country === 'Norway' || country === 'Sweden' || country === 'Finland') {
      // Nordic leagues: April to October/November
      if (currentMonth >= 4 && currentMonth <= 11) {
        targetYear = currentYear;
      } else if (currentMonth <= 3) {
        targetYear = currentYear - 1;
        confidence = 'medium';
      } else {
        targetYear = currentYear;
      }
    } else {
      // Default summer pattern
      if (currentMonth >= 3 && currentMonth <= 11) {
        targetYear = currentYear;
      } else if (currentMonth <= 2) {
        targetYear = currentYear - 1;
        confidence = 'medium';
      } else {
        targetYear = currentYear;
      }
    }
  }
  // Winter leagues
  else if (SEASON_PATTERNS.winter.includes(country)) {
    if (currentMonth >= 8) {
      // Aug-Dec: new season
      targetYear = currentYear;
    } else if (currentMonth <= 5) {
      // Jan-May: previous season
      targetYear = currentYear - 1;
    } else {
      // Jun-Jul: between seasons
      targetYear = currentYear - 1;
      confidence = 'medium';
    }
  }
  // Unknown pattern
  else {
    console.warn(`⚠️ Unknown country pattern: ${country} - using winter logic`);
    targetYear = currentMonth >= 8 ? currentYear : currentYear - 1;
    confidence = 'low';
  }

  // Find the best matching season
  let matchedSeason = null;

  // Try exact year match first
  matchedSeason = sortedSeasons.find(s => {
    const seasonYear = parseInt(s.year?.toString().split('/')[0]);
    return seasonYear === targetYear;
  });

  // If no exact match and we have low confidence, try adjacent years
  if (!matchedSeason && confidence !== 'high') {
    // Try next year
    matchedSeason = sortedSeasons.find(s => {
      const seasonYear = parseInt(s.year?.toString().split('/')[0]);
      return seasonYear === targetYear + 1;
    });

    // Try previous year
    if (!matchedSeason) {
      matchedSeason = sortedSeasons.find(s => {
        const seasonYear = parseInt(s.year?.toString().split('/')[0]);
        return seasonYear === targetYear - 1;
      });
    }
  }

  // Fallback to most recent season
  if (!matchedSeason) {
    matchedSeason = sortedSeasons[0];
    confidence = 'fallback';
    console.warn(`⚠️ Using fallback (most recent) season for ${league.name}`);
  }

  // Add confidence level to the result
  if (matchedSeason) {
    matchedSeason._confidence = confidence;
    matchedSeason._leagueName = league.name;
    matchedSeason._targetYear = targetYear;
  }

  return matchedSeason;
}

/**
 * Main function to get chosen league season IDs with maximum reliability
 */
async function getChosenLeagueSeasonIdsFinal(apiKey, baseUrl) {
  // Input validation
  if (!apiKey) {
    throw new Error('API key is required');
  }
  if (!baseUrl) {
    throw new Error('Base URL is required');
  }

  const startTime = Date.now();
  let response;

  try {
    console.log('🌐 Fetching chosen leagues from FootyStats API...');

    // Make API call with retry logic
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      try {
        response = await axios.get(`${baseUrl}/league-list`, {
          params: {
            key: apiKey,
            chosen_leagues_only: 'true',
          },
          timeout: 30000,
          validateStatus: status => status === 200,
        });
        break;
      } catch (error) {
        attempts++;
        if (attempts >= maxAttempts) {
          throw new Error(`Failed after ${maxAttempts} attempts: ${error.message}`);
        }
        console.warn(`⚠️ Attempt ${attempts} failed, retrying...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    // Validate response
    if (!response?.data?.success || !Array.isArray(response?.data?.data)) {
      throw new Error('Invalid API response structure');
    }

    const leagues = response.data.data;
    console.log(`✅ Fetched ${leagues.length} chosen leagues from API`);

    // Process leagues
    console.log('🔍 Processing leagues...');
    const results = [];
    const errors = [];
    const now = new Date();

    for (const league of leagues) {
      try {
        // Validate league structure
        if (!league || typeof league !== 'object') {
          errors.push({ league: 'unknown', error: 'Invalid league object' });
          continue;
        }

        if (!league.name) {
          errors.push({ league: 'unknown', error: 'Missing league name' });
          continue;
        }

        // Get current season
        const currentSeason = getCurrentSeasonFinal(league, now);

        if (currentSeason && currentSeason.id) {
          const country = currentSeason.country || league.country || 'Unknown';

          results.push({
            league_name: league.name,
            country: country,
            season_id: currentSeason.id,
            season_name: currentSeason.year?.toString(),
            confidence: currentSeason._confidence || 'unknown',
            target_year: currentSeason._targetYear,
          });

          // Special handling for Moldova formatting
          let displayYear = currentSeason.year?.toString();
          if (country === 'Moldova' && now.getMonth() + 1 >= 8 && now.getMonth() + 1 <= 12) {
            const year = parseInt(displayYear);
            if (!isNaN(year)) {
              displayYear = `${year}/${year + 1}`;
            }
          }

          console.log(
            `✅ ${league.name} -> Current season: ${displayYear} (ID: ${currentSeason.id}) [${currentSeason._confidence || 'high'}]`
          );
        } else {
          errors.push({
            league: league.name,
            error: 'Could not determine current season',
          });
          console.warn(`⚠️ Could not determine current season for ${league.name}`);
        }
      } catch (error) {
        errors.push({
          league: league?.name || 'unknown',
          error: error.message,
        });
        console.error(`❌ Error processing ${league?.name}: ${error.message}`);
      }
    }

    // Report summary
    const elapsedTime = Date.now() - startTime;
    console.log(`📊 Processing complete in ${elapsedTime}ms`);
    console.log(`✅ Successfully processed: ${results.length} leagues`);
    if (errors.length > 0) {
      console.log(`⚠️ Errors encountered: ${errors.length}`);
      // Log first few errors for debugging
      errors.slice(0, 5).forEach(err => {
        console.log(`   - ${err.league}: ${err.error}`);
      });
      if (errors.length > 5) {
        console.log(`   ... and ${errors.length - 5} more`);
      }
    }

    // Final validation
    if (results.length === 0) {
      throw new Error('No leagues could be processed successfully');
    }

    // Sort results for consistent output
    results.sort((a, b) => {
      if (a.country !== b.country) {
        return a.country.localeCompare(b.country);
      }
      return a.league_name.localeCompare(b.league_name);
    });

    return results;
  } catch (error) {
    console.error('❌ Critical error in getChosenLeagueSeasonIdsFinal:', error.message);
    throw error;
  }
}

module.exports = getChosenLeagueSeasonIdsFinal;
