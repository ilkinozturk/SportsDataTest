import { LeagueDiscoveryService } from './LeagueDiscoveryService';
import { Logger } from '../utils/logger';
import { CacheService } from './CacheService';
import fs from 'fs/promises';
import path from 'path';

interface LeagueMonitoringConfig {
  checkIntervalHours: number;
  maxLeaguesToTest: number;
  notificationThreshold: number; // Minimum change in active leagues to trigger notification
}

interface LeagueChangeEvent {
  timestamp: string;
  type: 'added' | 'removed' | 'status_changed';
  leagueId: number;
  leagueName: string;
  previousCount?: number;
  newCount?: number;
}

export class LeagueMonitoringService {
  private discoveryService: LeagueDiscoveryService;
  private cache: CacheService;
  private logger: Logger;
  private config: LeagueMonitoringConfig;
  private monitoringActive: boolean = false;
  private intervalId?: NodeJS.Timeout;

  constructor(config: Partial<LeagueMonitoringConfig> = {}) {
    this.discoveryService = new LeagueDiscoveryService();
    this.cache = new CacheService();
    this.logger = new Logger('LeagueMonitoringService');

    this.config = {
      checkIntervalHours: 24, // Check daily by default
      maxLeaguesToTest: 100,
      notificationThreshold: 1,
      ...config,
    };
  }

  /**
   * Start monitoring for league changes
   */
  async startMonitoring(): Promise<void> {
    if (this.monitoringActive) {
      this.logger.warn('Monitoring already active');
      return;
    }

    this.logger.info(
      `Starting league monitoring (checking every ${this.config.checkIntervalHours} hours)`
    );
    this.monitoringActive = true;

    // Perform initial check
    await this.performCheck();

    // Set up periodic checks
    const intervalMs = this.config.checkIntervalHours * 60 * 60 * 1000;
    this.intervalId = setInterval(async () => {
      try {
        await this.performCheck();
      } catch (error) {
        this.logger.error('Error during periodic league check:', error);
      }
    }, intervalMs);

    this.logger.info('League monitoring started successfully');
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    if (!this.monitoringActive) {
      this.logger.warn('Monitoring not active');
      return;
    }

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }

