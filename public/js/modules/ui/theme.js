/**
 * Theme Module
 * Handles theme management for the team stats application
 */

(function (global) {
  'use strict';

  const ThemeManager = {
    initialized: false,
    currentTheme: 'light',
    themes: {
      light: {
        name: 'Light',
        class: 'theme-light',
      },
      dark: {
        name: 'Dark',
        class: 'theme-dark',
      },
      auto: {
        name: 'Auto',
        class: 'theme-auto',
      },
    },

    init() {
      if (this.initialized) return;

      this.loadSavedTheme();
      this.bindEvents();
      this.applyTheme();

      this.initialized = true;
      console.log('[ThemeManager] Initialized');
    },

    bindEvents() {
      // Handle theme toggle button
      document.addEventListener('click', e => {
        const themeToggle = e.target.closest('.theme-toggle');
        if (themeToggle) {
          this.toggleTheme();
        }
      });

      // Handle theme selector dropdown
      document.addEventListener('change', e => {
        const themeSelect = e.target.closest('.theme-select');
        if (themeSelect) {
          this.setTheme(themeSelect.value);
        }
      });

      // Listen for system theme changes
      if (window.matchMedia) {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        mediaQuery.addEventListener('change', () => {
          if (this.currentTheme === 'auto') {
            this.applyTheme();
          }
        });
      }
    },

    setTheme(theme) {
      if (!this.themes[theme]) {
        console.warn('[ThemeManager] Unknown theme:', theme);
        return;
      }

      this.currentTheme = theme;
      this.applyTheme();
      this.saveTheme();

      // Emit theme change event
      if (global.TeamStatsEventBus) {
        global.TeamStatsEventBus.emit('theme:change', { theme });
      }
    },

    toggleTheme() {
      const themes = Object.keys(this.themes);
      const currentIndex = themes.indexOf(this.currentTheme);
      const nextIndex = (currentIndex + 1) % themes.length;
      const nextTheme = themes[nextIndex];

      this.setTheme(nextTheme);
    },

    applyTheme() {
      const body = document.body;

      // Remove existing theme classes
      Object.values(this.themes).forEach(theme => {
        body.classList.remove(theme.class);
      });

      // Apply new theme
      let themeToApply = this.currentTheme;

      if (this.currentTheme === 'auto') {
        // Detect system preference
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
          themeToApply = 'dark';
        } else {
          themeToApply = 'light';
        }
      }

      body.classList.add(this.themes[themeToApply].class);

      // Update theme toggle button text
      const themeToggles = document.querySelectorAll('.theme-toggle');
      themeToggles.forEach(toggle => {
        toggle.textContent = this.themes[this.currentTheme].name;
      });

      // Update theme selector
      const themeSelects = document.querySelectorAll('.theme-select');
      themeSelects.forEach(select => {
        select.value = this.currentTheme;
      });

      console.log('[ThemeManager] Applied theme:', this.currentTheme);
    },

    saveTheme() {
      try {
        localStorage.setItem('teamstats_theme', this.currentTheme);
      } catch (error) {
        console.warn('[ThemeManager] Failed to save theme:', error);
      }
    },

    loadSavedTheme() {
      try {
        const saved = localStorage.getItem('teamstats_theme');
        if (saved && this.themes[saved]) {
          this.currentTheme = saved;
        }
      } catch (error) {
        console.warn('[ThemeManager] Failed to load saved theme:', error);
      }
    },

    getCurrentTheme() {
      return this.currentTheme;
    },

    getAvailableThemes() {
      return Object.keys(this.themes);
    },
  };

  // Global registration
  global.TeamStatsThemeManager = ThemeManager;

  // Auto-initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => ThemeManager.init());
  } else {
    ThemeManager.init();
  }
})(window);
