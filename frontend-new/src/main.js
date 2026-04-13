/**
 * 主入口文件
 * 负责应用初始化、事件绑定和错误处理
 */

import { logger } from './utils/logger.js';
import { toast, haptic } from './utils/toast.js';
import { handleError, withErrorHandling, withSyncErrorHandling } from './utils/errorHandler.js';
import { initTooltips } from './utils/tooltip.js';
import { stocksApi } from './api/stocks.js';
import { AppConfig, AppState, eventBus, Events, updateState } from './config.js';
import { initViewToggleButtons, showWatchlistPicker } from './utils/uiHelpers.js';
import { operationLog } from './utils/operationLog.js';
import { showZoneLabels, hideZoneLabels, toggleZoneLabels } from './utils/zoneLabels.js';

// Lazy-loaded component getters (loaded on first use)
const Signals = () => import('./components/Signals.js').then(m => m.Signals);
const MultiTimeframe = () => import('./components/MultiTimeframe.js').then(m => m.MultiTimeframe);
const Prediction = () => import('./components/Prediction.js').then(m => m.Prediction);
const Settings = () => import('./components/Settings.js').then(m => m.Settings);
const Health = () => import('./components/Health.js').then(m => m.Health);
const Notifications = () => import('./components/Notifications.js').then(m => m.Notifications);
const RiskManagement = () => import('./components/RiskManagement.js').then(m => m.RiskManagement);
const DataSources = () => import('./components/DataSources.js').then(m => m.DataSources);
const MarketOverview = () => import('./components/MarketOverview.js').then(m => m.MarketOverview);
import { healthApi } from './api/health.js';

// 移动端组件
import BottomNav from './components/BottomNav.js';
import { HealthStatusBar } from './components/HealthStatusBar.js';
import mobileRefresh from './utils/mobileRefresh.js';
import offlineDetector from './utils/offline.js';
import performanceMonitor from './utils/performanceMonitor.js';

// 应用模块
import { initDOM, validateDOM } from './app/dom.js';
import { analyzeStock } from './app/stockAnalysis.js';
import { loadWatchlist, addCurrentToWatchlist, batchAnalyzeWatchlist, initWatchlistGlobalControls } from './app/watchlistManager.js';
import { handleStockAnalyzed } from './app/rendering.js';
import { switchTab, initTheme, toggleTheme, MinimalMode } from './app/ui.js';
import { getViewManager } from './app/viewManager.js';

// ========================================
// 全局错误处理
// ========================================

/**
 * 全局错误处理器
 * @param {Error} error - 错误对象
 * @param {string} context - 错误上下文
 */
function globalErrorHandler(error, context = 'Application') {
  logger.error(`${context} error:`, error);

  // 显示用户友好的错误消息
  toast.error(handleError(error).message);

  // 触发错误事件
  eventBus.emit(Events.ERROR_OCCURRED, { error, context });
}

// 捕获未处理的错误
window.addEventListener('error', (event) => {
  globalErrorHandler(event.error, 'Uncaught Error');
});

// 捕获未处理的 Promise 拒绝
window.addEventListener('unhandledrejection', (event) => {
  globalErrorHandler(event.reason, 'Unhandled Promise Rejection');
});

// ========================================
// 事件绑定
// ========================================

// 搜索历史（全局）
let searchHistory = JSON.parse(localStorage.getItem('wyckoff_search_history') || '[]');

/**
 * 加载数据源管理组件
 */
let dataSourcesLoaded = false;
async function loadDataSources() {
  if (dataSourcesLoaded) {
    return; // 已加载，跳过
  }

  try {
    logger.info('Loading DataSources component...');
    const DS = await DataSources();
    const ds = new DS();
    await ds.render('datasources');
    dataSourcesLoaded = true;
    logger.info('DataSources component loaded');
  } catch (error) {
    logger.error('Failed to load DataSources:', error);
    const datasourcesDiv = document.getElementById('datasources');
    if (datasourcesDiv) {
      const DS = await DataSources();
      datasourcesDiv.innerHTML = DS.generateErrorHTML(error.message);
    }
  }
}

/**
 * 加载行情看板组件
 */
let marketOverviewLoaded = false;
let marketOverviewInstance = null;
async function loadMarketOverview() {
  if (marketOverviewLoaded) {
    return; // 已加载，跳过
  }

  try {
    logger.info('Loading MarketOverview component...');
    const MO = await MarketOverview();
    marketOverviewInstance = new MO();
    await marketOverviewInstance.render('market-overview');
    marketOverviewLoaded = true;
    logger.info('MarketOverview component loaded');
  } catch (error) {
    logger.error('Failed to load MarketOverview:', error);
    const marketDiv = document.getElementById('market-overview');
    if (marketDiv) {
      marketDiv.innerHTML = '<div class="error-state">加载失败</div>';
    }
  }
}

/**
 * 包装 analyzeStock，自动注入 globalErrorHandler
 */
