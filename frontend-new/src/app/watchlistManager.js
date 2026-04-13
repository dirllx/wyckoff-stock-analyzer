/**
 * 自选股管理模块
 * 负责自选股的加载、绑定事件和批量分析
 */

import { logger } from '../utils/logger.js';
import { toast } from '../utils/toast.js';
import { withErrorHandling } from '../utils/errorHandler.js';
import { AppState, eventBus, Events } from '../config.js';
import { DOM } from './dom.js';
import { switchTab } from './ui.js';
import { WatchlistPagination } from '../utils/watchlistPagination.js';
import { stocksApi } from '../api/stocks.js';
import { operationLog } from '../utils/operationLog.js';

// Lazy-loaded Watchlist component
const getWatchlist = () => import('../components/Watchlist.js').then(m => m.Watchlist);

// 当前关注的子标签：favorite=自选股, browse=浏览股
let currentWatchlistTab = 'favorite';

// 筛选状态
const filterState = {
  bullish: false,    // 只看看涨
  bearish: false,    // 只看看跌
  highScore: false   // 评分≥3
};

// 当前显示的数据（用于筛选）
let currentWatchlistData = [];

// 标记是否已初始化全局控件
let globalControlsInitialized = false;

/**
 * 初始化关注列表全局控件（只执行一次）
 * @param {Function} globalErrorHandler - 全局错误处理器
 * @param {Function} analyzeStock - 分析股票函数
 */
function initWatchlistGlobalControls(globalErrorHandler, analyzeStock) {
  if (globalControlsInitialized) {
    return;
  }

  logger.info('Initializing watchlist global controls');

  // 绑定周期选择事件
  const timeframeSelect = document.getElementById('watchlist-timeframe');
  if (timeframeSelect && !timeframeSelect.dataset.initialized) {
    timeframeSelect.addEventListener('change', (e) => {
      const newTimeframe = e.target.value;
      logger.info(`Timeframe changed to: ${newTimeframe}`);
      operationLog.action('周期切换', `切换到 ${newTimeframe}`);
      WatchlistPagination.switchTimeframe(newTimeframe);
      loadWatchlist(globalErrorHandler, analyzeStock);
    });
    timeframeSelect.dataset.initialized = 'true';
  }

  // 绑定子标签切换事件（自选股/浏览股）
  const favoriteBtn = document.getElementById('subtab-favorite');
  const browseBtn = document.getElementById('subtab-browse');

  if (favoriteBtn && !favoriteBtn.dataset.initialized) {
    favoriteBtn.addEventListener('click', () => {
      logger.info('Switching to favorite tab');
      operationLog.action('标签切换', '切换到自选股');
      switchWatchlistTab('favorite', globalErrorHandler, analyzeStock);
    });
    favoriteBtn.dataset.initialized = 'true';
  }

  if (browseBtn && !browseBtn.dataset.initialized) {
    browseBtn.addEventListener('click', () => {
      logger.info('Switching to browse tab');
      operationLog.action('标签切换', '切换到浏览股');
      switchWatchlistTab('browse', globalErrorHandler, analyzeStock);
    });
    browseBtn.dataset.initialized = 'true';
  }

  // 绑定筛选复选框事件
  const filterBullish = document.getElementById('filter-bullish');
  const filterBearish = document.getElementById('filter-bearish');
  const filterHighScore = document.getElementById('filter-high-score');

  const handleFilterChange = async () => {
    filterState.bullish = filterBullish?.checked || false;
    filterState.bearish = filterBearish?.checked || false;
    filterState.highScore = filterHighScore?.checked || false;

    // 记录筛选操作
    const activeFilters = [];
    if (filterState.bullish) activeFilters.push('看涨');
    if (filterState.bearish) activeFilters.push('看跌');
    if (filterState.highScore) activeFilters.push('高分(≥3)');
    if (activeFilters.length > 0) {
      operationLog.action('筛选条件', `应用: ${activeFilters.join(', ')}`);
    }

    // 重新渲染
    const filteredData = applyFilters(currentWatchlistData);
    const totalCount = currentWatchlistData.length;
    const filteredCount = filteredData.length;

    // 更新计数
    const countEl = DOM.watchlistDiv.querySelector('.watchlist-count');
    if (countEl) {
      countEl.textContent = `${filteredCount} 只股票${totalCount !== filteredCount ? ` (共${totalCount}只)` : ''}`;
    }

    // 更新内容
    const contentEl = DOM.watchlistDiv.querySelector('.watchlist-grid, .watchlist-table-wrapper');
    if (contentEl) {
      const WL = await getWatchlist();
      const newContent = WL.render(filteredData, currentWatchlistTab);
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = newContent;
      const newContentEl = tempDiv.firstChild;
      contentEl.parentNode.replaceChild(newContentEl, contentEl);

      // 重新绑定卡片事件
      bindWatchlistEvents(globalErrorHandler, analyzeStock);
    }

    logger.info(`Filters applied: ${JSON.stringify(filterState)}, showing ${filteredCount}/${totalCount}`);
  };

  if (filterBullish && !filterBullish.dataset.initialized) {
    filterBullish.addEventListener('change', handleFilterChange);
    filterBullish.dataset.initialized = 'true';
  }
  if (filterBearish && !filterBearish.dataset.initialized) {
    filterBearish.addEventListener('change', handleFilterChange);
    filterBearish.dataset.initialized = 'true';
  }
  if (filterHighScore && !filterHighScore.dataset.initialized) {
    filterHighScore.addEventListener('change', handleFilterChange);
    filterHighScore.dataset.initialized = 'true';
  }

  // 刷新按钮
  const refreshBtn = document.getElementById('wl-refresh');
  if (refreshBtn && !refreshBtn.dataset.initialized) {
    refreshBtn.addEventListener('click', () => {
      operationLog.action('刷新列表', '重新加载关注列表');
      loadWatchlist(globalErrorHandler, analyzeStock);
    });
    refreshBtn.dataset.initialized = 'true';
  }

  // 批量分析按钮
  const batchBtn = document.getElementById('wl-batch');
  if (batchBtn && !batchBtn.dataset.initialized) {
    batchBtn.addEventListener('click', () => {
      operationLog.action('批量分析', '开始批量分析关注列表');
      batchAnalyzeWatchlist(globalErrorHandler);
    });
    batchBtn.dataset.initialized = 'true';
  }

  globalControlsInitialized = true;
  logger.debug('Watchlist global controls initialized');
}

