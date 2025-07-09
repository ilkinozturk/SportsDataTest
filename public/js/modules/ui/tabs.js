/**
 * Tabs Module
 * Handles tab navigation for the team stats application
 */

(function (global) {
  'use strict';

  const TabsManager = {
    initialized: false,
    activeTab: null,
    tabs: new Map(),

    init() {
      if (this.initialized) return;

      this.setupTabs();
      this.bindEvents();
      this.activateDefaultTab();

      this.initialized = true;
      console.log('[TabsManager] Initialized');
    },

    setupTabs() {
      const tabButtons = document.querySelectorAll('.tab-btn');
      const tabContents = document.querySelectorAll('.tab-content');

      tabButtons.forEach(btn => {
        const tabId = btn.dataset.tab;
        if (tabId) {
          this.tabs.set(tabId, {
            button: btn,
            content: document.querySelector(`[data-tab-content="${tabId}"]`),
            active: false,
          });
        }
      });

      console.log('[TabsManager] Setup tabs:', Array.from(this.tabs.keys()));
    },

    bindEvents() {
      document.addEventListener('click', e => {
        const tabBtn = e.target.closest('.tab-btn');
        if (tabBtn) {
          e.preventDefault();
          const tabId = tabBtn.dataset.tab;
          if (tabId) {
            this.activateTab(tabId);
          }
        }
      });

      // Handle keyboard navigation
      document.addEventListener('keydown', e => {
        const tabBtn = e.target.closest('.tab-btn');
        if (tabBtn && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
          e.preventDefault();
          this.navigateTab(e.key === 'ArrowRight' ? 'next' : 'prev');
        }
      });
    },

    activateTab(tabId) {
      if (!this.tabs.has(tabId)) {
        console.warn('[TabsManager] Tab not found:', tabId);
        return;
      }

      // Deactivate current tab
      if (this.activeTab) {
        this.deactivateTab(this.activeTab);
      }

      // Activate new tab
      const tab = this.tabs.get(tabId);
      tab.active = true;

      if (tab.button) {
        tab.button.classList.add('active');
        tab.button.setAttribute('aria-selected', 'true');
      }

      if (tab.content) {
        tab.content.classList.add('active');
        tab.content.style.display = 'block';
      }

      this.activeTab = tabId;

      console.log('[TabsManager] Activated tab:', tabId);

      // Emit tab change event
      if (global.TeamStatsEventBus) {
        global.TeamStatsEventBus.emit('tab:change', {
          tabId,
          previousTab: this.activeTab,
        });
      }

      // Save active tab
      this.saveActiveTab();
    },

    deactivateTab(tabId) {
      const tab = this.tabs.get(tabId);
      if (!tab) return;

      tab.active = false;

      if (tab.button) {
        tab.button.classList.remove('active');
        tab.button.setAttribute('aria-selected', 'false');
      }

      if (tab.content) {
        tab.content.classList.remove('active');
        tab.content.style.display = 'none';
      }
    },

    navigateTab(direction) {
      const tabIds = Array.from(this.tabs.keys());
      const currentIndex = tabIds.indexOf(this.activeTab);

      let nextIndex;
      if (direction === 'next') {
        nextIndex = (currentIndex + 1) % tabIds.length;
      } else {
        nextIndex = currentIndex === 0 ? tabIds.length - 1 : currentIndex - 1;
      }

      const nextTabId = tabIds[nextIndex];
      this.activateTab(nextTabId);
    },

    activateDefaultTab() {
      // Try to load saved tab first
      const savedTab = this.loadSavedTab();
      if (savedTab && this.tabs.has(savedTab)) {
        this.activateTab(savedTab);
        return;
      }

      // Fallback to first tab
      const firstTab = this.tabs.keys().next().value;
      if (firstTab) {
        this.activateTab(firstTab);
      }
    },

    getActiveTab() {
      return this.activeTab;
    },

    getTabContent(tabId) {
      const tab = this.tabs.get(tabId);
      return tab ? tab.content : null;
    },

    saveActiveTab() {
      try {
        localStorage.setItem('teamstats_active_tab', this.activeTab);
      } catch (error) {
        console.warn('[TabsManager] Failed to save active tab:', error);
      }
    },

    loadSavedTab() {
      try {
        return localStorage.getItem('teamstats_active_tab');
      } catch (error) {
        console.warn('[TabsManager] Failed to load saved tab:', error);
        return null;
      }
    },
  };

  // Global registration
  global.TeamStatsTabsManager = TabsManager;

  // Auto-initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => TabsManager.init());
  } else {
    TabsManager.init();
  }
})(window);
