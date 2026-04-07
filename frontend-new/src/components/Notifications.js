/**
 * 飞书通知组件
 */
import { logger } from '../utils/logger.js';
import { toast } from '../utils/toast.js';
import { notificationsApi } from '../api/notifications.js';

export class Notifications {
  /**
   * 生成通知HTML
   * @param {Object} data - 通知数据
   * @returns {string} HTML字符串
   */
  static generateNotificationsHTML(data = {}) {
    const {
      config = {},
      notification_history = []
    } = data;

    const {
      feishu_webhook = null,
      enable_notification = false,
      min_notify_score = 4,
      rate_limit_minutes = 30
    } = config;

    return `
      <div class="notifications-container">
        <div class="notifications-header">
          <h2 class="notifications-title">🔔 飞书通知</h2>
          <div class="notifications-actions">
            <button id="refresh-notifications-btn" class="notifications-btn notifications-btn-primary">
              🔄 刷新
            </button>
          </div>
        </div>

        <div class="notifications-content">
          <!-- 通知配置 -->
          <section class="notifications-section">
            <h3 class="notifications-section-title">⚙️ 通知配置</h3>
            <div class="notifications-config-form">
              <div class="notifications-field">
                <label class="notifications-label">启用通知</label>
                <div class="notifications-checkbox-group">
                  <label class="notifications-checkbox">
                    <input type="checkbox" id="enable-notification" ${enable_notification ? 'checked' : ''}>
                    <span>启用飞书通知</span>
                  </label>
                </div>
              </div>

              <div class="notifications-field">
                <label class="notifications-label">飞书Webhook URL</label>
                <input type="text" id="feishu-webhook" class="notifications-input"
                  value="${feishu_webhook || ''}"
                  placeholder="https://open.feishu.cn/open-apis/bot/v2/hook/xxx">
                <button id="validate-webhook-btn" class="notifications-btn notifications-btn-secondary">
                  🔍 验证Webhook
                </button>
              </div>

              <div class="notifications-field">
                <label class="notifications-label">最小通知评分 (≥${min_notify_score}分)</label>
                <input type="range" id="min-notify-score" class="notifications-range"
                  min="1" max="10" step="1" value="${min_notify_score}">
                <span class="notifications-range-value">${min_notify_score}</span>
              </div>

              <div class="notifications-field">
                <label class="notifications-label">限流时间 (分钟)</label>
                <input type="number" id="rate-limit" class="notifications-input"
                  min="5" max="120" step="5" value="${rate_limit_minutes}">
              </div>

              <div class="notifications-actions">
                <button id="save-config-btn" class="notifications-btn notifications-btn-primary">
                  💾 保存配置
                </button>
                <button id="test-notification-btn" class="notifications-btn notifications-btn-secondary">
                  🧪 发送测试通知
                </button>
              </div>
            </div>
          </section>

          <!-- 通知历史 -->
          <section class="notifications-section">
            <h3 class="notifications-section-title">📜 通知历史</h3>
            ${notification_history.length > 0 ? `
              <div class="notifications-history-list">
                ${notification_history.map(item => this.generateHistoryItemHTML(item)).join('')}
              </div>
            ` : `
              <div class="notifications-empty">
                <div class="notifications-empty-icon">📜</div>
                <p>暂无通知历史</p>
              </div>
            `}
          </section>
        </div>
      </div>
    `;
  }

