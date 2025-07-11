/**
 * Feature Flags Module
 * Handles feature flag management for the team stats application
 */

(function (global) {
  'use strict';

  const FeatureFlags = {
    initialized: false,
    flags: new Map(),
    config: {
      enableStorage: true,
      storageKey: 'teamstats_feature_flags',
      enableRemote: false,
      remoteUrl: null,
    },

    // Default feature flags
    defaultFlags: {
      'new-ui': false,
      'experimental-charts': false,
      'advanced-filters': true,
      'data-export': true,
      'real-time-updates': false,
      'social-sharing': false,
      'dark-mode': true,
      'performance-monitoring': true,
      'error-reporting': false,
      'beta-features': false,
    },

    init() {
      if (this.initialized) return;

      this.loadDefaultFlags();
      this.loadStoredFlags();

      // Load remote flags if enabled
      if (this.config.enableRemote && this.config.remoteUrl) {
        this.loadRemoteFlags();
      }

      this.initialized = true;
    },

    loadDefaultFlags() {
      Object.entries(this.defaultFlags).forEach(([key, value]) => {
        this.flags.set(key, value);
      });
    },

    loadStoredFlags() {
      if (!this.config.enableStorage) return;

      try {
        const stored = localStorage.getItem(this.config.storageKey);
        if (stored) {
          const flags = JSON.parse(stored);
          Object.entries(flags).forEach(([key, value]) => {
            this.flags.set(key, value);
          });
        }
      } catch (error) {
      }
    },

    async loadRemoteFlags() {
      try {
        const response = await fetch(this.config.remoteUrl);
        const remoteFlags = await response.json();

        Object.entries(remoteFlags).forEach(([key, value]) => {
          this.flags.set(key, value);
        });

        // Save updated flags
        this.storeFlags();


        // Emit flags updated event
        if (global.TeamStatsEventBus) {
          global.TeamStatsEventBus.emit('feature-flags:updated', this.getAllFlags());
        }
      } catch (error) {
      }
    },

    isEnabled(flagName) {
      return this.flags.get(flagName) === true;
    },

    isDisabled(flagName) {
      return this.flags.get(flagName) === false;
    },

    getFlag(flagName) {
      return this.flags.get(flagName);
    },

    setFlag(flagName, value) {
      const oldValue = this.flags.get(flagName);
      this.flags.set(flagName, value);

      // Store updated flags
      if (this.config.enableStorage) {
        this.storeFlags();
      }


      // Emit flag changed event
      if (global.TeamStatsEventBus) {
        global.TeamStatsEventBus.emit('feature-flag:changed', {
          flag: flagName,
          oldValue: oldValue,
          newValue: value,
        });
      }
    },

    toggleFlag(flagName) {
      const currentValue = this.flags.get(flagName);
      this.setFlag(flagName, !currentValue);
      return !currentValue;
    },

    getAllFlags() {
      const flags = {};
      this.flags.forEach((value, key) => {
        flags[key] = value;
      });
      return flags;
    },

    storeFlags() {
      try {
        const flags = this.getAllFlags();
        localStorage.setItem(this.config.storageKey, JSON.stringify(flags));
      } catch (error) {
      }
    },

    // Conditional execution based on flags
    when(flagName, callback) {
      if (this.isEnabled(flagName)) {
        return callback();
      }
      return null;
    },

    unless(flagName, callback) {
      if (this.isDisabled(flagName)) {
        return callback();
      }
      return null;
    },

    // Advanced flag evaluation
    evaluateCondition(condition) {
      // Simple condition evaluation
      // Example: "new-ui && !beta-features"
      try {
        const expression = condition.replace(/([a-z-]+)/g, match => {
          return this.isEnabled(match) ? 'true' : 'false';
        });

        // Basic safety check - only allow boolean operations
        if (!/^[true|false|&|!|\s|\(|\)]+$/.test(expression)) {
          throw new Error('Invalid condition expression');
        }

        // Replace && and || for eval safety
        const safeExpression = expression.replace(/&&/g, ' && ').replace(/\|\|/g, ' || ');

        return eval(safeExpression);
      } catch (error) {
        return false;
      }
    },

    // Feature rollout helpers
    enableForPercentage(flagName, percentage) {
      // Enable feature for a percentage of users based on hash of user identifier
      const userHash = this.getUserHash();
      const threshold = (percentage / 100) * 0xffffffff;

      const enabled = userHash < threshold;
      this.setFlag(flagName, enabled);

      return enabled;
    },

    getUserHash() {
      // Simple hash based on user agent and localStorage
      const identifier = navigator.userAgent + (localStorage.getItem('user_id') || '');
      let hash = 0;

      for (let i = 0; i < identifier.length; i++) {
        const char = identifier.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash = hash & hash; // Convert to 32-bit integer
      }

      return Math.abs(hash);
    },

    // Debugging and admin tools
    enableAllFlags() {
      this.flags.forEach((value, key) => {
        this.flags.set(key, true);
      });
      this.storeFlags();
    },

    disableAllFlags() {
      this.flags.forEach((value, key) => {
        this.flags.set(key, false);
      });
      this.storeFlags();
    },

    resetToDefaults() {
      this.flags.clear();
      this.loadDefaultFlags();
      this.storeFlags();
    },

    // Configuration management
    setConfig(newConfig) {
      this.config = { ...this.config, ...newConfig };

      if (newConfig.enableRemote && newConfig.remoteUrl) {
        this.loadRemoteFlags();
      }
    },

    // Export/Import flags
    exportFlags() {
      return JSON.stringify(this.getAllFlags(), null, 2);
    },

    importFlags(flagsJson) {
      try {
        const flags = JSON.parse(flagsJson);
        Object.entries(flags).forEach(([key, value]) => {
          this.setFlag(key, value);
        });
      } catch (error) {
      }
    },
  };

  // Global registration
  global.TeamStatsFeatureFlags = FeatureFlags;

  // Auto-initialize
  FeatureFlags.init();
})(window);
