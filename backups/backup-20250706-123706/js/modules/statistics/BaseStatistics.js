/**
 * BaseStatistics - Base class for all statistics modules
 * Provides common functionality for updating elements and handling filters
 */
export class BaseStatistics {
  constructor(filterManager) {
    this.filterManager = filterManager;
    this.statistics = null;
    this.listeners = [];
    this.domRefs = new WeakMap();
    this.eventHandlers = new Map();
    this.timers = new Set();
    this.destroyed = false;
  }

  /**
   * Update statistics data
   * @param {Object} statistics - Statistics data object
   */
  setStatistics(statistics) {
    this.statistics = statistics;
  }

  /**
   * Update DOM element with text content
   * @param {string} elementId - The element ID
   * @param {string|number} value - The value to display
   * @param {Object} options - Optional formatting options
   */
  updateElement(elementId, value, options = {}) {
    const element = document.getElementById(elementId);
    if (!element) return;

    // Handle different value types
    if (value === null || value === undefined) {
      element.textContent = options.defaultValue || '0';
      return;
    }

    // Format value based on options
    let formattedValue = value;
    
    if (options.isPercentage) {
      formattedValue = this.formatPercentage(value);
    } else if (options.isDecimal) {
      formattedValue = this.formatDecimal(value, options.decimals || 2);
    } else if (options.prefix) {
      formattedValue = `${options.prefix}${value}`;
    } else if (options.suffix) {
      formattedValue = `${value}${options.suffix}`;
    }

    element.textContent = formattedValue;
  }

  /**
   * Update multiple elements at once
   * @param {Object} updates - Object with elementId as key and value as value
   * @param {Object} options - Optional formatting options for all elements
   */
  updateElements(updates, options = {}) {
    Object.entries(updates).forEach(([elementId, value]) => {
      this.updateElement(elementId, value, options);
    });
  }

  /**
   * Get filtered value based on current filter
   * @param {string} baseKey - Base statistics key
   * @param {string} filterSection - Filter section name
   * @returns {any} The filtered value
   */
  getFilteredValue(baseKey, filterSection = 'current') {
    if (!this.statistics) return null;

    const filter = this.filterManager.getFilter(filterSection);
    
    // Build the key based on filter
    let key = baseKey;
    if (filter !== 'overall') {
      // Check for different naming patterns
      const patterns = [
        `${baseKey}_${filter}`,           // e.g., goalsScored_home
        `${filter}${this.capitalize(baseKey)}`, // e.g., homeGoalsScored
        `${baseKey}${this.capitalize(filter)}`, // e.g., goalsScoredHome
      ];

      for (const pattern of patterns) {
        if (this.statistics.hasOwnProperty(pattern)) {
          key = pattern;
          break;
        }
      }
    }

    return this.statistics[key];
  }

  /**
   * Get multiple filtered values
   * @param {Array} keys - Array of base keys
   * @param {string} filterSection - Filter section name
   * @returns {Object} Object with keys and their filtered values
   */
  getFilteredValues(keys, filterSection = 'current') {
    const result = {};
    keys.forEach(key => {
      result[key] = this.getFilteredValue(key, filterSection);
    });
    return result;
  }

  /**
   * Format percentage value
   * @param {number} value - The percentage value
   * @returns {string} Formatted percentage
   */
  formatPercentage(value) {
    if (value === null || value === undefined || isNaN(value)) {
      return '0%';
    }
    return `${Math.round(value)}%`;
  }

  /**
   * Format decimal value
   * @param {number} value - The decimal value
   * @param {number} decimals - Number of decimal places
   * @returns {string} Formatted decimal
   */
  formatDecimal(value, decimals = 2) {
    if (value === null || value === undefined || isNaN(value)) {
      return '0.00';
    }
    return Number(value).toFixed(decimals);
  }

  /**
   * Capitalize first letter
   * @param {string} str - String to capitalize
   * @returns {string} Capitalized string
   */
  capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  /**
   * Calculate percentage
   * @param {number} value - The value
   * @param {number} total - The total
   * @returns {number} Percentage
   */
  calculatePercentage(value, total) {
    if (!total || total === 0) return 0;
    return Math.round((value / total) * 100);
  }

  /**
   * Update progress bar
   * @param {string} elementId - The element ID
   * @param {number} percentage - The percentage (0-100)
   * @param {Object} options - Optional styling options
   */
  updateProgressBar(elementId, percentage, options = {}) {
    const element = document.getElementById(elementId);
    if (!element) return;

    // Ensure percentage is between 0 and 100
    const clampedPercentage = Math.max(0, Math.min(100, percentage));
    
    // Update width
    element.style.width = `${clampedPercentage}%`;
    
    // Update background color if provided
    if (options.color) {
      element.style.backgroundColor = options.color;
    }
    
    // Update text if element has text content
    if (options.showText) {
      const textElement = element.querySelector('.progress-text') || element;
      textElement.textContent = `${clampedPercentage}%`;
    }
  }

  /**
   * Show/hide element
   * @param {string} elementId - The element ID
   * @param {boolean} show - Whether to show or hide
   */
  toggleElement(elementId, show) {
    const element = document.getElementById(elementId);
    if (element) {
      element.style.display = show ? 'block' : 'none';
    }
  }

  /**
   * Add/remove CSS class
   * @param {string} elementId - The element ID
   * @param {string} className - The class name
   * @param {boolean} add - Whether to add or remove
   */
  toggleClass(elementId, className, add) {
    const element = document.getElementById(elementId);
    if (element) {
      if (add) {
        element.classList.add(className);
      } else {
        element.classList.remove(className);
      }
    }
  }

