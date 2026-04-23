/**
 * 自选股组件
 * 管理和显示用户的自选股列表
 */

import { formatDateString } from '../utils/helpers.js';
import { watchlistApi } from '../api/watchlist.js';
import { stocksApi } from '../api/stocks.js';
import { logger } from '../utils/logger.js';
import { toast } from '../utils/toast.js';
import { eventBus, Events } from '../config.js';
import { createPhaseBadge, createSignalBadge } from '../utils/formatting.js';
import { getSignalStrength, calculateMAStatus, calculateVolumeStatus, formatChangePercent } from '../utils/enhancedFormatting.js';
import { WatchlistPagination } from '../utils/watchlistPagination.js';
import { VirtualScroll } from './VirtualScroll.js';

/**
 * 自选股类
 */
export class Watchlist {
  /**
   * 当前视图模式
   */
  static currentViewMode = 'table'; // 'card' | 'table' (默认表格视图，与老版本一致)

  /**
   * 当前排序模式
   */
  static currentSortMode = 'default'; // 'default' | 'score_desc' | 'score_asc' | 'price_desc' | 'price_asc' | 'code_asc'

  /**
   * 批量选择模式
   */
  static batchSelectMode = false;

  /**
   * 已选择的股票代码
   */
  static selectedStocks = new Set();

  /**
   * 虚拟滚动阈值 - 超过此行数启用虚拟滚动
   */
  static VIRTUAL_SCROLL_THRESHOLD = 50;

  /**
   * 虚拟滚动实例
   */
  static virtualScrollInstance = null;

  /**
   * 当前表格数据（用于虚拟滚动）
   */
  static currentTableData = null;

  /**
   * 当前表格标签（用于虚拟滚动）
   */
  static currentTableTab = 'favorite';

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
      lastUpdate: item.last_update || null,
      watch_type: item.watch_type || 'browse'  // 保留watch_type字段用于按钮显示
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

    // 批量选择复选框
    const isSelected = this.selectedStocks.has(card.code);
    const checkboxHTML = this.batchSelectMode
      ? `<input type="checkbox" class="watchlist-card-checkbox" data-code="${card.code}" ${isSelected ? 'checked' : ''} style="position: absolute; top: 8px; left: 8px; width: 18px; height: 18px; cursor: pointer;">`
      : '';

    // 根据股票的 watch_type 和当前标签显示不同的操作按钮
    const isFavorite = card.watch_type === 'favorite';

    // 按钮文案根据当前标签动态设置
    const unfavoriteTitle = currentTab === 'favorite'
      ? '取消自选股，转为浏览股'
      : '取消收藏，移到浏览股';
    const favoriteTitle = '添加到自选股';

    const toggleButton = isFavorite
      ? `<button class="watchlist-card-btn btn-unfavorite" data-action="unfavorite" data-code="${card.code}" title="${unfavoriteTitle}" style="flex: 1; background: linear-gradient(135deg, #6b7280, #4b5563); padding: 5px 6px; border: none; color: white; border-radius: 4px; font-size: 10px; cursor: pointer;">💔</button>`
      : `<button class="watchlist-card-btn btn-favorite" data-action="favorite" data-code="${card.code}" title="${favoriteTitle}" style="flex: 1; background: linear-gradient(135deg, #f59e0b, #d97706); padding: 5px 6px; border: none; color: white; border-radius: 4px; font-size: 10px; cursor: pointer;">⭐</button>`;

