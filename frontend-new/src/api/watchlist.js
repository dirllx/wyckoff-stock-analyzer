import client from './client.js';

/**
 * 关注列表API
 */
export const watchlistApi = {
  /**
   * 获取所有关注列表
   * @returns {Promise<Array>} 关注列表
   */
  async getAll() {
    return await client.get('/api/watchlist');
  },

  /**
   * 添加股票到关注列表
   * @param {string} code - 股票代码
   * @returns {Promise<Object>} 更新后的关注列表
   */
  async add(code) {
    return await client.post('/api/watchlist', { code });
  },

  /**
   * 从关注列表移除股票
   * @param {string} code - 股票代码
   * @returns {Promise<Object>} 更新后的关注列表
   */
  async remove(code) {
    return await client.delete(`/api/watchlist/${code}`);
  },

  /**
   * 更新关注列表
   * @param {Array} items - 关注列表项
   * @returns {Promise<Object>} 更新后的关注列表
   */
  async update(items) {
    return await client.put('/api/watchlist', { items });
  },

  /**
   * 移动关注列表项
   * @param {string} code - 股票代码
   * @param {string} direction - 方向 ('up' 或 'down')
   * @returns {Promise<Object>} 更新后的关注列表
   */
  async move(code, direction) {
    return await client.post(`/api/watchlist/${code}/move`, { direction });
  }
};

export default watchlistApi;
