/**
 * Goals Conceded H2H Comparison Module
 * Displays goals conceded statistics for both teams in H2H tab
 */

import TeamStatisticsExtractor from '../../services/TeamStatisticsExtractor.js';

export class GoalsConcededH2HComparison {
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
        stats: this.extractGoalsConcededStats(this.teamData.homeTeam, 'home')
      },
      awayTeam: {
        name: awayTeamInfo.name || awayTeamInfo.teamName || 'Away Team',
        logo: this.getTeamLogoUrl(awayTeamInfo.logo || awayTeamInfo.teamLogo || awayTeamInfo.image),
        stats: this.extractGoalsConcededStats(this.teamData.awayTeam, 'away')
      }
    };
    

    // Emit comparison data
    this.eventBus.emit('goals-conceded-h2h-comparison-updated', comparison);
  }

  extractGoalsConcededStats(teamData, venue) {
    if (!teamData) return this.getDefaultStats();
    
    try {
      const stats = teamData.stats || teamData.statistics || {};
      const additionalInfo = teamData.additional_info || {};
      
      // Get conceded data using TeamStatisticsExtractor
      const concededStats = TeamStatisticsExtractor.extractGoalsConcededStats(teamData, venue);
      const concededOverPercentages = TeamStatisticsExtractor.extractConcededOverPercentages(teamData, venue);
      const csFts = TeamStatisticsExtractor.extractCSandFTSPercentages(teamData, venue);
      
      // Extract goals conceded per match
      let goalsConcededPerMatch = concededStats.goalsConcededPerMatch || '0.00';
      
      // If still no data, try alternative fields
      if (goalsConcededPerMatch === '0.00') {
        if (venue === 'home') {
          goalsConcededPerMatch = stats.homeConcededPerMatch || 
                                  stats.homeGoalsConcededPerMatch || 
                                  additionalInfo.homeConcededAvg || 
                                  '0.00';
        } else {
          goalsConcededPerMatch = stats.awayConcededPerMatch || 
                                  stats.awayGoalsConcededPerMatch || 
                                  additionalInfo.awayConcededAvg || 
                                  '0.00';
        }
      }
      
      return {
        matchesPlayed: concededStats.matchesPlayed || 0,
        goalsConcededPerMatch: goalsConcededPerMatch || '0.00',
        totalGoalsConceded: concededStats.totalGoalsConceded || 0,
        firstHalfConcededAvg: concededStats.firstHalfConcededAvg || '0.00',
        secondHalfConcededAvg: concededStats.secondHalfConcededAvg || '0.00',
        over05: parseInt(concededOverPercentages.over05, 10) || 0,
        over15: parseInt(concededOverPercentages.over15, 10) || 0,
        over25: parseInt(concededOverPercentages.over25, 10) || 0,
        over35: parseInt(concededOverPercentages.over35, 10) || 0,
        cleanSheet: parseInt(csFts.cleanSheetPercentage, 10) || 0
      };
    } catch (error) {
      return this.getDefaultStats();
    }
  }

  getDefaultStats() {
    return {
      matchesPlayed: 0,
      goalsConcededPerMatch: '0.00',
      totalGoalsConceded: 0,
      firstHalfConcededAvg: '0.00',
      secondHalfConcededAvg: '0.00',
      over05: 0,
      over15: 0,
      over25: 0,
      over35: 0,
      cleanSheet: 0
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

export default GoalsConcededH2HComparison;