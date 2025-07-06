/**
 * Data Transfer Object for Match data
 * Maps and sanitizes raw match data for client consumption
 */

class MatchDTO {
  constructor(rawData) {
    if (!rawData) {
      return null;
    }

    // Basic match information
    this.id = rawData.id || rawData.match_id;
    this.date = rawData.date || rawData.match_date;
    this.time = rawData.time || rawData.match_time;
    this.status = rawData.status || rawData.match_status || 'scheduled';
    this.venue = rawData.venue || rawData.stadium;
    this.referee = rawData.referee;
    
    // Teams
    this.homeTeam = this.mapTeam(rawData.homeTeam || rawData.home_team);
    this.awayTeam = this.mapTeam(rawData.awayTeam || rawData.away_team);
    
    // Score
    this.score = this.mapScore(rawData);
    
    // Statistics (if available)
    if (rawData.statistics || rawData.stats) {
      this.statistics = this.mapStatistics(rawData.statistics || rawData.stats);
    }
    
    // Events (if available)
    if (rawData.events) {
      this.events = this.mapEvents(rawData.events);
    }
    
    // Odds (if available)
    if (rawData.odds) {
      this.odds = rawData.odds;
    }
    
    // Remove sensitive data
    this.removeApiKeys();
  }

  mapTeam(teamData) {
    if (!teamData) return null;
    
    return {
      id: teamData.id || teamData.team_id,
      name: teamData.name || teamData.team_name,
      logo: teamData.logo || teamData.badge || teamData.image,
      shortName: teamData.shortName || teamData.short_name
    };
  }

  mapScore(rawData) {
    return {
      fullTime: {
        home: rawData.homeScore || rawData.home_score || rawData.score?.home || 0,
        away: rawData.awayScore || rawData.away_score || rawData.score?.away || 0
      },
      halfTime: {
        home: rawData.homeScoreHT || rawData.ht_score?.home || 0,
        away: rawData.awayScoreHT || rawData.ht_score?.away || 0
      }
    };
  }

  mapStatistics(stats) {
    if (!stats) return null;
    
    // Handle both array and object formats
    if (Array.isArray(stats)) {
      const homeStats = stats.find(s => s.team === 'home') || {};
      const awayStats = stats.find(s => s.team === 'away') || {};
      
      return {
        home: this.extractTeamStats(homeStats),
        away: this.extractTeamStats(awayStats)
      };
    }
    
    return {
      home: this.extractTeamStats(stats.home || stats.homeTeam || {}),
      away: this.extractTeamStats(stats.away || stats.awayTeam || {})
    };
  }

  extractTeamStats(teamStats) {
    return {
      possession: teamStats.possession || teamStats.ball_possession || 0,
      shots: teamStats.shots || teamStats.total_shots || 0,
      shotsOnTarget: teamStats.shotsOnTarget || teamStats.shots_on_target || 0,
      corners: teamStats.corners || 0,
      fouls: teamStats.fouls || 0,
      yellowCards: teamStats.yellowCards || teamStats.yellow_cards || 0,
      redCards: teamStats.redCards || teamStats.red_cards || 0,
      offsides: teamStats.offsides || 0,
      saves: teamStats.saves || teamStats.goalkeeper_saves || 0
    };
  }

  mapEvents(events) {
    if (!Array.isArray(events)) return [];
    
    return events.map(event => ({
      type: event.type || event.event_type,
      minute: event.minute || event.time,
      team: event.team,
      player: event.player || event.player_name,
      assistPlayer: event.assist || event.assist_player,
      detail: event.detail || event.description
    }));
  }

  removeApiKeys() {
    delete this.apiKey;
    delete this.api_key;
    delete this._id;
    delete this.__v;
    delete this.createdAt;
    delete this.updatedAt;
  }

  static fromRawData(rawData) {
    return new MatchDTO(rawData);
  }

  static fromArray(rawDataArray) {
    if (!Array.isArray(rawDataArray)) {
      return [];
    }
    return rawDataArray.map(data => new MatchDTO(data));
  }
}

module.exports = MatchDTO;