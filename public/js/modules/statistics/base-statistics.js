/**
 * Base Statistics Module
 * Common statistical functions and utilities for all statistics modules
 * Provides shared calculation methods and data processing
 */

(function(global) {
    'use strict';

    class BaseStatistics {
        constructor() {
            this.name = 'BaseStatistics';
            this.version = '1.0.0';
            
            // Cache for expensive calculations
            this.calculationCache = new Map();
            this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
            
            // Performance tracking
            this.metrics = {
                calculations: 0,
                cacheHits: 0,
                totalTime: 0
            };
        }

        /**
         * Calculate average with null/undefined handling
         */
        average(values, decimals = 2) {
            if (!Array.isArray(values) || values.length === 0) return 0;
            
            const validValues = values.filter(v => v != null && !isNaN(v));
            if (validValues.length === 0) return 0;
            
            const sum = validValues.reduce((acc, val) => acc + Number(val), 0);
            return this.round(sum / validValues.length, decimals);
        }

        /**
         * Calculate sum with validation
         */
        sum(values) {
            if (!Array.isArray(values)) return 0;
            return values
                .filter(v => v != null && !isNaN(v))
                .reduce((acc, val) => acc + Number(val), 0);
        }

        /**
         * Calculate percentage
         */
        percentage(value, total, decimals = 1) {
            if (!total || total === 0) return 0;
            return this.round((value / total) * 100, decimals);
        }

        /**
         * Safe division
         */
        divide(numerator, denominator, decimals = 2) {
            if (!denominator || denominator === 0) return 0;
            return this.round(numerator / denominator, decimals);
        }

        /**
         * Round to specified decimals
         */
        round(value, decimals = 2) {
            if (value == null || isNaN(value)) return 0;
            return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
        }

        /**
         * Calculate median
         */
        median(values) {
            if (!Array.isArray(values) || values.length === 0) return 0;
            
            const sorted = values
                .filter(v => v != null && !isNaN(v))
                .map(Number)
                .sort((a, b) => a - b);
            
            if (sorted.length === 0) return 0;
            
            const mid = Math.floor(sorted.length / 2);
            return sorted.length % 2 === 0
                ? (sorted[mid - 1] + sorted[mid]) / 2
                : sorted[mid];
        }

        /**
         * Calculate standard deviation
         */
        standardDeviation(values, decimals = 2) {
            const avg = this.average(values);
            const validValues = values.filter(v => v != null && !isNaN(v));
            
            if (validValues.length <= 1) return 0;
            
            const squaredDiffs = validValues.map(v => Math.pow(v - avg, 2));
            const avgSquaredDiff = this.average(squaredDiffs);
            
            return this.round(Math.sqrt(avgSquaredDiff), decimals);
        }

        /**
         * Calculate variance
         */
        variance(values, decimals = 2) {
            if (!Array.isArray(values) || values.length === 0) return 0;
            
            const validValues = values.filter(v => v != null && !isNaN(v)).map(Number);
            if (validValues.length <= 1) return 0;
            
            const avg = this.average(validValues);
            const squaredDiffs = validValues.map(v => Math.pow(v - avg, 2));
            const variance = this.average(squaredDiffs);
            
            return this.round(variance, decimals);
        }

        /**
         * Calculate success rate
         */
        successRate(successful, total, decimals = 1) {
            return this.percentage(successful, total, decimals);
        }

        /**
         * Get min and max values
         */
        getRange(values) {
            const validValues = values.filter(v => v != null && !isNaN(v)).map(Number);
            
            if (validValues.length === 0) {
                return { min: 0, max: 0, range: 0 };
            }
            
            const min = Math.min(...validValues);
            const max = Math.max(...validValues);
            
            return {
                min,
                max,
                range: max - min
            };
        }

        /**
         * Calculate moving average
         */
        movingAverage(values, window = 5) {
            if (!Array.isArray(values) || values.length < window) {
                return values || [];
            }
            
            const result = [];
            for (let i = 0; i < values.length; i++) {
                if (i < window - 1) {
                    result.push(null);
                } else {
                    const windowValues = values.slice(i - window + 1, i + 1);
                    result.push(this.average(windowValues));
                }
            }
            
            return result;
        }

        /**
         * Calculate trend (positive, negative, neutral)
         */
        calculateTrend(values, threshold = 0.1) {
            if (!Array.isArray(values) || values.length < 2) {
                return 'neutral';
            }
            
            const recentValues = values.slice(-5); // Last 5 values
            const olderValues = values.slice(-10, -5); // Previous 5 values
            
            const recentAvg = this.average(recentValues);
            const olderAvg = this.average(olderValues);
            
            if (olderAvg === 0) return 'neutral';
            
            const change = (recentAvg - olderAvg) / olderAvg;
            
            if (change > threshold) return 'positive';
            if (change < -threshold) return 'negative';
            return 'neutral';
        }

        /**
         * Parse time-based data (last N matches)
         */
        getLastNMatches(data, n = 5) {
            if (!Array.isArray(data)) return [];
            return data.slice(-n);
        }

        /**
         * Filter by venue
         */
        filterByVenue(data, venue = 'overall') {
            if (!Array.isArray(data) || venue === 'overall') return data;
            
            return data.filter(item => {
                if (venue === 'home') return item.isHome === true;
                if (venue === 'away') return item.isHome === false;
                return true;
            });
        }

        /**
         * Group data by key
         */
        groupBy(data, key) {
            if (!Array.isArray(data)) return {};
            
            return data.reduce((groups, item) => {
                const groupKey = item[key] || 'unknown';
                if (!groups[groupKey]) {
                    groups[groupKey] = [];
                }
                groups[groupKey].push(item);
                return groups;
            }, {});
        }

        /**
         * Calculate per game average
         */
        perGameAverage(total, games, decimals = 2) {
            if (!games || games === 0) return 0;
            return this.round(total / games, decimals);
        }

        /**
         * Get form string (W/D/L format)
         */
        getFormString(results, limit = 5) {
            if (!Array.isArray(results)) return '';
            
            return results
                .slice(-limit)
                .map(result => {
                    if (result.won) return 'W';
                    if (result.draw) return 'D';
                    if (result.lost) return 'L';
                    return '?';
                })
                .join('');
        }

        /**
         * Calculate points from results
         */
        calculatePoints(wins, draws, losses = null) {
            return (wins * 3) + (draws * 1);
        }

        /**
         * Calculate PPG (Points Per Game)
         */
        calculatePPG(points, games, decimals = 2) {
            return this.perGameAverage(points, games, decimals);
        }

        /**
         * Safe property access
         */
        getValue(obj, path, defaultValue = 0) {
            if (!obj) return defaultValue;
            
            const keys = path.split('.');
            let value = obj;
            
            for (const key of keys) {
                value = value?.[key];
                if (value === undefined) return defaultValue;
            }
            
            return value ?? defaultValue;
        }

        /**
         * Calculate rate of change
         */
        rateOfChange(oldValue, newValue, decimals = 1) {
            if (!oldValue || oldValue === 0) return 0;
            
            const change = ((newValue - oldValue) / oldValue) * 100;
            return this.round(change, decimals);
        }

        /**
         * Check if value is above threshold
         */
        isAboveThreshold(value, threshold) {
            return Number(value) >= Number(threshold);
        }

        /**
         * Get cached calculation or compute
         */
        getCachedOrCompute(key, computeFn) {
            const cached = this.calculationCache.get(key);
            
            if (cached && Date.now() < cached.expiry) {
                this.metrics.cacheHits++;
                return cached.value;
            }
            
            const startTime = performance.now();
            const value = computeFn();
            const computeTime = performance.now() - startTime;
            
            this.calculationCache.set(key, {
                value,
                expiry: Date.now() + this.cacheTimeout
            });
            
            this.metrics.calculations++;
            this.metrics.totalTime += computeTime;
            
            return value;
        }

        /**
         * Clear calculation cache
         */
        clearCache() {
            this.calculationCache.clear();
        }

        /**
         * Get performance metrics
         */
        getMetrics() {
            return {
                ...this.metrics,
                avgCalculationTime: this.metrics.calculations > 0
                    ? this.round(this.metrics.totalTime / this.metrics.calculations, 3)
                    : 0,
                cacheHitRate: this.metrics.calculations > 0
                    ? this.percentage(this.metrics.cacheHits, this.metrics.calculations)
                    : 0
            };
        }
    }

    // Export
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = BaseStatistics;
    } else {
        global.TeamStatsBaseStatistics = new BaseStatistics();
    }

})(typeof window !== 'undefined' ? window : this);