function doAnalyzeStock(stockCode, timeframe = 'daily') {
  // 记录操作日志
  operationLog.action('开始分析', `股票代码: ${stockCode}, 周期: ${timeframe}`);

  // 保存到搜索历史
  if (stockCode && stockCode.trim()) {
    const historyItem = {
      code: stockCode.trim(),
      name: stockCode.trim(), // 这里可以通过API获取真实名称
      fromHistory: true,
      timestamp: Date.now()
    };

    // 更新搜索历史
    searchHistory = searchHistory.filter(item => item.code !== historyItem.code);
    searchHistory.unshift(historyItem);
    searchHistory = searchHistory.slice(0, 10); // 保留最近10条
    localStorage.setItem('wyckoff_search_history', JSON.stringify(searchHistory));
  }

  return analyzeStock(stockCode, globalErrorHandler, timeframe);
}

/**
 * 更新数据刷新时间显示
 */
function updateDataRefreshTime() {
  const refreshTimeEl = document.getElementById('dataRefreshTime');
  if (refreshTimeEl) {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    refreshTimeEl.textContent = `更新 ${timeStr}`;
  }
}

/**
 * 更新头部整体健康状态点
 */
function updateOverallHealth(healthData) {
  const overallDot = document.getElementById('overallStatusDot');
  const overallText = document.getElementById('overallStatusText');

  // 处理错误情况
  if (!healthData || typeof healthData !== 'object') {
    if (overallDot && overallText) {
      overallDot.className = 'health-dot error';
      overallText.textContent = '检查失败';
      overallText.style.color = '#ef4444';
    }
    return;
  }

  // 获取实际的健康状态（API返回 "connected" 表示健康）
  const isHealthy = healthData.status === 'healthy';
  const dbConnected = healthData.database === 'connected';
  const redisConnected = healthData.redis === 'connected';

  if (overallDot && overallText) {
    overallDot.className = 'health-dot';

    if (isHealthy) {
      overallDot.classList.add('healthy');
      overallText.textContent = '正常';
      overallText.style.color = '#10b981';
    } else {
      overallDot.classList.add('error');
      overallText.textContent = '异常';
      overallText.style.color = '#ef4444';
    }
  }

  // 更新数据库状态
  const dbDot = document.getElementById('dbStatusDot');
  const dbText = document.getElementById('dbStatusText');
  if (dbDot && dbText) {
    dbDot.className = 'health-dot';
    if (dbConnected) {
      dbDot.classList.add('healthy');
      dbText.textContent = '正常';
      dbText.style.color = '#10b981';
    } else {
      dbDot.classList.add('error');
      dbText.textContent = healthData.database || '异常';
      dbText.style.color = '#ef4444';
    }
  }

  // 更新Redis状态
  const redisDot = document.getElementById('redisStatusDot');
  const redisText = document.getElementById('redisStatusText');
  if (redisDot && redisText) {
    redisDot.className = 'health-dot';
    if (redisConnected) {
      redisDot.classList.add('healthy');
      redisText.textContent = '正常';
      redisText.style.color = '#10b981';
    } else {
      redisDot.classList.add('error');
      redisText.textContent = healthData.redis || '异常';
      redisText.style.color = '#ef4444';
    }
  }
}

/**
 * 执行多周期分析
 * @param {string} stockCode - 股票代码
 * @param {string} analysisDate - 可选的分析日期 (YYYY-MM-DD)
 */
async function doMultiTimeframeAnalysis(stockCode, analysisDate = '') {
  try {
    logger.info(`Starting multi-timeframe analysis for: ${stockCode}, date: ${analysisDate || 'latest'}`);

    // 切换到多周期Tab
    switchTab('multi');

    // 显示加载状态
    const loadingEl = document.getElementById('mtf-loading');
    const contentEl = document.getElementById('multiTimeframe');

    if (loadingEl) loadingEl.style.display = 'block';
    if (contentEl) contentEl.innerHTML = '';

    // 更新进度
    updateMultiTimeframeProgress(10, '正在准备分析');

    // 导入多周期分析组件
    const { default: MultiTimeframe } = await import('./components/MultiTimeframe.js');

    // 更新进度
    updateMultiTimeframeProgress(30, '正在获取各周期数据');

    // 加载多周期数据
    const timeframes = ['30', '60', 'daily', 'weekly', 'monthly'];
    const multiTimeframeData = await MultiTimeframe.loadMultipleTimeframes(stockCode, timeframes, analysisDate);

    // 更新进度
    updateMultiTimeframeProgress(70, '正在分析数据');

    if (multiTimeframeData && multiTimeframeData.length > 0) {
      logger.info(`Multi-timeframe data loaded: ${multiTimeframeData.length} timeframes`);

      // 更新进度
      updateMultiTimeframeProgress(90, '正在渲染结果');

      const mtfHTML = MultiTimeframe.render(multiTimeframeData);

      if (contentEl) {
        contentEl.innerHTML = mtfHTML;
        logger.info('多周期分析渲染完成');
      }

      // 更新进度
      updateMultiTimeframeProgress(100, '分析完成');

      // toast.success(`多周期分析完成: ${stockCode}${analysisDate ? ` (${analysisDate})` : ''}`);
    } else {
      logger.warn('No multi-timeframe data available');
      if (contentEl) {
        contentEl.innerHTML = MultiTimeframe.generateEmptyStateHTML();
      }
      updateMultiTimeframeProgress(100, '无数据');
      toast.warning('暂无多周期数据');
    }
  } catch (error) {
    logger.error('Multi-timeframe analysis failed:', error);
    const contentEl = document.getElementById('multiTimeframe');
    if (contentEl) {
      contentEl.innerHTML = '<div class="mtf-error">多周期分析加载失败，请稍后重试</div>';
    }
    updateMultiTimeframeProgress(0, '分析失败');
    toast.error(`多周期分析失败: ${error.message}`);
  } finally {
    // 隐藏加载状态
    const loadingEl = document.getElementById('mtf-loading');
    if (loadingEl) {
      setTimeout(() => {
        loadingEl.style.display = 'none';
      }, 500);
    }
  }
}