  /**
   * 生成历史记录项HTML
   * @param {Object} item - 历史记录对象
   * @returns {string} HTML字符串
   */
  static generateHistoryItemHTML(item) {
    const {
      id = '',
      type = 'unknown',
      stock_code = '',
      stock_name = '',
      content = '',
      status = 'sent',
      sent_at = null,
      error = null
    } = item;

    const statusInfo = this.getNotificationStatusInfo(status);
    const typeInfo = this.getNotificationTypeInfo(type);

    return `
      <div class="notification-history-item notification-status-${status}">
        <div class="notification-history-header">
          <div class="notification-history-icon">${typeInfo.icon}</div>
          <div class="notification-history-info">
            <div class="notification-history-title">
              ${stock_name || stock_code} - ${typeInfo.text}
            </div>
            <div class="notification-history-status ${statusInfo.class}">
              ${statusInfo.text}
            </div>
          </div>
          <div class="notification-history-time">
            ${sent_at ? this.formatDate(sent_at) : ''}
          </div>
        </div>

        ${content ? `
          <div class="notification-history-content">
            ${content}
          </div>
        ` : ''}

        ${error ? `
          <div class="notification-history-error">
            <strong>错误:</strong> ${error}
          </div>
        ` : ''}
      </div>
    `;
  }

  /**
   * 生成空状态HTML
   * @returns {string} HTML字符串
   */
  static generateEmptyStateHTML() {
    return `
      <div class="notifications-empty">
        <div class="notifications-empty-icon">🔔</div>
        <h3 class="notifications-empty-title">飞书通知加载中...</h3>
      </div>
    `;
  }

  /**
   * 生成错误状态HTML
   * @param {string} message - 错误消息
   * @returns {string} HTML字符串
   */
  static generateErrorHTML(message = '飞书通知加载失败') {
    return `
      <div class="notifications-error">
        <div class="notifications-error-icon">⚠️</div>
        <h3 class="notifications-error-title">${message}</h3>
        <button id="retry-notifications-btn" class="notifications-btn notifications-btn-primary">
          🔄 重试
        </button>
      </div>
    `;
  }

  /**
   * 渲染飞书通知
   * @param {string} containerId - 容器ID
   */
  static async render(containerId) {
    const container = document.getElementById(containerId);
    if (!container) {
      logger.error(`Notifications: Container ${containerId} not found`);
      return;
    }

    try {
      // 并行获取配置和历史
      const [config, history] = await Promise.all([
        notificationsApi.getNotificationConfig(),
        notificationsApi.getNotificationHistory({ limit: 20 })
      ]);

      const data = {
        config: config || {},
        notification_history: history.items || []
      };

      container.innerHTML = this.generateNotificationsHTML(data);
      this.bindEvents();

      logger.info('Notifications rendered');
    } catch (error) {
      logger.error('Failed to render notifications:', error);
      container.innerHTML = this.generateErrorHTML(error.message);
      this.bindEvents();
    }
  }

  /**
   * 绑定事件
   */
  static bindEvents() {
    // 刷新按钮
    const refreshBtn = document.getElementById('refresh-notifications-btn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => this.refresh());
    }

    // 滑动条值显示更新
    const range = document.getElementById('min-notify-score');
    if (range) {
      range.addEventListener('input', (e) => {
        const valueSpan = e.target.nextElementSibling;
        if (valueSpan && valueSpan.classList.contains('notifications-range-value')) {
          valueSpan.textContent = e.target.value;
        }
      });
    }

    // 保存配置按钮
    const saveConfigBtn = document.getElementById('save-config-btn');
    if (saveConfigBtn) {
      saveConfigBtn.addEventListener('click', () => this.saveConfig());
    }

    // 发送测试通知按钮
    const testNotificationBtn = document.getElementById('test-notification-btn');
    if (testNotificationBtn) {
      testNotificationBtn.addEventListener('click', () => this.sendTestNotification());
    }

    // 验证Webhook按钮
    const validateWebhookBtn = document.getElementById('validate-webhook-btn');
    if (validateWebhookBtn) {
      validateWebhookBtn.addEventListener('click', () => this.validateWebhook());
    }

    // 重试按钮
    const retryBtn = document.getElementById('retry-notifications-btn');
    if (retryBtn) {
      retryBtn.addEventListener('click', () => this.refresh());
    }
  }

  /**
   * 刷新通知数据
   */
  static async refresh() {
    try {
      logger.info('Refreshing notifications...');
      toast.info('正在刷新通知数据...');

      await this.render('notifications');

      toast.success('通知数据已刷新');
    } catch (error) {
      logger.error('Failed to refresh notifications:', error);
      toast.error('通知数据刷新失败');
    }
  }

