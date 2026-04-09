/**
 * 性能优化工具
 * 提供防抖、节流、批处理和性能监控
 */

import { logger } from './logger.js';

/**
 * 防抖：延迟执行，多次调用只执行最后一次
 * @param {Function} fn - 目标函数
 * @param {number} wait - 等待时间（毫秒）
 * @returns {Function} 防抖后的函数
 */
export function debounce(fn, wait = 300) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      fn.apply(this, args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * 节流：限制执行频率
 * @param {Function} fn - 目标函数
 * @param {number} limit - 限制间隔（毫秒）
 * @returns {Function} 节流后的函数
 */
export function throttle(fn, limit = 100) {
  let inThrottle;
  let lastArgs;
  let lastThis;

  return function (...args) {
    if (!inThrottle) {
      fn.apply(this, args);
      inThrottle = true;
      lastArgs = null;
      lastThis = null;

      setTimeout(() => {
        inThrottle = false;
        if (lastArgs) {
          fn.apply(lastThis, lastArgs);
          lastArgs = null;
          lastThis = null;
        }
      }, limit);
    } else {
      lastArgs = args;
      lastThis = this;
    }
  };
}

/**
 * 批处理：合并多次调用为一次批量执行
 * @param {Function} fn - 批量处理函数，接收参数数组
 * @param {number} wait - 合并等待时间（毫秒）
 * @returns {Function} 批处理后的函数
 */
export function batch(fn, wait = 100) {
  let calls = [];
  let timeout = null;

  return function (...args) {
    calls.push(args);

    if (!timeout) {
      timeout = setTimeout(() => {
        const batchCalls = [...calls];
        calls = [];
        timeout = null;
        fn(batchCalls);
      }, wait);
    }
  };
}

/**
 * 性能监控器
 * 使用 Performance API 测量关键操作耗时
 */
export class PerformanceMonitor {
  /**
   * 标记起始点
   * @param {string} name - 标记名称
   */
  static mark(name) {
    performance.mark(name);
  }

  /**
   * 测量两个标记之间的耗时
   * @param {string} name - 测量名称
   * @param {string} startMark - 起始标记
   * @param {string} endMark - 结束标记
   * @returns {number} 耗时（毫秒）
   */
  static measure(name, startMark, endMark) {
    try {
      performance.measure(name, startMark, endMark);
      const entries = performance.getEntriesByName(name);
      const entry = entries[entries.length - 1];

      if (!entry) return 0;

      const duration = entry.duration;
      logger.debug(`Performance: ${name} took ${duration.toFixed(2)}ms`);

      if (duration > 1000) {
        logger.warn(`Slow operation: ${name} took ${duration.toFixed(2)}ms`);
      }

      // 清理测量结果避免累积
      performance.clearMeasures(name);

      return duration;
    } catch (e) {
      logger.warn('Performance measure failed', { name, error: e.message });
      return 0;
    }
  }

  /**
   * 快速测量异步操作耗时
   * @param {string} name - 测量名称
   * @param {Function} fn - 异步函数
   * @returns {Promise<*>} 函数返回值
   */
  static async measureAsync(name, fn) {
    const startMark = `${name}-start`;
    const endMark = `${name}-end`;

    performance.mark(startMark);
    try {
      return await fn();
    } finally {
      performance.mark(endMark);
      this.measure(name, startMark, endMark);
      performance.clearMarks(startMark);
      performance.clearMarks(endMark);
    }
  }

  /**
   * 快速测量同步操作耗时
   * @param {string} name - 测量名称
   * @param {Function} fn - 同步函数
   * @returns {*} 函数返回值
   */
  static measureSync(name, fn) {
    const start = performance.now();
    try {
      return fn();
    } finally {
      const duration = performance.now() - start;
      logger.debug(`Performance: ${name} took ${duration.toFixed(2)}ms`);
      if (duration > 1000) {
        logger.warn(`Slow operation: ${name} took ${duration.toFixed(2)}ms`);
      }
    }
  }
}

export default { debounce, throttle, batch, PerformanceMonitor };
