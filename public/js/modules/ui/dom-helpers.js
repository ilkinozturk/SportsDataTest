/**
 * DOM Helpers Module
 * Utility functions for DOM manipulation, element creation, and query operations
 * Features: Safe queries, batch operations, performance optimization, animation helpers
 */

(function(global) {
    'use strict';

    class DOMHelpers {
        constructor() {
            // Cache for frequently accessed elements
            this.elementCache = new Map();
            this.cacheTimeout = 5000; // 5 seconds
            
            // Performance metrics
            this.metrics = {
                queries: 0,
                cacheHits: 0,
                cacheMisses: 0,
                batchOperations: 0,
                totalOperationTime: 0
            };
            
            // Animation frame queue
            this.rafQueue = [];
            this.rafId = null;
            
            // Mutation observer for cache invalidation
            this.observer = null;
            this.observedElements = new WeakSet();
            
            // Template cache
            this.templateCache = new Map();
            
            // Event delegation handlers
            this.delegatedHandlers = new Map();
            
            // Initialize
            this.initialize();
        }

        initialize() {
            // Setup mutation observer for cache invalidation
            if (typeof MutationObserver !== 'undefined') {
                this.observer = new MutationObserver((mutations) => {
                    this.handleMutations(mutations);
                });
            }
            
            // Setup RAF processing
            this.processRAFQueue();
        }

        /**
         * Safe element query with caching
         */
        $(selector, parent = document, useCache = true) {
            this.metrics.queries++;
            
            const cacheKey = `${parent === document ? 'doc' : 'elem'}-${selector}`;
            
            if (useCache && this.elementCache.has(cacheKey)) {
                const cached = this.elementCache.get(cacheKey);
                if (cached.timestamp > Date.now() - this.cacheTimeout) {
                    this.metrics.cacheHits++;
                    return cached.element;
                } else {
                    this.elementCache.delete(cacheKey);
                }
            }
            
            this.metrics.cacheMisses++;
            
            try {
                const element = parent.querySelector(selector);
                
                if (element && useCache) {
                    this.elementCache.set(cacheKey, {
                        element,
                        timestamp: Date.now()
                    });
                    
                    // Observe element for changes
                    if (this.observer && !this.observedElements.has(element)) {
                        this.observer.observe(element, {
                            attributes: true,
                            childList: true,
                            subtree: true
                        });
                        this.observedElements.add(element);
                    }
                }
                
                return element;
            } catch (error) {
                console.error('Invalid selector:', selector, error);
                return null;
            }
        }

        /**
         * Safe query all elements
         */
        $$(selector, parent = document) {
            try {
                return Array.from(parent.querySelectorAll(selector));
            } catch (error) {
                console.error('Invalid selector:', selector, error);
                return [];
            }
        }

        /**
         * Create element with attributes and content
         */
        createElement(tag, attributes = {}, content = '') {
            const element = document.createElement(tag);
            
            // Set attributes
            Object.entries(attributes).forEach(([key, value]) => {
                if (key === 'class') {
                    element.className = value;
                } else if (key === 'style' && typeof value === 'object') {
                    Object.assign(element.style, value);
                } else if (key === 'data' && typeof value === 'object') {
                    Object.entries(value).forEach(([dataKey, dataValue]) => {
                        element.dataset[dataKey] = dataValue;
                    });
                } else if (key.startsWith('on') && typeof value === 'function') {
                    element.addEventListener(key.slice(2).toLowerCase(), value);
                } else {
                    element.setAttribute(key, value);
                }
            });
            
            // Set content
            if (content) {
                if (typeof content === 'string') {
                    element.innerHTML = content;
                } else if (content instanceof Element) {
                    element.appendChild(content);
                } else if (Array.isArray(content)) {
                    content.forEach(child => {
                        if (child instanceof Element) {
                            element.appendChild(child);
                        } else if (typeof child === 'string') {
                            element.appendChild(document.createTextNode(child));
                        }
                    });
                }
            }
            
            return element;
        }

        /**
         * Create element from HTML string
         */
        createFromHTML(html) {
            const template = document.createElement('template');
            template.innerHTML = html.trim();
            return template.content.firstChild;
        }

        /**
         * Batch DOM operations for performance
         */
        batch(operations) {
            const startTime = performance.now();
            this.metrics.batchOperations++;
            
            // Use document fragment for batch insertions
            const fragment = document.createDocumentFragment();
            const results = [];
            
            operations.forEach(operation => {
                try {
                    const result = operation(fragment);
                    results.push({ success: true, result });
                } catch (error) {
                    results.push({ success: false, error });
                }
            });
            
            // Append fragment if it has children
            if (fragment.children.length > 0) {
                document.body.appendChild(fragment);
            }
            
            this.metrics.totalOperationTime += performance.now() - startTime;
            
            return results;
        }

        /**
         * Request animation frame queue
         */
        raf(callback) {
            this.rafQueue.push(callback);
            
            if (!this.rafId) {
                this.rafId = requestAnimationFrame(() => this.processRAFQueue());
            }
        }

        processRAFQueue() {
            const queue = this.rafQueue.slice();
            this.rafQueue = [];
            
            queue.forEach(callback => {
                try {
                    callback();
                } catch (error) {
                    console.error('RAF callback error:', error);
                }
            });
            
            if (this.rafQueue.length > 0) {
                this.rafId = requestAnimationFrame(() => this.processRAFQueue());
            } else {
                this.rafId = null;
            }
        }

        /**
         * Safe class manipulation
         */
        addClass(element, ...classNames) {
            if (!element || !element.classList) return false;
            
            this.raf(() => {
                classNames.forEach(className => {
                    if (className && typeof className === 'string') {
                        element.classList.add(...className.split(' '));
                    }
                });
            });
            
            return true;
        }

        removeClass(element, ...classNames) {
            if (!element || !element.classList) return false;
            
            this.raf(() => {
                classNames.forEach(className => {
                    if (className && typeof className === 'string') {
                        element.classList.remove(...className.split(' '));
                    }
                });
            });
            
            return true;
        }

        toggleClass(element, className, force) {
            if (!element || !element.classList) return false;
            
            this.raf(() => {
                element.classList.toggle(className, force);
            });
            
            return true;
        }

        hasClass(element, className) {
            return element && element.classList && element.classList.contains(className);
        }

        /**
         * Safe attribute manipulation
         */
        attr(element, name, value) {
            if (!element) return undefined;
            
            if (value === undefined) {
                // Get attribute
                return element.getAttribute(name);
            } else if (value === null) {
                // Remove attribute
                element.removeAttribute(name);
            } else {
                // Set attribute
                element.setAttribute(name, value);
            }
            
            return element;
        }

        data(element, key, value) {
            if (!element || !element.dataset) return undefined;
            
            if (value === undefined) {
                // Get data attribute
                return element.dataset[key];
            } else {
                // Set data attribute
                element.dataset[key] = value;
                return element;
            }
        }

        /**
         * Safe style manipulation
         */
        css(element, property, value) {
            if (!element || !element.style) return undefined;
            
            if (typeof property === 'object') {
                // Set multiple styles
                Object.assign(element.style, property);
            } else if (value === undefined) {
                // Get computed style
                return window.getComputedStyle(element)[property];
            } else {
                // Set single style
                element.style[property] = value;
            }
            
            return element;
        }

        /**
         * Element visibility
         */
        show(element, display = 'block') {
            if (!element) return;
            
            this.raf(() => {
                element.style.display = display;
                element.setAttribute('aria-hidden', 'false');
            });
        }

        hide(element) {
            if (!element) return;
            
            this.raf(() => {
                element.style.display = 'none';
                element.setAttribute('aria-hidden', 'true');
            });
        }

        isVisible(element) {
            if (!element) return false;
            
            const style = window.getComputedStyle(element);
            return style.display !== 'none' && 
                   style.visibility !== 'hidden' && 
                   style.opacity !== '0';
        }

        /**
         * Element dimensions and position
         */
        dimensions(element) {
            if (!element) return null;
            
            const rect = element.getBoundingClientRect();
            
            return {
                width: rect.width,
                height: rect.height,
                top: rect.top,
                left: rect.left,
                bottom: rect.bottom,
                right: rect.right,
                x: rect.x,
                y: rect.y,
                offsetTop: element.offsetTop,
                offsetLeft: element.offsetLeft,
                scrollTop: element.scrollTop,
                scrollLeft: element.scrollLeft,
                scrollWidth: element.scrollWidth,
                scrollHeight: element.scrollHeight
            };
        }

        offset(element) {
            if (!element) return { top: 0, left: 0 };
            
            const rect = element.getBoundingClientRect();
            const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
            const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            
            return {
                top: rect.top + scrollTop,
                left: rect.left + scrollLeft
            };
        }

        /**
         * DOM traversal helpers
         */
        parent(element, selector) {
            if (!element || !element.parentElement) return null;
            
            if (!selector) {
                return element.parentElement;
            }
            
            let parent = element.parentElement;
            while (parent && !parent.matches(selector)) {
                parent = parent.parentElement;
            }
            
            return parent;
        }

        closest(element, selector) {
            if (!element) return null;
            
            if (element.closest) {
                return element.closest(selector);
            }
            
            // Fallback for older browsers
            return this.parent(element, selector);
        }

        children(element, selector) {
            if (!element) return [];
            
            const children = Array.from(element.children);
            
            if (selector) {
                return children.filter(child => child.matches(selector));
            }
            
            return children;
        }

        siblings(element, selector) {
            if (!element || !element.parentElement) return [];
            
            const siblings = Array.from(element.parentElement.children)
                .filter(child => child !== element);
            
            if (selector) {
                return siblings.filter(sibling => sibling.matches(selector));
            }
            
            return siblings;
        }

        next(element, selector) {
            if (!element) return null;
            
            let next = element.nextElementSibling;
            
            if (!selector) {
                return next;
            }
            
            while (next && !next.matches(selector)) {
                next = next.nextElementSibling;
            }
            
            return next;
        }

        prev(element, selector) {
            if (!element) return null;
            
            let prev = element.previousElementSibling;
            
            if (!selector) {
                return prev;
            }
            
            while (prev && !prev.matches(selector)) {
                prev = prev.previousElementSibling;
            }
            
            return prev;
        }

        /**
         * DOM manipulation
         */
        append(parent, ...children) {
            if (!parent) return;
            
            this.raf(() => {
                children.forEach(child => {
                    if (typeof child === 'string') {
                        parent.insertAdjacentHTML('beforeend', child);
                    } else if (child instanceof Element) {
                        parent.appendChild(child);
                    }
                });
            });
        }

        prepend(parent, ...children) {
            if (!parent) return;
            
            this.raf(() => {
                children.reverse().forEach(child => {
                    if (typeof child === 'string') {
                        parent.insertAdjacentHTML('afterbegin', child);
                    } else if (child instanceof Element) {
                        parent.insertBefore(child, parent.firstChild);
                    }
                });
            });
        }

        before(element, ...siblings) {
            if (!element || !element.parentElement) return;
            
            this.raf(() => {
                siblings.forEach(sibling => {
                    if (typeof sibling === 'string') {
                        element.insertAdjacentHTML('beforebegin', sibling);
                    } else if (sibling instanceof Element) {
                        element.parentElement.insertBefore(sibling, element);
                    }
                });
            });
        }

        after(element, ...siblings) {
            if (!element || !element.parentElement) return;
            
            this.raf(() => {
                siblings.reverse().forEach(sibling => {
                    if (typeof sibling === 'string') {
                        element.insertAdjacentHTML('afterend', sibling);
                    } else if (sibling instanceof Element) {
                        element.parentElement.insertBefore(sibling, element.nextSibling);
                    }
                });
            });
        }

        remove(element) {
            if (!element || !element.parentElement) return;
            
            this.raf(() => {
                element.parentElement.removeChild(element);
            });
        }

        empty(element) {
            if (!element) return;
            
            this.raf(() => {
                while (element.firstChild) {
                    element.removeChild(element.firstChild);
                }
            });
        }

        replace(oldElement, newElement) {
            if (!oldElement || !oldElement.parentElement) return;
            
            this.raf(() => {
                if (typeof newElement === 'string') {
                    oldElement.outerHTML = newElement;
                } else if (newElement instanceof Element) {
                    oldElement.parentElement.replaceChild(newElement, oldElement);
                }
            });
        }

        /**
         * Event delegation
         */
        delegate(parent, eventType, selector, handler) {
            const delegateKey = `${eventType}-${selector}`;
            
            if (!this.delegatedHandlers.has(parent)) {
                this.delegatedHandlers.set(parent, new Map());
            }
            
            const parentHandlers = this.delegatedHandlers.get(parent);
            
            if (!parentHandlers.has(delegateKey)) {
                const delegatedHandler = (event) => {
                    const target = event.target.closest(selector);
                    if (target && parent.contains(target)) {
                        handler.call(target, event);
                    }
                };
                
                parent.addEventListener(eventType, delegatedHandler);
                parentHandlers.set(delegateKey, delegatedHandler);
            }
            
            // Return unsubscribe function
            return () => {
                const handler = parentHandlers.get(delegateKey);
                if (handler) {
                    parent.removeEventListener(eventType, handler);
                    parentHandlers.delete(delegateKey);
                    
                    if (parentHandlers.size === 0) {
                        this.delegatedHandlers.delete(parent);
                    }
                }
            };
        }

        /**
         * Template rendering
         */
        template(templateString, data = {}) {
            const cacheKey = templateString.substring(0, 50);
            
            let templateFn = this.templateCache.get(cacheKey);
            
            if (!templateFn) {
                // Simple template engine
                templateFn = (data) => {
                    return templateString.replace(/\{\{(\w+)\}\}/g, (match, key) => {
                        return data[key] !== undefined ? data[key] : match;
                    });
                };
                
                this.templateCache.set(cacheKey, templateFn);
            }
            
            return templateFn(data);
        }

        /**
         * Animation helpers
         */
        fadeIn(element, duration = 300, callback) {
            if (!element) return;
            
            element.style.opacity = '0';
            element.style.display = 'block';
            
            const start = performance.now();
            
            const animate = (timestamp) => {
                const elapsed = timestamp - start;
                const progress = Math.min(elapsed / duration, 1);
                
                element.style.opacity = progress;
                
                if (progress < 1) {
                    requestAnimationFrame(animate);
                } else {
                    if (callback) callback();
                }
            };
            
            requestAnimationFrame(animate);
        }

        fadeOut(element, duration = 300, callback) {
            if (!element) return;
            
            const start = performance.now();
            const initialOpacity = parseFloat(window.getComputedStyle(element).opacity);
            
            const animate = (timestamp) => {
                const elapsed = timestamp - start;
                const progress = Math.min(elapsed / duration, 1);
                
                element.style.opacity = initialOpacity * (1 - progress);
                
                if (progress < 1) {
                    requestAnimationFrame(animate);
                } else {
                    element.style.display = 'none';
                    if (callback) callback();
                }
            };
            
            requestAnimationFrame(animate);
        }

        slideDown(element, duration = 300, callback) {
            if (!element) return;
            
            element.style.overflow = 'hidden';
            const targetHeight = element.scrollHeight;
            element.style.height = '0px';
            element.style.display = 'block';
            
            const start = performance.now();
            
            const animate = (timestamp) => {
                const elapsed = timestamp - start;
                const progress = Math.min(elapsed / duration, 1);
                
                element.style.height = (targetHeight * progress) + 'px';
                
                if (progress < 1) {
                    requestAnimationFrame(animate);
                } else {
                    element.style.height = '';
                    element.style.overflow = '';
                    if (callback) callback();
                }
            };
            
            requestAnimationFrame(animate);
        }

        slideUp(element, duration = 300, callback) {
            if (!element) return;
            
            element.style.overflow = 'hidden';
            const initialHeight = element.scrollHeight;
            
            const start = performance.now();
            
            const animate = (timestamp) => {
                const elapsed = timestamp - start;
                const progress = Math.min(elapsed / duration, 1);
                
                element.style.height = (initialHeight * (1 - progress)) + 'px';
                
                if (progress < 1) {
                    requestAnimationFrame(animate);
                } else {
                    element.style.display = 'none';
                    element.style.height = '';
                    element.style.overflow = '';
                    if (callback) callback();
                }
            };
            
            requestAnimationFrame(animate);
        }

        /**
         * Utility methods
         */
        ready(callback) {
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', callback);
            } else {
                callback();
            }
        }

        debounce(func, wait = 250) {
            let timeout;
            
            return function(...args) {
                clearTimeout(timeout);
                timeout = setTimeout(() => func.apply(this, args), wait);
            };
        }

        throttle(func, limit = 250) {
            let inThrottle;
            
            return function(...args) {
                if (!inThrottle) {
                    func.apply(this, args);
                    inThrottle = true;
                    setTimeout(() => inThrottle = false, limit);
                }
            };
        }

        /**
         * Cache management
         */
        clearCache() {
            this.elementCache.clear();
            this.templateCache.clear();
        }

        handleMutations(mutations) {
            // Invalidate cache for mutated elements
            mutations.forEach(mutation => {
                if (mutation.type === 'childList' || mutation.type === 'attributes') {
                    // Clear cache entries related to mutated elements
                    this.elementCache.forEach((value, key) => {
                        if (value.element === mutation.target || 
                            mutation.target.contains(value.element)) {
                            this.elementCache.delete(key);
                        }
                    });
                }
            });
        }

        /**
         * Performance metrics
         */
        getMetrics() {
            const avgOperationTime = this.metrics.batchOperations > 0
                ? this.metrics.totalOperationTime / this.metrics.batchOperations
                : 0;
            
            const cacheHitRate = this.metrics.queries > 0
                ? (this.metrics.cacheHits / this.metrics.queries) * 100
                : 0;
            
            return {
                ...this.metrics,
                avgOperationTime,
                cacheHitRate,
                cacheSize: this.elementCache.size,
                templateCacheSize: this.templateCache.size
            };
        }

        resetMetrics() {
            this.metrics = {
                queries: 0,
                cacheHits: 0,
                cacheMisses: 0,
                batchOperations: 0,
                totalOperationTime: 0
            };
        }

        /**
         * Cleanup
         */
        destroy() {
            // Stop observer
            if (this.observer) {
                this.observer.disconnect();
            }
            
            // Clear caches
            this.clearCache();
            
            // Clear RAF queue
            if (this.rafId) {
                cancelAnimationFrame(this.rafId);
            }
            this.rafQueue = [];
            
            // Clear delegated handlers
            this.delegatedHandlers.forEach((handlers, parent) => {
                handlers.forEach((handler, key) => {
                    const [eventType] = key.split('-');
                    parent.removeEventListener(eventType, handler);
                });
            });
            this.delegatedHandlers.clear();
            
            // Reset metrics
            this.resetMetrics();
        }
    }

    // Export for different module systems
    if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
        module.exports = DOMHelpers;
    } else if (typeof define === 'function' && define.amd) {
        define([], function() {
            return DOMHelpers;
        });
    } else {
        global.TeamStatsDOMHelpers = new DOMHelpers();
    }

})(typeof window !== 'undefined' ? window : this);