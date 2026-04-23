/**
 * 形态识别组件
 */
import { logger } from '../utils/logger.js';
import { toast } from '../utils/toast.js';
import { patternsApi } from '../api/patterns.js';
import { formatDateString } from '../utils/formatting.js';

export class Patterns {
  /**
   * 生成形态识别HTML
   * @param {Object} data - 形态数据
   * @returns {string} HTML字符串
   */
  static generatePatternsHTML(data = {}) {
    const {
      current_patterns = [],
      pattern_history = [],
      pattern_stats = {}
    } = data;

    return `
      <div class="patterns-container">
        <div class="patterns-header">
          <h2 class="patterns-title">📐 形态识别</h2>
          <div class="patterns-actions">
            <button id="refresh-patterns-btn" class="patterns-btn patterns-btn-primary">
              🔄 刷新
            </button>
            <button id="recognize-patterns-btn" class="patterns-btn patterns-btn-secondary">
              🔍 识别形态
            </button>
          </div>
        </div>

        <div class="patterns-content">
          <!-- 当前形态 -->
          <section class="patterns-section">
            <h3 class="patterns-section-title">🎯 当前形态</h3>
            ${current_patterns.length > 0 ? `
              <div class="patterns-current-list">
                ${current_patterns.map(pattern => this.generatePatternCardHTML(pattern)).join('')}
              </div>
            ` : `
              <div class="patterns-empty">
                <div class="patterns-empty-icon">📐</div>
                <p>暂无识别到的形态</p>
                <button class="patterns-btn patterns-btn-secondary" onclick="document.getElementById('recognize-patterns-btn').click()">
                  开始识别
                </button>
              </div>
            `}
          </section>

          <!-- 形态统计 -->
          ${pattern_stats && Object.keys(pattern_stats).length > 0 ? `
            <section class="patterns-section">
              <h3 class="patterns-section-title">📊 形态统计</h3>
              <div class="patterns-stats-grid">
                ${this.generateStatsHTML(pattern_stats)}
              </div>
            </section>
          ` : ''}

          <!-- 形态历史 -->
          <section class="patterns-section">
            <h3 class="patterns-section-title">📜 形态历史</h3>
            ${pattern_history.length > 0 ? `
              <div class="patterns-history-list">
                ${pattern_history.map(item => this.generateHistoryItemHTML(item)).join('')}
              </div>
            ` : `
              <div class="patterns-empty">
                <div class="patterns-empty-icon">📜</div>
                <p>暂无历史记录</p>
              </div>
            `}
          </section>
        </div>
      </div>
    `;
  }