/**
 * 切换关注列表子标签
 * @param {string} tab - 子标签 (favorite | browse)
 * @param {Function} globalErrorHandler - 全局错误处理器
 * @param {Function} analyzeStock - 分析股票函数
 */
async function switchWatchlistTab(tab, globalErrorHandler, analyzeStock) {
  if (currentWatchlistTab === tab) {
    logger.debug(`Already on tab: ${tab}`);
    return;
  }

  currentWatchlistTab = tab;
  logger.info(`Switching watchlist tab to: ${tab}`);

  // 更新按钮样式（使用内联样式，因为HTML中使用的是内联样式）
  const favoriteBtn = document.getElementById('subtab-favorite');
  const browseBtn = document.getElementById('subtab-browse');

  if (favoriteBtn && browseBtn) {
    if (tab === 'favorite') {
      favoriteBtn.style.background = 'linear-gradient(135deg, #3b82f6, #8b5cf6)';
      browseBtn.style.background = '#374151';
    } else {
      browseBtn.style.background = 'linear-gradient(135deg, #3b82f6, #8b5cf6)';
      favoriteBtn.style.background = '#374151';
    }
  }

  // 更新分页管理器的标签状态
  WatchlistPagination.switchTab(tab);

  // 刷新列表
  await loadWatchlist(globalErrorHandler, analyzeStock);
}

/**
 * 加载自选股列表
 * @param {Function} globalErrorHandler - 全局错误处理器
 * @param {Function} analyzeStock - 分析股票函数
 */
