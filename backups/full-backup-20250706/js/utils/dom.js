/**
 * DOM utility functions
 */

/**
 * Safely set content to an element
 * @param {string} elementId - The element ID
 * @param {string} content - The content to set
 */
export function safeSetContent(elementId, content) {
  const element = document.getElementById(elementId);
  if (element) {
    element.innerHTML = content;
  }
}

/**
 * Update element text content
 * @param {string} elementId - The element ID
 * @param {string} content - The text content
 */
export function updateElementText(elementId, content) {
  const element = document.getElementById(elementId);
  if (element) {
    if (content === null || content === undefined) {
      element.textContent = '0';
    } else if (typeof content === 'number' && !isNaN(content)) {
      // Check if it's a decimal that needs formatting
      if (content % 1 !== 0) {
        element.textContent = content.toFixed(2);
      } else {
        element.textContent = content.toString();
      }
    } else {
      element.textContent = content.toString();
    }
  }
}

/**
 * Show or hide an element
 * @param {string} elementId - The element ID
 * @param {boolean} show - Whether to show or hide
 */
export function toggleElement(elementId, show) {
  const element = document.getElementById(elementId);
  if (element) {
    element.style.display = show ? 'block' : 'none';
  }
}

/**
 * Add or remove a CSS class
 * @param {string} elementId - The element ID
 * @param {string} className - The class name
 * @param {boolean} add - Whether to add or remove
 */
export function toggleClass(elementId, className, add) {
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
 * Get element by ID
 * @param {string} elementId - The element ID
 * @returns {HTMLElement|null} The element or null
 */
export function getElement(elementId) {
  return document.getElementById(elementId);
}

/**
 * Query selector
 * @param {string} selector - CSS selector
 * @returns {HTMLElement|null} The element or null
 */
export function querySelector(selector) {
  return document.querySelector(selector);
}

/**
 * Query selector all
 * @param {string} selector - CSS selector
 * @returns {NodeList} List of elements
 */
export function querySelectorAll(selector) {
  return document.querySelectorAll(selector);
}

/**
 * Create element with attributes
 * @param {string} tag - HTML tag
 * @param {Object} attributes - Attributes object
 * @param {string} content - Inner content
 * @returns {HTMLElement} Created element
 */
export function createElement(tag, attributes = {}, content = '') {
  const element = document.createElement(tag);
  
  Object.entries(attributes).forEach(([key, value]) => {
    if (key === 'className') {
      element.className = value;
    } else if (key === 'style' && typeof value === 'object') {
      Object.assign(element.style, value);
    } else {
      element.setAttribute(key, value);
    }
  });
  
  if (content) {
    element.innerHTML = content;
  }
  
  return element;
}

/**
 * Add event listener with delegation support
 * @param {string|HTMLElement} target - Element or selector
 * @param {string} event - Event type
 * @param {Function} handler - Event handler
 * @param {string} delegateSelector - Optional delegate selector
 */
export function addEvent(target, event, handler, delegateSelector = null) {
  const element = typeof target === 'string' ? document.querySelector(target) : target;
  
  if (!element) return;
  
  if (delegateSelector) {
    element.addEventListener(event, (e) => {
      const delegateTarget = e.target.closest(delegateSelector);
      if (delegateTarget && element.contains(delegateTarget)) {
        handler.call(delegateTarget, e);
      }
    });
  } else {
    element.addEventListener(event, handler);
  }
}

/**
 * Format number with commas
 * @param {number} num - Number to format
 * @returns {string} Formatted number
 */
export function formatNumber(num) {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * Debounce function
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in ms
 * @returns {Function} Debounced function
 */
export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Deep clone object
 * @param {Object} obj - Object to clone
 * @returns {Object} Cloned object
 */
export function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

// Export legacy support
export default {
  safeSetContent,
  updateElementText,
  toggleElement,
  toggleClass,
  getElement,
  querySelector,
  querySelectorAll,
  createElement,
  addEvent,
  formatNumber,
  debounce,
  deepClone
};