/**
 * Event Bus - Core Module
 * Centralized event system for component communication
 * Features: namespacing, wildcards, priority, error handling
 */

(function(window) {
  'use strict';

  class EventBus {
    constructor() {
      // Event listeners storage
      this._events = new Map();
      
      // Event history for debugging
      this._history = [];
      this._historyLimit = 100;
      
      // Performance metrics
      this._metrics = {
        totalEvents: 0,
        totalListeners: 0,
        eventCounts: new Map()
      };
      
      // Configuration
      this._config = {
        enableHistory: true,
        enableMetrics: true,
        errorHandler: this._defaultErrorHandler.bind(this),
        maxListenersPerEvent: 100,
        debugMode: false
      };
      
      // Prevented events (for testing or debugging)
      this._preventedEvents = new Set();
    }
    
    /**
     * Subscribe to an event
     * @param {string} eventName - Event name (supports wildcards)
     * @param {Function} callback - Event handler
     * @param {Object} options - Subscription options
     * @returns {Function} Unsubscribe function
     */
    on(eventName, callback, options = {}) {
      if (typeof eventName !== 'string' || !eventName) {
        throw new Error('Event name must be a non-empty string');
      }
      
      if (typeof callback !== 'function') {
        throw new Error('Callback must be a function');
      }
      
      const listener = {
        callback,
        once: options.once || false,
        priority: options.priority || 0,
        context: options.context || null,
        namespace: options.namespace || null,
        id: this._generateListenerId()
      };
      
      // Add to events map
      if (!this._events.has(eventName)) {
        this._events.set(eventName, []);
      }
      
      const listeners = this._events.get(eventName);
      
      // Check max listeners
      if (listeners.length >= this._config.maxListenersPerEvent) {
        console.warn(`Maximum listeners (${this._config.maxListenersPerEvent}) reached for event: ${eventName}`);
      }
      
      // Add listener sorted by priority
      listeners.push(listener);
      listeners.sort((a, b) => b.priority - a.priority);
      
      // Update metrics
      this._metrics.totalListeners++;
      
      // Return unsubscribe function
      return () => this.off(eventName, callback);
    }
    
    /**
     * Subscribe to an event that fires only once
     * @param {string} eventName - Event name
     * @param {Function} callback - Event handler
     * @param {Object} options - Subscription options
     * @returns {Function} Unsubscribe function
     */
    once(eventName, callback, options = {}) {
      return this.on(eventName, callback, { ...options, once: true });
    }
    
    /**
     * Unsubscribe from an event
     * @param {string} eventName - Event name
     * @param {Function} callback - Event handler to remove
     */
    off(eventName, callback) {
      if (!eventName) {
        // Remove all listeners
        this._events.clear();
        this._metrics.totalListeners = 0;
        return;
      }
      
      if (!callback) {
        // Remove all listeners for this event
        const listeners = this._events.get(eventName);
        if (listeners) {
          this._metrics.totalListeners -= listeners.length;
          this._events.delete(eventName);
        }
        return;
      }
      
      // Remove specific listener
      const listeners = this._events.get(eventName);
      if (listeners) {
        const index = listeners.findIndex(l => l.callback === callback);
        if (index !== -1) {
          listeners.splice(index, 1);
          this._metrics.totalListeners--;
          
          if (listeners.length === 0) {
            this._events.delete(eventName);
          }
        }
      }
    }
    
    /**
     * Emit an event
     * @param {string} eventName - Event name
     * @param {...*} args - Event arguments
     */
    emit(eventName, ...args) {
      if (this._preventedEvents.has(eventName)) {
        this._log(`Event prevented: ${eventName}`);
        return;
      }
      
      // Update metrics
      this._metrics.totalEvents++;
      this._metrics.eventCounts.set(
        eventName, 
        (this._metrics.eventCounts.get(eventName) || 0) + 1
      );
      
      // Add to history
      if (this._config.enableHistory) {
        this._addToHistory(eventName, args);
      }
      
      // Get direct listeners
      const directListeners = this._events.get(eventName) || [];
      
      // Get wildcard listeners
      const wildcardListeners = this._getWildcardListeners(eventName);
      
      // Combine and execute
      const allListeners = [...directListeners, ...wildcardListeners];
      const listenersToRemove = [];
      
      for (const listener of allListeners) {
        try {
          // Call with context if provided
          if (listener.context) {
            listener.callback.apply(listener.context, args);
          } else {
            listener.callback(...args);
          }
          
          // Remove if once
          if (listener.once) {
            listenersToRemove.push(listener);
          }
          
        } catch (error) {
          this._config.errorHandler(error, eventName, listener);
        }
      }
      
      // Remove once listeners
      listenersToRemove.forEach(listener => {
        this._removeListener(eventName, listener);
      });
      
      this._log(`Event emitted: ${eventName}`, args);
    }
    
    /**
     * Emit an event asynchronously
     * @param {string} eventName - Event name
     * @param {...*} args - Event arguments
     * @returns {Promise}
     */
    async emitAsync(eventName, ...args) {
      return new Promise((resolve) => {
        setTimeout(() => {
          this.emit(eventName, ...args);
          resolve();
        }, 0);
      });
    }
    
    /**
     * Wait for an event to occur
     * @param {string} eventName - Event name
     * @param {number} timeout - Timeout in milliseconds
     * @returns {Promise}
     */
    waitFor(eventName, timeout = 0) {
      return new Promise((resolve, reject) => {
        let timeoutId;
        
        const handler = (...args) => {
          if (timeoutId) clearTimeout(timeoutId);
          resolve(args);
        };
        
        this.once(eventName, handler);
        
        if (timeout > 0) {
          timeoutId = setTimeout(() => {
            this.off(eventName, handler);
            reject(new Error(`Timeout waiting for event: ${eventName}`));
          }, timeout);
        }
      });
    }
    
    /**
     * Get wildcard listeners for an event
     * @private
     */
    _getWildcardListeners(eventName) {
      const wildcardListeners = [];
      
      for (const [pattern, listeners] of this._events) {
        if (pattern.includes('*') || pattern.includes('**')) {
          if (this._matchesPattern(eventName, pattern)) {
            wildcardListeners.push(...listeners);
          }
        }
      }
      
      return wildcardListeners;
    }
    
    /**
     * Check if event name matches pattern
     * @private
     */
    _matchesPattern(eventName, pattern) {
      // Convert pattern to regex
      const regexPattern = pattern
        .replace(/\*\*/g, '.*')  // ** matches anything
        .replace(/\*/g, '[^:]*') // * matches anything except :
        .replace(/:/g, '\\:');   // Escape :
        
      const regex = new RegExp('^' + regexPattern + '$');
      return regex.test(eventName);
    }
    
    /**
     * Remove a specific listener
     * @private
     */
    _removeListener(eventName, listenerToRemove) {
      const listeners = this._events.get(eventName);
      if (listeners) {
        const index = listeners.findIndex(l => l.id === listenerToRemove.id);
        if (index !== -1) {
          listeners.splice(index, 1);
          this._metrics.totalListeners--;
          
          if (listeners.length === 0) {
            this._events.delete(eventName);
          }
        }
      }
    }
    
    /**
     * Add event to history
     * @private
     */
    _addToHistory(eventName, args) {
      this._history.push({
        eventName,
        args: args.length <= 3 ? args : args.slice(0, 3), // Limit stored args
        timestamp: Date.now()
      });
      
      // Limit history size
      if (this._history.length > this._historyLimit) {
        this._history.shift();
      }
    }
    
    /**
     * Generate unique listener ID
     * @private
     */
    _generateListenerId() {
      return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }
    
    /**
     * Default error handler
     * @private
     */
    _defaultErrorHandler(error, eventName, listener) {
      console.error(`Error in event listener for "${eventName}":`, error);
      if (this._config.debugMode) {
        console.error('Listener:', listener);
      }
    }
    
    /**
     * Log debug message
     * @private
     */
    _log(...args) {
      if (this._config.debugMode) {
        console.log('[EventBus]', ...args);
      }
    }
    
    /**
     * Get all events with listeners
     * @returns {Array} Event names
     */
    getEvents() {
      return Array.from(this._events.keys());
    }
    
    /**
     * Get listener count for an event
     * @param {string} eventName - Event name
     * @returns {number} Listener count
     */
    getListenerCount(eventName) {
      if (!eventName) {
        return this._metrics.totalListeners;
      }
      
      const listeners = this._events.get(eventName);
      return listeners ? listeners.length : 0;
    }
    
    /**
     * Get event history
     * @returns {Array} Event history
     */
    getHistory() {
      return [...this._history];
    }
    
    /**
     * Get metrics
     * @returns {Object} Metrics
     */
    getMetrics() {
      return {
        ...this._metrics,
        eventCounts: Object.fromEntries(this._metrics.eventCounts)
      };
    }
    
    /**
     * Clear event history
     */
    clearHistory() {
      this._history = [];
    }
    
    /**
     * Prevent an event from firing
     * @param {string} eventName - Event name
     */
    preventEvent(eventName) {
      this._preventedEvents.add(eventName);
    }
    
    /**
     * Allow a prevented event to fire
     * @param {string} eventName - Event name
     */
    allowEvent(eventName) {
      this._preventedEvents.delete(eventName);
    }
    
    /**
     * Configure event bus
     * @param {Object} config - Configuration options
     */
    configure(config) {
      Object.assign(this._config, config);
    }
    
    /**
     * Reset event bus
     */
    reset() {
      this._events.clear();
      this._history = [];
      this._metrics = {
        totalEvents: 0,
        totalListeners: 0,
        eventCounts: new Map()
      };
      this._preventedEvents.clear();
    }
    
    /**
     * Create a namespaced event bus
     * @param {string} namespace - Namespace
     * @returns {Object} Namespaced interface
     */
    namespace(namespace) {
      const self = this;
      
      return {
        on: (event, callback, options = {}) => 
          self.on(`${namespace}:${event}`, callback, { ...options, namespace }),
          
        once: (event, callback, options = {}) => 
          self.once(`${namespace}:${event}`, callback, { ...options, namespace }),
          
        off: (event, callback) => 
          self.off(event ? `${namespace}:${event}` : null, callback),
          
        emit: (event, ...args) => 
          self.emit(`${namespace}:${event}`, ...args),
          
        emitAsync: (event, ...args) => 
          self.emitAsync(`${namespace}:${event}`, ...args),
          
        waitFor: (event, timeout) => 
          self.waitFor(`${namespace}:${event}`, timeout)
      };
    }
  }
  
  // Create singleton instance
  const eventBus = new EventBus();
  
  // Export for different module systems
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = eventBus;
  } else if (typeof define === 'function' && define.amd) {
    define([], function() {
      return eventBus;
    });
  } else if (typeof window !== 'undefined') {
    window.TeamStatsEventBus = eventBus;
  }
  
  return eventBus;

})(typeof window !== 'undefined' ? window : this);