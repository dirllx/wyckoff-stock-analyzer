/**
 * 风险管理 API
 */
import client from './client.js';

export const riskApi = {
  /**
   * 获取风险管理配置
   * @returns {Promise<Object>} 风险管理配置
   */
  async getRiskConfig() {
    return await client.get('/api/v1/risk/config');
  },

  /**
   * 更新风险管理配置
   * @param {Object} config - 配置对象
   * @returns {Promise<Object>} 更新结果
   */
  async updateRiskConfig(config) {
    return await client.put('/api/v1/risk/config', config);
  },

  /**
   * 计算股票的风险指标
   * @param {string} code - 股票代码
   * @param {Object} options - 计算选项
   * @returns {Promise<Object>} 风险指标
   */
  async calculateRiskIndicators(code, options = {}) {
    const data = { code, ...options };
    return await client.post('/api/v1/risk/calculate', data);
  },

  /**
   * 获取风险评估报告
   * @param {string} code - 股票代码
   * @returns {Promise<Object>} 风险评估报告
   */
  async getRiskReport(code) {
    return await client.get(`/api/v1/risk/report/${code}`);
  },

  /**
   * 获取风险管理历史
   * @param {Object} options - 查询选项
   * @returns {Promise<Object>} 风险管理历史
   */
  async getRiskHistory(options = {}) {
    const params = new URLSearchParams();
    if (options.limit) params.append('limit', options.limit);
    if (options.offset) params.append('offset', options.offset);
    if (options.stock_code) params.append('stock_code', options.stock_code);

    const queryString = params.toString();
    return await client.get(`/api/v1/risk/history${queryString ? `?${queryString}` : ''}`);
  }
};
