/**
 * 飞书通知 API
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

export const notificationsApi = {
  async sendTestNotification(data) {
    return await client.post('/api/v1/notifications/test', data);
  },

  async sendSignalNotification(code, signal) {
    return await client.post(`/api/v1/notifications/signal/${code}`, signal);
  },

  async getNotificationHistory(options = {}) {
    const params = new URLSearchParams();
    if (options.limit) params.append('limit', options.limit);
    if (options.offset) params.append('offset', options.offset);
    if (options.type) params.append('type', options.type);
    const queryString = params.toString();
    return await silentGet(`/api/v1/notifications/history${queryString ? `?${queryString}` : ''}`);
  },

  async getNotificationConfig() {
    return await silentGet('/api/v1/notifications/config');
  },

  async updateNotificationConfig(config) {
    return await client.put('/api/v1/notifications/config', config);
  },

  async validateWebhook(webhookUrl) {
    return await client.post('/api/v1/notifications/validate-webhook', { webhook_url: webhookUrl });
  }
};
