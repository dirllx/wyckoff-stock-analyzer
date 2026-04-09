/**
 * 自选股组件
 * 管理和显示用户的自选股列表
 */

import { watchlistApi } from '../api/watchlist.js';
import { stocksApi } from '../api/stocks.js';
import { logger } from '../utils/logger.js';
import { toast } from '../utils/toast.js';
import { eventBus, Events } from '../config.js';
import { createPhaseBadge, createSignalBadge } from '../utils/formatting.js';

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
      '震荡': 'var(--text-tertiary)'  // 震荡 - 灰色
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
      '观望': 'var(--text-tertiary)'    // 观望 - 灰色
    };
    return colors[signal] || colors['观望'];
  }

  /**
   * 生成单个卡片HTML
   * @param {Object} card - 卡片数据
   * @param {string} currentTab - 当前标签 (favorite | browse)
   * @returns {string} 卡片HTML
   */
  static generateCardHTML(card, currentTab = 'favorite') {
    // 使用格式化工具生成徽章
    const phaseBadge = createPhaseBadge(card.phase);
    const signalBadge = createSignalBadge(card.signal === '买入' ? 'LONG' : card.signal === '卖出' ? 'SHORT' : 'NEUTRAL');

    // 根据当前标签类型显示不同的操作按钮
    const isFavorite = currentTab === 'favorite';
    const toggleButton = isFavorite
      ? `<button class="watchlist-card-btn btn-unfavorite" data-action="unfavorite" data-code="${card.code}" title="取消关注，转为浏览股">💔</button>`
      : `<button class="watchlist-card-btn btn-favorite" data-action="favorite" data-code="${card.code}" title="添加到自选股">⭐</button>`;

    return `
      <div class="watchlist-card" data-code="${card.code}">
        <div class="watchlist-card-header">
          <span class="watchlist-card-code">${card.code}</span>
          <button class="watchlist-card-remove" data-action="delete" data-code="${card.code}" title="删除">✕</button>
        </div>
        <div class="watchlist-card-name">${card.name}</div>
        <div class="watchlist-card-info">
          <span class="watchlist-card-phase">${phaseBadge}</span>
          <span class="watchlist-card-signal">${signalBadge}</span>
        </div>
        <div class="watchlist-card-actions">
          <button class="watchlist-card-btn btn-analyze" data-action="analyze" data-code="${card.code}" title="日线分析">📊</button>
          <button class="watchlist-card-btn btn-multi" data-action="multi" data-code="${card.code}" title="多周期分析">📈</button>
          ${toggleButton}
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
   * @param {string} currentTab - 当前标签 (favorite | browse)
   * @returns {string} 完整HTML
   */
  static render(data, currentTab = 'favorite') {
    if (!data || data.length === 0) {
      const emptyMessage = currentTab === 'favorite'
        ? '暂无自选股，从浏览股收藏股票'
        : '暂无浏览股，分析股票后会自动记录';
      return this.generateEmptyState(emptyMessage);
    }

    const cards = this.convertToCards(data);

    const cardsHTML = cards.map(card => this.generateCardHTML(card, currentTab)).join('');

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

      // 逐个分析（后端无批量端点）
      const results = [];
      let successCount = 0;

      for (const item of watchlistData) {
        try {
          const result = await stocksApi.analyze(item.stock_code, null, 'daily');
          results.push({ code: item.stock_code, result, success: true });
          successCount++;
        } catch (error) {
          logger.warn(`Failed to analyze ${item.stock_code}:`, error);
          results.push({ code: item.stock_code, error: error.message, success: false });
        }
      }

      if (successCount === watchlistData.length) {
        toast.success(`批量分析完成，全部 ${successCount} 只股票`);
      } else {
        toast.warning(`批量分析完成，${successCount}/${watchlistData.length} 只成功`);
      }

      return { results, total: watchlistData.length, success: successCount };
    } catch (error) {
      logger.error('Failed to batch analyze watchlist:', error);
      toast.error('批量分析失败，请稍后重试');
      throw error;
    }
  }

  /**
   * 刷新自选股数据
   * @param {string} watchType - 关注类型 (favorite | browse)
   * @returns {Promise<Array>} 自选股数据
   */
  static async refresh(watchType = 'favorite') {
    try {
      logger.info(`Refreshing watchlist data: ${watchType}`);

      const result = await watchlistApi.getAll(watchType);
      const items = result?.items || (Array.isArray(result) ? result : []);

      logger.info(`Watchlist refreshed: ${items.length} items (${watchType})`);

      return items;
    } catch (error) {
      logger.error('Failed to refresh watchlist:', error);
      toast.error('刷新失败，请稍后重试');
      throw error;
    }
  }

  /**
   * 收藏股票（浏览股转自选股）
   * @param {string} code - 股票代码
   * @returns {Promise<Object>} 结果
   */
  static async favoriteStock(code) {
    try {
      logger.info(`Favoriting stock: ${code}`);

      const response = await fetch(`/api/v1/watchlist/favorite/${code}`, {
        method: 'POST'
      });
      const data = await response.json();

      if (response.ok) {
        toast.success(data.message || '已收藏到自选股');
        return { success: true, data };
      } else {
        toast.error(data.detail || '收藏失败');
        return { success: false, error: data.detail };
      }
    } catch (error) {
      logger.error('Failed to favorite stock:', error);
      toast.error('收藏失败，请稍后重试');
      throw error;
    }
  }

  /**
   * 取消收藏（自选股转浏览股）
   * @param {string} code - 股票代码
   * @returns {Promise<Object>} 结果
   */
  static async unfavoriteStock(code) {
    try {
      logger.info(`Unfavoriting stock: ${code}`);

      const response = await fetch(`/api/v1/watchlist/favorite/${code}`, {
        method: 'DELETE'
      });
      const data = await response.json();

      if (response.ok) {
        toast.success(data.message || '已取消收藏');
        return { success: true, data };
      } else {
        toast.error(data.detail || '取消失败');
        return { success: false, error: data.detail };
      }
    } catch (error) {
      logger.error('Failed to unfavorite stock:', error);
      toast.error('操作失败，请稍后重试');
      throw error;
    }
  }
}

export default Watchlist;
