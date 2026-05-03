/**
 * 🪵 Structured Logging & Error Categorization Utility
 * 
 * Provides consistent logging with error categorization, severity levels,
 * and structured output for better debugging and monitoring.
 */

const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  CRITICAL: 4
};

const ERROR_CATEGORIES = {
  NETWORK: 'NETWORK',
  API: 'API',
  VALIDATION: 'VALIDATION',
  DATABASE: 'DATABASE',
  AUTH: 'AUTH',
  CONFIG: 'CONFIG',
  TIMEOUT: 'TIMEOUT',
  RATE_LIMIT: 'RATE_LIMIT',
  RESOURCE: 'RESOURCE',
  UNKNOWN: 'UNKNOWN'
};

// Default log level (can be overridden by env var)
const DEFAULT_LOG_LEVEL = process.env.LOG_LEVEL ? 
  LOG_LEVELS[process.env.LOG_LEVEL.toUpperCase()] || LOG_LEVELS.INFO : 
  LOG_LEVELS.INFO;

class StructuredLogger {
  constructor(serviceName) {
    this.serviceName = serviceName;
    this.logLevel = DEFAULT_LOG_LEVEL;
  }

  /**
   * Categorize error based on error message and properties
   */
  categorizeError(error) {
    const msg = error.message || String(error);
    
    if (msg.includes('timeout') || msg.includes('Timeout')) {
      return ERROR_CATEGORIES.TIMEOUT;
    }
    if (msg.includes('429') || msg.includes('rate limit') || msg.includes('quota') || msg.includes('Rate Limit')) {
      return ERROR_CATEGORIES.RATE_LIMIT;
    }
    if (msg.includes('network') || msg.includes('ECONN') || msg.includes('socket') || msg.includes('fetch')) {
      return ERROR_CATEGORIES.NETWORK;
    }
    if (msg.includes('api') || msg.includes('API') || msg.includes('endpoint') || msg.includes('response')) {
      return ERROR_CATEGORIES.API;
    }
    if (msg.includes('firestore') || msg.includes('database') || msg.includes('db') || msg.includes('collection')) {
      return ERROR_CATEGORIES.DATABASE;
    }
    if (msg.includes('env') || msg.includes('config') || msg.includes('missing') || msg.includes('undefined')) {
      return ERROR_CATEGORIES.CONFIG;
    }
    
    return ERROR_CATEGORIES.UNKNOWN;
  }

  /**
   * Format log entry with consistent structure
   */
  formatLog(level, message, meta = {}) {
    const timestamp = new Date().toISOString();
    const levelStr = Object.keys(LOG_LEVELS).find(key => LOG_LEVELS[key] === level);
    
    const baseEntry = {
      timestamp,
      level: levelStr,
      service: this.serviceName,
      message
    };

    // Add error category if present
    if (meta.error) {
      meta.category = this.categorizeError(meta.error);
    }

    // Merge with metadata
    const entry = { ...baseEntry, ...meta };

    return JSON.stringify(entry);
  }

  /**
   * Log methods with severity checking
   */
  debug(message, meta = {}) {
    if (this.logLevel <= LOG_LEVELS.DEBUG) {
      console.debug(this.formatLog(LOG_LEVELS.DEBUG, message, meta));
    }
  }

  info(message, meta = {}) {
    if (this.logLevel <= LOG_LEVELS.INFO) {
      console.info(this.formatLog(LOG_LEVELS.INFO, message, meta));
    }
  }

  warn(message, meta = {}) {
    if (this.logLevel <= LOG_LEVELS.WARN) {
      console.warn(this.formatLog(LOG_LEVELS.WARN, message, meta));
    }
  }

  error(message, error = null, meta = {}) {
    if (this.logLevel <= LOG_LEVELS.ERROR) {
      const fullMeta = { ...meta, error: error || message };
      console.error(this.formatLog(LOG_LEVELS.ERROR, message, fullMeta));
    }
  }

  critical(message, error = null, meta = {}) {
    if (this.logLevel <= LOG_LEVELS.CRITICAL) {
      const fullMeta = { ...meta, error: error || message };
      console.error(this.formatLog(LOG_LEVELS.CRITICAL, message, fullMeta));
    }
  }

  /**
   * Log API call with timing and result
   */
  async logApiCall(apiName, callFn, meta = {}) {
    const startTime = Date.now();
    this.info(`API Call Started: ${apiName}`, { ...meta, apiName, action: 'start' });

    try {
      const result = await callFn();
      const duration = Date.now() - startTime;
      this.info(`API Call Success: ${apiName}`, { 
        ...meta, 
        apiName, 
        action: 'success', 
        durationMs: duration,
        success: true 
      });
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      const category = this.categorizeError(error);
      this.error(`API Call Failed: ${apiName}`, error, { 
        ...meta, 
        apiName, 
        action: 'failure', 
        durationMs: duration,
        success: false,
        category 
      });
      throw error;
    }
  }

  /**
   * Log retry attempt with exponential backoff
   */
  logRetry(operation, attempt, maxAttempts, delayMs = 0) {
    this.warn(`Retry Attempt: ${operation}`, {
      operation,
      attempt,
      maxAttempts,
      delayMs,
      action: 'retry'
    });
  }

  /**
   * Log resource usage for memory optimization
   */
  logResourceUsage(label, meta = {}) {
    if (this.logLevel <= LOG_LEVELS.DEBUG) {
      const memoryUsage = process.memoryUsage();
      this.debug(`Resource Usage: ${label}`, {
        ...meta,
        label,
        memoryUsage: {
          rss: Math.round(memoryUsage.rss / 1024 / 1024),
          heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
          heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
          external: Math.round(memoryUsage.external / 1024 / 1024)
        }
      });
    }
  }
}

// Create service-specific loggers
const loggers = {};

function getLogger(serviceName) {
  if (!loggers[serviceName]) {
    loggers[serviceName] = new StructuredLogger(serviceName);
  }
  return loggers[serviceName];
}

// Export default logger for backward compatibility
const defaultLogger = getLogger('System');

module.exports = {
  StructuredLogger,
  getLogger,
  LOG_LEVELS,
  ERROR_CATEGORIES,
  debug: (msg, meta) => defaultLogger.debug(msg, meta),
  info: (msg, meta) => defaultLogger.info(msg, meta),
  warn: (msg, meta) => defaultLogger.warn(msg, meta),
  error: (msg, err, meta) => defaultLogger.error(msg, err, meta),
  critical: (msg, err, meta) => defaultLogger.critical(msg, err, meta),
  logApiCall: (apiName, callFn, meta) => defaultLogger.logApiCall(apiName, callFn, meta)
};