    return `
      <div class="watchlist-card" data-code="${card.code}" style="position: relative;">
        ${checkboxHTML}
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
          <button class="watchlist-card-btn btn-analyze" data-action="analyze" data-code="${card.code}" title="日线分析" style="flex: 1; background: #3b82f6; padding: 5px 6px; border: none; color: white; border-radius: 4px; font-size: 10px; cursor: pointer;">📊</button>
          <button class="watchlist-card-btn btn-multi" data-action="multi" data-code="${card.code}" title="多周期分析" style="flex: 1; background: linear-gradient(135deg, #8b5cf6, #a78bfa); padding: 5px 6px; border: none; color: white; border-radius: 4px; font-size: 10px; cursor: pointer;">📈</button>
          ${toggleButton}
          <button class="watchlist-card-btn btn-delete" data-action="delete" data-code="${card.code}" title="删除" style="flex: 1; background: #dc2626; padding: 5px 6px; border: none; color: white; border-radius: 4px; font-size: 10px; cursor: pointer;">🗑️</button>
        </div>
      </div>
    `;
  }

  /**
   * 生成空状态HTML
   * @param {string} message - 自定义提示消息
   * @returns {string} 空状态HTML
   */
  static generateEmptyState(message = null) {
    const emptyText = message || '暂无数据';
    const hintText = message ? '' : '输入股票代码并点击"添加"按钮';

    return `
      <div class="watchlist-empty">
        <div class="watchlist-empty-icon">📋</div>
        <div class="watchlist-empty-text">${emptyText}</div>
        ${hintText ? `<div class="watchlist-empty-hint">${hintText}</div>` : ''}
      </div>
    `;
  }

  /**
   * 生成骨架屏HTML（表格视图）
   * @returns {string} 骨架屏HTML
   */
  static generateTableSkeleton() {
    let rows = '';
    for (let i = 0; i < 8; i++) {
      rows += `
        <div class="skeleton-row">
          <div class="skeleton-cell"></div>
          <div class="skeleton-cell"></div>
          <div class="skeleton-cell"></div>
          <div class="skeleton-cell"></div>
          <div class="skeleton-cell"></div>
          <div class="skeleton-cell"></div>
          <div class="skeleton-cell"></div>
          <div class="skeleton-cell"></div>
          <div class="skeleton-cell"></div>
          <div class="skeleton-cell"></div>
          <div class="skeleton-cell"></div>
          <div class="skeleton-cell"></div>
          <div class="skeleton-cell"></div>
          <div class="skeleton-cell"></div>
          <div class="skeleton-cell"></div>
        </div>
      `;
    }

    return `
      <div class="watchlist-table-skeleton">
        <div class="skeleton-header">
          <div class="skeleton-header-cell"></div>
          <div class="skeleton-header-cell"></div>
          <div class="skeleton-header-cell"></div>
          <div class="skeleton-header-cell"></div>
          <div class="skeleton-header-cell"></div>
          <div class="skeleton-header-cell"></div>
          <div class="skeleton-header-cell"></div>
          <div class="skeleton-header-cell"></div>
          <div class="skeleton-header-cell"></div>
          <div class="skeleton-header-cell"></div>
          <div class="skeleton-header-cell"></div>
          <div class="skeleton-header-cell"></div>
          <div class="skeleton-header-cell"></div>
          <div class="skeleton-header-cell"></div>
          <div class="skeleton-header-cell"></div>
        </div>
        ${rows}
      </div>
    `;
  }

  /**
   * 生成加载状态HTML
   * @returns {string} 加载状态HTML
   */
  static generateLoadingState() {
    return `
      <div class="watchlist-loading">
        <div class="loading-spinner"></div>
        <div class="loading-text">加载中...</div>
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
        // toast.success(`批量分析完成，全部 ${successCount} 只股票`);
      } else {
        // toast.warning(`批量分析完成，${successCount}/${watchlistData.length} 只成功`);
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

  /**
   * 切换视图模式
   * @param {string} mode - 视图模式 ('card' | 'table')
   */
  static setViewMode(mode) {
    if (mode === 'card' || mode === 'table') {
      this.currentViewMode = mode;
      // 触发视图变更事件
      eventBus.emit(Events.WATCHLIST_VIEW_CHANGED, { mode });
    }
  }

  /**
   * 获取当前视图模式
   * @returns {string} 视图模式
   */
  static getViewMode() {
    return this.currentViewMode;
  }

  /**
   * 设置排序模式
   * @param {string} mode - 排序模式
   */
  static setSortMode(mode) {
    this.currentSortMode = mode;
  }

  /**
   * 获取当前排序模式
   * @returns {string} 排序模式
   */
  static getSortMode() {
    return this.currentSortMode;
  }

  /**
   * 获取当前周期
   * @returns {string} 当前周期
   */
  static getCurrentTimeframe() {
    return WatchlistPagination.getCurrentTimeframe();
  }

  /**
   * 应用排序
   * @param {Array} data - 数据数组
   * @returns {Array} 排序后的数据
   */
  static applySort(data) {
    if (!data || data.length === 0) return data;

    const sortMode = this.currentSortMode;
    if (sortMode === 'default') return data;

    const sorted = [...data];

    switch (sortMode) {
      case 'score_desc':
        sorted.sort((a, b) => (b.score || 0) - (a.score || 0));
        break;
      case 'score_asc':
        sorted.sort((a, b) => (a.score || 0) - (b.score || 0));
        break;
      case 'price_desc':
        sorted.sort((a, b) => (b.quote?.close || 0) - (a.quote?.close || 0));
        break;
      case 'price_asc':
        sorted.sort((a, b) => (a.quote?.close || 0) - (b.quote?.close || 0));
        break;
      case 'code_asc':
        sorted.sort((a, b) => a.stock_code.localeCompare(b.stock_code));
        break;
    }

    return sorted;
  }

  /**
   * 设置批量选择模式
   * @param {boolean} mode - 是否开启批量选择
   */
  static setBatchSelectMode(mode) {
    this.batchSelectMode = mode;
    if (!mode) {
      this.selectedStocks.clear();
    }
  }

  /**
   * 切换股票选择状态
   * @param {string} code - 股票代码
   */
  static toggleStockSelection(code) {
    if (this.selectedStocks.has(code)) {
      this.selectedStocks.delete(code);
    } else {
      this.selectedStocks.add(code);
    }
    return this.selectedStocks.has(code);
  }

  /**
   * 获取已选择的股票
   * @returns {Set} 已选择的股票代码集合
   */
  static getSelectedStocks() {
    return this.selectedStocks;
  }

  /**
   * 生成视图切换按钮HTML
   * @returns {string} 按钮HTML
   */
  static generateViewToggleHTML() {
    const cardClass = this.currentViewMode === 'card' ? 'view-btn-active' : '';
    const tableClass = this.currentViewMode === 'table' ? 'view-btn-active' : '';

    return `
      <div class="watchlist-view-toggle">
        <button class="view-btn ${cardClass}" data-view="card" title="卡片视图">
          <span>📇</span>
        </button>
        <button class="view-btn ${tableClass}" data-view="table" title="表格视图">
          <span>📊</span>
        </button>
      </div>
    `;
  }

  /**
   * 渲染自选股列表（支持视图模式）
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

    // 应用排序
    const sortedData = this.applySort(data);

    // 根据视图模式渲染
    if (this.currentViewMode === 'table') {
      return this.renderTableView(sortedData, currentTab);
    }

    // 默认卡片视图
    const cards = this.convertToCards(data);
    const cardsHTML = cards.map(card => this.generateCardHTML(card, currentTab)).join('');

    return `
      <div class="watchlist-grid">
        ${cardsHTML}
      </div>
    `;
  }

  /**
   * 渲染表格视图
   * @param {Array} data - 自选股数据
   * @param {string} currentTab - 当前标签
   * @returns {string} 表格HTML
   */
  static renderTableView(data, currentTab) {
    // 保存当前数据供虚拟滚动使用
    this.currentTableData = data;
    this.currentTableTab = currentTab;

    // 获取当前周期
    const currentTimeframe = WatchlistPagination.getCurrentTimeframe();

    // 检测哪些MA列有数据
    const hasMA20 = data.some(item => item.quote && item.quote.ma20 != null);
    const hasMA30 = data.some(item => item.quote && item.quote.ma30 != null);
    const hasMA60 = data.some(item => item.quote && item.quote.ma60 != null);

    // 判断是否使用虚拟滚动
    const useVirtualScroll = data.length >= this.VIRTUAL_SCROLL_THRESHOLD;

    let html = `
      <div class="watchlist-table-wrapper" ${useVirtualScroll ? 'id="watchlist-virtual-scroll-container"' : ''}>
        <table class="watchlist-table">
          <thead>
            <tr>
              <th>代码</th>
              <th>名称</th>
              <th>日期</th>
              <th>收盘价</th>
              <th>涨跌幅</th>
              <th>量能</th>
              <th>MA5</th>
              <th>MA10</th>
              ${hasMA20 ? '<th>MA20</th>' : ''}
              ${hasMA30 ? '<th>MA30</th>' : ''}
              ${hasMA60 ? '<th>MA60</th>' : ''}
              <th>阶段</th>
              <th>评分</th>
              <th>信号强度</th>
              <th>信号</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody${useVirtualScroll ? ' class="virtual-tbody"' : ''}>
    `;

    if (useVirtualScroll) {
      // 虚拟滚动模式 - 只渲染表头，tbody留空由VirtualScroll填充
      html += `
          </tbody>
        </table>
      </div>
      ${this.generatePaginationControls()}
      <div style="text-align: center; color: #9ca3af; font-size: 11px; padding: 4px;">
        🚀 虚拟滚动已启用 (${data.length} 行)
      </div>
      `;
    } else {
      // 普通模式 - 渲染所有行
      data.forEach(item => {
        html += this.generateTableRow(item, hasMA20, hasMA30, hasMA60, currentTab, currentTimeframe);
      });

      html += `
          </tbody>
        </table>
      </div>
      ${this.generatePaginationControls()}
    `;
    }

    return html;
  }

  /**
   * 生成单行HTML（用于虚拟滚动）
   * @param {Object} item - 股票数据
   * @param {boolean} hasMA20 - 是否有MA20列
   * @param {boolean} hasMA30 - 是否有MA30列
   * @param {boolean} hasMA60 - 是否有MA60列
   * @param {string} currentTab - 当前标签 (favorite | browse)
   * @param {string} currentTimeframe - 当前周期 (daily/weekly/monthly/30m/60m等)
   * @returns {string} 行HTML
   */
  static generateTableRow(item, hasMA20 = true, hasMA30 = true, hasMA60 = true, currentTab = 'favorite', currentTimeframe = 'daily') {
    const quote = item.quote || {};
    const displayName = item.stock_name ? (item.stock_name.length > 4 ? item.stock_name.substring(0, 4) : item.stock_name) : '-';

    // 计算涨跌幅
    let changeDisplay = '-';
    let changeColor = '#9ca3af';
    if (quote.close && quote.open) {
      const changePct = ((quote.close - quote.open) / quote.open * 100);
      changeDisplay = changePct >= 0 ? `+${changePct.toFixed(2)}%` : `${changePct.toFixed(2)}%`;
      changeColor = changePct >= 0 ? '#ef4444' : '#10b981';
    }

    // MA显示 - 使用旧版本K线表格的彩色方案
    const formatMAWithColor = (maValue, color) => {
      if (maValue == null) return '-';
      return `<span class="ma" style="color: ${color};">${maValue.toFixed(2)}</span>`;
    };

    // 量能显示 - 与旧版K线表格一致，使用"万"为单位
    let volDisplay = '-';
    if (quote.volume) {
      const wan = Math.round(quote.volume / 10000);
      volDisplay = `${wan}万`;
    }

    // 信号强度
    const signalStrength = getSignalStrength(quote);

    // 评分
    const score = item.score || 0;
    const scoreColor = score >= 3 ? '#10b981' : score >= 1 ? '#f59e0b' : score <= -1 ? '#ef4444' : '#9ca3af';

    // 阶段和信号
    const phaseCode = item.phase || '震荡';
    const signalCode = item.signal || '观望';

    // 日期格式化：根据周期显示不同格式
    // 分钟线（1m、5m、15m、30m、60m）显示到分钟：MM-DD HH:MM
    // 日线、周线、月线显示到天：MM-DD
    let dateDisplay = '-';
    if (quote.date) {
      dateDisplay = formatDateString(quote.date, currentTimeframe) || '-';
    }

    // 按钮文案根据当前标签动态设置
    const unfavoriteTitle = currentTab === 'favorite'
      ? '取消自选股，转为浏览股'
      : '取消收藏，移到浏览股';
    const favoriteTitle = '添加到自选股';

    return `
      <tr class="watchlist-table-row" data-code="${item.stock_code}" data-index="${item._index || 0}">
        <td><strong>${item.stock_code}</strong></td>
        <td style="color: #10b981;">${displayName}</td>
        <td style="color: #9ca3af;">${dateDisplay}</td>
        <td style="color: ${quote.close && quote.close < quote.open ? '#ef4444' : '#10b981'}; font-weight: 600;">
          ${quote.close ? quote.close.toFixed(2) : '-'}
        </td>
        <td style="color: ${changeColor};">${changeDisplay}</td>
        <td>${volDisplay}</td>
        <td>${formatMAWithColor(quote.ma5, '#3b82f6')}</td>
        <td>${formatMAWithColor(quote.ma10, '#8b5cf6')}</td>
        ${hasMA20 ? `<td>${formatMAWithColor(quote.ma20, '#f59e0b')}</td>` : ''}
        ${hasMA30 ? `<td>${formatMAWithColor(quote.ma30, '#10b981')}</td>` : ''}
        ${hasMA60 ? `<td>${formatMAWithColor(quote.ma60, '#ec4899')}</td>` : ''}
        <td><span class="phase-badge phase-${phaseCode}">${phaseCode}</span></td>
        <td style="color: ${scoreColor}; font-weight: 600;">${score > 0 ? '+' : ''}${score}</td>
        <td>${signalStrength}</td>
        <td><span class="signal-badge signal-${signalCode}">${signalCode}</span></td>
        <td>
          <div style="display: flex; gap: 4px; flex-wrap: nowrap;">
            <button class="watchlist-table-btn btn-analyze" data-action="analyze" data-code="${item.stock_code}" title="日线分析">📊</button>
            <button class="watchlist-table-btn btn-multi" data-action="multi" data-code="${item.stock_code}" title="多周期分析">📈</button>
            ${item.watch_type === 'favorite' ?
              `<button class="watchlist-table-btn btn-unfavorite" data-action="unfavorite" data-code="${item.stock_code}" title="${unfavoriteTitle}">💔</button>` :
              `<button class="watchlist-table-btn btn-favorite" data-action="favorite" data-code="${item.stock_code}" title="${favoriteTitle}">⭐</button>`
            }
            <button class="watchlist-table-btn btn-delete" data-action="delete" data-code="${item.stock_code}" title="删除">🗑️</button>
          </div>
        </td>
      </tr>
    `;
  }

  /**
   * 初始化虚拟滚动
   * @param {HTMLElement} container - 容器元素
   */
  static initVirtualScroll(container) {
    if (!this.currentTableData || this.currentTableData.length < this.VIRTUAL_SCROLL_THRESHOLD) {
      return;
    }

    // 清理旧实例
    this.destroyVirtualScroll();

    // 获取当前周期
    const currentTimeframe = WatchlistPagination.getCurrentTimeframe();

    // 检测哪些MA列有数据
    const hasMA20 = this.currentTableData.some(item => item.quote && item.quote.ma20 != null);
    const hasMA30 = this.currentTableData.some(item => item.quote && item.quote.ma30 != null);
    const hasMA60 = this.currentTableData.some(item => item.quote && item.quote.ma60 != null);

    // 添加索引到数据
    const dataWithIndex = this.currentTableData.map((item, index) => ({
      ...item,
      _index: index
    }));

    // 创建虚拟滚动实例
    this.virtualScrollInstance = new VirtualScroll(container, {
      rowHeight: 40, // 每行高度
      bufferRows: 10, // 缓冲行数
      renderRow: (item, index) => this.generateTableRow(item, hasMA20, hasMA30, hasMA60, this.currentTableTab, currentTimeframe),
      onRowClick: (index, item) => {
        // 行点击事件
        logger.debug('Row clicked:', item.stock_code);
      }
    });

    this.virtualScrollInstance.setData(dataWithIndex);
    logger.info('VirtualScroll initialized with', dataWithIndex.length, 'rows');
  }

  /**
   * 销毁虚拟滚动
   */
  static destroyVirtualScroll() {
    if (this.virtualScrollInstance) {
      this.virtualScrollInstance.destroy();
      this.virtualScrollInstance = null;
    }
  }

  /**
   * 清理资源
   */
  static cleanup() {
    this.destroyVirtualScroll();
    this.currentTableData = null;
    this.currentTableTab = 'favorite';
  }

  /**
   * 生成翻页控制按钮
   * @returns {string} 翻页控制HTML
   */
  static generatePaginationControls() {
    const currentOffset = WatchlistPagination.getCurrentOffset();
    const canPageBack = WatchlistPagination.canPageBack();
    const canPageForward = WatchlistPagination.canPageForward();
    const offsetInfo = WatchlistPagination.getOffsetInfo();

    return `
      <div class="watchlist-pagination">
        <div class="pagination-info">
          <span class="pagination-text">${offsetInfo}</span>
        </div>
        <div class="pagination-controls">
          <button class="pagination-btn ${!canPageBack ? 'disabled' : ''}"
                  data-action="page-back"
                  title="查看历史数据"
                  ${!canPageBack ? 'disabled' : ''}>
            <span>◀</span>
            <span>历史</span>
          </button>
          <button class="pagination-btn ${!canPageForward ? 'disabled' : ''}"
                  data-action="page-forward"
                  title="返回最新数据"
                  ${!canPageForward ? 'disabled' : ''}>
            <span>最新</span>
            <span>▶</span>
          </button>
          <button class="pagination-btn ${currentOffset === 0 ? 'disabled' : ''}"
                  data-action="page-reset"
                  title="返回最新"
                  ${currentOffset === 0 ? 'disabled' : ''}>
            <span>⟲</span>
            <span>重置</span>
          </button>
        </div>
      </div>
    `;
  }

  /**
   * 绑定翻页事件
   * @param {HTMLElement} container - 容器元素
   */
  static bindPaginationEvents(container) {
    const paginationControls = container.querySelector('.watchlist-pagination');
    if (!paginationControls) return;

    paginationControls.addEventListener('click', (e) => {
      const btn = e.target.closest('.pagination-btn');
      if (!btn || btn.classList.contains('disabled')) return;

      const action = btn.dataset.action;

      switch (action) {
        case 'page-back':
          if (WatchlistPagination.pageBack()) {
            // 触发重新渲染
            eventBus.emit(Events.WATCHLIST_PAGE_CHANGED, {
              offset: WatchlistPagination.getCurrentOffset(),
              tab: WatchlistPagination.getCurrentTab()
            });
          }
          break;

        case 'page-forward':
          if (WatchlistPagination.pageForward()) {
            eventBus.emit(Events.WATCHLIST_PAGE_CHANGED, {
              offset: WatchlistPagination.getCurrentOffset(),
              tab: WatchlistPagination.getCurrentTab()
            });
          }
          break;

        case 'page-reset':
          WatchlistPagination.resetToLatest();
          eventBus.emit(Events.WATCHLIST_PAGE_CHANGED, {
            offset: 0,
            tab: WatchlistPagination.getCurrentTab()
          });
          break;
      }
    });
  }
}

export default Watchlist;
