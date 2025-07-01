const axios = require('axios');

const API_KEY = '29581005f929990bf13dc9c964200d537e484ee248f0ac2d0f76910a6ce7aae9';
const BASE_URL = 'https://api.football-data-api.com';

async function findAllTeamStats() {
  console.log('🔍 Finding ALL Available Team Statistics...\n');

  try {
    const teamId = 7; // Chicago Fire

    const response = await axios.get(`${BASE_URL}/team`, {
      params: {
        key: API_KEY,
        team_id: teamId,
      },
      timeout: 10000,
    });

    if (response.data?.success && response.data?.data?.length > 0) {
      const teamData = response.data.data[0];
      const stats = teamData.stats;

      console.log('✅ Team:', teamData.name);
      console.log('📊 Total stat keys:', Object.keys(stats).length);

      // Categorize all stats
      const statCategories = {
        overUnder: {},
        corners: {},
        cards: {},
        btts: {},
        cleanSheets: {},
        goals: {},
        results: {},
        other: {},
      };

      // Process each stat
      Object.entries(stats).forEach(([key, value]) => {
        const lowerKey = key.toLowerCase();

        // Extract home/away/overall suffix
        let variant = 'other';
        if (key.endsWith('_home')) variant = 'home';
        else if (key.endsWith('_away')) variant = 'away';
        else if (key.endsWith('_overall')) variant = 'overall';

        // Categorize by type
        if (lowerKey.includes('over') || lowerKey.includes('under')) {
          if (!statCategories.overUnder[key]) statCategories.overUnder[key] = {};
          statCategories.overUnder[key] = { value, variant };
        } else if (lowerKey.includes('corner')) {
          if (!statCategories.corners[key]) statCategories.corners[key] = {};
          statCategories.corners[key] = { value, variant };
        } else if (lowerKey.includes('card')) {
          if (!statCategories.cards[key]) statCategories.cards[key] = {};
          statCategories.cards[key] = { value, variant };
        } else if (lowerKey.includes('btts')) {
          if (!statCategories.btts[key]) statCategories.btts[key] = {};
          statCategories.btts[key] = { value, variant };
        } else if (lowerKey.includes('cs') || lowerKey.includes('clean')) {
          if (!statCategories.cleanSheets[key]) statCategories.cleanSheets[key] = {};
          statCategories.cleanSheets[key] = { value, variant };
        } else if (
          lowerKey.includes('goal') ||
          lowerKey.includes('scored') ||
          lowerKey.includes('conceded')
        ) {
          if (!statCategories.goals[key]) statCategories.goals[key] = {};
          statCategories.goals[key] = { value, variant };
        } else if (
          lowerKey.includes('win') ||
          lowerKey.includes('draw') ||
          lowerKey.includes('loss') ||
          lowerKey.includes('ppg')
        ) {
          if (!statCategories.results[key]) statCategories.results[key] = {};
          statCategories.results[key] = { value, variant };
        } else {
          if (!statCategories.other[key]) statCategories.other[key] = {};
          statCategories.other[key] = { value, variant };
        }
      });

      // Display findings
      console.log('\n📊 OVER/UNDER STATISTICS:');
      console.log('=' * 50);
      const overUnderByType = {};
      Object.entries(statCategories.overUnder).forEach(([key, data]) => {
        const baseKey = key.replace(/_home|_away|_overall/, '');
        if (!overUnderByType[baseKey]) overUnderByType[baseKey] = {};
        overUnderByType[baseKey][data.variant] = data.value;
      });

      Object.entries(overUnderByType).forEach(([stat, values]) => {
        console.log(`\n${stat}:`);
        if (values.overall !== undefined) console.log(`  Overall: ${values.overall}`);
        if (values.home !== undefined) console.log(`  Home: ${values.home}`);
        if (values.away !== undefined) console.log(`  Away: ${values.away}`);
      });

      console.log('\n\n📊 CORNERS STATISTICS:');
      console.log('=' * 50);
      const cornersByType = {};
      Object.entries(statCategories.corners).forEach(([key, data]) => {
        const baseKey = key.replace(/_home|_away|_overall/, '');
        if (!cornersByType[baseKey]) cornersByType[baseKey] = {};
        cornersByType[baseKey][data.variant] = data.value;
      });

      Object.entries(cornersByType).forEach(([stat, values]) => {
        console.log(`\n${stat}:`);
        if (values.overall !== undefined) console.log(`  Overall: ${values.overall}`);
        if (values.home !== undefined) console.log(`  Home: ${values.home}`);
        if (values.away !== undefined) console.log(`  Away: ${values.away}`);
      });

      console.log('\n\n📊 CARDS STATISTICS:');
      console.log('=' * 50);
      const cardsByType = {};
      Object.entries(statCategories.cards).forEach(([key, data]) => {
        const baseKey = key.replace(/_home|_away|_overall/, '');
        if (!cardsByType[baseKey]) cardsByType[baseKey] = {};
        cardsByType[baseKey][data.variant] = data.value;
      });

      Object.entries(cardsByType).forEach(([stat, values]) => {
        console.log(`\n${stat}:`);
        if (values.overall !== undefined) console.log(`  Overall: ${values.overall}`);
        if (values.home !== undefined) console.log(`  Home: ${values.home}`);
        if (values.away !== undefined) console.log(`  Away: ${values.away}`);
      });

      // Create comprehensive list of key statistics
      console.log('\n\n✅ KEY HOME/AWAY STATISTICS AVAILABLE:');
      console.log('=' * 50);

      const keyStats = [
        'seasonCSPercentage', // Clean sheets percentage
        'seasonBTTSPercentage', // BTTS percentage
        'over_0_5_percentage', // Over 0.5 goals percentage
        'over_1_5_percentage', // Over 1.5 goals percentage
        'over_2_5_percentage', // Over 2.5 goals percentage
        'over_3_5_percentage', // Over 3.5 goals percentage
        'cards_avg', // Average cards per game
        'corners_avg', // Average corners per game
        'seasonPPG', // Points per game
        'seasonWinPercentage', // Win percentage
        'seasonDrawPercentage', // Draw percentage
        'seasonLossPercentage', // Loss percentage
        'seasonGoalsAVG', // Average goals per game
        'seasonConcededAVG', // Average goals conceded per game
      ];

      keyStats.forEach(statBase => {
        const overall = stats[`${statBase}_overall`];
        const home = stats[`${statBase}_home`];
        const away = stats[`${statBase}_away`];

        if (overall !== undefined || home !== undefined || away !== undefined) {
          console.log(`\n${statBase}:`);
          if (overall !== undefined) console.log(`  Overall: ${overall}`);
          if (home !== undefined) console.log(`  Home: ${home}`);
          if (away !== undefined) console.log(`  Away: ${away}`);
        }
      });

      // Save complete stats list
      const completeStatsList = {
        endpoint: '/team',
        totalStats: Object.keys(stats).length,
        categorizedStats: {
          overUnder: Object.keys(statCategories.overUnder),
          corners: Object.keys(statCategories.corners),
          cards: Object.keys(statCategories.cards),
          btts: Object.keys(statCategories.btts),
          cleanSheets: Object.keys(statCategories.cleanSheets),
          goals: Object.keys(statCategories.goals),
          results: Object.keys(statCategories.results),
        },
        keyHomeAwayStats: keyStats.filter(
          stat => stats[`${stat}_home`] !== undefined || stats[`${stat}_away`] !== undefined
        ),
      };

      require('fs').writeFileSync(
        './complete-team-stats-list.json',
        JSON.stringify(completeStatsList, null, 2)
      );
      console.log('\n💾 Complete stats list saved to complete-team-stats-list.json');
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

findAllTeamStats().catch(console.error);
