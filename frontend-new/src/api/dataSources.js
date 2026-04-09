/**
 * 数据源管理API
 */
import apiClient from './client.js';
import Logger from '../utils/logger.js';

export const dataSourcesApi = {
  /**
   * 获取数据源统计信息
   */
  async getStats() {
    return apiClient.get('/api/v1/data-sources/stats');
  },

  /**
   * 获取数据源健康状态
   */
  async getHealth() {
    return apiClient.get('/api/v1/data-sources/health');
  },

  /**
   * 获取数据源配置
   */
  async getConfig() {
    return apiClient.get('/api/v1/data-sources/config');
  },

  /**
   * 获取指定周期的优先级列表
   * @param {string} timeframe - 时间周期
   */
  async getPriority(timeframe) {
    return apiClient.get(`/api/v1/data-sources/priority/${timeframe}`);
  },

  /**
   * 更新数据源优先级
   * @param {Object} data - {timeframe, priority_list}
   */
  async updatePriority(data) {
    return apiClient.post('/api/v1/data-sources/priority', data);
  },

  /**
   * 更新数据源配置
   * @param {Object} data - {source_name, enabled, priority, timeout}
   */
  async updateConfig(data) {
    return apiClient.post('/api/v1/data-sources/config', data);
  },

  /**
   * 重新加载配置
   */
  async reloadConfig() {
    return apiClient.post('/api/v1/data-sources/reload', {});
  },

  /**
   * 运行速度测试
   * @param {Object} data - {code, timeframes}
   */
  async speedTest(data = {}) {
    const { code = '000001', timeframes = ['daily', 'weekly'] } = data;
    return apiClient.post('/api/v1/data-sources/speed-test', { code, timeframes });
  },

  /**
   * 测试单个数据源
   * @param {string} sourceName - 数据源名称
   * @param {string} code - 测试用股票代码
   */
  async testSource(sourceName, code = '000001') {
    return apiClient.get(`/api/v1/data-sources/test/${sourceName}?code=${code}`);
  }
};
