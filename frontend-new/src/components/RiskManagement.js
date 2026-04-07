/**
 * 风险管理组件
 */
import { logger } from '../utils/logger.js';
import { toast } from '../utils/toast.js';
import { riskApi } from '../api/risk.js';

export class RiskManagement {
  /**
   * 生成风险管理HTML
   * @param {Object} data - 风险管理数据
   * @returns {string} HTML字符串
   */
  static generateRiskHTML(data = {}) {
    const {
      config = {},
      risk_indicators = {},
      risk_history = []
    } = data;

    const {
      stop_loss_percent = 5.0,
      take_profit_percent = 8.0,
      position_percent = 20.0,
      max_position_percent = 30.0,
      enable_risk_control = true
    } = config;

    return `
      <div class="risk-container">
        <div class="risk-header">
          <h2 class="risk-title">🛡️ 风险管理</h2>
          <div class="risk-actions">
            <button id="refresh-risk-btn" class="risk-btn risk-btn-primary">
              🔄 刷新
            </button>
          </div>
        </div>

        <div class="risk-content">
          <!-- 风险配置 -->
          <section class="risk-section">
            <h3 class="risk-section-title">⚙️ 风险配置</h3>
            <div class="risk-config-form">
              <div class="risk-field">
                <label class="risk-checkbox">
                  <input type="checkbox" id="enable-risk-control" ${enable_risk_control ? 'checked' : ''}>
                  <span>启用风险控制</span>
                </label>
              </div>

              <div class="risk-field">
                <label class="risk-label">止损建议 (%)</label>
                <input type="number" id="stop-loss" class="risk-input"
                  min="1" max="20" step="0.5" value="${stop_loss_percent}">
              </div>

              <div class="risk-field">
                <label class="risk-label">止盈建议 (%)</label>
                <input type="number" id="take-profit" class="risk-input"
                  min="1" max="50" step="1" value="${take_profit_percent}">
              </div>

              <div class="risk-field">
                <label class="risk-label">建议仓位 (%)</label>
                <input type="number" id="position" class="risk-input"
                  min="5" max="100" step="5" value="${position_percent}">
              </div>

              <div class="risk-field">
                <label class="risk-label">最大仓位限制 (%)</label>
                <input type="number" id="max-position" class="risk-input"
                  min="10" max="100" step="5" value="${max_position_percent}">
              </div>

              <div class="risk-actions">
                <button id="save-risk-config-btn" class="risk-btn risk-btn-primary">
                  💾 保存配置
                </button>
              </div>
            </div>
          </section>

          <!-- 风险指标 -->
          ${risk_indicators && Object.keys(risk_indicators).length > 0 ? `
            <section class="risk-section">
              <h3 class="risk-section-title">📊 风险指标</h3>
              <div class="risk-indicators-grid">
                ${this.generateIndicatorsHTML(risk_indicators)}
              </div>
            </section>
          ` : ''}

          <!-- 风险历史 -->
          <section class="risk-section">
            <h3 class="risk-section-title">📜 风险管理历史</h3>
            ${risk_history.length > 0 ? `
              <div class="risk-history-list">
                ${risk_history.map(item => this.generateHistoryItemHTML(item)).join('')}
              </div>
            ` : `
              <div class="risk-empty">
                <div class="risk-empty-icon">📜</div>
                <p>暂无风险管理历史</p>
              </div>
            `}
          </section>
        </div>
      </div>
    `;
  }

  /**
   * 生成风险指标HTML
   * @param {Object} indicators - 风险指标对象
   * @returns {string} HTML字符串
   */
  static generateIndicatorsHTML(indicators) {
    const indicatorMap = {
      risk_score: { name: '风险评分', icon: '⚠️', format: v => `${v}/10` },
      volatility: { name: '波动率', icon: '📈', format: v => `${v.toFixed(2)}%` },
      max_drawdown: { name: '最大回撤', icon: '📉', format: v => `${v.toFixed(2)}%` },
      sharpe_ratio: { name: '夏普比率', icon: '📊', format: v => v.toFixed(2) },
      var_95: { name: 'VaR (95%)', icon: '💰', format: v => `${v.toFixed(2)}%` },
      beta: { name: 'Beta系数', icon: '🔗', format: v => v.toFixed(2) }
    };

    return Object.entries(indicators).map(([key, value]) => {
      const indicator = indicatorMap[key];
      if (!indicator) return '';

      const { name, icon, format } = indicator;
      const formattedValue = format(value);
      const riskLevel = this.getRiskLevel(key, value);

      return `
        <div class="risk-indicator-card risk-${riskLevel}">
          <div class="risk-indicator-icon">${icon}</div>
          <div class="risk-indicator-info">
            <div class="risk-indicator-name">${name}</div>
            <div class="risk-indicator-value">${formattedValue}</div>
          </div>
          <div class="risk-indicator-level">
            ${this.getRiskLevelDisplayName(riskLevel)}
          </div>
        </div>
      `;
    }).join('');
  }

  /**
   * 生成历史记录项HTML
   * @param {Object} item - 历史记录对象
   * @returns {string} HTML字符串
   */
  static generateHistoryItemHTML(item) {
    const {
      id = '',
      stock_code = '',
      stock_name = '',
      action = '',
      details = '',
      created_at = null
    } = item;

    const actionInfo = this.getActionInfo(action);

    return `
      <div class="risk-history-item">
        <div class="risk-history-header">
          <div class="risk-history-icon">${actionInfo.icon}</div>
          <div class="risk-history-info">
            <div class="risk-history-title">
              ${stock_name || stock_code} - ${actionInfo.text}
            </div>
            ${details ? `
              <div class="risk-history-details">
                ${details}
              </div>
            ` : ''}
          </div>
          <div class="risk-history-time">
            ${created_at ? this.formatDate(created_at) : ''}
          </div>
        </div>
      </div>
    `;
  }