/**
 * 更新多周期分析进度
 * @param {number} progress - 进度百分比 (0-100)
 * @param {string} step - 当前步骤描述
 */
function updateMultiTimeframeProgress(progress, step) {
  const progressFill = document.getElementById('mtf-progress-fill');
  const stepsContainer = document.getElementById('mtf-loading-steps');

  if (progressFill) {
    progressFill.style.width = `${progress}%`;
  }

  if (stepsContainer) {
    const stepEl = document.createElement('div');
    stepEl.className = 'loading-step active';
    stepEl.textContent = step;
    stepsContainer.appendChild(stepEl);

    // 标记之前的步骤为已完成
    const steps = stepsContainer.querySelectorAll('.loading-step');
    for (let i = 0; i < steps.length - 1; i++) {
      steps[i].classList.remove('active');
      steps[i].classList.add('completed');
    }
  }
}

/**
 * 加载股票的交易日期列表
 * @param {string} code - 股票代码
 */
async function loadTradingDates(code) {
  if (!code || code.length < 6) {
    return;
  }

  const dateSelect = document.getElementById('mtf-analysis-date');
  if (!dateSelect) return;

  dateSelect.innerHTML = '<option value="loading">加载中...</option>';

  try {
    // 获取最近100个交易日的日期
    const response = await fetch(`/api/v1/stocks/${code}/quotes?timeframe=daily&limit=100`);
    const data = await response.json();

    if (data.data && data.data.quotes && data.data.quotes.length > 0) {
      // 提取日期，最新的在前
      const dates = data.data.quotes
        .map(q => q.date ? q.date.split(' ')[0] : '')
        .filter(d => d)
        .reverse();

      // 构建选项
      let html = '<option value="">最新数据</option>';
      dates.forEach(date => {
        html += `<option value="${date}">${date}</option>`;
      });

      dateSelect.innerHTML = html;
      logger.info(`Loaded ${dates.length} trading dates for ${code}`);
    } else {
      dateSelect.innerHTML = '<option value="">无历史数据</option>';
    }
  } catch (error) {
    logger.error('Failed to load trading dates:', error);
    dateSelect.innerHTML = '<option value="">加载失败</option>';
  }
}

/**
 * 绑定事件监听器
 */
