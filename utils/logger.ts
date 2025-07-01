// Enhanced Logger Utility - Professional logging with levels
import * as fs from 'fs';
import * as path from 'path';
import { LoggerOptions, LogEntry } from '@types/service.types';

type LogLevel = 'ERROR' | 'WARN' | 'INFO' | 'DEBUG' | 'SUCCESS';

interface LogMeta {
  [key: string]: any;
}

interface ErrorMeta {
  error: {
    message: string;
    stack?: string;
    code?: string;
  };
}

interface ApiCallMeta {
  endpoint: string;
  params: any;
  responseStatus?: number;
  duration: string;
  success: boolean;
}

class Logger {
  private readonly serviceName: string;
  private readonly logDir: string;
  private readonly logFile: string;

  constructor(serviceName: string) {
    this.serviceName = serviceName;
    this.logDir = path.join(__dirname, '..', 'logs');

    // Ensure log directory exists
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }

    this.logFile = path.join(
      this.logDir,
      `${serviceName}-${new Date().toISOString().split('T')[0]}.log`
    );
  }

  private formatMessage(level: LogLevel, message: string, meta: LogMeta = {}): string {
    const timestamp = new Date().toISOString();
    const logEntry: LogEntry = {
      timestamp: new Date(timestamp),
      level,
      service: this.serviceName,
      message,
      metadata: meta,
    };

    return JSON.stringify(logEntry);
  }

  private writeLog(level: LogLevel, message: string, meta?: LogMeta): void {
    const logMessage = this.formatMessage(level, message, meta || {});

    // Console output with colors
    const colors: Record<LogLevel, string> = {
      ERROR: '\x1b[31m',
      WARN: '\x1b[33m',
      INFO: '\x1b[36m',
      DEBUG: '\x1b[90m',
      SUCCESS: '\x1b[32m',
    };

    const resetColor = '\x1b[0m';
    console.log(`${colors[level] || ''}[${this.serviceName}] ${level}: ${message}${resetColor}`);

    // File output
    fs.appendFileSync(this.logFile, `${logMessage}\n`);
  }

  error(message: string, error?: Error | null): void {
    const meta: ErrorMeta | {} = error
      ? {
          error: {
            message: error.message,
            stack: error.stack,
            code: (error as any).code,
          },
        }
      : {};

    this.writeLog('ERROR', message, meta);
  }

  warn(message: string, meta: LogMeta = {}): void {
    this.writeLog('WARN', message, meta);
  }

  info(message: string, meta: LogMeta = {}): void {
    this.writeLog('INFO', message, meta);
  }

  debug(message: string, meta: LogMeta = {}): void {
    if (process.env.NODE_ENV === 'development' || process.env.DEBUG) {
      this.writeLog('DEBUG', message, meta);
    }
  }

  success(message: string, meta: LogMeta = {}): void {
    this.writeLog('SUCCESS', message, meta);
  }

  // API calls special logging
  apiCall(
    endpoint: string,
    params: any,
    response: { status?: number; success?: boolean },
    duration: number
  ): void {
    const meta: ApiCallMeta = {
      endpoint,
      params,
      responseStatus: response?.status,
      duration: `${duration}ms`,
      success: response?.success || false,
    };

    this.writeLog('INFO', `API Call: ${endpoint}`, meta);
  }
}

export default Logger;
module.exports = Logger;