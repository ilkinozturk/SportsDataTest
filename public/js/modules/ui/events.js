/**
 * Team Stats UI Events Module
 * Advanced event handling, delegation, and gesture support
 * @module TeamStatsUIEvents
 */

(function (global) {
  'use strict';

  // Check dependencies
  if (!global.TeamStatsEventBus) {
    console.warn('UI Events works better with Event Bus module');
  }

  /**
   * Event Handler Registry
   * Manages event handlers with automatic cleanup
   */
  class HandlerRegistry {
    constructor() {
      this.handlers = new Map();
      this.delegatedHandlers = new Map();
      this.globalHandlers = new Map();
    }

    /**
     * Register a handler
     * @param {string} id - Handler ID
     * @param {Object} config - Handler configuration
     */
    register(id, config) {
      this.handlers.set(id, {
        element: config.element,
        event: config.event,
        handler: config.handler,
        options: config.options || false,
        active: false,
      });
    }

    /**
     * Activate a handler
     * @param {string} id - Handler ID
     */
    activate(id) {
      const handler = this.handlers.get(id);
      if (handler && !handler.active) {
        handler.element.addEventListener(handler.event, handler.handler, handler.options);
        handler.active = true;
      }
    }

    /**
     * Deactivate a handler
     * @param {string} id - Handler ID
     */
    deactivate(id) {
      const handler = this.handlers.get(id);
      if (handler && handler.active) {
        handler.element.removeEventListener(handler.event, handler.handler, handler.options);
        handler.active = false;
      }
    }

    /**
     * Remove a handler
     * @param {string} id - Handler ID
     */
    remove(id) {
      this.deactivate(id);
      this.handlers.delete(id);
    }

    /**
     * Clear all handlers
     */
    clear() {
      this.handlers.forEach((handler, id) => {
        this.deactivate(id);
      });
      this.handlers.clear();
    }
  }

  /**
   * Gesture Detector
   * Detects common gestures like swipe, pinch, tap
   */
  class GestureDetector {
    constructor(element, options = {}) {
      this.element = element;
      this.options = {
        swipeThreshold: options.swipeThreshold || 50,
        swipeTimeout: options.swipeTimeout || 300,
        tapTimeout: options.tapTimeout || 200,
        doubleTapTimeout: options.doubleTapTimeout || 300,
        longPressTimeout: options.longPressTimeout || 500,
        ...options,
      };

      this.touches = [];
      this.lastTap = 0;
      this.tapTimer = null;
      this.longPressTimer = null;
      this.isPinching = false;
      this.startDistance = 0;

      this._bindEvents();
    }

    /**
     * Bind touch events
     * @private
     */
    _bindEvents() {
      this.element.addEventListener('touchstart', this._onTouchStart.bind(this), {
        passive: false,
      });
      this.element.addEventListener('touchmove', this._onTouchMove.bind(this), { passive: false });
      this.element.addEventListener('touchend', this._onTouchEnd.bind(this), { passive: false });
      this.element.addEventListener('touchcancel', this._onTouchCancel.bind(this), {
        passive: false,
      });
    }

    /**
     * Handle touch start
     * @private
     */
    _onTouchStart(e) {
      this.touches = Array.from(e.touches);

      if (this.touches.length === 1) {
        const touch = this.touches[0];
        this.startX = touch.clientX;
        this.startY = touch.clientY;
        this.startTime = Date.now();

        // Long press detection
        this.longPressTimer = setTimeout(() => {
          this._emit('longpress', {
            x: this.startX,
            y: this.startY,
            target: e.target,
          });
        }, this.options.longPressTimeout);
      } else if (this.touches.length === 2) {
        // Pinch detection
        this.isPinching = true;
        this.startDistance = this._getDistance(this.touches[0], this.touches[1]);
      }
    }

    /**
     * Handle touch move
     * @private
     */
    _onTouchMove(e) {
      if (this.longPressTimer) {
        clearTimeout(this.longPressTimer);
        this.longPressTimer = null;
      }

      this.touches = Array.from(e.touches);

      if (this.isPinching && this.touches.length === 2) {
        const distance = this._getDistance(this.touches[0], this.touches[1]);
        const scale = distance / this.startDistance;

        this._emit('pinch', {
          scale,
          distance,
          center: this._getCenter(this.touches[0], this.touches[1]),
        });
      }
    }

    /**
     * Handle touch end
     * @private
     */
    _onTouchEnd(e) {
      if (this.longPressTimer) {
        clearTimeout(this.longPressTimer);
        this.longPressTimer = null;
      }

      if (this.touches.length === 1) {
        const touch = this.touches[0];
        const deltaX = touch.clientX - this.startX;
        const deltaY = touch.clientY - this.startY;
        const deltaTime = Date.now() - this.startTime;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

        // Swipe detection
        if (distance > this.options.swipeThreshold && deltaTime < this.options.swipeTimeout) {
          const direction = this._getSwipeDirection(deltaX, deltaY);
          this._emit('swipe', {
            direction,
            distance,
            velocity: distance / deltaTime,
            deltaX,
            deltaY,
          });
        }
        // Tap detection
        else if (distance < 10 && deltaTime < this.options.tapTimeout) {
          const now = Date.now();

          // Double tap detection
          if (now - this.lastTap < this.options.doubleTapTimeout) {
            if (this.tapTimer) {
              clearTimeout(this.tapTimer);
              this.tapTimer = null;
            }
            this._emit('doubletap', {
              x: touch.clientX,
              y: touch.clientY,
              target: e.target,
            });
          } else {
            // Single tap (with delay to check for double tap)
            this.tapTimer = setTimeout(() => {
              this._emit('tap', {
                x: touch.clientX,
                y: touch.clientY,
                target: e.target,
              });
            }, this.options.doubleTapTimeout);
          }

          this.lastTap = now;
        }
      }

      this.touches = [];
      this.isPinching = false;
    }

    /**
     * Handle touch cancel
     * @private
     */
    _onTouchCancel() {
      if (this.longPressTimer) {
        clearTimeout(this.longPressTimer);
        this.longPressTimer = null;
      }
      if (this.tapTimer) {
        clearTimeout(this.tapTimer);
        this.tapTimer = null;
      }
      this.touches = [];
      this.isPinching = false;
    }

    /**
     * Get swipe direction
     * @private
     */
    _getSwipeDirection(deltaX, deltaY) {
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        return deltaX > 0 ? 'right' : 'left';
      } else {
        return deltaY > 0 ? 'down' : 'up';
      }
    }

    /**
     * Get distance between two touches
     * @private
     */
    _getDistance(touch1, touch2) {
      const dx = touch1.clientX - touch2.clientX;
      const dy = touch1.clientY - touch2.clientY;
      return Math.sqrt(dx * dx + dy * dy);
    }

    /**
     * Get center point between two touches
     * @private
     */
    _getCenter(touch1, touch2) {
      return {
        x: (touch1.clientX + touch2.clientX) / 2,
        y: (touch1.clientY + touch2.clientY) / 2,
      };
    }

    /**
     * Emit gesture event
     * @private
     */
    _emit(type, detail) {
      const event = new CustomEvent(`gesture:${type}`, {
        detail,
        bubbles: true,
        cancelable: true,
      });
      this.element.dispatchEvent(event);

      // Also emit to Event Bus if available
      if (global.TeamStatsEventBus) {
        global.TeamStatsEventBus.emit(`ui:gesture:${type}`, {
          element: this.element,
          ...detail,
        });
      }
    }

    /**
     * Destroy gesture detector
     */
    destroy() {
      this.element.removeEventListener('touchstart', this._onTouchStart);
      this.element.removeEventListener('touchmove', this._onTouchMove);
      this.element.removeEventListener('touchend', this._onTouchEnd);
      this.element.removeEventListener('touchcancel', this._onTouchCancel);

      if (this.longPressTimer) {
        clearTimeout(this.longPressTimer);
      }
      if (this.tapTimer) {
        clearTimeout(this.tapTimer);
      }
    }
  }

  /**
   * Event Delegation Manager
   * Efficient event handling for dynamic content
   */
  class DelegationManager {
    constructor() {
      this.delegates = new Map();
    }

    /**
     * Add delegated event listener
     * @param {HTMLElement} container - Container element
     * @param {string} event - Event name
     * @param {string} selector - CSS selector
     * @param {Function} handler - Event handler
     * @param {Object} options - Event options
     */
    on(container, event, selector, handler, options = {}) {
      const key = `${event}:${selector}`;

      if (!this.delegates.has(container)) {
        this.delegates.set(container, new Map());
      }

      const containerDelegates = this.delegates.get(container);

      if (!containerDelegates.has(key)) {
        const delegatedHandler = e => {
          const target = e.target.closest(selector);
          if (target && container.contains(target)) {
            handler.call(target, e);
          }
        };

        container.addEventListener(event, delegatedHandler, options);
        containerDelegates.set(key, { handler: delegatedHandler, options });
      }
    }

    /**
     * Remove delegated event listener
     * @param {HTMLElement} container - Container element
     * @param {string} event - Event name
     * @param {string} selector - CSS selector
     */
    off(container, event, selector) {
      const key = `${event}:${selector}`;
      const containerDelegates = this.delegates.get(container);

      if (containerDelegates && containerDelegates.has(key)) {
        const { handler, options } = containerDelegates.get(key);
        container.removeEventListener(event, handler, options);
        containerDelegates.delete(key);

        if (containerDelegates.size === 0) {
          this.delegates.delete(container);
        }
      }
    }

    /**
     * Clear all delegates for a container
     * @param {HTMLElement} container - Container element
     */
    clear(container) {
      const containerDelegates = this.delegates.get(container);

      if (containerDelegates) {
        containerDelegates.forEach(({ handler, options }, key) => {
          const [event] = key.split(':');
          container.removeEventListener(event, handler, options);
        });

        this.delegates.delete(container);
      }
    }

    /**
     * Clear all delegates
     */
    clearAll() {
      this.delegates.forEach((containerDelegates, container) => {
        this.clear(container);
      });
    }
  }

  /**
   * Keyboard Shortcuts Manager
   */
  class ShortcutsManager {
    constructor() {
      this.shortcuts = new Map();
      this.enabled = true;
      this._boundHandler = this._handleKeyDown.bind(this);
      document.addEventListener('keydown', this._boundHandler);
    }

    /**
     * Register a keyboard shortcut
     * @param {string} combo - Key combination (e.g., 'ctrl+s', 'cmd+shift+p')
     * @param {Function} handler - Handler function
     * @param {Object} options - Options
     */
    register(combo, handler, options = {}) {
      const normalizedCombo = this._normalizeCombo(combo);
      this.shortcuts.set(normalizedCombo, {
        handler,
        description: options.description || '',
        preventDefault: options.preventDefault !== false,
        stopPropagation: options.stopPropagation !== false,
        when: options.when || (() => true),
      });
    }

    /**
     * Unregister a shortcut
     * @param {string} combo - Key combination
     */
    unregister(combo) {
      const normalizedCombo = this._normalizeCombo(combo);
      this.shortcuts.delete(normalizedCombo);
    }

    /**
     * Enable/disable shortcuts
     * @param {boolean} enabled - Enable state
     */
    setEnabled(enabled) {
      this.enabled = enabled;
    }

    /**
     * Handle keydown events
     * @private
     */
    _handleKeyDown(e) {
      if (!this.enabled) return;

      // Skip if in input/textarea
      const tagName = e.target.tagName.toLowerCase();
      if (tagName === 'input' || tagName === 'textarea' || e.target.contentEditable === 'true') {
        return;
      }

      const combo = this._getComboFromEvent(e);
      const shortcut = this.shortcuts.get(combo);

      if (shortcut && shortcut.when()) {
        if (shortcut.preventDefault) {
          e.preventDefault();
        }
        if (shortcut.stopPropagation) {
          e.stopPropagation();
        }

        shortcut.handler(e);

        // Emit event
        if (global.TeamStatsEventBus) {
          global.TeamStatsEventBus.emit('ui:shortcut:triggered', {
            combo,
            description: shortcut.description,
          });
        }
      }
    }

    /**
     * Normalize key combination
     * @private
     */
    _normalizeCombo(combo) {
      return combo.toLowerCase().replace(/\s+/g, '').split('+').sort().join('+');
    }

    /**
     * Get combo from keyboard event
     * @private
     */
    _getComboFromEvent(e) {
      const parts = [];

      if (e.ctrlKey || e.metaKey) parts.push('ctrl');
      if (e.altKey) parts.push('alt');
      if (e.shiftKey) parts.push('shift');

      // Get the key
      let key = e.key.toLowerCase();
      if (key === ' ') key = 'space';
      if (key === 'escape') key = 'esc';
      if (key.length === 1) {
        parts.push(key);
      } else {
        parts.push(key);
      }

      return parts.sort().join('+');
    }

    /**
     * Get all registered shortcuts
     * @returns {Array} Shortcut list
     */
    getShortcuts() {
      const shortcuts = [];
      this.shortcuts.forEach((config, combo) => {
        shortcuts.push({
          combo,
          description: config.description,
        });
      });
      return shortcuts;
    }

    /**
     * Destroy shortcuts manager
     */
    destroy() {
      document.removeEventListener('keydown', this._boundHandler);
      this.shortcuts.clear();
    }
  }

  /**
   * Main UI Events Manager
   */
  class UIEvents {
    constructor() {
      this.registry = new HandlerRegistry();
      this.delegation = new DelegationManager();
      this.shortcuts = new ShortcutsManager();
      this.gestures = new WeakMap();
      this.throttledHandlers = new WeakMap();
      this.debouncedHandlers = new WeakMap();
    }

    /**
     * Add event listener with auto-cleanup
     * @param {HTMLElement|string} element - Element or selector
     * @param {string} event - Event name
     * @param {Function} handler - Event handler
     * @param {Object} options - Options
     * @returns {Function} Cleanup function
     */
    on(element, event, handler, options = {}) {
      const el = typeof element === 'string' ? document.querySelector(element) : element;
      if (!el) return () => {};

      const id = `handler-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Apply throttle/debounce if specified
      let processedHandler = handler;
      if (options.throttle) {
        processedHandler = this.throttle(handler, options.throttle);
      } else if (options.debounce) {
        processedHandler = this.debounce(handler, options.debounce);
      }

      this.registry.register(id, {
        element: el,
        event,
        handler: processedHandler,
        options: options.capture || options.passive || options.once ? options : false,
      });

      this.registry.activate(id);

      // Return cleanup function
      return () => this.registry.remove(id);
    }

    /**
     * Add delegated event listener
     * @param {HTMLElement|string} container - Container element
     * @param {string} event - Event name
     * @param {string} selector - CSS selector
     * @param {Function} handler - Event handler
     * @param {Object} options - Options
     */
    delegate(container, event, selector, handler, options = {}) {
      const el = typeof container === 'string' ? document.querySelector(container) : container;
      if (!el) return;

      this.delegation.on(el, event, selector, handler, options);
    }

    /**
     * Remove delegated event listener
     * @param {HTMLElement|string} container - Container element
     * @param {string} event - Event name
     * @param {string} selector - CSS selector
     */
    undelegate(container, event, selector) {
      const el = typeof container === 'string' ? document.querySelector(container) : container;
      if (!el) return;

      this.delegation.off(el, event, selector);
    }

    /**
     * Add one-time event listener
     * @param {HTMLElement|string} element - Element or selector
     * @param {string} event - Event name
     * @param {Function} handler - Event handler
     * @returns {Promise} Promise that resolves when event fires
     */
    once(element, event, handler) {
      return new Promise(resolve => {
        const cleanup = this.on(element, event, e => {
          cleanup();
          if (handler) handler(e);
          resolve(e);
        });
      });
    }

    /**
     * Wait for event
     * @param {HTMLElement|string} element - Element or selector
     * @param {string} event - Event name
     * @param {number} timeout - Timeout in ms
     * @returns {Promise} Promise that resolves with event or rejects on timeout
     */
    waitFor(element, event, timeout = 5000) {
      return Promise.race([
        this.once(element, event),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Event timeout')), timeout)),
      ]);
    }

    /**
     * Enable gesture detection on element
     * @param {HTMLElement|string} element - Element or selector
     * @param {Object} options - Gesture options
     * @returns {GestureDetector} Gesture detector instance
     */
    enableGestures(element, options = {}) {
      const el = typeof element === 'string' ? document.querySelector(element) : element;
      if (!el) return null;

      let detector = this.gestures.get(el);
      if (!detector) {
        detector = new GestureDetector(el, options);
        this.gestures.set(el, detector);
      }

      return detector;
    }

    /**
     * Disable gesture detection
     * @param {HTMLElement|string} element - Element or selector
     */
    disableGestures(element) {
      const el = typeof element === 'string' ? document.querySelector(element) : element;
      if (!el) return;

      const detector = this.gestures.get(el);
      if (detector) {
        detector.destroy();
        this.gestures.delete(el);
      }
    }

    /**
     * Register keyboard shortcut
     * @param {string} combo - Key combination
     * @param {Function} handler - Handler function
     * @param {Object} options - Options
     */
    shortcut(combo, handler, options) {
      this.shortcuts.register(combo, handler, options);
    }

    /**
     * Remove keyboard shortcut
     * @param {string} combo - Key combination
     */
    removeShortcut(combo) {
      this.shortcuts.unregister(combo);
    }

    /**
     * Get all shortcuts
     * @returns {Array} Shortcuts list
     */
    getShortcuts() {
      return this.shortcuts.getShortcuts();
    }

    /**
     * Throttle function
     * @param {Function} fn - Function to throttle
     * @param {number} delay - Delay in ms
     * @returns {Function} Throttled function
     */
    throttle(fn, delay) {
      let throttled = this.throttledHandlers.get(fn);

      if (!throttled) {
        let lastCall = 0;
        let timeout = null;

        throttled = function (...args) {
          const now = Date.now();
          const timeSinceLastCall = now - lastCall;

          if (timeSinceLastCall >= delay) {
            lastCall = now;
            fn.apply(this, args);
          } else {
            clearTimeout(timeout);
            timeout = setTimeout(() => {
              lastCall = Date.now();
              fn.apply(this, args);
            }, delay - timeSinceLastCall);
          }
        };

        throttled.cancel = () => clearTimeout(timeout);
        this.throttledHandlers.set(fn, throttled);
      }

      return throttled;
    }

    /**
     * Debounce function
     * @param {Function} fn - Function to debounce
     * @param {number} delay - Delay in ms
     * @returns {Function} Debounced function
     */
    debounce(fn, delay) {
      let debounced = this.debouncedHandlers.get(fn);

      if (!debounced) {
        let timeout = null;

        debounced = function (...args) {
          clearTimeout(timeout);
          timeout = setTimeout(() => {
            fn.apply(this, args);
          }, delay);
        };

        debounced.cancel = () => clearTimeout(timeout);
        debounced.flush = () => {
          clearTimeout(timeout);
          fn.apply(this, arguments);
        };

        this.debouncedHandlers.set(fn, debounced);
      }

      return debounced;
    }

    /**
     * Track element visibility
     * @param {HTMLElement|string} element - Element or selector
     * @param {Function} callback - Visibility change callback
     * @param {Object} options - Intersection observer options
     * @returns {Function} Cleanup function
     */
    observeVisibility(element, callback, options = {}) {
      const el = typeof element === 'string' ? document.querySelector(element) : element;
      if (!el) return () => {};

      const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          callback(entry.isIntersecting, entry);
        });
      }, options);

      observer.observe(el);

      return () => observer.disconnect();
    }

    /**
     * Track element resize
     * @param {HTMLElement|string} element - Element or selector
     * @param {Function} callback - Resize callback
     * @returns {Function} Cleanup function
     */
    observeResize(element, callback) {
      const el = typeof element === 'string' ? document.querySelector(element) : element;
      if (!el) return () => {};

      const observer = new ResizeObserver(entries => {
        entries.forEach(entry => {
          callback(entry.contentRect, entry);
        });
      });

      observer.observe(el);

      return () => observer.disconnect();
    }

    /**
     * Clear all event handlers
     */
    clear() {
      this.registry.clear();
      this.delegation.clearAll();
      this.gestures.forEach(detector => detector.destroy());
      this.gestures = new WeakMap();
    }

    /**
     * Destroy UI Events manager
     */
    destroy() {
      this.clear();
      this.shortcuts.destroy();
    }
  }

  // Create singleton instance
  const uiEvents = new UIEvents();

  // Register default shortcuts
  uiEvents.shortcut(
    'alt+h',
    () => {
      console.log('UI Events shortcuts:', uiEvents.getShortcuts());
    },
    { description: 'Show shortcuts help' }
  );

  // Expose to global scope
  global.TeamStatsUIEvents = uiEvents;

  // Convenience shortcuts
  global.UIEvents = {
    on: uiEvents.on.bind(uiEvents),
    off: id => uiEvents.registry.remove(id),
    once: uiEvents.once.bind(uiEvents),
    delegate: uiEvents.delegate.bind(uiEvents),
    shortcut: uiEvents.shortcut.bind(uiEvents),
    throttle: uiEvents.throttle.bind(uiEvents),
    debounce: uiEvents.debounce.bind(uiEvents),
  };

  console.log('Team Stats UI Events Module initialized');
})(window);