function bindEvents() {
  // 分析按钮点击事件
  document.getElementById('analyze-btn').addEventListener('click', withErrorHandling(async (event) => {
    haptic.medium();
    const stockCode = document.getElementById('stock-code').value;
    const timeframe = document.getElementById('timeframe')?.value || 'daily';
    await doAnalyzeStock(stockCode, timeframe);
  }, 'Analyze Button'));

  // 股票输入框回车事件
  document.getElementById('stock-code').addEventListener('keypress', withSyncErrorHandling((event) => {
    if (event.key === 'Enter') {
      const stockCode = document.getElementById('stock-code').value;
      const timeframe = document.getElementById('timeframe')?.value || 'daily';
      doAnalyzeStock(stockCode, timeframe);
    }
  }, 'Stock Input'));

  // 多周期分析按钮点击事件
  const mtfAnalyzeBtn = document.getElementById('mtf-analyze-btn');
  if (mtfAnalyzeBtn) {
    mtfAnalyzeBtn.addEventListener('click', withErrorHandling(async (event) => {
      const stockCode = document.getElementById('mtf-stock-code').value;
      const analysisDate = document.getElementById('mtf-analysis-date')?.value || '';
      if (stockCode) {
        await doMultiTimeframeAnalysis(stockCode, analysisDate);
      } else {
        toast.error('请输入股票代码');
      }
    }, 'Multi-Timeframe Analyze Button'));
  }

  // 多周期输入框回车事件
  const mtfStockInput = document.getElementById('mtf-stock-code');
  if (mtfStockInput) {
    mtfStockInput.addEventListener('keypress', withSyncErrorHandling((event) => {
      if (event.key === 'Enter') {
        const stockCode = event.target.value;
        const analysisDate = document.getElementById('mtf-analysis-date')?.value || '';
        if (stockCode) {
          doMultiTimeframeAnalysis(stockCode, analysisDate);
        }
      }
    }, 'Multi-Timeframe Stock Input'));

    // 输入框变化时加载日期选择器（防抖）
    let loadDateTimeout;
    mtfStockInput.addEventListener('input', (event) => {
      clearTimeout(loadDateTimeout);
      const code = event.target.value.trim();
      if (code.length >= 6) {
        loadDateTimeout = setTimeout(() => {
          loadTradingDates(code);
        }, 500);
      }
    });
  }

  // 多周期日期选择器变化事件
  const mtfDateSelect = document.getElementById('mtf-analysis-date');
  if (mtfDateSelect) {
    mtfDateSelect.addEventListener('change', withSyncErrorHandling((event) => {
      const stockCode = document.getElementById('mtf-stock-code').value;
      const analysisDate = event.target.value || '';
      if (stockCode) {
        doMultiTimeframeAnalysis(stockCode, analysisDate);
      }
    }, 'Multi-Timeframe Date Select'));
  }

  // 多周期清空按钮
  const mtfClearBtn = document.getElementById('mtf-clear-btn');
  if (mtfClearBtn) {
    mtfClearBtn.addEventListener('click', withSyncErrorHandling(() => {
      document.getElementById('mtf-stock-code').value = '';
      document.getElementById('mtf-analysis-date').innerHTML = '<option value="">最新数据</option>';
      document.getElementById('multiTimeframe').innerHTML = '';
      document.getElementById('mtf-loading').style.display = 'none';
      const mtfDiv = document.getElementById('multiTimeframe');
      if (mtfDiv) {
        mtfDiv.innerHTML = '<div class="mtf-empty">请输入股票代码进行多周期分析</div>';
      }
    }, 'Multi-Timeframe Clear Button'));
  }

  // 监听股票分析完成事件
  eventBus.on(Events.STOCK_ANALYZED, handleStockAnalyzed);

  // 标签页切换
  const tabNav = document.querySelector('.tab-nav');
  if (tabNav) {
    tabNav.addEventListener('click', withSyncErrorHandling((event) => {
      const btn = event.target.closest('.tab-btn');
      if (!btn) return;

      const tabName = btn.dataset.tab;
      switchTab(tabName);
    }, 'Tab Switch'));
  }

  // 清空按钮
  const clearBtn = document.getElementById('clear-btn');
  if (clearBtn) {
    clearBtn.addEventListener('click', withSyncErrorHandling(() => {
      haptic.light();
      document.getElementById('stock-code').value = '';
      const klineTable = document.getElementById('klineTable');
      if (klineTable) {
        klineTable.innerHTML = '';
      }
      const analyzeResult = document.getElementById('analyzeResult');
      if (analyzeResult) {
        analyzeResult.innerHTML = '';
      }
      // 清空图表
      if (AppState.charts.main) {
        AppState.charts.main.dispose();
        AppState.charts.main = null;
      }
      if (AppState.charts.volume) {
        AppState.charts.volume.dispose();
        AppState.charts.volume = null;
      }
      // 清空虚拟滚动
      if (AppState.virtualScroll) {
        AppState.virtualScroll.destroy();
        AppState.virtualScroll = null;
      }
    }, 'Clear Button'));
  }

  // 搜索建议功能
  const stockInput = document.getElementById('stock-code');

  function updateSearchSuggestions(query) {
    // 暂时禁用搜索建议，后续可以添加
  }

  // 输入框输入事件（暂时禁用搜索建议）
  stockInput.addEventListener('input', (e) => {
    // updateSearchSuggestions(e.target.value);
  });

  // 初始化视图切换按钮
  initViewToggleButtons();

  // 关注列表选择按钮（日分析页面）
  const watchlistPickerBtn = document.getElementById('watchlist-picker-btn');
  if (watchlistPickerBtn) {
    watchlistPickerBtn.addEventListener('click', () => {
      showWatchlistPicker('stock-code', (code) => {
        document.getElementById('stock-code').value = code;
      });
    });
  }

  // 关注列表选择按钮（多周期页面）
  const mtfWatchlistPickerBtn = document.getElementById('mtf-watchlist-picker-btn');
  if (mtfWatchlistPickerBtn) {
    mtfWatchlistPickerBtn.addEventListener('click', () => {
      showWatchlistPicker('mtf-stock-code', (code) => {
        document.getElementById('mtf-stock-code').value = code;
      });
    });
  }

  // 加入自选按钮
  const addWatchlistBtn = document.getElementById('add-watchlist-btn');
  if (addWatchlistBtn) {
    addWatchlistBtn.addEventListener('click', withErrorHandling(async () => {
      haptic.success();
      await addCurrentToWatchlist(globalErrorHandler, doAnalyzeStock);
    }, 'Add to Watchlist'));
  }

  // 关注列表子标签切换
  const subtabFavorite = document.getElementById('subtab-favorite');
  const subtabBrowse = document.getElementById('subtab-browse');

  if (subtabFavorite) {
    subtabFavorite.addEventListener('click', withErrorHandling(async () => {
      const { switchWatchlistTab } = await import('./app/watchlistManager.js');
      await switchWatchlistTab('favorite', globalErrorHandler, doAnalyzeStock);
    }, 'Switch to Favorite'));
  }

  if (subtabBrowse) {
    subtabBrowse.addEventListener('click', withErrorHandling(async () => {
      const { switchWatchlistTab } = await import('./app/watchlistManager.js');
      await switchWatchlistTab('browse', globalErrorHandler, doAnalyzeStock);
    }, 'Switch to Browse'));
  }

  // 批量分析按钮
  const batchAnalyzeBtn = document.getElementById('batch-analyze-btn');
  if (batchAnalyzeBtn) {
    batchAnalyzeBtn.addEventListener('click', withErrorHandling(async () => {
      haptic.medium();
      await batchAnalyzeWatchlist(globalErrorHandler);
    }, 'Batch Analyze'));
  }

  // 刷新关注列表按钮
  const refreshWatchlistBtn = document.getElementById('refresh-watchlist-btn');
  if (refreshWatchlistBtn) {
    refreshWatchlistBtn.addEventListener('click', withErrorHandling(async () => {
      await loadWatchlist(globalErrorHandler, doAnalyzeStock);
    }, 'Refresh Watchlist'));
  }

  // 视图切换按钮
  const viewModeCard = document.getElementById('viewMode-card');
  const viewModeTable = document.getElementById('viewMode-table');

  async function handleViewModeChange(viewMode) {
    const { Watchlist } = await import('./components/Watchlist.js');
    Watchlist.setViewMode(viewMode);

    // 更新按钮样式
    if (viewMode === 'card') {
      viewModeCard.style.background = 'linear-gradient(135deg, #3b82f6, #8b5cf6)';
      viewModeTable.style.background = '#374151';
    } else {
      viewModeTable.style.background = 'linear-gradient(135deg, #3b82f6, #8b5cf6)';
      viewModeCard.style.background = '#374151';
    }

    // 显示/隐藏排序和批量选择控件（仅卡片视图显示）
    const cardViewSortControls = document.getElementById('card-view-sort-controls');
    const cardViewBatchControls = document.getElementById('card-view-batch-controls');

    if (viewMode === 'card') {
      if (cardViewSortControls) cardViewSortControls.style.display = 'flex';
      if (cardViewBatchControls) cardViewBatchControls.style.display = 'flex';
    } else {
      if (cardViewSortControls) cardViewSortControls.style.display = 'none';
      if (cardViewBatchControls) cardViewBatchControls.style.display = 'none';
    }

    // 重新加载关注列表
    await loadWatchlist(globalErrorHandler, doAnalyzeStock);
  }

  // 初始化按钮状态
  if (viewModeCard && viewModeTable) {
    (async () => {
      const { Watchlist } = await import('./components/Watchlist.js');
      const currentViewMode = Watchlist.getViewMode();

      if (currentViewMode === 'card') {
        viewModeCard.style.background = 'linear-gradient(135deg, #3b82f6, #8b5cf6)';
        viewModeTable.style.background = '#374151';
      } else {
        viewModeTable.style.background = 'linear-gradient(135deg, #3b82f6, #8b5cf6)';
        viewModeCard.style.background = '#374151';
      }
    })();

    viewModeCard.addEventListener('click', withErrorHandling(async () => {
      await handleViewModeChange('card');
    }, 'Switch to Card View'));

    viewModeTable.addEventListener('click', withErrorHandling(async () => {
      await handleViewModeChange('table');
    }, 'Switch to Table View'));
  }

  // 批量导入按钮
  const batchImportToggleBtn = document.getElementById('batch-import-toggle-btn');
  const batchImportArea = document.getElementById('batch-import-area');
  const batchImportCloseBtn = document.getElementById('batch-import-close-btn');
  const batchImportPreviewBtn = document.getElementById('batch-import-preview-btn');
  const batchImportClearBtn = document.getElementById('batch-import-clear-btn');
  const batchImportConfirmBtn = document.getElementById('batch-import-confirm-btn');

  if (batchImportToggleBtn && batchImportArea) {
    batchImportToggleBtn.addEventListener('click', () => {
      batchImportArea.style.display = batchImportArea.style.display === 'none' ? 'block' : 'none';
    });
  }

  if (batchImportCloseBtn && batchImportArea) {
    batchImportCloseBtn.addEventListener('click', () => {
      batchImportArea.style.display = 'none';
    });
  }

  if (batchImportClearBtn) {
    const batchImportText = document.getElementById('batch-import-text');
    if (batchImportText) {
      batchImportClearBtn.addEventListener('click', () => {
        batchImportText.value = '';
        document.getElementById('batch-import-preview').style.display = 'none';
      });
    }
  }

  if (batchImportPreviewBtn) {
    batchImportPreviewBtn.addEventListener('click', withErrorHandling(async () => {
      const batchImportText = document.getElementById('batch-import-text');
      const previewDiv = document.getElementById('batch-import-preview');
      const previewList = document.getElementById('batch-import-preview-list');

      if (!batchImportText || !previewDiv || !previewList) return;

      const text = batchImportText.value;
      // 提取6位数字作为股票代码
      const stockCodes = text.match(/\b\d{6}\b/g) || [];
      // 去重
      const uniqueCodes = [...new Set(stockCodes)];

      if (uniqueCodes.length === 0) {
        toast.warning('未识别到股票代码');
        return;
      }

      previewList.innerHTML = uniqueCodes.map(code =>
        `<span style="padding: 4px 8px; background: #374151; border-radius: 4px; font-size: 12px; color: #10b981;">${code}</span>`
      ).join('');
      previewDiv.style.display = 'block';
    }, 'Preview Batch Import'));
  }

  if (batchImportConfirmBtn) {
    batchImportConfirmBtn.addEventListener('click', withErrorHandling(async () => {
      const batchImportText = document.getElementById('batch-import-text');
      if (!batchImportText) return;

      const text = batchImportText.value;
      const stockCodes = text.match(/\b\d{6}\b/g) || [];
      const uniqueCodes = [...new Set(stockCodes)];

      if (uniqueCodes.length === 0) {
        toast.warning('没有要导入的股票代码');
        return;
      }

      const { Watchlist } = await import('./components/Watchlist.js');

      for (const code of uniqueCodes) {
        await Watchlist.addToWatchlist(code);
      }

      toast.success(`已导入 ${uniqueCodes.length} 只股票`);

      // 清空并关闭
      batchImportText.value = '';
      document.getElementById('batch-import-preview').style.display = 'none';
      document.getElementById('batch-import-area').style.display = 'none';

      // 刷新列表
      await loadWatchlist(globalErrorHandler, doAnalyzeStock);
    }, 'Confirm Batch Import'));
  }

  // 清缓存按钮
  const clearCacheBtn = document.getElementById('clear-cache-btn');
  if (clearCacheBtn) {
    clearCacheBtn.addEventListener('click', withErrorHandling(async () => {
      const apiCache = (await import('./utils/cache.js')).apiCache;
      apiCache.clear();
      localStorage.clear(); // 同时清空localStorage
      sessionStorage.clear(); // 同时清空sessionStorage
      toast.success('缓存已清空');
      await loadWatchlist(globalErrorHandler, doAnalyzeStock);
    }, 'Clear Cache'));
  }

  // 排序选择器
  const sortSelect = document.getElementById('watchlist-sort-select');
  if (sortSelect) {
    sortSelect.addEventListener('change', withErrorHandling(async (e) => {
      const sortValue = e.target.value;
      const { Watchlist } = await import('./components/Watchlist.js');
      Watchlist.setSortMode(sortValue);
      await loadWatchlist(globalErrorHandler, doAnalyzeStock);
    }, 'Sort Watchlist'));
  }

  // 批量选择按钮
  const batchSelectToggleBtn = document.getElementById('batch-select-toggle-btn');
  const batchDeleteBtn = document.getElementById('batch-delete-btn');
  let batchSelectMode = false;
  let selectedStocks = new Set();

  if (batchSelectToggleBtn) {
    batchSelectToggleBtn.addEventListener('click', withErrorHandling(() => {
      batchSelectMode = !batchSelectMode;
      selectedStocks.clear();

      // 更新按钮状态
      batchSelectToggleBtn.textContent = batchSelectMode ? '✓ 完成选择' : '☑️ 批量选择';
      batchSelectToggleBtn.style.background = batchSelectMode ? '#10b981' : '#8b5cf6';

      // 显示/隐藏删除按钮
      if (batchDeleteBtn) {
        batchDeleteBtn.style.display = 'none';
      }

      // 更新统计
      const filterStats = document.getElementById('filter-stats');
      if (filterStats) {
        filterStats.textContent = batchSelectMode ? '已选 0 只' : '';
      }

      // 刷新列表以更新选择框显示
      loadWatchlist(globalErrorHandler, doAnalyzeStock);
    }, 'Toggle Batch Select'));
  }

  if (batchDeleteBtn) {
    batchDeleteBtn.addEventListener('click', withErrorHandling(async () => {
      if (selectedStocks.size === 0) {
        toast.warning('请先选择要删除的股票');
        return;
      }

      if (!confirm(`确定要删除 ${selectedStocks.size} 只股票吗？`)) {
        return;
      }

      const { Watchlist } = await import('./components/Watchlist.js');

      for (const code of selectedStocks) {
        await Watchlist.removeFromWatchlist(code);
      }

      toast.success(`已删除 ${selectedStocks.size} 只股票`);
      selectedStocks.clear();

      // 退出批量选择模式
      batchSelectMode = false;
      batchSelectToggleBtn.textContent = '☑️ 批量选择';
      batchSelectToggleBtn.style.background = '#8b5cf6';
      batchDeleteBtn.style.display = 'none';

      const filterStats = document.getElementById('filter-stats');
      if (filterStats) {
        filterStats.textContent = '';
      }

      await loadWatchlist(globalErrorHandler, doAnalyzeStock);
    }, 'Batch Delete Stocks'));
  }

  // 监听错误事件
  eventBus.on(Events.ERROR_OCCURRED, ({ error, context }) => {
    logger.error(`Error event received from ${context}:`, error);
  });

  // 监听自选股变更事件
  eventBus.on('WATCHLIST_CHANGED', async () => {
    logger.info('Watchlist changed event received');
    await loadWatchlist(globalErrorHandler, doAnalyzeStock);
  });

  // 监听翻页变更事件
  eventBus.on('WATCHLIST_PAGE_CHANGED', async () => {
    logger.info('Watchlist page changed event received');
    await loadWatchlist(globalErrorHandler, doAnalyzeStock);
  });

  // 监听周期切换事件
  eventBus.on('WATCHLIST_TIMEFRAME_CHANGED', async () => {
    logger.info('Watchlist timeframe changed event received');
    await loadWatchlist(globalErrorHandler, doAnalyzeStock);
  });

  // 监听视图切换事件
  eventBus.on('WATCHLIST_VIEW_CHANGED', async () => {
    logger.info('Watchlist view changed event received');
    await loadWatchlist(globalErrorHandler, doAnalyzeStock);
  });

  // 监听hash变化更新底部导航（移动端）
  window.addEventListener('hashchange', () => {
    if (window.innerWidth <= 768) {
      BottomNav.updateFromHash();
    }
  });

  // 移动端刷新事件监听
  eventBus.on('mobile:refresh:watchlist', async () => {
    await loadWatchlist(globalErrorHandler, doAnalyzeStock);
  });

  eventBus.on('mobile:refresh:chart', async () => {
    const stockCode = document.getElementById('stock-code').value;
    if (stockCode) {
      await doAnalyzeStock(stockCode);
    }
  });

  logger.debug('Event listeners bound');
}