  /**
   * 生成空状态HTML
   * @returns {string} HTML字符串
   */
  static generateEmptyStateHTML() {
    return `
      <div class="risk-empty">
        <div class="risk-empty-icon">🛡️</div>
        <h3 class="risk-empty-title">风险管理加载中...</h3>
      </div>
    `;
  }

  /**
   * 生成错误状态HTML
   * @param {string} message - 错误消息
   * @returns {string} HTML字符串
   */
  static generateErrorHTML(message = '风险管理加载失败') {
    return `
      <div class="risk-error">
        <div class="risk-error-icon">⚠️</div>
        <h3 class="risk-error-title">${message}</h3>
        <button id="retry-risk-btn" class="risk-btn risk-btn-primary">
          🔄 重试
        </button>
      </div>
    `;
  }

  /**
   * 渲染风险管理
   * @param {string} containerId - 容器ID
   * @param {string} code - 股票代码（可选）
   */
  static async render(containerId, code = null) {
    const container = document.getElementById(containerId);
    if (!container) {
      logger.error(`RiskManagement: Container ${containerId} not found`);
      return;
    }

    try {
      // 并行获取配置和历史
      const [config, history] = await Promise.all([
        riskApi.getRiskConfig(),
        riskApi.getRiskHistory({ limit: 20 })
      ]);

      const data = {
        config: config || {},
        risk_history: history.items || []
      };

      // 如果提供了股票代码，计算风险指标
      if (code) {
        try {
          const indicators = await riskApi.calculateRiskIndicators(code);
          data.risk_indicators = indicators || {};
        } catch (error) {
          logger.warn('Failed to calculate risk indicators:', error);
          data.risk_indicators = {};
        }
      } else {
        data.risk_indicators = {};
      }

      container.innerHTML = this.generateRiskHTML(data);
      this.bindEvents();

      logger.info('RiskManagement rendered');
    } catch (error) {
      logger.error('Failed to render risk management:', error);
      container.innerHTML = this.generateErrorHTML(error.message);
      this.bindEvents();
    }
  }

  /**
   * 绑定事件
   */
  static bindEvents() {
    // 刷新按钮
    const refreshBtn = document.getElementById('refresh-risk-btn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => this.refresh());
    }

    // 保存配置按钮
    const saveConfigBtn = document.getElementById('save-risk-config-btn');
    if (saveConfigBtn) {
      saveConfigBtn.addEventListener('click', () => this.saveConfig());
    }

    // 重试按钮
    const retryBtn = document.getElementById('retry-risk-btn');
    if (retryBtn) {
      retryBtn.addEventListener('click', () => this.refresh());
    }
  }

  /**
   * 刷新风险管理数据
   */
  static async refresh() {
    try {
      logger.info('Refreshing risk management...');
      toast.info('正在刷新风险管理数据...');

      await this.render('risk');

      toast.success('风险管理数据已刷新');
    } catch (error) {
      logger.error('Failed to refresh risk management:', error);
      toast.error('风险管理数据刷新失败');
    }
  }

  /**
   * 保存配置
   */
  static async saveConfig() {
    try {
      const config = {
        enable_risk_control: document.getElementById('enable-risk-control')?.checked || false,
        stop_loss_percent: parseFloat(document.getElementById('stop-loss')?.value) || 5.0,
        take_profit_percent: parseFloat(document.getElementById('take-profit')?.value) || 8.0,
        position_percent: parseFloat(document.getElementById('position')?.value) || 20.0,
        max_position_percent: parseFloat(document.getElementById('max-position')?.value) || 30.0
      };

      logger.info('Saving risk config:', config);

      const result = await riskApi.updateRiskConfig(config);

      toast.success('风险管理配置已保存');
    } catch (error) {
      logger.error('Failed to save risk config:', error);
      toast.error('风险管理配置保存失败');
    }
  }

  /**
   * 获取风险等级
   * @param {string} indicator - 指标名称
   * @param {number} value - 指标值
   * @returns {string} 风险等级
   */
  static getRiskLevel(indicator, value) {
    // 根据不同指标返回风险等级
    switch (indicator) {
      case 'risk_score':
        if (value >= 8) return 'high';
        if (value >= 5) return 'medium';
        return 'low';

      case 'volatility':
        if (value > 30) return 'high';
        if (value > 20) return 'medium';
        return 'low';

      case 'max_drawdown':
        if (value > 15) return 'high';
        if (value > 10) return 'medium';
        return 'low';

      case 'sharpe_ratio':
        if (value < 0) return 'high';
        if (value < 1) return 'medium';
        return 'low';

      case 'var_95':
        if (value > 5) return 'high';
        if (value > 3) return 'medium';
        return 'low';

      default:
        return 'medium';
    }
  }

  /**
   * 获取风险等级显示名称
   * @param {string} level - 风险等级
   * @returns {string} 显示名称
   */
  static getRiskLevelDisplayName(level) {
    const levelMap = {
      high: '高风险',
      medium: '中风险',
      low: '低风险'
    };
    return levelMap[level] || '未知';
  }

  /**
   * 获取操作信息
   * @param {string} action - 操作类型
   * @returns {Object} 操作信息
   */
  static getActionInfo(action) {
    const actionMap = {
      stop_loss_triggered: { text: '止损触发', icon: '🛑' },
      take_profit_triggered: { text: '止盈触发', icon: '🎯' },
      position_limit_exceeded: { text: '仓位超限', icon: '⚠️' },
      risk_alert: { text: '风险警告', icon: '🚨' },
      config_updated: { text: '配置更新', icon: '⚙️' }
    };
    return actionMap[action] || { text: action, icon: '📋' };
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
