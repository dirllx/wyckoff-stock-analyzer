/**
 * 信号展示组件
 * 显示威科夫交易信号
 */

import { stocksApi } from '../api/stocks.js';
import { logger } from '../utils/logger.js';
import { toast } from '../utils/toast.js';

/**
 * 信号展示类
 */
export class Signals {
  /**
   * 方向显示名称映射
   */
  static DIRECTION_NAMES = {
    'LONG': '做多',
    'SHORT': '做空',
    'NEUTRAL': '中性'
  };

  /**
   * 方向图标映射
   */
  static DIRECTION_ICONS = {
    'LONG': '📈',
    'SHORT': '📉',
    'NEUTRAL': '➡️'
  };

  /**
   * 转换信号数据为卡片格式
   * @param {Array} data - API返回的信号数据
   * @returns {Array} 卡片数据数组
   */
  static convertToCards(data) {
    if (!data || data.length === 0) return [];

    return data.map(item => ({
      id: item.id,
      direction: item.direction,
      directionName: this.getDirectionDisplayName(item.direction),
      directionIcon: this.getDirectionIcon(item.direction),
      directionColor: this.getDirectionColor(item.direction),
      score: item.score,
      scoreColor: this.getScoreColor(item.score),
      timeframe: item.timeframe,
      formattedDate: this.formatDate(item.date, item.timeframe),
      reason: item.reason || ''
    }));
  }

  /**
   * 获取方向显示名称
   * @param {string} direction - 方向代码
   * @returns {string} 显示名称
   */
  static getDirectionDisplayName(direction) {
    return this.DIRECTION_NAMES[direction] || '中性';
  }

  /**
   * 获取方向图标
   * @param {string} direction - 方向代码
   * @returns {string} 图标
   */
  static getDirectionIcon(direction) {
    return this.DIRECTION_ICONS[direction] || '➡️';
  }

  /**
   * 获取方向颜色
   * @param {string} direction - 方向代码
   * @returns {string} CSS颜色值
   */
  static getDirectionColor(direction) {
    const colors = {
      'LONG': 'var(--color-success)',   // 做多 - 绿色
      'SHORT': 'var(--color-error)',    // 做空 - 红色
      'NEUTRAL': 'var(--color-tertiary)' // 中性 - 灰色
    };
    return colors[direction] || colors['NEUTRAL'];
  }

  /**
   * 获取评分颜色
   * @param {number} score - 评分（1-10）
   * @returns {string} CSS颜色值
   */
  static getScoreColor(score) {
    if (score >= 5) {
      return 'var(--color-success)';   // 高分 - 绿色
    } else if (score >= 4) {
      return 'var(--color-warning)';   // 中分 - 橙色
    } else {
      return 'var(--color-tertiary)';  // 低分 - 灰色
    }
  }

  /**
   * 格式化日期
   * @param {string} dateStr - ISO日期字符串
   * @param {string} timeframe - 时间周期
   * @returns {string} 格式化后的日期
   */
  static formatDate(dateStr, timeframe) {
    if (!dateStr) return '';

    const date = new Date(dateStr);
    const isIntraday = timeframe === '30' || timeframe === '60';

    // 格式化日期部分为 YYYY-MM-DD
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const datePart = `${year}-${month}-${day}`;

    // 分钟线显示日期和时间
    if (isIntraday) {
      const hour = String(date.getHours()).padStart(2, '0');
      const minute = String(date.getMinutes()).padStart(2, '0');
      return `${datePart} ${hour}:${minute}`;
    }

    // 日线及以上只显示日期
    return datePart;
  }

  /**
   * 截断原因文本
   * @param {string} reason - 原因文本
   * @param {number} maxLength - 最大长度
   * @returns {string} 截断后的文本
   */
  static truncateReason(reason, maxLength = 60) {
    if (!reason) return '';
    if (reason.length <= maxLength) return reason;

    // 使用Array.from正确处理Unicode字符（包括中文）
    const chars = Array.from(reason);
    if (chars.length <= maxLength) return reason;

    return chars.slice(0, maxLength).join('') + '...';
  }

  /**
   * 生成单个信号卡片HTML
   * @param {Object} card - 卡片数据
   * @returns {string} 卡片HTML
   */
  static generateCardHTML(card) {
    const truncatedReason = this.truncateReason(card.reason, 60);

    return `
      <div class="signal-card" data-id="${card.id}">
        <div class="signal-card-header">
          <span class="signal-card-direction" style="color: ${card.directionColor}">
            ${card.directionIcon} ${card.directionName}
          </span>
          <span class="signal-card-score" style="color: ${card.scoreColor}">
            ${card.score}分
          </span>
        </div>
        <div class="signal-card-meta">
          <span class="signal-card-date">📅 ${card.formattedDate}</span>
          <span class="signal-card-timeframe">📊 ${card.timeframe}</span>
        </div>
        ${truncatedReason ? `<div class="signal-card-reason">${truncatedReason}</div>` : ''}
      </div>
    `;
  }

  /**
   * 生成空状态HTML
   * @returns {string} 空状态HTML
   */
  static generateEmptyState() {
    return `
      <div class="signals-empty">
        <div class="signals-empty-icon">📡</div>
        <div class="signals-empty-text">暂无信号</div>
        <div class="signals-empty-hint">当系统检测到交易信号时会在此显示</div>
      </div>
    `;
  }