// ========================================
// 应用初始化
// ========================================

/**
 * 初始化应用
 */
async function initApp() {
  try {
    logger.info('Initializing Wyckoff Stock Analyzer...');
    operationLog.system('应用启动', '正在初始化...');

    // 性能监控开始
    performanceMonitor.mark('app-init-start');

    // 初始化离线检测
    offlineDetector.init();

    // 初始化 DOM
    initDOM();
    validateDOM();

    // 初始化关注列表全局控件（必须在 loadWatchlist 之前调用）
    initWatchlistGlobalControls(globalErrorHandler, doAnalyzeStock);

    // 初始化视图管理器
    getViewManager().init();

    // 初始化主题
    initTheme();

    // 初始化移动端组件
    if (window.innerWidth <= 768) {
      logger.info('Initializing mobile components...');

      // 初始化顶部状态栏
      try {
        const healthStatusBar = new HealthStatusBar();
        healthStatusBar.render();
        logger.info('Mobile health status bar initialized');
      } catch (error) {
        logger.warn('Failed to initialize mobile health status bar:', error);
      }

      // 初始化底部导航
      try {
        BottomNav.render();
        BottomNav.updateFromHash();
        logger.info('Mobile bottom navigation initialized');
      } catch (error) {
        logger.warn('Failed to initialize mobile bottom navigation:', error);
      }

      // 初始化移动端刷新功能
      logger.info('Initializing mobile refresh features...');

      // 为各页面添加刷新按钮
      setTimeout(() => {
        // 关注列表刷新按钮
        const watchlistHeader = document.querySelector('#tab-watchlist');
        if (watchlistHeader) {
          const refreshBtn = mobileRefresh.createRefreshButton('watchlist');
          watchlistHeader.parentNode.insertBefore(refreshBtn, watchlistHeader);
        }

        // 分析页面刷新按钮
        const chartSection = document.querySelector('#tab-analyze');
        if (chartSection) {
          const refreshBtn = mobileRefresh.createRefreshButton('chart');
          chartSection.parentNode.insertBefore(refreshBtn, chartSection);
        }

        logger.info('Mobile refresh features initialized');
      }, 1000);
    }

    // 极简模式现在是默认样式，不需要单独初始化
    // MinimalMode.init();

    // 初始化tooltip提示系统
    initTooltips();

    // 绑定事件
    bindEvents();

    // 加载自选股列表
    try {
      await loadWatchlist(globalErrorHandler, doAnalyzeStock);
    } catch (error) {
      logger.warn('Failed to load watchlist:', error);
      operationLog.warning('关注列表', `加载失败: ${error.message}`);
    }

    // 加载系统设置
    try {
      const S = await Settings();
      const settings = await S.load();
      S.render('settings', settings);
      logger.info('Settings loaded successfully');

      // 移动端：添加清缓存功能到设置页面
      if (window.innerWidth <= 768) {
        const settingsDiv = document.getElementById('settings');
        if (settingsDiv) {
          const clearCacheBtn = document.createElement('button');
          clearCacheBtn.className = 'btn btn-secondary';
          clearCacheBtn.textContent = '清空缓存';
          clearCacheBtn.style.marginTop = '16px';

          clearCacheBtn.addEventListener('click', async () => {
            if (confirm('确定要清空所有缓存吗？')) {
              // 清除应用缓存
              localStorage.clear();
              sessionStorage.clear();

              // 清除Service Worker缓存
              if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
                navigator.serviceWorker.controller.postMessage({
                  type: 'CLEAR_CACHE'
                });
              }

              // 清除API缓存
              const { apiCache } = await import('./utils/cache.js');
              apiCache.clear();

              toast.success('缓存已清空，正在刷新...');
              setTimeout(() => {
                window.location.reload();
              }, 1000);
            }
          });

          settingsDiv.appendChild(clearCacheBtn);
        }
      }
    } catch (error) {
      logger.warn('Failed to load settings, using defaults:', error);
      const S = await Settings();
      const defaultSettings = S.getDefaultSettings();
      S.render('settings', defaultSettings);
    }

    // 加载健康检查状态
    try {
      const healthData = await healthApi.getHealthStatus();

      // 更新头部整体健康状态点
      updateOverallHealth(healthData);

      // 尝试获取测试状态（可能不支持）
      let testData = null;
      try {
        testData = await healthApi.getTestStatus();
      } catch (e) {
        logger.debug('Test status not available:', e.message);
      }

      const H = await Health();
      H.render('health', healthData, testData || null);
      logger.info('Health status loaded successfully');
      operationLog.success('健康检查', `系统: ${healthData.status}, 数据库: ${healthData.database}`);
    } catch (error) {
      logger.warn('Failed to load health status:', error);
      operationLog.warning('健康检查', `加载失败: ${error.message}`);
      const healthDiv = document.getElementById('health');
      if (healthDiv) {
        const H = await Health();
        healthDiv.innerHTML = H.generateErrorHTML(error.message);
        H.bindEvents();
      }
    }

    // 加载飞书通知配置
    try {
      const N = await Notifications();
      await N.render('notifications');
      logger.info('Notifications loaded successfully');
    } catch (error) {
      logger.warn('Failed to load notifications:', error);
      const notificationsDiv = document.getElementById('notifications');
      if (notificationsDiv) {
        const N = await Notifications();
        notificationsDiv.innerHTML = N.generateErrorHTML(error.message);
        N.bindEvents();
      }
    }

    // 加载风险管理配置
    try {
      const RM = await RiskManagement();
      await RM.render('risk');
      logger.info('RiskManagement loaded successfully');
    } catch (error) {
      logger.warn('Failed to load risk management:', error);
      const riskDiv = document.getElementById('risk');
      if (riskDiv) {
        const RM = await RiskManagement();
        riskDiv.innerHTML = RM.generateErrorHTML(error.message);
        RM.bindEvents();
      }
    }

    // 加载数据源管理（懒加载，切换到数据源标签时才加载）
    logger.debug('DataSources will be loaded on demand');

    // 设置默认股票代码（如果有）

    // 设置默认股票代码（如果有）
    if (AppConfig.DEFAULTS.STOCK.CODE) {
      document.getElementById('stock-code').value = AppConfig.DEFAULTS.STOCK.CODE;
    }

    logger.info('Application initialized successfully');

    // 性能监控结束
    performanceMonitor.mark('app-init-end');
    performanceMonitor.measure('app-init', 'app-init-start', 'app-init-end');

    // 记录首屏时间
    setTimeout(() => {
      const fcp = performanceMonitor.getFirstPaint();
      if (fcp) {
        logger.info(`First Contentful Paint: ${fcp.toFixed(2)}ms`);
      }
    }, 0);

  } catch (error) {
    logger.error('Failed to initialize application:', error);
    globalErrorHandler(error, 'Application Initialization');
  }
}

