/**
 * 日志工具
 * 支持动态日志级别控制和性能监控
 */

const LOG_STORAGE_KEY = 'app-log-level';
const PERF_STORAGE_KEY = 'app-perf-monitoring';

class Logger {
  constructor() {
    // 实例属性（如果需要）
  }

  setLevel(level) {
    Logger.currentLevel = Logger.LEVELS[level];
    // 保存到localStorage
    try {
      localStorage.setItem(LOG_STORAGE_KEY, level);
    } catch (e) {
      // 忽略存储错误
    }
  }

  getLevel() {
    return Object.keys(Logger.LEVELS).find(key => Logger.LEVELS[key] === Logger.currentLevel) || 'INFO';
  }

  setPerfMonitoring(enabled) {
    Logger.perfMonitoring = enabled;
    try {
      localStorage.setItem(PERF_STORAGE_KEY, enabled.toString());
    } catch (e) {
      // 忽略存储错误
    }
  }

  shouldLog(level) {
    return level >= Logger.currentLevel;
  }

  formatMessage(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const dataStr = data ? ` | ${JSON.stringify(data)}` : '';
    return `[${timestamp}] [${level}] ${message}${dataStr}`;
  }

  debug(message, data = null) {
    if (this.shouldLog(Logger.LEVELS.DEBUG)) {
      console.debug(this.formatMessage('DEBUG', message, data));
    }
  }

  info(message, data = null) {
    if (this.shouldLog(Logger.LEVELS.INFO)) {
      console.info(this.formatMessage('INFO', message, data));
    }
  }

  warn(message, data = null) {
    if (this.shouldLog(Logger.LEVELS.WARN)) {
      console.warn(this.formatMessage('WARN', message, data));
    }
  }

  error(message, error = null) {
    if (this.shouldLog(Logger.LEVELS.ERROR)) {
      const errorData = error ? {
        message: error.message,
        stack: error.stack
      } : null;
      console.error(this.formatMessage('ERROR', message, errorData));
    }
  }

  // 性能监控
  time(label) {
    if (Logger.perfMonitoring) {
      console.time(label);
    }
  }

  timeEnd(label) {
    if (Logger.perfMonitoring) {
      console.timeEnd(label);
    }
  }

  // 从localStorage加载用户偏好
  loadPreferences() {
    try {
      const savedLevel = localStorage.getItem(LOG_STORAGE_KEY);
      if (savedLevel && Logger.LEVELS[savedLevel] !== undefined) {
        Logger.currentLevel = Logger.LEVELS[savedLevel];
      }

      const savedPerf = localStorage.getItem(PERF_STORAGE_KEY);
      if (savedPerf) {
        Logger.perfMonitoring = savedPerf === 'true';
      }
    } catch (e) {
      // 忽略加载错误，使用默认值
    }
  }

  // 静态方法（兼容旧代码）
  static setLevel(level) {
    Logger.prototype.setLevel(level);
  }

  static getLevel() {
    return Logger.prototype.getLevel();
  }

  static setPerfMonitoring(enabled) {
    Logger.prototype.setPerfMonitoring(enabled);
  }

  static shouldLog(level) {
    return Logger.prototype.shouldLog(level);
  }

  static formatMessage(level, message, data) {
    return Logger.prototype.formatMessage(level, message, data);
  }

  static debug(message, data) {
    Logger.prototype.debug(message, data);
  }

  static info(message, data) {
    Logger.prototype.info(message, data);
  }

  static warn(message, data) {
    Logger.prototype.warn(message, data);
  }

  static error(message, error) {
    Logger.prototype.error(message, error);
  }

  static time(label) {
    Logger.prototype.time(label);
  }

  static timeEnd(label) {
    Logger.prototype.timeEnd(label);
  }

  static loadPreferences() {
    Logger.prototype.loadPreferences();
  }
}

// 静态属性定义在class外部（ES2020兼容语法）
Logger.LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  NONE: 4 // 完全静默
};

Logger.currentLevel = Logger.LEVELS.INFO;
Logger.perfMonitoring = false;

// 开发环境默认DEBUG，生产环境默认INFO
// 检测环境：在生产环境或测试环境中使用INFO，开发环境使用DEBUG
const isDev = typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'development';
if (isDev) {
  Logger.setLevel('DEBUG');
} else {
  Logger.setLevel('INFO');
}

// 加载用户偏好
Logger.loadPreferences();

// 创建 logger 实例并导出
export const logger = Logger;
export default Logger;
