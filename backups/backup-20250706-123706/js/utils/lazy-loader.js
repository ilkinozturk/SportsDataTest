/**
 * LazyLoader - Intersection Observer based lazy loading system
 * Efficiently loads content as it becomes visible in the viewport
 */
export class LazyLoader {
  constructor(options = {}) {
    // Configuration
    this.options = {
      rootMargin: options.rootMargin || '50px',
      threshold: options.threshold || 0.01,
      loadingClass: options.loadingClass || 'lazy-loading',
      loadedClass: options.loadedClass || 'lazy-loaded',
      errorClass: options.errorClass || 'lazy-error',
      ...options
    };

    // Module registry
    this.modules = new Map();
    this.loadedModules = new Set();
    this.loadingModules = new Set();
    
    // Image registry
    this.images = new Map();
    
    // Content registry
    this.content = new Map();
    
    // Statistics
    this.stats = {
      modulesLoaded: 0,
      imagesLoaded: 0,
      contentLoaded: 0,
      errors: 0,
      totalLoadTime: 0
    };

    // Create observer
    this.observer = new IntersectionObserver(
      this.handleIntersection.bind(this),
      {
        rootMargin: this.options.rootMargin,
        threshold: this.options.threshold
      }
    );

    // Bind methods
    this.observe = this.observe.bind(this);
    this.unobserve = this.unobserve.bind(this);
  }

  /**
   * Register a module for lazy loading
   * @param {HTMLElement} element - The element to observe
   * @param {string} modulePath - The module path to load
   * @param {Object} options - Loading options
   */
  registerModule(element, modulePath, options = {}) {
    if (!element || !modulePath) return;

    this.modules.set(element, {
      path: modulePath,
      options,
      retries: 0,
      maxRetries: options.maxRetries || 3
    });

    this.observe(element);
  }

  /**
   * Register an image for lazy loading
   * @param {HTMLImageElement} img - The image element
   * @param {Object} options - Loading options
   */
  registerImage(img, options = {}) {
    if (!img) return;

    const src = img.dataset.src || img.dataset.lazySrc;
    const srcset = img.dataset.srcset || img.dataset.lazySrcset;

    if (!src && !srcset) return;

    this.images.set(img, {
      src,
      srcset,
      options,
      placeholder: img.src || options.placeholder
    });

    // Add loading class
    img.classList.add(this.options.loadingClass);

    this.observe(img);
  }

  /**
   * Register content for lazy loading
   * @param {HTMLElement} element - The element to observe
   * @param {Function} loader - Content loader function
   * @param {Object} options - Loading options
   */
  registerContent(element, loader, options = {}) {
    if (!element || typeof loader !== 'function') return;

    this.content.set(element, {
      loader,
      options,
      loaded: false
    });

    this.observe(element);
  }

  /**
   * Register all lazy elements in a container
   * @param {HTMLElement} container - Container element
   */
  registerAll(container = document) {
    // Find all lazy images
    const lazyImages = container.querySelectorAll('img[data-src], img[data-lazy-src]');
    lazyImages.forEach(img => this.registerImage(img));

    // Find all lazy modules
    const lazyModules = container.querySelectorAll('[data-lazy-module]');
    lazyModules.forEach(element => {
      const modulePath = element.dataset.lazyModule;
      this.registerModule(element, modulePath);
    });

    // Find all lazy content
    const lazyContent = container.querySelectorAll('[data-lazy-content]');
    lazyContent.forEach(element => {
      const contentId = element.dataset.lazyContent;
      // You can define content loaders based on contentId
      this.registerContentById(element, contentId);
    });
  }

