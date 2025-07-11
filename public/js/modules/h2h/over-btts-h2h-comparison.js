/**
 * Over 2.5 & BTTS H2H Comparison Module
 * Displays Over 2.5 & BTTS predictions for both teams in H2H tab
 */

import TeamStatisticsExtractor from '../../services/TeamStatisticsExtractor.js';

export class OverBTTSH2HComparison {
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.teamData = {};
    this.attachEventListeners();
  }

  attachEventListeners() {
    // Listen for team data updates
    this.eventBus.on('team-stats-loaded', (data) => {
      this.teamData = data;
      this.updateComparison();
    });

    // Listen for tab switches
    this.eventBus.on('tab-switched', (tabName) => {
      if (tabName === 'h2h-goals') {
        this.updateComparison();
      }
    });
  }

  updateComparison() {
    if (!this.teamData.homeTeam || !this.teamData.awayTeam) {
      return;
    }
    
    const homeTeamInfo = this.teamData.homeTeam.teamInfo || this.teamData.homeTeam || {};
    const awayTeamInfo = this.teamData.awayTeam.teamInfo || this.teamData.awayTeam || {};
    
    const comparison = {
      homeTeam: {
        name: homeTeamInfo.name || homeTeamInfo.teamName || 'Home Team',
        logo: this.getTeamLogoUrl(homeTeamInfo.logo || homeTeamInfo.teamLogo || homeTeamInfo.image),
        stats: this.extractOverBTTSStats(this.teamData.homeTeam, 'home')
      },
      awayTeam: {
        name: awayTeamInfo.name || awayTeamInfo.teamName || 'Away Team',
        logo: this.getTeamLogoUrl(awayTeamInfo.logo || awayTeamInfo.teamLogo || awayTeamInfo.image),
        stats: this.extractOverBTTSStats(this.teamData.awayTeam, 'away')
      }
    };
    

    // Emit comparison data
    this.eventBus.emit('over-btts-h2h-comparison-calculated', comparison);
  }

  extractOverBTTSStats(teamData, venue) {
    if (!teamData) return this.getDefaultStats();
    
    try {
      const stats = teamData.stats || teamData.statistics || {};
      const additionalInfo = teamData.additional_info || {};
      
      // Look for season over percentages in stats object
      const overKeys = Object.keys(stats).filter(key => key.toLowerCase().includes('over') && key.includes(venue));
      const bttsKeys = Object.keys(stats).filter(key => key.toLowerCase().includes('btts') && key.includes(venue));
      
      
      // Extract total match over percentages (both teams scoring)
      let over05 = 0, over15 = 0, over25 = 0, over35 = 0, over45 = 0;
      let btts = 0, bttsOver25 = 0, bttsNoOver25 = 0;
      
      if (venue === 'home') {
        // Home team stats - check multiple possible field names
        over05 = stats.homeOver05 || 
                stats.over05 || 
                stats.seasonOver05Percentage_home || 
                additionalInfo.seasonOver05Percentage_home || 
                stats.over05_percentage_home || 
                additionalInfo.over05_percentage_home || 
                stats.homeOver05Percentage || 0;
                
        over15 = stats.homeOver15 || 
                stats.over15 || 
                stats.seasonOver15Percentage_home || 
                additionalInfo.seasonOver15Percentage_home || 
                stats.over15_percentage_home || 
                additionalInfo.over15_percentage_home || 
                stats.homeOver15Percentage || 0;
                
        over25 = stats.homeOver25 || 
                stats.over25 || 
                stats.seasonOver25Percentage_home || 
                additionalInfo.seasonOver25Percentage_home || 
                stats.over25_percentage_home || 
                additionalInfo.over25_percentage_home || 
                stats.homeOver25Percentage || 0;
                
        over35 = stats.homeOver35 || 
                stats.over35 || 
                stats.seasonOver35Percentage_home || 
                additionalInfo.seasonOver35Percentage_home || 
                stats.over35_percentage_home || 
                additionalInfo.over35_percentage_home || 
                stats.homeOver35Percentage || 0;
                
        over45 = stats.homeOver45 || 
                stats.over45 || 
                stats.seasonOver45Percentage_home || 
                additionalInfo.seasonOver45Percentage_home || 
                stats.over45_percentage_home || 
                additionalInfo.over45_percentage_home || 
                stats.homeOver45Percentage || 0;
                
        btts = stats.seasonBTTSPercentage_home || 
               stats.homeBTTSPercentage ||
               stats.btts ||
               additionalInfo.seasonBTTSPercentage_home || 
               stats.btts_percentage_home || 
               additionalInfo.btts_percentage_home || 0;
               
        bttsOver25 = stats.BTTS_and_over_2_5_percentage_home ||
                     stats.over25_and_btts_percentage_home ||
                     additionalInfo.over25_and_btts_percentage_home ||
                     stats.homeBTTSAndOver25 ||
                     stats.bttsAndOver25 ||
                     stats.seasonBTTSOver25Percentage_home || 
                     additionalInfo.seasonBTTSOver25Percentage_home || 
                     stats.btts_over25_percentage_home || 
                     additionalInfo.btts_over25_percentage_home || 
                     stats.homeBTTSOver25Percentage || 0;
                     
        bttsNoOver25 = stats.BTTS_no_and_over_2_5_percentage_home ||
                       stats.over25_and_no_btts_percentage_home ||
                       additionalInfo.over25_and_no_btts_percentage_home ||
                       stats.homeBTTSNoAndOver25 ||
                       stats.bttsNoAndOver25 ||
                       stats.seasonBTTSNoOver25Percentage_home || 
                       additionalInfo.seasonBTTSNoOver25Percentage_home || 
                       stats.btts_no_over25_percentage_home || 
                       additionalInfo.btts_no_over25_percentage_home || 
                       stats.homeBTTSNoOver25Percentage || 0;
      } else {
        // Away team stats - check multiple possible field names
        over05 = stats.awayOver05 || 
                stats.over05 || 
                stats.seasonOver05Percentage_away || 
                additionalInfo.seasonOver05Percentage_away || 
                stats.over05_percentage_away || 
                additionalInfo.over05_percentage_away || 
                stats.awayOver05Percentage || 0;
                
        over15 = stats.awayOver15 || 
                stats.over15 || 
                stats.seasonOver15Percentage_away || 
                additionalInfo.seasonOver15Percentage_away || 
                stats.over15_percentage_away || 
                additionalInfo.over15_percentage_away || 
                stats.awayOver15Percentage || 0;
                
        over25 = stats.awayOver25 || 
                stats.over25 || 
                stats.seasonOver25Percentage_away || 
                additionalInfo.seasonOver25Percentage_away || 
                stats.over25_percentage_away || 
                additionalInfo.over25_percentage_away || 
                stats.awayOver25Percentage || 0;
                
        over35 = stats.awayOver35 || 
                stats.over35 || 
                stats.seasonOver35Percentage_away || 
                additionalInfo.seasonOver35Percentage_away || 
                stats.over35_percentage_away || 
                additionalInfo.over35_percentage_away || 
                stats.awayOver35Percentage || 0;
                
        over45 = stats.awayOver45 || 
                stats.over45 || 
                stats.seasonOver45Percentage_away || 
                additionalInfo.seasonOver45Percentage_away || 
                stats.over45_percentage_away || 
                additionalInfo.over45_percentage_away || 
                stats.awayOver45Percentage || 0;
                
        btts = stats.seasonBTTSPercentage_away || 
               stats.awayBTTSPercentage ||
               stats.btts ||
               additionalInfo.seasonBTTSPercentage_away || 
               stats.btts_percentage_away || 
               additionalInfo.btts_percentage_away || 0;
               
        bttsOver25 = stats.BTTS_and_over_2_5_percentage_away ||
                     stats.over25_and_btts_percentage_away ||
                     additionalInfo.over25_and_btts_percentage_away ||
                     stats.awayBTTSAndOver25 ||
                     stats.bttsAndOver25 ||
                     stats.seasonBTTSOver25Percentage_away || 
                     additionalInfo.seasonBTTSOver25Percentage_away || 
                     stats.btts_over25_percentage_away || 
                     additionalInfo.btts_over25_percentage_away || 
                     stats.awayBTTSOver25Percentage || 0;
                     
        bttsNoOver25 = stats.BTTS_no_and_over_2_5_percentage_away ||
                       stats.over25_and_no_btts_percentage_away ||
                       additionalInfo.over25_and_no_btts_percentage_away ||
                       stats.awayBTTSNoAndOver25 ||
                       stats.bttsNoAndOver25 ||
                       stats.seasonBTTSNoOver25Percentage_away || 
                       additionalInfo.seasonBTTSNoOver25Percentage_away || 
                       stats.btts_no_over25_percentage_away || 
                       additionalInfo.btts_no_over25_percentage_away || 
                       stats.awayBTTSNoOver25Percentage || 0;
      }
      
      // Ensure values are parsed correctly and within valid range
      const parsePercentage = (value) => {
        const parsed = parseInt(value, 10) || 0;
        return Math.min(100, Math.max(0, parsed)); // Ensure between 0-100
      };
      
      return {
        over05: parsePercentage(over05),
        over15: parsePercentage(over15),
        over25: parsePercentage(over25),
        over35: parsePercentage(over35),
        over45: parsePercentage(over45),
        btts: parsePercentage(btts),
        bttsOver25: parsePercentage(bttsOver25),
        bttsNoOver25: parsePercentage(bttsNoOver25)
      };
    } catch (error) {
      return this.getDefaultStats();
    }
  }

  getDefaultStats() {
    return {
      over05: 0,
      over15: 0,
      over25: 0,
      over35: 0,
      over45: 0,
      btts: 0,
      bttsOver25: 0,
      bttsNoOver25: 0
    };
  }
  
  getTeamLogoUrl(logo) {
    if (!logo) return '';
    
    // If it's already a full URL, return as is
    if (logo.startsWith('http://') || logo.startsWith('https://')) {
      return logo;
    }
    
    // Build FootyStats CDN URL
    let logoUrl = logo;
    if (!logoUrl.startsWith('teams/')) {
      logoUrl = `teams/${logoUrl}`;
    }
    
    return `https://cdn.footystats.org/img/${logoUrl}`;
  }
}

export default OverBTTSH2HComparison;