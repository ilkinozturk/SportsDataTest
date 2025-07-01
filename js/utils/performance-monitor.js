/**
 * PerformanceMonitor - Comprehensive performance monitoring and profiling
 * Tracks rendering, memory usage, and operation timings
 */
export class PerformanceMonitor {
  constructor(options = {}) {
    // Configuration
    this.options = {
      enableProfiling: options.enableProfiling !== false,
      enableMemoryTracking: options.enableMemoryTracking !== false,
      enableRenderTracking: options.enableRenderTracking !== false,
      sampleRate: options.sampleRate || 100, // ms
      maxEntries: options.maxEntries || 1000,
      warningThresholds: {
        renderTime: options.renderWarning || 16.67, // 60fps threshold
        memoryGrowth: options.memoryWarning || 50, // MB
        operationTime: options.operationWarning || 100, // ms
        ...options.warningThresholds
      },
      ...options
    };

    // Performance data storage
    this.metrics = {
      operations: new Map(),
      renders: [],
      memory: [],
      errors: [],
      warnings: []
    };

    // Timing data
    this.activeTimers = new Map();
    this.operationCounts = new Map();
    
    // Memory tracking
    this.lastMemoryCheck = 0;
    this.memoryInterval = null;
    
    // Render tracking
    this.frameCount = 0;
    this.lastFrameTime = 0;
    this.fps = 0;
    
    // Observer for long tasks
    this.longTaskObserver = null;
    
    // Initialize
    this.init();
  }

  /**
   * Initialize performance monitoring
   */
  init() {
    if (this.options.enableMemoryTracking) {
      this.startMemoryTracking();
    }
    
    if (this.options.enableRenderTracking) {
      this.startRenderTracking();
    }
    
    // Setup long task observer if available
    if (window.PerformanceObserver && PerformanceObserver.supportedEntryTypes?.includes('longtask')) {
      this.setupLongTaskObserver();
    }
    
    // Log initialization
    console.log('🎯 Performance Monitor initialized', this.options);
  }

  /**
   * Start timing an operation
   * @param {string} operationName - Name of the operation
   * @param {Object} metadata - Additional metadata
   */
  startOperation(operationName, metadata = {}) {
    if (!this.options.enableProfiling) return;
    
    const startTime = performance.now();
    const timerId = `${operationName}-${Date.now()}-${Math.random()}`;
    
    this.activeTimers.set(timerId, {
      name: operationName,
      startTime,
      metadata,
      startMemory: this.getCurrentMemory()
    });
    
    return timerId;
  }

  /**
   * End timing an operation
   * @param {string} timerId - Timer ID from startOperation
   */
  endOperation(timerId) {
    if (!this.options.enableProfiling) return;
    
    const timer = this.activeTimers.get(timerId);
    if (!timer) return;
    
    const endTime = performance.now();
    const duration = endTime - timer.startTime;
    const endMemory = this.getCurrentMemory();
    const memoryDelta = endMemory - timer.startMemory;
    
    // Store operation data
    if (!this.metrics.operations.has(timer.name)) {
      this.metrics.operations.set(timer.name, []);
    }
    
    const operations = this.metrics.operations.get(timer.name);
    operations.push({
      duration,
      memoryDelta,
      timestamp: Date.now(),
      metadata: timer.metadata
    });
    
    // Maintain max entries
    if (operations.length > this.options.maxEntries) {
      operations.shift();
    }
    
    // Update operation count
    this.operationCounts.set(timer.name, 
      (this.operationCounts.get(timer.name) || 0) + 1
    );
    
    // Check for warnings
    if (duration > this.options.warningThresholds.operationTime) {
      this.addWarning('slow-operation', {
        operation: timer.name,
        duration,
        threshold: this.options.warningThresholds.operationTime
      });
    }
    
    // Cleanup
    this.activeTimers.delete(timerId);
    
    return { duration, memoryDelta };
  }

  /**
   * Measure a function execution
   * @param {string} name - Operation name
   * @param {Function} fn - Function to measure
   * @param {any} context - Function context
   * @param {Array} args - Function arguments
   */
  async measure(name, fn, context = null, args = []) {
    const timerId = this.startOperation(name);
    
    try {
      const result = await fn.apply(context, args);
      this.endOperation(timerId);
      return result;
    } catch (error) {
      this.endOperation(timerId);
      this.addError(name, error);
      throw error;
    }
  }

