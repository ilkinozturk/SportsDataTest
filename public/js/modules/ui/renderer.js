/**
 * Team Stats UI Renderer Module
 * Efficient DOM rendering and virtual DOM-like updates
 * @module TeamStatsRenderer
 */

(function (global) {
  'use strict';

  // Check dependencies
  if (!global.TeamStatsComponents) {
  }

  /**
   * Virtual Node representation
   */
  class VNode {
    constructor(type, props, children) {
      this.type = type;
      this.props = props || {};
      this.children = children || [];
      this.key = (props && props.key) || null;
    }
  }

  /**
   * DOM Differ
   * Calculates minimal DOM updates
   */
  class DOMDiffer {
    /**
     * Diff two virtual nodes
     * @param {VNode} oldNode - Old virtual node
     * @param {VNode} newNode - New virtual node
     * @returns {Array} Patch operations
     */
    diff(oldNode, newNode) {
      const patches = [];

      if (!oldNode && newNode) {
        patches.push({ type: 'CREATE', node: newNode });
      } else if (oldNode && !newNode) {
        patches.push({ type: 'REMOVE' });
      } else if (this.isDifferentNode(oldNode, newNode)) {
        patches.push({ type: 'REPLACE', node: newNode });
      } else if (newNode) {
        // Diff props
        const propPatches = this.diffProps(oldNode.props, newNode.props);
        if (propPatches.length > 0) {
          patches.push({ type: 'UPDATE_PROPS', props: propPatches });
        }

        // Diff children
        const childPatches = this.diffChildren(oldNode.children, newNode.children);
        if (childPatches.length > 0) {
          patches.push({ type: 'UPDATE_CHILDREN', children: childPatches });
        }
      }

      return patches;
    }

    /**
     * Check if nodes are different types
     */
    isDifferentNode(node1, node2) {
      return node1.type !== node2.type || (typeof node1 === 'string' && node1 !== node2);
    }

    /**
     * Diff properties
     */
    diffProps(oldProps, newProps) {
      const patches = [];
      const allProps = new Set([...Object.keys(oldProps || {}), ...Object.keys(newProps || {})]);

      allProps.forEach(prop => {
        const oldVal = oldProps && oldProps[prop];
        const newVal = newProps && newProps[prop];

        if (oldVal !== newVal) {
          patches.push({ prop, value: newVal });
        }
      });

      return patches;
    }

    /**
     * Diff children with key support
     */
    diffChildren(oldChildren, newChildren) {
      const patches = [];
      const maxLength = Math.max(oldChildren.length, newChildren.length);

      for (let i = 0; i < maxLength; i++) {
        const childPatches = this.diff(oldChildren[i], newChildren[i]);
        if (childPatches.length > 0) {
          patches.push({ index: i, patches: childPatches });
        }
      }

      return patches;
    }
  }

  /**
   * Template Engine
   * Compiles and renders templates
   */
  class TemplateEngine {
    constructor() {
      this.cache = new Map();
      this.helpers = new Map();
      this.partials = new Map();

      // Register default helpers
      this.registerHelper('if', (condition, options) => {
        return condition ? options.fn() : options.inverse ? options.inverse() : '';
      });

      this.registerHelper('unless', (condition, options) => {
        return !condition ? options.fn() : options.inverse ? options.inverse() : '';
      });

      this.registerHelper('each', (array, options) => {
        if (!Array.isArray(array)) return '';
        return array
          .map((item, index) => {
            return options.fn(item);
          })
          .join('');
      });

      this.registerHelper('eq', (a, b) => a === b);
      this.registerHelper('ne', (a, b) => a !== b);
      this.registerHelper('gt', (a, b) => a > b);
      this.registerHelper('gte', (a, b) => a >= b);
      this.registerHelper('lt', (a, b) => a < b);
      this.registerHelper('lte', (a, b) => a <= b);

      this.registerHelper('formatNumber', (num, decimals = 0) => {
        return Number(num).toFixed(decimals);
      });

      this.registerHelper('formatPercent', num => {
        const value = Number(num);
        return `${Math.round(value)}%`;
      });

      this.registerHelper('formatDate', date => {
        return new Date(date).toLocaleDateString();
      });
    }

    /**
     * Compile template to function
     * @param {string} template - Template string
     * @returns {Function} Compiled template function
     */
    compile(template) {
      if (this.cache.has(template)) {
        return this.cache.get(template);
      }

      const compiled = this._compileTemplate(template);
      this.cache.set(template, compiled);
      return compiled;
    }

    /**
     * Internal template compiler
     * @private
     */
    _compileTemplate(template) {
      return data => {
        let result = template;

        // Replace partials {{> partialName}}
        result = result.replace(/\{\{>\s*(\w+)\s*\}\}/g, (match, partial) => {
          return this.partials.get(partial) || '';
        });

        // Replace helpers {{#helper arg1 arg2}}...{{/helper}}
        result = result.replace(
          /\{\{#(\w+)\s*([^}]*)\}\}([\s\S]*?)\{\{\/\1\}\}/g,
          (match, helper, args, content) => {
            const helperFn = this.helpers.get(helper);
            if (!helperFn) return match;

            const parsedArgs = this._parseArgs(args, data);
            const options = {
              fn: context => this._compileTemplate(content)(context || data),
              inverse: () => '',
              hash: {},
              data: data,
            };

            return helperFn(...parsedArgs, options);
          }
        );

        // Replace variables {{variable}} or {{helper arg1 arg2}}
        result = result.replace(/\{\{([^}]+)\}\}/g, (match, expression) => {
          const trimmed = expression.trim();

          // Skip if it's part of a block helper
          if (trimmed.startsWith('#') || trimmed.startsWith('/')) {
            return match;
          }

          // Check if it's a helper call
          const parts = trimmed.split(/\s+/);
          if (this.helpers.has(parts[0])) {
            const helper = this.helpers.get(parts[0]);
            const args = parts.length > 1 ? this._parseArgs(parts.slice(1).join(' '), data) : [];
            return helper(...args);
          }

          // Simple variable
          return this._getValue(trimmed, data);
        });

        return result;
      };
    }

    /**
     * Parse helper arguments
     * @private
     */
    _parseArgs(argsStr, data) {
      if (!argsStr) return [];

      // Handle helper calls in parentheses like (eq value 5)
      if (argsStr.startsWith('(') && argsStr.endsWith(')')) {
        const innerExpr = argsStr.slice(1, -1);
        const parts = innerExpr.split(/\s+/);
        const helperName = parts[0];

        if (this.helpers.has(helperName)) {
          const helper = this.helpers.get(helperName);
          const helperArgs = this._parseArgs(parts.slice(1).join(' '), data);
          return [helper(...helperArgs)];
        }
      }

      const args = [];
      const regex = /(?:[^\s"']+|"[^"]*"|'[^']*')+/g;
      let match;

      while ((match = regex.exec(argsStr)) !== null) {
        let arg = match[0];

        // Remove quotes if present
        if (
          (arg.startsWith('"') && arg.endsWith('"')) ||
          (arg.startsWith("'") && arg.endsWith("'"))
        ) {
          arg = arg.slice(1, -1);
        } else if (!isNaN(arg)) {
          arg = Number(arg);
        } else if (arg === 'true') {
          arg = true;
        } else if (arg === 'false') {
          arg = false;
        } else {
          // Variable reference
          arg = this._getValue(arg, data);
        }

        args.push(arg);
      }

      return args;
    }

    /**
     * Get value from data object using dot notation
     * @private
     */
    _getValue(path, data) {
      const keys = path.split('.');
      let value = data;

      for (const key of keys) {
        if (value && typeof value === 'object' && key in value) {
          value = value[key];
        } else {
          return '';
        }
      }

      return value ?? '';
    }

    /**
     * Register helper function
     * @param {string} name - Helper name
     * @param {Function} fn - Helper function
     */
    registerHelper(name, fn) {
      this.helpers.set(name, fn);
    }

    /**
     * Register partial template
     * @param {string} name - Partial name
     * @param {string} template - Partial template
     */
    registerPartial(name, template) {
      this.partials.set(name, template);
    }

    /**
     * Render template with data
     * @param {string} template - Template string
     * @param {Object} data - Template data
     * @returns {string} Rendered HTML
     */
    render(template, data) {
      const compiled = this.compile(template);
      return compiled(data);
    }
  }

  /**
   * Render Queue
   * Batches DOM updates for performance
   */
  class RenderQueue {
    constructor() {
      this.queue = [];
      this.scheduled = false;
      this.rendering = false;
    }

    /**
     * Add render task to queue
     * @param {Function} task - Render task
     */
    add(task) {
      this.queue.push(task);
      this.scheduleRender();
    }

    /**
     * Schedule render on next animation frame
     * @private
     */
    scheduleRender() {
      if (this.scheduled || this.rendering) return;

      this.scheduled = true;
      requestAnimationFrame(() => {
        this.flush();
      });
    }

    /**
     * Execute all queued renders
     * @private
     */
    flush() {
      if (this.rendering) return;

      this.rendering = true;
      this.scheduled = false;

      const tasks = this.queue.slice();
      this.queue = [];

      tasks.forEach(task => {
        try {
          task();
        } catch (error) {
        }
      });

      this.rendering = false;

      // Check if new tasks were added during rendering
      if (this.queue.length > 0) {
        this.scheduleRender();
      }
    }

    /**
     * Clear render queue
     */
    clear() {
      this.queue = [];
      this.scheduled = false;
    }
  }

  /**
   * Main Renderer Class
   */
  class Renderer {
    constructor() {
      this.vdom = new Map();
      this.differ = new DOMDiffer();
      this.templateEngine = new TemplateEngine();
      this.renderQueue = new RenderQueue();
      this.components = new Map();
      this.refs = new Map();
    }

    /**
     * Create virtual node
     * @param {string} type - Element type
     * @param {Object} props - Element properties
     * @param {...any} children - Child elements
     * @returns {VNode} Virtual node
     */
    h(type, props, ...children) {
      const flatChildren = children
        .flat(Infinity)
        .filter(child => child != null && child !== false);

      return new VNode(type, props, flatChildren);
    }

    /**
     * Render virtual node to real DOM
     * @param {VNode|string} vnode - Virtual node
     * @returns {HTMLElement|Text} DOM element
     */
    createElement(vnode) {
      if (typeof vnode === 'string' || typeof vnode === 'number') {
        return document.createTextNode(vnode);
      }

      const element = document.createElement(vnode.type);

      // Set properties
      Object.entries(vnode.props || {}).forEach(([key, value]) => {
        this.setProp(element, key, value);
      });

      // Append children
      vnode.children.forEach(child => {
        element.appendChild(this.createElement(child));
      });

      // Store ref if provided
      if (vnode.props && vnode.props.ref) {
        this.refs.set(vnode.props.ref, element);
      }

      return element;
    }

    /**
     * Set property on element
     * @param {HTMLElement} element - DOM element
     * @param {string} key - Property key
     * @param {any} value - Property value
     */
    setProp(element, key, value) {
      if (key === 'className') {
        element.className = value;
      } else if (key === 'style' && typeof value === 'object') {
        Object.assign(element.style, value);
      } else if (key.startsWith('on')) {
        const event = key.toLowerCase().substring(2);
        element.addEventListener(event, value);
      } else if (key === 'ref') {
        // Ref is handled in createElement
      } else if (value === true) {
        element.setAttribute(key, '');
      } else if (value === false || value == null) {
        element.removeAttribute(key);
      } else {
        element.setAttribute(key, value);
      }
    }

    /**
     * Apply patches to DOM
     * @param {HTMLElement} parent - Parent element
     * @param {Array} patches - Patch operations
     * @param {number} index - Child index
     */
    applyPatches(parent, patches, index = 0) {
      patches.forEach(patch => {
        switch (patch.type) {
          case 'CREATE':
            parent.appendChild(this.createElement(patch.node));
            break;

          case 'REMOVE':
            if (parent.childNodes[index]) {
              parent.removeChild(parent.childNodes[index]);
            }
            break;

          case 'REPLACE':
            if (parent.childNodes[index]) {
              parent.replaceChild(this.createElement(patch.node), parent.childNodes[index]);
            }
            break;

          case 'UPDATE_PROPS':
            const element = parent.childNodes[index];
            if (element && element.nodeType === 1) {
              patch.props.forEach(({ prop, value }) => {
                this.setProp(element, prop, value);
              });
            }
            break;

          case 'UPDATE_CHILDREN':
            const parentElement = parent.childNodes[index];
            if (parentElement && parentElement.nodeType === 1) {
              patch.children.forEach(childPatch => {
                this.applyPatches(parentElement, childPatch.patches, childPatch.index);
              });
            }
            break;
        }
      });
    }

    /**
     * Render component or vnode to container
     * @param {VNode|Function|Object} component - Component or vnode
     * @param {HTMLElement|string} container - Container element
     */
    render(component, container) {
      const containerEl =
        typeof container === 'string' ? document.querySelector(container) : container;

      if (!containerEl) {
        throw new Error('Container not found');
      }

      this.renderQueue.add(() => {
        let vnode;

        // Handle different component types
        if (typeof component === 'function') {
          vnode = component();
        } else if (component && component.render) {
          vnode = component.render();
        } else {
          vnode = component;
        }

        const oldVNode = this.vdom.get(containerEl);

        if (!oldVNode) {
          // Initial render
          containerEl.innerHTML = '';
          containerEl.appendChild(this.createElement(vnode));
        } else {
          // Update render
          const patches = this.differ.diff(oldVNode, vnode);
          this.applyPatches(containerEl, patches);
        }

        this.vdom.set(containerEl, vnode);
      });
    }

    /**
     * Render template with data
     * @param {string} template - Template string
     * @param {Object} data - Template data
     * @param {HTMLElement|string} container - Container element
     */
    renderTemplate(template, data, container) {
      const html = this.templateEngine.render(template, data);
      const containerEl =
        typeof container === 'string' ? document.querySelector(container) : container;

      if (!containerEl) {
        throw new Error('Container not found');
      }

      this.renderQueue.add(() => {
        containerEl.innerHTML = html;

        if (global.TeamStatsEventBus) {
          global.TeamStatsEventBus.emit('ui:rendered', {
            container: containerEl,
            template,
            data,
          });
        }
      });
    }

    /**
     * Register template helper
     * @param {string} name - Helper name
     * @param {Function} fn - Helper function
     */
    registerHelper(name, fn) {
      this.templateEngine.registerHelper(name, fn);
    }

    /**
     * Register template partial
     * @param {string} name - Partial name
     * @param {string} template - Partial template
     */
    registerPartial(name, template) {
      this.templateEngine.registerPartial(name, template);
    }

    /**
     * Get element by ref
     * @param {string} ref - Reference name
     * @returns {HTMLElement|null}
     */
    getRef(ref) {
      return this.refs.get(ref) || null;
    }

    /**
     * Clear refs
     */
    clearRefs() {
      this.refs.clear();
    }

    /**
     * Create render function for reactive updates
     * @param {Function} renderFn - Render function
     * @param {HTMLElement|string} container - Container element
     * @returns {Function} Update function
     */
    createRenderer(renderFn, container) {
      let mounted = false;

      const update = data => {
        const vnode = renderFn(data);
        this.render(vnode, container);

        if (!mounted) {
          mounted = true;
          if (global.TeamStatsEventBus) {
            global.TeamStatsEventBus.emit('ui:component:mounted', { container });
          }
        }
      };

      // Auto-update on state changes if State Manager is available
      if (global.TeamStatsStateManager) {
        const unsubscribe = global.TeamStatsStateManager.subscribe('*', () => {
          const state = global.TeamStatsStateManager.getState();
          update(state);
        });

        // Return update function with cleanup
        update.destroy = () => {
          unsubscribe();
          const containerEl =
            typeof container === 'string' ? document.querySelector(container) : container;
          if (containerEl) {
            containerEl.innerHTML = '';
            this.vdom.delete(containerEl);
          }
        };
      }

      return update;
    }

    /**
     * Batch render multiple updates
     * @param {Function} fn - Function containing render calls
     */
    batch(fn) {
      fn();
      this.renderQueue.flush();
    }
  }

  // Create singleton instance
  const renderer = new Renderer();

  // Register common helpers
  renderer.registerHelper('classNames', (...classes) => {
    return classes.filter(Boolean).join(' ');
  });

  renderer.registerHelper('style', styles => {
    if (typeof styles === 'object') {
      return Object.entries(styles)
        .map(([key, value]) => `${key}: ${value}`)
        .join('; ');
    }
    return styles;
  });

  renderer.registerHelper('json', data => {
    return JSON.stringify(data, null, 2);
  });

  // Register common partials
  renderer.registerPartial('loading', '<div class="loading">Loading...</div>');
  renderer.registerPartial('error', '<div class="error">{{message}}</div>');

  // Expose to global scope
  global.TeamStatsRenderer = renderer;

  // Convenience shortcuts
  global.h = renderer.h.bind(renderer);
  global.render = renderer.render.bind(renderer);
  global.renderTemplate = renderer.renderTemplate.bind(renderer);

})(window);
