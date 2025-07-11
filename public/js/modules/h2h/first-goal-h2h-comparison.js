/**
 * Who Will Score First H2H Comparison Module
 * Displays first goal statistics for both teams in H2H tab
 */

import TeamStatisticsExtractor from '../../services/TeamStatisticsExtractor.js';

export class FirstGoalH2HComparison {
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
        stats: this.extractFirstGoalStats(this.teamData.homeTeam, 'home')
      },
      awayTeam: {
        name: awayTeamInfo.name || awayTeamInfo.teamName || 'Away Team',
        logo: this.getTeamLogoUrl(awayTeamInfo.logo || awayTeamInfo.teamLogo || awayTeamInfo.image),
        stats: this.extractFirstGoalStats(this.teamData.awayTeam, 'away')
      }
    };
    
    // Calculate probabilities
    comparison.probabilities = this.calculateProbabilities(
      comparison.homeTeam.stats,
      comparison.awayTeam.stats
    );

    // Emit comparison data
    this.eventBus.emit('first-goal-h2h-comparison-calculated', comparison);
  }

  extractFirstGoalStats(teamData, venue) {
    if (!teamData) return this.getDefaultStats();
    
    try {
      const stats = teamData.stats || teamData.statistics || {};
      const additionalInfo = teamData.additional_info || {};
      
      // Check additional_info
      if (Array.isArray(additionalInfo) && additionalInfo.length > 0) {
        // Additional info is available as an array
      }
      
      // Extract first goal statistics
      let firstGoalScored = 0;
      let firstGoalConceded = 0;
      let noGoals = 0;
      let matchesPlayed = 0;
      
      // Try to get first goal data from API
      if (venue === 'home') {
        // Check various possible field names
        firstGoalScored = stats.first_to_score_percentage_home || 
                         stats.team_to_score_first_percentage_home ||
                         stats.homeFirstToScorePercentage ||
                         stats.home_first_to_score ||
                         stats.firstToScoreHome || 0;
                         
        firstGoalConceded = stats.opponent_first_to_score_percentage_home || 
                           stats.home_opponent_first_to_score ||
                           stats.homeOpponentFirstToScore || 0;
                           
        noGoals = stats.neither_to_score_percentage_home || 
                 stats.home_neither_to_score ||
                 stats.homeNeitherToScore || 0;
        
        matchesPlayed = stats.homeMatchesPlayed ||
                       stats.homeTotalMatches ||
                       stats.homeGamesPlayed ||
                       stats.home_matches_played ||
                       stats.matches_played_home ||
                       20; // Default to 20 if no data
      } else {
        // Check various possible field names
        firstGoalScored = stats.first_to_score_percentage_away || 
                         stats.team_to_score_first_percentage_away ||
                         stats.awayFirstToScorePercentage ||
                         stats.away_first_to_score ||
                         stats.firstToScoreAway || 0;
                         
        firstGoalConceded = stats.opponent_first_to_score_percentage_away || 
                           stats.away_opponent_first_to_score ||
                           stats.awayOpponentFirstToScore || 0;
                           
        noGoals = stats.neither_to_score_percentage_away || 
                 stats.away_neither_to_score ||
                 stats.awayNeitherToScore || 0;
        
        matchesPlayed = stats.awayMatchesPlayed ||
                       stats.awayTotalMatches ||
                       stats.awayGamesPlayed ||
                       stats.away_matches_played ||
                       stats.matches_played_away ||
                       20; // Default to 20 if no data
      }
      
      // Calculate percentages if we have counts
      if (matchesPlayed > 0 && firstGoalScored > 0 && firstGoalScored < 100) {
        // Values are counts, calculate percentages
        firstGoalScored = Math.round((firstGoalScored / matchesPlayed) * 100);
        firstGoalConceded = Math.round((firstGoalConceded / matchesPlayed) * 100);
        noGoals = Math.round((noGoals / matchesPlayed) * 100);
      }
      
      // Ensure values are valid percentages
      const parsePercentage = (value) => {
        const parsed = parseInt(value, 10) || 0;
        return Math.min(100, Math.max(0, parsed));
      };
      
      const result = {
        firstGoalScored: parsePercentage(firstGoalScored),
        firstGoalConceded: parsePercentage(firstGoalConceded),
        noGoals: parsePercentage(noGoals),
        matchesPlayed: parseInt(matchesPlayed, 10) || 0
      };
      
      return result;
    } catch (error) {
      return this.getDefaultStats();
    }
  }

  calculateProbabilities(homeStats, awayStats) {
    // Basic probability calculation
    const homeScoredRate = homeStats.firstGoalScored / 100;
    const awayScoredRate = awayStats.firstGoalScored / 100;
    
    // Normalize probabilities
    const total = homeScoredRate + awayScoredRate;
    
    if (total === 0) {
      return {
        homeFirst: 50,
        awayFirst: 50,
        noGoals: 0
      };
    }
    
    // Calculate adjusted probabilities
    const homeFirst = Math.round((homeScoredRate / total) * 100);
    const awayFirst = Math.round((awayScoredRate / total) * 100);
    
    // Average no goals probability
    const avgNoGoals = Math.round((homeStats.noGoals + awayStats.noGoals) / 2);
    
    return {
      homeFirst: homeFirst,
      awayFirst: awayFirst,
      noGoals: avgNoGoals
    };
  }

  getDefaultStats() {
    return {
      firstGoalScored: 0,
      firstGoalConceded: 0,
      noGoals: 0,
      matchesPlayed: 0
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

export default FirstGoalH2HComparison;