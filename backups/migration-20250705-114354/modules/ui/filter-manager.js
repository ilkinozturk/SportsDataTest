/**
 * Filter Manager Module
 * Centralized filter management for team statistics
 * Features: Multiple filter types, state sync, preset management, event handling
 */

(function(global) {
    'use strict';

    class FilterManager {
        constructor() {
            // Filter definitions
            this.filterTypes = {
                venue: {
                    id: 'venue',
                    label: 'Venue',
                    options: [
                        { value: 'overall', label: 'Overall', icon: '📊' },
                        { value: 'home', label: 'Home', icon: '🏠' },
                        { value: 'away', label: 'Away', icon: '✈️' }
                    ],
                    default: 'overall'
                },
                timeFrame: {
                    id: 'timeFrame',
                    label: 'Time Frame',
                    options: [
                        { value: 'all', label: 'All Matches', icon: '📅' },
                        { value: 'last5', label: 'Last 5', icon: '5️⃣' },
                        { value: 'last10', label: 'Last 10', icon: '🔟' }
                    ],
                    default: 'all'
                },
                current: {
                    id: 'current',
                    label: 'Match Type',
                    options: [
                        { value: 'overall', label: 'Overall' },
                        { value: 'home', label: 'Home' },
                        { value: 'away', label: 'Away' }
                    ],
                    default: 'overall'
                },
                cards: {
                    id: 'cards',
                    label: 'Cards View',
                    options: [
                        { value: 'overall', label: 'Overall' },
                        { value: 'home', label: 'Home' },
                        { value: 'away', label: 'Away' }
                    ],
                    default: 'overall'
                },
                xg: {
                    id: 'xg',
                    label: 'xG Filter',
                    options: [
                        { value: 'overall', label: 'Overall' },
                        { value: 'home', label: 'Home' },
                        { value: 'away', label: 'Away' }
                    ],
                    default: 'overall'
                },
                halftime: {
                    id: 'halftime',
                    label: 'Half Time',
                    options: [
                        { value: 'all', label: 'All' },
                        { value: 'firstHalf', label: '1st Half' },
                        { value: 'secondHalf', label: '2nd Half' }
                    ],
                    default: 'all'
                },
                timing: {
                    id: 'timing',
                    label: 'Time Period',
                    options: [
                        { value: 'all', label: 'Full Match' },
                        { value: '0-15', label: '0-15 min' },
                        { value: '16-30', label: '16-30 min' },
                        { value: '31-45', label: '31-45 min' },
                        { value: '46-60', label: '46-60 min' },
                        { value: '61-75', label: '61-75 min' },
                        { value: '76-90', label: '76-90 min' }
                    ],
                    default: 'all'
                },
                goalTimings: {
                    id: 'goalTimings',
                    label: 'Goal Timings',
                    options: [
                        { value: 'all', label: 'All' },
                        { value: 'early', label: 'Early (0-30)' },
                        { value: 'middle', label: 'Middle (31-60)' },
                        { value: 'late', label: 'Late (61-90)' }
                    ],
                    default: 'all'
                },
                shots: {
                    id: 'shots',
                    label: 'Shot Type',
                    options: [
                        { value: 'all', label: 'All Shots' },
                        { value: 'onTarget', label: 'On Target' },
                        { value: 'offTarget', label: 'Off Target' },
                        { value: 'blocked', label: 'Blocked' }
                    ],
                    default: 'all'
                },
                corners: {
                    id: 'corners',
                    label: 'Corner Stats',
                    options: [
                        { value: 'overall', label: 'Overall' },
                        { value: 'for', label: 'Corners For' },
                        { value: 'against', label: 'Corners Against' }
                    ],
                    default: 'overall'
                },
                teamCorners: {
                    id: 'teamCorners',
                    label: 'Team Corners',
                    options: [
                        { value: 'overall', label: 'Overall' },
                        { value: 'home', label: 'Home' },
                        { value: 'away', label: 'Away' }
                    ],
                    default: 'overall'
                },
                overUnder: {
                    id: 'overUnder',
                    label: 'Over/Under',
                    options: [
                        { value: 'all', label: 'All' },
                        { value: 'over05', label: 'Over 0.5' },
                        { value: 'over15', label: 'Over 1.5' },
                        { value: 'over25', label: 'Over 2.5' },
                        { value: 'over35', label: 'Over 3.5' },
                        { value: 'under25', label: 'Under 2.5' },
                        { value: 'under35', label: 'Under 3.5' }
                    ],
                    default: 'all'
                },
                btts: {
                    id: 'btts',
                    label: 'Both Teams Score',
                    options: [
                        { value: 'all', label: 'All' },
                        { value: 'yes', label: 'BTTS Yes' },
                        { value: 'no', label: 'BTTS No' }
                    ],
                    default: 'all'
                },
                matchCards: {
                    id: 'matchCards',
                    label: 'Match Cards',
                    options: [
                        { value: 'overall', label: 'Overall' },
                        { value: 'home', label: 'Home' },
                        { value: 'away', label: 'Away' }
                    ],
                    default: 'overall'
                },
                teamCards: {
                    id: 'teamCards',
                    label: 'Team Cards',
                    options: [
                        { value: 'overall', label: 'Overall' },
                        { value: 'home', label: 'Home' },
                        { value: 'away', label: 'Away' }
                    ],
                    default: 'overall'
                }
            };

            // Current filter values
            this.currentFilters = {};
            
            // Filter presets
            this.presets = {
                default: {
                    name: 'Default',
                    filters: this.getDefaultFilters()
                },
                homeAnalysis: {
                    name: 'Home Analysis',
                    filters: {
                        venue: 'home',
                        timeFrame: 'all',
                        current: 'home',
                        cards: 'home',
                        corners: 'overall',
                        teamCorners: 'home'
                    }
                },
                awayAnalysis: {
                    name: 'Away Analysis',
                    filters: {
                        venue: 'away',
                        timeFrame: 'all',
                        current: 'away',
                        cards: 'away',
                        corners: 'overall',
                        teamCorners: 'away'
                    }
                },
                recentForm: {
                    name: 'Recent Form',
                    filters: {
                        venue: 'overall',
                        timeFrame: 'last5',
                        current: 'overall',
                        timing: 'all'
                    }
                }
            };

            // Event handlers
            this.eventHandlers = {
                filterChange: [],
                presetApplied: [],
                filterReset: [],
                filterValidation: []
            };

            // Filter history for undo/redo
            this.filterHistory = [];
            this.historyIndex = -1;
            this.maxHistorySize = 20;

            // Performance tracking
            this.performanceMetrics = {
                filterChanges: 0,
                presetApplications: 0,
                validationTime: 0,
                averageUpdateTime: 0
            };

            // Initialize dependencies
            this.initializeDependencies();
            
            // Initialize filters with defaults
            this.initializeFilters();
        }

        initializeDependencies() {
            // Check for StateManager
            if (typeof TeamStatsStateManager === 'undefined') {
                console.warn('FilterManager: StateManager not found, running in standalone mode');
                this.stateManager = null;
            } else {
                this.stateManager = TeamStatsStateManager;
            }

            // Check for EventBus
            if (typeof TeamStatsEventBus === 'undefined') {
                console.warn('FilterManager: EventBus not found, running in standalone mode');
                this.eventBus = null;
            } else {
                this.eventBus = TeamStatsEventBus;
            }
        }

        initializeFilters() {
            // Set default values for all filters
            Object.entries(this.filterTypes).forEach(([key, config]) => {
                this.currentFilters[key] = config.default;
            });

            // Sync with StateManager if available
            if (this.stateManager) {
                Object.keys(this.currentFilters).forEach(filterType => {
                    const stateValue = this.stateManager.get(filterType);
                    if (stateValue !== undefined) {
                        this.currentFilters[filterType] = stateValue;
                    }
                });
            }

            // Add to history
            this.addToHistory();
        }

        /**
         * Initialize filter UI
         */
        initialize(config = {}) {
            this.config = {
                containerSelector: config.containerSelector || '.filter-container',
                renderMode: config.renderMode || 'buttons', // 'buttons', 'dropdown', 'custom'
                enablePresets: config.enablePresets !== false,
                enableHistory: config.enableHistory !== false,
                animationDuration: config.animationDuration || 200,
                validateOnChange: config.validateOnChange !== false,
                ...config
            };

            // Setup event listeners
            this.setupEventListeners();

            // Render initial UI if needed
            if (this.config.autoRender !== false) {
                this.render();
            }

            // Emit initialization event
            if (this.eventBus) {
                this.eventBus.emit('filter-manager:initialized', {
                    filters: Object.keys(this.filterTypes),
                    currentValues: this.currentFilters
                });
            }

            return this;
        }

        /**
         * Get current value of a filter
         */
        getFilter(filterType) {
            return this.currentFilters[filterType];
        }

        /**
         * Set filter value
         */
        async setFilter(filterType, value, options = {}) {
            const startTime = performance.now();

            // Validate filter type
            if (!this.filterTypes[filterType]) {
                console.error(`FilterManager: Invalid filter type: ${filterType}`);
                return false;
            }

            // Validate filter value
            const validOptions = this.filterTypes[filterType].options.map(opt => opt.value);
            if (!validOptions.includes(value)) {
                console.error(`FilterManager: Invalid value '${value}' for filter '${filterType}'`);
                return false;
            }

            // Check if value is changing
            const oldValue = this.currentFilters[filterType];
            if (oldValue === value && !options.force) {
                return true;
            }

            // Validation hook
            if (this.config?.validateOnChange && !options.skipValidation) {
                const isValid = await this.validateFilterChange(filterType, value, oldValue);
                if (!isValid) {
                    return false;
                }
            }

            // Update filter value
            this.currentFilters[filterType] = value;

            // Add to history
            if (this.config?.enableHistory && !options.skipHistory) {
                this.addToHistory();
            }

            // Sync with StateManager
            if (this.stateManager && !options.skipStateSync) {
                this.stateManager.set(filterType, value);
            }

            // Update UI
            if (!options.skipUIUpdate) {
                this.updateFilterUI(filterType, value);
            }

            // Track performance
            const updateTime = performance.now() - startTime;
            this.trackPerformance('filterChange', updateTime);

            // Emit events
            this.emit('filterChange', {
                filterType,
                oldValue,
                newValue: value,
                options,
                updateTime
            });

            if (this.eventBus) {
                this.eventBus.emit('filter:changed', {
                    filterType,
                    value,
                    timestamp: Date.now()
                });
            }

            return true;
        }

        /**
         * Set multiple filters at once
         */
        async setFilters(filters, options = {}) {
            const startTime = performance.now();
            const changes = [];

            // Validate all filters first
            for (const [filterType, value] of Object.entries(filters)) {
                if (!this.filterTypes[filterType]) {
                    console.error(`FilterManager: Invalid filter type: ${filterType}`);
                    return false;
                }
            }

            // Apply all filter changes
            for (const [filterType, value] of Object.entries(filters)) {
                const oldValue = this.currentFilters[filterType];
                if (oldValue !== value || options.force) {
                    await this.setFilter(filterType, value, {
                        ...options,
                        skipHistory: true,
                        skipUIUpdate: true
                    });
                    changes.push({ filterType, oldValue, newValue: value });
                }
            }

            // Update history once for all changes
            if (changes.length > 0 && this.config?.enableHistory && !options.skipHistory) {
                this.addToHistory();
            }

            // Update UI once for all changes
            if (changes.length > 0 && !options.skipUIUpdate) {
                this.render();
            }

            // Track performance
            const updateTime = performance.now() - startTime;
            this.trackPerformance('batchUpdate', updateTime);

            // Emit batch change event
            if (changes.length > 0) {
                this.emit('filterChange', {
                    changes,
                    options,
                    updateTime
                });
            }

            return true;
        }

        /**
         * Apply a preset
         */
        applyPreset(presetName, options = {}) {
            const preset = this.presets[presetName];
            if (!preset) {
                console.error(`FilterManager: Invalid preset: ${presetName}`);
                return false;
            }

            // Apply preset filters
            this.setFilters(preset.filters, {
                ...options,
                preset: presetName
            });

            // Track performance
            this.performanceMetrics.presetApplications++;

            // Emit preset event
            this.emit('presetApplied', {
                presetName,
                preset,
                timestamp: Date.now()
            });

            if (this.eventBus) {
                this.eventBus.emit('filter:preset-applied', {
                    presetName,
                    filters: preset.filters
                });
            }

            return true;
        }

        /**
         * Reset filters to default
         */
        resetFilters(filterTypes = null) {
            const filtersToReset = filterTypes || Object.keys(this.filterTypes);
            const resetValues = {};

            filtersToReset.forEach(filterType => {
                if (this.filterTypes[filterType]) {
                    resetValues[filterType] = this.filterTypes[filterType].default;
                }
            });

            this.setFilters(resetValues, { reset: true });

            this.emit('filterReset', {
                filters: filtersToReset,
                timestamp: Date.now()
            });

            return true;
        }

        /**
         * Get all current filter values
         */
        getAllFilters() {
            return { ...this.currentFilters };
        }

        /**
         * Get default filter values
         */
        getDefaultFilters() {
            const defaults = {};
            Object.entries(this.filterTypes).forEach(([key, config]) => {
                defaults[key] = config.default;
            });
            return defaults;
        }

        /**
         * Validate filter change
         */
        async validateFilterChange(filterType, newValue, oldValue) {
            const startTime = performance.now();

            // Run validation handlers
            let isValid = true;
            for (const handler of this.eventHandlers.filterValidation) {
                const result = await handler({ filterType, newValue, oldValue });
                if (result === false) {
                    isValid = false;
                    break;
                }
            }

            const validationTime = performance.now() - startTime;
            this.performanceMetrics.validationTime += validationTime;

            return isValid;
        }

        /**
         * History management
         */
        addToHistory() {
            // Remove future history if we're not at the end
            if (this.historyIndex < this.filterHistory.length - 1) {
                this.filterHistory = this.filterHistory.slice(0, this.historyIndex + 1);
            }

            // Add current state
            this.filterHistory.push({
                filters: { ...this.currentFilters },
                timestamp: Date.now()
            });

            // Limit history size
            if (this.filterHistory.length > this.maxHistorySize) {
                this.filterHistory.shift();
            } else {
                this.historyIndex++;
            }
        }

        undo() {
            if (this.historyIndex > 0) {
                this.historyIndex--;
                const historicalState = this.filterHistory[this.historyIndex];
                this.setFilters(historicalState.filters, {
                    skipHistory: true,
                    source: 'undo'
                });
                return true;
            }
            return false;
        }

        redo() {
            if (this.historyIndex < this.filterHistory.length - 1) {
                this.historyIndex++;
                const historicalState = this.filterHistory[this.historyIndex];
                this.setFilters(historicalState.filters, {
                    skipHistory: true,
                    source: 'redo'
                });
                return true;
            }
            return false;
        }

        /**
         * UI Rendering
         */
        render() {
            const container = document.querySelector(this.config.containerSelector);
            if (!container) {
                console.warn('FilterManager: Container not found');
                return;
            }

            switch (this.config.renderMode) {
                case 'buttons':
                    this.renderButtons(container);
                    break;
                case 'dropdown':
                    this.renderDropdowns(container);
                    break;
                case 'custom':
                    // Allow custom rendering via event
                    this.emit('customRender', { container, filters: this.currentFilters });
                    break;
            }
        }

        renderButtons(container) {
            // Implementation would create button groups for each filter type
            // This is a simplified version for the module structure
            container.innerHTML = '<!-- Filter buttons would be rendered here -->';
        }

        renderDropdowns(container) {
            // Implementation would create dropdowns for each filter type
            container.innerHTML = '<!-- Filter dropdowns would be rendered here -->';
        }

        updateFilterUI(filterType, value) {
            // Update specific filter UI element
            if (this.config.renderMode === 'custom') {
                this.emit('updateUI', { filterType, value });
                return;
            }

            // Default UI update logic would go here
        }

        /**
         * Event handling
         */
        setupEventListeners() {
            // Listen for state changes if StateManager is available
            if (this.stateManager) {
                Object.keys(this.filterTypes).forEach(filterType => {
                    this.stateManager.observe(filterType, (newValue) => {
                        if (newValue !== this.currentFilters[filterType]) {
                            this.setFilter(filterType, newValue, {
                                skipStateSync: true,
                                source: 'stateManager'
                            });
                        }
                    });
                });
            }

            // Listen for external filter requests
            if (this.eventBus) {
                this.eventBus.on('request-filter-change', (data) => {
                    this.setFilter(data.filterType, data.value, data.options);
                });

                this.eventBus.on('request-preset', (data) => {
                    this.applyPreset(data.presetName, data.options);
                });

                this.eventBus.on('request-filter-reset', (data) => {
                    this.resetFilters(data.filterTypes);
                });
            }
        }

        /**
         * Event emitter methods
         */
        on(event, handler) {
            if (this.eventHandlers[event]) {
                this.eventHandlers[event].push(handler);
                return () => this.off(event, handler);
            }
        }

        off(event, handler) {
            if (this.eventHandlers[event]) {
                this.eventHandlers[event] = this.eventHandlers[event].filter(h => h !== handler);
            }
        }

        emit(event, data) {
            if (this.eventHandlers[event]) {
                this.eventHandlers[event].forEach(handler => {
                    try {
                        handler(data);
                    } catch (error) {
                        console.error(`FilterManager: Error in ${event} handler:`, error);
                    }
                });
            }
        }

        /**
         * Performance tracking
         */
        trackPerformance(operation, time) {
            this.performanceMetrics.filterChanges++;
            this.performanceMetrics.averageUpdateTime = 
                (this.performanceMetrics.averageUpdateTime * (this.performanceMetrics.filterChanges - 1) + time) / 
                this.performanceMetrics.filterChanges;
        }

        getPerformanceMetrics() {
            return {
                ...this.performanceMetrics,
                historySize: this.filterHistory.length,
                activeFilters: Object.keys(this.currentFilters).length
            };
        }

        /**
         * Utility methods
         */
        getFilterLabel(filterType, value) {
            const filter = this.filterTypes[filterType];
            if (!filter) return value;

            const option = filter.options.find(opt => opt.value === value);
            return option ? option.label : value;
        }

        isFilterActive(filterType) {
            return this.currentFilters[filterType] !== this.filterTypes[filterType].default;
        }

        getActiveFilters() {
            const active = {};
            Object.entries(this.currentFilters).forEach(([type, value]) => {
                if (this.isFilterActive(type)) {
                    active[type] = value;
                }
            });
            return active;
        }

        /**
         * Export/Import functionality
         */
        exportFilters() {
            return {
                version: '1.0',
                filters: this.currentFilters,
                timestamp: Date.now()
            };
        }

        importFilters(data) {
            if (data.version !== '1.0') {
                console.warn('FilterManager: Incompatible filter version');
                return false;
            }

            return this.setFilters(data.filters, { source: 'import' });
        }

        /**
         * Destroy method
         */
        destroy() {
            // Clear event handlers
            Object.keys(this.eventHandlers).forEach(event => {
                this.eventHandlers[event] = [];
            });

            // Clear history
            this.filterHistory = [];
            this.historyIndex = -1;

            // Reset filters
            this.currentFilters = {};

            // Clear UI
            const container = document.querySelector(this.config?.containerSelector);
            if (container) {
                container.innerHTML = '';
            }
        }
    }

    // Export for different module systems
    if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
        module.exports = FilterManager;
    } else if (typeof define === 'function' && define.amd) {
        define([], function() {
            return FilterManager;
        });
    } else {
        global.TeamStatsFilterManager = new FilterManager();
    }

})(typeof window !== 'undefined' ? window : this);