  /**
   * Safe divide operation
   * @param {number} numerator - The numerator
   * @param {number} denominator - The denominator
   * @param {number} decimals - Number of decimal places
   * @returns {number} Result or 0 if denominator is 0
   */
  safeDivide(numerator, denominator, decimals = 2) {
    if (!denominator || denominator === 0) return 0;
    const result = numerator / denominator;
    return decimals ? Number(result.toFixed(decimals)) : result;
  }

  /**
   * Get value with fallback
   * @param {any} value - The value
   * @param {any} fallback - The fallback value
   * @returns {any} Value or fallback
   */
  getValueOrFallback(value, fallback = 0) {
    return value !== null && value !== undefined ? value : fallback;
  }

  /**
   * Format match count
   * @param {number} count - Match count
   * @returns {string} Formatted match count
   */
  formatMatchCount(count) {
    if (!count || count === 0) return '0 matches';
    return count === 1 ? '1 match' : `${count} matches`;
  }

  /**
   * Get color based on percentage
   * @param {number} percentage - The percentage
   * @param {Object} thresholds - Color thresholds
   * @returns {string} Color value
   */
  getColorByPercentage(percentage, thresholds = {}) {
    const defaultThresholds = {
      high: { value: 70, color: '#4ade80' },     // green
      medium: { value: 40, color: '#fbbf24' },   // yellow
      low: { value: 0, color: '#f87171' }        // red
    };
    
    const t = { ...defaultThresholds, ...thresholds };
    
    if (percentage >= t.high.value) return t.high.color;
    if (percentage >= t.medium.value) return t.medium.color;
    return t.low.color;
  }

  /**
   * Update element with comparison
   * @param {string} elementId - The element ID
   * @param {number} value - Current value
   * @param {number} compareValue - Value to compare against
   * @param {Object} options - Comparison options
   */
  updateWithComparison(elementId, value, compareValue, options = {}) {
    const element = document.getElementById(elementId);
    if (!element) return;

    // Update value
    element.textContent = value;

    // Add comparison indicator
    if (compareValue !== null && compareValue !== undefined) {
      const diff = value - compareValue;
      const indicator = diff > 0 ? '↑' : diff < 0 ? '↓' : '=';
      const color = diff > 0 ? '#4ade80' : diff < 0 ? '#f87171' : '#94a3b8';
      
      if (options.showIndicator) {
        element.innerHTML = `${value} <span style="color: ${color}">${indicator}</span>`;
      }
      
      if (options.showDiff) {
        element.innerHTML = `${value} <span style="color: ${color}">(${diff > 0 ? '+' : ''}${diff})</span>`;
      }
    }
  }

  /**
   * Add event listener with cleanup tracking
   * @param {HTMLElement} element - Target element
   * @param {string} event - Event type
   * @param {Function} handler - Event handler
   * @param {Object} options - Event options
   */
  addEventListener(element, event, handler, options = {}) {
    if (!element || this.destroyed) return;
    
    element.addEventListener(event, handler, options);
    
    // Track for cleanup
    const key = `${event}-${handler.toString()}`;
    if (!this.eventHandlers.has(element)) {
      this.eventHandlers.set(element, new Map());
    }
    this.eventHandlers.get(element).set(key, { event, handler, options });
  }

  /**
   * Set timeout with cleanup tracking
   * @param {Function} callback - Callback function
   * @param {number} delay - Delay in ms
   * @returns {number} Timer ID
   */
  setTimeout(callback, delay) {
    if (this.destroyed) return null;
    
    const timerId = setTimeout(() => {
      this.timers.delete(timerId);
      if (!this.destroyed) {
        callback();
      }
    }, delay);
    
    this.timers.add(timerId);
    return timerId;
  }

  /**
   * Set interval with cleanup tracking
   * @param {Function} callback - Callback function
   * @param {number} delay - Delay in ms
   * @returns {number} Timer ID
   */
  setInterval(callback, delay) {
    if (this.destroyed) return null;
    
    const timerId = setInterval(() => {
      if (this.destroyed) {
        clearInterval(timerId);
        this.timers.delete(timerId);
      } else {
        callback();
      }
    }, delay);
    
    this.timers.add(timerId);
    return timerId;
  }

  /**
   * Clear timer
   * @param {number} timerId - Timer ID
   */
  clearTimer(timerId) {
    if (timerId) {
      clearTimeout(timerId);
      clearInterval(timerId);
      this.timers.delete(timerId);
    }
  }

  /**
   * Store DOM reference
   * @param {string} key - Reference key
   * @param {HTMLElement} element - DOM element
   */
  setDOMRef(key, element) {
    if (element && !this.destroyed) {
      this.domRefs.set(key, element);
    }
  }

  /**
   * Get DOM reference
   * @param {string} key - Reference key
   * @returns {HTMLElement|null} DOM element
   */
  getDOMRef(key) {
    return this.domRefs.get(key) || null;
  }

  /**
   * Cleanup all resources
   */
  destroy() {
    if (this.destroyed) return;
    
    this.destroyed = true;
    
    // Clear all timers
    this.timers.forEach(timerId => {
      clearTimeout(timerId);
      clearInterval(timerId);
    });
    this.timers.clear();
    
    // Remove all event listeners
    this.eventHandlers.forEach((handlers, element) => {
      handlers.forEach(({ event, handler, options }) => {
        element.removeEventListener(event, handler, options);
      });
    });
    this.eventHandlers.clear();
    
    // Clear listener subscriptions
    this.listeners.forEach(unsubscribe => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    });
    this.listeners = [];
    
    // Clear data references
    this.statistics = null;
    this.filterManager = null;
    
    // Clear DOM references (WeakMap will auto cleanup)
    this.domRefs = new WeakMap();
    
    console.log(`${this.constructor.name} destroyed and cleaned up`);
  }
}