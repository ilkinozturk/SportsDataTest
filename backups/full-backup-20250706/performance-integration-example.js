/**
 * Performance Integration Example
 * Shows how to integrate all performance optimization features
 */

// Import performance modules
import filterManager from './js/core/FilterManager-optimized.js';
import lazyLoader from './js/utils/lazy-loader.js';
import { VirtualMatchList } from './js/modules/ui/VirtualMatchList.js';
import performanceMonitor from './js/utils/performance-monitor.js';
import { PerformanceDashboard } from './js/modules/ui/PerformanceDashboard.js';

// Import statistics modules
import { GoalsStatistics } from './js/modules/statistics/GoalsStatistics.js';
import { CardsStatistics } from './js/modules/statistics/CardsStatistics.js';
import { CornersStatistics } from './js/modules/statistics/CornersStatistics.js';

/**
 * Example 1: Using the optimized FilterManager with debounce/throttle
 */
function setupOptimizedFilters() {
  // Set custom delays for better performance
  filterManager.setDelays(150, 50); // 150ms debounce, 50ms throttle
  
  // Use batch mode for multiple filter updates
  filterManager.startBatch();
  filterManager.setFilter('current', 'home');
  filterManager.setFilter('cards', 'home');
  filterManager.setFilter('corners', 'home');
  filterManager.executeBatch(); // All updates happen at once
  
  // Use immediate mode for critical updates
  filterManager.setFilter('current', 'away', { immediate: true });
  
  // Use throttle for high-frequency updates (e.g., slider)
  let sliderValue = 0;
  const handleSliderChange = () => {
    filterManager.setFilter('timing', sliderValue, { 
      throttle: true,
      debounce: false 
    });
  };
}

/**
 * Example 2: Lazy loading modules and content
 */
function setupLazyLoading() {
  // Register statistics modules for lazy loading
  const statsContainer = document.getElementById('statistics-container');
  if (statsContainer) {
    lazyLoader.registerModule(
      statsContainer,
      './js/modules/statistics/DetailedStatistics.js',
      { 
        maxRetries: 3,
        rootMargin: '100px' // Load 100px before visible
      }
    );
  }
  
  // Lazy load images
  document.querySelectorAll('img[data-src]').forEach(img => {
    lazyLoader.registerImage(img, {
      placeholder: '/images/placeholder.png'
    });
  });
  
  // Lazy load match details
  document.querySelectorAll('[data-match-id]').forEach(element => {
    lazyLoader.registerContent(element, async (el) => {
      const matchId = el.dataset.matchId;
      const response = await fetch(`/api/matches/${matchId}`);
      const data = await response.json();
      el.innerHTML = renderMatchDetails(data);
    });
  });
}

/**
 * Example 3: Virtual scrolling for match lists
 */
function setupVirtualScrolling() {
  const matchListContainer = document.getElementById('match-list');
  if (!matchListContainer) return;
  
  // Fetch matches data
  fetch('/api/matches')
    .then(response => response.json())
    .then(matches => {
      // Create virtual list
      const virtualList = new VirtualMatchList(matchListContainer, {
        itemHeight: 80,
        buffer: 5,
        customScrollbar: true,
        renderItem: (match) => {
          return `
            <div class="match-card">
              <div class="teams">
                <span class="home">${match.homeTeam}</span>
                <span class="vs">vs</span>
                <span class="away">${match.awayTeam}</span>
              </div>
              <div class="score">${match.homeScore} - ${match.awayScore}</div>
              <div class="date">${new Date(match.date).toLocaleDateString()}</div>
            </div>
          `;
        },
        onItemClick: (match) => {
          console.log('Match clicked:', match);
        }
      });
      
      // Set matches
      virtualList.setMatches(matches);
      
      // Example: Filter matches
      const filterMatches = (team) => {
        virtualList.filter(match => 
          match.homeTeam.includes(team) || match.awayTeam.includes(team)
        );
      };
      
      // Example: Sort matches by date
      const sortByDate = () => {
        virtualList.sort((a, b) => new Date(b.date) - new Date(a.date));
      };
    });
}

/**
 * Example 4: Performance monitoring with decorators
 */
class StatisticsService {
  @performanceMonitor.measureDecorator('fetchStatistics')
  async fetchStatistics(teamId) {
    const response = await fetch(`/api/teams/${teamId}/statistics`);
    return response.json();
  }
  
