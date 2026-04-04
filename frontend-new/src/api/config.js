import client from './client.js';
import Logger from '../utils/logger.js';

/**
 * 配置API
 * 提供形态配置和周期配置的获取与更新功能
 */
const configApi = {
  /**
   * 获取所有形态配置
   * @returns {Promise<Array>} 形态配置列表
   */
  async getPatterns() {
    try {
      Logger.debug('获取形态配置');
      const response = await client.get('/api/v1/config/patterns');
      Logger.info('形态配置获取成功', { total: response.total });
      return response.items;
    } catch (error) {
      Logger.error('获取形态配置失败', error);
      throw error;
    }
  },

  /**
   * 更新形态配置
   * @param {string} patternType - 形态类型
   * @param {Object} updates - 更新内容
   * @param {boolean} [updates.enabled] - 是否启用
   * @param {string} [updates.accuracy_mode] - 准确率模式
   * @param {number} [updates.min_confidence] - 最小置信度
   * @param {Object} [updates.parameters] - 参数配置
   * @returns {Promise<Object>} 更新后的形态配置
   */
  async updatePatterns(patternType, updates) {
    try {
      Logger.debug('更新形态配置', { patternType, updates });
      const response = await client.put(`/api/v1/config/patterns/${patternType}`, updates);
      Logger.info('形态配置更新成功', { patternType });
      return response.pattern;
    } catch (error) {
      Logger.error('更新形态配置失败', error);
      throw error;
    }
  },

  /**
   * 获取所有周期配置
   * @returns {Promise<Array>} 周期配置列表
   */
  async getTimeframes() {
    try {
      Logger.debug('获取周期配置');
      const response = await client.get('/api/v1/config/timeframes');
      Logger.info('周期配置获取成功', { total: response.total });
      return response.items;
    } catch (error) {
      Logger.error('获取周期配置失败', error);
      throw error;
    }
  },

  /**
   * 更新周期配置
   * @param {string} timeframe - 周期类型
   * @param {Object} updates - 更新内容
   * @param {boolean} [updates.enabled] - 是否启用
   * @param {number} [updates.data_retention_days] - 数据保留天数
   * @returns {Promise<Object>} 更新后的周期配置
   */
  async updateTimeframes(timeframe, updates) {
    try {
      Logger.debug('更新周期配置', { timeframe, updates });
      const response = await client.put(`/api/v1/config/timeframes/${timeframe}`, updates);
      Logger.info('周期配置更新成功', { timeframe });
      return response.timeframe;
    } catch (error) {
      Logger.error('更新周期配置失败', error);
      throw error;
    }
  }
};

export default configApi;
