/**
 * VirtualMatchList - Virtual scrolling implementation for large match lists
 * Efficiently renders only visible items to maintain performance
 */
export class VirtualMatchList {
  constructor(container, options = {}) {
    // Validate container
    if (!container) {
      throw new Error('Container element is required');
    }

    // Configuration
    this.container = container;
    this.options = {
      itemHeight: options.itemHeight || 80,
      buffer: options.buffer || 5,
      placeholder: options.placeholder || 'Loading...',
      emptyMessage: options.emptyMessage || 'No matches found',
      ...options
    };

    // State
    this.matches = [];
    this.filteredMatches = [];
    this.scrollTop = 0;
    this.containerHeight = 0;
    this.totalHeight = 0;
    this.startIndex = 0;
    this.endIndex = 0;
    this.visibleItems = 0;
    
    // Performance
    this.renderTimeout = null;
    this.scrollTimeout = null;
    this.isScrolling = false;
    
    // DOM elements
    this.viewport = null;
    this.content = null;
    this.scrollbar = null;
    
    // Cache
    this.elementCache = new Map();
    this.renderCache = new Map();
    
    // Bind methods
    this.handleScroll = this.handleScroll.bind(this);
    this.handleResize = this.handleResize.bind(this);
    this.render = this.render.bind(this);
    
    // Initialize
    this.init();
  }

  /**
   * Initialize the virtual list
   */
  init() {
    // Setup container
    this.container.style.position = 'relative';
    this.container.style.overflow = 'auto';
    
    // Create viewport
    this.viewport = document.createElement('div');
    this.viewport.style.position = 'relative';
    this.viewport.style.width = '100%';
    
    // Create content wrapper
    this.content = document.createElement('div');
    this.content.style.position = 'absolute';
    this.content.style.top = '0';
    this.content.style.left = '0';
    this.content.style.width = '100%';
    
    // Append to container
    this.viewport.appendChild(this.content);
    this.container.appendChild(this.viewport);
    
    // Setup event listeners
    this.container.addEventListener('scroll', this.handleScroll, { passive: true });
    window.addEventListener('resize', this.handleResize, { passive: true });
    
    // Initial measurements
    this.updateMeasurements();
    
    // Create custom scrollbar if needed
    if (this.options.customScrollbar) {
      this.createCustomScrollbar();
    }
  }

  /**
   * Set match data
   * @param {Array} matches - Array of match objects
   */
  setMatches(matches) {
    this.matches = matches || [];
    this.filteredMatches = [...this.matches];
    this.clearCache();
    this.updateMeasurements();
    this.render();
  }

  /**
   * Filter matches
   * @param {Function} filterFn - Filter function
   */
  filter(filterFn) {
    if (typeof filterFn === 'function') {
      this.filteredMatches = this.matches.filter(filterFn);
    } else {
      this.filteredMatches = [...this.matches];
    }
    
    this.clearCache();
    this.updateMeasurements();
    this.render();
  }

  /**
   * Sort matches
   * @param {Function} sortFn - Sort function
   */
  sort(sortFn) {
    if (typeof sortFn === 'function') {
      this.filteredMatches.sort(sortFn);
    }
    
    this.clearCache();
    this.render();
  }

  /**
   * Update measurements
   */
  updateMeasurements() {
    this.containerHeight = this.container.clientHeight;
    this.totalHeight = this.filteredMatches.length * this.options.itemHeight;
    this.visibleItems = Math.ceil(this.containerHeight / this.options.itemHeight);
    
    // Update viewport height
    this.viewport.style.height = `${this.totalHeight}px`;
  }

  /**
   * Handle scroll event
   */
  handleScroll() {
    this.scrollTop = this.container.scrollTop;
    
    // Set scrolling flag
    this.isScrolling = true;
    
    // Clear existing timeout
    if (this.scrollTimeout) {
      clearTimeout(this.scrollTimeout);
    }
    
    // Debounce render
    if (this.renderTimeout) {
      cancelAnimationFrame(this.renderTimeout);
    }
    
    this.renderTimeout = requestAnimationFrame(() => {
      this.render();
    });
    
    // Reset scrolling flag after scroll ends
    this.scrollTimeout = setTimeout(() => {
      this.isScrolling = false;
      this.render(); // Final render for better quality
    }, 150);
  }

