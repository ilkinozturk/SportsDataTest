/**
 * Core Utils Module
 * Common utility functions for the team stats application
 */

(function (global) {
  'use strict';

  const CoreUtils = {
    initialized: false,

    init() {
      if (this.initialized) return;

      this.initialized = true;
      console.log('[CoreUtils] Initialized');
    },

    // String utilities
    capitalize(str) {
      if (!str) return '';
      return str.charAt(0).toUpperCase() + str.slice(1);
    },

    camelCase(str) {
      return str.replace(/[-_\s]+(.)?/g, (_, c) => (c ? c.toUpperCase() : ''));
    },

    kebabCase(str) {
      return str.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`);
    },

    truncate(str, length = 50) {
      if (!str || str.length <= length) return str;
      return str.substring(0, length) + '...';
    },

    // Number utilities
    formatNumber(num, decimals = 2) {
      if (typeof num !== 'number') return '0';
      return num.toFixed(decimals);
    },

    formatPercentage(num, decimals = 1) {
      if (typeof num !== 'number') return '0%';
      return `${num.toFixed(decimals)}%`;
    },

    clamp(value, min, max) {
      return Math.max(min, Math.min(max, value));
    },

    // Date utilities
    formatDate(date, format = 'short') {
      if (!date) return '';

      const d = new Date(date);

      switch (format) {
        case 'short':
          return d.toLocaleDateString();
        case 'long':
          return d.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          });
        case 'time':
          return d.toLocaleTimeString();
        case 'datetime':
          return d.toLocaleString();
        default:
          return d.toLocaleDateString();
      }
    },

    getTimeAgo(date) {
      const now = new Date();
      const past = new Date(date);
      const diff = now - past;

      const seconds = Math.floor(diff / 1000);
      const minutes = Math.floor(seconds / 60);
      const hours = Math.floor(minutes / 60);
      const days = Math.floor(hours / 24);

      if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
      if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
      if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
      return 'Just now';
    },

    // Array utilities
    unique(array) {
      return [...new Set(array)];
    },

    groupBy(array, key) {
      return array.reduce((groups, item) => {
        const group = item[key];
        groups[group] = groups[group] || [];
        groups[group].push(item);
        return groups;
      }, {});
    },

    sortBy(array, key, direction = 'asc') {
      return [...array].sort((a, b) => {
        const aVal = a[key];
        const bVal = b[key];

        if (direction === 'desc') {
          return bVal > aVal ? 1 : bVal < aVal ? -1 : 0;
        }
        return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
      });
    },

    // Object utilities
    deepMerge(target, source) {
      const result = { ...target };

      for (const key in source) {
        if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
          result[key] = this.deepMerge(result[key] || {}, source[key]);
        } else {
          result[key] = source[key];
        }
      }

      return result;
    },

    pick(obj, keys) {
      const result = {};
      keys.forEach(key => {
        if (key in obj) {
          result[key] = obj[key];
        }
      });
      return result;
    },

    omit(obj, keys) {
      const result = { ...obj };
      keys.forEach(key => {
        delete result[key];
      });
      return result;
    },

    // Validation utilities
    isValidEmail(email) {
      const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return regex.test(email);
    },

    isValidUrl(url) {
      try {
        new URL(url);
        return true;
      } catch {
        return false;
      }
    },

    isEmpty(value) {
      if (value == null) return true;
      if (typeof value === 'string') return value.trim() === '';
      if (Array.isArray(value)) return value.length === 0;
      if (typeof value === 'object') return Object.keys(value).length === 0;
      return false;
    },

    // DOM utilities
    createElement(tag, attributes = {}, children = []) {
      const element = document.createElement(tag);

      Object.entries(attributes).forEach(([key, value]) => {
        if (key === 'className') {
          element.className = value;
        } else if (key === 'textContent') {
          element.textContent = value;
        } else if (key === 'innerHTML') {
          element.innerHTML = value;
        } else {
          element.setAttribute(key, value);
        }
      });

      children.forEach(child => {
        if (typeof child === 'string') {
          element.appendChild(document.createTextNode(child));
        } else {
          element.appendChild(child);
        }
      });

      return element;
    },

    findElement(selector, context = document) {
      return context.querySelector(selector);
    },

    findElements(selector, context = document) {
      return Array.from(context.querySelectorAll(selector));
    },

    // Storage utilities
    setStorage(key, value, type = 'localStorage') {
      try {
        const storage = type === 'localStorage' ? localStorage : sessionStorage;
        storage.setItem(key, JSON.stringify(value));
        return true;
      } catch (error) {
        console.warn('[CoreUtils] Storage failed:', error);
        return false;
      }
    },

    getStorage(key, defaultValue = null, type = 'localStorage') {
      try {
        const storage = type === 'localStorage' ? localStorage : sessionStorage;
        const value = storage.getItem(key);
        return value ? JSON.parse(value) : defaultValue;
      } catch (error) {
        console.warn('[CoreUtils] Storage retrieval failed:', error);
        return defaultValue;
      }
    },

    removeStorage(key, type = 'localStorage') {
      try {
        const storage = type === 'localStorage' ? localStorage : sessionStorage;
        storage.removeItem(key);
        return true;
      } catch (error) {
        console.warn('[CoreUtils] Storage removal failed:', error);
        return false;
      }
    },

    // Async utilities
    delay(ms) {
      return new Promise(resolve => setTimeout(resolve, ms));
    },

    debounce(func, wait) {
      let timeout;
      return function executedFunction(...args) {
        const later = () => {
          clearTimeout(timeout);
          func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
      };
    },

    throttle(func, limit) {
      let inThrottle;
      return function (...args) {
        if (!inThrottle) {
          func.apply(this, args);
          inThrottle = true;
          setTimeout(() => (inThrottle = false), limit);
        }
      };
    },

    // Random utilities
    generateId(prefix = 'id') {
      return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    },

    randomColor() {
      return `#${Math.floor(Math.random() * 16777215).toString(16)}`;
    },

    // Color utilities
    hexToRgb(hex) {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result
        ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16),
          }
        : null;
    },

    rgbToHex(r, g, b) {
      return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
    },
  };

  // Global registration
  global.TeamStatsCoreUtils = CoreUtils;

  // Auto-initialize
  CoreUtils.init();
})(window);
