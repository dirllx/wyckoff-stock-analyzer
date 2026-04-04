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

      Logger.info('Quotes fetched successfully', { count: result?.length || 0 });

      return result;
    } catch (error) {
      Logger.error('Failed to fetch quotes', error);
      throw error;
    }
  },

  // 分析股票
  async analyze(code, endDate = null, timeframe = 'daily') {
    try {
      Logger.debug('Analyzing stock', { code, endDate, timeframe });

      const params = endDate ? { end_date: endDate } : {};

      const result = await apiClient.post(`/api/v1/stocks/${code}/analyze`, params);

      Logger.info('Stock analyzed successfully');

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

      return result;
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
