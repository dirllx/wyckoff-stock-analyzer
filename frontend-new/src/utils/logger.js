/**
 * 日志工具
 * 支持动态日志级别控制和性能监控
 */

const LOG_STORAGE_KEY = 'app-log-level';
const PERF_STORAGE_KEY = 'app-perf-monitoring';

class Logger {
  static LEVELS = {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3,
    NONE: 4 // 完全静默
  };

  static currentLevel = Logger.LEVELS.INFO;
  static perfMonitoring = false;

  static setLevel(level) {
    this.currentLevel = this.LEVELS[level];
    // 保存到localStorage
    try {
      localStorage.setItem(LOG_STORAGE_KEY, level);
    } catch (e) {
      // 忽略存储错误
    }
  }

  static getLevel() {
    return Object.keys(this.LEVELS).find(key => this.LEVELS[key] === this.currentLevel) || 'INFO';
  }

  static setPerfMonitoring(enabled) {
    this.perfMonitoring = enabled;
    try {
      localStorage.setItem(PERF_STORAGE_KEY, enabled.toString());
    } catch (e) {
      // 忽略存储错误
    }
  }

  static shouldLog(level) {
    return level >= this.currentLevel;
  }

  static formatMessage(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const dataStr = data ? ` | ${JSON.stringify(data)}` : '';
    return `[${timestamp}] [${level}] ${message}${dataStr}`;
  }

  static debug(message, data = null) {
    if (this.shouldLog(this.LEVELS.DEBUG)) {
      console.debug(this.formatMessage('DEBUG', message, data));
    }
  }

  static info(message, data = null) {
    if (this.shouldLog(this.LEVELS.INFO)) {
      console.info(this.formatMessage('INFO', message, data));
    }
  }

  static warn(message, data = null) {
    if (this.shouldLog(this.LEVELS.WARN)) {
      console.warn(this.formatMessage('WARN', message, data));
    }
  }

  static error(message, error = null) {
    if (this.shouldLog(this.LEVELS.ERROR)) {
      const errorData = error ? {
        message: error.message,
        stack: error.stack
      } : null;
      console.error(this.formatMessage('ERROR', message, errorData));
    }
  }

  // 性能监控
  static time(label) {
    if (this.perfMonitoring) {
      console.time(label);
    }
  }

  static timeEnd(label) {
    if (this.perfMonitoring) {
      console.timeEnd(label);
    }
  }

  // 从localStorage加载用户偏好
  static loadPreferences() {
    try {
      const savedLevel = localStorage.getItem(LOG_STORAGE_KEY);
      if (savedLevel && this.LEVELS[savedLevel] !== undefined) {
        this.currentLevel = this.LEVELS[savedLevel];
      }

      const savedPerf = localStorage.getItem(PERF_STORAGE_KEY);
      if (savedPerf) {
        this.perfMonitoring = savedPerf === 'true';
      }
    } catch (e) {
      // 忽略加载错误，使用默认值
    }
}

// 开发环境默认DEBUG，生产环境默认INFO
if (import.meta.env.MODE === 'development') {
  Logger.setLevel('DEBUG');
} else {
  Logger.setLevel('INFO');
}

// 加载用户偏好
Logger.loadPreferences();

// 创建 logger 实例并导出
export const logger = Logger;
export default Logger;
