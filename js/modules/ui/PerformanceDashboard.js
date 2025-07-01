/**
 * PerformanceDashboard - Visual performance monitoring dashboard
 * Displays real-time performance metrics in an overlay
 */
import performanceMonitor from '../../utils/performance-monitor.js';

export class PerformanceDashboard {
  constructor(options = {}) {
    this.options = {
      position: options.position || 'bottom-right',
      theme: options.theme || 'dark',
      refreshRate: options.refreshRate || 1000,
      collapsed: options.collapsed !== false,
      opacity: options.opacity || 0.9,
      ...options
    };

    // State
    this.isVisible = false;
    this.isCollapsed = this.options.collapsed;
    this.refreshInterval = null;

    // DOM elements
    this.container = null;
    this.content = null;
    
    // Bind methods
    this.toggle = this.toggle.bind(this);
    this.refresh = this.refresh.bind(this);
    this.handleKeyPress = this.handleKeyPress.bind(this);
  }

  /**
   * Initialize the dashboard
   */
  init() {
    this.createDOM();
    this.attachEventListeners();
    
    // Start refreshing if visible
    if (this.isVisible && !this.isCollapsed) {
      this.startRefreshing();
    }
    
    return this;
  }

  /**
   * Create DOM structure
   */
  createDOM() {
    // Create container
    this.container = document.createElement('div');
    this.container.className = `performance-dashboard ${this.options.theme}`;
    this.container.style.cssText = `
      position: fixed;
      ${this.getPositionStyles()}
      width: 320px;
      max-height: 500px;
      background: ${this.options.theme === 'dark' ? '#1a1a1a' : '#ffffff'};
      border: 1px solid ${this.options.theme === 'dark' ? '#333' : '#ddd'};
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
      font-size: 12px;
      color: ${this.options.theme === 'dark' ? '#fff' : '#000'};
      opacity: ${this.options.opacity};
      z-index: 9999;
      display: ${this.isVisible ? 'block' : 'none'};
      transition: all 0.3s ease;
    `;

    // Create header
    const header = document.createElement('div');
    header.className = 'performance-dashboard-header';
    header.style.cssText = `
      padding: 8px 12px;
      background: ${this.options.theme === 'dark' ? '#2a2a2a' : '#f5f5f5'};
      border-bottom: 1px solid ${this.options.theme === 'dark' ? '#333' : '#ddd'};
      cursor: move;
      user-select: none;
      display: flex;
      justify-content: space-between;
      align-items: center;
    `;

    // Title
    const title = document.createElement('span');
    title.textContent = '📊 Performance Monitor';
    title.style.fontWeight = 'bold';

    // Controls
    const controls = document.createElement('div');
    controls.style.display = 'flex';
    controls.style.gap = '8px';

    // Collapse button
    const collapseBtn = document.createElement('button');
    collapseBtn.textContent = this.isCollapsed ? '▼' : '▲';
    collapseBtn.style.cssText = `
      background: none;
      border: none;
      color: inherit;
      cursor: pointer;
      padding: 0 4px;
      font-size: 10px;
    `;
    collapseBtn.onclick = () => this.toggleCollapse();

    // Close button
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '✕';
    closeBtn.style.cssText = `
      background: none;
      border: none;
      color: inherit;
      cursor: pointer;
      padding: 0 4px;
    `;
    closeBtn.onclick = () => this.hide();

    controls.appendChild(collapseBtn);
    controls.appendChild(closeBtn);
    header.appendChild(title);
    header.appendChild(controls);

    // Create content area
    this.content = document.createElement('div');
    this.content.className = 'performance-dashboard-content';
    this.content.style.cssText = `
      padding: 12px;
      overflow-y: auto;
      max-height: 400px;
      display: ${this.isCollapsed ? 'none' : 'block'};
    `;

    // Assemble
    this.container.appendChild(header);
    this.container.appendChild(this.content);
    document.body.appendChild(this.container);

    // Make draggable
    this.makeDraggable(header);
  }

  /**
   * Get position styles based on options
   */
  getPositionStyles() {
    const positions = {
      'top-left': 'top: 20px; left: 20px;',
      'top-right': 'top: 20px; right: 20px;',
      'bottom-left': 'bottom: 20px; left: 20px;',
      'bottom-right': 'bottom: 20px; right: 20px;'
    };
    return positions[this.options.position] || positions['bottom-right'];
  }

