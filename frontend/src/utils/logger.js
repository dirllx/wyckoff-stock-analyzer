/**
 * 条件日志控制器
 * 生产环境自动禁用日志输出
 */

const isDevelopment = process.env.NODE_ENV === 'development'
const isDebug = localStorage.getItem('debug') === 'true'

class Logger {
  /**
   * 普通日志 - 仅开发环境显示
   */
  log(...args) {
    if (isDevelopment || isDebug) {
      console.log('[LOG]', ...args)
    }
  }

  /**
   * 信息日志 - 仅开发环境显示
   */
  info(...args) {
    if (isDevelopment || isDebug) {
      console.info('[INFO]', ...args)
    }
  }

  /**
   * 警告日志 - 始终显示
   */
  warn(...args) {
    console.warn('[WARN]', ...args)
  }

  /**
   * 错误日志 - 始终显示
   */
  error(...args) {
    console.error('[ERROR]', ...args)
  }

  /**
   * 调试日志 - 需要手动启用
   */
  debug(...args) {
    if (isDebug) {
      console.debug('[DEBUG]', ...args)
    }
  }

  /**
   * 启用调试模式
   */
  enableDebug() {
    localStorage.setItem('debug', 'true')
    console.log('✅ 调试模式已启用')
  }

  /**
   * 禁用调试模式
   */
  disableDebug() {
    localStorage.removeItem('debug')
    console.log('❌ 调试模式已禁用')
  }

  /**
   * 检查调试模式状态
   */
  isDebugEnabled() {
    return isDebug
  }
}

// 导出单例
const logger = new Logger()

// 开发环境下，在window对象上暴露logger，方便调试
if (isDevelopment) {
  window.logger = logger
  window.enableDebug = () => logger.enableDebug()
  window.disableDebug = () => logger.disableDebug()
}

export default logger
