/**
 * Cards Statistics Module
 * Handles all card-related calculations and analysis
 * Extends BaseStatistics for common functionality
 */

(function (global) {
  'use strict';

  class CardsStatistics {
    constructor() {
      this.name = 'CardsStatistics';
      this.version = '1.0.0';

      // Dependencies
      this.baseStats = global.TeamStatsBaseStatistics;

      if (!this.baseStats) {
      }

      // Card thresholds for over/under calculations
      this.overUnderThresholds = [0.5, 1.5, 2.5, 3.5, 4.5, 5.5, 6.5];

      // Card types
      this.cardTypes = {
        YELLOW: 'yellow',
        RED: 'red',
        SECOND_YELLOW: 'secondYellow',
      };

      // Time intervals for card timing analysis
      this.timeIntervals = [
        { label: '0-15', start: 0, end: 15 },
        { label: '16-30', start: 16, end: 30 },
        { label: '31-45', start: 31, end: 45 },
        { label: '46-60', start: 46, end: 60 },
        { label: '61-75', start: 61, end: 75 },
        { label: '76-90', start: 76, end: 90 },
      ];

      // Performance metrics
      this.metrics = {
        calculations: 0,
        startTime: Date.now(),
      };
    }

    /**
     * Calculate comprehensive card statistics
     */
    calculateCardStatistics(matches, options = {}) {
      if (!Array.isArray(matches) || matches.length === 0) {
        return this.getEmptyStatistics();
      }

      const startTime = performance.now();
      this.metrics.calculations++;

      // Filter matches based on options
      const filteredMatches = this.filterMatches(matches, options);

      const stats = {
        // Basic statistics
        matches: filteredMatches.length,
        totalCards: this.calculateTotalCards(filteredMatches),
        cardsFor: this.calculateCardsFor(filteredMatches, options.teamId),
        cardsAgainst: this.calculateCardsAgainst(filteredMatches, options.teamId),

        // Card types
        yellowCards: this.calculateCardsByType(
          filteredMatches,
          this.cardTypes.YELLOW,
          options.teamId
        ),
        redCards: this.calculateCardsByType(filteredMatches, this.cardTypes.RED, options.teamId),

        // Averages
        avgCardsFor: 0,
        avgCardsAgainst: 0,
        avgTotalCards: 0,

        // Card timing
        firstHalfCards: this.calculateHalfCards(filteredMatches, 'first'),
        secondHalfCards: this.calculateHalfCards(filteredMatches, 'second'),

        // Over/Under statistics
        overUnder: this.calculateOverUnder(filteredMatches),

        // Team cards analysis
        teamCardsOver: this.calculateTeamCardsOver(filteredMatches, options.teamId),
        opponentCardsOver: this.calculateOpponentCardsOver(filteredMatches, options.teamId),

        // Card timing distribution
        cardTiming: this.calculateCardTiming(filteredMatches),

        // Booking patterns
        bookingPatterns: this.calculateBookingPatterns(filteredMatches, options.teamId),

        // Referee analysis
        refereeStats: this.calculateRefereeStats(filteredMatches),

        // High card matches
        highCardMatches: this.getHighCardMatches(filteredMatches),

        // Form and trends
        form: this.calculateCardForm(filteredMatches, options.teamId),
        trend: this.calculateCardTrend(filteredMatches, options.teamId),

        // Disciplinary record
        disciplinaryRecord: this.calculateDisciplinaryRecord(filteredMatches, options.teamId),
      };

      // Calculate averages
      if (stats.matches > 0) {
        stats.avgCardsFor = this.baseStats.divide(stats.cardsFor, stats.matches);
        stats.avgCardsAgainst = this.baseStats.divide(stats.cardsAgainst, stats.matches);
        stats.avgTotalCards = this.baseStats.divide(stats.totalCards, stats.matches);
      }

      // Add performance metric
      stats.calculationTime = performance.now() - startTime;

      return stats;
    }

    /**
     * Filter matches based on options
     */
    filterMatches(matches, options = {}) {
      let filtered = [...matches];

      // Filter by venue
      if (options.venue && options.venue !== 'overall') {
        filtered = this.baseStats.filterByVenue(filtered, options.venue);
      }

      // Filter by timeframe
      if (options.timeFrame && options.timeFrame !== 'all') {
        const limit = parseInt(options.timeFrame.replace('last', ''));
        if (!isNaN(limit)) {
          filtered = this.baseStats.getLastNMatches(filtered, limit);
        }
      }

      // Filter by competition
      if (options.competition) {
        filtered = filtered.filter(
          match =>
            match.competition === options.competition || match.competitionId === options.competition
        );
      }

      // Filter by referee
      if (options.referee) {
        filtered = filtered.filter(
          match => match.referee === options.referee || match.refereeId === options.referee
        );
      }

      return filtered;
    }

    /**
     * Calculate total cards in matches
     */
    calculateTotalCards(matches) {
      return matches.reduce((total, match) => {
        const homeCards = this.getMatchCards(match, 'home');
        const awayCards = this.getMatchCards(match, 'away');
        return total + homeCards + awayCards;
      }, 0);
    }

    /**
     * Calculate cards received by team
     */
    calculateCardsFor(matches, teamId) {
      if (!teamId) return 0;

      return matches.reduce((total, match) => {
        const isHome = String(match.homeTeamId || match.home_team_id) === String(teamId);
        const cards = isHome
          ? this.getMatchCards(match, 'home')
          : this.getMatchCards(match, 'away');
        return total + cards;
      }, 0);
    }

    /**
     * Calculate cards received by opponents
     */
    calculateCardsAgainst(matches, teamId) {
      if (!teamId) return 0;

      return matches.reduce((total, match) => {
        const isHome = String(match.homeTeamId || match.home_team_id) === String(teamId);
        const cards = isHome
          ? this.getMatchCards(match, 'away')
          : this.getMatchCards(match, 'home');
        return total + cards;
      }, 0);
    }

    /**
     * Get cards from match data
     */
    getMatchCards(match, side) {
      // Try different possible field names
      const yellowCards = parseInt(
        match[`${side}YellowCards`] || match[`${side}_yellow_cards`] || match[`${side}Yellow`] || 0
      );

      const redCards = parseInt(
        match[`${side}RedCards`] || match[`${side}_red_cards`] || match[`${side}Red`] || 0
      );

      return yellowCards + redCards;
    }

    /**
     * Calculate cards by type
     */
    calculateCardsByType(matches, cardType, teamId) {
      if (!teamId) return { for: 0, against: 0, total: 0 };

      let cardsFor = 0;
      let cardsAgainst = 0;

      matches.forEach(match => {
        const isHome = String(match.homeTeamId || match.home_team_id) === String(teamId);

        if (cardType === this.cardTypes.YELLOW) {
          cardsFor += isHome
            ? parseInt(match.homeYellowCards || match.home_yellow_cards || 0)
            : parseInt(match.awayYellowCards || match.away_yellow_cards || 0);
          cardsAgainst += isHome
            ? parseInt(match.awayYellowCards || match.away_yellow_cards || 0)
            : parseInt(match.homeYellowCards || match.home_yellow_cards || 0);
        } else if (cardType === this.cardTypes.RED) {
          cardsFor += isHome
            ? parseInt(match.homeRedCards || match.home_red_cards || 0)
            : parseInt(match.awayRedCards || match.away_red_cards || 0);
          cardsAgainst += isHome
            ? parseInt(match.awayRedCards || match.away_red_cards || 0)
            : parseInt(match.homeRedCards || match.home_red_cards || 0);
        }
      });

      return {
        for: cardsFor,
        against: cardsAgainst,
        total: cardsFor + cardsAgainst,
        avgFor: matches.length > 0 ? this.baseStats.divide(cardsFor, matches.length) : 0,
        avgAgainst: matches.length > 0 ? this.baseStats.divide(cardsAgainst, matches.length) : 0,
      };
    }

    /**
     * Calculate cards by half
     */
    calculateHalfCards(matches, half) {
      return matches.reduce((total, match) => {
        if (half === 'first') {
          const firstHalfCards =
            parseInt(match.firstHalfHomeCards || match.fh_home_cards || 0) +
            parseInt(match.firstHalfAwayCards || match.fh_away_cards || 0);
          return total + firstHalfCards;
        } else {
          // Calculate second half cards (total - first half)
          const totalCards = this.getMatchCards(match, 'home') + this.getMatchCards(match, 'away');
          const firstHalfCards =
            parseInt(match.firstHalfHomeCards || match.fh_home_cards || 0) +
            parseInt(match.firstHalfAwayCards || match.fh_away_cards || 0);
          return total + (totalCards - firstHalfCards);
        }
      }, 0);
    }

    /**
     * Calculate over/under statistics
     */
    calculateOverUnder(matches) {
      const stats = {};

      this.overUnderThresholds.forEach(threshold => {
        const key = `over${threshold.toString().replace('.', '_')}`;
        const overMatches = matches.filter(match => {
          const totalCards = this.getMatchCards(match, 'home') + this.getMatchCards(match, 'away');
          return totalCards > threshold;
        });

        stats[key] = {
          count: overMatches.length,
          percentage: this.baseStats.percentage(overMatches.length, matches.length),
        };

        // Also calculate under
        const underKey = `under${threshold.toString().replace('.', '_')}`;
        stats[underKey] = {
          count: matches.length - overMatches.length,
          percentage: this.baseStats.percentage(
            matches.length - overMatches.length,
            matches.length
          ),
        };
      });

      return stats;
    }

    /**
     * Calculate team cards over thresholds
     */
    calculateTeamCardsOver(matches, teamId) {
      if (!teamId) return {};

      const stats = {};
      const thresholds = [0.5, 1.5, 2.5, 3.5];

      thresholds.forEach(threshold => {
        const key = `over${threshold.toString().replace('.', '_')}`;
        const overMatches = matches.filter(match => {
          const isHome = String(match.homeTeamId || match.home_team_id) === String(teamId);
          const teamCards = isHome
            ? this.getMatchCards(match, 'home')
            : this.getMatchCards(match, 'away');
          return teamCards > threshold;
        });

        stats[key] = {
          count: overMatches.length,
          percentage: this.baseStats.percentage(overMatches.length, matches.length),
        };
      });

      return stats;
    }

    /**
     * Calculate opponent cards over thresholds
     */
    calculateOpponentCardsOver(matches, teamId) {
      if (!teamId) return {};

      const stats = {};
      const thresholds = [0.5, 1.5, 2.5, 3.5];

      thresholds.forEach(threshold => {
        const key = `over${threshold.toString().replace('.', '_')}`;
        const overMatches = matches.filter(match => {
          const isHome = String(match.homeTeamId || match.home_team_id) === String(teamId);
          const opponentCards = isHome
            ? this.getMatchCards(match, 'away')
            : this.getMatchCards(match, 'home');
          return opponentCards > threshold;
        });

        stats[key] = {
          count: overMatches.length,
          percentage: this.baseStats.percentage(overMatches.length, matches.length),
        };
      });

      return stats;
    }

    /**
     * Calculate card timing distribution
     */
    calculateCardTiming(matches) {
      const distribution = {};

      // Initialize intervals
      this.timeIntervals.forEach(interval => {
        distribution[interval.label] = {
          cards: 0,
          percentage: 0,
          yellows: 0,
          reds: 0,
        };
      });

      // Count cards by interval
      let totalCardsWithTiming = 0;

      matches.forEach(match => {
        if (match.cardTimings && Array.isArray(match.cardTimings)) {
          match.cardTimings.forEach(card => {
            const minute = parseInt(card.minute || card.time);
            const type = card.type || 'yellow';
            const interval = this.timeIntervals.find(
              int => minute >= int.start && minute <= int.end
            );

            if (interval) {
              distribution[interval.label].cards++;
              if (type === 'yellow') {
                distribution[interval.label].yellows++;
              } else if (type === 'red') {
                distribution[interval.label].reds++;
              }
              totalCardsWithTiming++;
            }
          });
        }
      });

      // Calculate percentages
      if (totalCardsWithTiming > 0) {
        Object.keys(distribution).forEach(key => {
          distribution[key].percentage = this.baseStats.percentage(
            distribution[key].cards,
            totalCardsWithTiming
          );
        });
      }

      return distribution;
    }

    /**
     * Calculate booking patterns
     */
    calculateBookingPatterns(matches, teamId) {
      if (!teamId) return this.getEmptyBookingPatterns();

      const patterns = {
        firstCard: 0,
        multipleCards: 0,
        redCards: 0,
        cleanGames: 0,
        cardStreak: 0,
        currentStreak: 0,
        highestStreak: 0,
        avgMinuteFirstCard: 0,
        mostCommonInterval: '',
        cardsByResult: {
          wins: { total: 0, avg: 0, count: 0 },
          draws: { total: 0, avg: 0, count: 0 },
          losses: { total: 0, avg: 0, count: 0 },
        },
      };

      let currentCardStreak = 0;
      let firstCardMinutes = [];

      matches.forEach(match => {
        const isHome = String(match.homeTeamId || match.home_team_id) === String(teamId);
        const teamCards = isHome
          ? this.getMatchCards(match, 'home')
          : this.getMatchCards(match, 'away');

        // Card streaks
        if (teamCards > 0) {
          currentCardStreak++;
          patterns.highestStreak = Math.max(patterns.highestStreak, currentCardStreak);

          // Multiple cards in a match
          if (teamCards > 1) {
            patterns.multipleCards++;
          }

          // First card timing
          if (match.cardTimings && match.cardTimings.length > 0) {
            const teamCardTimings = match.cardTimings.filter(card => {
              return (isHome && card.team === 'home') || (!isHome && card.team === 'away');
            });
            if (teamCardTimings.length > 0) {
              firstCardMinutes.push(parseInt(teamCardTimings[0].minute || 0));
            }
          }
        } else {
          currentCardStreak = 0;
          patterns.cleanGames++;
        }

        // Red cards
        const redCards = isHome
          ? parseInt(match.homeRedCards || match.home_red_cards || 0)
          : parseInt(match.awayRedCards || match.away_red_cards || 0);
        if (redCards > 0) {
          patterns.redCards += redCards;
        }

        // Cards by result
        const goalsFor = isHome
          ? parseInt(match.homeGoals || match.home_goals || 0)
          : parseInt(match.awayGoals || match.away_goals || 0);
        const goalsAgainst = isHome
          ? parseInt(match.awayGoals || match.away_goals || 0)
          : parseInt(match.homeGoals || match.home_goals || 0);

        if (goalsFor > goalsAgainst) {
          patterns.cardsByResult.wins.total += teamCards;
          patterns.cardsByResult.wins.count++;
        } else if (goalsFor < goalsAgainst) {
          patterns.cardsByResult.losses.total += teamCards;
          patterns.cardsByResult.losses.count++;
        } else {
          patterns.cardsByResult.draws.total += teamCards;
          patterns.cardsByResult.draws.count++;
        }
      });

      patterns.currentStreak = currentCardStreak;

      // Calculate averages
      if (firstCardMinutes.length > 0) {
        patterns.avgMinuteFirstCard = this.baseStats.average(firstCardMinutes, 1);
      }

      // Cards by result averages
      ['wins', 'draws', 'losses'].forEach(result => {
        if (patterns.cardsByResult[result].count > 0) {
          patterns.cardsByResult[result].avg = this.baseStats.divide(
            patterns.cardsByResult[result].total,
            patterns.cardsByResult[result].count
          );
        }
      });

      return patterns;
    }

    /**
     * Calculate referee statistics
     */
    calculateRefereeStats(matches) {
      const refereeMap = {};

      matches.forEach(match => {
        const referee = match.referee || match.refereeName || 'Unknown';
        const totalCards = this.getMatchCards(match, 'home') + this.getMatchCards(match, 'away');

        if (!refereeMap[referee]) {
          refereeMap[referee] = {
            matches: 0,
            totalCards: 0,
            avgCards: 0,
            highestCards: 0,
          };
        }

        refereeMap[referee].matches++;
        refereeMap[referee].totalCards += totalCards;
        refereeMap[referee].highestCards = Math.max(refereeMap[referee].highestCards, totalCards);
      });

      // Calculate averages and convert to array
      const refereeStats = Object.entries(refereeMap)
        .map(([referee, stats]) => ({
          referee,
          ...stats,
          avgCards: this.baseStats.divide(stats.totalCards, stats.matches),
        }))
        .sort((a, b) => b.avgCards - a.avgCards)
        .slice(0, 10); // Top 10 referees by avg cards

      return refereeStats;
    }

    /**
     * Get high card matches
     */
    getHighCardMatches(matches, limit = 5) {
      return matches
        .map(match => ({
          ...match,
          totalCards: this.getMatchCards(match, 'home') + this.getMatchCards(match, 'away'),
        }))
        .sort((a, b) => b.totalCards - a.totalCards)
        .slice(0, limit)
        .map(match => ({
          date: match.date || match.matchDate,
          homeTeam: match.homeTeamName || match.home_team,
          awayTeam: match.awayTeamName || match.away_team,
          homeCards: this.getMatchCards(match, 'home'),
          awayCards: this.getMatchCards(match, 'away'),
          totalCards: match.totalCards,
          referee: match.referee || match.refereeName || 'Unknown',
        }));
    }

    /**
     * Calculate card form (last 5 matches)
     */
    calculateCardForm(matches, teamId) {
      const last5 = this.baseStats.getLastNMatches(matches, 5);

      return {
        matches: last5.length,
        cardsFor: this.calculateCardsFor(last5, teamId),
        cardsAgainst: this.calculateCardsAgainst(last5, teamId),
        avgCardsFor:
          last5.length > 0
            ? this.baseStats.divide(this.calculateCardsFor(last5, teamId), last5.length)
            : 0,
        avgCardsAgainst:
          last5.length > 0
            ? this.baseStats.divide(this.calculateCardsAgainst(last5, teamId), last5.length)
            : 0,
        cleanGames: last5.filter(match => {
          const isHome = String(match.homeTeamId || match.home_team_id) === String(teamId);
          const teamCards = isHome
            ? this.getMatchCards(match, 'home')
            : this.getMatchCards(match, 'away');
          return teamCards === 0;
        }).length,
      };
    }

    /**
     * Calculate card trend
     */
    calculateCardTrend(matches, teamId) {
      if (matches.length < 10) {
        return { trend: 'neutral', confidence: 'low' };
      }

      const cardsPerMatch = matches.map(match => {
        const isHome = String(match.homeTeamId || match.home_team_id) === String(teamId);
        return isHome ? this.getMatchCards(match, 'home') : this.getMatchCards(match, 'away');
      });

      const trend = this.baseStats.calculateTrend(cardsPerMatch);
      const confidence = matches.length >= 20 ? 'high' : 'medium';

      return { trend, confidence };
    }

    /**
     * Calculate disciplinary record
     */
    calculateDisciplinaryRecord(matches, teamId) {
      if (!teamId) return this.getEmptyDisciplinaryRecord();

      const yellowCards = this.calculateCardsByType(matches, this.cardTypes.YELLOW, teamId);
      const redCards = this.calculateCardsByType(matches, this.cardTypes.RED, teamId);

      return {
        totalCards: yellowCards.for + redCards.for,
        yellowCards: yellowCards.for,
        redCards: redCards.for,
        avgCardsPerMatch:
          matches.length > 0
            ? this.baseStats.divide(yellowCards.for + redCards.for, matches.length)
            : 0,
        fairPlayScore: this.calculateFairPlayScore(yellowCards.for, redCards.for, matches.length),
        suspensionRisk: this.calculateSuspensionRisk(yellowCards.for, redCards.for, matches.length),
      };
    }

    /**
     * Calculate fair play score (lower is better)
     */
    calculateFairPlayScore(yellows, reds, matches) {
      if (matches === 0) return 0;
      // Yellow = 1 point, Red = 3 points
      const points = yellows + reds * 3;
      return this.baseStats.round(points / matches, 2);
    }

    /**
     * Calculate suspension risk
     */
    calculateSuspensionRisk(yellows, reds, matches) {
      if (matches === 0) return 'low';

      const avgYellowsPerMatch = yellows / matches;
      const avgRedsPerMatch = reds / matches;

      if (avgRedsPerMatch > 0.1 || avgYellowsPerMatch > 2) {
        return 'high';
      } else if (avgRedsPerMatch > 0.05 || avgYellowsPerMatch > 1.5) {
        return 'medium';
      }
      return 'low';
    }

    /**
     * Get empty statistics object
     */
    getEmptyStatistics() {
      return {
        matches: 0,
        totalCards: 0,
        cardsFor: 0,
        cardsAgainst: 0,
        yellowCards: { for: 0, against: 0, total: 0 },
        redCards: { for: 0, against: 0, total: 0 },
        avgCardsFor: 0,
        avgCardsAgainst: 0,
        avgTotalCards: 0,
        firstHalfCards: 0,
        secondHalfCards: 0,
        overUnder: {},
        teamCardsOver: {},
        opponentCardsOver: {},
        cardTiming: {},
        bookingPatterns: this.getEmptyBookingPatterns(),
        refereeStats: [],
        highCardMatches: [],
        form: {},
        trend: { trend: 'neutral', confidence: 'low' },
        disciplinaryRecord: this.getEmptyDisciplinaryRecord(),
      };
    }

    /**
     * Get empty booking patterns object
     */
    getEmptyBookingPatterns() {
      return {
        firstCard: 0,
        multipleCards: 0,
        redCards: 0,
        cleanGames: 0,
        cardStreak: 0,
        currentStreak: 0,
        highestStreak: 0,
        avgMinuteFirstCard: 0,
        mostCommonInterval: '',
        cardsByResult: {
          wins: { total: 0, avg: 0, count: 0 },
          draws: { total: 0, avg: 0, count: 0 },
          losses: { total: 0, avg: 0, count: 0 },
        },
      };
    }

    /**
     * Get empty disciplinary record
     */
    getEmptyDisciplinaryRecord() {
      return {
        totalCards: 0,
        yellowCards: 0,
        redCards: 0,
        avgCardsPerMatch: 0,
        fairPlayScore: 0,
        suspensionRisk: 'low',
      };
    }

    /**
     * Get performance metrics
     */
    getMetrics() {
      return {
        ...this.metrics,
        uptime: Date.now() - this.metrics.startTime,
        avgCalculationTime:
          this.metrics.calculations > 0
            ? this.baseStats.round(this.metrics.totalTime / this.metrics.calculations, 3)
            : 0,
      };
    }
  }

  // Export
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = CardsStatistics;
  } else {
    global.TeamStatsCardsStatistics = new CardsStatistics();
  }
})(typeof window !== 'undefined' ? window : this);
