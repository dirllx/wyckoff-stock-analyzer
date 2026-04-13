/**
 * 关注列表翻页管理
 * 处理关注列表的数据翻页和周期切换
 */

import { AppState, eventBus, Events } from '../config.js';
import { logger } from './logger.js';

/**
 * 翻页管理器
 */
export class WatchlistPagination {
  /**
   * 获取当前偏移量
   * @returns {number} 当前偏移量
   */
  static getCurrentOffset() {
    return AppState.watchlist.pagination?.currentOffset || 0;
  }

  /**
   * 获取当前周期
   * @returns {string} 当前周期
   */
  static getCurrentTimeframe() {
    return AppState.watchlist.pagination?.currentTimeframe || 'daily';
  }

  /**
   * 获取当前标签
   * @returns {string} 当前标签
   */
  static getCurrentTab() {
    return AppState.watchlist.pagination?.currentTab || 'favorite';
  }

  /**
   * 获取quotesListMap
   * @returns {Object} quotes列表映射
   */
  static getQuotesListMap() {
    return AppState.watchlist.pagination?.quotesListMap || {};
  }

  /**
   * 获取scoresByOffset
   * @returns {Object} 评分数据
   */
  static getScoresByOffset() {
    return AppState.watchlist.pagination?.scoresByOffset || {};
  }

  /**
   * 设置偏移量
   * @param {number} offset - 新的偏移量
   */
  static setOffset(offset) {
    const maxOffset = AppState.watchlist.pagination?.maxOffset || 10;
    const clampedOffset = Math.max(0, Math.min(offset, maxOffset));

    AppState.watchlist.pagination.currentOffset = clampedOffset;

    logger.info(`Watchlist offset set to: ${clampedOffset}`);

    // 触发翻页变更事件
    eventBus.emit(Events.WATCHLIST_PAGE_CHANGED, {
      offset: clampedOffset,
      timeframe: this.getCurrentTimeframe(),
      tab: this.getCurrentTab()
    });
  }

  /**
   * 翻页到上一期
   */
  static pageBack() {
    const currentOffset = this.getCurrentOffset();
    const maxOffset = AppState.watchlist.pagination?.maxOffset || 10;

    if (currentOffset < maxOffset) {
      this.setOffset(currentOffset + 1);
      return true;
    }

    logger.warn('Already at maximum offset');
    return false;
  }

  /**
   * 翻页到下一期
   */
  static pageForward() {
    const currentOffset = this.getCurrentOffset();

    if (currentOffset > 0) {
      this.setOffset(currentOffset - 1);
      return true;
    }

    logger.warn('Already at latest data');
    return false;
  }

  /**
   * 返回最新数据
   */
  static resetToLatest() {
    this.setOffset(0);
  }

  /**
   * 切换周期并重置偏移量
   * @param {string} newTimeframe - 新的周期
   */
  static switchTimeframe(newTimeframe) {
    const currentTimeframe = this.getCurrentTimeframe();

    if (currentTimeframe !== newTimeframe) {
      logger.info(`Switching timeframe from ${currentTimeframe} to ${newTimeframe}`);

      // 重置偏移量
      AppState.watchlist.pagination.currentTimeframe = newTimeframe;
      AppState.watchlist.pagination.currentOffset = 0;

      // 清空缓存数据
      AppState.watchlist.pagination.quotesListMap = {};
      AppState.watchlist.pagination.scoresByOffset = {};

      // 触发周期变更事件
      eventBus.emit(Events.WATCHLIST_TIMEFRAME_CHANGED, {
        from: currentTimeframe,
        to: newTimeframe,
        tab: this.getCurrentTab()
      });
    }
  }

  /**
   * 切换标签
   * @param {string} newTab - 新的标签 ('favorite' | 'browse')
   */
  static switchTab(newTab) {
    const currentTab = this.getCurrentTab();

    if (currentTab !== newTab) {
      logger.info(`Switching tab from ${currentTab} to ${newTab}`);

      AppState.watchlist.pagination.currentTab = newTab;

      // 重置偏移量
      AppState.watchlist.pagination.currentOffset = 0;
    }
  }

  /**
   * 设置quotesListMap
   * @param {Object} quotesListMap - K线列表映射
   */
  static setQuotesListMap(quotesListMap) {
    AppState.watchlist.pagination.quotesListMap = quotesListMap || {};
    logger.debug(`Quotes list map updated with ${Object.keys(quotesListMap || {}).length} stocks`);
  }

  /**
   * 设置scoresByOffset
   * @param {Object} scoresByOffset - 评分数据
   */
  static setScoresByOffset(scoresByOffset) {
    AppState.watchlist.pagination.scoresByOffset = scoresByOffset || {};
    logger.debug('Scores by offset updated');
  }

  /**
   * 根据偏移量获取股票的quote数据
   * @param {string} stockCode - 股票代码
   * @returns {Object|null} quote数据
   */
  static getQuoteByOffset(stockCode) {
    const quotesListMap = this.getQuotesListMap();
    const currentOffset = this.getCurrentOffset();

    const quotes = quotesListMap[stockCode];
    if (!quotes || quotes.length === 0) {
      return null;
    }

    // 从最新数据开始计算索引
    const quoteIndex = quotes.length - 1 - currentOffset;

    if (quoteIndex >= 0 && quoteIndex < quotes.length) {
      return quotes[quoteIndex];
    }

    return null;
  }

  /**
   * 根据偏移量获取股票的评分
   * @param {string} stockCode - 股票代码
   * @returns {number} 评分
   */
  static getScoreByOffset(stockCode) {
    const scoresByOffset = this.getScoresByOffset();
    const currentOffset = this.getCurrentOffset();

    const scores = scoresByOffset[stockCode];
    if (!scores || scores.length === 0) {
      return 0;
    }

    if (currentOffset < scores.length) {
      return scores[currentOffset] || 0;
    }

    return 0;
  }

  /**
   * 获取偏移量信息文本
   * @returns {string} 偏移量信息
   */
  static getOffsetInfo() {
    const currentOffset = this.getCurrentOffset();

    if (currentOffset === 0) {
      return '最新数据';
    }

    return `前第 ${currentOffset} 期`;
  }

  /**
   * 检查是否可以向前翻页
   * @returns {boolean} 是否可以向前翻页
   */
  static canPageBack() {
    const currentOffset = this.getCurrentOffset();
    const maxOffset = AppState.watchlist.pagination?.maxOffset || 10;
    return currentOffset < maxOffset;
  }

  /**
   * 检查是否可以向后翻页
   * @returns {boolean} 是否可以向后翻页
   */
  static canPageForward() {
    const currentOffset = this.getCurrentOffset();
    return currentOffset > 0;
  }

  /**
   * 清空所有缓存数据
   */
  static clearCache() {
    AppState.watchlist.pagination.quotesListMap = {};
    AppState.watchlist.pagination.scoresByOffset = {};
    logger.debug('Watchlist pagination cache cleared');
  }
}

export default WatchlistPagination;
