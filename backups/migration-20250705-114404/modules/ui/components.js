/**
 * Team Stats UI Components Module
 * Reusable UI components and component management
 * @module TeamStatsComponents
 */

(function(global) {
  'use strict';

  // Check dependencies
  if (!global.TeamStatsConstants) {
    console.warn('UI Components works better with Constants module');
  }

  /**
   * Component Registry
   * Manages all registered UI components
   */
  class ComponentRegistry {
    constructor() {
      this.components = new Map();
      this.instances = new WeakMap();
      this.componentId = 0;
    }

    /**
     * Register a component
     * @param {string} name - Component name
     * @param {Object} config - Component configuration
     */
    register(name, config) {
      if (this.components.has(name)) {
        console.warn(`Component "${name}" is already registered`);
        return;
      }

      const component = {
        name,
        template: config.template || '',
        styles: config.styles || '',
        props: config.props || {},
        methods: config.methods || {},
        lifecycle: config.lifecycle || {},
        events: config.events || [],
        ...config
      };

      this.components.set(name, component);
      
      if (global.TeamStatsEventBus) {
        global.TeamStatsEventBus.emit('ui:component:registered', { name, component });
      }
    }

    /**
     * Get component definition
     * @param {string} name - Component name
     * @returns {Object|null} Component definition
     */
    get(name) {
      return this.components.get(name) || null;
    }

    /**
     * Create component instance
     * @param {string} name - Component name
     * @param {Object} props - Component props
     * @returns {Object} Component instance
     */
    create(name, props = {}) {
      const definition = this.get(name);
      if (!definition) {
        throw new Error(`Component "${name}" not found`);
      }

      const instance = {
        id: `${name}-${++this.componentId}`,
        name,
        props: { ...definition.props, ...props },
        state: {},
        element: null,
        mounted: false,
        destroyed: false
      };

      // Bind methods
      Object.keys(definition.methods).forEach(method => {
        instance[method] = definition.methods[method].bind(instance);
      });

      // Initialize state
      if (definition.data) {
        instance.state = typeof definition.data === 'function' 
          ? definition.data.call(instance) 
          : { ...definition.data };
      }

      this.instances.set(instance, definition);
      return instance;
    }

    /**
     * Get all registered components
     * @returns {Array} Component names
     */
    list() {
      return Array.from(this.components.keys());
    }

    /**
     * Check if component exists
     * @param {string} name - Component name
     * @returns {boolean}
     */
    has(name) {
      return this.components.has(name);
    }

    /**
     * Unregister component
     * @param {string} name - Component name
     */
    unregister(name) {
      this.components.delete(name);
    }
  }

  /**
   * Base Component Class
   * Extended by all components
   */
  class Component {
    constructor(config = {}) {
      this.name = config.name || 'unnamed-component';
      this.template = config.template || '';
      this.props = config.props || {};
      this.state = config.state || {};
      this.element = null;
      this.mounted = false;
      this.destroyed = false;
      this._listeners = [];
      this._intervals = [];
      this._timeouts = [];
    }

    /**
     * Render component
     * @returns {string} Rendered HTML
     */
    render() {
      // Process template with props and state
      let html = this.template;
      
      // Simple template engine
      const data = { ...this.props, ...this.state };
      html = html.replace(/\{\{(\w+)\}\}/g, (match, key) => {
        return data[key] || '';
      });

      return html;
    }

    /**
     * Mount component to DOM
     * @param {HTMLElement|string} target - Target element or selector
     */
    mount(target) {
      if (this.mounted) {
        console.warn(`Component ${this.name} is already mounted`);
        return;
      }

      const targetElement = typeof target === 'string' 
        ? document.querySelector(target) 
        : target;

      if (!targetElement) {
        throw new Error('Target element not found');
      }

      // Create wrapper element
      this.element = document.createElement('div');
      this.element.className = `component-${this.name}`;
      this.element.setAttribute('data-component', this.name);
      this.element.setAttribute('data-component-id', this.id);
      
      // Render and insert
      this.element.innerHTML = this.render();
      targetElement.appendChild(this.element);

      this.mounted = true;
      this.onMount();
    }

    /**
     * Update component
     * @param {Object} newState - New state values
     */
    update(newState = {}) {
      const oldState = { ...this.state };
      this.state = { ...this.state, ...newState };

      if (this.mounted && this.element) {
        const newHtml = this.render();
        this.element.innerHTML = newHtml;
        this.onUpdate(oldState, this.state);
      }
    }

    /**
     * Destroy component
     */
    destroy() {
      if (this.destroyed) return;

      this.onBeforeDestroy();

      // Clean up event listeners
      this._listeners.forEach(({ element, event, handler }) => {
        element.removeEventListener(event, handler);
      });

      // Clean up timers
      this._intervals.forEach(clearInterval);
      this._timeouts.forEach(clearTimeout);

      // Remove from DOM
      if (this.element && this.element.parentNode) {
        this.element.parentNode.removeChild(this.element);
      }

      this.mounted = false;
      this.destroyed = true;
      this.onDestroy();
    }

    /**
     * Add event listener (auto-cleanup on destroy)
     */
    addEventListener(element, event, handler, options) {
      element.addEventListener(event, handler, options);
      this._listeners.push({ element, event, handler });
    }

    /**
     * Set interval (auto-cleanup on destroy)
     */
    setInterval(fn, delay) {
      const id = setInterval(fn, delay);
      this._intervals.push(id);
      return id;
    }

    /**
     * Set timeout (auto-cleanup on destroy)
     */
    setTimeout(fn, delay) {
      const id = setTimeout(fn, delay);
      this._timeouts.push(id);
      return id;
    }

    /**
     * Lifecycle hooks (to be overridden)
     */
    onMount() {}
    onUpdate(oldState, newState) {}
    onBeforeDestroy() {}
    onDestroy() {}
  }

  /**
   * Built-in Components
   */
  
  // Loading Spinner Component
  const LoadingSpinner = {
    name: 'loading-spinner',
    template: `
      <div class="loading-spinner">
        <div class="spinner"></div>
        <div class="loading-text">{{text}}</div>
      </div>
    `,
    props: {
      text: 'Loading...',
      size: 'medium'
    },
    styles: `
      .loading-spinner {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 20px;
      }
      .spinner {
        width: 40px;
        height: 40px;
        border: 4px solid rgba(255, 255, 255, 0.1);
        border-left-color: #2196F3;
        border-radius: 50%;
        animation: spin 1s linear infinite;
      }
      .loading-spinner.small .spinner { width: 20px; height: 20px; border-width: 2px; }
      .loading-spinner.large .spinner { width: 60px; height: 60px; border-width: 6px; }
      .loading-text {
        margin-top: 10px;
        color: #666;
      }
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
    `
  };

  // Error Message Component
  const ErrorMessage = {
    name: 'error-message',
    template: `
      <div class="error-message {{type}}">
        <div class="error-icon">{{icon}}</div>
        <div class="error-content">
          <div class="error-title">{{title}}</div>
          <div class="error-details">{{message}}</div>
        </div>
        <button class="error-close" onclick="{{onClose}}">×</button>
      </div>
    `,
    props: {
      type: 'error',
      title: 'Error',
      message: 'An error occurred',
      icon: '⚠️',
      dismissible: true
    },
    styles: `
      .error-message {
        display: flex;
        align-items: center;
        padding: 16px;
        margin: 10px 0;
        border-radius: 8px;
        background: rgba(244, 67, 54, 0.1);
        border: 1px solid rgba(244, 67, 54, 0.3);
        color: #f44336;
      }
      .error-message.warning {
        background: rgba(255, 152, 0, 0.1);
        border-color: rgba(255, 152, 0, 0.3);
        color: #ff9800;
      }
      .error-message.info {
        background: rgba(33, 150, 243, 0.1);
        border-color: rgba(33, 150, 243, 0.3);
        color: #2196F3;
      }
      .error-message.success {
        background: rgba(76, 175, 80, 0.1);
        border-color: rgba(76, 175, 80, 0.3);
        color: #4CAF50;
      }
      .error-icon {
        font-size: 24px;
        margin-right: 12px;
      }
      .error-content {
        flex: 1;
      }
      .error-title {
        font-weight: bold;
        margin-bottom: 4px;
      }
      .error-details {
        font-size: 14px;
        opacity: 0.8;
      }
      .error-close {
        background: none;
        border: none;
        font-size: 24px;
        cursor: pointer;
        opacity: 0.5;
        transition: opacity 0.2s;
      }
      .error-close:hover {
        opacity: 1;
      }
    `
  };

  // Progress Bar Component
  const ProgressBar = {
    name: 'progress-bar',
    template: `
      <div class="progress-bar">
        <div class="progress-label">{{label}}</div>
        <div class="progress-track">
          <div class="progress-fill" style="width: {{percent}}%"></div>
        </div>
        <div class="progress-text">{{percent}}%</div>
      </div>
    `,
    props: {
      label: '',
      percent: 0,
      color: '#2196F3'
    },
    styles: `
      .progress-bar {
        margin: 10px 0;
      }
      .progress-label {
        margin-bottom: 5px;
        font-size: 14px;
        color: #666;
      }
      .progress-track {
        height: 8px;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 4px;
        overflow: hidden;
      }
      .progress-fill {
        height: 100%;
        background: var(--progress-color, #2196F3);
        transition: width 0.3s ease;
      }
      .progress-text {
        margin-top: 5px;
        font-size: 12px;
        color: #666;
        text-align: right;
      }
    `,
    methods: {
      setProgress(percent) {
        this.update({ percent: Math.min(100, Math.max(0, percent)) });
      }
    }
  };

  // Stat Card Component
  const StatCard = {
    name: 'stat-card',
    template: `
      <div class="stat-card {{size}} {{variant}}">
        <div class="stat-header">
          <div class="stat-icon">{{icon}}</div>
          <div class="stat-label">{{label}}</div>
        </div>
        <div class="stat-value">{{value}}</div>
        <div class="stat-footer">
          <div class="stat-change {{changeType}}">
            <span class="change-icon">{{changeIcon}}</span>
            <span class="change-value">{{change}}</span>
          </div>
          <div class="stat-period">{{period}}</div>
        </div>
      </div>
    `,
    props: {
      label: 'Statistic',
      value: '0',
      icon: '📊',
      change: '',
      changeType: 'neutral',
      period: '',
      size: 'medium',
      variant: 'default'
    },
    styles: `
      .stat-card {
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 12px;
        padding: 20px;
        transition: all 0.3s ease;
      }
      .stat-card:hover {
        background: rgba(255, 255, 255, 0.08);
        transform: translateY(-2px);
      }
      .stat-card.small { padding: 12px; }
      .stat-card.large { padding: 28px; }
      
      .stat-header {
        display: flex;
        align-items: center;
        margin-bottom: 12px;
      }
      .stat-icon {
        font-size: 24px;
        margin-right: 8px;
      }
      .stat-label {
        font-size: 14px;
        color: #999;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      
      .stat-value {
        font-size: 32px;
        font-weight: bold;
        margin-bottom: 12px;
      }
      .stat-card.small .stat-value { font-size: 24px; }
      .stat-card.large .stat-value { font-size: 40px; }
      
      .stat-footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 12px;
      }
      
      .stat-change {
        display: flex;
        align-items: center;
      }
      .stat-change.positive { color: #4CAF50; }
      .stat-change.negative { color: #f44336; }
      .stat-change.neutral { color: #999; }
      
      .change-icon {
        margin-right: 4px;
      }
      .stat-period {
        color: #666;
      }
      
      .stat-card.primary {
        background: rgba(33, 150, 243, 0.1);
        border-color: rgba(33, 150, 243, 0.3);
      }
      .stat-card.success {
        background: rgba(76, 175, 80, 0.1);
        border-color: rgba(76, 175, 80, 0.3);
      }
      .stat-card.warning {
        background: rgba(255, 152, 0, 0.1);
        border-color: rgba(255, 152, 0, 0.3);
      }
      .stat-card.danger {
        background: rgba(244, 67, 54, 0.1);
        border-color: rgba(244, 67, 54, 0.3);
      }
    `
  };

  // Filter Button Component
  const FilterButton = {
    name: 'filter-button',
    template: `
      <button class="filter-button {{active ? 'active' : ''}}" data-value="{{value}}">
        {{label}}
      </button>
    `,
    props: {
      label: 'Filter',
      value: '',
      active: false
    },
    styles: `
      .filter-button {
        padding: 8px 16px;
        margin: 0 4px;
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 20px;
        color: #999;
        cursor: pointer;
        transition: all 0.3s ease;
        font-size: 14px;
      }
      .filter-button:hover {
        background: rgba(255, 255, 255, 0.1);
        color: #fff;
      }
      .filter-button.active {
        background: #2196F3;
        border-color: #2196F3;
        color: #fff;
      }
    `,
    methods: {
      toggle() {
        this.update({ active: !this.state.active });
      }
    }
  };

  // Data Table Component
  const DataTable = {
    name: 'data-table',
    template: `
      <div class="data-table-wrapper">
        <table class="data-table {{striped ? 'striped' : ''}} {{hoverable ? 'hoverable' : ''}}">
          <thead>
            <tr>
              {{headers}}
            </tr>
          </thead>
          <tbody>
            {{rows}}
          </tbody>
        </table>
      </div>
    `,
    props: {
      columns: [],
      data: [],
      striped: true,
      hoverable: true,
      sortable: false
    },
    styles: `
      .data-table-wrapper {
        overflow-x: auto;
        border-radius: 8px;
        border: 1px solid rgba(255, 255, 255, 0.1);
      }
      .data-table {
        width: 100%;
        border-collapse: collapse;
      }
      .data-table th,
      .data-table td {
        padding: 12px;
        text-align: left;
      }
      .data-table th {
        background: rgba(255, 255, 255, 0.05);
        font-weight: bold;
        color: #999;
        text-transform: uppercase;
        font-size: 12px;
        letter-spacing: 0.5px;
      }
      .data-table.striped tbody tr:nth-child(even) {
        background: rgba(255, 255, 255, 0.02);
      }
      .data-table.hoverable tbody tr:hover {
        background: rgba(255, 255, 255, 0.05);
      }
      .data-table td {
        border-top: 1px solid rgba(255, 255, 255, 0.05);
      }
    `,
    methods: {
      renderTable() {
        const headers = this.props.columns
          .map(col => `<th>${col.label || col.key}</th>`)
          .join('');
          
        const rows = this.props.data
          .map(row => {
            const cells = this.props.columns
              .map(col => `<td>${row[col.key] || ''}</td>`)
              .join('');
            return `<tr>${cells}</tr>`;
          })
          .join('');
          
        this.update({ headers, rows });
      }
    },
    lifecycle: {
      onMount() {
        this.renderTable();
      },
      onUpdate() {
        this.renderTable();
      }
    }
  };

  // Create component registry
  const registry = new ComponentRegistry();

  // Register built-in components
  registry.register('loading-spinner', LoadingSpinner);
  registry.register('error-message', ErrorMessage);
  registry.register('progress-bar', ProgressBar);
  registry.register('stat-card', StatCard);
  registry.register('filter-button', FilterButton);
  registry.register('data-table', DataTable);

  // Component factory
  const Components = {
    /**
     * Register a new component
     * @param {string} name - Component name
     * @param {Object} config - Component configuration
     */
    register(name, config) {
      registry.register(name, config);
    },

    /**
     * Create component instance
     * @param {string} name - Component name
     * @param {Object} props - Component props
     * @returns {Component} Component instance
     */
    create(name, props = {}) {
      const definition = registry.get(name);
      if (!definition) {
        throw new Error(`Component "${name}" not found`);
      }

      // Create component instance
      const component = new Component({
        name: definition.name,
        template: definition.template,
        props: { ...definition.props, ...props },
        state: definition.data ? 
          (typeof definition.data === 'function' ? definition.data() : { ...definition.data }) : 
          {}
      });

      // Copy methods
      if (definition.methods) {
        Object.keys(definition.methods).forEach(method => {
          component[method] = definition.methods[method].bind(component);
        });
      }

      // Copy lifecycle hooks
      if (definition.lifecycle) {
        Object.keys(definition.lifecycle).forEach(hook => {
          component[hook] = definition.lifecycle[hook].bind(component);
        });
      }

      // Generate unique ID
      component.id = `${name}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      return component;
    },

    /**
     * Get component definition
     * @param {string} name - Component name
     * @returns {Object|null} Component definition
     */
    get(name) {
      return registry.get(name);
    },

    /**
     * Check if component exists
     * @param {string} name - Component name
     * @returns {boolean}
     */
    has(name) {
      return registry.has(name);
    },

    /**
     * List all components
     * @returns {Array} Component names
     */
    list() {
      return registry.list();
    },

    /**
     * Mount component to DOM
     * @param {string} name - Component name
     * @param {HTMLElement|string} target - Target element
     * @param {Object} props - Component props
     * @returns {Component} Mounted component
     */
    mount(name, target, props = {}) {
      const component = this.create(name, props);
      component.mount(target);
      return component;
    },

    /**
     * Inject component styles
     * @param {string} name - Component name
     */
    injectStyles(name) {
      const definition = registry.get(name);
      if (!definition || !definition.styles) return;

      const styleId = `component-styles-${name}`;
      
      // Check if styles already injected
      if (document.getElementById(styleId)) return;

      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = definition.styles;
      document.head.appendChild(style);
    },

    /**
     * Initialize all component styles
     */
    initStyles() {
      registry.list().forEach(name => {
        this.injectStyles(name);
      });
    },

    /**
     * Component base class
     */
    Component,

    /**
     * Registry instance
     */
    registry
  };

  // Auto-inject styles on load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      Components.initStyles();
    });
  } else {
    Components.initStyles();
  }

  // Expose to global scope
  global.TeamStatsComponents = Components;

  // For convenience, expose common components
  global.UIComponents = {
    LoadingSpinner: (props) => Components.create('loading-spinner', props),
    ErrorMessage: (props) => Components.create('error-message', props),
    ProgressBar: (props) => Components.create('progress-bar', props),
    StatCard: (props) => Components.create('stat-card', props),
    FilterButton: (props) => Components.create('filter-button', props),
    DataTable: (props) => Components.create('data-table', props)
  };

  console.log('Team Stats UI Components Module initialized');

})(window);