  /**
   * 生成形态卡片HTML
   * @param {Object} pattern - 形态对象
   * @returns {string} HTML字符串
   */
  static generatePatternCardHTML(pattern) {
    const {
      pattern_type = 'Unknown',
      confidence = 0,
      status = 'forming',
      detected_date = null,
      description = '',
      signals = []
    } = pattern;

    const statusInfo = this.getPatternStatusInfo(status);
    const confidenceLevel = this.getConfidenceLevel(confidence);
    const patternIcon = this.getPatternIcon(pattern_type);
    const patternDisplayName = this.getPatternDisplayName(pattern_type);

    return `
      <div class="pattern-card pattern-status-${status}">
        <div class="pattern-card-header">
          <div class="pattern-icon">${patternIcon}</div>
          <div class="pattern-info">
            <div class="pattern-name">${patternDisplayName}</div>
            <div class="pattern-status ${statusInfo.class}">${statusInfo.text}</div>
          </div>
          <div class="pattern-confidence">
            <div class="confidence-label">置信度</div>
            <div class="confidence-value ${confidenceLevel.class}">${confidenceLevel.text}</div>
          </div>
        </div>

        ${description ? `
          <div class="pattern-description">
            ${description}
          </div>
        ` : ''}

        ${detected_date ? `
          <div class="pattern-date">
            识别时间: ${this.formatDate(detected_date)}
          </div>
        ` : ''}

        ${signals && signals.length > 0 ? `
          <div class="pattern-signals">
            <div class="pattern-signals-title">相关信号</div>
            <div class="pattern-signals-list">
              ${signals.map(signal => `
                <div class="pattern-signal-badge signal-${signal.type}">
                  ${signal.description}
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}
      </div>
    `;
  }

  /**
   * 生成统计数据HTML
   * @param {Object} stats - 统计对象
   * @returns {string} HTML字符串
   */
  static generateStatsHTML(stats) {
    return Object.entries(stats).map(([key, value]) => {
      const displayName = this.getStatDisplayName(key);
      const displayValue = this.formatStatValue(key, value);

      return `
        <div class="pattern-stat-card">
          <div class="pattern-stat-label">${displayName}</div>
          <div class="pattern-stat-value">${displayValue}</div>
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
      pattern_type = 'Unknown',
      status = 'completed',
      detected_date = null,
      confirmed_date = null,
      outcome = null
    } = item;

    const statusInfo = this.getPatternStatusInfo(status);
    const patternIcon = this.getPatternIcon(pattern_type);
    const patternDisplayName = this.getPatternDisplayName(pattern_type);
    const outcomeInfo = outcome ? this.getOutcomeInfo(outcome) : null;

    return `
      <div class="pattern-history-item">
        <div class="pattern-history-header">
          <div class="pattern-history-icon">${patternIcon}</div>
          <div class="pattern-history-info">
            <div class="pattern-history-name">${patternDisplayName}</div>
            <div class="pattern-history-status ${statusInfo.class}">${statusInfo.text}</div>
          </div>
          <div class="pattern-history-dates">
            ${detected_date ? `
              <div class="pattern-history-date">
                识别: ${this.formatDate(detected_date)}
              </div>
            ` : ''}
            ${confirmed_date ? `
              <div class="pattern-history-date">
                确认: ${this.formatDate(confirmed_date)}
              </div>
            ` : ''}
          </div>
        </div>

        ${outcomeInfo ? `
          <div class="pattern-history-outcome ${outcomeInfo.class}">
            <strong>结果:</strong> ${outcomeInfo.text}
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
      <div class="patterns-empty">
        <div class="patterns-empty-icon">📐</div>
        <h3 class="patterns-empty-title">形态识别加载中...</h3>
      </div>
    `;
  }

  /**
   * 生成错误状态HTML
   * @param {string} message - 错误消息
   * @returns {string} HTML字符串
   */
  static generateErrorHTML(message = '形态识别加载失败') {
    return `
      <div class="patterns-error">
        <div class="patterns-error-icon">⚠️</div>
        <h3 class="patterns-error-title">${message}</h3>
        <button id="retry-patterns-btn" class="patterns-btn patterns-btn-primary">
          🔄 重试
        </button>
      </div>
    `;
  }

  /**
   * 渲染形态识别
   * @param {string} containerId - 容器ID
   * @param {string} code - 股票代码
   */
  static async render(containerId, code) {
    const container = document.getElementById(containerId);
    if (!container) {
      logger.error(`Patterns: Container ${containerId} not found`);
      return;
    }

    try {
      // 识别形态并获取历史（后端无stats端点）
      const [patterns, history] = await Promise.all([
        patternsApi.getPatterns(code),
        patternsApi.getPatternHistory(code, { limit: 20 })
      ]);

      const data = {
        current_patterns: patterns?.patterns || patterns || [],
        pattern_history: history?.items || [],
        pattern_stats: {}
      };

      container.innerHTML = this.generatePatternsHTML(data);
      this.bindEvents(code);

      logger.info(`Patterns rendered for ${code}`);
    } catch (error) {
      logger.error('Failed to render patterns:', error);
      container.innerHTML = this.generateErrorHTML(error.message);
      this.bindEvents(code);
    }
  }

  /**
   * 绑定事件
   * @param {string} code - 股票代码
   */
  static bindEvents(code) {
    // 刷新按钮
    const refreshBtn = document.getElementById('refresh-patterns-btn');
    if (refreshBtn && code) {
      refreshBtn.addEventListener('click', () => this.refresh(code));
    }

    // 识别形态按钮
    const recognizeBtn = document.getElementById('recognize-patterns-btn');
    if (recognizeBtn && code) {
      recognizeBtn.addEventListener('click', () => this.recognize(code));
    }

    // 重试按钮
    const retryBtn = document.getElementById('retry-patterns-btn');
    if (retryBtn && code) {
      retryBtn.addEventListener('click', () => this.refresh(code));
    }
  }

  /**
   * 刷新形态数据
   * @param {string} code - 股票代码
   */
  static async refresh(code) {
    try {
      logger.info(`Refreshing patterns for ${code}...`);
      toast.info('正在刷新形态数据...');

      await this.render('patterns', code);

      toast.success('形态数据已刷新');
    } catch (error) {
      logger.error('Failed to refresh patterns:', error);
      toast.error('形态数据刷新失败');
    }
  }

  /**
   * 识别形态
   * @param {string} code - 股票代码
   */
  static async recognize(code) {
    try {
      logger.info(`Recognizing patterns for ${code}...`);
      toast.info('正在识别形态...');

      const result = await patternsApi.recognizePatterns(code);

      if (result.patterns && result.patterns.length > 0) {
        toast.success(`识别到 ${result.patterns.length} 个形态`);
      } else {
        toast.info('未识别到明显形态');
      }

      // 刷新显示
      await this.refresh(code);
    } catch (error) {
      logger.error('Failed to recognize patterns:', error);
      toast.error('形态识别失败');
    }
  }

  /**
   * 获取形态状态信息
   * @param {string} status - 状态
   * @returns {Object} 状态信息
   */
  static getPatternStatusInfo(status) {
    const statusMap = {
      forming: { text: '形成中', class: 'status-forming' },
      confirmed: { text: '已确认', class: 'status-confirmed' },
      failed: { text: '已失败', class: 'status-failed' },
      completed: { text: '已完成', class: 'status-completed' }
    };
    return statusMap[status] || { text: '未知', class: 'status-unknown' };
  }

  /**
   * 获取置信度等级
   * @param {number} confidence - 置信度 (0-100)
   * @returns {Object} 置信度信息
   */
  static getConfidenceLevel(confidence) {
    if (confidence >= 80) {
      return { text: `${confidence}% (高)`, class: 'confidence-high' };
    } else if (confidence >= 60) {
      return { text: `${confidence}% (中)`, class: 'confidence-medium' };
    } else if (confidence >= 40) {
      return { text: `${confidence}% (低)`, class: 'confidence-low' };
    } else {
      return { text: `${confidence}% (极低)`, class: 'confidence-very-low' };
    }
  }

  /**
   * 获取形态图标
   * @param {string} patternType - 形态类型
   * @returns {string} 图标
   */
  static getPatternIcon(patternType) {
    const iconMap = {
      spring: '🔄',
      breakout: '📈',
      reaccumulation: '🔄',
      distribution: '📊',
      markup: '📈',
      markdown: '📉',
      trading_range: '〰️'
    };
    return iconMap[patternType] || '📐';
  }

  /**
   * 获取形态显示名称
   * @param {string} patternType - 形态类型
   * @returns {string} 显示名称
   */
  static getPatternDisplayName(patternType) {
    const nameMap = {
      spring: 'Spring (弹簧)',
      breakout: 'Breakout (突破)',
      reaccumulation: 'Reaccumulation (再积累)',
      distribution: 'Distribution (派发)',
      markup: 'Markup (上涨)',
      markdown: 'Markdown (下跌)',
      trading_range: 'Trading Range (交易区间)'
    };
    return nameMap[patternType] || patternType;
  }

  /**
   * 获取统计显示名称
   * @param {string} key - 统计键
   * @returns {string} 显示名称
   */
  static getStatDisplayName(key) {
    const nameMap = {
      total_patterns: '总形态数',
      confirmed_patterns: '已确认形态',
      success_rate: '成功率',
      avg_confidence: '平均置信度',
      most_common_pattern: '最常见形态'
    };
    return nameMap[key] || key;
  }

  /**
   * 格式化统计值
   * @param {string} key - 统计键
   * @param {*} value - 统计值
   * @returns {string} 格式化的值
   */
  static formatStatValue(key, value) {
    if (key === 'success_rate' || key === 'avg_confidence') {
      return `${value.toFixed(1)}%`;
    }
    return value;
  }

  /**
   * 获取结果信息
   * @param {string} outcome - 结果类型
   * @returns {Object} 结果信息
   */
  static getOutcomeInfo(outcome) {
    const outcomeMap = {
      bullish: { text: '看涨', class: 'outcome-bullish' },
      bearish: { text: '看跌', class: 'outcome-bearish' },
      neutral: { text: '中性', class: 'outcome-neutral' },
      successful: { text: '成功', class: 'outcome-successful' },
      failed: { text: '失败', class: 'outcome-failed' }
    };
    return outcomeMap[outcome] || null;
  }

  /**
   * 格式化日期
   * @param {string} dateString - 日期字符串
   * @returns {string} 格式化的日期 (MM-DD)
   */
  static formatDate(dateString) {
    try {
      return formatDateString(dateString, 'daily');
    } catch (error) {
      return dateString;
    }
  }
}