async function loadWatchlist(globalErrorHandler, analyzeStock) {
  try {
    logger.info('Loading watchlist...');
    operationLog.action('加载关注列表', `标签: ${currentWatchlistTab}`);

    const WL = await getWatchlist();
    const watchlistData = await WL.refresh(currentWatchlistTab);

    // 获取批量数据
    const enrichedData = await fetchWatchlistBatchData(watchlistData);

    // 保存当前数据
    currentWatchlistData = enrichedData;

    // 应用筛选
    const filteredData = applyFilters(enrichedData);

    // 渲染自选股
    if (DOM.watchlistDiv) {
      let html = '<div class="watchlist-header">';
      html += '<h3>我的关注</h3>';

      // 操作按钮和计数
      html += '<div class="watchlist-actions">';
      const totalCount = enrichedData.length;
      const filteredCount = filteredData.length;
      html += `<span class="watchlist-count">${filteredCount} 只股票${totalCount !== filteredCount ? ` (共${totalCount}只)` : ''}</span>`;
      html += '</div></div>';

      html += WL.render(filteredData, currentWatchlistTab);
      DOM.watchlistDiv.innerHTML = html;

      // 绑定子标签切换事件（使用index.html中的按钮）
      const favoriteBtn = document.getElementById('subtab-favorite');
      const browseBtn = document.getElementById('subtab-browse');

      // 更新按钮样式
      if (favoriteBtn && browseBtn) {
        if (currentWatchlistTab === 'favorite') {
          favoriteBtn.style.background = 'linear-gradient(135deg, #3b82f6, #8b5cf6)';
          browseBtn.style.background = '#374151';
        } else {
          browseBtn.style.background = 'linear-gradient(135deg, #3b82f6, #8b5cf6)';
          favoriteBtn.style.background = '#374151';
        }
      }

      // 初始化全局控件（只执行一次）
      initWatchlistGlobalControls(globalErrorHandler, analyzeStock);

      // 绑定翻页事件
      WL.bindPaginationEvents(DOM.watchlistDiv);

      // 绑定自选股卡片事件
      bindWatchlistEvents(globalErrorHandler, analyzeStock);

      logger.info(`Watchlist loaded: ${watchlistData.length} items (${currentWatchlistTab})`);
    }
  } catch (error) {
    logger.error('Failed to load watchlist:', error);

    if (DOM.watchlistDiv) {
      const WL = await getWatchlist();
      DOM.watchlistDiv.innerHTML = WL.generateEmptyState();
    }

    globalErrorHandler(error, 'Watchlist Load');
  }
}

/**
 * 获取关注列表的批量数据
 * @param {Array} watchlistData - 关注列表数据
 * @returns {Array} 增强后的数据（包含quote）
 */
async function fetchWatchlistBatchData(watchlistData) {
  if (!watchlistData || watchlistData.length === 0) {
    return watchlistData;
  }

  try {
    const stockCodes = watchlistData.map(item => item.stock_code);
    const currentTimeframe = WatchlistPagination.getCurrentTimeframe();

    logger.info(`Fetching batch data for ${stockCodes.length} stocks, timeframe: ${currentTimeframe}`);

    // 调用批量API
    const result = await stocksApi.getBulkQuotes(stockCodes, currentTimeframe, 10);

    // 构建quotesListMap和scoresByOffset
    const quotesListMap = {};
    const scoresByOffset = {};

    if (result && result.data) {
      result.data.forEach(item => {
        // 后端返回字段名为 'code'，需要映射到 'stock_code'
        const stockCode = item.code || item.stock_code;
        quotesListMap[stockCode] = item.quotes || [];

        // 计算评分（从quotes中提取score字段）
        if (item.quotes && item.quotes.length > 0) {
          scoresByOffset[stockCode] = item.quotes.map(q => q.score || 0);
        }
      });
    }

    // 更新到分页管理器
    WatchlistPagination.setQuotesListMap(quotesListMap);
    WatchlistPagination.setScoresByOffset(scoresByOffset);

    // 根据当前偏移量选择对应的quote
    const enrichedData = watchlistData.map(item => {
      const quote = WatchlistPagination.getQuoteByOffset(item.stock_code);
      const score = WatchlistPagination.getScoreByOffset(item.stock_code);

      return {
        ...item,
        quote: quote,
        score: score
      };
    });

    return enrichedData;
  } catch (error) {
    logger.error('Failed to fetch batch data:', error);
    // 失败时返回原始数据
    return watchlistData;
  }
}

/**
 * 应用筛选条件
 * @param {Array} data - 数据数组
 * @returns {Array} 筛选后的数据
 */
