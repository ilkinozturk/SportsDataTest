/**
 * Data Transfer Object for Team Comparison data
 * Maps and sanitizes comparison data between two teams
 */

class ComparisonDTO {
  constructor(team1Data, team2Data) {
    if (!team1Data || !team2Data) {
      throw new Error('Both teams data are required for comparison');
    }

    // Team information
    this.team1 = this.mapTeamInfo(team1Data);
    this.team2 = this.mapTeamInfo(team2Data);
    
    // Head to head record
    this.headToHead = this.calculateHeadToHead(team1Data, team2Data);
    
    // Statistical comparison
    this.comparison = this.compareStatistics(team1Data, team2Data);
    
    // Form comparison
    this.formComparison = this.compareForm(team1Data, team2Data);
    
    // Remove sensitive data
    this.removeApiKeys();
  }

  mapTeamInfo(teamData) {
    const info = teamData.teamInfo || teamData.team || teamData;
    const stats = teamData.statistics || teamData.stats || {};
    
    return {
      id: info.id || info.team_id,
      name: info.name || info.team_name,
      logo: info.logo || info.image || info.badge_url,
      position: teamData.leaguePosition || teamData.position || null,
      points: stats.points || 0,
      matches: stats.totalMatches || stats.matches || 0
    };
  }

  calculateHeadToHead(team1Data, team2Data) {
    // This would typically come from a head-to-head API endpoint
    // For now, return a structured placeholder
    return {
      totalMatches: 0,
      team1Wins: 0,
      draws: 0,
      team2Wins: 0,
      lastMatches: []
    };
  }

  compareStatistics(team1Data, team2Data) {
    const stats1 = team1Data.statistics || team1Data.stats || {};
    const stats2 = team2Data.statistics || team2Data.stats || {};
    
    return {
      // Win rate comparison
      winRate: {
        team1: this.calculateWinRate(stats1),
        team2: this.calculateWinRate(stats2),
        difference: this.calculateWinRate(stats1) - this.calculateWinRate(stats2)
      },
      
      // Goals comparison
      goals: {
        scored: {
          team1: stats1.goalsFor || 0,
          team2: stats2.goalsFor || 0,
          avgTeam1: this.calculateAverage(stats1.goalsFor, stats1.totalMatches),
          avgTeam2: this.calculateAverage(stats2.goalsFor, stats2.totalMatches)
        },
        conceded: {
          team1: stats1.goalsAgainst || 0,
          team2: stats2.goalsAgainst || 0,
          avgTeam1: this.calculateAverage(stats1.goalsAgainst, stats1.totalMatches),
          avgTeam2: this.calculateAverage(stats2.goalsAgainst, stats2.totalMatches)
        }
      },
      
      // Points per game
      pointsPerGame: {
        team1: stats1.pointsPerGame || 0,
        team2: stats2.pointsPerGame || 0,
        difference: (stats1.pointsPerGame || 0) - (stats2.pointsPerGame || 0)
      },
      
      // Home/Away performance
      homePerformance: {
        team1: this.extractHomeStats(stats1),
        team2: this.extractHomeStats(stats2)
      },
      awayPerformance: {
        team1: this.extractAwayStats(stats1),
        team2: this.extractAwayStats(stats2)
      },
      
      // Cards comparison
      discipline: {
        team1: {
          yellowCards: stats1.yellowCards || stats1.yellow_cards || 0,
          redCards: stats1.redCards || stats1.red_cards || 0,
          totalCards: (stats1.yellowCards || 0) + (stats1.redCards || 0)
        },
        team2: {
          yellowCards: stats2.yellowCards || stats2.yellow_cards || 0,
          redCards: stats2.redCards || stats2.red_cards || 0,
          totalCards: (stats2.yellowCards || 0) + (stats2.redCards || 0)
        }
      }
    };
  }

  compareForm(team1Data, team2Data) {
    const form1 = team1Data.form || team1Data.recentForm || [];
    const form2 = team2Data.form || team2Data.recentForm || [];
    
    return {
      team1: {
        form: Array.isArray(form1) ? form1.slice(0, 5) : [],
        points: this.calculateFormPoints(form1)
      },
      team2: {
        form: Array.isArray(form2) ? form2.slice(0, 5) : [],
        points: this.calculateFormPoints(form2)
      }
    };
  }

  calculateWinRate(stats) {
    const matches = stats.totalMatches || stats.matches || 0;
    const wins = stats.wins || 0;
    return matches > 0 ? Math.round((wins / matches) * 100) : 0;
  }

  calculateAverage(total, matches) {
    return matches > 0 ? Math.round((total / matches) * 100) / 100 : 0;
  }

  extractHomeStats(stats) {
    return {
      matches: stats.homeMatches || 0,
      wins: stats.homeWins || 0,
      draws: stats.homeDraws || 0,
      losses: stats.homeLosses || 0,
      winRate: this.calculateWinRate({
        totalMatches: stats.homeMatches,
        wins: stats.homeWins
      })
    };
  }

  extractAwayStats(stats) {
    return {
      matches: stats.awayMatches || 0,
      wins: stats.awayWins || 0,
      draws: stats.awayDraws || 0,
      losses: stats.awayLosses || 0,
      winRate: this.calculateWinRate({
        totalMatches: stats.awayMatches,
        wins: stats.awayWins
      })
    };
  }

  calculateFormPoints(form) {
    if (!Array.isArray(form)) return 0;
    
    return form.slice(0, 5).reduce((points, result) => {
      if (result === 'W' || result === 'win') return points + 3;
      if (result === 'D' || result === 'draw') return points + 1;
      return points;
    }, 0);
  }

  removeApiKeys() {
    // Clean team1
    delete this.team1.apiKey;
    delete this.team1._id;
    
    // Clean team2
    delete this.team2.apiKey;
    delete this.team2._id;
  }

  static fromTeamsData(team1Data, team2Data) {
    return new ComparisonDTO(team1Data, team2Data);
  }
}

module.exports = ComparisonDTO;