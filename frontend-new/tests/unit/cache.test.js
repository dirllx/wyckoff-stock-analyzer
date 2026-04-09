import { describe, it, expect, beforeEach } from 'vitest';
import { ApiCache } from '../../src/utils/cache.js';

describe('ApiCache', () => {
  let cache;

  beforeEach(() => {
    cache = new ApiCache(1000, 5); // 1秒TTL，最大5条
  });

  describe('基本操作', () => {
    it('应该正确设置和获取缓存', () => {
      cache.set('key1', { data: 'test' });
      const result = cache.get('key1');
      expect(result).toEqual({ data: 'test' });
    });

    it('未命中的缓存应返回null', () => {
      const result = cache.get('nonexistent');
      expect(result).toBeNull();
    });

    it('应该正确生成缓存键', () => {
      const key = cache.generateKey('/api/test', { method: 'GET' });
      expect(key).toContain('GET');
      expect(key).toContain('/api/test');
    });
  });

  describe('TTL过期', () => {
    it('过期缓存应返回null', () => {
      cache.set('key1', 'data', 1); // 1ms TTL

      // 等待过期
      return new Promise(resolve => {
        setTimeout(() => {
          const result = cache.get('key1');
          expect(result).toBeNull();
          resolve();
        }, 10);
      });
    });
  });

  describe('容量管理', () => {
    it('超出最大条目数时应淘汰最旧条目', () => {
      cache.set('key1', 'data1');
      cache.set('key2', 'data2');
      cache.set('key3', 'data3');
      cache.set('key4', 'data4');
      cache.set('key5', 'data5');

      // 超出容量
      cache.set('key6', 'data6');

      // key1应该被淘汰
      expect(cache.get('key1')).toBeNull();
      expect(cache.get('key6')).toBe('data6');
    });
  });

  describe('clear操作', () => {
    it('clear应清空所有缓存', () => {
      cache.set('key1', 'data1');
      cache.set('key2', 'data2');
      cache.clear();
      expect(cache.get('key1')).toBeNull();
      expect(cache.get('key2')).toBeNull();
    });

    it('clearByPrefix应只清除匹配前缀的缓存', () => {
      cache.set('GET:/api/stocks', 'stocks');
      cache.set('GET:/api/watchlist', 'watchlist');
      cache.set('GET:/api/settings', 'settings');

      cache.clearByPrefix('/api/stocks');

      expect(cache.get('GET:/api/stocks')).toBeNull();
      expect(cache.get('GET:/api/watchlist')).toBe('watchlist');
    });
  });

  describe('cleanup', () => {
    it('应该清理过期条目', () => {
      cache.set('expired', 'data', 1); // 1ms
      cache.set('fresh', 'data', 60000); // 60秒

      return new Promise(resolve => {
        setTimeout(() => {
          const removed = cache.cleanup();
          expect(removed).toBe(1);
          expect(cache.get('fresh')).toBe('data');
          resolve();
        }, 10);
      });
    });
  });

  describe('统计信息', () => {
    it('getStats应返回正确的统计信息', () => {
      cache.set('key1', 'data');
      const stats = cache.getStats();

      expect(stats.size).toBe(1);
      expect(stats.maxSize).toBe(5);
      expect(stats.defaultTTL).toBe(1000);
    });
  });
});
