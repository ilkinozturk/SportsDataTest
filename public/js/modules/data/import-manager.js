/**
 * Import Manager Module
 * Handles data import functionality for the team stats application
 */

(function (global) {
  'use strict';

  const ImportManager = {
    initialized: false,
    supportedFormats: ['json', 'csv'],

    init() {
      if (this.initialized) return;

      this.bindEvents();

      this.initialized = true;
      console.log('[ImportManager] Initialized');
    },

    bindEvents() {
      // Handle file input changes
      document.addEventListener('change', e => {
        const fileInput = e.target.closest('input[type="file"][data-import]');
        if (fileInput && fileInput.files.length > 0) {
          this.handleFileImport(fileInput.files[0], fileInput.dataset.import);
        }
      });

      // Handle drag and drop
      document.addEventListener('dragover', e => {
        const dropZone = e.target.closest('.import-drop-zone');
        if (dropZone) {
          e.preventDefault();
          dropZone.classList.add('drag-over');
        }
      });

      document.addEventListener('dragleave', e => {
        const dropZone = e.target.closest('.import-drop-zone');
        if (dropZone) {
          dropZone.classList.remove('drag-over');
        }
      });

      document.addEventListener('drop', e => {
        const dropZone = e.target.closest('.import-drop-zone');
        if (dropZone) {
          e.preventDefault();
          dropZone.classList.remove('drag-over');

          const files = Array.from(e.dataTransfer.files);
          if (files.length > 0) {
            this.handleFileImport(files[0], dropZone.dataset.import);
          }
        }
      });
    },

    handleFileImport(file, importType) {
      console.log('[ImportManager] Importing file:', file.name, 'Type:', importType);

      if (!this.validateFile(file)) {
        this.showError(
          'Invalid file format. Supported formats: ' + this.supportedFormats.join(', ')
        );
        return;
      }

      const reader = new FileReader();

      reader.onload = e => {
        try {
          const content = e.target.result;
          const data = this.parseFileContent(content, file.name);

          if (data) {
            this.processImportedData(data, importType);
          }
        } catch (error) {
          console.error('[ImportManager] Failed to parse file:', error);
          this.showError('Failed to parse file: ' + error.message);
        }
      };

      reader.onerror = () => {
        this.showError('Failed to read file');
      };

      reader.readAsText(file);
    },

    validateFile(file) {
      const extension = file.name.split('.').pop().toLowerCase();
      return this.supportedFormats.includes(extension);
    },

    parseFileContent(content, filename) {
      const extension = filename.split('.').pop().toLowerCase();

      switch (extension) {
        case 'json':
          return this.parseJSON(content);
        case 'csv':
          return this.parseCSV(content);
        default:
          throw new Error('Unsupported file format');
      }
    },

    parseJSON(content) {
      try {
        return JSON.parse(content);
      } catch (error) {
        throw new Error('Invalid JSON format');
      }
    },

    parseCSV(content) {
      const lines = content.split('\n').filter(line => line.trim());
      if (lines.length < 2) {
        throw new Error('CSV must have at least a header and one data row');
      }

      const headers = this.parseCSVLine(lines[0]);
      const data = [];

      for (let i = 1; i < lines.length; i++) {
        const values = this.parseCSVLine(lines[i]);
        if (values.length === headers.length) {
          const row = {};
          headers.forEach((header, index) => {
            row[header] = this.convertValue(values[index]);
          });
          data.push(row);
        }
      }

      return data;
    },

    parseCSVLine(line) {
      const values = [];
      let current = '';
      let inQuotes = false;

      for (let i = 0; i < line.length; i++) {
        const char = line[i];

        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          values.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }

      values.push(current.trim());
      return values;
    },

    convertValue(value) {
      // Remove quotes
      value = value.replace(/^"|"$/g, '');

      // Try to convert to number
      if (!isNaN(value) && value !== '') {
        return parseFloat(value);
      }

      // Try to convert to boolean
      if (value.toLowerCase() === 'true') return true;
      if (value.toLowerCase() === 'false') return false;

      return value;
    },

    processImportedData(data, importType) {
      console.log('[ImportManager] Processing imported data:', importType, data);

      switch (importType) {
        case 'team-stats':
          this.importTeamStats(data);
          break;
        case 'matches':
          this.importMatches(data);
          break;
        case 'configuration':
          this.importConfiguration(data);
          break;
        default:
          console.warn('[ImportManager] Unknown import type:', importType);
      }

      // Emit import event
      if (global.TeamStatsEventBus) {
        global.TeamStatsEventBus.emit('data:imported', {
          type: importType,
          data: data,
        });
      }

      this.showSuccess('Data imported successfully');
    },

    importTeamStats(data) {
      if (global.TeamStatsStateManager) {
        if (Array.isArray(data)) {
          // Multiple teams
          data.forEach(teamData => {
            global.TeamStatsStateManager.setStatistics(teamData);
          });
        } else {
          // Single team
          global.TeamStatsStateManager.setStatistics(data);
        }
      }
    },

    importMatches(data) {
      if (global.TeamStatsStateManager) {
        global.TeamStatsStateManager.set('matches', data);
      }
    },

    importConfiguration(data) {
      // Import configuration settings
      try {
        Object.keys(data).forEach(key => {
          localStorage.setItem(`teamstats_${key}`, JSON.stringify(data[key]));
        });
      } catch (error) {
        console.error('[ImportManager] Failed to import configuration:', error);
      }
    },

    showError(message) {
      console.error('[ImportManager] Error:', message);

      // Show error to user
      if (global.TeamStatsModalManager) {
        global.TeamStatsModalManager.createModal(
          'import-error',
          `
          <div class="error-message">
            <h4>Import Error</h4>
            <p>${message}</p>
          </div>
        `,
          { title: 'Import Failed' }
        );
        global.TeamStatsModalManager.openModal('import-error');
      } else {
        alert('Import Error: ' + message);
      }
    },

    showSuccess(message) {
      console.log('[ImportManager] Success:', message);

      // Show success to user
      if (global.TeamStatsEventBus) {
        global.TeamStatsEventBus.emit('notification:show', {
          type: 'success',
          message: message,
        });
      }
    },

    createImportInterface(containerId, importType) {
      const container = document.getElementById(containerId);
      if (!container) return;

      container.innerHTML = `
        <div class="import-interface">
          <div class="import-drop-zone" data-import="${importType}">
            <p>Drop files here or click to browse</p>
            <input type="file" accept=".json,.csv" data-import="${importType}" style="display: none;">
          </div>
          <div class="import-progress" style="display: none;">
            <div class="progress-bar"></div>
          </div>
        </div>
      `;

      // Handle click to open file dialog
      const dropZone = container.querySelector('.import-drop-zone');
      const fileInput = container.querySelector('input[type="file"]');

      dropZone.addEventListener('click', () => {
        fileInput.click();
      });
    },
  };

  // Global registration
  global.TeamStatsImportManager = ImportManager;

  // Auto-initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => ImportManager.init());
  } else {
    ImportManager.init();
  }
})(window);
