/**
 * Goals H2H Comparison Module
 * Displays goals statistics from head-to-head matches
 */
import { TeamStatisticsExtractor } from '../../services/TeamStatisticsExtractor.js';

class GoalsH2HComparison {
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.h2hData = null;
    this.teamStatsData = null;
    
    this.initialize();
  }

  initialize() {
    
    // Listen for H2H data
    this.eventBus.on('h2h-data-loaded', h2hData => {
      this.h2hData = h2hData;
      this.calculateGoalsComparison();
    });
    
    // Listen for team stats data
    this.eventBus.on('team-stats-loaded', teamData => {
      this.teamStatsData = teamData;
      this.calculateGoalsComparison();
    });
    
    // Listen for tab switches to Goals tab
    this.eventBus.on('tab-switched', tabName => {
      if (tabName === 'h2h') {
        if (this.teamStatsData) {
          this.calculateGoalsComparison();
        }
      }
    });
  }

  calculateGoalsComparison() {
    if (!this.teamStatsData || !this.teamStatsData.homeTeam || !this.teamStatsData.awayTeam) {
      return;
    }
    
    const { homeTeam, awayTeam } = this.teamStatsData;
    
    // Extract home team's home stats
    const homeStats = this.extractGoalsStats(homeTeam, 'home');
    
    // Extract away team's away stats
    const awayStats = this.extractGoalsStats(awayTeam, 'away');
    
    const comparison = {
      homeTeam: {
        name: homeTeam.name,
        logo: homeTeam.logo,
        stats: homeStats,
        venue: 'home'
      },
      awayTeam: {
        name: awayTeam.name,
        logo: awayTeam.logo,
        stats: awayStats,
        venue: 'away'
      },
      h2hInsights: this.generateH2HInsights()
    };
    
    this.eventBus.emit('goals-h2h-comparison-calculated', comparison);
  }
  
  extractGoalsStats(teamData, venue) {
    if (!teamData) return this.getDefaultStats();
    
    try {
      // First, let's check the raw data structure
      const stats = teamData.stats || teamData.statistics || {};
      const additionalInfo = teamData.additional_info || {};
      
      // First try to get goalsPerMatch directly from stats
      let goalsPerMatch = stats[`${venue}GoalsPerMatch`] || '0.00';
      
      // If not found or is 0, use TeamStatisticsExtractor
      if (goalsPerMatch === '0.00' || goalsPerMatch === 0) {
        const goalsStats = TeamStatisticsExtractor.extractGoalsScoredStats(teamData, venue);
        goalsPerMatch = goalsStats.goalsPerMatch;
      }
      
      // Get over percentages
      const overPercentages = TeamStatisticsExtractor.extractScoredOverPercentages(teamData, venue);
      
      // Get failed to score percentage
      const csFts = TeamStatisticsExtractor.extractCSandFTSPercentages(teamData, venue);
      let failedToScore = csFts.failedToScorePercentage || 0;
      
      // If FTS is 0, try to get it directly from stats
      if (failedToScore === 0 || failedToScore === '0') {
        failedToScore = stats[`${venue}FailedToScorePercentage`] || 
                       stats.failedToScorePercentage ||
                       additionalInfo[`seasonFTSPercentage_${venue}`] ||
                       additionalInfo[`${venue}FailedToScorePercentage`] || 0;
      }
      
      // If still 0, calculate manually
      if (goalsPerMatch === '0.00' || goalsPerMatch === 0) {
        const venueKey = venue === 'home' ? '_home' : '_away';
        
        // Try additional fields
        const avgGoals = stats[`seasonScoredAVG${venueKey}`] || 
                        additionalInfo[`seasonScoredAVG${venueKey}`] || 0;
        
        if (avgGoals && avgGoals !== 0) {
          goalsPerMatch = parseFloat(avgGoals).toFixed(2);
        } else {
          // Calculate from total goals and matches
          const matchesPlayed = stats[`seasonMatchesPlayed${venueKey}`] || 
                              additionalInfo[`seasonMatchesPlayed${venueKey}`] || 0;
          const totalGoals = stats[`seasonScoredNum${venueKey}`] || 
                           additionalInfo[`seasonScoredNum${venueKey}`] || 0;
          
          if (matchesPlayed > 0 && totalGoals > 0) {
            goalsPerMatch = (totalGoals / matchesPlayed).toFixed(2);
          }
        }
      }
      
      // Also get other stats
      let matchesPlayed = 0;
      let totalGoals = 0;
      let firstHalfAvg = '0.00';
      let secondHalfAvg = '0.00';
      
      // Try to get these from TeamStatisticsExtractor result if available
      if (goalsPerMatch !== '0.00' && goalsPerMatch !== 0) {
        const goalsStats = TeamStatisticsExtractor.extractGoalsScoredStats(teamData, venue);
        matchesPlayed = goalsStats.matchesPlayed || 0;
        totalGoals = goalsStats.totalGoals || 0;
        firstHalfAvg = goalsStats.firstHalfAvg || '0.00';
        secondHalfAvg = goalsStats.secondHalfAvg || '0.00';
      }
      
      // Get matches played if not found
      if (!matchesPlayed) {
        const venueKey = venue === 'home' ? '_home' : '_away';
        matchesPlayed = stats[`seasonMatchesPlayed${venueKey}`] || 
                       additionalInfo[`seasonMatchesPlayed${venueKey}`] || 0;
      }
      
      // Ensure goalsPerMatch is a string with 2 decimals
      if (typeof goalsPerMatch === 'number') {
        goalsPerMatch = goalsPerMatch.toFixed(2);
      }
      
      
      return {
        matchesPlayed: matchesPlayed,
        goalsPerMatch: goalsPerMatch || '0.00',
        totalGoals: totalGoals,
        firstHalfAvg: firstHalfAvg,
        secondHalfAvg: secondHalfAvg,
        over05: parseInt(overPercentages.over05, 10) || 0,
        over15: parseInt(overPercentages.over15, 10) || 0,
        over25: parseInt(overPercentages.over25, 10) || 0,
        over35: parseInt(overPercentages.over35, 10) || 0,
        failedToScore: parseInt(failedToScore, 10) || 0
      };
    } catch (error) {
      return this.getDefaultStats();
    }
  }
  
  parsePercentage(value) {
    if (value === undefined || value === null) return 0;
    if (typeof value === 'string') {
      return parseFloat(value.replace('%', '')) || 0;
    }
    return parseFloat(value) || 0;
  }
  
  getDefaultStats() {
    return {
      matchesPlayed: 0,
      goalsPerMatch: '0.00',
      totalGoals: 0,
      firstHalfAvg: '0.00',
      secondHalfAvg: '0.00',
      over05: 0,
      over15: 0,
      over25: 0,
      over35: 0,
      failedToScore: 0
    };
  }
  
  generateH2HInsights() {
    if (!this.h2hData || !this.h2hData.matches || this.h2hData.matches.length === 0) {
      return null;
    }
    
    const matches = this.h2hData.matches;
    let totalGoals = 0;
    let over25Count = 0;
    let bttsCount = 0;
    
    matches.forEach(match => {
      const homeGoals = parseInt(match.homeScore) || 0;
      const awayGoals = parseInt(match.awayScore) || 0;
      const matchTotal = homeGoals + awayGoals;
      
      totalGoals += matchTotal;
      if (matchTotal > 2.5) over25Count++;
      if (homeGoals > 0 && awayGoals > 0) bttsCount++;
    });
    
    const avgGoals = (totalGoals / matches.length).toFixed(2);
    const over25Percentage = ((over25Count / matches.length) * 100).toFixed(0);
    const bttsPercentage = ((bttsCount / matches.length) * 100).toFixed(0);
    
    return {
      totalMatches: matches.length,
      averageGoals: avgGoals,
      over25Percentage,
      bttsPercentage
    };
  }
}

export { GoalsH2HComparison };