  /**
   * Decorator for automatic performance measurement
   * @param {string} name - Operation name
   */
  measureDecorator(name) {
    const monitor = this;
    
    return function(target, propertyKey, descriptor) {
      const originalMethod = descriptor.value;
      
      descriptor.value = async function(...args) {
        return monitor.measure(
          name || `${target.constructor.name}.${propertyKey}`,
          originalMethod,
          this,
          args
        );
      };
      
      return descriptor;
    };
  }

  /**
   * Start memory tracking
   */
  startMemoryTracking() {
    if (!performance.memory) {
      console.warn('Performance.memory not available');
      return;
    }
    
    this.memoryInterval = setInterval(() => {
      const memory = this.getCurrentMemory();
      
      this.metrics.memory.push({
        value: memory,
        timestamp: Date.now()
      });
      
      // Maintain max entries
      if (this.metrics.memory.length > this.options.maxEntries) {
        this.metrics.memory.shift();
      }
      
      // Check for memory growth warning
      if (this.metrics.memory.length > 10) {
        const recent = this.metrics.memory.slice(-10);
        const growth = recent[recent.length - 1].value - recent[0].value;
        
        if (growth > this.options.warningThresholds.memoryGrowth) {
          this.addWarning('memory-growth', {
            growth,
            threshold: this.options.warningThresholds.memoryGrowth
          });
        }
      }
    }, this.options.sampleRate);
  }

  /**
   * Start render tracking
   */
  startRenderTracking() {
    const trackFrame = (timestamp) => {
      if (this.lastFrameTime > 0) {
        const delta = timestamp - this.lastFrameTime;
        this.fps = 1000 / delta;
        
        this.metrics.renders.push({
          fps: this.fps,
          frameTime: delta,
          timestamp: Date.now()
        });
        
        // Maintain max entries
        if (this.metrics.renders.length > this.options.maxEntries) {
          this.metrics.renders.shift();
        }
        
        // Check for performance warning
        if (delta > this.options.warningThresholds.renderTime) {
          this.addWarning('slow-render', {
            frameTime: delta,
            fps: this.fps,
            threshold: this.options.warningThresholds.renderTime
          });
        }
      }
      
      this.lastFrameTime = timestamp;
      this.frameCount++;
      
      if (this.options.enableRenderTracking) {
        requestAnimationFrame(trackFrame);
      }
    };
    
    requestAnimationFrame(trackFrame);
  }