  @performanceMonitor.measureDecorator('processStatistics')
  processStatistics(data) {
    // Heavy processing
    return data.map(stat => ({
      ...stat,
      calculated: stat.value * 1.5
    }));
  }
}

/**
 * Example 5: Manual performance measurement
 */
async function loadDashboard() {
  // Start timing
  const timerId = performanceMonitor.startOperation('dashboard-load', {
    section: 'main'
  });
  
  try {
    // Load data
    const data = await fetchDashboardData();
    
    // Process data
    const processed = processDashboardData(data);
    
    // Render
    renderDashboard(processed);
    
    // End timing
    const { duration, memoryDelta } = performanceMonitor.endOperation(timerId);
    console.log(`Dashboard loaded in ${duration}ms, memory delta: ${memoryDelta}MB`);
    
  } catch (error) {
    performanceMonitor.endOperation(timerId);
    throw error;
  }
}

/**
 * Example 6: Memory leak prevention in modules
 */
function setupModulesWithCleanup() {
  const modules = [];
  
  // Create modules
  const goalsStats = new GoalsStatistics(filterManager);
  const cardsStats = new CardsStatistics(filterManager);
  const cornersStats = new CornersStatistics(filterManager);
  
  modules.push(goalsStats, cardsStats, cornersStats);
  
  // Set up cleanup on page unload
  window.addEventListener('beforeunload', () => {
    modules.forEach(module => module.destroy());
    filterManager.destroy();
    lazyLoader.destroy();
    performanceMonitor.destroy();
  });
  
  // Example: Clean up specific module
  const cleanupGoalsStats = () => {
    goalsStats.destroy();
    const index = modules.indexOf(goalsStats);
    if (index > -1) {
      modules.splice(index, 1);
    }
  };
}

/**
 * Example 7: Performance dashboard integration
 */
function setupPerformanceDashboard() {
  // Create dashboard
  const dashboard = new PerformanceDashboard({
    position: 'bottom-right',
    theme: 'dark',
    refreshRate: 1000,
    collapsed: true
  });
  
  // Initialize
  dashboard.init();
  
  // Show dashboard in development mode
  if (window.location.hostname === 'localhost') {
    dashboard.show();
  }
  
  // Add custom keyboard shortcut
  document.addEventListener('keydown', (e) => {
    // Alt + P to toggle dashboard
    if (e.altKey && e.key === 'p') {
      e.preventDefault();
      dashboard.toggle();
    }
  });
  
  // Log performance report every 30 seconds in dev mode
  if (process.env.NODE_ENV === 'development') {
    setInterval(() => {
      performanceMonitor.logReport();
    }, 30000);
  }
}

/**
 * Example 8: Optimized event handling
 */
function setupOptimizedEventHandling() {
  // Use event delegation instead of individual listeners
  const container = document.getElementById('stats-container');
  
  container.addEventListener('click', (e) => {
    // Handle filter buttons
    if (e.target.matches('.filter-btn')) {
      const section = e.target.dataset.section;
      const value = e.target.dataset.value;
      
      performanceMonitor.measure('filter-change', () => {
        filterManager.setFilter(section, value, { immediate: true });
      });
    }
    
    // Handle stat cards
    if (e.target.matches('.stat-card')) {
      const statId = e.target.dataset.statId;
      handleStatClick(statId);
    }
  });
  
  // Debounced resize handler
  let resizeTimeout;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      performanceMonitor.measure('resize-handler', () => {
        updateLayout();
      });
    }, 250);
  });
}

/**
 * Complete initialization example
 */
export function initializeWithPerformance() {
  console.log('🚀 Initializing with performance optimizations...');
  
  // Set up performance monitoring first
  performanceMonitor.startOperation('app-initialization');
  
  // Initialize components
  setupOptimizedFilters();
  setupLazyLoading();
  setupVirtualScrolling();
  setupModulesWithCleanup();
  setupOptimizedEventHandling();
  
  // Set up dashboard (optional)
  if (window.ENABLE_PERFORMANCE_DASHBOARD) {
    setupPerformanceDashboard();
  }
  
  // End initialization timing
  performanceMonitor.endOperation('app-initialization');
  
  // Export for debugging
  window.performance = {
    monitor: performanceMonitor,
    filterManager,
    lazyLoader,
    getReport: () => performanceMonitor.getReport(),
    logReport: () => performanceMonitor.logReport()
  };
  
  console.log('✅ Performance optimizations initialized');
}

// Auto-initialize if this is the main script
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeWithPerformance);
} else {
  initializeWithPerformance();
}