function applyFilters(data) {
  if (!data || data.length === 0) {
    return data;
  }

  let filtered = [...data];

  // 只看看涨
  if (filterState.bullish) {
    filtered = filtered.filter(item => {
      const direction = item.summary?.direction || item.direction || 'NEUTRAL';
      return direction === 'LONG';
    });
  }

  // 只看看跌
  if (filterState.bearish) {
    filtered = filtered.filter(item => {
      const direction = item.summary?.direction || item.direction || 'NEUTRAL';
      return direction === 'SHORT';
    });
  }

  // 评分≥3
  if (filterState.highScore) {
    filtered = filtered.filter(item => {
      const score = item.score || item.summary?.score || 0;
      return score >= 3;
    });
  }

  return filtered;
}

/**
 * 绑定自选股相关事件
 * @param {Function} globalErrorHandler - 全局错误处理器
 * @param {Function} analyzeStock - 分析股票函数
 */
function bindWatchlistEvents(globalErrorHandler, analyzeStock) {
  // 创建 loadWatchlist 的包装引用
  const reloadWatchlist = () => loadWatchlist(globalErrorHandler, analyzeStock);

  // 调试：检查找到的按钮数量
  const favoriteBtns = DOM.watchlistDiv.querySelectorAll('[data-action="favorite"]');
  const unfavoriteBtns = DOM.watchlistDiv.querySelectorAll('[data-action="unfavorite"]');
  logger.debug(`Binding events: ${favoriteBtns.length} favorite buttons, ${unfavoriteBtns.length} unfavorite buttons`);

  // 删除按钮事件
  const removeButtons = DOM.watchlistDiv.querySelectorAll('[data-action="delete"]');
  removeButtons.forEach(button => {
    button.addEventListener('click', withErrorHandling(async (event) => {
      const code = event.currentTarget.dataset.code;
      if (code) {
        operationLog.action('删除股票', `从关注列表删除: ${code}`);
        const WL = await getWatchlist();
        await WL.removeFromWatchlist(code);
        await reloadWatchlist();
        operationLog.success('删除成功', `已删除 ${code}`);
      }
    }, 'Remove from Watchlist'));
  });

  // 收藏按钮事件
  favoriteBtns.forEach(button => {
    button.addEventListener('click', withErrorHandling(async (event) => {
      const code = event.currentTarget.dataset.code;
      logger.info(`Favorite button clicked for code: ${code}`);
      if (code) {
        operationLog.action('添加到自选股', `股票: ${code}`);
        const WL = await getWatchlist();
        await WL.favoriteStock(code);
        await reloadWatchlist();
        operationLog.success('添加成功', `${code} 已添加到自选股`);
      }
    }, 'Favorite Stock'));
  });

  // 取消收藏按钮事件
  unfavoriteBtns.forEach(button => {
    button.addEventListener('click', withErrorHandling(async (event) => {
      const code = event.currentTarget.dataset.code;
      logger.info(`Unfavorite button clicked for code: ${code}`);
      if (code) {
        operationLog.action('从自选股移除', `股票: ${code}`);
        const WL = await getWatchlist();
        await WL.unfavoriteStock(code);
        await reloadWatchlist();
        operationLog.success('移除成功', `${code} 已从自选股移除`);
      }
    }, 'Unfavorite Stock'));
  });

  // 分析按钮事件
  const analyzeButtons = DOM.watchlistDiv.querySelectorAll('[data-action="analyze"]');
  analyzeButtons.forEach(button => {
    button.addEventListener('click', withErrorHandling(async (event) => {
      const code = event.currentTarget.dataset.code;
      if (code) {
        operationLog.action('分析股票', `开始分析: ${code}`);
        DOM.stockInput.value = code;
        // 读取用户选择的周期
        const timeframe = document.getElementById('timeframe')?.value || 'daily';
        await analyzeStock(code, timeframe);
      }
    }, 'Analyze from Watchlist'));
  });

  // 多周期分析按钮事件
  const multiButtons = DOM.watchlistDiv.querySelectorAll('[data-action="multi"]');
  multiButtons.forEach(button => {
    button.addEventListener('click', withErrorHandling(async (event) => {
      const code = event.currentTarget.dataset.code;
      if (code) {
        operationLog.action('多周期分析', `股票: ${code}, 周期: 30/60/daily/weekly/monthly`);
        DOM.stockInput.value = code;
        // 切换到多周期标签
        switchTab('multi');
        // 触发多周期分析
        setTimeout(async () => {
          const MT = await import('../components/MultiTimeframe.js').then(m => m.MultiTimeframe);
          await MT.loadMultipleTimeframes(code, ['30', '60', 'daily', 'weekly', 'monthly']);
        }, 100);
      }
    }, 'Multi Analyze from Watchlist'));
  });

  // 卡片点击事件（跳转到分析）
  const cards = DOM.watchlistDiv.querySelectorAll('.watchlist-card');
  cards.forEach(card => {
    card.addEventListener('click', withErrorHandling(async (event) => {
      // 如果点击的是按钮或复选框，不触发卡片点击
      if (event.target.tagName === 'BUTTON' || event.target.closest('button') ||
          event.target.type === 'checkbox') {
        return;
      }

      const code = card.dataset.code;
      if (code) {
        operationLog.action('点击卡片', `分析股票: ${code}`);
        DOM.stockInput.value = code;
        // 读取用户选择的周期
        const timeframe = document.getElementById('timeframe')?.value || 'daily';
        await analyzeStock(code, timeframe);
      }
    }, 'Watchlist Card Click'));
  });

  // 批量选择复选框事件
  const checkboxes = DOM.watchlistDiv.querySelectorAll('.watchlist-card-checkbox');
  checkboxes.forEach(checkbox => {
    checkbox.addEventListener('change', withErrorHandling(async (event) => {
      const code = event.target.dataset.code;
      if (code) {
        const WL = await getWatchlist();
        const isSelected = WL.toggleStockSelection(code);

        // 记录选择操作
        const selectedStocks = WL.getSelectedStocks();
        operationLog.action('选择股票', `${isSelected ? '选中' : '取消选中'} ${code}, 当前已选 ${selectedStocks.size} 只`);

        // 更新删除按钮状态
        const batchDeleteBtn = document.getElementById('batch-delete-btn');
        const filterStats = document.getElementById('filter-stats');

        if (batchDeleteBtn) {
          batchDeleteBtn.style.display = selectedStocks.size > 0 ? 'block' : 'none';
        }

        if (filterStats) {
          filterStats.textContent = `已选 ${selectedStocks.size} 只`;
        }
      }
    }, 'Toggle Stock Selection'));
  });

  logger.debug('Watchlist events bound');
}