  /**
   * 生成统计信息HTML
   * @param {Object} stats - 统计数据
   * @returns {string} 统计信息HTML
   */
  static generateStatsHTML(stats) {
    return `
      <div class="signals-stats">
        <div class="signals-stat-item">
          <span class="signals-stat-label">总信号</span>
          <span class="signals-stat-value">${stats.total}</span>
        </div>
        <div class="signals-stat-item">
          <span class="signals-stat-label">做多</span>
          <span class="signals-stat-value signals-stat-long">${stats.longCount}</span>
        </div>
        <div class="signals-stat-item">
          <span class="signals-stat-label">做空</span>
          <span class="signals-stat-value signals-stat-short">${stats.shortCount}</span>
        </div>
        <div class="signals-stat-item">
          <span class="signals-stat-label">平均分</span>
          <span class="signals-stat-value">${stats.averageScore.toFixed(1)}</span>
        </div>
      </div>
    `;
  }

  /**
   * 渲染信号列表
   * @param {Array} data - 信号数据
   * @param {Object} options - 渲染选项
   * @returns {string} 完整HTML
   */
  static render(data, options = {}) {
    const { showStats = true, maxCount = null } = options;

    if (!data || data.length === 0) {
      return this.generateEmptyState();
    }

    const cards = this.convertToCards(data);
    let displayCards = cards;

    // 限制显示数量
    if (maxCount && maxCount > 0) {
      displayCards = cards.slice(0, maxCount);
    }

    const cardsHTML = displayCards.map(card => this.generateCardHTML(card)).join('');

    let html = '<div class="signals-container">';

    // 添加统计信息
    if (showStats) {
      const stats = this.getStatistics(data);
      html += this.generateStatsHTML(stats);
    }

    // 添加信号网格
    html += `<div class="signals-grid">${cardsHTML}</div>`;
    html += '</div>';

    return html;
  }

  /**
   * 按方向筛选
   * @param {Array} data - 信号数据
   * @param {string} direction - 方向代码
   * @returns {Array} 筛选后的数据
   */
  static filterByDirection(data, direction) {
    if (!data || data.length === 0) return [];
    if (!direction || direction === 'all') return data;

    return data.filter(item => item.direction === direction);
  }

  /**
   * 按最小评分筛选
   * @param {Array} data - 信号数据
   * @param {number} minScore - 最小评分
   * @returns {Array} 筛选后的数据
   */
  static filterByMinScore(data, minScore) {
    if (!data || data.length === 0) return [];
    if (!minScore || minScore <= 0) return data;

    return data.filter(item => item.score >= minScore);
  }

  /**
   * 按时间周期筛选
   * @param {Array} data - 信号数据
   * @param {string} timeframe - 时间周期
   * @returns {Array} 筛选后的数据
   */
  static filterByTimeframe(data, timeframe) {
    if (!data || data.length === 0) return [];
    if (!timeframe || timeframe === 'all') return data;

    return data.filter(item => item.timeframe === timeframe);
  }

  /**
   * 搜索信号
   * @param {Array} data - 信号数据
   * @param {string} keyword - 搜索关键词
   * @returns {Array} 搜索结果
   */
  static search(data, keyword) {
    if (!data || data.length === 0) return [];
    if (!keyword || keyword.trim() === '') return data;

    const lowerKeyword = keyword.toLowerCase().trim();

    return data.filter(item => {
      return (
        (item.reason && item.reason.toLowerCase().includes(lowerKeyword)) ||
        (item.direction && item.direction.toLowerCase().includes(lowerKeyword)) ||
        (item.timeframe && item.timeframe.toLowerCase().includes(lowerKeyword))
      );
    });
  }

  /**
   * 按日期排序
   * @param {Array} data - 信号数据
   * @param {string} order - 排序顺序 ('asc' | 'desc')
   * @returns {Array} 排序后的数据
   */
  static sortByDate(data, order = 'desc') {
    if (!data || data.length === 0) return [];

    return [...data].sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      return order === 'asc' ? dateA - dateB : dateB - dateA;
    });
  }

  /**
   * 按评分排序
   * @param {Array} data - 信号数据
   * @param {string} order - 排序顺序 ('asc' | 'desc')
   * @returns {Array} 排序后的数据
   */
  static sortByScore(data, order = 'desc') {
    if (!data || data.length === 0) return [];

    return [...data].sort((a, b) => {
      return order === 'asc' ? a.score - b.score : b.score - a.score;
    });
  }

  /**
   * 获取统计信息
   * @param {Array} data - 信号数据
   * @returns {Object} 统计信息
   */
  static getStatistics(data) {
    if (!data || data.length === 0) {
      return {
        total: 0,
        longCount: 0,
        shortCount: 0,
        neutralCount: 0,
        averageScore: 0,
        maxScore: 0,
        minScore: 0
      };
    }

    const total = data.length;
    const longCount = data.filter(s => s.direction === 'LONG').length;
    const shortCount = data.filter(s => s.direction === 'SHORT').length;
    const neutralCount = data.filter(s => s.direction === 'NEUTRAL').length;

    const scores = data.map(s => s.score);
    const averageScore = scores.reduce((sum, score) => sum + score, 0) / total;
    const maxScore = Math.max(...scores);
    const minScore = Math.min(...scores);

    return {
      total,
      longCount,
      shortCount,
      neutralCount,
      averageScore,
      maxScore,
      minScore
    };
  }

  /**
   * 加载信号数据
   * @param {string} code - 股票代码
   * @returns {Promise<Array>} 信号数据
   */
  static async loadSignals(code) {
    try {
      logger.info(`Loading signals for stock: ${code}`);

      const signals = await stocksApi.getSignals(code);

      logger.info(`Signals loaded: ${signals.length} items`);

      return signals;
    } catch (error) {
      logger.error('Failed to load signals:', error);
      toast.error('加载信号失败，请稍后重试');
      throw error;
    }
  }

  /**
   * 刷新信号数据
   * @param {string} code - 股票代码
   * @returns {Promise<Array>} 信号数据
   */
  static async refresh(code) {
    return this.loadSignals(code);
  }
}

export default Signals;
