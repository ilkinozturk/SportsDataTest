/**
 * Export Manager Module
 * Handles data export functionality for the team stats application
 */

(function (global) {
  'use strict';

  const ExportManager = {
    initialized: false,

    init() {
      if (this.initialized) return;

      this.bindEvents();

      this.initialized = true;
    },

    bindEvents() {
      document.addEventListener('click', e => {
        const exportBtn = e.target.closest('[data-export]');
        if (exportBtn) {
          e.preventDefault();
          const format = exportBtn.dataset.export;
          const data = exportBtn.dataset.exportData;
          this.exportData(format, data);
        }
      });
    },

    exportData(format, dataSource) {

      let data;
      if (dataSource === 'current-stats') {
        data = this.getCurrentStats();
      } else if (dataSource === 'all-stats') {
        data = this.getAllStats();
      } else {
        data = this.getCustomData(dataSource);
      }

      switch (format.toLowerCase()) {
        case 'csv':
          this.exportToCSV(data);
          break;
        case 'json':
          this.exportToJSON(data);
          break;
        case 'excel':
          this.exportToExcel(data);
          break;
        case 'pdf':
          this.exportToPDF(data);
          break;
        default:
      }
    },

    getCurrentStats() {
      // Get currently displayed statistics
      const stats = {};

      // Get team info
      const teamName = document.querySelector('.team-name')?.textContent || 'Unknown Team';
      stats.teamName = teamName;

      // Get visible statistics
      const statElements = document.querySelectorAll('.stat-value');
      statElements.forEach(el => {
        const label = el.closest('.stat-item')?.querySelector('.stat-label')?.textContent;
        if (label) {
          stats[label] = el.textContent;
        }
      });

      return stats;
    },

    getAllStats() {
      // Get all available statistics from state manager
      if (global.TeamStatsStateManager) {
        return global.TeamStatsStateManager.getStatistics();
      }
      return this.getCurrentStats();
    },

    getCustomData(dataSource) {
      // Handle custom data sources
      try {
        return JSON.parse(dataSource);
      } catch (error) {
        return this.getCurrentStats();
      }
    },

    exportToCSV(data) {
      const csv = this.convertToCSV(data);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      this.downloadFile(blob, 'team-stats.csv');
    },

    exportToJSON(data) {
      const json = JSON.stringify(data, null, 2);
      const blob = new Blob([json], { type: 'application/json;charset=utf-8;' });
      this.downloadFile(blob, 'team-stats.json');
    },

    exportToExcel(data) {
      // For now, export as CSV which can be opened in Excel
      this.exportToCSV(data);
    },

    exportToPDF(data) {
      // PDF export would require a library like jsPDF
    },

    convertToCSV(data) {
      if (Array.isArray(data)) {
        // Handle array of objects
        if (data.length === 0) return '';

        const headers = Object.keys(data[0]);
        const csvHeaders = headers.join(',');

        const csvRows = data.map(row => {
          return headers
            .map(header => {
              const value = row[header];
              return typeof value === 'string' && value.includes(',') ? `"${value}"` : value;
            })
            .join(',');
        });

        return [csvHeaders, ...csvRows].join('\n');
      } else {
        // Handle single object
        const rows = Object.entries(data).map(([key, value]) => {
          const escapedValue =
            typeof value === 'string' && value.includes(',') ? `"${value}"` : value;
          return `${key},${escapedValue}`;
        });

        return ['Statistic,Value', ...rows].join('\n');
      }
    },

    downloadFile(blob, filename) {
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.style.display = 'none';

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      URL.revokeObjectURL(url);

    },

    exportChart(chartId, format = 'png') {
      const chartElement = document.getElementById(chartId);
      if (!chartElement) {
        return;
      }

      // This would require canvas conversion for charts
    },
  };

  // Global registration
  global.TeamStatsExportManager = ExportManager;

  // Auto-initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => ExportManager.init());
  } else {
    ExportManager.init();
  }
})(window);