  /**
   * Handle intersection observer callback
   * @private
   */
  async handleIntersection(entries) {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        const element = entry.target;

        // Handle modules
        if (this.modules.has(element)) {
          await this.loadModule(element);
        }

        // Handle images
        if (this.images.has(element)) {
          await this.loadImage(element);
        }

        // Handle content
        if (this.content.has(element)) {
          await this.loadContent(element);
        }
      }
    }
  }

  /**
   * Load a module
   * @private
   */
  async loadModule(element) {
    const moduleInfo = this.modules.get(element);
    if (!moduleInfo || this.loadedModules.has(element)) return;

    // Prevent duplicate loading
    if (this.loadingModules.has(element)) return;
    this.loadingModules.add(element);

    const startTime = performance.now();

    try {
      // Add loading class
      element.classList.add(this.options.loadingClass);

      // Dynamic import
      const module = await import(moduleInfo.path);
      
      // Initialize module if it has an init method
      if (module.default && typeof module.default.init === 'function') {
        await module.default.init(element, moduleInfo.options);
      } else if (typeof module.init === 'function') {
        await module.init(element, moduleInfo.options);
      }

      // Mark as loaded
      this.loadedModules.add(element);
      element.classList.remove(this.options.loadingClass);
      element.classList.add(this.options.loadedClass);

      // Update stats
      this.stats.modulesLoaded++;
      this.stats.totalLoadTime += performance.now() - startTime;

      // Unobserve
      this.unobserve(element);
      this.modules.delete(element);
      this.loadingModules.delete(element);

      // Trigger loaded event
      this.dispatchEvent(element, 'lazyloaded', { module: moduleInfo.path });

    } catch (error) {
      console.error(`Failed to load module ${moduleInfo.path}:`, error);
      
      // Retry logic
      if (moduleInfo.retries < moduleInfo.maxRetries) {
        moduleInfo.retries++;
        this.loadingModules.delete(element);
        
        // Retry after delay
        setTimeout(() => this.loadModule(element), 1000 * moduleInfo.retries);
      } else {
        // Mark as error
        element.classList.remove(this.options.loadingClass);
        element.classList.add(this.options.errorClass);
        this.stats.errors++;
        
        // Trigger error event
        this.dispatchEvent(element, 'lazyerror', { error, module: moduleInfo.path });
      }
    }
  }

  /**
   * Load an image
   * @private
   */
  async loadImage(img) {
    const imageInfo = this.images.get(img);
    if (!imageInfo) return;

    const startTime = performance.now();

    try {
      // Create a new image to preload
      const tempImg = new Image();
      
      // Set up load handler
      const loadPromise = new Promise((resolve, reject) => {
        tempImg.onload = resolve;
        tempImg.onerror = reject;
      });

      // Set source
      if (imageInfo.srcset) {
        tempImg.srcset = imageInfo.srcset;
      }
      if (imageInfo.src) {
        tempImg.src = imageInfo.src;
      }

      // Wait for load
      await loadPromise;

      // Apply to actual image
      if (imageInfo.srcset) {
        img.srcset = imageInfo.srcset;
      }
      if (imageInfo.src) {
        img.src = imageInfo.src;
      }

      // Update classes
      img.classList.remove(this.options.loadingClass);
      img.classList.add(this.options.loadedClass);

      // Update stats
      this.stats.imagesLoaded++;
      this.stats.totalLoadTime += performance.now() - startTime;

      // Unobserve
      this.unobserve(img);
      this.images.delete(img);

      // Trigger loaded event
      this.dispatchEvent(img, 'lazyloaded', { type: 'image' });

    } catch (error) {
      console.error('Failed to load image:', error);
      
      // Fallback to placeholder if available
      if (imageInfo.placeholder) {
        img.src = imageInfo.placeholder;
      }
      
      // Mark as error
      img.classList.remove(this.options.loadingClass);
      img.classList.add(this.options.errorClass);
      this.stats.errors++;
      
      // Trigger error event
      this.dispatchEvent(img, 'lazyerror', { error, type: 'image' });
    }
  }

  /**
   * Load content
   * @private
   */
  async loadContent(element) {
    const contentInfo = this.content.get(element);
    if (!contentInfo || contentInfo.loaded) return;

    const startTime = performance.now();

    try {
      // Add loading class
      element.classList.add(this.options.loadingClass);

      // Call loader function
      await contentInfo.loader(element, contentInfo.options);

      // Mark as loaded
      contentInfo.loaded = true;
      element.classList.remove(this.options.loadingClass);
      element.classList.add(this.options.loadedClass);

      // Update stats
      this.stats.contentLoaded++;
      this.stats.totalLoadTime += performance.now() - startTime;

      // Unobserve
      this.unobserve(element);

      // Trigger loaded event
      this.dispatchEvent(element, 'lazyloaded', { type: 'content' });

    } catch (error) {
      console.error('Failed to load content:', error);
      
      // Mark as error
      element.classList.remove(this.options.loadingClass);
      element.classList.add(this.options.errorClass);
      this.stats.errors++;
      
      // Trigger error event
      this.dispatchEvent(element, 'lazyerror', { error, type: 'content' });
    }
  }

  /**
   * Register content by ID (example implementation)
   * @private
   */
  registerContentById(element, contentId) {
    // Define content loaders based on ID
    const contentLoaders = {
      'match-details': async (el) => {
        // Example: Load match details
        const matchId = el.dataset.matchId;
        const data = await TeamStatsAPIClient.getMatchDetails(matchId);
        el.innerHTML = this.renderMatchDetails(data);
      },
      'player-stats': async (el) => {
        // Example: Load player statistics
        const playerId = el.dataset.playerId;
        const data = await TeamStatsAPIClient.get(`players/${playerId}/stats`);
        el.innerHTML = this.renderPlayerStats(data);
      }
    };

    const loader = contentLoaders[contentId];
    if (loader) {
      this.registerContent(element, loader);
    }
  }

  /**
   * Start observing an element
   */
  observe(element) {
    if (element && this.observer) {
      this.observer.observe(element);
    }
  }

  /**
   * Stop observing an element
   */
  unobserve(element) {
    if (element && this.observer) {
      this.observer.unobserve(element);
    }
  }

  /**
   * Load all visible elements immediately
   */
  loadAll() {
    const entries = [];
    
    // Collect all observed elements
    this.modules.forEach((info, element) => {
      entries.push({ target: element, isIntersecting: true });
    });
    
    this.images.forEach((info, element) => {
      entries.push({ target: element, isIntersecting: true });
    });
    
    this.content.forEach((info, element) => {
      entries.push({ target: element, isIntersecting: true });
    });

    // Process all
    this.handleIntersection(entries);
  }

  /**
   * Get loading statistics
   */
  getStats() {
    return {
      ...this.stats,
      avgLoadTime: this.stats.totalLoadTime / 
        (this.stats.modulesLoaded + this.stats.imagesLoaded + this.stats.contentLoaded) || 0
    };
  }

  /**
   * Dispatch custom event
   * @private
   */
  dispatchEvent(element, eventName, detail = {}) {
    const event = new CustomEvent(eventName, {
      detail,
      bubbles: true,
      cancelable: true
    });
    element.dispatchEvent(event);
  }

  /**
   * Destroy the lazy loader
   */
  destroy() {
    // Disconnect observer
    if (this.observer) {
      this.observer.disconnect();
    }

    // Clear registries
    this.modules.clear();
    this.images.clear();
    this.content.clear();
    this.loadedModules.clear();
    this.loadingModules.clear();
  }
}

// Create singleton instance
const lazyLoader = new LazyLoader();

// Auto-initialize on DOM ready
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      lazyLoader.registerAll();
    });
  } else {
    lazyLoader.registerAll();
  }
}

export default lazyLoader;