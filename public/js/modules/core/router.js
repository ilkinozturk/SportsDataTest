/**
 * Core Router Module
 * Handles URL routing for the team stats application
 */

(function(global) {
  'use strict';

  const CoreRouter = {
    initialized: false,
    routes: new Map(),
    currentRoute: null,
    params: {},
    
    init() {
      if (this.initialized) return;
      
      this.setupDefaultRoutes();
      this.bindEvents();
      this.handleInitialRoute();
      
      this.initialized = true;
      console.log('[CoreRouter] Initialized');
    },
    
    setupDefaultRoutes() {
      // Add default routes
      this.addRoute('/', this.handleHome.bind(this));
      this.addRoute('/team/:id', this.handleTeam.bind(this));
      this.addRoute('/team-stats.html', this.handleTeamStatsHtml.bind(this));
      this.addRoute('/stats', this.handleStats.bind(this));
    },
    
    bindEvents() {
      // Handle popstate for browser back/forward
      window.addEventListener('popstate', (e) => {
        this.handleCurrentURL();
      });
      
      // Handle navigation links
      document.addEventListener('click', (e) => {
        const link = e.target.closest('a[data-route]');
        if (link) {
          e.preventDefault();
          this.navigate(link.getAttribute('data-route'));
        }
      });
    },
    
    addRoute(pattern, handler) {
      this.routes.set(pattern, handler);
      console.log(`[CoreRouter] Route added: ${pattern}`);
    },
    
    navigate(path) {
      if (path === this.currentRoute) return;
      
      history.pushState({ path }, '', path);
      this.handleRoute(path);
    },
    
    handleInitialRoute() {
      this.handleCurrentURL();
    },
    
    handleCurrentURL() {
      const path = window.location.pathname + window.location.search;
      this.handleRoute(path);
    },
    
    handleRoute(path) {
      console.log('[CoreRouter] Handling route:', path);
      
      // Extract query parameters
      const [pathname, search] = path.split('?');
      this.params = this.parseQueryString(search || '');
      
      // Find matching route
      const { handler, routeParams } = this.findMatchingRoute(pathname);
      
      if (handler) {
        this.currentRoute = pathname;
        this.params = { ...this.params, ...routeParams };
        handler(this.params);
      } else {
        this.handleNotFound(pathname);
      }
    },
    
    findMatchingRoute(pathname) {
      for (const [pattern, handler] of this.routes) {
        const routeParams = this.matchRoute(pattern, pathname);
        if (routeParams !== null) {
          return { handler, routeParams };
        }
      }
      return { handler: null, routeParams: {} };
    },
    
    matchRoute(pattern, pathname) {
      const patternParts = pattern.split('/');
      const pathParts = pathname.split('/');
      
      if (patternParts.length !== pathParts.length) {
        return null;
      }
      
      const params = {};
      
      for (let i = 0; i < patternParts.length; i++) {
        const patternPart = patternParts[i];
        const pathPart = pathParts[i];
        
        if (patternPart.startsWith(':')) {
          // Dynamic parameter
          const paramName = patternPart.slice(1);
          params[paramName] = pathPart;
        } else if (patternPart !== pathPart) {
          // Static part doesn't match
          return null;
        }
      }
      
      return params;
    },
    
    parseQueryString(search) {
      const params = {};
      const urlParams = new URLSearchParams(search);
      
      for (const [key, value] of urlParams) {
        params[key] = value;
      }
      
      return params;
    },
    
    // Default route handlers
    handleHome(params) {
      console.log('[CoreRouter] Home route', params);
      this.showView('home');
    },
    
    handleTeam(params) {
      console.log('[CoreRouter] Team route', params);
      this.showView('team', params);
      
      // Emit team change event
      if (global.TeamStatsEventBus && params.id) {
        global.TeamStatsEventBus.emit('route:team', { teamId: params.id });
      }
    },
    
    handleTeamStatsHtml(params) {
      console.log('[CoreRouter] Team Stats HTML route', params);
      
      // Extract teamId from query parameters
      if (params.teamId) {
        this.handleTeam({ id: params.teamId });
      } else {
        this.showView('team-stats');
      }
    },
    
    handleStats(params) {
      console.log('[CoreRouter] Stats route', params);
      this.showView('stats');
    },
    
    handleNotFound(path) {
      console.warn('[CoreRouter] Route not found:', path);
      this.showView('404');
    },
    
    showView(viewName, data = {}) {
      // Hide all views
      const views = document.querySelectorAll('[data-view]');
      views.forEach(view => view.style.display = 'none');
      
      // Show target view
      const targetView = document.querySelector(`[data-view="${viewName}"]`);
      if (targetView) {
        targetView.style.display = 'block';
      }
      
      // Emit view change event
      if (global.TeamStatsEventBus) {
        global.TeamStatsEventBus.emit('route:view', { view: viewName, data });
      }
    },
    
    // Utility methods
    getCurrentRoute() {
      return this.currentRoute;
    },
    
    getCurrentParams() {
      return { ...this.params };
    },
    
    buildURL(pattern, params = {}) {
      let url = pattern;
      
      // Replace route parameters
      Object.entries(params).forEach(([key, value]) => {
        url = url.replace(`:${key}`, value);
      });
      
      return url;
    }
  };

  // Global registration
  global.TeamStatsCoreRouter = CoreRouter;
  
  // Auto-initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => CoreRouter.init());
  } else {
    CoreRouter.init();
  }

})(window);