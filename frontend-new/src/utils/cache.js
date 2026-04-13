/**
 * API请求缓存
 * 缓存GET请求响应，避免重复请求
 */

import { logger } from './logger.js';

/**
 * 缓存项
 * @typedef {Object} CacheEntry
 * @property {*} data - 缓存数据
 * @property {number} timestamp - 缓存时间戳
 * @property {number} ttl - 生存时间（毫秒）
 */

/**
 * 请求缓存管理器
 */
export class ApiCache {
  /**
   * @param {number} defaultTTL - 默认缓存时间（毫秒），默认60秒
   * @param {number} maxSize - 最大缓存条目数，默认100
   */
  constructor(defaultTTL = 60000, maxSize = 100) {
    this.cache = new Map();
    this.defaultTTL = defaultTTL;
    this.maxSize = maxSize;
  }

  /**
   * 生成缓存键
   * @param {string} url - 请求URL
   * @param {Object} options - 请求选项
   * @returns {string} 缓存键
   */
  generateKey(url, options = {}) {
    const method = options.method || 'GET';
    const body = options.body || '';
    return `${method}:${url}:${typeof body === 'string' ? body : JSON.stringify(body)}`;
  }

  /**
   * 获取缓存
   * @param {string} key - 缓存键
   * @returns {*|null} 缓存数据，过期或不存在返回null
   */
  get(key) {
    const entry = this.cache.get(key);

    if (!entry) return null;

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      logger.debug('Cache expired', { key: key.substring(0, 60) });
      return null;
    }

    logger.debug('Cache hit', { key: key.substring(0, 60) });
    return entry.data;
  }

  /**
   * 设置缓存
   * @param {string} key - 缓存键
   * @param {*} data - 缓存数据
   * @param {number} ttl - 生存时间（毫秒），可选
   */
  set(key, data, ttl) {
    // 超出最大条目数时清理最旧的条目
    if (this.cache.size >= this.maxSize) {
      this.evictOldest();
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL
    });

    logger.debug('Cache set', { key: key.substring(0, 60) });
  }

  /**
   * 清除所有缓存
   */
  clear() {
    this.cache.clear();
    logger.debug('Cache cleared');
  }

  /**
   * 清除匹配前缀的缓存
   * @param {string} prefix - URL前缀
   */
  clearByPrefix(prefix) {
    let count = 0;
    for (const key of this.cache.keys()) {
      if (key.includes(prefix)) {
        this.cache.delete(key);
        count++;
      }
    }
    logger.debug('Cache cleared by prefix', { prefix, count });
  }

  /**
   * 清理过期缓存
   * @returns {number} 清理的条目数
   */
  cleanup() {
    const now = Date.now();
    let count = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
        count++;
      }
    }

    if (count > 0) {
      logger.debug('Cache cleanup', { removed: count, remaining: this.cache.size });
    }

    return count;
  }

  /**
   * 淘汰最旧的条目
   */
  evictOldest() {
    let oldestKey = null;
    let oldestTime = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  /**
   * 获取缓存统计信息
   * @returns {Object} 统计信息
   */
  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      defaultTTL: this.defaultTTL
    };
  }

  /**
   * 按模式清除缓存
   * @param {string} pattern - URL模式，支持通配符*
   */
  clearByPattern(pattern) {
    const keys = Array.from(this.cache.keys());
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));

    let cleared = 0;
    keys.forEach(key => {
      if (regex.test(key)) {
        this.cache.delete(key);
        cleared++;
      }
    });

    logger.debug(`Cleared ${cleared} cache entries matching pattern: ${pattern}`);
    return cleared;
  }

  /**
   * 清除指定页面的所有缓存
   * @param {string} page - 页面名称
   */
  clearPageCache(page) {
    const patterns = {
      chart: ['/api/v1/stocks/.*/quotes.*', '/api/v1/stocks/.*/analysis.*'],
      watchlist: ['/api/v1/watchlist.*'],
      multi: ['/api/v1/stocks/.*/multi.*'],
      logs: [],
      settings: ['/api/v1/settings.*']
    };

    const pagePatterns = patterns[page] || [];
    let totalCleared = 0;

    pagePatterns.forEach(pattern => {
      totalCleared += this.clearByPattern(pattern);
    });

    logger.info(`Cleared ${totalCleared} cache entries for page: ${page}`);
    return totalCleared;
  }
}

// 导出默认实例
export const apiCache = new ApiCache(60000, 100);

// 定时清理过期缓存（每5分钟）
if (typeof setInterval !== 'undefined') {
  setInterval(() => apiCache.cleanup(), 300000);
}

export default apiCache;