/**
 * 添加当前股票到自选股
 * @param {Function} globalErrorHandler - 全局错误处理器
 * @param {Function} analyzeStock - 分析股票函数
 */
async function addCurrentToWatchlist(globalErrorHandler, analyzeStock) {
  const currentCode = AppState.currentStock.code;
  if (!currentCode) {
    toast.warning('请先分析一只股票');
    operationLog.warning('添加到自选股', '请先分析一只股票');
    return;
  }

  operationLog.action('添加到自选股', `当前股票: ${currentCode}`);
  const WL = await getWatchlist();
  await WL.addToWatchlist(currentCode);
  await loadWatchlist(globalErrorHandler, analyzeStock);
  operationLog.success('添加成功', `${currentCode} 已添加到自选股`);
}

/**
 * 批量分析自选股
 * @param {Function} globalErrorHandler - 全局错误处理器
 */
async function batchAnalyzeWatchlist(globalErrorHandler) {
  try {
    operationLog.action('批量分析', '开始批量分析自选股');

    const WL = await getWatchlist();
    const watchlistData = await WL.refresh();

    if (watchlistData.length === 0) {
      toast.warning('自选股列表为空');
      operationLog.warning('批量分析', '自选股列表为空');
      return;
    }

    logger.info(`Batch analyzing ${watchlistData.length} stocks...`);

    await WL.batchAnalyze(watchlistData);

    // toast.success(`批量分析完成，共 ${watchlistData.length} 只股票`);
    operationLog.success('批量分析完成', `共 ${watchlistData.length} 只股票`);
  } catch (error) {
    logger.error('Failed to batch analyze watchlist:', error);
    globalErrorHandler(error, 'Batch Analyze Watchlist');
  }
}

export { loadWatchlist, bindWatchlistEvents, addCurrentToWatchlist, batchAnalyzeWatchlist, switchWatchlistTab, initWatchlistGlobalControls };
