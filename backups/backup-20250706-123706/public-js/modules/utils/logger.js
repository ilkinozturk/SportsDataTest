/**
 * Logger Module
 * Handles logging functionality for the team stats application
 */

(function(global) {
  'use strict';

  const Logger = {
    initialized: false,
    config: {
      level: 'info', // debug, info, warn, error
      maxLogs: 1000,
      enableConsole: true,
      enableStorage: true,
      storageKey: 'teamstats_logs'
    },
    levels: {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3
    },
    logs: [],
    
    init() {
      if (this.initialized) return;
      
      this.loadConfig();
      this.loadStoredLogs();
      
      this.initialized = true;
      this.info('[Logger] Initialized');
    },
    
    loadConfig() {
      try {
        const stored = localStorage.getItem('teamstats_logger_config');
        if (stored) {
          const config = JSON.parse(stored);
          this.config = { ...this.config, ...config };
        }
      } catch (error) {
        console.warn('[Logger] Failed to load config:', error);
      }
    },
    
    loadStoredLogs() {
      if (!this.config.enableStorage) return;
      
      try {
        const stored = localStorage.getItem(this.config.storageKey);
        if (stored) {
          this.logs = JSON.parse(stored);
        }
      } catch (error) {
        console.warn('[Logger] Failed to load stored logs:', error);
        this.logs = [];
      }
    },
    
    log(level, message, data = null) {
      const levelNum = this.levels[level];
      const configLevelNum = this.levels[this.config.level];
      
      // Check if this level should be logged
      if (levelNum < configLevelNum) return;
      
      const logEntry = {
        timestamp: new Date().toISOString(),
        level: level,
        message: message,
        data: data,
        url: window.location.href,
        userAgent: navigator.userAgent
      };
      
      // Add to logs array
      this.logs.push(logEntry);
      
      // Maintain max logs limit
      if (this.logs.length > this.config.maxLogs) {
        this.logs.shift();
      }
      
      // Log to console
      if (this.config.enableConsole) {
        this.logToConsole(logEntry);
      }
      
      // Store logs
      if (this.config.enableStorage) {
        this.storeLogs();
      }
      
      // Emit log event
      if (global.TeamStatsEventBus) {
        global.TeamStatsEventBus.emit('log:entry', logEntry);
      }
    },
    
    debug(message, data) {
      this.log('debug', message, data);
    },
    
    info(message, data) {
      this.log('info', message, data);
    },
    
    warn(message, data) {
      this.log('warn', message, data);
    },
    
    error(message, data) {
      this.log('error', message, data);
    },
    
    logToConsole(logEntry) {
      const { level, message, data } = logEntry;
      const timestamp = new Date(logEntry.timestamp).toLocaleTimeString();
      const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
      
      switch (level) {
        case 'debug':
          console.debug(prefix, message, data);
          break;
        case 'info':
          console.info(prefix, message, data);
          break;
        case 'warn':
          console.warn(prefix, message, data);
          break;
        case 'error':
          console.error(prefix, message, data);
          break;
      }
    },
    
    storeLogs() {
      try {
        const logsToStore = this.logs.slice(-this.config.maxLogs);
        localStorage.setItem(this.config.storageKey, JSON.stringify(logsToStore));
      } catch (error) {
        console.warn('[Logger] Failed to store logs:', error);
      }
    },
    
    getLogs(options = {}) {
      let filteredLogs = [...this.logs];
      
      // Filter by level
      if (options.level) {
        const levelNum = this.levels[options.level];
        filteredLogs = filteredLogs.filter(log => this.levels[log.level] >= levelNum);
      }
      
      // Filter by time range
      if (options.startTime) {
        const startTime = new Date(options.startTime);
        filteredLogs = filteredLogs.filter(log => new Date(log.timestamp) >= startTime);
      }
      
      if (options.endTime) {
        const endTime = new Date(options.endTime);
        filteredLogs = filteredLogs.filter(log => new Date(log.timestamp) <= endTime);
      }
      
      // Filter by message content
      if (options.search) {
        const searchTerm = options.search.toLowerCase();
        filteredLogs = filteredLogs.filter(log => 
          log.message.toLowerCase().includes(searchTerm)
        );
      }
      
      // Limit results
      if (options.limit) {
        filteredLogs = filteredLogs.slice(-options.limit);
      }
      
      return filteredLogs;
    },
    
    clearLogs() {
      this.logs = [];
      if (this.config.enableStorage) {
        localStorage.removeItem(this.config.storageKey);
      }
      this.info('[Logger] Logs cleared');
    },
    
    exportLogs(format = 'json') {
      const logs = this.getLogs();
      
      switch (format) {
        case 'json':
          return JSON.stringify(logs, null, 2);
        case 'csv':
          return this.logsToCSV(logs);
        case 'text':
          return this.logsToText(logs);
        default:
          return JSON.stringify(logs, null, 2);
      }
    },
    
    logsToCSV(logs) {
      if (logs.length === 0) return '';
      
      const headers = ['timestamp', 'level', 'message', 'data'];
      const csvRows = [headers.join(',')];
      
      logs.forEach(log => {
        const row = [
          log.timestamp,
          log.level,
          `"${log.message.replace(/"/g, '""')}"`,
          log.data ? `"${JSON.stringify(log.data).replace(/"/g, '""')}"` : ''
        ];
        csvRows.push(row.join(','));
      });
      
      return csvRows.join('\n');
    },
    
    logsToText(logs) {
      return logs.map(log => {
        const timestamp = new Date(log.timestamp).toLocaleString();
        const dataStr = log.data ? ` - ${JSON.stringify(log.data)}` : '';
        return `[${timestamp}] [${log.level.toUpperCase()}] ${log.message}${dataStr}`;
      }).join('\n');
    },
    
    setLevel(level) {
      if (this.levels[level] !== undefined) {
        this.config.level = level;
        this.saveConfig();
        this.info(`[Logger] Log level set to: ${level}`);
      }
    },
    
    setConfig(newConfig) {
      this.config = { ...this.config, ...newConfig };
      this.saveConfig();
      this.info('[Logger] Configuration updated');
    },
    
    saveConfig() {
      try {
        localStorage.setItem('teamstats_logger_config', JSON.stringify(this.config));
      } catch (error) {
        console.warn('[Logger] Failed to save config:', error);
      }
    },
    
    getStats() {
      const stats = {
        total: this.logs.length,
        debug: 0,
        info: 0,
        warn: 0,
        error: 0
      };
      
      this.logs.forEach(log => {
        stats[log.level]++;
      });
      
      return stats;
    }
  };

  // Global registration
  global.TeamStatsLogger = Logger;
  
  // Auto-initialize
  Logger.init();

})(window);