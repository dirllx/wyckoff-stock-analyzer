/**
 * 系统设置组件
 */
import { settingsApi } from '../api/settings.js';
import { logger } from '../utils/logger.js';
import { toast } from '../utils/toast.js';

export class Settings {
  /**
   * 生成设置页面HTML
   * @param {Object} settings - 设置对象
   * @returns {string} HTML字符串
   */
  static generateSettingsHTML(settings) {
    const {
      analysis = {},
      data = {},
      display = {},
      notification = {},
      trading = {}
    } = settings || {};

    return `
      <div class="settings-container">
        <div class="settings-header">
          <h2 class="settings-title">⚙️ 系统设置</h2>
          <div class="settings-actions">
            <button id="reset-settings-btn" class="settings-btn settings-btn-secondary">
              🔄 重置默认
            </button>
            <button id="save-settings-btn" class="settings-btn settings-btn-primary">
              💾 保存设置
            </button>
          </div>
        </div>

        <div class="settings-content">
          <!-- 分析配置 -->
          <section class="settings-section">
            <h3 class="settings-section-title">📊 分析配置</h3>
            <div class="settings-form">
              <div class="settings-field">
                <label class="settings-label">默认分析周期</label>
                <select id="default-timeframe" class="settings-select">
                  <option value="30" ${analysis.default_timeframe === '30' ? 'selected' : ''}>30分</option>
                  <option value="60" ${analysis.default_timeframe === '60' ? 'selected' : ''}>60分</option>
                  <option value="daily" ${analysis.default_timeframe === 'daily' ? 'selected' : ''}>日线</option>
                  <option value="weekly" ${analysis.default_timeframe === 'weekly' ? 'selected' : ''}>周线</option>
                  <option value="monthly" ${analysis.default_timeframe === 'monthly' ? 'selected' : ''}>月线</option>
                </select>
              </div>

              <div class="settings-field">
                <label class="settings-label">多周期分析</label>
                <div class="settings-checkbox-group">
                  <label class="settings-checkbox">
                    <input type="checkbox" id="mtf-30" value="30"
                      ${analysis.multi_timeframes?.includes('30') ? 'checked' : ''}>
                    <span>30分</span>
                  </label>
                  <label class="settings-checkbox">
                    <input type="checkbox" id="mtf-60" value="60"
                      ${analysis.multi_timeframes?.includes('60') ? 'checked' : ''}>
                    <span>60分</span>
                  </label>
                  <label class="settings-checkbox">
                    <input type="checkbox" id="mtf-daily" value="daily"
                      ${analysis.multi_timeframes?.includes('daily') ? 'checked' : ''}>
                    <span>日线</span>
                  </label>
                  <label class="settings-checkbox">
                    <input type="checkbox" id="mtf-weekly" value="weekly"
                      ${analysis.multi_timeframes?.includes('weekly') ? 'checked' : ''}>
                    <span>周线</span>
                  </label>
                </div>
              </div>

              <div class="settings-field">
                <label class="settings-label">信号阈值 (≥${analysis.signal_threshold || 3}分)</label>
                <input type="range" id="signal-threshold" class="settings-range"
                  min="1" max="10" step="1" value="${analysis.signal_threshold || 3}">
                <span class="settings-range-value">${analysis.signal_threshold || 3}</span>
              </div>

              <div class="settings-field">
                <label class="settings-checkbox">
                  <input type="checkbox" id="enable-cache"
                    ${analysis.enable_cache ? 'checked' : ''}>
                  <span>启用缓存</span>
                </label>
              </div>
            </div>
          </section>

          <!-- 数据配置 -->
          <section class="settings-section">
            <h3 class="settings-section-title">💾 数据配置</h3>
            <div class="settings-form">
              <div class="settings-field">
                <label class="settings-label">K线数量</label>
                <input type="number" id="kline-count" class="settings-input"
                  min="100" max="1000" step="100" value="${data.kline_count || 500}">
              </div>

              <div class="settings-field">
                <label class="settings-label">缓存时长 (小时)</label>
                <input type="number" id="cache-ttl" class="settings-input"
                  min="1" max="24" step="1" value="${data.cache_ttl_hours || 1}">
              </div>

              <div class="settings-field">
                <label class="settings-checkbox">
                  <input type="checkbox" id="enable-redis"
                    ${data.enable_redis ? 'checked' : ''}>
                  <span>启用Redis缓存</span>
                </label>
              </div>
            </div>
          </section>

          <!-- 显示配置 -->
          <section class="settings-section">
            <h3 class="settings-section-title">🎨 显示配置</h3>
            <div class="settings-form">
              <div class="settings-field">
                <label class="settings-label">自选股列数</label>
                <input type="number" id="watchlist-columns" class="settings-input"
                  min="3" max="10" step="1" value="${display.watchlist_columns || 5}">
              </div>

              <div class="settings-field">
                <label class="settings-label">默认排序</label>
                <select id="default-sort" class="settings-select">
                  <option value="score_desc" ${display.default_sort === 'score_desc' ? 'selected' : ''}>评分 (高→低)</option>
                  <option value="score_asc" ${display.default_sort === 'score_asc' ? 'selected' : ''}>评分 (低→高)</option>
                  <option value="code_asc" ${display.default_sort === 'code_asc' ? 'selected' : ''}>代码 (A→Z)</option>
                  <option value="code_desc" ${display.default_sort === 'code_desc' ? 'selected' : ''}>代码 (Z→A)</option>
                </select>
              </div>

              <div class="settings-field">
                <label class="settings-checkbox">
                  <input type="checkbox" id="show-advice"
                    ${display.show_investment_advice ? 'checked' : ''}>
                  <span>显示投资建议</span>
                </label>
              </div>
            </div>
          </section>

          <!-- 日志配置 -->
          <section class="settings-section">
            <h3 class="settings-section-title">📋 日志配置</h3>
            <div class="settings-form">
              <div class="settings-field">
                <label class="settings-label">日志级别</label>
                <select id="log-level" class="settings-select">
                  <option value="DEBUG" ${display.log_level === 'DEBUG' ? 'selected' : ''}>DEBUG - 调试</option>
                  <option value="INFO" ${display.log_level === 'INFO' || !display.log_level ? 'selected' : ''}>INFO - 信息</option>
                  <option value="WARN" ${display.log_level === 'WARN' ? 'selected' : ''}>WARN - 警告</option>
                  <option value="ERROR" ${display.log_level === 'ERROR' ? 'selected' : ''}>ERROR - 错误</option>
                  <option value="NONE" ${display.log_level === 'NONE' ? 'selected' : ''}>NONE - 静默</option>
                </select>
                <small class="settings-hint">当前级别: <span id="current-log-level">${logger.getLevel()}</span></small>
              </div>

              <div class="settings-field">
                <label class="settings-checkbox">
                  <input type="checkbox" id="enable-perf-monitoring"
                    ${display.perf_monitoring ? 'checked' : ''}>
                  <span>性能监控</span>
                </label>
                <small class="settings-hint">启用后会在控制台显示性能计时信息</small>
              </div>
            </div>
          </section>

          <!-- 通知配置 -->
          <section class="settings-section">
            <h3 class="settings-section-title">🔔 通知配置</h3>
            <div class="settings-form">
              <div class="settings-field">
                <label class="settings-checkbox">
                  <input type="checkbox" id="enable-notification"
                    ${notification.enable_notification ? 'checked' : ''}>
                  <span>启用通知</span>
                </label>
              </div>

              <div class="settings-field">
                <label class="settings-label">飞书Webhook URL</label>
                <input type="text" id="feishu-webhook" class="settings-input"
                  value="${notification.feishu_webhook || ''}"
                  placeholder="https://open.feishu.cn/open-apis/bot/v2/hook/xxx">
              </div>

              <div class="settings-field">
                <label class="settings-label">最小通知评分</label>
                <input type="range" id="min-notify-score" class="settings-range"
                  min="1" max="10" step="1" value="${notification.min_notify_score || 4}">
                <span class="settings-range-value">${notification.min_notify_score || 4}</span>
              </div>

              <div class="settings-field">
                <label class="settings-label">限流时间 (分钟)</label>
                <input type="number" id="rate-limit" class="settings-input"
                  min="5" max="120" step="5" value="${notification.rate_limit_minutes || 30}">
              </div>
            </div>
          </section>

          <!-- 交易配置 -->
          <section class="settings-section">
            <h3 class="settings-section-title">💼 交易建议配置</h3>
            <div class="settings-form">
              <div class="settings-field">
                <label class="settings-label">止损建议 (%)</label>
                <input type="number" id="stop-loss" class="settings-input"
                  min="1" max="20" step="0.5" value="${trading.stop_loss_percent || 5.0}">
              </div>

              <div class="settings-field">
                <label class="settings-label">止盈建议 (%)</label>
                <input type="number" id="take-profit" class="settings-input"
                  min="1" max="50" step="1" value="${trading.take_profit_percent || 8.0}">
              </div>

              <div class="settings-field">
                <label class="settings-label">建议仓位 (%)</label>
                <input type="number" id="position" class="settings-input"
                  min="5" max="100" step="5" value="${trading.position_percent || 20.0}">
              </div>
            </div>
          </section>
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
      <div class="settings-empty">
        <div class="settings-empty-icon">⚙️</div>
        <h3 class="settings-empty-title">设置加载中...</h3>
      </div>
    `;
  }

