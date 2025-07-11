/**
 * Corners H2H Comparison Module
 * Displays corners statistics for both teams in H2H Corners tab
 */
import { TeamStatisticsExtractor } from '../../services/TeamStatisticsExtractor.js';

class CornersH2HComparison {
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.teamStatsData = null;
    this.matchData = null;
    
    this.initialize();
  }

  initialize() {
    // Listen for match data
    this.eventBus.on('match-data-loaded', matchData => {
      this.matchData = matchData;
      if (this.teamStatsData) {
        this.calculateCornersComparison();
      }
    });
    
    // Listen for team stats data
    this.eventBus.on('team-stats-loaded', teamData => {
      this.teamStatsData = teamData;
      if (this.matchData) {
        this.calculateCornersComparison();
      }
    });
    
    // Listen for tab switches to Corners tab
    this.eventBus.on('tab-switched', tabName => {
      if (tabName === 'h2h-corners') {
        if (this.teamStatsData && this.matchData) {
          this.calculateCornersComparison();
        }
      }
    });
  }

  calculateCornersComparison() {
    if (!this.teamStatsData || !this.teamStatsData.homeTeam || !this.teamStatsData.awayTeam) {
      return;
    }
    
    const { homeTeam, awayTeam } = this.teamStatsData;
    
    
    
    // Extract match corner statistics from match data
    let matchCornerStats = null;
    if (this.matchData) {
      matchCornerStats = this.extractMatchCornerStats(this.matchData);
    }
    
    // Extract home team's home stats
    const homeStats = this.extractCornersStats(homeTeam, 'home');
    
    // Extract away team's away stats
    const awayStats = this.extractCornersStats(awayTeam, 'away');
    
    // Get team info with logo URLs
    const homeTeamInfo = homeTeam.teamInfo || {};
    const awayTeamInfo = awayTeam.teamInfo || {};
    
    const comparison = {
      homeTeam: {
        name: homeTeamInfo.name || homeTeam.name || 'Home Team',
        logo: this.getTeamLogoUrl(homeTeamInfo.logo || homeTeam.logo),
        stats: homeStats,
        venue: 'home'
      },
      awayTeam: {
        name: awayTeamInfo.name || awayTeam.name || 'Away Team',
        logo: this.getTeamLogoUrl(awayTeamInfo.logo || awayTeam.logo),
        stats: awayStats,
        venue: 'away'
      },
      matchStats: matchCornerStats
    };
    
    this.eventBus.emit('corners-h2h-comparison-calculated', comparison);
  }
  
  extractCornersStats(teamData, venue) {
    if (!teamData) return this.getDefaultStats();
    
    try {
      const stats = teamData.stats || {};
      const statistics = teamData.statistics || {}; // Raw statistics object
      const additionalInfo = teamData.additional_info || {};
      
      
      // Get corners per match - using the correct field names
      let cornersPerMatch = '0.00';
      let matchesPlayed = 0;
      let totalCorners = 0;
      
      // Primary fields for corners per match - check for Total AVG fields first
      if (venue === 'home') {
        
        cornersPerMatch = statistics.cornersTotalAVG ||
                         stats.cornersTotalAVG ||
                         additionalInfo.cornersTotalAVG ||
                         stats.homeCornersForPerMatch || 
                         stats.cornersForPerMatch || 
                         stats.homeCornersPerMatch || '0.00';
        totalCorners = stats.homeCornersFor || 0;
      } else if (venue === 'away') {
        
        cornersPerMatch = statistics.cornersTotalAVG ||
                         stats.cornersTotalAVG ||
                         additionalInfo.cornersTotalAVG ||
                         stats.awayCornersForPerMatch || 
                         stats.cornersForPerMatch || 
                         stats.awayCornersPerMatch || '0.00';
        totalCorners = stats.awayCornersFor || 0;
      }
      
      // Parse to ensure it's a number
      const parsedCorners = parseFloat(cornersPerMatch);
      cornersPerMatch = parsedCorners.toFixed(2);
      
      // Get venue-specific key
      const venueKey = venue === 'home' ? '_home' : '_away';
      
      // If still 0, try alternative fields
      if (parsedCorners === 0 || isNaN(parsedCorners)) {
        const avgCorners = stats[`seasonCornersAVG${venueKey}`] || 
                          stats[`seasonCornersFOR_AVG${venueKey}`] ||
                          additionalInfo[`seasonCornersAVG${venueKey}`] ||
                          additionalInfo[`${venue}CornersAverage`] || 0;
        
        if (avgCorners && avgCorners !== 0) {
          cornersPerMatch = parseFloat(avgCorners).toFixed(2);
        }
      }
      
      // Get matches played
      matchesPlayed = stats[`seasonMatchesPlayed${venueKey}`] || 
                     additionalInfo[`seasonMatchesPlayed${venueKey}`] ||
                     stats.matchesPlayed ||
                     stats[`${venue}MatchesPlayed`] || 0;
      
      // Get total corners
      totalCorners = stats[`seasonCornersFOR_Total${venueKey}`] || 
                    stats[`seasonCornersTotal${venueKey}`] ||
                    stats[`seasonCornersNum${venueKey}`] ||
                    additionalInfo[`seasonCornersTotal${venueKey}`] ||
                    additionalInfo[`seasonCornersNum${venueKey}`] || 0;
      
      // If we don't have average but have total and matches, calculate it
      if ((cornersPerMatch === '0.00' || cornersPerMatch === 0) && matchesPlayed > 0 && totalCorners > 0) {
        cornersPerMatch = (totalCorners / matchesPlayed).toFixed(2);
      }
      
      // Get over percentages
      const overPercentages = this.calculateOverPercentages(teamData, venue);
      
      // Extract corners for and against data
      let cornersForPerMatch = '0.00';
      let cornersAgainstPerMatch = '0.00';
      
      
      if (venue === 'home') {
        // Use the same field as cornersPerMatch since API might not separate for/against
        cornersForPerMatch = statistics.homeCornersForPerMatch || 
                            stats.homeCornersForPerMatch || 
                            stats.cornersForPerMatch_home ||
                            cornersPerMatch || 
                            '0.00';
        cornersAgainstPerMatch = statistics.homeCornersAgainstPerMatch || 
                                stats.homeCornersAgainstPerMatch || 
                                stats.cornersAgainstPerMatch_home ||
                                statistics.homeCornersAgainst ||
                                stats.homeCornersAgainst || 
                                '0.00';
      } else if (venue === 'away') {
        // Use the same field as cornersPerMatch since API might not separate for/against
        cornersForPerMatch = statistics.awayCornersForPerMatch || 
                            stats.awayCornersForPerMatch || 
                            stats.cornersForPerMatch_away ||
                            cornersPerMatch || 
                            '0.00';
        cornersAgainstPerMatch = statistics.awayCornersAgainstPerMatch || 
                                stats.awayCornersAgainstPerMatch || 
                                stats.cornersAgainstPerMatch_away ||
                                statistics.awayCornersAgainst ||
                                stats.awayCornersAgainst || 
                                '0.00';
      }
      
      // Get corners for/against over percentages
      const cornersForOverStats = this.calculateCornersForOverPercentages(teamData, venue);
      const cornersAgainstOverStats = this.calculateCornersAgainstOverPercentages(teamData, venue);
      
      
      return {
        cornersPerMatch,
        matchesPlayed,
        totalCorners,
        cornersForPerMatch: parseFloat(cornersForPerMatch).toFixed(2),
        cornersAgainstPerMatch: parseFloat(cornersAgainstPerMatch).toFixed(2),
        over65: overPercentages.over65,
        over75: overPercentages.over75,
        over85: overPercentages.over85,
        over95: overPercentages.over95,
        over105: overPercentages.over105,
        over115: overPercentages.over115,
        over125: overPercentages.over125,
        over135: overPercentages.over135,
        over145: overPercentages.over145,
        // Corners For over percentages
        over25CornersFor: cornersForOverStats.over25,
        over35CornersFor: cornersForOverStats.over35,
        over45CornersFor: cornersForOverStats.over45,
        // Corners Against over percentages
        over25CornersAgainst: cornersAgainstOverStats.over25,
        over35CornersAgainst: cornersAgainstOverStats.over35,
        over45CornersAgainst: cornersAgainstOverStats.over45
      };
      
    } catch (error) {
      return this.getDefaultStats();
    }
  }
  
  calculateOverPercentages(teamData, venue) {
    const stats = teamData.stats || {};
    const statistics = teamData.statistics || {};
    const additionalInfo = teamData.additional_info || {};
    
    
    // Default percentages - ALL API DATA
    const overStats = {
      over25: 0,
      over35: 0,
      over45: 0,
      over55: 0,
      over65: 0,
      over75: 0,
      over85: 0,
      over95: 0,
      over105: 0,
      over115: 0,
      over125: 0,
      over135: 0,
      over145: 0
    };
    
    // Get all corner over percentages from API - Use existing fields
    if (venue === 'home') {
      // Use the existing API fields
      overStats.over25 = parseFloat(stats.homeOver25CornersFor || stats.over25CornersFor || 0);
      overStats.over35 = parseFloat(stats.homeOver35CornersFor || stats.over35CornersFor || 0);
      overStats.over45 = parseFloat(stats.homeOver45CornersFor || stats.over45CornersFor || 0);
      
      // Check for additional fields with different naming patterns - also check statistics object
      overStats.over55 = parseFloat(stats.homeOver55CornersFor || stats.over55CornersFor || stats.over55CornersForPercentage_home || stats.over55CornersPercentage_home || statistics.over55CornersPercentage_home || 0);
      overStats.over65 = parseFloat(stats.homeOver65CornersFor || stats.over65CornersFor || stats.over65CornersForPercentage_home || stats.over65CornersPercentage_home || statistics.over65CornersPercentage_home || 0);
      overStats.over75 = parseFloat(stats.homeOver75CornersFor || stats.over75CornersFor || stats.over75CornersForPercentage_home || stats.over75CornersPercentage_home || statistics.over75CornersPercentage_home || 0);
      overStats.over85 = parseFloat(stats.homeOver85CornersFor || stats.over85CornersFor || stats.over85CornersForPercentage_home || stats.over85CornersPercentage_home || statistics.over85CornersPercentage_home || 0);
      overStats.over95 = parseFloat(stats.homeOver95CornersFor || stats.over95CornersFor || stats.over95CornersForPercentage_home || stats.over95CornersPercentage_home || statistics.over95CornersPercentage_home || 0);
      overStats.over105 = parseFloat(stats.homeOver105CornersFor || stats.over105CornersFor || stats.over105CornersForPercentage_home || stats.over105CornersPercentage_home || statistics.over105CornersPercentage_home || 0);
      overStats.over115 = parseFloat(stats.homeOver115CornersFor || stats.over115CornersFor || stats.over115CornersForPercentage_home || stats.over115CornersPercentage_home || statistics.over115CornersPercentage_home || 0);
      overStats.over125 = parseFloat(stats.homeOver125CornersFor || stats.over125CornersFor || stats.over125CornersForPercentage_home || stats.over125CornersPercentage_home || statistics.over125CornersPercentage_home || 0);
      overStats.over135 = parseFloat(stats.homeOver135CornersFor || stats.over135CornersFor || stats.over135CornersForPercentage_home || stats.over135CornersPercentage_home || statistics.over135CornersPercentage_home || 0);
      overStats.over145 = parseFloat(stats.homeOver145CornersFor || stats.over145CornersFor || stats.over145CornersForPercentage_home || stats.over145CornersPercentage_home || statistics.over145CornersPercentage_home || 0);
    } else if (venue === 'away') {
      // Use the existing API fields
      overStats.over25 = parseFloat(stats.awayOver25CornersFor || stats.over25CornersFor || 0);
      overStats.over35 = parseFloat(stats.awayOver35CornersFor || stats.over35CornersFor || 0);
      overStats.over45 = parseFloat(stats.awayOver45CornersFor || stats.over45CornersFor || 0);
      
      // Check for additional fields with different naming patterns - also check statistics object
      overStats.over55 = parseFloat(stats.awayOver55CornersFor || stats.over55CornersFor || stats.over55CornersForPercentage_away || stats.over55CornersPercentage_away || statistics.over55CornersPercentage_away || 0);
      overStats.over65 = parseFloat(stats.awayOver65CornersFor || stats.over65CornersFor || stats.over65CornersForPercentage_away || stats.over65CornersPercentage_away || statistics.over65CornersPercentage_away || 0);
      overStats.over75 = parseFloat(stats.awayOver75CornersFor || stats.over75CornersFor || stats.over75CornersForPercentage_away || stats.over75CornersPercentage_away || statistics.over75CornersPercentage_away || 0);
      overStats.over85 = parseFloat(stats.awayOver85CornersFor || stats.over85CornersFor || stats.over85CornersForPercentage_away || stats.over85CornersPercentage_away || statistics.over85CornersPercentage_away || 0);
      overStats.over95 = parseFloat(stats.awayOver95CornersFor || stats.over95CornersFor || stats.over95CornersForPercentage_away || stats.over95CornersPercentage_away || statistics.over95CornersPercentage_away || 0);
      overStats.over105 = parseFloat(stats.awayOver105CornersFor || stats.over105CornersFor || stats.over105CornersForPercentage_away || stats.over105CornersPercentage_away || statistics.over105CornersPercentage_away || 0);
      overStats.over115 = parseFloat(stats.awayOver115CornersFor || stats.over115CornersFor || stats.over115CornersForPercentage_away || stats.over115CornersPercentage_away || statistics.over115CornersPercentage_away || 0);
      overStats.over125 = parseFloat(stats.awayOver125CornersFor || stats.over125CornersFor || stats.over125CornersForPercentage_away || stats.over125CornersPercentage_away || statistics.over125CornersPercentage_away || 0);
      overStats.over135 = parseFloat(stats.awayOver135CornersFor || stats.over135CornersFor || stats.over135CornersForPercentage_away || stats.over135CornersPercentage_away || statistics.over135CornersPercentage_away || 0);
      overStats.over145 = parseFloat(stats.awayOver145CornersFor || stats.over145CornersFor || stats.over145CornersForPercentage_away || stats.over145CornersPercentage_away || statistics.over145CornersPercentage_away || 0);
    }
    
    return overStats;
  }
  
  calculateCornersForOverPercentages(teamData, venue) {
    const stats = teamData.stats || {};
    const statistics = teamData.statistics || {};
    
    const overStats = {
      over25: 0,
      over35: 0,
      over45: 0
    };
    
    if (venue === 'home') {
      overStats.over25 = parseFloat(statistics.homeOver25CornersFor || stats.homeOver25CornersFor || stats.over25CornersFor || 0);
      overStats.over35 = parseFloat(statistics.homeOver35CornersFor || stats.homeOver35CornersFor || stats.over35CornersFor || 0);
      overStats.over45 = parseFloat(statistics.homeOver45CornersFor || stats.homeOver45CornersFor || stats.over45CornersFor || 0);
    } else if (venue === 'away') {
      overStats.over25 = parseFloat(statistics.awayOver25CornersFor || stats.awayOver25CornersFor || stats.over25CornersFor || 0);
      overStats.over35 = parseFloat(statistics.awayOver35CornersFor || stats.awayOver35CornersFor || stats.over35CornersFor || 0);
      overStats.over45 = parseFloat(statistics.awayOver45CornersFor || stats.awayOver45CornersFor || stats.over45CornersFor || 0);
    }
    
    return overStats;
  }
  
  calculateCornersAgainstOverPercentages(teamData, venue) {
    const stats = teamData.stats || {};
    const statistics = teamData.statistics || {};
    const additionalInfo = teamData.additional_info || {};
    
    
    const overStats = {
      over25: 0,
      over35: 0,
      over45: 0
    };
    
    if (venue === 'home') {
      // Check multiple possible field names for corners against
      overStats.over25 = parseFloat(
        statistics.homeOver25CornersAgainst || 
        stats.homeOver25CornersAgainst || 
        stats.over25CornersAgainst_home ||
        statistics.over25CornersAgainstPercentage_home ||
        stats.over25CornersAgainstPercentage_home ||
        statistics.homeCornersAgainstOver25 ||
        stats.homeCornersAgainstOver25 ||
        statistics.over25ConcededCorners_home ||
        stats.over25ConcededCorners_home ||
        0
      );
      overStats.over35 = parseFloat(
        statistics.homeOver35CornersAgainst || 
        stats.homeOver35CornersAgainst || 
        stats.over35CornersAgainst_home ||
        statistics.over35CornersAgainstPercentage_home ||
        stats.over35CornersAgainstPercentage_home ||
        statistics.homeCornersAgainstOver35 ||
        stats.homeCornersAgainstOver35 ||
        statistics.over35ConcededCorners_home ||
        stats.over35ConcededCorners_home ||
        0
      );
      overStats.over45 = parseFloat(
        statistics.homeOver45CornersAgainst || 
        stats.homeOver45CornersAgainst || 
        stats.over45CornersAgainst_home ||
        statistics.over45CornersAgainstPercentage_home ||
        stats.over45CornersAgainstPercentage_home ||
        statistics.homeCornersAgainstOver45 ||
        stats.homeCornersAgainstOver45 ||
        statistics.over45ConcededCorners_home ||
        stats.over45ConcededCorners_home ||
        0
      );
    } else if (venue === 'away') {
      // Check multiple possible field names for corners against
      overStats.over25 = parseFloat(
        statistics.awayOver25CornersAgainst || 
        stats.awayOver25CornersAgainst || 
        stats.over25CornersAgainst_away ||
        statistics.over25CornersAgainstPercentage_away ||
        stats.over25CornersAgainstPercentage_away ||
        statistics.awayCornersAgainstOver25 ||
        stats.awayCornersAgainstOver25 ||
        statistics.over25ConcededCorners_away ||
        stats.over25ConcededCorners_away ||
        0
      );
      overStats.over35 = parseFloat(
        statistics.awayOver35CornersAgainst || 
        stats.awayOver35CornersAgainst || 
        stats.over35CornersAgainst_away ||
        statistics.over35CornersAgainstPercentage_away ||
        stats.over35CornersAgainstPercentage_away ||
        statistics.awayCornersAgainstOver35 ||
        stats.awayCornersAgainstOver35 ||
        statistics.over35ConcededCorners_away ||
        stats.over35ConcededCorners_away ||
        0
      );
      overStats.over45 = parseFloat(
        statistics.awayOver45CornersAgainst || 
        stats.awayOver45CornersAgainst || 
        stats.over45CornersAgainst_away ||
        statistics.over45CornersAgainstPercentage_away ||
        stats.over45CornersAgainstPercentage_away ||
        statistics.awayCornersAgainstOver45 ||
        stats.awayCornersAgainstOver45 ||
        statistics.over45ConcededCorners_away ||
        stats.over45ConcededCorners_away ||
        0
      );
    }
    
    
    return overStats;
  }
  
  extractMatchCornerStats(matchData) {
    const stats = matchData.stats || matchData.statistics || {};
    const cornerStats = {};
    
    
    
    // Common corner field patterns to check
    const cornerPatterns = [
      'corners', 'corner', 'totalCorners', 'matchCorners', 
      'avgCorners', 'averageCorners', 'cornersTotal',
      'homeCorners', 'awayCorners', 'cornersHome', 'cornersAway'
    ];
    
    // Find corner-related fields in both matchData and stats
    const matchDataCornerFields = Object.keys(matchData).filter(key => 
      cornerPatterns.some(pattern => key.toLowerCase().includes(pattern.toLowerCase()))
    );
    const statsCornerFields = Object.keys(stats).filter(key => 
      cornerPatterns.some(pattern => key.toLowerCase().includes(pattern.toLowerCase()))
    );
    
    
    // Extract corner statistics - check both root and stats
    // If totalCorners is an object with home/away properties
    if (matchData.totalCorners && typeof matchData.totalCorners === 'object') {
      cornerStats.homeCorners = matchData.totalCorners.home || 0;
      cornerStats.awayCorners = matchData.totalCorners.away || 0;
      cornerStats.totalCorners = (cornerStats.homeCorners > 0 && cornerStats.awayCorners > 0) 
        ? cornerStats.homeCorners + cornerStats.awayCorners 
        : 0;
    } else {
      cornerStats.totalCorners = matchData.totalCorners || stats.totalCorners || stats.corners || stats.matchCorners || 0;
      cornerStats.homeCorners = matchData.homeCorners || stats.homeCorners || stats.cornersHome || 0;
      cornerStats.awayCorners = matchData.awayCorners || stats.awayCorners || stats.cornersAway || 0;
    }
    
    cornerStats.averageCorners = matchData.averageCorners || stats.averageCorners || stats.avgCorners || 0;
    
    // Extract over percentages if available
    cornerStats.over65 = stats.over65Corners || stats.over65CornersPercentage || 0;
    cornerStats.over75 = stats.over75Corners || stats.over75CornersPercentage || 0;
    cornerStats.over85 = stats.over85Corners || stats.over85CornersPercentage || 0;
    cornerStats.over95 = stats.over95Corners || stats.over95CornersPercentage || 0;
    cornerStats.over105 = stats.over105Corners || stats.over105CornersPercentage || 0;
    cornerStats.over115 = stats.over115Corners || stats.over115CornersPercentage || 0;
    cornerStats.over125 = stats.over125Corners || stats.over125CornersPercentage || 0;
    cornerStats.over135 = stats.over135Corners || stats.over135CornersPercentage || 0;
    cornerStats.over145 = stats.over145Corners || stats.over145CornersPercentage || 0;
    
    return cornerStats;
  }
  
  deepSearchForField(obj, searchTerm, label, path = '') {
    if (!obj || typeof obj !== 'object') return;
    
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const currentPath = path ? `${path}.${key}` : key;
        
        // Check if key contains our search term
        if (key.includes(searchTerm)) {
        }
        
        // Recursively search nested objects (but avoid circular references)
        if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key]) && key !== 'teamInfo') {
          this.deepSearchForField(obj[key], searchTerm, label, currentPath);
        }
      }
    }
  }
  
  getDefaultStats() {
    return {
      cornersPerMatch: '0.00',
      matchesPlayed: 0,
      totalCorners: 0,
      cornersForPerMatch: '0.00',
      cornersAgainstPerMatch: '0.00',
      over65: 0,
      over75: 0,
      over85: 0,
      over95: 0,
      over105: 0,
      over115: 0,
      over125: 0,
      over135: 0,
      over145: 0,
      over25CornersFor: 0,
      over35CornersFor: 0,
      over45CornersFor: 0,
      over25CornersAgainst: 0,
      over35CornersAgainst: 0,
      over45CornersAgainst: 0
    };
  }
  
  getTeamLogoUrl(logo) {
    if (!logo) return '/images/team-placeholder.png';
    
    // Handle different logo formats
    if (logo.startsWith('http')) {
      return logo;
    } else if (logo.startsWith('/')) {
      return logo;
    } else {
      return `/images/teams/${logo}`;
    }
  }
}

export default CornersH2HComparison;