  /**
   * 保存配置
   */
  static async saveConfig() {
    try {
      const config = {
        enable_notification: document.getElementById('enable-notification')?.checked || false,
        feishu_webhook: document.getElementById('feishu-webhook')?.value || null,
        min_notify_score: parseInt(document.getElementById('min-notify-score')?.value) || 4,
        rate_limit_minutes: parseInt(document.getElementById('rate-limit')?.value) || 30
      };

      logger.info('Saving notification config:', config);

      const result = await notificationsApi.updateNotificationConfig(config);

      toast.success('配置已保存');
    } catch (error) {
      logger.error('Failed to save notification config:', error);
      toast.error('配置保存失败');
    }
  }

  /**
   * 发送测试通知
   */
  static async sendTestNotification() {
    try {
      const webhookUrl = document.getElementById('feishu-webhook')?.value;

      if (!webhookUrl) {
        toast.warning('请先配置飞书Webhook URL');
        return;
      }

      logger.info('Sending test notification...');

      const data = {
        webhook_url: webhookUrl,
        message: {
          title: '测试通知',
          content: '这是一条来自威科夫股票分析系统的测试通知。\n\n如果您收到此消息，说明Webhook配置正确！'
        }
      };

      const result = await notificationsApi.sendTestNotification(data);

      toast.success('测试通知已发送');
    } catch (error) {
      logger.error('Failed to send test notification:', error);
      toast.error('测试通知发送失败');
    }
  }

  /**
   * 验证Webhook
   */
  static async validateWebhook() {
    try {
      const webhookUrl = document.getElementById('feishu-webhook')?.value;

      if (!webhookUrl) {
        toast.warning('请先输入飞书Webhook URL');
        return;
      }

      logger.info('Validating webhook...');

      const result = await notificationsApi.validateWebhook(webhookUrl);

      if (result.valid) {
        toast.success('Webhook验证成功');
      } else {
        toast.error(`Webhook验证失败: ${result.error}`);
      }
    } catch (error) {
      logger.error('Failed to validate webhook:', error);
      toast.error('Webhook验证失败');
    }
  }

  /**
   * 获取通知状态信息
   * @param {string} status - 状态
   * @returns {Object} 状态信息
   */
  static getNotificationStatusInfo(status) {
    const statusMap = {
      sent: { text: '已发送', class: 'status-sent' },
      failed: { text: '发送失败', class: 'status-failed' },
      pending: { text: '待发送', class: 'status-pending' },
      rate_limited: { text: '限流中', class: 'status-rate-limited' }
    };
    return statusMap[status] || { text: '未知', class: 'status-unknown' };
  }

  /**
   * 获取通知类型信息
   * @param {string} type - 类型
   * @returns {Object} 类型信息
   */
  static getNotificationTypeInfo(type) {
    const typeMap = {
      signal: { text: '交易信号', icon: '📊' },
      pattern: { text: '形态识别', icon: '📐' },
      prediction: { text: 'K线预测', icon: '📈' },
      analysis: { text: '分析完成', icon: '✅' },
      test: { text: '测试通知', icon: '🧪' }
    };
    return typeMap[type] || { text: '未知', icon: '📢' };
  }

  /**
   * 格式化日期
   * @param {string} dateString - 日期字符串
   * @returns {string} 格式化的日期
   */
  static formatDate(dateString) {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diff = now - date;

      // 小于1分钟
      if (diff < 60000) {
        return '刚刚';
      }

      // 小于1小时
      if (diff < 3600000) {
        const minutes = Math.floor(diff / 60000);
        return `${minutes}分钟前`;
      }

      // 小于1天
      if (diff < 86400000) {
        const hours = Math.floor(diff / 3600000);
        return `${hours}小时前`;
      }

      // 格式化为日期时间
      return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return dateString;
    }
  }
}