  /**
   * Handle resize event
   */
  handleResize() {
    this.updateMeasurements();
    this.render();
  }

  /**
   * Render visible items
   */
  render() {
    // Calculate visible range
    const scrollTop = this.scrollTop;
    const buffer = this.options.buffer;
    
    this.startIndex = Math.max(0, 
      Math.floor(scrollTop / this.options.itemHeight) - buffer
    );
    
    this.endIndex = Math.min(
      this.filteredMatches.length - 1,
      Math.ceil((scrollTop + this.containerHeight) / this.options.itemHeight) + buffer
    );
    
    // Clear content
    const fragment = document.createDocumentFragment();
    
    // Render empty message if no matches
    if (this.filteredMatches.length === 0) {
      const emptyEl = document.createElement('div');
      emptyEl.className = 'virtual-list-empty';
      emptyEl.textContent = this.options.emptyMessage;
      emptyEl.style.padding = '40px';
      emptyEl.style.textAlign = 'center';
      emptyEl.style.color = '#94a3b8';
      fragment.appendChild(emptyEl);
      this.content.innerHTML = '';
      this.content.appendChild(fragment);
      return;
    }
    
    // Render visible items
    for (let i = this.startIndex; i <= this.endIndex; i++) {
      const match = this.filteredMatches[i];
      if (!match) continue;
      
      let element = this.elementCache.get(i);
      
      if (!element) {
        // Create new element
        element = this.createMatchElement(match, i);
        this.elementCache.set(i, element);
      }
      
      // Position element
      element.style.position = 'absolute';
      element.style.top = `${i * this.options.itemHeight}px`;
      element.style.height = `${this.options.itemHeight}px`;
      element.style.width = '100%';
      
      // Add scrolling class for reduced quality
      if (this.isScrolling) {
        element.classList.add('scrolling');
      } else {
        element.classList.remove('scrolling');
      }
      
      fragment.appendChild(element);
    }
    
    // Update DOM
    this.content.innerHTML = '';
    this.content.appendChild(fragment);
    
    // Update custom scrollbar if exists
    if (this.scrollbar) {
      this.updateScrollbar();
    }
    
    // Emit render event
    this.dispatchEvent('render', {
      startIndex: this.startIndex,
      endIndex: this.endIndex,
      total: this.filteredMatches.length
    });
  }

  /**
   * Create match element
   * @param {Object} match - Match data
   * @param {number} index - Match index
   */
  createMatchElement(match, index) {
    // Check render cache first
    const cacheKey = `${match.id}-${index}`;
    let html = this.renderCache.get(cacheKey);
    
    if (!html && this.options.renderItem) {
      // Use custom renderer
      html = this.options.renderItem(match, index);
      this.renderCache.set(cacheKey, html);
    } else if (!html) {
      // Default renderer
      html = this.defaultRenderItem(match, index);
      this.renderCache.set(cacheKey, html);
    }
    
    const element = document.createElement('div');
    element.className = 'virtual-list-item';
    element.dataset.matchId = match.id;
    element.dataset.index = index;
    element.innerHTML = html;
    
    // Add click handler if provided
    if (this.options.onItemClick) {
      element.addEventListener('click', () => {
        this.options.onItemClick(match, index);
      });
    }
    
    return element;
  }