  /**
   * Make the dashboard draggable
   */
  makeDraggable(handle) {
    let isDragging = false;
    let startX, startY, initialX, initialY;

    handle.addEventListener('mousedown', (e) => {
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
      
      const rect = this.container.getBoundingClientRect();
      initialX = rect.left;
      initialY = rect.top;
      
      document.body.style.userSelect = 'none';
    });

    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      
      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;
      
      this.container.style.left = `${initialX + deltaX}px`;
      this.container.style.top = `${initialY + deltaY}px`;
      this.container.style.right = 'auto';
      this.container.style.bottom = 'auto';
    });

    document.addEventListener('mouseup', () => {
      isDragging = false;
      document.body.style.userSelect = '';
    });
  }

  /**
   * Attach event listeners
   */
  attachEventListeners() {
    // Keyboard shortcut (Ctrl+Shift+P)
    document.addEventListener('keydown', this.handleKeyPress);

    // Listen for performance warnings
    window.addEventListener('performance-warning', (e) => {
      if (this.isVisible && !this.isCollapsed) {
        this.showWarning(e.detail);
      }
    });
  }

  /**
   * Handle keyboard shortcuts
   */
  handleKeyPress(e) {
    if (e.ctrlKey && e.shiftKey && e.key === 'P') {
      e.preventDefault();
      this.toggle();
    }
  }

  /**
   * Toggle dashboard visibility
   */
  toggle() {
    if (this.isVisible) {
      this.hide();
    } else {
      this.show();
    }
  }

  /**
   * Show dashboard
   */
  show() {
    this.isVisible = true;
    this.container.style.display = 'block';
    
    if (!this.isCollapsed) {
      this.startRefreshing();
    }
  }

  /**
   * Hide dashboard
   */
  hide() {
    this.isVisible = false;
    this.container.style.display = 'none';
    this.stopRefreshing();
  }

  /**
   * Toggle collapse state
   */
  toggleCollapse() {
    this.isCollapsed = !this.isCollapsed;
    this.content.style.display = this.isCollapsed ? 'none' : 'block';
    
    const collapseBtn = this.container.querySelector('button');
    collapseBtn.textContent = this.isCollapsed ? '▼' : '▲';
    
    if (this.isCollapsed) {
      this.stopRefreshing();
    } else {
      this.startRefreshing();
    }
  }

  /**
   * Start refreshing metrics
   */
  startRefreshing() {
    this.refresh();
    this.refreshInterval = setInterval(this.refresh, this.options.refreshRate);
  }

  /**
   * Stop refreshing metrics
   */
  stopRefreshing() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
  }

  /**
   * Refresh dashboard content
   */
  refresh() {
    const report = performanceMonitor.getReport();
    
    this.content.innerHTML = `
      ${this.renderSummary(report.summary)}
      ${this.renderMemory(report.memory)}
      ${this.renderRendering(report.rendering)}
      ${this.renderOperations(report.operations)}
      ${this.renderWarnings(report.warnings)}
    `;
  }

  /**
   * Render summary section
   */
  renderSummary(summary) {
    return `
      <div class="section">
        <div class="section-title">📈 Summary</div>
        <div class="metrics">
          <div class="metric">
            <span class="label">Operations:</span>
            <span class="value">${summary.totalOperations}</span>
          </div>
          <div class="metric">
            <span class="label">Memory:</span>
            <span class="value">${summary.currentMemory} MB</span>
          </div>
          <div class="metric">
            <span class="label">FPS:</span>
            <span class="value ${summary.currentFPS < 30 ? 'warning' : ''}">${summary.currentFPS}</span>
          </div>
          <div class="metric">
            <span class="label">Warnings:</span>
            <span class="value ${summary.warningCount > 0 ? 'warning' : ''}">${summary.warningCount}</span>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Render memory section
   */
  renderMemory(memory) {
    if (!memory) return '';
    
    const trendIcon = {
      'increasing': '📈',
      'decreasing': '📉',
      'stable': '➡️'
    };
    
    return `
      <div class="section">
        <div class="section-title">💾 Memory</div>
        <div class="metrics">
          <div class="metric">
            <span class="label">Current:</span>
            <span class="value">${memory.current} MB</span>
          </div>
          <div class="metric">
            <span class="label">Range:</span>
            <span class="value">${memory.min}-${memory.max} MB</span>
          </div>
          <div class="metric">
            <span class="label">Trend:</span>
            <span class="value">${trendIcon[memory.trend]} ${memory.trend}</span>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Render rendering section
   */
  renderRendering(rendering) {
    if (!rendering) return '';
    
    return `
      <div class="section">
        <div class="section-title">🎮 Rendering</div>
        <div class="metrics">
          <div class="metric">
            <span class="label">Avg FPS:</span>
            <span class="value ${rendering.avgFPS < 30 ? 'warning' : ''}">${rendering.avgFPS}</span>
          </div>
          <div class="metric">
            <span class="label">Frame Time:</span>
            <span class="value">${rendering.avgFrameTime.toFixed(2)} ms</span>
          </div>
          <div class="metric">
            <span class="label">Dropped:</span>
            <span class="value ${rendering.droppedFrames > 0 ? 'warning' : ''}">${rendering.droppedFrames}</span>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Render operations section
   */
  renderOperations(operations) {
    const entries = Object.entries(operations).slice(0, 5);
    if (entries.length === 0) return '';
    
    const rows = entries.map(([name, stats]) => `
      <tr>
        <td class="op-name">${name}</td>
        <td>${stats.count}</td>
        <td>${stats.avg.toFixed(1)}</td>
        <td>${stats.p95.toFixed(1)}</td>
      </tr>
    `).join('');
    
    return `
      <div class="section">
        <div class="section-title">⚡ Top Operations</div>
        <table class="operations-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Count</th>
              <th>Avg(ms)</th>
              <th>P95(ms)</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      </div>
    `;
  }

  /**
   * Render warnings section
   */
  renderWarnings(warnings) {
    if (warnings.length === 0) return '';
    
    const items = warnings.slice(-3).reverse().map(warning => `
      <div class="warning-item">
        <span class="warning-type">${warning.type}</span>
        <span class="warning-time">${new Date(warning.timestamp).toLocaleTimeString()}</span>
      </div>
    `).join('');
    
    return `
      <div class="section">
        <div class="section-title">⚠️ Recent Warnings</div>
        ${items}
      </div>
    `;
  }

  /**
   * Show warning notification
   */
  showWarning(warning) {
    // Flash the dashboard border
    const originalBorder = this.container.style.border;
    this.container.style.border = '2px solid #ff6b6b';
    
    setTimeout(() => {
      this.container.style.border = originalBorder;
    }, 500);
  }

  /**
   * Inject styles
   */
  static injectStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .performance-dashboard * {
        box-sizing: border-box;
      }
      
      .performance-dashboard .section {
        margin-bottom: 12px;
        padding-bottom: 12px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      }
      
      .performance-dashboard .section:last-child {
        border-bottom: none;
        margin-bottom: 0;
      }
      
      .performance-dashboard .section-title {
        font-weight: bold;
        margin-bottom: 8px;
        font-size: 13px;
      }
      
      .performance-dashboard .metrics {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 8px;
      }
      
      .performance-dashboard .metric {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      
      .performance-dashboard .label {
        color: #888;
      }
      
      .performance-dashboard .value {
        font-weight: bold;
      }
      
      .performance-dashboard .value.warning {
        color: #ff6b6b;
      }
      
      .performance-dashboard .operations-table {
        width: 100%;
        font-size: 11px;
        border-collapse: collapse;
      }
      
      .performance-dashboard .operations-table th,
      .performance-dashboard .operations-table td {
        padding: 4px 8px;
        text-align: left;
        border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      }
      
      .performance-dashboard .operations-table th {
        font-weight: bold;
        color: #888;
      }
      
      .performance-dashboard .op-name {
        font-family: monospace;
        font-size: 10px;
      }
      
      .performance-dashboard .warning-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 4px 0;
        font-size: 11px;
      }
      
      .performance-dashboard .warning-type {
        color: #ff6b6b;
        font-weight: bold;
      }
      
      .performance-dashboard .warning-time {
        color: #666;
        font-size: 10px;
      }
      
      .performance-dashboard.light {
        color: #000;
      }
      
      .performance-dashboard.light .label {
        color: #666;
      }
      
      .performance-dashboard.light .section {
        border-bottom-color: rgba(0, 0, 0, 0.1);
      }
      
      .performance-dashboard.light .operations-table th,
      .performance-dashboard.light .operations-table td {
        border-bottom-color: rgba(0, 0, 0, 0.05);
      }
      
      .performance-dashboard.light .warning-time {
        color: #999;
      }
    `;
    
    document.head.appendChild(style);
  }

  /**
   * Destroy the dashboard
   */
  destroy() {
    this.stopRefreshing();
    document.removeEventListener('keydown', this.handleKeyPress);
    
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
  }
}

// Auto-inject styles
if (typeof document !== 'undefined') {
  PerformanceDashboard.injectStyles();
}

export default PerformanceDashboard;