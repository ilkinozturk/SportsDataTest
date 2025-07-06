/**
 * Performance Monitor Module
 * Handles performance monitoring for the team stats application
 */

(function(global) {
  'use strict';

  const PerformanceMonitor = {
    initialized: false,
    metrics: new Map(),
    config: {
      enableLogging: true,
      enableStorage: true,
      maxMetrics: 1000,
      storageKey: 'teamstats_performance'
    },
    
    init() {
      if (this.initialized) return;
      
      this.loadStoredMetrics();
      this.setupNavigationTiming();
      this.setupResourceTiming();
      
      this.initialized = true;
      this.info('[PerformanceMonitor] Initialized');
    },
    
    loadStoredMetrics() {
      if (!this.config.enableStorage) return;
      
      try {
        const stored = localStorage.getItem(this.config.storageKey);
        if (stored) {
          const data = JSON.parse(stored);
          this.metrics = new Map(data);
        }
      } catch (error) {
        console.warn('[PerformanceMonitor] Failed to load stored metrics:', error);
      }
    },
    
    setupNavigationTiming() {
      if (!window.performance || !window.performance.timing) return;
      
      window.addEventListener('load', () => {
        setTimeout(() => {
          this.captureNavigationTiming();
        }, 100);
      });
    },
    
    setupResourceTiming() {
      if (!window.performance || !window.performance.getEntriesByType) return;
      
      // Monitor resource loading
      new PerformanceObserver((list) => {
        list.getEntries().forEach(entry => {
          this.captureResourceTiming(entry);
        });
      }).observe({ entryTypes: ['resource'] });
    },
    
    captureNavigationTiming() {
      const timing = window.performance.timing;
      const navigation = window.performance.navigation;
      
      const metrics = {
        type: 'navigation',
        timestamp: Date.now(),
        
        // DNS and connection
        dnsLookup: timing.domainLookupEnd - timing.domainLookupStart,
        tcpConnection: timing.connectEnd - timing.connectStart,
        
        // Request and response
        requestTime: timing.responseStart - timing.requestStart,
        responseTime: timing.responseEnd - timing.responseStart,
        
        // DOM processing
        domContentLoaded: timing.domContentLoadedEventEnd - timing.navigationStart,
        domComplete: timing.domComplete - timing.navigationStart,
        
        // Load events
        loadEvent: timing.loadEventEnd - timing.loadEventStart,
        totalLoadTime: timing.loadEventEnd - timing.navigationStart,
        
        // Navigation type
        navigationType: navigation.type,
        redirectCount: navigation.redirectCount
      };
      
      this.recordMetric('navigation-timing', metrics);
      
      if (this.config.enableLogging) {
        console.log('[PerformanceMonitor] Navigation timing:', metrics);
      }
    },
    
    captureResourceTiming(entry) {
      const metrics = {
        type: 'resource',
        timestamp: Date.now(),
        name: entry.name,
        
        // Timing
        duration: entry.duration,
        startTime: entry.startTime,
        
        // Sizes
        transferSize: entry.transferSize || 0,
        encodedBodySize: entry.encodedBodySize || 0,
        decodedBodySize: entry.decodedBodySize || 0,
        
        // Cache
        fromCache: entry.transferSize === 0 && entry.decodedBodySize > 0
      };
      
      this.recordMetric('resource-timing', metrics);
    },
    
    // Manual timing methods
    startTiming(name) {
      const startTime = performance.now();
      this.metrics.set(`${name}-start`, startTime);
      return startTime;
    },
    
    endTiming(name) {
      const endTime = performance.now();
      const startTime = this.metrics.get(`${name}-start`);
      
      if (startTime !== undefined) {
        const duration = endTime - startTime;
        
        this.recordMetric('custom-timing', {
          type: 'custom',
          name: name,
          duration: duration,
          timestamp: Date.now()
        });
        
        // Clean up start time
        this.metrics.delete(`${name}-start`);
        
        if (this.config.enableLogging) {
          console.log(`[PerformanceMonitor] ${name}: ${duration.toFixed(2)}ms`);
        }
        
        return duration;
      }
      
      return null;
    },
    
    // Measure function execution time
    measureFunction(fn, name) {
      const startTime = performance.now();
      const result = fn();
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      this.recordMetric('function-timing', {
        type: 'function',
        name: name,
        duration: duration,
        timestamp: Date.now()
      });
      
      if (this.config.enableLogging) {
        console.log(`[PerformanceMonitor] Function ${name}: ${duration.toFixed(2)}ms`);
      }
      
      return result;
    },
    
    // Measure async function execution time
    async measureAsyncFunction(fn, name) {
      const startTime = performance.now();
      const result = await fn();
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      this.recordMetric('async-function-timing', {
        type: 'async-function',
        name: name,
        duration: duration,
        timestamp: Date.now()
      });
      
      if (this.config.enableLogging) {
        console.log(`[PerformanceMonitor] Async function ${name}: ${duration.toFixed(2)}ms`);
      }
      
      return result;
    },
    
    // Memory usage monitoring
    captureMemoryUsage() {
      if (!window.performance || !window.performance.memory) return null;
      
      const memory = window.performance.memory;
      const metrics = {
        type: 'memory',
        timestamp: Date.now(),
        usedJSHeapSize: memory.usedJSHeapSize,
        totalJSHeapSize: memory.totalJSHeapSize,
        jsHeapSizeLimit: memory.jsHeapSizeLimit,
        usagePercentage: (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100
      };
      
      this.recordMetric('memory-usage', metrics);
      return metrics;
    },
    
    // FPS monitoring
    startFPSMonitoring() {
      let frames = 0;
      let lastTime = performance.now();
      
      const measureFPS = () => {
        frames++;
        const currentTime = performance.now();
        
        if (currentTime >= lastTime + 1000) {
          const fps = frames;
          frames = 0;
          lastTime = currentTime;
          
          this.recordMetric('fps', {
            type: 'fps',
            timestamp: Date.now(),
            fps: fps
          });
          
          if (fps < 30) {
            console.warn('[PerformanceMonitor] Low FPS detected:', fps);
          }
        }
        
        requestAnimationFrame(measureFPS);
      };
      
      requestAnimationFrame(measureFPS);
    },
    
    recordMetric(category, data) {
      const key = `${category}-${Date.now()}`;
      this.metrics.set(key, data);
      
      // Maintain max metrics limit
      if (this.metrics.size > this.config.maxMetrics) {
        const firstKey = this.metrics.keys().next().value;
        this.metrics.delete(firstKey);
      }
      
      // Store metrics
      if (this.config.enableStorage) {
        this.storeMetrics();
      }
      
      // Emit performance event
      if (global.TeamStatsEventBus) {
        global.TeamStatsEventBus.emit('performance:metric', {
          category: category,
          data: data
        });
      }
    },
    
    storeMetrics() {
      try {
        const data = Array.from(this.metrics.entries());
        localStorage.setItem(this.config.storageKey, JSON.stringify(data));
      } catch (error) {
        console.warn('[PerformanceMonitor] Failed to store metrics:', error);
      }
    },
    
    getMetrics(category = null) {
      let metrics = Array.from(this.metrics.entries());
      
      if (category) {
        metrics = metrics.filter(([key, value]) => value.type === category);
      }
      
      return metrics.map(([key, value]) => value);
    },
    
    getAverageMetric(category, field) {
      const metrics = this.getMetrics(category);
      const values = metrics.map(m => m[field]).filter(v => typeof v === 'number');
      
      if (values.length === 0) return 0;
      
      return values.reduce((sum, val) => sum + val, 0) / values.length;
    },
    
    getPerformanceReport() {
      const report = {
        timestamp: new Date().toISOString(),
        navigation: this.getMetrics('navigation'),
        resources: this.getMetrics('resource'),
        custom: this.getMetrics('custom'),
        functions: this.getMetrics('function'),
        memory: this.getMetrics('memory'),
        
        // Averages
        averages: {
          customTiming: this.getAverageMetric('custom', 'duration'),
          functionTiming: this.getAverageMetric('function', 'duration'),
          resourceLoadTime: this.getAverageMetric('resource', 'duration')
        }
      };
      
      return report;
    },
    
    clearMetrics() {
      this.metrics.clear();
      if (this.config.enableStorage) {
        localStorage.removeItem(this.config.storageKey);
      }
      console.log('[PerformanceMonitor] Metrics cleared');
    },
    
    info(message) {
      if (this.config.enableLogging) {
        console.log(message);
      }
    }
  };

  // Global registration
  global.TeamStatsPerformanceMonitor = PerformanceMonitor;
  
  // Auto-initialize
  PerformanceMonitor.init();

})(window);