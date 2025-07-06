/**
 * ErrorHandler - Global error handling and logging system
 */
export class ErrorHandler {
  constructor() {
    this.errors = [];
    this.maxErrors = 100; // Maximum errors to keep in memory
    this.listeners = [];
    this.isDevelopment = window.location.hostname === 'localhost' || 
                        window.location.hostname === '127.0.0.1';
    this.errorPanel = null;
    
    // Setup global error handlers
    this.setupGlobalHandler();
    
    // Create error panel if in development
    if (this.isDevelopment) {
      this.createErrorPanel();
    }
  }

  /**
   * Setup global error handlers
   */
  setupGlobalHandler() {
    // Handle regular JavaScript errors
    window.addEventListener('error', (event) => {
      this.logError({
        type: 'error',
        message: event.message,
        source: event.filename,
        line: event.lineno,
        column: event.colno,
        error: event.error,
        stack: event.error?.stack,
        timestamp: new Date().toISOString()
      });
      
      // Prevent default error handling in development
      if (this.isDevelopment) {
        event.preventDefault();
      }
    });
    
    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.logError({
        type: 'unhandledRejection',
        message: 'Unhandled Promise Rejection',
        reason: event.reason,
        promise: event.promise,
        stack: event.reason?.stack,
        timestamp: new Date().toISOString()
      });
      
      // Prevent default rejection handling in development
      if (this.isDevelopment) {
        event.preventDefault();
      }
    });
    
    // Override console.error to capture all errors
    const originalError = console.error;
    console.error = (...args) => {
      this.logError({
        type: 'console.error',
        message: args.join(' '),
        args: args,
        timestamp: new Date().toISOString(),
        stack: new Error().stack
      });
      
      // Call original console.error
      originalError.apply(console, args);
    };
  }

  /**
   * Log an error
   * @param {Object} error - Error details
   */
  logError(error) {
    // Add to errors array
    this.errors.push(error);
    
    // Keep only last N errors
    if (this.errors.length > this.maxErrors) {
      this.errors.shift();
    }
    
    // Console output with styling
    const styles = {
      error: 'color: #ff6b6b; font-weight: bold;',
      unhandledRejection: 'color: #ff9f43; font-weight: bold;',
      'console.error': 'color: #ee5a6f; font-weight: bold;'
    };
    
    console.log(`%c🚨 ${error.type || 'Error'}`, styles[error.type] || styles.error);
    console.log('Message:', error.message);
    
    if (error.source) {
      console.log(`Source: ${error.source}:${error.line}:${error.column}`);
    }
    
    if (error.stack) {
      console.log('Stack trace:', error.stack);
    }
    
    // Update error panel if in development
    if (this.isDevelopment && this.errorPanel) {
      this.updateErrorPanel();
    }
    
    // Notify listeners
    this.notifyListeners(error);
  }

  /**
   * Create development error panel
   */
  createErrorPanel() {
    // Create panel container
    this.errorPanel = document.createElement('div');
    this.errorPanel.id = 'error-panel';
    this.errorPanel.innerHTML = `
      <style>
        #error-panel {
          position: fixed;
          bottom: 20px;
          right: 20px;
          width: 400px;
          max-height: 500px;
          background: rgba(0, 0, 0, 0.9);
          border: 2px solid #ff6b6b;
          border-radius: 8px;
          color: #fff;
          font-family: 'Consolas', 'Monaco', monospace;
          font-size: 12px;
          z-index: 999999;
          display: none;
          box-shadow: 0 4px 20px rgba(255, 107, 107, 0.3);
        }
        
        #error-panel.has-errors {
          display: block;
        }
        
        #error-panel-header {
          background: #ff6b6b;
          padding: 10px 15px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          cursor: move;
        }
        
        #error-panel-title {
          font-weight: bold;
          font-size: 14px;
        }
        
        #error-panel-controls {
          display: flex;
          gap: 10px;
        }
        
        #error-panel-controls button {
          background: transparent;
          border: 1px solid #fff;
          color: #fff;
          padding: 2px 8px;
          border-radius: 3px;
          cursor: pointer;
          font-size: 11px;
        }
        
        #error-panel-controls button:hover {
          background: rgba(255, 255, 255, 0.2);
        }
        
        #error-panel-body {
          max-height: 400px;
          overflow-y: auto;
          padding: 10px;
        }
        
        .error-item {
          background: rgba(255, 107, 107, 0.1);
          border: 1px solid rgba(255, 107, 107, 0.3);
          border-radius: 4px;
          padding: 10px;
          margin-bottom: 10px;
        }
        
        .error-item:last-child {
          margin-bottom: 0;
        }
        
        .error-type {
          color: #ff9f43;
          font-weight: bold;
          margin-bottom: 5px;
        }
        
        .error-message {
          color: #fff;
          margin-bottom: 5px;
          word-wrap: break-word;
        }
        
        .error-source {
          color: #94a3b8;
          font-size: 11px;
          margin-bottom: 5px;
        }
        
        .error-stack {
          color: #64748b;
          font-size: 10px;
          white-space: pre-wrap;
          max-height: 100px;
          overflow-y: auto;
          margin-top: 5px;
          padding: 5px;
          background: rgba(0, 0, 0, 0.3);
          border-radius: 3px;
        }
        
        .error-time {
          color: #64748b;
          font-size: 10px;
          text-align: right;
        }
        
        #error-panel-minimized {
          position: fixed;
          bottom: 20px;
          right: 20px;
          background: #ff6b6b;
          color: #fff;
          padding: 10px 15px;
          border-radius: 20px;
          cursor: pointer;
          display: none;
          box-shadow: 0 2px 10px rgba(255, 107, 107, 0.5);
          z-index: 999999;
        }
        
        #error-panel-minimized.visible {
          display: block;
        }
        
        #error-count {
          background: #fff;
          color: #ff6b6b;
          padding: 2px 6px;
          border-radius: 10px;
          margin-left: 5px;
          font-weight: bold;
        }
      </style>
      
      <div id="error-panel-header">
        <span id="error-panel-title">🚨 Error Console</span>
        <div id="error-panel-controls">
          <button onclick="errorHandler.clearErrors()">Clear</button>
          <button onclick="errorHandler.minimizePanel()">_</button>
          <button onclick="errorHandler.closePanel()">×</button>
        </div>
      </div>
      <div id="error-panel-body"></div>
    `;
    
    // Create minimized button
    const minimized = document.createElement('div');
    minimized.id = 'error-panel-minimized';
    minimized.innerHTML = '🚨 Errors <span id="error-count">0</span>';
    minimized.onclick = () => this.restorePanel();
    
    // Add to document
    document.body.appendChild(this.errorPanel);
    document.body.appendChild(minimized);
    
    // Make panel draggable
    this.makeDraggable(this.errorPanel);
  }

  /**
   * Update error panel with current errors
   */
  updateErrorPanel() {
    if (!this.errorPanel) return;
    
    const body = document.getElementById('error-panel-body');
    const errorCount = document.getElementById('error-count');
    
    if (!body) return;
    
    // Update error count
    if (errorCount) {
      errorCount.textContent = this.errors.length;
    }
    
    // Show panel if has errors
    if (this.errors.length > 0) {
      this.errorPanel.classList.add('has-errors');
      
      // Update body content
      body.innerHTML = this.errors
        .slice(-10) // Show last 10 errors
        .reverse() // Most recent first
        .map(error => `
          <div class="error-item">
            <div class="error-type">${error.type || 'Error'}</div>
            <div class="error-message">${this.escapeHtml(error.message || 'Unknown error')}</div>
            ${error.source ? `<div class="error-source">${error.source}:${error.line}:${error.column}</div>` : ''}
            ${error.stack ? `<div class="error-stack">${this.escapeHtml(error.stack)}</div>` : ''}
            <div class="error-time">${new Date(error.timestamp).toLocaleTimeString()}</div>
          </div>
        `).join('');
    } else {
      this.errorPanel.classList.remove('has-errors');
      body.innerHTML = '<div style="text-align: center; color: #64748b;">No errors</div>';
    }
  }

  /**
   * Make element draggable
   */
  makeDraggable(element) {
    const header = element.querySelector('#error-panel-header');
    let isDragging = false;
    let currentX;
    let currentY;
    let initialX;
    let initialY;
    let xOffset = 0;
    let yOffset = 0;

    header.addEventListener('mousedown', (e) => {
      initialX = e.clientX - xOffset;
      initialY = e.clientY - yOffset;
      
      if (e.target === header || e.target.id === 'error-panel-title') {
        isDragging = true;
      }
    });

    document.addEventListener('mousemove', (e) => {
      if (isDragging) {
        e.preventDefault();
        currentX = e.clientX - initialX;
        currentY = e.clientY - initialY;
        xOffset = currentX;
        yOffset = currentY;

        element.style.transform = `translate(${currentX}px, ${currentY}px)`;
      }
    });

    document.addEventListener('mouseup', () => {
      isDragging = false;
    });
  }

  /**
   * Clear all errors
   */
  clearErrors() {
    this.errors = [];
    this.updateErrorPanel();
    console.log('🧹 Error console cleared');
  }

  /**
   * Minimize error panel
   */
  minimizePanel() {
    if (this.errorPanel) {
      this.errorPanel.style.display = 'none';
      const minimized = document.getElementById('error-panel-minimized');
      if (minimized && this.errors.length > 0) {
        minimized.classList.add('visible');
      }
    }
  }

  /**
   * Restore error panel
   */
  restorePanel() {
    if (this.errorPanel) {
      this.errorPanel.style.display = 'block';
      const minimized = document.getElementById('error-panel-minimized');
      if (minimized) {
        minimized.classList.remove('visible');
      }
    }
  }

  /**
   * Close error panel
   */
  closePanel() {
    if (this.errorPanel) {
      this.errorPanel.style.display = 'none';
    }
  }

  /**
   * Add error listener
   * @param {Function} callback - Callback function
   */
  on(callback) {
    this.listeners.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(callback);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Notify all listeners
   */
  notifyListeners(error) {
    this.listeners.forEach(callback => {
      try {
        callback(error);
      } catch (e) {
        console.warn('Error in error listener:', e);
      }
    });
  }

  /**
   * Get all errors
   */
  getErrors() {
    return [...this.errors];
  }

  /**
   * Get errors by type
   */
  getErrorsByType(type) {
    return this.errors.filter(e => e.type === type);
  }

  /**
   * Get error summary
   */
  getSummary() {
    const summary = {
      total: this.errors.length,
      byType: {}
    };
    
    this.errors.forEach(error => {
      const type = error.type || 'unknown';
      summary.byType[type] = (summary.byType[type] || 0) + 1;
    });
    
    return summary;
  }

  /**
   * Export errors to JSON
   */
  exportErrors() {
    const data = {
      errors: this.errors,
      summary: this.getSummary(),
      exported: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `errors-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  /**
   * Escape HTML to prevent XSS
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Test error handling
   */
  test() {
    console.log('🧪 Testing error handler...');
    
    // Test regular error
    setTimeout(() => {
      throw new Error('Test error from ErrorHandler');
    }, 100);
    
    // Test promise rejection
    setTimeout(() => {
      Promise.reject('Test promise rejection');
    }, 200);
    
    // Test console.error
    setTimeout(() => {
      console.error('Test console error');
    }, 300);
  }
}

// Create and export singleton instance
const errorHandler = new ErrorHandler();

// Make available globally for development
if (typeof window !== 'undefined') {
  window.errorHandler = errorHandler;
}

export default errorHandler;