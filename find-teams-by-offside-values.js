const axios = require('axios');

// Configuration
const API_KEY =
  process.env.API_KEY || '29581005f929990bf13dc9c964200d537e484ee248f0ac2d0f76910a6ce7aae9';

// Known active season IDs
const SEASON_IDS = ['13973', '13974', '13975', '5825', '5826', '5827'];

async function findTeamsByOffsideValues() {
  console.log('Offside değerlerine göre takım arama');
  console.log('=====================================');
  console.log('PPJ için aranan: ~5.67 offside/match');
  console.log('HJS için aranan: ~3.00 offside/match');
  console.log('=====================================\n');

  const foundTeams = [];

  for (const seasonId of SEASON_IDS) {
    try {
      console.log(`\nSeason ID ${seasonId} kontrol ediliyor...`);

      const url = `https://api.football-data-api.com/league-teams?key=${API_KEY}&season_id=${seasonId}&include=stats`;
      const response = await axios.get(url, { timeout: 30000 });

      if (!response.data || !response.data.data || !response.data.success) {
        console.log(`Season ${seasonId} - Veri yok veya hata`);
        continue;
      }

      const teams = response.data.data;
      console.log(`${teams.length} takım bulundu`);

      // Check each team
      teams.forEach(teamData => {
        const teamName = teamData.name || (teamData.team && teamData.team.name) || 'Unknown';
        const teamId = teamData.id || teamData.team_id || (teamData.team && teamData.team.id);
        const stats = teamData.stats || teamData.statistics || {};

        // Get all offside averages
        const homeOffsidesAvg = parseFloat(stats.homeOffsidesAvg || 0);
        const awayOffsidesAvg = parseFloat(stats.awayOffsidesAvg || 0);
        const homeMatchOffsidesAvg = parseFloat(stats.homeMatchOffsidesAvg || 0);
        const awayMatchOffsidesAvg = parseFloat(stats.awayMatchOffsidesAvg || 0);
        const overallOffsidesAvg = parseFloat(stats.offsidesAvg || 0);
        const matchOffsidesAvg = parseFloat(stats.matchOffsidesAvg || 0);

        // Check for PPJ (5.67 +/- 0.5)
        const ppjValues = [
          homeOffsidesAvg,
          awayOffsidesAvg,
          homeMatchOffsidesAvg,
          awayMatchOffsidesAvg,
          overallOffsidesAvg,
          matchOffsidesAvg,
        ];
        const isPPJ = ppjValues.some(val => val >= 5.17 && val <= 6.17);

        // Check for HJS (3.00 +/- 0.5)
        const isHJS = ppjValues.some(val => val >= 2.5 && val <= 3.5);

        // Also check if name contains P and J
        const nameMatch =
          teamName.toUpperCase().includes('P') && teamName.toUpperCase().includes('J');

        if (isPPJ || isHJS || nameMatch) {
          foundTeams.push({
            teamId,
            teamName,
            country: teamData.country || 'Unknown',
            seasonId,
            homeOffsidesAvg,
            awayOffsidesAvg,
            homeMatchOffsidesAvg,
            awayMatchOffsidesAvg,
            overallOffsidesAvg,
            matchOffsidesAvg,
            isPPJ,
            isHJS,
            nameMatch,
            over25_home: stats.homeMatchOffsidesOver2_5 || stats.over25OffsidesPercentage_home || 0,
            over25_away: stats.awayMatchOffsidesOver2_5 || stats.over25OffsidesPercentage_away || 0,
            over35_home: stats.homeMatchOffsidesOver3_5 || stats.over35OffsidesPercentage_home || 0,
            over35_away: stats.awayMatchOffsidesOver3_5 || stats.over35OffsidesPercentage_away || 0,
          });
        }
      });
    } catch (error) {
      if (error.response && error.response.status === 417) {
        console.log(`Season ${seasonId} - Lig seçili değil`);
      } else {
        console.log(`Season ${seasonId} - Hata: ${error.message}`);
      }
    }
  }

  // Display results
  console.log('\n\n=== SONUÇLAR ===\n');

  if (foundTeams.length === 0) {
    console.log('Kriterlere uyan takım bulunamadı.');
  } else {
    foundTeams.sort((a, b) => {
      // PPJ candidates first
      if (a.isPPJ && !b.isPPJ) {
        return -1;
      }
      if (!a.isPPJ && b.isPPJ) {
        return 1;
      }
      // Then HJS candidates
      if (a.isHJS && !b.isHJS) {
        return -1;
      }
      if (!a.isHJS && b.isHJS) {
        return 1;
      }
      return 0;
    });

    foundTeams.forEach(team => {
      console.log(
        `\n${team.isPPJ ? '🎯 PPJ Adayı' : team.isHJS ? '🎯 HJS Adayı' : '📌 İsim Eşleşmesi'}`
      );
      console.log(`Takım: ${team.teamName} (ID: ${team.teamId})`);
      console.log(`Ülke: ${team.country}`);
      console.log(`Season: ${team.seasonId}`);
      console.log(`Offside Değerleri:`);
      console.log(`  - Ev Takım Offside Ort: ${team.homeOffsidesAvg}`);
      console.log(`  - Deplasman Takım Offside Ort: ${team.awayOffsidesAvg}`);
      console.log(`  - Ev Maç Offside Ort: ${team.homeMatchOffsidesAvg}`);
      console.log(`  - Deplasman Maç Offside Ort: ${team.awayMatchOffsidesAvg}`);
      console.log(`  - Genel Offside Ort: ${team.overallOffsidesAvg}`);
      console.log(`  - Maç Offside Ort: ${team.matchOffsidesAvg}`);
      console.log(`Over 2.5/3.5 Offsides:`);
      console.log(`  - Ev: ${team.over25_home}% / ${team.over35_home}%`);
      console.log(`  - Deplasman: ${team.over25_away}% / ${team.over35_away}%`);
    });
  }
}

// Run the search
findTeamsByOffsideValues().catch(console.error);
