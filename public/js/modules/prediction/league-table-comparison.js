/**
 * League Table Comparison Module
 * Compares league standings between two teams
 */
class LeagueTableComparison {
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.leagueTableCache = new Map();
    this.cacheTTL = 300000; // 5 minutes
    this.seasonId = null;
    
    this.initialize();
  }

  initialize() {
    
    this.eventBus.on('team-stats-loaded', teamData => {
      
      if (teamData && !this.seasonId) {
        // Check for direct season ID from team data
        if (!this.seasonId) {
          const possibleSeasonIds = [
            teamData.homeTeam?.seasonId,
            teamData.awayTeam?.seasonId,
            teamData.homeTeam?.stats?.seasonId,
            teamData.awayTeam?.stats?.seasonId,
            teamData.homeTeam?.stats?.season_id,
            teamData.awayTeam?.stats?.season_id,
            teamData.homeTeam?.season_id,
            teamData.awayTeam?.season_id,
            teamData.homeTeam?.additional_info?.season_id,
            teamData.awayTeam?.additional_info?.season_id,
            teamData.seasonId,
            teamData.season_id
          ];
          
          this.seasonId = possibleSeasonIds.find(id => id !== undefined && id !== null);
          
          if (this.seasonId) {
            this.fetchLeagueTable();
          }
        }
      }
      
      this.calculateLeagueTableComparison(teamData);
    });

    // Listen for match data to get competition ID (which is actually season ID)
    this.eventBus.on('match-data-loaded', matchData => {
      
      if (!this.seasonId && matchData) {
        // Server logs show that competition_id is the season ID
        if (matchData.league?.id) {
          this.seasonId = matchData.league.id;
          this.fetchLeagueTable();
        }
      }
    });
    
  }

  /**
   * Fetch league table from API
   */
  async fetchLeagueTable() {
    if (window.DEBUG_MODE) {
    }
    
    if (!this.seasonId) {
      return;
    }

    // Check cache first
    const cacheKey = `league-table-${this.seasonId}`;
    const cached = this.leagueTableCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      this.leagueTableData = cached.data;
      // Re-emit if we already have team data
      if (this.currentTeamData) {
        this.calculateLeagueTableComparison(this.currentTeamData);
      }
      return;
    }

    try {
      // Use backend proxy to avoid CORS
      const url = `/api/league-tables?season_id=${this.seasonId}&include=stats`;
      if (window.DEBUG_MODE) {
      }
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error('HTTP error! status: ' + response.status);
      }
      
      const data = await response.json();
      if (window.DEBUG_MODE) {
      }
      
      if (data.success && data.data) {
        this.leagueTableData = data.data;
        if (window.DEBUG_MODE) {
        }
        
        // Cache the data
        this.leagueTableCache.set(cacheKey, {
          data: this.leagueTableData,
          timestamp: Date.now()
        });
        
        // Re-emit if we already have team data
        if (this.currentTeamData) {
          if (window.DEBUG_MODE) {
          }
          this.calculateLeagueTableComparison(this.currentTeamData);
        }
      } else {
      }
    } catch (error) {
    }
  }

  /**
   * Calculate league table comparison between teams
   * @param {Object} teamData - Contains homeTeam and awayTeam data
   */
  calculateLeagueTableComparison(teamData) {
    if (window.DEBUG_MODE) {
    }
    
    if (!teamData.homeTeam || !teamData.awayTeam) {
      if (window.DEBUG_MODE) {
      }
      return;
    }

    // Store team data for later use
    this.currentTeamData = teamData;

    // Extract league table from API data
    let leagueTable = this.extractLeagueTableFromAPI();
    if (window.DEBUG_MODE) {
    }

    // If no league table data and in demo mode, use sample data
    if ((!leagueTable || leagueTable.length === 0) && window.DEMO_MODE) {
      if (window.DEBUG_MODE) {
      }
      leagueTable = this.getDemoLeagueTable(teamData);
    }

    if (!leagueTable || leagueTable.length === 0) {
      if (window.DEBUG_MODE) {
      }
      return;
    }

    const comparison = {
      homeTeam: {
        name: teamData.homeTeam.name,
        logo: teamData.homeTeam.logo,
        id: teamData.homeTeam.id
      },
      awayTeam: {
        name: teamData.awayTeam.name,
        logo: teamData.awayTeam.logo,
        id: teamData.awayTeam.id
      },
      leagueTable: leagueTable
    };

    // Emit the calculated comparison
    this.eventBus.emit('league-table-comparison-calculated', comparison);
  }

  /**
   * Extract league table from API response
   * @returns {Array} Processed league table data
   */
  extractLeagueTableFromAPI() {
    if (!this.leagueTableData) {
      return null;
    }

    // Check for different table types in API response
    let leagueTable = null;
    
    // Check all_matches_table_overall first (main league table)
    if (this.leagueTableData.all_matches_table_overall && 
        this.leagueTableData.all_matches_table_overall.length > 0) {
      leagueTable = this.leagueTableData.all_matches_table_overall;
    }
    // Check specific tables (for tournaments with groups)
    else if (this.leagueTableData.specific_tables && 
             this.leagueTableData.specific_tables.length > 0) {
      // Find the table that contains our teams
      for (const specific of this.leagueTableData.specific_tables) {
        if (specific.table && specific.table.length > 0) {
          leagueTable = specific.table;
          break;
        } else if (specific.groups && specific.groups.length > 0) {
          // For group stages, find the group with our teams
          for (const group of specific.groups) {
            if (group.table && group.table.length > 0) {
              // Check if this group contains our teams
              const hasHomeTeam = group.table.some(t => t.id === String(this.currentTeamData?.homeTeam?.id));
              const hasAwayTeam = group.table.some(t => t.id === String(this.currentTeamData?.awayTeam?.id));
              
              if (hasHomeTeam || hasAwayTeam) {
                leagueTable = group.table;
                break;
              }
            }
          }
          if (leagueTable) break;
        }
      }
    }

    if (!leagueTable || leagueTable.length === 0) {
      return null;
    }

    // Process and normalize league table data
    return leagueTable.map((team, index) => ({
      position: team.position || index + 1,
      teamId: parseInt(team.id || team.teamId || 0, 10),
      teamName: team.name || team.teamName || team.cleanName || 'Unknown',
      matchesPlayed: parseInt(team.matchesPlayed || team.MP || 0, 10),
      wins: parseInt(team.seasonWins_overall || team.wins || team.Win || 0, 10),
      draws: parseInt(team.seasonDraws_overall || team.draws || team.Draw || 0, 10),
      losses: parseInt(team.seasonLosses_overall || team.losses || team.Loss || 0, 10),
      goalsFor: parseInt(team.seasonGoals || team.seasonGoals_overall || team.goalsFor || team.GF || 0, 10),
      goalsAgainst: parseInt(team.seasonConceded || team.seasonConceded_overall || team.goalsAgainst || team.GA || 0, 10),
      goalDifference: parseInt(team.seasonGoalDifference || team.goalDifference || team.GD || 0, 10),
      points: parseInt(team.points || team.Pts || 0, 10),
      form: team.wdl_record || team.form || '',
      // Highlight if this is one of the teams in the match
      isHomeTeam: parseInt(team.id, 10) === this.currentTeamData?.homeTeam?.id,
      isAwayTeam: parseInt(team.id, 10) === this.currentTeamData?.awayTeam?.id,
    }));
  }

  /**
   * Get demo league table data for testing
   * @param {Object} teamData - Team data
   * @returns {Array} Demo league table
   */
  getDemoLeagueTable(teamData) {
    const teams = [
      { name: 'Manchester City', wins: 28, draws: 5, losses: 5, gf: 89, ga: 33, pts: 89, form: 'WWWDW' },
      { name: 'Arsenal', wins: 26, draws: 6, losses: 6, gf: 88, ga: 43, pts: 84, form: 'WDWWL' },
      { name: teamData.homeTeam.name || 'Liverpool', wins: 24, draws: 9, losses: 5, gf: 84, ga: 41, pts: 81, form: 'WWDWD' },
      { name: 'Aston Villa', wins: 20, draws: 8, losses: 10, gf: 76, ga: 61, pts: 68, form: 'LDWWW' },
      { name: 'Tottenham', wins: 19, draws: 6, losses: 13, gf: 70, ga: 61, pts: 63, form: 'DWLWD' },
      { name: teamData.awayTeam.name || 'Manchester United', wins: 16, draws: 9, losses: 13, gf: 52, ga: 56, pts: 57, form: 'LWDLL' },
      { name: 'Newcastle', wins: 15, draws: 12, losses: 11, gf: 76, ga: 57, pts: 57, form: 'DDWLW' },
      { name: 'Chelsea', wins: 16, draws: 9, losses: 13, gf: 73, ga: 60, pts: 57, form: 'WWLDD' },
      { name: 'Brighton', wins: 14, draws: 11, losses: 13, gf: 53, ga: 58, pts: 53, form: 'WLDWD' },
      { name: 'Wolves', wins: 12, draws: 11, losses: 15, gf: 47, ga: 56, pts: 47, form: 'DLLDW' }
    ];

    return teams.map((team, index) => ({
      position: index + 1,
      teamId: index + 100,
      teamName: team.name,
      matchesPlayed: 38,
      wins: team.wins,
      draws: team.draws,
      losses: team.losses,
      goalsFor: team.gf,
      goalsAgainst: team.ga,
      goalDifference: team.gf - team.ga,
      points: team.pts,
      form: team.form,
      isHomeTeam: team.name === (teamData.homeTeam.name || 'Liverpool'),
      isAwayTeam: team.name === (teamData.awayTeam.name || 'Manchester United'),
    }));
  }
}

export { LeagueTableComparison };