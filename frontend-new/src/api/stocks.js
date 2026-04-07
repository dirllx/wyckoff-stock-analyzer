import apiClient from './client.js';
import Logger from '../utils/logger.js';

export const stocksApi = {
  // 获取K线数据
  async getQuotes(code, timeframe = 'daily', limit = 100) {
    try {
      Logger.debug('Fetching quotes', { code, timeframe, limit });

      const params = new URLSearchParams({
        timeframe,
        limit: limit.toString()
      });

      const result = await apiClient.get(`/api/v1/stocks/${code}/quotes?${params}`);

      // API返回格式: { code, timeframe, total, quotes: [...] }
      const quotes = result?.quotes || [];

      Logger.info('Quotes fetched successfully', { count: quotes.length });

      return quotes;
    } catch (error) {
      Logger.error('Failed to fetch quotes', error);
      throw error;
    }
  },

  // 分析股票
  async analyze(code, endDate = null, timeframe = 'daily') {
    try {
      Logger.debug('Analyzing stock', { code, endDate, timeframe });

      const data = {
        code,
        timeframe
      };

      if (endDate) {
        data.end_date = endDate;
      }

      const result = await apiClient.post('/api/v1/stocks/analyze', data);

      Logger.info('Stock analyzed successfully');

      // 返回完整的结果对象（包含stock, current_quote, signals等）
      return result;
    } catch (error) {
      Logger.error('Failed to analyze stock', error);
      throw error;
    }
  },

  // 获取信号
  async getSignals(code) {
    try {
      Logger.debug('Fetching signals', { code });

      const result = await apiClient.get(`/api/v1/stocks/${code}/signals`);

      Logger.info('Signals fetched successfully');

      // 返回信号数组
      return result?.signals || result || [];
    } catch (error) {
      Logger.error('Failed to fetch signals', error);
      throw error;
    }
  },

  // 批量分析
  async batchAnalyze(requests) {
    try {
      Logger.debug('Batch analyzing', { count: requests.length });

      const result = await apiClient.post('/api/v1/stocks/analyze/batch', { requests });

      Logger.info('Batch analysis completed');

      return result;
    } catch (error) {
      Logger.error('Failed to batch analyze', error);
      throw error;
    }
  }
};
