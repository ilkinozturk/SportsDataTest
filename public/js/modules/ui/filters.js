/**
 * Filters Module
 * Handles filter functionality for the team stats application
 */

(function (global) {
  'use strict';

  const FiltersManager = {
    initialized: false,
    activeFilters: new Map(),
    filterGroups: new Map(),

    init() {
      if (this.initialized) return;

      this.setupFilterGroups();
      this.bindEvents();
      this.loadSavedFilters();

      this.initialized = true;
    },

    setupFilterGroups() {
      // Define filter groups
      this.filterGroups.set('venue', {
        name: 'Venue',
        options: ['overall', 'home', 'away'],
        default: 'overall',
        exclusive: true,
      });

      this.filterGroups.set('timeframe', {
        name: 'Timeframe',
        options: ['all', 'last5', 'last10', 'last15'],
        default: 'all',
        exclusive: true,
      });

      this.filterGroups.set('competition', {
        name: 'Competition',
        options: ['all', 'league', 'cup', 'international'],
        default: 'all',
        exclusive: true,
      });

      this.filterGroups.set('result', {
        name: 'Result',
        options: ['all', 'wins', 'draws', 'losses'],
        default: 'all',
        exclusive: true,
      });
    },

    bindEvents() {
      // Handle filter button clicks
      document.addEventListener('click', e => {
        const filterBtn = e.target.closest('.filter-btn');
        if (filterBtn) {
          this.handleFilterClick(filterBtn);
        }
      });

      // Handle filter dropdown changes
      document.addEventListener('change', e => {
        const filterSelect = e.target.closest('.filter-select');
        if (filterSelect) {
          this.handleFilterChange(filterSelect);
        }
      });
    },

    handleFilterClick(button) {
      const group = button.dataset.filterGroup;
      const value = button.dataset.filterValue;

      if (!group || !value) return;

      this.setFilter(group, value);
      this.updateFilterUI(group, value);
    },

    handleFilterChange(select) {
      const group = select.dataset.filterGroup;
      const value = select.value;

      if (!group || !value) return;

      this.setFilter(group, value);
    },

    setFilter(group, value) {
      const groupConfig = this.filterGroups.get(group);
      if (!groupConfig) return;

      // Clear existing filters for exclusive groups
      if (groupConfig.exclusive) {
        this.activeFilters.set(group, value);
      } else {
        // Handle multi-select filters
        const currentFilters = this.activeFilters.get(group) || [];
        const index = currentFilters.indexOf(value);

        if (index === -1) {
          currentFilters.push(value);
        } else {
          currentFilters.splice(index, 1);
        }

        this.activeFilters.set(group, currentFilters);
      }


      // Emit filter change event
      if (global.TeamStatsEventBus) {
        global.TeamStatsEventBus.emit('filters:change', {
          group,
          value,
          allFilters: this.getActiveFilters(),
        });
      }

      this.saveFilters();
    },

    getFilter(group) {
      return this.activeFilters.get(group) || this.filterGroups.get(group)?.default;
    },

    getActiveFilters() {
      const filters = {};
      for (const [group, value] of this.activeFilters) {
        filters[group] = value;
      }
      return filters;
    },

    updateFilterUI(group, value) {
      // Update button states
      const groupButtons = document.querySelectorAll(`[data-filter-group="${group}"]`);
      groupButtons.forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.filterValue === value) {
          btn.classList.add('active');
        }
      });

      // Update select states
      const groupSelects = document.querySelectorAll(`select[data-filter-group="${group}"]`);
      groupSelects.forEach(select => {
        select.value = value;
      });
    },

    resetFilters() {
      this.activeFilters.clear();

      // Reset UI to defaults
      this.filterGroups.forEach((config, group) => {
        this.updateFilterUI(group, config.default);
      });

      // Emit reset event
      if (global.TeamStatsEventBus) {
        global.TeamStatsEventBus.emit('filters:reset');
      }

      this.saveFilters();
    },

    saveFilters() {
      try {
        const filters = this.getActiveFilters();
        localStorage.setItem('teamstats_filters', JSON.stringify(filters));
      } catch (error) {
      }
    },

    loadSavedFilters() {
      try {
        const saved = localStorage.getItem('teamstats_filters');
        if (saved) {
          const filters = JSON.parse(saved);
          for (const [group, value] of Object.entries(filters)) {
            this.setFilter(group, value);
            this.updateFilterUI(group, value);
          }
        }
      } catch (error) {
      }
    },
  };

  // Global registration
  global.TeamStatsFiltersManager = FiltersManager;

  // Auto-initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => FiltersManager.init());
  } else {
    FiltersManager.init();
  }
})(window);
