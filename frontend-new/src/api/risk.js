/**
 * 风险管理 API
 * 部分端点后端可能未实现，404时静默降级
 */
import client from './client.js';

/**
 * 静默处理404的请求包装
 */
async function silentGet(url) {
  try {
    return await client.get(url);
  } catch (error) {
    if (error.status === 404) return null;
    throw error;
  }
}

export const riskApi = {
  async getRiskConfig() {
    return await silentGet('/api/v1/risk/config');
  },

  async updateRiskConfig(config) {
    return await client.put('/api/v1/risk/config', config);
  },

  async calculateRiskIndicators(code, options = {}) {
    const data = { code, ...options };
    return await client.post('/api/v1/risk/calculate', data);
  },

  async getRiskReport(code) {
    return await client.get(`/api/v1/risk/report/${code}`);
  },

  async getRiskHistory(options = {}) {
    const params = new URLSearchParams();
    if (options.limit) params.append('limit', options.limit);
    if (options.offset) params.append('offset', options.offset);
    if (options.stock_code) params.append('stock_code', options.stock_code);
    const queryString = params.toString();
    return await silentGet(`/api/v1/risk/history${queryString ? `?${queryString}` : ''}`);
  }
};
