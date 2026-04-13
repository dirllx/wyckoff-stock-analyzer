/**
 * 性能监控工具
 */

import { logger } from './logger.js';

export class PerformanceMonitor {
  constructor() {
    this.metrics = {};
  }

  /**
   * 记录性能指标
   */
  mark(name) {
    performance.mark(name);
  }

  /**
   * 测量两个标记之间的时间
   */
  measure(name, startMark, endMark) {
    try {
      performance.measure(name, startMark, endMark);
      const measure = performance.getEntriesByName(name)[0];

      this.metrics[name] = {
        duration: measure.duration,
        startTime: measure.startTime
      };

      logger.info(`[Performance] ${name}: ${measure.duration.toFixed(2)}ms`);

      return measure.duration;
    } catch (error) {
      logger.error(`[Performance] Failed to measure ${name}:`, error);
      return null;
    }
  }

  /**
   * 获取首屏加载时间
   */
  getFirstPaint() {
    if (performance.getEntriesByType) {
      const paintEntries = performance.getEntriesByType('paint');
      const fcp = paintEntries.find(entry => entry.name === 'first-contentful-paint');
      return fcp ? fcp.startTime : null;
    }
    return null;
  }

  /**
   * 获取所有性能指标
   */
  getMetrics() {
    return {
      ...this.metrics,
      firstPaint: this.getFirstPaint(),
      domContentLoaded: performance.timing.domContentLoadedEventEnd - performance.timing.navigationStart,
      loadComplete: performance.timing.loadEventEnd - performance.timing.navigationStart
    };
  }

  /**
   * 记录API请求性能
   */
  recordAPICall(url, duration) {
    const key = `api:${url}`;
    if (!this.metrics[key]) {
      this.metrics[key] = { count: 0, total: 0, max: 0 };
    }

    this.metrics[key].count++;
    this.metrics[key].total += duration;
    this.metrics[key].max = Math.max(this.metrics[key].max, duration);

    logger.debug(`[API] ${url}: ${duration.toFixed(2)}ms`);
  }

  /**
   * 获取API性能报告
   */
  getAPIReport() {
    const report = {};

    Object.keys(this.metrics).forEach(key => {
      if (key.startsWith('api:')) {
        const metric = this.metrics[key];
        report[key] = {
          count: metric.count,
          avg: metric.total / metric.count,
          max: metric.max
        };
      }
    });

    return report;
  }

  /**
   * 清除性能数据
   */
  clear() {
    this.metrics = {};
    performance.clearMarks();
    performance.clearMeasures();
  }
}

// 导出单例
export default new PerformanceMonitor();