  /**
   * Default item renderer
   * @param {Object} match - Match data
   * @param {number} index - Match index
   */
  defaultRenderItem(match, index) {
    return `
      <div class="match-item" style="padding: 10px; border-bottom: 1px solid #e5e7eb;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div>
            <div style="font-weight: bold;">${match.homeTeam} vs ${match.awayTeam}</div>
            <div style="font-size: 0.875rem; color: #6b7280;">${match.date}</div>
          </div>
          <div style="font-size: 1.25rem; font-weight: bold;">
            ${match.homeScore} - ${match.awayScore}
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Create custom scrollbar
   */
  createCustomScrollbar() {
    // Implementation for custom scrollbar
    // This is optional and can be styled as needed
    this.scrollbar = document.createElement('div');
    this.scrollbar.className = 'virtual-scrollbar';
    this.scrollbar.style.cssText = `
      position: absolute;
      right: 0;
      top: 0;
      width: 10px;
      height: 100%;
      background: rgba(0, 0, 0, 0.1);
      border-radius: 5px;
    `;
    
    const thumb = document.createElement('div');
    thumb.className = 'virtual-scrollbar-thumb';
    thumb.style.cssText = `
      position: absolute;
      width: 100%;
      background: rgba(0, 0, 0, 0.3);
      border-radius: 5px;
      cursor: pointer;
    `;
    
    this.scrollbar.appendChild(thumb);
    this.container.appendChild(this.scrollbar);
    
    // Add drag functionality
    this.setupScrollbarDrag(thumb);
  }

  /**
   * Setup scrollbar drag
   * @param {HTMLElement} thumb - Scrollbar thumb element
   */
  setupScrollbarDrag(thumb) {
    let isDragging = false;
    let startY = 0;
    let startScrollTop = 0;
    
    thumb.addEventListener('mousedown', (e) => {
      isDragging = true;
      startY = e.clientY;
      startScrollTop = this.container.scrollTop;
      document.body.style.userSelect = 'none';
    });
    
    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      
      const deltaY = e.clientY - startY;
      const scrollRatio = this.totalHeight / this.containerHeight;
      this.container.scrollTop = startScrollTop + (deltaY * scrollRatio);
    });
    
    document.addEventListener('mouseup', () => {
      isDragging = false;
      document.body.style.userSelect = '';
    });
  }

  /**
   * Update scrollbar position
   */
  updateScrollbar() {
    if (!this.scrollbar) return;
    
    const thumb = this.scrollbar.querySelector('.virtual-scrollbar-thumb');
    const scrollRatio = this.containerHeight / this.totalHeight;
    const thumbHeight = Math.max(30, this.containerHeight * scrollRatio);
    const thumbTop = (this.scrollTop / this.totalHeight) * this.containerHeight;
    
    thumb.style.height = `${thumbHeight}px`;
    thumb.style.top = `${thumbTop}px`;
  }

  /**
   * Scroll to index
   * @param {number} index - Item index
   * @param {string} position - Scroll position (start, center, end)
   */
  scrollToIndex(index, position = 'start') {
    const itemTop = index * this.options.itemHeight;
    let scrollTop = itemTop;
    
    if (position === 'center') {
      scrollTop = itemTop - (this.containerHeight / 2) + (this.options.itemHeight / 2);
    } else if (position === 'end') {
      scrollTop = itemTop - this.containerHeight + this.options.itemHeight;
    }
    
    this.container.scrollTop = Math.max(0, Math.min(scrollTop, 
      this.totalHeight - this.containerHeight));
  }

  /**
   * Get visible items
   */
  getVisibleItems() {
    const items = [];
    for (let i = this.startIndex; i <= this.endIndex; i++) {
      if (this.filteredMatches[i]) {
        items.push({
          index: i,
          data: this.filteredMatches[i]
        });
      }
    }
    return items;
  }

  /**
   * Clear caches
   */
  clearCache() {
    // Keep only visible elements in cache
    const visibleElements = new Map();
    for (let i = this.startIndex; i <= this.endIndex; i++) {
      const element = this.elementCache.get(i);
      if (element) {
        visibleElements.set(i, element);
      }
    }
    
    this.elementCache = visibleElements;
    this.renderCache.clear();
  }

  /**
   * Dispatch custom event
   */
  dispatchEvent(eventName, detail = {}) {
    const event = new CustomEvent(`virtual-list-${eventName}`, {
      detail,
      bubbles: true
    });
    this.container.dispatchEvent(event);
  }

  /**
   * Refresh the list
   */
  refresh() {
    this.clearCache();
    this.render();
  }

  /**
   * Destroy the virtual list
   */
  destroy() {
    // Remove event listeners
    this.container.removeEventListener('scroll', this.handleScroll);
    window.removeEventListener('resize', this.handleResize);
    
    // Clear timeouts
    if (this.renderTimeout) {
      cancelAnimationFrame(this.renderTimeout);
    }
    if (this.scrollTimeout) {
      clearTimeout(this.scrollTimeout);
    }
    
    // Clear caches
    this.elementCache.clear();
    this.renderCache.clear();
    
    // Remove DOM elements
    this.container.innerHTML = '';
    
    // Clear references
    this.matches = [];
    this.filteredMatches = [];
  }
}

// Export class
export default VirtualMatchList;