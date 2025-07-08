/**
 * Form Prediction Module
 * Calculates win probability based on recent form (last 5 matches)
 * Uses home/away specific form data for accurate predictions
 */

export class FormPrediction {
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.attachEventListeners();
  }

  attachEventListeners() {
    // Listen for team stats data
    this.eventBus.on('team-stats-loaded', teamData => {
      if (teamData && teamData.homeTeam && teamData.awayTeam) {
        const prediction = this.calculateFormPrediction(teamData);
        this.eventBus.emit('form-prediction-calculated', prediction);
      }
    });
  }

  /**
   * Calculate win probability based on form
   * @param {Object} teamData - Contains home and away team data
   * @returns {Object} Prediction results
   */
  calculateFormPrediction(teamData) {
    const { homeTeam, awayTeam } = teamData;

    // Get form strings
    const homeFormString = homeTeam.homeForm || homeTeam.form || '';
    const awayFormString = awayTeam.awayForm || awayTeam.form || '';

    // Calculate form points
    const homeFormPoints = this.calculateFormPoints(homeFormString);
    const awayFormPoints = this.calculateFormPoints(awayFormString);

    // Calculate form percentages (out of 15 possible points)
    const homeFormPercentage = (homeFormPoints / 15) * 100;
    const awayFormPercentage = (awayFormPoints / 15) * 100;

    // Calculate win probabilities
    let homeWinProbability = 0;
    let awayWinProbability = 0;
    let drawProbability = 0;

    const totalFormPoints = homeFormPercentage + awayFormPercentage;

    if (totalFormPoints > 0) {
      // Base probabilities from form
      homeWinProbability = (homeFormPercentage / totalFormPoints) * 100;
      awayWinProbability = (awayFormPercentage / totalFormPoints) * 100;

      // Apply home advantage factor (10% boost)
      const homeAdvantage = 10;
      homeWinProbability = Math.min(homeWinProbability + homeAdvantage, 100);
      awayWinProbability = Math.max(awayWinProbability - homeAdvantage, 0);

      // Adjust for draw probability based on form similarity
      const formDifference = Math.abs(homeFormPercentage - awayFormPercentage);
      if (formDifference < 20) {
        // Similar form, higher draw chance
        drawProbability = 25 - formDifference * 0.5;
        homeWinProbability = (homeWinProbability * (100 - drawProbability)) / 100;
        awayWinProbability = (awayWinProbability * (100 - drawProbability)) / 100;
      } else {
        // Different form levels, lower draw chance
        drawProbability = 15;
        const remaining = 85;
        const homeShare = homeWinProbability / (homeWinProbability + awayWinProbability);
        homeWinProbability = remaining * homeShare;
        awayWinProbability = remaining * (1 - homeShare);
      }
    } else {
      // No form data, equal chances
      homeWinProbability = 37.5;
      awayWinProbability = 37.5;
      drawProbability = 25;
    }

    // Get match count for form strings
    const homeMatchCount = this.getMatchCount(homeFormString);
    const awayMatchCount = this.getMatchCount(awayFormString);

    // Calculate confidence based on available data
    const confidence = this.calculateConfidence(homeMatchCount, awayMatchCount);

    return {
      homeTeam: {
        name: homeTeam.name,
        form: homeFormString,
        formPoints: homeFormPoints,
        formPercentage: Math.round(homeFormPercentage),
        winProbability: Math.round(homeWinProbability),
        matchCount: homeMatchCount,
      },
      awayTeam: {
        name: awayTeam.name,
        form: awayFormString,
        formPoints: awayFormPoints,
        formPercentage: Math.round(awayFormPercentage),
        winProbability: Math.round(awayWinProbability),
        matchCount: awayMatchCount,
      },
      drawProbability: Math.round(drawProbability),
      confidence: confidence,
      analysis: this.generateAnalysis(
        homeFormPercentage,
        awayFormPercentage,
        homeFormString,
        awayFormString
      ),
    };
  }

  /**
   * Calculate form points from form string
   * @param {string} formString - Form string like "WWDLW" or "W-W-D-L-W"
   * @returns {number} Total points
   */
  calculateFormPoints(formString) {
    if (!formString) {
      return 0;
    }

    // Remove separators and convert to uppercase
    const cleanForm = formString.replace(/[-\s]/g, '').toUpperCase();

    // Take last 5 matches
    const last5 = cleanForm.slice(-5);

    let points = 0;
    for (const result of last5) {
      if (result === 'W') {
        points += 3;
      } else if (result === 'D') {
        points += 1;
      }
      // L = 0 points
    }

    return points;
  }

  /**
   * Get match count from form string
   * @param {string} formString - Form string
   * @returns {number} Number of matches
   */
  getMatchCount(formString) {
    if (!formString) {
      return 0;
    }
    const cleanForm = formString.replace(/[-\s]/g, '');
    return Math.min(cleanForm.length, 5);
  }

  /**
   * Calculate confidence level based on available data
   * @param {number} homeMatchCount - Home team match count
   * @param {number} awayMatchCount - Away team match count
   * @returns {string} Confidence level
   */
  calculateConfidence(homeMatchCount, awayMatchCount) {
    const totalMatches = homeMatchCount + awayMatchCount;

    if (totalMatches >= 10) {
      return 'high';
    }
    if (totalMatches >= 6) {
      return 'medium';
    }
    return 'low';
  }

  /**
   * Generate analysis text
   * @param {number} homeFormPercentage - Home team form percentage
   * @param {number} awayFormPercentage - Away team form percentage
   * @param {string} homeForm - Home team form string
   * @param {string} awayForm - Away team form string
   * @returns {Object} Analysis data
   */
  generateAnalysis(homeFormPercentage, awayFormPercentage, homeForm, awayForm) {
    const formDifference = Math.abs(homeFormPercentage - awayFormPercentage);
    let summary = '';
    const keyFactors = [];

    // Determine match prediction
    if (formDifference < 10) {
      summary = 'Dengeli bir karşılaşma bekleniyor';
      keyFactors.push('Her iki takım da benzer formda');
    } else if (homeFormPercentage > awayFormPercentage) {
      if (formDifference > 30) {
        summary = 'Ev sahibi takım net favori';
        keyFactors.push('Ev sahibi çok daha iyi formda');
      } else {
        summary = 'Ev sahibi takım hafif favori';
        keyFactors.push('Ev sahibi daha iyi formda');
      }
    } else {
      if (formDifference > 30) {
        summary = 'Deplasman takımı net favori';
        keyFactors.push('Deplasman takımı çok daha iyi formda');
      } else {
        summary = 'Deplasman takımı hafif favori';
        keyFactors.push('Deplasman takımı daha iyi formda');
      }
    }

    // Check recent wins
    const homeRecentWins = (homeForm.slice(-3).match(/W/g) || []).length;
    const awayRecentWins = (awayForm.slice(-3).match(/W/g) || []).length;

    if (homeRecentWins >= 2) {
      keyFactors.push('Ev sahibi son maçlarda güçlü');
    }
    if (awayRecentWins >= 2) {
      keyFactors.push('Deplasman takımı son maçlarda güçlü');
    }

    return {
      summary,
      keyFactors,
      formDifference: Math.round(formDifference),
    };
  }
}

export default FormPrediction;
