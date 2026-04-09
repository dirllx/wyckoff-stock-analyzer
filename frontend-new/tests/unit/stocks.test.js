/**
 * stocks.test.js
 * 股票API测试
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { stocksApi } from '../../src/api/stocks.js';

// Mock apiClient
vi.mock('../../src/api/client.js', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn()
  }
}));

import apiClient from '../../src/api/client.js';

describe('stocksApi - 获取K线数据', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('应该获取日线K线数据', async () => {
    const mockQuotes = [
      { date: '2024-01-01', open: 100, high: 105, low: 98, close: 103, volume: 1000000 },
      { date: '2024-01-02', open: 103, high: 108, low: 102, close: 106, volume: 1200000 }
    ];

    apiClient.get.mockResolvedValue({
      code: '000001',
      timeframe: 'daily',
      total: 2,
      quotes: mockQuotes
    });

    const result = await stocksApi.getQuotes('000001', 'daily', 100);

    expect(apiClient.get).toHaveBeenCalledWith('/api/v1/stocks/000001/quotes?timeframe=daily&limit=100');
    expect(result).toEqual(mockQuotes);
    expect(result).toHaveLength(2);
  });

  it('应该使用默认参数', async () => {
    apiClient.get.mockResolvedValue({ quotes: [] });

    await stocksApi.getQuotes('000001');

    expect(apiClient.get).toHaveBeenCalledWith('/api/v1/stocks/000001/quotes?timeframe=daily&limit=100');
  });

  it('应该处理空响应', async () => {
    apiClient.get.mockResolvedValue({});

    const result = await stocksApi.getQuotes('000001');

    expect(result).toEqual([]);
  });

  it('应该处理null响应', async () => {
    apiClient.get.mockResolvedValue(null);

    const result = await stocksApi.getQuotes('000001');

    expect(result).toEqual([]);
  });

  it('应该处理API错误', async () => {
    const error = new Error('Network error');
    apiClient.get.mockRejectedValue(error);

    await expect(stocksApi.getQuotes('000001')).rejects.toThrow('Network error');
  });

  it('应该正确编码URL参数', async () => {
    apiClient.get.mockResolvedValue({ quotes: [] });

    await stocksApi.getQuotes('600000', 'weekly', 200);

    expect(apiClient.get).toHaveBeenCalledWith('/api/v1/stocks/600000/quotes?timeframe=weekly&limit=200');
  });
});

describe('stocksApi - 分析股票', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('应该发送分析请求', async () => {
    const mockResult = {
      stock: { code: '000001', name: '平安银行' },
      current_quote: { close: 10.5 },
      signals: []
    };

    apiClient.post.mockResolvedValue(mockResult);

    const result = await stocksApi.analyze('000001', null, 'daily');

    expect(apiClient.post).toHaveBeenCalledWith('/api/v1/stocks/analyze', {
      code: '000001',
      timeframe: 'daily'
    });
    expect(result).toEqual(mockResult);
  });

  it('应该包含结束日期', async () => {
    apiClient.post.mockResolvedValue({});

    await stocksApi.analyze('000001', '2024-01-15', 'daily');

    expect(apiClient.post).toHaveBeenCalledWith('/api/v1/stocks/analyze', {
      code: '000001',
      timeframe: 'daily',
      end_date: '2024-01-15'
    });
  });

  it('应该使用默认时间周期', async () => {
    apiClient.post.mockResolvedValue({});

    await stocksApi.analyze('000001');

    expect(apiClient.post).toHaveBeenCalledWith('/api/v1/stocks/analyze', {
      code: '000001',
      timeframe: 'daily'
    });
  });

  it('应该处理API错误', async () => {
    const error = new Error('Analysis failed');
    apiClient.post.mockRejectedValue(error);

    await expect(stocksApi.analyze('000001')).rejects.toThrow('Analysis failed');
  });
});

describe('stocksApi - 获取信号', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('应该获取股票信号', async () => {
    const mockSignals = [
      { date: '2024-01-01', signal_type: 'SPRING', direction: 'LONG' },
      { date: '2024-01-05', signal_type: 'BREAKOUT', direction: 'LONG' }
    ];

    apiClient.get.mockResolvedValue({ signals: mockSignals });

    const result = await stocksApi.getSignals('000001');

    expect(apiClient.get).toHaveBeenCalledWith('/api/v1/stocks/000001/signals');
    expect(result).toEqual(mockSignals);
  });

  it('应该处理直接返回数组的情况', async () => {
    const mockSignals = [{ date: '2024-01-01', signal_type: 'SPRING' }];

    apiClient.get.mockResolvedValue(mockSignals);

    const result = await stocksApi.getSignals('000001');

    expect(result).toEqual(mockSignals);
  });

  it('应该处理空响应', async () => {
    apiClient.get.mockResolvedValue({});

    const result = await stocksApi.getSignals('000001');

    expect(result).toEqual([]);
  });

  it('应该处理null响应', async () => {
    apiClient.get.mockResolvedValue(null);

    const result = await stocksApi.getSignals('000001');

    expect(result).toEqual([]);
  });

  it('应该处理API错误', async () => {
    const error = new Error('Failed to fetch signals');
    apiClient.get.mockRejectedValue(error);

    await expect(stocksApi.getSignals('000001')).rejects.toThrow('Failed to fetch signals');
  });
});

describe('stocksApi - 批量分析', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('应该发送批量分析请求', async () => {
    const requests = [
      { code: '000001', timeframe: 'daily' },
      { code: '000002', timeframe: 'daily' }
    ];

    const mockResult = {
      results: [
        { code: '000001', success: true },
        { code: '000002', success: true }
      ]
    };

    apiClient.post.mockResolvedValue(mockResult);

    const result = await stocksApi.batchAnalyze(requests);

    expect(apiClient.post).toHaveBeenCalledWith('/api/v1/stocks/analyze/batch', {
      requests
    });
    expect(result).toEqual(mockResult);
  });

  it('应该处理空请求列表', async () => {
    apiClient.post.mockResolvedValue({ results: [] });

    const result = await stocksApi.batchAnalyze([]);

    expect(apiClient.post).toHaveBeenCalledWith('/api/v1/stocks/analyze/batch', {
      requests: []
    });
    expect(result.results).toEqual([]);
  });

  it('应该处理API错误', async () => {
    const error = new Error('Batch analysis failed');
    apiClient.post.mockRejectedValue(error);

    await expect(stocksApi.batchAnalyze([])).rejects.toThrow('Batch analysis failed');
  });
});

describe('stocksApi - 错误处理', () => {
  it('应该捕获并重新抛出getQuotes错误', async () => {
    apiClient.get.mockRejectedValue(new Error('API Error'));

    await expect(stocksApi.getQuotes('000001')).rejects.toThrow('API Error');
  });

  it('应该捕获并重新抛出analyze错误', async () => {
    apiClient.post.mockRejectedValue(new Error('API Error'));

    await expect(stocksApi.analyze('000001')).rejects.toThrow('API Error');
  });

  it('应该捕获并重新抛出getSignals错误', async () => {
    apiClient.get.mockRejectedValue(new Error('API Error'));

    await expect(stocksApi.getSignals('000001')).rejects.toThrow('API Error');
  });

  it('应该捕获并重新抛出batchAnalyze错误', async () => {
    apiClient.post.mockRejectedValue(new Error('API Error'));

    await expect(stocksApi.batchAnalyze([])).rejects.toThrow('API Error');
  });
});