    this.monitoringActive = false;
    this.logger.info('League monitoring stopped');
  }

  /**
   * Perform a single league check
   */
  private async performCheck(): Promise<void> {
    this.logger.info('Starting periodic league availability check');

    try {
      // Get current status report
      const currentReport = await this.discoveryService.getLeagueStatusReport();

      // Get previous report from cache
      const previousReport = await this.cache.get<any>('last_league_report');

      if (previousReport) {
        const changes = await this.detectChanges(previousReport, currentReport);

        if (changes.length > 0) {
          await this.handleChanges(changes, currentReport);
        } else {
          this.logger.info('No significant changes detected in league availability');
        }
      } else {
        this.logger.info('First time monitoring - establishing baseline');
      }

      // Store current report as previous for next check
      await this.cache.set('last_league_report', currentReport, 24 * 60 * 60); // Cache for 24 hours

      this.logger.info(`League check complete: ${currentReport.totalActive} active leagues`);
    } catch (error) {
      this.logger.error('Failed to perform league check:', error);
    }
  }

  /**
   * Detect changes between league reports
   */
  private async detectChanges(
    previousReport: any,
    currentReport: any
  ): Promise<LeagueChangeEvent[]> {
    const changes: LeagueChangeEvent[] = [];

    // Create maps for easier comparison
    const previousActive = new Map(previousReport.activeLeagues.map((l: any) => [l.leagueId, l]));
    const currentActive = new Map(currentReport.activeLeagues.map((l: any) => [l.leagueId, l]));

    // Check for newly activated leagues
    for (const [leagueId, league] of currentActive) {
      if (!previousActive.has(leagueId)) {
        changes.push({
          timestamp: new Date().toISOString(),
          type: 'added',
          leagueId,
          leagueName: league.name,
        });
      }
    }

    // Check for deactivated leagues
    for (const [leagueId, league] of previousActive) {
      if (!currentActive.has(leagueId)) {
        changes.push({
          timestamp: new Date().toISOString(),
          type: 'removed',
          leagueId,
          leagueName: league.name,
        });
      }
    }

    // Check for count changes in existing leagues
    for (const [leagueId, currentLeague] of currentActive) {
      const previousLeague = previousActive.get(leagueId);
      if (
        previousLeague &&
        (previousLeague.teamsCount !== currentLeague.teamsCount ||
          previousLeague.matchesCount !== currentLeague.matchesCount)
      ) {
        changes.push({
          timestamp: new Date().toISOString(),
          type: 'status_changed',
          leagueId,
          leagueName: currentLeague.name,
          previousCount: previousLeague.matchesCount,
          newCount: currentLeague.matchesCount,
        });
      }
    }

    return changes;
  }

  /**
   * Handle detected changes
   */
  private async handleChanges(changes: LeagueChangeEvent[], currentReport: any): Promise<void> {
    this.logger.info(`Detected ${changes.length} league changes`);

    // Log all changes
    for (const change of changes) {
      switch (change.type) {
        case 'added':
          this.logger.info(`➕ New active league: ${change.leagueName} (ID: ${change.leagueId})`);
          break;
        case 'removed':
          this.logger.warn(`➖ League deactivated: ${change.leagueName} (ID: ${change.leagueId})`);
          break;
        case 'status_changed':
          this.logger.info(
            `🔄 League updated: ${change.leagueName} (${change.previousCount} → ${change.newCount} matches)`
          );
          break;
      }
    }

    // Save change log
    await this.saveChangeLog(changes);

    // Check if changes meet notification threshold
    const significantChanges = changes.filter(c => c.type === 'added' || c.type === 'removed');

    if (significantChanges.length >= this.config.notificationThreshold) {
      await this.generateUpdatedConstants(currentReport);
      await this.sendNotification(changes, currentReport);
    }
  }

  /**
   * Save change log to file
   */
  private async saveChangeLog(changes: LeagueChangeEvent[]): Promise<void> {
    const logPath = path.join(process.cwd(), 'league-changes.log');

    const logEntries = changes
      .map(
        change =>
          `${change.timestamp} - ${change.type.toUpperCase()}: ${change.leagueName} (ID: ${change.leagueId})`
      )
      .join('\n');

    try {
      await fs.appendFile(logPath, logEntries + '\n');
      this.logger.debug(`Change log updated: ${logPath}`);
    } catch (error) {
      this.logger.error('Failed to save change log:', error);
    }
  }

  /**
   * Generate updated constants file
   */
  private async generateUpdatedConstants(report: any): Promise<void> {
    try {
      const constants = this.discoveryService.generateLeagueConstants(report.activeLeagues);
      const constantsPath = path.join(
        process.cwd(),
        'src',
        'shared',
        'constants',
        'discovered-leagues.ts'
      );

      await fs.writeFile(constantsPath, constants);
      this.logger.info(`Updated league constants saved to: ${constantsPath}`);
    } catch (error) {
      this.logger.error('Failed to generate updated constants:', error);
    }
  }

  /**
   * Send notification about changes (placeholder for webhook/email integration)
   */
  private async sendNotification(changes: LeagueChangeEvent[], report: any): Promise<void> {
    // This is a placeholder - you can integrate with your preferred notification system
    const notification = {
      timestamp: new Date().toISOString(),
      message: `FootyStats league availability changed: ${changes.length} changes detected`,
      activeLeagues: report.totalActive,
      changes: changes.map(c => ({
        type: c.type,
        league: c.leagueName,
        id: c.leagueId,
      })),
    };

    this.logger.info('Notification would be sent:', notification);

    // TODO: Implement actual notification sending (webhook, email, etc.)
    // await this.sendWebhook(notification);
    // await this.sendEmail(notification);
  }

  /**
   * Get monitoring status
   */
  getMonitoringStatus(): {
    isActive: boolean;
    config: LeagueMonitoringConfig;
    nextCheckTime?: Date;
  } {
    const nextCheckTime = this.intervalId
      ? new Date(Date.now() + this.config.checkIntervalHours * 60 * 60 * 1000)
      : undefined;

    return {
      isActive: this.monitoringActive,
      config: this.config,
      nextCheckTime,
    };
  }

  /**
   * Force an immediate check
   */
  async forceCheck(): Promise<void> {
    this.logger.info('Forcing immediate league availability check');
    await this.performCheck();
  }

  /**
   * Get change history
   */
  async getChangeHistory(days: number = 30): Promise<LeagueChangeEvent[]> {
    try {
      const logPath = path.join(process.cwd(), 'league-changes.log');
      const logContent = await fs.readFile(logPath, 'utf8');

      const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      return logContent
        .split('\n')
        .filter(line => line.trim())
        .map(line => {
          // Parse log entry (simple format)
          const match = line.match(
            /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z) - (\w+): (.+) \(ID: (\d+)\)$/
          );
          if (match) {
            return {
              timestamp: match[1],
              type: match[2].toLowerCase() as 'added' | 'removed' | 'status_changed',
              leagueId: parseInt(match[4]),
              leagueName: match[3],
            };
          }
          return null;
        })
        .filter(entry => entry && new Date(entry.timestamp) >= cutoffDate) as LeagueChangeEvent[];
    } catch (error) {
      this.logger.error('Failed to read change history:', error);
      return [];
    }
  }
}
