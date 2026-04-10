/**
 * 行情看板API
 */
import apiClient from './client.js';
import Logger from '../utils/logger.js';

export const marketApi = {
  /**
   * 获取大盘指数
   */
  async getIndices() {
    return apiClient.get('/api/v1/market/indices');
  },

  /**
   * 获取涨跌统计
   */
  async getStatistics() {
    return apiClient.get('/api/v1/market/statistics');
  },

  /**
   * 获取热点板块
   */
  async getHotSectors(limit = 10) {
    return apiClient.get(`/api/v1/market/sectors/hot?limit=${limit}`);
  },

  /**
   * 获取市场情绪
   */
  async getSentiment() {
    return apiClient.get('/api/v1/market/sentiment');
  },

  /**
   * 获取综合行情数据
   */
  async getOverview() {
    try {
      const [indices, statistics, hotSectors, sentiment] = await Promise.all([
        this.getIndices().catch(() => null),
        this.getStatistics().catch(() => null),
        this.getHotSectors().catch(() => null),
        this.getSentiment().catch(() => null)
      ]);

      return {
        indices: indices?.data || [],
        statistics: statistics?.data || {},
        hotSectors: hotSectors?.data || [],
        sentiment: sentiment?.data || {},
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      Logger.error('获取行情概览失败:', error);
      throw error;
    }
  }
};
