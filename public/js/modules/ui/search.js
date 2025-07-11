/**
 * Search Module
 * Handles search functionality for the team stats application
 */

(function (global) {
  'use strict';

  const SearchManager = {
    initialized: false,
    searchInput: null,
    searchResults: null,

    init() {
      if (this.initialized) return;

      this.searchInput = document.querySelector('#search-input');
      this.searchResults = document.querySelector('#search-results');

      if (this.searchInput) {
        this.bindEvents();
      }

      this.initialized = true;
    },

    bindEvents() {
      this.searchInput.addEventListener('input', e => {
        this.handleSearch(e.target.value);
      });

      this.searchInput.addEventListener('keydown', e => {
        if (e.key === 'Enter') {
          this.executeSearch(e.target.value);
        }
      });
    },

    handleSearch(query) {
      if (query.length < 2) {
        this.clearResults();
        return;
      }

      // Debounce search
      clearTimeout(this.searchTimeout);
      this.searchTimeout = setTimeout(() => {
        this.performSearch(query);
      }, 300);
    },

    performSearch(query) {
      // Search implementation would go here
      this.displayResults([]);
    },

    executeSearch(query) {
      // Execute search implementation
    },

    displayResults(results) {
      if (!this.searchResults) return;

      this.searchResults.innerHTML = '';

      if (results.length === 0) {
        this.searchResults.innerHTML = '<div class="no-results">No results found</div>';
        return;
      }

      results.forEach(result => {
        const item = document.createElement('div');
        item.className = 'search-result-item';
        item.innerHTML = `
          <div class="result-title">${result.title}</div>
          <div class="result-description">${result.description}</div>
        `;
        this.searchResults.appendChild(item);
      });
    },

    clearResults() {
      if (this.searchResults) {
        this.searchResults.innerHTML = '';
      }
    },
  };

  // Global registration
  global.TeamStatsSearchManager = SearchManager;

  // Auto-initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => SearchManager.init());
  } else {
    SearchManager.init();
  }
})(window);
