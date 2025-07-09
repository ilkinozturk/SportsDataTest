/**
 * Tooltip Module
 * Handles tooltip functionality for the team stats application
 */

(function (global) {
  'use strict';

  const TooltipManager = {
    initialized: false,
    activeTooltip: null,
    tooltips: new Map(),

    init() {
      if (this.initialized) return;

      this.addClosestPolyfill();
      this.bindEvents();
      this.createTooltipContainer();

      this.initialized = true;
      console.log('[TooltipManager] Initialized');
    },

    // Polyfill for closest() method
    addClosestPolyfill() {
      if (!Element.prototype.closest) {
        Element.prototype.closest = function (s) {
          var el = this;
          do {
            if (el.matches && el.matches(s)) return el;
            el = el.parentElement || el.parentNode;
          } while (el !== null && el.nodeType === 1);
          return null;
        };
      }
    },

    // Safe closest method that handles edge cases
    findClosest(element, selector) {
      if (!element || !element.closest) {
        // Fallback for elements without closest method
        let el = element;
        while (el && el.nodeType === 1) {
          if (el.matches && el.matches(selector)) {
            return el;
          }
          el = el.parentElement;
        }
        return null;
      }
      return element.closest(selector);
    },

    bindEvents() {
      // Handle tooltip triggers
      document.addEventListener('mouseenter', e => {
        const trigger = this.findClosest(e.target, '[data-tooltip]');
        if (trigger) {
          this.showTooltip(trigger);
        }
      });

      document.addEventListener('mouseleave', e => {
        const trigger = this.findClosest(e.target, '[data-tooltip]');
        if (trigger) {
          this.hideTooltip();
        }
      });

      // Handle focus events for accessibility
      document.addEventListener(
        'focus',
        e => {
          const trigger = this.findClosest(e.target, '[data-tooltip]');
          if (trigger) {
            this.showTooltip(trigger);
          }
        },
        true
      );

      document.addEventListener(
        'blur',
        e => {
          const trigger = this.findClosest(e.target, '[data-tooltip]');
          if (trigger) {
            this.hideTooltip();
          }
        },
        true
      );

      // Hide tooltip on scroll
      document.addEventListener(
        'scroll',
        () => {
          this.hideTooltip();
        },
        true
      );
    },

    createTooltipContainer() {
      if (document.getElementById('tooltip-container')) return;

      const container = document.createElement('div');
      container.id = 'tooltip-container';
      container.className = 'tooltip-container';
      container.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        z-index: 10000;
        pointer-events: none;
        opacity: 0;
        transition: opacity 0.2s ease;
      `;

      document.body.appendChild(container);
      this.container = container;
    },

    showTooltip(trigger) {
      const content = trigger.dataset.tooltip;
      const placement = trigger.dataset.tooltipPlacement || 'top';
      const delay = parseInt(trigger.dataset.tooltipDelay) || 300;

      if (!content || this.activeTooltip === trigger) return;

      // Clear any existing timeout
      if (this.showTimeout) {
        clearTimeout(this.showTimeout);
      }

      this.showTimeout = setTimeout(() => {
        this.displayTooltip(trigger, content, placement);
      }, delay);
    },

    displayTooltip(trigger, content, placement) {
      if (!this.container) return;

      this.activeTooltip = trigger;

      // Create tooltip content
      this.container.innerHTML = `
        <div class="tooltip-content">
          <div class="tooltip-text">${content}</div>
          <div class="tooltip-arrow"></div>
        </div>
      `;

      // Position tooltip
      this.positionTooltip(trigger, placement);

      // Show tooltip
      this.container.style.opacity = '1';

      // Add accessible attributes
      const tooltipId = 'tooltip-' + Date.now();
      this.container.id = tooltipId;
      trigger.setAttribute('aria-describedby', tooltipId);
    },

    positionTooltip(trigger, placement) {
      const triggerRect = trigger.getBoundingClientRect();
      const tooltip = this.container.querySelector('.tooltip-content');
      const arrow = this.container.querySelector('.tooltip-arrow');

      if (!tooltip) return;

      // Get tooltip dimensions
      this.container.style.opacity = '0';
      this.container.style.display = 'block';
      const tooltipRect = tooltip.getBoundingClientRect();

      let top, left;
      const offset = 8; // Distance from trigger

      switch (placement) {
        case 'top':
          top = triggerRect.top - tooltipRect.height - offset;
          left = triggerRect.left + (triggerRect.width - tooltipRect.width) / 2;
          arrow.style.cssText = `
            position: absolute;
            bottom: -4px;
            left: 50%;
            transform: translateX(-50%);
            width: 0;
            height: 0;
            border-left: 4px solid transparent;
            border-right: 4px solid transparent;
            border-top: 4px solid #333;
          `;
          break;

        case 'bottom':
          top = triggerRect.bottom + offset;
          left = triggerRect.left + (triggerRect.width - tooltipRect.width) / 2;
          arrow.style.cssText = `
            position: absolute;
            top: -4px;
            left: 50%;
            transform: translateX(-50%);
            width: 0;
            height: 0;
            border-left: 4px solid transparent;
            border-right: 4px solid transparent;
            border-bottom: 4px solid #333;
          `;
          break;

        case 'left':
          top = triggerRect.top + (triggerRect.height - tooltipRect.height) / 2;
          left = triggerRect.left - tooltipRect.width - offset;
          arrow.style.cssText = `
            position: absolute;
            right: -4px;
            top: 50%;
            transform: translateY(-50%);
            width: 0;
            height: 0;
            border-top: 4px solid transparent;
            border-bottom: 4px solid transparent;
            border-left: 4px solid #333;
          `;
          break;

        case 'right':
          top = triggerRect.top + (triggerRect.height - tooltipRect.height) / 2;
          left = triggerRect.right + offset;
          arrow.style.cssText = `
            position: absolute;
            left: -4px;
            top: 50%;
            transform: translateY(-50%);
            width: 0;
            height: 0;
            border-top: 4px solid transparent;
            border-bottom: 4px solid transparent;
            border-right: 4px solid #333;
          `;
          break;
      }

      // Keep tooltip within viewport
      const padding = 8;
      top = Math.max(padding, Math.min(top, window.innerHeight - tooltipRect.height - padding));
      left = Math.max(padding, Math.min(left, window.innerWidth - tooltipRect.width - padding));

      this.container.style.top = `${top}px`;
      this.container.style.left = `${left}px`;

      // Apply tooltip styles
      tooltip.style.cssText = `
        background: #333;
        color: white;
        padding: 8px 12px;
        border-radius: 4px;
        font-size: 14px;
        max-width: 250px;
        word-wrap: break-word;
        position: relative;
      `;
    },

    hideTooltip() {
      if (this.showTimeout) {
        clearTimeout(this.showTimeout);
        this.showTimeout = null;
      }

      if (this.container) {
        this.container.style.opacity = '0';

        setTimeout(() => {
          if (this.container) {
            this.container.innerHTML = '';
          }
        }, 200);
      }

      if (this.activeTooltip) {
        this.activeTooltip.removeAttribute('aria-describedby');
        this.activeTooltip = null;
      }
    },

    addTooltip(element, content, options = {}) {
      if (!element) return;

      const placement = options.placement || 'top';
      const delay = options.delay || 300;

      element.setAttribute('data-tooltip', content);
      element.setAttribute('data-tooltip-placement', placement);
      element.setAttribute('data-tooltip-delay', delay);

      // Store tooltip for later reference
      const tooltipId = 'tooltip-' + Date.now();
      this.tooltips.set(tooltipId, {
        element,
        content,
        options,
      });

      return tooltipId;
    },

    removeTooltip(elementOrId) {
      let element;

      if (typeof elementOrId === 'string') {
        const tooltip = this.tooltips.get(elementOrId);
        if (tooltip) {
          element = tooltip.element;
          this.tooltips.delete(elementOrId);
        }
      } else {
        element = elementOrId;
      }

      if (element) {
        element.removeAttribute('data-tooltip');
        element.removeAttribute('data-tooltip-placement');
        element.removeAttribute('data-tooltip-delay');
        element.removeAttribute('aria-describedby');

        if (this.activeTooltip === element) {
          this.hideTooltip();
        }
      }
    },

    updateTooltip(elementOrId, newContent) {
      let element;

      if (typeof elementOrId === 'string') {
        const tooltip = this.tooltips.get(elementOrId);
        if (tooltip) {
          element = tooltip.element;
          tooltip.content = newContent;
        }
      } else {
        element = elementOrId;
      }

      if (element) {
        element.setAttribute('data-tooltip', newContent);

        // If this tooltip is currently active, update it
        if (this.activeTooltip === element) {
          this.hideTooltip();
          this.showTooltip(element);
        }
      }
    },
  };

  // Global registration
  global.TeamStatsTooltipManager = TooltipManager;

  // Auto-initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => TooltipManager.init());
  } else {
    TooltipManager.init();
  }
})(window);
