class Logger {
  static LEVELS = {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3
  };

  static currentLevel = Logger.LEVELS.INFO;

  static setLevel(level) {
    this.currentLevel = Logger.LEVELS[level];
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

  static time(label) {
    console.time(label);
  }

  static timeEnd(label) {
    console.timeEnd(label);
  }
}

// 开发环境默认DEBUG，生产环境默认INFO
if (import.meta.env.MODE === 'development') {
  Logger.setLevel('DEBUG');
} else {
  Logger.setLevel('INFO');
}

// 创建 logger 实例并导出
export const logger = Logger;
export default Logger;