  /**
   * Setup long task observer
   */
  setupLongTaskObserver() {
    this.longTaskObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        this.addWarning('long-task', {
          duration: entry.duration,
          startTime: entry.startTime,
          name: entry.name
        });
      }
    });
    
    this.longTaskObserver.observe({ entryTypes: ['longtask'] });
  }

  /**
   * Get current memory usage in MB
   */
  getCurrentMemory() {
    if (!performance.memory) return 0;
    return Math.round(performance.memory.usedJSHeapSize / 1048576);
  }

  /**
   * Add warning
   */
  addWarning(type, data) {
    const warning = {
      type,
      data,
      timestamp: Date.now()
    };
    
    this.metrics.warnings.push(warning);
    
    // Maintain max entries
    if (this.metrics.warnings.length > this.options.maxEntries) {
      this.metrics.warnings.shift();
    }
    
    // Emit warning event
    this.dispatchEvent('warning', warning);
  }

  /**
   * Add error
   */
  addError(operation, error) {
    const errorData = {
      operation,
      message: error.message,
      stack: error.stack,
      timestamp: Date.now()
    };
    
    this.metrics.errors.push(errorData);
    
    // Maintain max entries
    if (this.metrics.errors.length > this.options.maxEntries) {
      this.metrics.errors.shift();
    }
  }

  /**
   * Get performance report
   */
  getReport() {
    const report = {
      summary: this.getSummary(),
      operations: this.getOperationStats(),
      memory: this.getMemoryStats(),
      rendering: this.getRenderStats(),
      warnings: this.metrics.warnings.slice(-10),
      errors: this.metrics.errors.slice(-10)
    };
    
    return report;
  }

  /**
   * Get summary statistics
   */
  getSummary() {
    return {
      totalOperations: Array.from(this.operationCounts.values()).reduce((a, b) => a + b, 0),
      uniqueOperations: this.operationCounts.size,
      currentMemory: this.getCurrentMemory(),
      currentFPS: Math.round(this.fps),
      warningCount: this.metrics.warnings.length,
      errorCount: this.metrics.errors.length
    };
  }

  /**
   * Get operation statistics
   */
  getOperationStats() {
    const stats = {};
    
    this.metrics.operations.forEach((operations, name) => {
      if (operations.length === 0) return;
      
      const durations = operations.map(op => op.duration);
      const sorted = [...durations].sort((a, b) => a - b);
      
      stats[name] = {
        count: this.operationCounts.get(name) || 0,
        avg: durations.reduce((a, b) => a + b, 0) / durations.length,
        min: Math.min(...durations),
        max: Math.max(...durations),
        median: sorted[Math.floor(sorted.length / 2)],
        p95: sorted[Math.floor(sorted.length * 0.95)],
        p99: sorted[Math.floor(sorted.length * 0.99)]
      };
    });
    
    return stats;
  }

  /**
   * Get memory statistics
   */
  getMemoryStats() {
    if (this.metrics.memory.length === 0) return null;
    
    const values = this.metrics.memory.map(m => m.value);
    const recent = values.slice(-100);
    
    return {
      current: values[values.length - 1],
      min: Math.min(...recent),
      max: Math.max(...recent),
      avg: recent.reduce((a, b) => a + b, 0) / recent.length,
      trend: this.calculateTrend(recent)
    };
  }

  /**
   * Get render statistics
   */
  getRenderStats() {
    if (this.metrics.renders.length === 0) return null;
    
    const recent = this.metrics.renders.slice(-100);
    const fps = recent.map(r => r.fps);
    const frameTimes = recent.map(r => r.frameTime);
    
    return {
      currentFPS: Math.round(this.fps),
      avgFPS: Math.round(fps.reduce((a, b) => a + b, 0) / fps.length),
      minFPS: Math.round(Math.min(...fps)),
      maxFPS: Math.round(Math.max(...fps)),
      avgFrameTime: frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length,
      droppedFrames: frameTimes.filter(t => t > 16.67).length
    };
  }

  /**
   * Calculate trend (positive, negative, stable)
   */
  calculateTrend(values) {
    if (values.length < 2) return 'stable';
    
    const firstHalf = values.slice(0, Math.floor(values.length / 2));
    const secondHalf = values.slice(Math.floor(values.length / 2));
    
    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
    
    const change = ((secondAvg - firstAvg) / firstAvg) * 100;
    
    if (change > 5) return 'increasing';
    if (change < -5) return 'decreasing';
    return 'stable';
  }

  /**
   * Log performance report to console
   */
  logReport() {
    const report = this.getReport();
    
    console.group('📊 Performance Report');
    console.table(report.summary);
    
    if (Object.keys(report.operations).length > 0) {
      console.group('Operations');
      console.table(report.operations);
      console.groupEnd();
    }
    
    if (report.memory) {
      console.group('Memory');
      console.table(report.memory);
      console.groupEnd();
    }
    
    if (report.rendering) {
      console.group('Rendering');
      console.table(report.rendering);
      console.groupEnd();
    }
    
    if (report.warnings.length > 0) {
      console.group('Warnings');
      console.table(report.warnings);
      console.groupEnd();
    }
    
    if (report.errors.length > 0) {
      console.group('Errors');
      console.table(report.errors);
      console.groupEnd();
    }
    
    console.groupEnd();
  }

  /**
   * Export metrics for external analysis
   */
  exportMetrics() {
    return {
      timestamp: Date.now(),
      options: this.options,
      metrics: {
        operations: Object.fromEntries(this.metrics.operations),
        renders: this.metrics.renders,
        memory: this.metrics.memory,
        warnings: this.metrics.warnings,
        errors: this.metrics.errors
      },
      stats: this.getReport()
    };
  }

  /**
   * Clear all metrics
   */
  clearMetrics() {
    this.metrics.operations.clear();
    this.metrics.renders = [];
    this.metrics.memory = [];
    this.metrics.warnings = [];
    this.metrics.errors = [];
    this.operationCounts.clear();
  }

  /**
   * Dispatch custom event
   */
  dispatchEvent(eventName, detail) {
    if (typeof window !== 'undefined') {
      const event = new CustomEvent(`performance-${eventName}`, {
        detail,
        bubbles: true
      });
      window.dispatchEvent(event);
    }
  }

  /**
   * Destroy the monitor
   */
  destroy() {
    if (this.memoryInterval) {
      clearInterval(this.memoryInterval);
    }
    
    if (this.longTaskObserver) {
      this.longTaskObserver.disconnect();
    }
    
    this.options.enableRenderTracking = false;
    this.clearMetrics();
  }
}

// Create singleton instance
const performanceMonitor = new PerformanceMonitor();

// Export singleton
export default performanceMonitor;