/**
 * FormDisplay - Manages form display and visualization
 */
export class FormDisplay {
  constructor() {
    this.formSymbols = {
      'W': { symbol: 'W', class: 'form-win' },
      'D': { symbol: 'D', class: 'form-draw' },
      'L': { symbol: 'L', class: 'form-loss' }
    };
  }

  /**
   * Update form display for an element
   * @param {string} elementId - The element ID
   * @param {Array} formArray - Array of form results
   */
  update(elementId, formArray) {
    const element = document.getElementById(elementId);
    if (!element || !formArray || !Array.isArray(formArray)) {
      return;
    }

    // Clear existing content
    element.innerHTML = '';

    // Add form items
    formArray.forEach(result => {
      const formData = this.formSymbols[result];
      if (formData) {
        const span = document.createElement('span');
        span.className = `form-item ${formData.class}`;
        span.textContent = formData.symbol;
        element.appendChild(span);
      }
    });
  }

  /**
   * Update multiple form displays
   * @param {Object} forms - Object with elementId as key and formArray as value
   */
  updateMultiple(forms) {
    Object.entries(forms).forEach(([elementId, formArray]) => {
      this.update(elementId, formArray);
    });
  }

  /**
   * Calculate form statistics
   * @param {Array} formArray - Array of form results
   * @returns {Object} Form statistics
   */
  calculateStats(formArray) {
    if (!formArray || !Array.isArray(formArray)) {
      return { wins: 0, draws: 0, losses: 0, points: 0, percentage: 0 };
    }

    const stats = {
      wins: formArray.filter(r => r === 'W').length,
      draws: formArray.filter(r => r === 'D').length,
      losses: formArray.filter(r => r === 'L').length,
      total: formArray.length
    };

    stats.points = (stats.wins * 3) + stats.draws;
    stats.maxPoints = stats.total * 3;
    stats.percentage = stats.maxPoints > 0 ? 
      Math.round((stats.points / stats.maxPoints) * 100) : 0;

    return stats;
  }

  /**
   * Get form trend (improving, declining, stable)
   * @param {Array} formArray - Array of form results
   * @returns {string} Trend indicator
   */
  getTrend(formArray) {
    if (!formArray || formArray.length < 3) {
      return 'stable';
    }

    // Calculate points for first half and second half
    const midPoint = Math.floor(formArray.length / 2);
    const firstHalf = formArray.slice(0, midPoint);
    const secondHalf = formArray.slice(midPoint);

    const firstHalfPoints = this.calculateStats(firstHalf).percentage;
    const secondHalfPoints = this.calculateStats(secondHalf).percentage;

    const difference = secondHalfPoints - firstHalfPoints;

    if (difference > 10) return 'improving';
    if (difference < -10) return 'declining';
    return 'stable';
  }

  /**
   * Create form visualization chart
   * @param {string} elementId - The element ID
   * @param {Array} formArray - Array of form results
   * @param {Object} options - Visualization options
   */
  createChart(elementId, formArray, options = {}) {
    const element = document.getElementById(elementId);
    if (!element || !formArray || !Array.isArray(formArray)) {
      return;
    }

    const defaults = {
      width: 300,
      height: 50,
      barWidth: 15,
      barGap: 5,
      colors: {
        win: '#4ade80',
        draw: '#fbbf24',
        loss: '#f87171'
      }
    };

    const settings = { ...defaults, ...options };

    // Create SVG
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', settings.width);
    svg.setAttribute('height', settings.height);
    svg.setAttribute('viewBox', `0 0 ${settings.width} ${settings.height}`);

    // Add bars for each result
    formArray.slice(-10).forEach((result, index) => {
      const x = index * (settings.barWidth + settings.barGap);
      const height = result === 'W' ? settings.height : 
                    result === 'D' ? settings.height * 0.6 : 
                    settings.height * 0.3;
      const y = settings.height - height;
      const color = result === 'W' ? settings.colors.win :
                   result === 'D' ? settings.colors.draw :
                   settings.colors.loss;

      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('x', x);
      rect.setAttribute('y', y);
      rect.setAttribute('width', settings.barWidth);
      rect.setAttribute('height', height);
      rect.setAttribute('fill', color);
      rect.setAttribute('rx', '2');

      svg.appendChild(rect);
    });

    element.innerHTML = '';
    element.appendChild(svg);
  }

  /**
   * Get form string representation
   * @param {Array} formArray - Array of form results
   * @param {number} limit - Maximum number of results to show
   * @returns {string} Form string
   */
  toString(formArray, limit = 5) {
    if (!formArray || !Array.isArray(formArray)) {
      return '';
    }

    return formArray.slice(-limit).join('-');
  }

  /**
   * Compare two forms
   * @param {Array} form1 - First form array
   * @param {Array} form2 - Second form array
   * @returns {Object} Comparison result
   */
  compare(form1, form2) {
    const stats1 = this.calculateStats(form1);
    const stats2 = this.calculateStats(form2);

    return {
      better: stats1.percentage > stats2.percentage ? 1 : 
              stats2.percentage > stats1.percentage ? 2 : 0,
      difference: Math.abs(stats1.percentage - stats2.percentage),
      stats1,
      stats2
    };
  }
}

// Create singleton instance
const formDisplay = new FormDisplay();

// Export singleton
export default formDisplay;