/**
 * Cards H2H Comparison Module
 * Displays cards statistics for both teams in H2H Cards tab
 */

import TeamStatisticsExtractor from '../../services/TeamStatisticsExtractor.js';

class CardsH2HComparison {
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
        this.calculateCardsComparison();
      }
    });
    
    // Listen for team stats data
    this.eventBus.on('team-stats-loaded', teamData => {
      this.teamStatsData = teamData;
      if (this.matchData) {
        this.calculateCardsComparison();
      }
    });
    
    // Listen for tab switch to h2h-cards
    this.eventBus.on('tab-switched', tabName => {
      if (tabName === 'h2h-cards' && this.teamStatsData && this.matchData) {
        this.calculateCardsComparison();
      }
    });
    
    // Listen for h2h-cards request
    this.eventBus.on('h2h-cards-requested', matchData => {
      if (matchData) {
        this.matchData = matchData;
        if (this.teamStatsData) {
          this.calculateCardsComparison();
        }
      }
    });
  }

  calculateCardsComparison() {
    if (!this.teamStatsData || !this.teamStatsData.homeTeam || !this.teamStatsData.awayTeam) {
      return;
    }

    const homeTeam = this.teamStatsData.homeTeam;
    const awayTeam = this.teamStatsData.awayTeam;

    // Extract cards statistics
    const comparison = {
      homeTeam: {
        name: homeTeam.name,
        logo: homeTeam.logo,
        id: homeTeam.id,
        stats: this.extractCardsStats(homeTeam, 'home')
      },
      awayTeam: {
        name: awayTeam.name,
        logo: awayTeam.logo,
        id: awayTeam.id,
        stats: this.extractCardsStats(awayTeam, 'away')
      }
    };

    // Emit the comparison data
    this.eventBus.emit('cards-h2h-comparison-calculated', comparison);
  }

  extractCardsStats(teamData, venue) {
    if (!teamData) return this.getDefaultStats();
    
    const stats = teamData.stats || {};
    const statistics = teamData.statistics || {};
    const additionalInfo = teamData.additional_info || {};
    
    
    // Get cards per match
    let cardsPerMatch = '0.00';
    let matchesPlayed = 0;
    let totalCards = 0;
    
    // Extract cards data based on venue
    if (venue === 'home') {
      // Try different field names for home cards - check teamData root level too
      cardsPerMatch = teamData.homeCardsPerMatch ||
                      teamData.cardsAVG_home ||
                      teamData.homeCardsAVG ||
                      stats.cardsTotalAVG_home || 
                      stats.cardsAVG_home ||
                      stats.homeCardsPerMatch ||
                      stats.homeCardsAVG ||
                      statistics.cardsAVG_home ||
                      statistics.homeCardsAVG ||
                      additionalInfo.cardsTotalAVG_home ||
                      additionalInfo.cardsAVG_home ||
                      additionalInfo.homeCardsPerMatch ||
                      '0.00';
      
      totalCards = teamData.homeCardsFor ||
                   teamData.cardsTotal_home ||
                   stats.cardsTotal_home || 
                   stats.homeCards || 
                   stats.homeCardsFor ||
                   additionalInfo.cardsTotal_home || 
                   additionalInfo.homeCardsFor ||
                   0;
                   
      matchesPlayed = teamData.homeMatches ||
                      stats.matchesPlayed_home || 
                      stats.homeMatches ||
                      additionalInfo.matchesPlayed_home || 
                      additionalInfo.homeMatches ||
                      0;
    } else if (venue === 'away') {
      // Try different field names for away cards - check teamData root level too
      cardsPerMatch = teamData.awayCardsPerMatch ||
                      teamData.cardsAVG_away ||
                      teamData.awayCardsAVG ||
                      stats.cardsTotalAVG_away ||
                      stats.cardsAVG_away ||
                      stats.awayCardsPerMatch ||
                      stats.awayCardsAVG ||
                      statistics.cardsAVG_away ||
                      statistics.awayCardsAVG ||
                      additionalInfo.cardsTotalAVG_away ||
                      additionalInfo.cardsAVG_away ||
                      additionalInfo.awayCardsPerMatch ||
                      '0.00';
      
      totalCards = teamData.awayCardsFor ||
                   teamData.cardsTotal_away ||
                   stats.cardsTotal_away || 
                   stats.awayCards || 
                   stats.awayCardsFor ||
                   additionalInfo.cardsTotal_away ||
                   additionalInfo.awayCardsFor ||
                   0;
                   
      matchesPlayed = teamData.awayMatches ||
                      stats.matchesPlayed_away || 
                      stats.awayMatches ||
                      additionalInfo.matchesPlayed_away ||
                      additionalInfo.awayMatches ||
                      0;
    }
    
    // Extract over statistics
    const overStats = this.extractCardsOverStats(teamData, venue);
    
    
    return {
      cardsPerMatch: parseFloat(cardsPerMatch).toFixed(2),
      totalCards: totalCards,
      matchesPlayed: matchesPlayed,
      ...overStats
    };
  }
  
  extractCardsOverStats(teamData, venue) {
    // Use TeamStatisticsExtractor to get card over percentages
    const cardsOverPercentages = TeamStatisticsExtractor.extractCardsOverPercentages(teamData, venue);
    
    // Return only the percentages we need for cards display
    const overStats = {
      over05: parseFloat(cardsOverPercentages.over05 || 0),
      over15: parseFloat(cardsOverPercentages.over15 || 0),
      over25: parseFloat(cardsOverPercentages.over25 || 0),
      over35: parseFloat(cardsOverPercentages.over35 || 0),
      over45: parseFloat(cardsOverPercentages.over45 || 0),
      over55: parseFloat(cardsOverPercentages.over55 || 0),
      over65: parseFloat(cardsOverPercentages.over65 || 0)
    };
    
    return overStats;
  }

  getDefaultStats() {
    return {
      cardsPerMatch: '0.00',
      totalCards: 0,
      matchesPlayed: 0,
      over25: 0,
      over35: 0,
      over45: 0,
      over55: 0,
      over65: 0
    };
  }
}

export default CardsH2HComparison;