/**
 * 自选股管理模块
 * 负责自选股的加载、绑定事件和批量分析
 */

import { logger } from '../utils/logger.js';
import { toast } from '../utils/toast.js';
import { withErrorHandling } from '../utils/errorHandler.js';
import { AppState } from '../config.js';
import { DOM } from './dom.js';
import { switchTab } from './ui.js';

// Lazy-loaded Watchlist component
const getWatchlist = () => import('../components/Watchlist.js').then(m => m.Watchlist);

// 当前关注的子标签：favorite=自选股, browse=浏览股
let currentWatchlistTab = 'favorite';

/**
 * 切换关注列表子标签
 * @param {string} tab - 子标签 (favorite | browse)
 * @param {Function} globalErrorHandler - 全局错误处理器
 * @param {Function} analyzeStock - 分析股票函数
 */
async function switchWatchlistTab(tab, globalErrorHandler, analyzeStock) {
  currentWatchlistTab = tab;
  logger.info(`Switching watchlist tab to: ${tab}`);

  // 更新按钮样式
  const favoriteBtn = document.getElementById('subtab-favorite');
  const browseBtn = document.getElementById('subtab-browse');

  if (favoriteBtn && browseBtn) {
    if (tab === 'favorite') {
      favoriteBtn.classList.add('active');
      browseBtn.classList.remove('active');
    } else {
      browseBtn.classList.add('active');
      favoriteBtn.classList.remove('active');
    }
  }

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

    const WL = await getWatchlist();
    const watchlistData = await WL.refresh(currentWatchlistTab);

    // 渲染自选股
    if (DOM.watchlistDiv) {
      let html = '<div class="watchlist-header">';
      html += '<h3>我的关注</h3>';

      // 子标签切换
      const favoriteActive = currentWatchlistTab === 'favorite' ? ' active' : '';
      const browseActive = currentWatchlistTab === 'browse' ? ' active' : '';
      html += '<div class="watchlist-tabs">';
      html += `<button class="watchlist-tab${favoriteActive}" id="subtab-favorite" data-tab="favorite">自选股</button>`;
      html += `<button class="watchlist-tab${browseActive}" id="subtab-browse" data-tab="browse">浏览股</button>`;
      html += '</div>';

      // 操作按钮
      html += '<div class="watchlist-actions">';
      html += `<button class="btn-secondary" id="wl-refresh">🔄 刷新</button>`;
      html += `<button class="btn-secondary" id="wl-batch">⚡ 批量分析</button>`;
      html += `<span class="watchlist-count">${watchlistData.length} 只</span>`;
      html += '</div></div>';

      html += WL.render(watchlistData, currentWatchlistTab);
      DOM.watchlistDiv.innerHTML = html;

      // 绑定子标签切换事件
      const favoriteBtn = document.getElementById('subtab-favorite');
      const browseBtn = document.getElementById('subtab-browse');

      if (favoriteBtn) {
        favoriteBtn.addEventListener('click', () => switchWatchlistTab('favorite', globalErrorHandler, analyzeStock));
      }
      if (browseBtn) {
        browseBtn.addEventListener('click', () => switchWatchlistTab('browse', globalErrorHandler, analyzeStock));
      }

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
 * 绑定自选股相关事件
 * @param {Function} globalErrorHandler - 全局错误处理器
 * @param {Function} analyzeStock - 分析股票函数
 */
function bindWatchlistEvents(globalErrorHandler, analyzeStock) {
  // 创建 loadWatchlist 的包装引用
  const reloadWatchlist = () => loadWatchlist(globalErrorHandler, analyzeStock);

  // 删除按钮事件
  const removeButtons = DOM.watchlistDiv.querySelectorAll('[data-action="delete"]');
  removeButtons.forEach(button => {
    button.addEventListener('click', withErrorHandling(async (event) => {
      const code = event.target.dataset.code;
      if (code) {
        const WL = await getWatchlist();
        await WL.removeFromWatchlist(code);
        await reloadWatchlist();
      }
    }, 'Remove from Watchlist'));
  });

  // 收藏按钮事件
  const favoriteButtons = DOM.watchlistDiv.querySelectorAll('[data-action="favorite"]');
  favoriteButtons.forEach(button => {
    button.addEventListener('click', withErrorHandling(async (event) => {
      const code = event.target.dataset.code;
      if (code) {
        const WL = await getWatchlist();
        await WL.favoriteStock(code);
        await reloadWatchlist();
      }
    }, 'Favorite Stock'));
  });

  // 取消收藏按钮事件
  const unfavoriteButtons = DOM.watchlistDiv.querySelectorAll('[data-action="unfavorite"]');
  unfavoriteButtons.forEach(button => {
    button.addEventListener('click', withErrorHandling(async (event) => {
      const code = event.target.dataset.code;
      if (code) {
        const WL = await getWatchlist();
        await WL.unfavoriteStock(code);
        await reloadWatchlist();
      }
    }, 'Unfavorite Stock'));
  });

  // 分析按钮事件
  const analyzeButtons = DOM.watchlistDiv.querySelectorAll('[data-action="analyze"]');
  analyzeButtons.forEach(button => {
    button.addEventListener('click', withErrorHandling(async (event) => {
      const code = event.target.dataset.code;
      if (code) {
        DOM.stockInput.value = code;
        await analyzeStock(code);
      }
    }, 'Analyze from Watchlist'));
  });

  // 多周期分析按钮事件
  const multiButtons = DOM.watchlistDiv.querySelectorAll('[data-action="multi"]');
  multiButtons.forEach(button => {
    button.addEventListener('click', withErrorHandling(async (event) => {
      const code = event.target.dataset.code;
      if (code) {
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
      // 如果点击的是按钮，不触发卡片点击
      if (event.target.tagName === 'BUTTON' || event.target.closest('button')) {
        return;
      }

      const code = card.dataset.code;
      if (code) {
        DOM.stockInput.value = code;
        await analyzeStock(code);
      }
    }, 'Watchlist Card Click'));
  });

  // 刷新按钮
  const refreshBtn = document.getElementById('wl-refresh');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => reloadWatchlist());
  }

  // 批量分析按钮
  const batchBtn = document.getElementById('wl-batch');
  if (batchBtn) {
    batchBtn.addEventListener('click', () => batchAnalyzeWatchlist(globalErrorHandler));
  }

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
    return;
  }

  const WL = await getWatchlist();
  await WL.addToWatchlist(currentCode);
  await loadWatchlist(globalErrorHandler, analyzeStock);
}

/**
 * 批量分析自选股
 * @param {Function} globalErrorHandler - 全局错误处理器
 */
async function batchAnalyzeWatchlist(globalErrorHandler) {
  try {
    const WL = await getWatchlist();
    const watchlistData = await WL.refresh();

    if (watchlistData.length === 0) {
      toast.warning('自选股列表为空');
      return;
    }

    logger.info(`Batch analyzing ${watchlistData.length} stocks...`);

    await WL.batchAnalyze(watchlistData);

    toast.success(`批量分析完成，共 ${watchlistData.length} 只股票`);
  } catch (error) {
    logger.error('Failed to batch analyze watchlist:', error);
    globalErrorHandler(error, 'Batch Analyze Watchlist');
  }
}

export { loadWatchlist, bindWatchlistEvents, addCurrentToWatchlist, batchAnalyzeWatchlist, switchWatchlistTab };
