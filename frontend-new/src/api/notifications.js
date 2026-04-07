/**
 * 飞书通知 API
 */
import client from './client.js';

export const notificationsApi = {
  /**
   * 发送测试通知
   * @param {Object} data - 通知数据
   * @returns {Promise<Object>} 发送结果
   */
  async sendTestNotification(data) {
    return await client.post('/api/v1/notifications/test', data);
  },

  /**
   * 发送信号通知
   * @param {string} code - 股票代码
   * @param {Object} signal - 信号数据
   * @returns {Promise<Object>} 发送结果
   */
  async sendSignalNotification(code, signal) {
    return await client.post(`/api/v1/notifications/signal/${code}`, signal);
  },

  /**
   * 获取通知历史
   * @param {Object} options - 查询选项
   * @returns {Promise<Object>} 通知历史
   */
  async getNotificationHistory(options = {}) {
    const params = new URLSearchParams();
    if (options.limit) params.append('limit', options.limit);
    if (options.offset) params.append('offset', options.offset);
    if (options.type) params.append('type', options.type);

    const queryString = params.toString();
    return await client.get(`/api/v1/notifications/history${queryString ? `?${queryString}` : ''}`);
  },

  /**
   * 获取通知配置
   * @returns {Promise<Object>} 通知配置
   */
  async getNotificationConfig() {
    return await client.get('/api/v1/notifications/config');
  },

  /**
   * 更新通知配置
   * @param {Object} config - 配置对象
   * @returns {Promise<Object>} 更新结果
   */
  async updateNotificationConfig(config) {
    return await client.put('/api/v1/notifications/config', config);
  },

  /**
   * 验证Webhook配置
   * @param {string} webhookUrl - Webhook URL
   * @returns {Promise<Object>} 验证结果
   */
  async validateWebhook(webhookUrl) {
    return await client.post('/api/v1/notifications/validate-webhook', { webhook_url: webhookUrl });
  }
};
