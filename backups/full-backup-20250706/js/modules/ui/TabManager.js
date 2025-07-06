/**
 * TabManager - Manages tab navigation and content visibility
 */
export class TabManager {
  constructor() {
    this.currentTab = 'all';
    this.listeners = [];
    
    // Bind methods
    this.show = this.show.bind(this);
    this.getCurrentTab = this.getCurrentTab.bind(this);
  }

  /**
   * Show a specific tab
   * @param {string} tabName - The tab to show
   * @param {Event} event - The click event (optional)
   */
  show(tabName, event) {
    const previousTab = this.currentTab;
    this.currentTab = tabName;

    // Update active tab button
    this.updateTabButtons(tabName, event);
    
    // Update body attribute
    document.body.setAttribute('data-active-tab', tabName);
    
    // Show/hide stat categories based on tab
    this.updateStatCategories(tabName);
    
    // Show/hide sections based on tab
    this.updateSections(tabName);
    
    // Special handling for specific tabs
    this.handleSpecialTabs(tabName);
    
    // Update top stats based on active tab
    if (typeof updateTopStatsForTab === 'function') {
      updateTopStatsForTab(tabName);
    }
    
    // Update statistics for specific tabs
    this.updateTabStatistics(tabName);
    
    // Emit change event
    this.emitChange(tabName, previousTab);
  }

  /**
   * Update tab button states
   * @private
   */
  updateTabButtons(tabName, event) {
    // Remove active class from all buttons
    document.querySelectorAll('.tab-button').forEach(btn => {
      btn.classList.remove('active');
    });

    // If event exists, use it. Otherwise find the button by content
    if (event && event.target) {
      event.target.closest('.tab-button').classList.add('active');
    } else {
      // Find and activate the correct tab button
      document.querySelectorAll('.tab-button').forEach(btn => {
        if (
          btn.textContent.toLowerCase().includes(tabName) ||
          (tabName === 'all' && btn.textContent.includes('All Stats'))
        ) {
          btn.classList.add('active');
        }
      });
    }
  }

  /**
   * Update stat categories visibility
   * @private
   */
  updateStatCategories(tabName) {
    const categories = document.querySelectorAll('.stats-category');
    categories.forEach(category => {
      const categoryTab = category.getAttribute('data-tab');
      if (!categoryTab) {
        // If no data-tab attribute, show in all tabs
        category.style.display = 'block';
      } else if (tabName === 'all') {
        // In 'all' tab, only show categories that include 'all' in their data-tab
        if (categoryTab.includes('all')) {
          category.style.display = 'block';
        } else {
          category.style.display = 'none';
        }
      } else if (categoryTab.includes(tabName)) {
        // Show categories that include the tab name
        category.style.display = 'block';
      } else {
        category.style.display = 'none';
      }
    });
  }

  /**
   * Update sections visibility
   * @private
   */
  updateSections(tabName) {
    const sections = document.querySelectorAll(
      '.main-stats-section, .filterable-section, .goal-timing, .match-list, .top-stats[data-tab]'
    );
    sections.forEach(section => {
      const sectionTab = section.getAttribute('data-tab');

      if (!sectionTab) {
        // If no data-tab attribute, hide in filtered tabs
        section.style.display = tabName === 'all' ? 'block' : 'none';
      } else if (sectionTab.includes(tabName)) {
        section.style.display = 'block';
      } else {
        section.style.display = 'none';
      }
    });
  }

  /**
   * Handle special tab-specific logic
   * @private
   */
  handleSpecialTabs(tabName) {
    // Special handling for cards sections
    if (tabName === 'cards') {
      // Show only cards related statistics
      document.querySelectorAll('.stats-category').forEach(cat => {
        const title = cat.querySelector('.category-title')?.textContent.toLowerCase() || '';
        if (title.includes('card') || title.includes('disciplinary')) {
          cat.style.display = 'block';
        }
      });
      
      // Hide overview top stats in cards tab
      const overviewTopStats = document.querySelector('.top-stats[data-tab="overview"]');
      if (overviewTopStats) {
        overviewTopStats.style.display = 'none';
      }
    }

    // Special handling for other tabs
    if (tabName === 'goals') {
      // Show goal-timing only in goals tab
      const goalTiming = document.querySelector('.goal-timing');
      if (goalTiming) {
        goalTiming.style.display = 'block';
      }
    }
  }

  /**
   * Update statistics for specific tabs
   * @private
   */
  updateTabStatistics(tabName) {
    // Update corner statistics when switching to corners tab
    if (tabName === 'corners' && typeof globalStatistics !== 'undefined' && globalStatistics) {
      if (typeof updateCornerStatistics === 'function') {
        updateCornerStatistics(globalStatistics, 
          typeof currentCornersFilter !== 'undefined' ? currentCornersFilter : 'overall');
      }
    }

    // Update goals tab statistics
    if (tabName === 'goals' && typeof globalStatistics !== 'undefined' && globalStatistics) {
      if (typeof updateGoalsTabStatistics === 'function') {
        updateGoalsTabStatistics(globalStatistics);
      }
    }

    // Hide overview top stats in specific tabs
    const overviewTopStats = document.querySelector('.top-stats[data-tab="overview"]');
    if (overviewTopStats) {
      if (['goals', 'xg', 'cards', 'corners'].includes(tabName)) {
        overviewTopStats.style.display = 'none';
      } else {
        overviewTopStats.style.display = 'block';
      }
    }
  }

  /**
   * Get current active tab
   * @returns {string} Current tab name
   */
  getCurrentTab() {
    return this.currentTab;
  }

  /**
   * Add event listener for tab changes
   * @param {Function} callback - Callback function
   */
  on(event, callback) {
    if (event === 'change') {
      this.listeners.push(callback);
    }
  }

  /**
   * Remove event listener
   * @param {Function} callback - Callback function to remove
   */
  off(event, callback) {
    if (event === 'change') {
      const index = this.listeners.indexOf(callback);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    }
  }

  /**
   * Emit change event
   * @private
   */
  emitChange(newTab, oldTab) {
    this.listeners.forEach(callback => {
      callback(newTab, oldTab);
    });
  }

  /**
   * Get all available tabs
   * @returns {Array} List of tab names
   */
  getAllTabs() {
    return ['all', 'goals', 'xg', 'shots', 'cards', 'corners'];
  }

  /**
   * Check if a tab exists
   * @param {string} tabName - Tab name to check
   * @returns {boolean} True if tab exists
   */
  hasTab(tabName) {
    return this.getAllTabs().includes(tabName);
  }
}

// Create singleton instance
const tabManager = new TabManager();

// Export singleton
export default tabManager;