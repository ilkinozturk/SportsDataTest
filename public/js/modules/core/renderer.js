/**
 * Core Renderer Module
 * Handles rendering functionality for the team stats application
 */

(function (global) {
  'use strict';

  const Renderer = {
    initialized: false,
    templates: new Map(),
    cache: new Map(),

    init() {
      if (this.initialized) return;

      this.setupDefaultTemplates();

      this.initialized = true;
      console.log('[Renderer] Initialized');
    },

    setupDefaultTemplates() {
      // Default stat item template
      this.registerTemplate(
        'stat-item',
        `
        <div class="stat-item">
          <span class="stat-label">{{label}}</span>
          <span class="stat-value">{{value}}</span>
        </div>
      `
      );

      // Default stat card template
      this.registerTemplate(
        'stat-card',
        `
        <div class="stat-card">
          <h3 class="stat-card-title">{{title}}</h3>
          <div class="stat-card-value">{{value}}</div>
          <div class="stat-card-description">{{description}}</div>
        </div>
      `
      );

      // Default match result template
      this.registerTemplate(
        'match-result',
        `
        <div class="match-result match-{{result}}">
          <div class="match-teams">
            <span class="home-team">{{homeTeam}}</span>
            <span class="score">{{homeScore}} - {{awayScore}}</span>
            <span class="away-team">{{awayTeam}}</span>
          </div>
          <div class="match-date">{{date}}</div>
        </div>
      `
      );
    },

    registerTemplate(name, template) {
      this.templates.set(name, template);
      console.log(`[Renderer] Registered template: ${name}`);
    },

    render(templateName, data = {}, options = {}) {
      const template = this.templates.get(templateName);

      if (!template) {
        console.warn('[Renderer] Template not found:', templateName);
        return '';
      }

      // Use cache if enabled
      const cacheKey = `${templateName}_${JSON.stringify(data)}`;
      if (options.cache && this.cache.has(cacheKey)) {
        return this.cache.get(cacheKey);
      }

      let rendered = this.processTemplate(template, data);

      // Apply filters if specified
      if (options.filters) {
        rendered = this.applyFilters(rendered, options.filters);
      }

      // Cache result if enabled
      if (options.cache) {
        this.cache.set(cacheKey, rendered);
      }

      return rendered;
    },

    processTemplate(template, data) {
      return template.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (match, path) => {
        const value = this.getNestedValue(data, path);
        return value !== undefined ? value : '';
      });
    },

    getNestedValue(obj, path) {
      return path.split('.').reduce((current, key) => {
        return current && current[key] !== undefined ? current[key] : undefined;
      }, obj);
    },

    renderElement(templateName, data = {}, options = {}) {
      const html = this.render(templateName, data, options);
      const container = document.createElement('div');
      container.innerHTML = html;
      return container.firstElementChild;
    },

    renderToContainer(containerSelector, templateName, data = {}, options = {}) {
      const container = document.querySelector(containerSelector);
      if (!container) {
        console.warn('[Renderer] Container not found:', containerSelector);
        return false;
      }

      const html = this.render(templateName, data, options);

      if (options.append) {
        container.insertAdjacentHTML('beforeend', html);
      } else {
        container.innerHTML = html;
      }

      return true;
    },

    renderList(containerSelector, templateName, items = [], options = {}) {
      const container = document.querySelector(containerSelector);
      if (!container) {
        console.warn('[Renderer] Container not found:', containerSelector);
        return false;
      }

      if (!options.append) {
        container.innerHTML = '';
      }

      const fragment = document.createDocumentFragment();

      items.forEach((item, index) => {
        const data = { ...item, index, isFirst: index === 0, isLast: index === items.length - 1 };
        const element = this.renderElement(templateName, data, options);
        if (element) {
          fragment.appendChild(element);
        }
      });

      container.appendChild(fragment);
      return true;
    },

    applyFilters(html, filters) {
      let result = html;

      filters.forEach(filter => {
        switch (filter.type) {
          case 'uppercase':
            result = result.toUpperCase();
            break;
          case 'lowercase':
            result = result.toLowerCase();
            break;
          case 'trim':
            result = result.trim();
            break;
          case 'replace':
            result = result.replace(new RegExp(filter.search, 'g'), filter.replace);
            break;
        }
      });

      return result;
    },

    // Helper methods for common rendering tasks
    renderStatistics(containerSelector, statistics, options = {}) {
      const stats = Object.entries(statistics).map(([key, value]) => ({
        label: this.formatLabel(key),
        value: this.formatValue(value, options.format),
        key: key,
      }));

      return this.renderList(containerSelector, 'stat-item', stats, options);
    },

    renderCards(containerSelector, cards, options = {}) {
      return this.renderList(containerSelector, 'stat-card', cards, options);
    },

    renderMatches(containerSelector, matches, options = {}) {
      const formattedMatches = matches.map(match => ({
        ...match,
        date: this.formatDate(match.date),
        result: this.getMatchResult(match),
      }));

      return this.renderList(containerSelector, 'match-result', formattedMatches, options);
    },

    formatLabel(key) {
      return key
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, str => str.toUpperCase())
        .trim();
    },

    formatValue(value, format) {
      if (value === null || value === undefined) return '-';

      switch (format) {
        case 'percentage':
          return `${parseFloat(value).toFixed(1)}%`;
        case 'decimal':
          return parseFloat(value).toFixed(2);
        case 'integer':
          return Math.round(value);
        case 'currency':
          return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
          }).format(value);
        default:
          return value.toString();
      }
    },

    formatDate(date) {
      if (!date) return '-';
      return new Date(date).toLocaleDateString();
    },

    getMatchResult(match) {
      if (match.homeScore > match.awayScore) return 'win';
      if (match.awayScore > match.homeScore) return 'loss';
      return 'draw';
    },

    // Template compilation for better performance
    compileTemplate(template) {
      const compiled = template.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (match, path) => {
        return `' + (data.${path} || '') + '`;
      });

      return new Function('data', `return '${compiled}';`);
    },

    // Advanced rendering with conditionals and loops
    renderAdvanced(template, data) {
      // Simple conditional rendering
      let processed = template.replace(
        /\{\{#if (\w+)\}\}(.*?)\{\{\/if\}\}/gs,
        (match, condition, content) => {
          return data[condition] ? content : '';
        }
      );

      // Simple loop rendering
      processed = processed.replace(
        /\{\{#each (\w+)\}\}(.*?)\{\{\/each\}\}/gs,
        (match, arrayName, content) => {
          const array = data[arrayName] || [];
          return array.map(item => this.processTemplate(content, item)).join('');
        }
      );

      return this.processTemplate(processed, data);
    },

    // Clear cache
    clearCache() {
      this.cache.clear();
      console.log('[Renderer] Cache cleared');
    },

    // Get cache stats
    getCacheStats() {
      return {
        size: this.cache.size,
        templates: this.templates.size,
      };
    },
  };

  // Global registration
  global.TeamStatsRenderer = Renderer;

  // Auto-initialize
  Renderer.init();
})(window);