/**
 * 启动应用
 */
function startApp() {
  logger.info('Starting Wyckoff Stock Analyzer...');

  // 等待 DOM 加载完成
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
  } else {
    initApp();
  }
}

// ========================================
// 键盘快捷键
// ========================================

/**
 * 设置键盘快捷键
 */
function setupKeyboardShortcuts() {
  document.addEventListener('keydown', (event) => {
    // Ctrl/Cmd + Shift + Z: 切换区域编号显示
    if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'Z') {
      event.preventDefault();
      const isVisible = toggleZoneLabels();
      toast.info(isVisible ? '区域编号已显示 (Ctrl+Shift+Z 隐藏)' : '区域编号已隐藏 (Ctrl+Shift+Z 显示)');
      operationLog.action('区域编号', isVisible ? '显示' : '隐藏');
    }
  });

  logger.info('Keyboard shortcuts initialized (Ctrl+Shift+Z: 切换区域编号)');
}

// 设置键盘快捷键
setupKeyboardShortcuts();

// ========================================
// 暴露全局 API（用于调试）
// ========================================

if (AppConfig.DEBUG) {
  window.WyckoffApp = {
    analyzeStock: doAnalyzeStock,
    toggleTheme,
    MinimalMode,
    loadWatchlist: () => loadWatchlist(globalErrorHandler, doAnalyzeStock),
    addCurrentToWatchlist: () => addCurrentToWatchlist(globalErrorHandler, doAnalyzeStock),
    batchAnalyzeWatchlist: () => batchAnalyzeWatchlist(globalErrorHandler),
    loadSignals: async (code) => (await Signals()).loadSignals(code),
    loadMultiTimeframe: async (code) => (await MultiTimeframe()).loadMultipleTimeframes(code),
    loadPrediction: async (quotes, summary) => (await Prediction()).predictFutureCandles(quotes, summary),
    zoneLabels: { show: showZoneLabels, hide: hideZoneLabels, toggle: toggleZoneLabels },
    eventBus,
    AppState,
    AppConfig,
    logger,
    operationLog
  };

  logger.debug('Debug API exposed to window.WyckoffApp');
}

// ========================================
// 启动应用
// ========================================

startApp();

// 导出主要函数供测试使用
export {
  doAnalyzeStock as analyzeStock,
  toggleTheme,
  loadWatchlist as _loadWatchlist,
  addCurrentToWatchlist as _addCurrentToWatchlist,
  batchAnalyzeWatchlist as _batchAnalyzeWatchlist,
  initApp,
  startApp
};
