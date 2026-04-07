/**
 * 系统健康检查 API
 */
import client from './client.js';

export const healthApi = {
  /**
   * 获取系统健康状态
   * @returns {Promise<Object>} 健康状态对象
   */
  async getHealthStatus() {
    return await client.get('/api/v1/health/');
  },

  /**
   * 获取测试状态
   * @returns {Promise<Object>} 测试状态对象
   */
  async getTestStatus() {
    return await client.get('/api/v1/health/tests');
  },

  /**
   * 运行测试
   * @param {string} testType - 测试类型 (all, unit, integration)
   * @returns {Promise<Object>} 测试结果
   */
  async runTests(testType = 'all') {
    return await client.post('/api/v1/health/tests', { type: testType });
  }
};
