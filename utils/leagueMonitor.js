/**
 * League Monitor Utility
 * Monitors FootyStats API for league changes and updates the application
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const Logger = require('./logger');

class LeagueMonitor {
  constructor(apiKey, baseUrl = 'https://api.football-data-api.com') {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
    this.currentLeagues = [];
    this.lastCheck = null;
    this.requestCount = 0;
    this.lastRequestTime = 0;
    this.logger = new Logger('LeagueMonitor');
  }

  /**
   * Rate limiting - 1 second between requests
   */
  async rateLimit() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    if (timeSinceLastRequest < 1000) {
      await new Promise(resolve => setTimeout(resolve, 1000 - timeSinceLastRequest));
    }

    this.lastRequestTime = Date.now();
    this.requestCount++;
  }

  /**
   * Make API request with rate limiting
   */
  async makeApiRequest(endpoint, params = {}) {
    await this.rateLimit();

    this.logger.debug(`API Request #${this.requestCount}: ${endpoint}`);

    const response = await axios.get(`${this.baseUrl}${endpoint}`, {
      params: { key: this.apiKey, ...params },
      timeout: 10000,
    });

    return response.data;
  }

  /**
   * Test if a league is active by checking teams
   */
  async testLeague(leagueId) {
    try {
      const data = await this.makeApiRequest('/league-teams', { league_id: leagueId });
      return data.success && data.data && data.data.length > 0;
    } catch (error) {
      return false;
    }
  }

  /**
   * Discover currently active leagues from a range
   */
  async discoverActiveLeagues(startId = 1, endId = 200) {
    this.logger.info(`🔍 Discovering active leagues from ${startId} to ${endId}...`);

    const activeLeagues = [];
    const _testPromises = [];

    // Test leagues in batches to respect rate limits
    const batchSize = 5;
    for (let i = startId; i <= endId; i += batchSize) {
      const batch = [];

      for (let j = i; j < i + batchSize && j <= endId; j++) {
        batch.push(this.testLeague(j));
      }

      const results = await Promise.all(batch);

      results.forEach((isActive, index) => {
        const leagueId = i + index;
        if (isActive) {
          activeLeagues.push(leagueId);
          this.logger.info(`✅ Found active league: ${leagueId}`);
        }
      });

      // Small delay between batches
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    this.logger.info(`🎯 Discovery complete: ${activeLeagues.length} active leagues found`);
    return activeLeagues;
  }

  /**
   * Load current leagues from file
   */
  loadCurrentLeagues() {
    try {
      const serverPath = path.join(__dirname, '../simple-server-optimized.js');
      const serverContent = fs.readFileSync(serverPath, 'utf8');

      // Extract league IDs from the activeLeagueIds array
      const match = serverContent.match(/activeLeagueIds\s*=\s*\[([\d,\s]+)\]/);
      if (match) {
        this.currentLeagues = match[1].split(',').map(id => parseInt(id.trim(), 10));
        this.logger.info(`📚 Loaded ${this.currentLeagues.length} current leagues`);
      }
    } catch (error) {
      this.logger.error('❌ Failed to load current leagues:', error.message);
    }
  }

  /**
   * Compare discovered leagues with current leagues
   */
  compareLeagues(discoveredLeagues) {
    const current = new Set(this.currentLeagues);
    const discovered = new Set(discoveredLeagues);

    const added = [...discovered].filter(id => !current.has(id));
    const removed = [...current].filter(id => !discovered.has(id));
    const unchanged = [...current].filter(id => discovered.has(id));

    return {
      added,
      removed,
      unchanged,
      hasChanges: added.length > 0 || removed.length > 0,
    };
  }

  /**
   * Update server file with new leagues
   */
  updateServerFile(newLeagues) {
    try {
      const serverPath = path.join(__dirname, '../simple-server-optimized.js');
      let serverContent = fs.readFileSync(serverPath, 'utf8');

      const newLeagueString = newLeagues.join(', ');
      serverContent = serverContent.replace(
        /activeLeagueIds\s*=\s*\[[\d,\s]+\]/,
        `activeLeagueIds = [${newLeagueString}]`
      );

      fs.writeFileSync(serverPath, serverContent);
      this.logger.info(`✅ Updated server with ${newLeagues.length} leagues`);
    } catch (error) {
      this.logger.error('❌ Failed to update server file:', error.message);
    }
  }

  /**
   * Log league changes
   */
  logChanges(changes) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      added: changes.added,
      removed: changes.removed,
      totalLeagues: changes.unchanged.length + changes.added.length,
    };

    this.logger.info('\n📊 League Changes Summary:');
    this.logger.info(`📅 Time: ${timestamp}`);
    this.logger.info(`✅ Added: ${changes.added.length} leagues - ${changes.added.join(', ')}`);
    this.logger.info(`❌ Removed: ${changes.removed.length} leagues - ${changes.removed.join(', ')}`);
    this.logger.info(`📊 Total: ${logEntry.totalLeagues} leagues active`);

    // Append to log file
    try {
      const logPath = path.join(__dirname, '../league-changes.log');
      const logLine = `${JSON.stringify(logEntry)}\n`;
      fs.appendFileSync(logPath, logLine);
    } catch (error) {
      this.logger.error('❌ Failed to write log:', error.message);
    }
  }

  /**
   * Check for league changes and update if needed
   */
  async checkForChanges(testRange = { start: 1, end: 200 }) {
    this.logger.info('🔍 Checking for league changes...');

    this.loadCurrentLeagues();
    const discoveredLeagues = await this.discoverActiveLeagues(testRange.start, testRange.end);
    const changes = this.compareLeagues(discoveredLeagues);

    if (changes.hasChanges) {
      this.logger.info('🚨 League changes detected!');
      this.logChanges(changes);

      const newLeagues = [...changes.unchanged, ...changes.added];
      this.updateServerFile(newLeagues);

      this.logger.info('✅ Server updated with new league configuration');
      return { success: true, changes };
    } else {
      this.logger.info('✅ No league changes detected');
      return { success: true, changes: null };
    }
  }

  /**
   * Start periodic monitoring
   */
  startMonitoring(intervalHours = 1) {
    this.logger.info(`🕐 Starting league monitoring (every ${intervalHours} hours)`);

    // Initial check
    this.checkForChanges();

    // Set up periodic checks
    setInterval(
      () => {
        this.checkForChanges();
      },
      intervalHours * 60 * 60 * 1000
    );
  }
}

module.exports = LeagueMonitor;

// CLI usage
if (require.main === module) {
  const API_KEY = process.env.FOOTYSTATS_API_KEY || '29581005f929990bf13dc9c964200d537e484ee248f0ac2d0f76910a6ce7aae9';
  const monitor = new LeagueMonitor(API_KEY);

  const command = process.argv[2];

  switch (command) {
    case 'check':
      monitor.checkForChanges();
      break;
    case 'monitor':
      monitor.startMonitoring(1); // Check every hour
      break;
    case 'discover': {
      const start = parseInt(process.argv[3], 10) || 1;
      const end = parseInt(process.argv[4], 10) || 200;
      monitor.discoverActiveLeagues(start, end);
      break;
    }
    default:
      console.log('Usage:');
      console.log('  node leagueMonitor.js check           - Check for changes once');
      console.log('  node leagueMonitor.js monitor         - Start continuous monitoring');
      console.log('  node leagueMonitor.js discover 1 200  - Discover leagues in range');
  }
}