  /**
   * 渲染设置页面
   * @param {string} containerId - 容器ID
   * @param {Object} settings - 设置对象
   */
  static render(containerId, settings) {
    const container = document.getElementById(containerId);
    if (!container) {
      logger.error(`Settings: Container ${containerId} not found`);
      return;
    }

    container.innerHTML = this.generateSettingsHTML(settings);
    this.bindEvents();
  }

  /**
   * 绑定事件
   */
  static bindEvents() {
    // 滑动条值显示更新
    const ranges = document.querySelectorAll('.settings-range');
    ranges.forEach(range => {
      range.addEventListener('input', (e) => {
        const valueSpan = e.target.nextElementSibling;
        if (valueSpan && valueSpan.classList.contains('settings-range-value')) {
          valueSpan.textContent = e.target.value;
        }
      });
    });

    // 日志级别实时变更
    const logLevelSelect = document.getElementById('log-level');
    if (logLevelSelect) {
      logLevelSelect.addEventListener('change', (e) => {
        const level = e.target.value;
        logger.setLevel(level);
        const currentLevelSpan = document.getElementById('current-log-level');
        if (currentLevelSpan) {
          currentLevelSpan.textContent = level;
        }
        logger.info(`日志级别已更改为: ${level}`);
      });
    }

    // 性能监控实时变更
    const perfMonitoringCheckbox = document.getElementById('enable-perf-monitoring');
    if (perfMonitoringCheckbox) {
      perfMonitoringCheckbox.addEventListener('change', (e) => {
        const enabled = e.target.checked;
        logger.setPerfMonitoring(enabled);
        logger.info(`性能监控已${enabled ? '启用' : '禁用'}`);
      });
    }

    // 保存设置按钮
    const saveBtn = document.getElementById('save-settings-btn');
    if (saveBtn) {
      saveBtn.addEventListener('click', () => this.saveSettings());
    }

    // 重置设置按钮
    const resetBtn = document.getElementById('reset-settings-btn');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => this.resetSettings());
    }
  }

  /**
   * 收集表单数据
   * @returns {Object} 设置对象
   */
  static collectFormData() {
    // 多周期分析
    const multiTimeframes = [];
    if (document.getElementById('mtf-30')?.checked) multiTimeframes.push('30');
    if (document.getElementById('mtf-60')?.checked) multiTimeframes.push('60');
    if (document.getElementById('mtf-daily')?.checked) multiTimeframes.push('daily');
    if (document.getElementById('mtf-weekly')?.checked) multiTimeframes.push('weekly');

    return {
      analysis: {
        default_timeframe: document.getElementById('default-timeframe')?.value || 'daily',
        multi_timeframes: multiTimeframes,
        signal_threshold: parseInt(document.getElementById('signal-threshold')?.value) || 3,
        enable_cache: document.getElementById('enable-cache')?.checked || false
      },
      data: {
        kline_count: parseInt(document.getElementById('kline-count')?.value) || 500,
        cache_ttl_hours: parseInt(document.getElementById('cache-ttl')?.value) || 1,
        enable_redis: document.getElementById('enable-redis')?.checked || false
      },
      display: {
        watchlist_columns: parseInt(document.getElementById('watchlist-columns')?.value) || 5,
        default_sort: document.getElementById('default-sort')?.value || 'score_desc',
        show_investment_advice: document.getElementById('show-advice')?.checked || false,
        log_level: document.getElementById('log-level')?.value || 'INFO',
        perf_monitoring: document.getElementById('enable-perf-monitoring')?.checked || false
      },
      notification: {
        feishu_webhook: document.getElementById('feishu-webhook')?.value || null,
        enable_notification: document.getElementById('enable-notification')?.checked || false,
        min_notify_score: parseInt(document.getElementById('min-notify-score')?.value) || 4,
        rate_limit_minutes: parseInt(document.getElementById('rate-limit')?.value) || 30
      },
      trading: {
        stop_loss_percent: parseFloat(document.getElementById('stop-loss')?.value) || 5.0,
        take_profit_percent: parseFloat(document.getElementById('take-profit')?.value) || 8.0,
        position_percent: parseFloat(document.getElementById('position')?.value) || 20.0
      }
    };
  }

  /**
   * 保存设置
   */
  static async saveSettings() {
    try {
      const settings = this.collectFormData();

      const result = await settingsApi.saveAll(settings);

      // 更新本地存储
      localStorage.setItem('wyckoff_settings', JSON.stringify(settings));

      // 显示成功消息
      toast.success('设置已保存');

      // 重新加载页面以应用新设置
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      logger.error('保存设置失败:', error);
      toast.error('保存设置失败');
    }
  }

  /**
   * 重置设置
   */
  static async resetSettings() {
    try {
      if (!confirm('确定要重置所有设置为默认值吗？')) {
        return;
      }

      const result = await settingsApi.reset();

      // 更新本地存储
      localStorage.setItem('wyckoff_settings', JSON.stringify(result.settings));

      // 显示成功消息
      toast.success('设置已重置');

      // 重新加载页面
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      logger.error('重置设置失败:', error);
      toast.error('重置设置失败');
    }
  }

  /**
   * 加载设置
   */
  static async load() {
    try {
      const settings = await settingsApi.getAll();
      return settings;
    } catch (error) {
      logger.error('加载设置失败:', error);
      // 返回默认设置
      return this.getDefaultSettings();
    }
  }

  /**
   * 获取默认设置
   * @returns {Object} 默认设置对象
   */
  static getDefaultSettings() {
    return {
      analysis: {
        default_timeframe: 'daily',
        multi_timeframes: ['daily', 'weekly', '30', '60'],
        signal_threshold: 3,
        enable_cache: true
      },
      data: {
        kline_count: 500,
        cache_ttl_hours: 1,
        enable_redis: true
      },
      display: {
        watchlist_columns: 5,
        default_sort: 'score_desc',
        show_investment_advice: true,
        log_level: 'INFO',
        perf_monitoring: false
      },
      notification: {
        feishu_webhook: null,
        enable_notification: false,
        min_notify_score: 4,
        rate_limit_minutes: 30
      },
      trading: {
        stop_loss_percent: 5.0,
        take_profit_percent: 8.0,
        position_percent: 20.0
      }
    };
  }
}
