import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ApiClient } from '../../src/api/client.js';
import { apiCache } from '../../src/utils/cache.js';

describe('ApiClient Integration Tests', () => {
  let client;
  let mockFetch;

  beforeEach(() => {
    // Mock fetch globally
    mockFetch = vi.fn();
    global.fetch = mockFetch;

    // Clear API cache before each test
    apiCache.clear();

    // Create client instance
    client = new ApiClient({
      baseURL: 'https://api.test.com',
      timeout: 5000,
      maxRetries: 3
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    apiCache.clear();
  });

  describe('基础功能', () => {
    it('应该成功发送GET请求', async () => {
      const mockResponse = { data: 'test' };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await client.get('/endpoint');

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.test.com/endpoint',
        expect.objectContaining({
          method: 'GET'
        })
      );
      expect(result).toEqual(mockResponse);
    });

    it('应该成功发送POST请求', async () => {
      const mockData = { name: 'test' };
      const mockResponse = { id: 1, ...mockData };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await client.post('/endpoint', mockData);

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.test.com/endpoint',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(mockData)
        })
      );
      expect(result).toEqual(mockResponse);
    });

    it('应该成功发送PUT请求', async () => {
      const mockData = { id: 1, name: 'updated' };
      const mockResponse = mockData;
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await client.put('/endpoint/1', mockData);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.test.com/endpoint/1',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify(mockData)
        })
      );
      expect(result).toEqual(mockResponse);
    });

    it('应该成功发送DELETE请求', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      });

      await client.delete('/endpoint/1');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.test.com/endpoint/1',
        expect.objectContaining({
          method: 'DELETE'
        })
      );
    });
  });

  describe('重试机制', () => {
    it('应该在失败时自动重试最多3次', async () => {
      let callCount = 0;
      mockFetch.mockImplementation(async () => {
        callCount++;
        if (callCount < 3) {
          throw new Error('Network error');
        }
        return {
          ok: true,
          json: async () => ({ data: 'success' })
        };
      });

      const result = await client.get('/endpoint');

      expect(mockFetch).toHaveBeenCalledTimes(3);
      expect(result).toEqual({ data: 'success' });
    });

    it('应该在达到最大重试次数后抛出错误', async () => {
      // 全部失败
      mockFetch.mockRejectedValue(new Error('Network error'));

      await expect(client.get('/endpoint')).rejects.toThrow('Network error');
      expect(mockFetch).toHaveBeenCalledTimes(4); // 初始请求 + 3次重试
    }, 15000);

    it('不应该重试4xx错误', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ error: 'Not found' })
      });

      await expect(client.get('/endpoint')).rejects.toThrow();
      expect(mockFetch).toHaveBeenCalledTimes(1); // 没有重试
    });

    it('应该重试5xx错误', async () => {
      let callCount = 0;
      mockFetch.mockImplementation(async () => {
        callCount++;
        if (callCount === 1) {
          return {
            ok: false,
            status: 500,
            json: async () => ({ error: 'Server error' })
          };
        }
        return {
          ok: true,
          json: async () => ({ data: 'success' })
        };
      });

      const result = await client.get('/endpoint');

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(result).toEqual({ data: 'success' });
    });
  });

  describe('超时控制', () => {
    it('应该在超时后抛出错误', async () => {
      // 模拟一个会超时的请求
      mockFetch.mockImplementation((_, options) => {
        return new Promise((_, reject) => {
          const timeoutId = setTimeout(() => {
            reject(new Error('Request timeout'));
          }, 6000);

          // 监听abort信号
          if (options.signal) {
            options.signal.addEventListener('abort', () => {
              clearTimeout(timeoutId);
              reject(new DOMException('Aborted', 'AbortError'));
            });
          }
        });
      });

      await expect(client.get('/endpoint')).rejects.toThrow('timeout');
    }, 15000);
  });

  describe('错误处理', () => {
    it('应该处理网络错误', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      await expect(client.get('/endpoint')).rejects.toThrow('Network error');
    }, 15000);

    it('应该处理HTTP错误响应', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: 'Bad request' })
      });

      await expect(client.get('/endpoint')).rejects.toThrow();
    });

    it('应该处理JSON解析错误', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => {
          throw new Error('Invalid JSON');
        }
      });

      await expect(client.get('/endpoint')).rejects.toThrow('Invalid JSON');
    }, 15000);
  });

  describe('请求配置', () => {
    it('应该正确设置默认headers', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({})
      });

      await client.get('/endpoint');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          })
        })
      );
    });

    it('应该允许自定义headers', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({})
      });

      await client.get('/endpoint', {
        headers: {
          'Authorization': 'Bearer token123'
        }
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer token123'
          })
        })
      );
    });

    it('应该支持自定义配置', async () => {
      const customClient = new ApiClient({
        baseURL: 'https://custom.api.com',
        timeout: 10000,
        maxRetries: 5,
        headers: {
          'X-API-Key': 'test-key'
        }
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({})
      });

      await customClient.get('/test');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://custom.api.com/test',
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-API-Key': 'test-key'
          })
        })
      );
    });
  });

  describe('取消请求', () => {
    it('应该支持AbortController', async () => {
      const controller = new AbortController();

      mockFetch.mockImplementation((_, options) => {
        // 检查signal是否已aborted
        if (options.signal && options.signal.aborted) {
          return Promise.reject(new DOMException('Aborted', 'AbortError'));
        }

        // 模拟一个长时间请求，监听abort信号
        return new Promise((resolve, reject) => {
          const timeoutId = setTimeout(() => {
            resolve({
              ok: true,
              json: async () => ({ data: 'success' })
            });
          }, 10000);

          if (options.signal) {
            options.signal.addEventListener('abort', () => {
              clearTimeout(timeoutId);
              reject(new DOMException('Aborted', 'AbortError'));
            });
          }
        });
      });

      // 立即取消
      controller.abort();

      await expect(
        client.get('/endpoint', { signal: controller.signal })
      ).rejects.toThrow(/Aborted/);
    });
  });

  describe('查询参数', () => {
    it('应该正确处理查询参数', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({})
      });

      await client.get('/endpoint', {
        params: { page: 1, limit: 10 }
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.test.com/endpoint?page=1&limit=10',
        expect.any(Object)
      );
    });

    it('应该正确编码特殊字符', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({})
      });

      await client.get('/endpoint', {
        params: { search: 'hello world' }
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.test.com/endpoint?search=hello+world',
        expect.any(Object)
      );
    });
  });
});
