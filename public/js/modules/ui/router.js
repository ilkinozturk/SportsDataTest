/**
 * Router Module
 * Handles client-side routing for the team stats application
 */

(function (global) {
  'use strict';

  const Router = {
    initialized: false,
    routes: new Map(),
    currentRoute: null,

    init() {
      if (this.initialized) return;

      this.setupRoutes();
      this.bindEvents();
      this.handleInitialRoute();

      this.initialized = true;
    },

    setupRoutes() {
      this.routes.set('/', this.handleHome);
      this.routes.set('/team/:id', this.handleTeam);
      this.routes.set('/leagues', this.handleLeagues);
      this.routes.set('/stats', this.handleStats);
    },

    bindEvents() {
      window.addEventListener('popstate', e => {
        this.handleRoute(window.location.pathname);
      });

      // Handle click events for navigation
      document.addEventListener('click', e => {
        const link = e.target.closest('a[data-route]');
        if (link) {
          e.preventDefault();
          this.navigate(link.getAttribute('data-route'));
        }
      });
    },

    handleInitialRoute() {
      const path = window.location.pathname;
      this.handleRoute(path);
    },

    navigate(path) {
      if (path === this.currentRoute) return;

      history.pushState({}, '', path);
      this.handleRoute(path);
    },

    handleRoute(path) {

      // Extract route parameters
      const { handler, params } = this.matchRoute(path);

      if (handler) {
        this.currentRoute = path;
        handler.call(this, params);
      } else {
        this.handleNotFound(path);
      }
    },

    matchRoute(path) {
      for (const [pattern, handler] of this.routes) {
        const params = this.extractParams(pattern, path);
        if (params !== null) {
          return { handler, params };
        }
      }
      return { handler: null, params: null };
    },

    extractParams(pattern, path) {
      const patternParts = pattern.split('/');
      const pathParts = path.split('/');

      if (patternParts.length !== pathParts.length) {
        return null;
      }

      const params = {};
      for (let i = 0; i < patternParts.length; i++) {
        const patternPart = patternParts[i];
        const pathPart = pathParts[i];

        if (patternPart.startsWith(':')) {
          const paramName = patternPart.slice(1);
          params[paramName] = pathPart;
        } else if (patternPart !== pathPart) {
          return null;
        }
      }

      return params;
    },

    handleHome() {
      this.showView('home');
    },

    handleTeam(params) {
      const teamId = params.id;
      this.showView('team', { teamId });
    },

    handleLeagues() {
      this.showView('leagues');
    },

    handleStats() {
      this.showView('stats');
    },

    handleNotFound(path) {
      this.showView('404');
    },

    showView(viewName, data = {}) {
      // Hide all views
      const views = document.querySelectorAll('.view');
      views.forEach(view => (view.style.display = 'none'));

      // Show target view
      const targetView = document.querySelector(`[data-view="${viewName}"]`);
      if (targetView) {
        targetView.style.display = 'block';
      }

      // Emit view change event
      if (global.TeamStatsEventBus) {
        global.TeamStatsEventBus.emit('view:change', { view: viewName, data });
      }
    },
  };

  // Global registration
  global.TeamStatsRouter = Router;

  // Auto-initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => Router.init());
  } else {
    Router.init();
  }
})(window);
