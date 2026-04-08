/**
 * 用户设置API
 */
import client from './client.js';

export const settingsApi = {
  /**
   * 获取所有配置
   * @returns {Promise<Object>} 所有配置
   */
  async getAll() {
    return await client.get('/api/v1/settings/');
  },

  /**
   * 获取指定类别的配置
   * @param {string} category - 配置类别 (analysis|data|display|notification|trading)
   * @returns {Promise<Object>} 配置对象
   */
  async getCategory(category) {
    return await client.get(`/api/v1/settings/${category}/`);
  },

  /**
   * 更新指定类别的配置
   * @param {string} category - 配置类别
   * @param {Object} settings - 配置对象
   * @returns {Promise<Object>} 更新后的配置
   */
  async updateCategory(category, settings) {
    return await client.put(`/api/v1/settings/${category}/`, settings);
  },

  /**
   * 保存所有配置
   * @param {Object} settings - 所有配置对象
   * @returns {Promise<Object>} 保存结果
   */
  async saveAll(settings) {
    return await client.post('/api/v1/settings/', settings);
  },

  /**
   * 重置所有配置为默认值
   * @returns {Promise<Object>} 默认配置
   */
  async reset() {
    return await client.post('/api/v1/settings/reset/');
  }
};

export default settingsApi;
