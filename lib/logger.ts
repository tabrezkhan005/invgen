/**
 * Simple offline logger for the invoice application
 * Logs errors and crashes to console and optionally to a log file
 */

export interface LogEntry {
  timestamp: string;
  level: 'error' | 'warn' | 'info' | 'debug';
  message: string;
  error?: Error;
  context?: Record<string, any>;
}

class Logger {
  private logs: LogEntry[] = [];
  private maxLogs = 100;

  private formatMessage(entry: LogEntry): string {
    const time = new Date(entry.timestamp).toISOString();
    const context = entry.context ? ` | ${JSON.stringify(entry.context)}` : '';
    const error = entry.error ? ` | ${entry.error.stack || entry.error.message}` : '';
    return `[${time}] ${entry.level.toUpperCase()}: ${entry.message}${context}${error}`;
  }

  private addLog(level: LogEntry['level'], message: string, errorOrContext?: Error | Record<string, unknown>, context?: Record<string, unknown>) {
    let error: Error | undefined;
    let ctx: Record<string, unknown> | undefined;

    if (errorOrContext instanceof Error) {
      error = errorOrContext;
      ctx = context;
    } else if (errorOrContext) {
      ctx = errorOrContext;
    }

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      error,
      context: ctx
    };

    this.logs.push(entry);

    // Keep only the last maxLogs entries
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Always log to console
    const formatted = this.formatMessage(entry);
    console[level](formatted);

    // Note: Audit logging would be added here when the API is available
  }

  error(message: string, error?: Error, context?: Record<string, any>) {
    this.addLog('error', message, error, context);
  }

  warn(message: string, context?: Record<string, any>) {
    this.addLog('warn', message, context);
  }

  info(message: string, context?: Record<string, any>) {
    this.addLog('info', message, context);
  }

  debug(message: string, context?: Record<string, any>) {
    this.addLog('debug', message, context);
  }

  // Get recent logs (useful for debugging)
  getRecentLogs(count = 50): LogEntry[] {
    return this.logs.slice(-count);
  }

  // Clear logs
  clear() {
    this.logs = [];
  }
}

// Global logger instance
export const logger = new Logger();

// Global error handler
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    logger.error('Global JavaScript error', event.error, {
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      message: event.message
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    logger.error('Unhandled promise rejection', event.reason, {
      reason: event.reason
    });
  });
}

export default logger;
