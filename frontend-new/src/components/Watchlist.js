/**
 * 自选股组件
 * 管理和显示用户的自选股列表
 */

import { watchlistApi } from '../api/watchlist.js';
import { stocksApi } from '../api/stocks.js';
import { logger } from '../utils/logger.js';
import { toast } from '../utils/toast.js';
import { eventBus, Events } from '../config.js';

/**
 * 自选股类
 */
export class Watchlist {
  /**
   * 阶段显示名称映射
   */
  static PHASE_NAMES = {
    'U': '上升',
    'D': '下降',
    'A': '吸筹',
    'DS': '下跌吸筹',
    '震荡': '震荡'
  };

  /**
   * 信号显示名称映射
   */
  static SIGNAL_NAMES = {
    '买入': '买入',
    '卖出': '卖出',
    '持有': '持有',
    '观望': '观望'
  };

  /**
   * 转换自选股数据为卡片格式
   * @param {Array} data - API返回的自选股数据
   * @returns {Array} 卡片数据数组
   */
  static convertToCards(data) {
    if (!data || data.length === 0) return [];

    return data.map(item => ({
      code: item.stock_code,
      name: item.stock_name || item.stock_code,
      phase: item.phase || '震荡',
      signal: item.signal || '观望',
      lastUpdate: item.last_update || null
    }));
  }

  /**
   * 获取阶段显示名称
   * @param {string} phase - 阶段代码
   * @returns {string} 显示名称
   */
  static getPhaseDisplayName(phase) {
    return this.PHASE_NAMES[phase] || '震荡';
  }

  /**
   * 获取阶段颜色
   * @param {string} phase - 阶段代码
   * @returns {string} CSS颜色值
   */
  static getPhaseColor(phase) {
    const colors = {
      'U': 'var(--color-error)',      // 上升 - 红色
      'D': 'var(--color-success)',    // 下降 - 绿色
      'A': 'var(--color-warning)',    // 吸筹 - 橙色
      'DS': 'var(--color-info)',      // 下跌吸筹 - 蓝色
      '震荡': 'var(--color-tertiary)' // 震荡 - 灰色
    };
    return colors[phase] || colors['震荡'];
  }

  /**
   * 获取信号显示名称
   * @param {string} signal - 信号代码
   * @returns {string} 显示名称
   */
  static getSignalDisplayName(signal) {
    return this.SIGNAL_NAMES[signal] || '观望';
  }

  /**
   * 获取信号颜色
   * @param {string} signal - 信号代码
   * @returns {string} CSS颜色值
   */
  static getSignalColor(signal) {
    const colors = {
      '买入': 'var(--color-error)',     // 买入 - 红色
      '卖出': 'var(--color-success)',   // 卖出 - 绿色
      '持有': 'var(--color-warning)',   // 持有 - 橙色
      '观望': 'var(--color-tertiary)'   // 观望 - 灰色
    };
    return colors[signal] || colors['观望'];
  }

  /**
   * 生成单个卡片HTML
   * @param {Object} card - 卡片数据
   * @returns {string} 卡片HTML
   */
  static generateCardHTML(card) {
    const phaseName = this.getPhaseDisplayName(card.phase);
    const phaseColor = this.getPhaseColor(card.phase);
    const signalName = this.getSignalDisplayName(card.signal);
    const signalColor = this.getSignalColor(card.signal);

    return `
      <div class="watchlist-card" data-code="${card.code}">
        <div class="watchlist-card-header">
          <span class="watchlist-card-code">${card.code}</span>
          <button class="watchlist-card-remove" data-code="${card.code}" title="删除">✕</button>
        </div>
        <div class="watchlist-card-name">${card.name}</div>
        <div class="watchlist-card-info">
          <span class="watchlist-card-phase" style="color: ${phaseColor}">${phaseName}</span>
          <span class="watchlist-card-signal" style="color: ${signalColor}">${signalName}</span>
        </div>
        <div class="watchlist-card-actions">
          <button class="btn btn-small btn-primary" data-action="analyze" data-code="${card.code}">分析</button>
        </div>
      </div>
    `;
  }

  /**
   * 生成空状态HTML
   * @returns {string} 空状态HTML
   */
  static generateEmptyState() {
    return `
      <div class="watchlist-empty">
        <div class="watchlist-empty-icon">📋</div>
        <div class="watchlist-empty-text">还没有自选股</div>
        <div class="watchlist-empty-hint">输入股票代码并点击"添加"按钮</div>
      </div>
    `;
  }

