/**
 * API Configuration Fix
 * This script ensures API endpoints work correctly in test environment
 */

(function() {
  'use strict';
  
  // Wait for modules to load
  function fixAPIConfig() {
    // Fix APIClient if available
    if (window.TeamStatsAPIClient && window.TeamStatsAPIClient.config) {
      const config = window.TeamStatsAPIClient.config;
      if (config.baseURL === '/api' || !config.baseURL.includes('http')) {
        config.baseURL = 'http://localhost:3005/api';
        console.log('[API Config Fix] Updated APIClient baseURL to:', config.baseURL);
      }
    }
    
    // Fix TeamService if available
    if (window.TeamStatsTeamService) {
      if (window.TeamStatsTeamService.baseUrl === '/api/teams') {
        window.TeamStatsTeamService.baseUrl = 'http://localhost:3005/api/teams';
        console.log('[API Config Fix] Updated TeamService baseUrl to:', window.TeamStatsTeamService.baseUrl);
      }
    }
    
    // Fix Constants if needed
    if (window.TeamStatsConstants) {
      const apiConstants = window.TeamStatsConstants.get('API');
      if (apiConstants && apiConstants.BASE_URL === '/api') {
        // Note: Constants are usually immutable, but we can override in APIClient
        console.log('[API Config Fix] Constants BASE_URL is relative, but APIClient config has been updated');
      }
    }
  }
  
  // Apply fix when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      setTimeout(fixAPIConfig, 100);
    });
  } else {
    setTimeout(fixAPIConfig, 100);
  }
})();