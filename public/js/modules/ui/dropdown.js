/**
 * Dropdown Module
 * Handles dropdown functionality for the team stats application
 */

(function(global) {
  'use strict';

  const DropdownManager = {
    initialized: false,
    activeDropdown: null,
    dropdowns: new Map(),
    
    init() {
      if (this.initialized) return;
      
      this.setupDropdowns();
      this.bindEvents();
      
      this.initialized = true;
      console.log('[DropdownManager] Initialized');
    },
    
    setupDropdowns() {
      const dropdowns = document.querySelectorAll('.dropdown');
      dropdowns.forEach(dropdown => {
        const dropdownId = dropdown.id || dropdown.dataset.dropdown;
        if (dropdownId) {
          this.dropdowns.set(dropdownId, {
            element: dropdown,
            trigger: dropdown.querySelector('.dropdown-trigger'),
            menu: dropdown.querySelector('.dropdown-menu'),
            isOpen: false
          });
        }
      });
    },
    
    bindEvents() {
      // Handle dropdown trigger clicks
      document.addEventListener('click', (e) => {
        const trigger = e.target.closest('.dropdown-trigger');
        if (trigger) {
          e.preventDefault();
          e.stopPropagation();
          
          const dropdown = trigger.closest('.dropdown');
          const dropdownId = dropdown.id || dropdown.dataset.dropdown;
          
          if (this.isDropdownOpen(dropdownId)) {
            this.closeDropdown(dropdownId);
          } else {
            this.openDropdown(dropdownId);
          }
        }
        
        // Handle dropdown item clicks
        const item = e.target.closest('.dropdown-item');
        if (item) {
          const dropdown = item.closest('.dropdown');
          const dropdownId = dropdown.id || dropdown.dataset.dropdown;
          
          this.selectItem(dropdownId, item);
        }
        
        // Close dropdowns when clicking outside
        if (!e.target.closest('.dropdown')) {
          this.closeAllDropdowns();
        }
      });
      
      // Handle escape key
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && this.activeDropdown) {
          this.closeDropdown(this.activeDropdown);
        }
        
        // Handle arrow key navigation
        if ((e.key === 'ArrowUp' || e.key === 'ArrowDown') && this.activeDropdown) {
          e.preventDefault();
          this.navigateDropdown(e.key === 'ArrowDown' ? 'down' : 'up');
        }
        
        // Handle enter key
        if (e.key === 'Enter' && this.activeDropdown) {
          const dropdown = this.dropdowns.get(this.activeDropdown);
          const focusedItem = dropdown.menu.querySelector('.dropdown-item:focus');
          if (focusedItem) {
            focusedItem.click();
          }
        }
      });
    },
    
    openDropdown(dropdownId) {
      if (!this.dropdowns.has(dropdownId)) {
        console.warn('[DropdownManager] Dropdown not found:', dropdownId);
        return;
      }
      
      // Close any other open dropdown
      this.closeAllDropdowns();
      
      const dropdown = this.dropdowns.get(dropdownId);
      dropdown.isOpen = true;
      this.activeDropdown = dropdownId;
      
      dropdown.element.classList.add('active');
      dropdown.menu.style.display = 'block';
      
      // Position dropdown
      this.positionDropdown(dropdown);
      
      // Focus first item
      const firstItem = dropdown.menu.querySelector('.dropdown-item');
      if (firstItem) {
        firstItem.focus();
      }
      
      console.log('[DropdownManager] Opened dropdown:', dropdownId);
      
      // Emit dropdown open event
      if (global.TeamStatsEventBus) {
        global.TeamStatsEventBus.emit('dropdown:open', { dropdownId });
      }
    },
    
    closeDropdown(dropdownId) {
      if (!this.dropdowns.has(dropdownId)) return;
      
      const dropdown = this.dropdowns.get(dropdownId);
      dropdown.isOpen = false;
      
      dropdown.element.classList.remove('active');
      dropdown.menu.style.display = 'none';
      
      if (this.activeDropdown === dropdownId) {
        this.activeDropdown = null;
      }
      
      console.log('[DropdownManager] Closed dropdown:', dropdownId);
      
      // Emit dropdown close event
      if (global.TeamStatsEventBus) {
        global.TeamStatsEventBus.emit('dropdown:close', { dropdownId });
      }
    },
    
    closeAllDropdowns() {
      this.dropdowns.forEach((dropdown, dropdownId) => {
        if (dropdown.isOpen) {
          this.closeDropdown(dropdownId);
        }
      });
    },
    
    selectItem(dropdownId, item) {
      const dropdown = this.dropdowns.get(dropdownId);
      if (!dropdown) return;
      
      // Update trigger text if needed
      const text = item.textContent.trim();
      const triggerText = dropdown.trigger.querySelector('.dropdown-text');
      if (triggerText) {
        triggerText.textContent = text;
      }
      
      // Update selected state
      dropdown.menu.querySelectorAll('.dropdown-item').forEach(i => {
        i.classList.remove('selected');
      });
      item.classList.add('selected');
      
      // Close dropdown
      this.closeDropdown(dropdownId);
      
      // Emit selection event
      if (global.TeamStatsEventBus) {
        global.TeamStatsEventBus.emit('dropdown:select', {
          dropdownId,
          value: item.dataset.value || text,
          text: text,
          item: item
        });
      }
    },
    
    navigateDropdown(direction) {
      if (!this.activeDropdown) return;
      
      const dropdown = this.dropdowns.get(this.activeDropdown);
      const items = Array.from(dropdown.menu.querySelectorAll('.dropdown-item'));
      const currentIndex = items.findIndex(item => item === document.activeElement);
      
      let nextIndex;
      if (direction === 'down') {
        nextIndex = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
      } else {
        nextIndex = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
      }
      
      items[nextIndex].focus();
    },
    
    positionDropdown(dropdown) {
      const trigger = dropdown.trigger;
      const menu = dropdown.menu;
      
      const triggerRect = trigger.getBoundingClientRect();
      const menuRect = menu.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      
      // Reset positioning
      menu.style.top = '';
      menu.style.bottom = '';
      
      // Check if there's space below
      const spaceBelow = viewportHeight - triggerRect.bottom;
      const spaceAbove = triggerRect.top;
      
      if (spaceBelow >= menuRect.height || spaceBelow >= spaceAbove) {
        // Position below
        menu.style.top = '100%';
      } else {
        // Position above
        menu.style.bottom = '100%';
      }
    },
    
    isDropdownOpen(dropdownId) {
      const dropdown = this.dropdowns.get(dropdownId);
      return dropdown ? dropdown.isOpen : false;
    },
    
    getActiveDropdown() {
      return this.activeDropdown;
    }
  };

  // Global registration
  global.TeamStatsDropdownManager = DropdownManager;
  
  // Auto-initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => DropdownManager.init());
  } else {
    DropdownManager.init();
  }

})(window);