  /**
   * 渲染自选股列表
   * @param {Array} data - 自选股数据
   * @returns {string} 完整HTML
   */
  static render(data) {
    if (!data || data.length === 0) {
      return this.generateEmptyState();
    }

    const cards = this.convertToCards(data);

    const cardsHTML = cards.map(card => this.generateCardHTML(card)).join('');

    return `
      <div class="watchlist-grid">
        ${cardsHTML}
      </div>
    `;
  }

  /**
   * 筛选自选股（按阶段）
   * @param {Array} data - 自选股数据
   * @param {string} phase - 阶段代码
   * @returns {Array} 筛选后的数据
   */
  static filterByPhase(data, phase) {
    if (!data || data.length === 0) return [];
    if (!phase || phase === 'all') return data;

    return data.filter(item => item.phase === phase);
  }

  /**
   * 筛选自选股（按信号）
   * @param {Array} data - 自选股数据
   * @param {string} signal - 信号代码
   * @returns {Array} 筛选后的数据
   */
  static filterBySignal(data, signal) {
    if (!data || data.length === 0) return [];
    if (!signal || signal === 'all') return data;

    return data.filter(item => item.signal === signal);
  }

  /**
   * 搜索自选股
   * @param {Array} data - 自选股数据
   * @param {string} keyword - 搜索关键词
   * @returns {Array} 搜索结果
   */
  static search(data, keyword) {
    if (!data || data.length === 0) return [];
    if (!keyword || keyword.trim() === '') return data;

    const lowerKeyword = keyword.toLowerCase().trim();

    return data.filter(item => {
      return (
        item.stock_code.toLowerCase().includes(lowerKeyword) ||
        (item.stock_name && item.stock_name.toLowerCase().includes(lowerKeyword))
      );
    });
  }

  /**
   * 添加股票到自选股
   * @param {string} code - 股票代码
   * @returns {Promise<Object>} 结果
   */
  static async addToWatchlist(code) {
    try {
      logger.info(`Adding stock to watchlist: ${code}`);

      const result = await watchlistApi.add(code);

      if (result.success) {
        toast.success(`已添加 ${code} 到自选股`);
        // 触发自选股变更事件
        eventBus.emit(Events.WATCHLIST_CHANGED, { action: 'add', code });
      } else {
        toast.error(result.message || '添加失败');
      }

      return result;
    } catch (error) {
      logger.error('Failed to add stock to watchlist:', error);
      toast.error('添加失败，请稍后重试');
      throw error;
    }
  }

  /**
   * 从自选股删除
   * @param {string} code - 股票代码
   * @returns {Promise<Object>} 结果
   */
  static async removeFromWatchlist(code) {
    try {
      logger.info(`Removing stock from watchlist: ${code}`);

      const result = await watchlistApi.remove(code);

      if (result.success) {
        toast.success(`已从自选股删除 ${code}`);
        // 触发自选股变更事件
        eventBus.emit(Events.WATCHLIST_CHANGED, { action: 'remove', code });
      } else {
        toast.error(result.message || '删除失败');
      }

      return result;
    } catch (error) {
      logger.error('Failed to remove stock from watchlist:', error);
      toast.error('删除失败，请稍后重试');
      throw error;
    }
  }

  /**
   * 批量分析自选股
   * @param {Array} watchlistData - 自选股数据
   * @returns {Promise<Object>} 结果
   */
  static async batchAnalyze(watchlistData) {
    try {
      logger.info(`Batch analyzing watchlist: ${watchlistData.length} stocks`);

      const requests = watchlistData.map(item => ({
        code: item.stock_code,
        timeframe: 'daily'
      }));

      const result = await stocksApi.batchAnalyze(requests);

      toast.success(`批量分析完成，共 ${watchlistData.length} 只股票`);

      return result;
    } catch (error) {
      logger.error('Failed to batch analyze watchlist:', error);
      toast.error('批量分析失败，请稍后重试');
      throw error;
    }
  }

  /**
   * 刷新自选股数据
   * @returns {Promise<Array>} 自选股数据
   */
  static async refresh() {
    try {
      logger.info('Refreshing watchlist data');

      const result = await watchlistApi.getAll();
      const items = result?.items || (Array.isArray(result) ? result : []);

      logger.info(`Watchlist refreshed: ${items.length} items`);

      return items;
    } catch (error) {
      logger.error('Failed to refresh watchlist:', error);
      toast.error('刷新失败，请稍后重试');
      throw error;
    }
  }
}

export default Watchlist;
