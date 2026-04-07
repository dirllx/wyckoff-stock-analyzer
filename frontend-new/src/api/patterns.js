/**
 * 形态识别 API
 */
import client from './client.js';

export const patternsApi = {
  /**
   * 获取股票的形态列表
   * @param {string} code - 股票代码
   * @returns {Promise<Array>} 形态列表
   */
  async getPatterns(code) {
    return await client.get(`/api/v1/patterns/${code}`);
  },

  /**
   * 获取形态历史记录
   * @param {string} code - 股票代码
   * @param {Object} options - 查询选项
   * @returns {Promise<Object>} 形态历史
   */
  async getPatternHistory(code, options = {}) {
    const params = new URLSearchParams();
    if (options.limit) params.append('limit', options.limit);
    if (options.offset) params.append('offset', options.offset);
    if (options.pattern_type) params.append('pattern_type', options.pattern_type);

    const queryString = params.toString();
    return await client.get(`/api/v1/patterns/${code}/history${queryString ? `?${queryString}` : ''}`);
  },

  /**
   * 识别形态
   * @param {string} code - 股票代码
   * @param {Object} options - 识别选项
   * @returns {Promise<Object>} 识别结果
   */
  async recognizePatterns(code, options = {}) {
    const data = { code, ...options };
    return await client.post('/api/v1/patterns/recognize', data);
  },

  /**
   * 获取形态统计
   * @param {string} code - 股票代码
   * @returns {Promise<Object>} 形态统计
   */
  async getPatternStats(code) {
    return await client.get(`/api/v1/patterns/${code}/stats`);
  }
};
