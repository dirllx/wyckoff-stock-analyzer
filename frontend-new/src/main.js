/**
 * 主入口文件
 * 负责应用初始化、事件绑定和错误处理
 */

import { logger } from './utils/logger.js';
import { toast } from './utils/toast.js';
import { handleError, withErrorHandling, withSyncErrorHandling } from './utils/errorHandler.js';
import { stocksApi } from './api/stocks.js';
import { AppConfig, AppState, eventBus, Events, updateState } from './config.js';
import { KlineTable } from './components/KlineTable.js';
import { StockChart } from './components/StockChart.js';
import { Watchlist } from './components/Watchlist.js';
import { Signals } from './components/Signals.js';
import { MultiTimeframe } from './components/MultiTimeframe.js';
import { Prediction } from './components/Prediction.js';
import { Settings } from './components/Settings.js';
import { Health } from './components/Health.js';
import { Patterns } from './components/Patterns.js';
import { Notifications } from './components/Notifications.js';
import { RiskManagement } from './components/RiskManagement.js';
import { settingsApi } from './api/settings.js';
import { healthApi } from './api/health.js';
import { patternsApi } from './api/patterns.js';
import { notificationsApi } from './api/notifications.js';
import { riskApi } from './api/risk.js';

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
// DOM 元素引用
// ========================================

const DOM = {
  stockInput: null,
  analyzeBtn: null,
  addWatchlistBtn: null,
  mainChart: null,
  volumeChart: null,
  klineTable: null,
  analysisDiv: null,
  watchlistDiv: null,
  signalsDiv: null,
  multiTimeframeDiv: null,
  predictionDiv: null,
  settingsDiv: null,
  settingsBtn: null,
  healthDiv: null,
  patternsDiv: null,
  notificationsDiv: null,
  riskDiv: null,
  themeToggle: null,
  tabNav: null
};

/**
 * 初始化 DOM 引用
 */
function initDOM() {
  DOM.stockInput = document.getElementById('stock-code');
  DOM.analyzeBtn = document.getElementById('analyze-btn');
  DOM.addWatchlistBtn = document.getElementById('add-watchlist-btn');
  DOM.mainChart = document.getElementById('mainChart');
  DOM.volumeChart = document.getElementById('volumeChart');
  DOM.klineTable = document.getElementById('klineTable');
  DOM.analysisDiv = document.getElementById('analysis');
  DOM.watchlistDiv = document.getElementById('watchlist');
  DOM.signalsDiv = document.getElementById('signals');
  DOM.multiTimeframeDiv = document.getElementById('multiTimeframe');
  DOM.predictionDiv = document.getElementById('prediction');
  DOM.settingsDiv = document.getElementById('settings');
  DOM.settingsBtn = document.getElementById('settings-btn');
  DOM.healthDiv = document.getElementById('health');
  DOM.patternsDiv = document.getElementById('patterns');
  DOM.notificationsDiv = document.getElementById('notifications');
  DOM.riskDiv = document.getElementById('risk');
  DOM.themeToggle = document.getElementById('theme-toggle');
  DOM.tabNav = document.querySelector('.tab-nav');

  logger.debug('DOM elements initialized');
}

/**
 * 验证 DOM 元素
 */
function validateDOM() {
  const missing = [];

  if (!DOM.stockInput) missing.push('stock-code input');
  if (!DOM.analyzeBtn) missing.push('analyze-btn button');
  if (!DOM.mainChart) missing.push('mainChart container');
  if (!DOM.volumeChart) missing.push('volumeChart container');

  if (missing.length > 0) {
    throw new Error(`Missing DOM elements: ${missing.join(', ')}`);
  }

  logger.debug('DOM validation passed');
}

// ========================================
// 股票分析功能
// ========================================

/**
 * 分析股票
 * @param {string} stockCode - 股票代码
 */
async function analyzeStock(stockCode) {
  if (!stockCode || !stockCode.trim()) {
    toast.warning('请输入股票代码');
    return;
  }

  const code = stockCode.trim().toUpperCase();

  logger.info(`Analyzing stock: ${code}`);

  try {
    // 更新加载状态
    updateState({
      loading: { ...AppState.loading, stock: true, analysis: true },
      error: { ...AppState.error, stock: null, analysis: null }
    });

    // 触发加载开始事件
    eventBus.emit(Events.STOCK_LOAD_START, { code });

    // 禁用输入和按钮
    DOM.stockInput.disabled = true;
    DOM.analyzeBtn.disabled = true;
    DOM.analyzeBtn.textContent = '分析中...';

    // 获取今天的日期作为结束日期
    const endDate = new Date().toISOString().split('T')[0];

    // 并行获取数据和分析
    const [analysisResult, signalsResult] = await Promise.all([
      stocksApi.analyze(code, endDate, 'daily'),
      stocksApi.getSignals(code)
    ]);

    logger.info('Analysis completed:', analysisResult);
    logger.info('Signals retrieved:', signalsResult);

    // 更新状态
    updateState({
      currentStock: {
        ...AppState.currentStock,
        code,
        name: analysisResult.stock?.name || code,
        timeframe: 'daily',
        analysis: analysisResult,
        signals: signalsResult
      },
      loading: { ...AppState.loading, stock: false, analysis: false }
    });

    // 触发分析完成事件
    eventBus.emit(Events.STOCK_ANALYZED, {
      code,
      analysis: analysisResult,
      signals: signalsResult
    });

    // 显示成功消息
    toast.success(`分析完成: ${code}`);

    // 更新 UI
    updateAnalysisUI(analysisResult, signalsResult);

  } catch (error) {
    logger.error(`Failed to analyze stock ${code}:`, error);

    // 更新错误状态
    updateState({
      error: {
        ...AppState.error,
        stock: error.message,
        analysis: error.message
      },
      loading: { ...AppState.loading, stock: false, analysis: false }
    });

    // 触发错误事件
    eventBus.emit(Events.STOCK_LOAD_ERROR, { code, error });

    // 显示错误消息（由全局错误处理）
    globalErrorHandler(error, `Stock Analysis (${code})`);

  } finally {
    // 恢复输入和按钮
    DOM.stockInput.disabled = false;
    DOM.analyzeBtn.disabled = false;
    DOM.analyzeBtn.textContent = '分析';
  }
}

/**
 * 更新分析结果 UI
 * @param {Object} analysis - 分析结果
 * @param {Object} signals - 信号结果
 */
function updateAnalysisUI(analysis, signals) {
  if (!DOM.analysisDiv) {
    logger.warn('Analysis container not found');
    return;
  }

  // 构建分析结果 HTML
  let html = '<div class="analysis-result">';
  html += '<h3>分析结果</h3>';

  if (analysis.stock) {
    html += `<div class="stock-info">`;
    html += `<p><strong>股票代码:</strong> ${analysis.stock.code}</p>`;
    html += `<p><strong>股票名称:</strong> ${analysis.stock.name || 'N/A'}</p>`;
    html += `</div>`;
  }

  if (analysis.phase) {
    html += `<div class="phase-info">`;
    html += `<p><strong>威科夫相位:</strong> <span class="phase-badge phase-${analysis.phase.toLowerCase()}">${analysis.phase}</span></p>`;
    html += `</div>`;
  }

  if (signals && signals.length > 0) {
    html += '<div class="signals-info">';
    html += '<h4>交易信号</h4>';
    html += '<ul>';
    signals.forEach(signal => {
      html += `<li>${signal.type}: ${signal.description}</li>`;
    });
    html += '</ul>';
    html += '</div>';
  }

  html += '</div>';

  DOM.analysisDiv.innerHTML = html;

  logger.debug('Analysis UI updated');
}

// ========================================
// 自选股功能
// ========================================

/**
 * 加载自选股列表
 */
async function loadWatchlist() {
  try {
    logger.info('Loading watchlist...');

    const watchlistData = await Watchlist.refresh();

    // 渲染自选股
    if (DOM.watchlistDiv) {
      const html = Watchlist.render(watchlistData);
      DOM.watchlistDiv.innerHTML = html;

      // 绑定自选股卡片事件
      bindWatchlistEvents();

      logger.info(`Watchlist loaded: ${watchlistData.length} items`);
    }
  } catch (error) {
    logger.error('Failed to load watchlist:', error);

    if (DOM.watchlistDiv) {
      DOM.watchlistDiv.innerHTML = Watchlist.generateEmptyState();
    }

    globalErrorHandler(error, 'Watchlist Load');
  }
}

/**
 * 绑定自选股相关事件
 */
function bindWatchlistEvents() {
  // 删除按钮事件
  const removeButtons = DOM.watchlistDiv.querySelectorAll('.watchlist-card-remove');
  removeButtons.forEach(button => {
    button.addEventListener('click', withErrorHandling(async (event) => {
      const code = event.target.dataset.code;
      if (code) {
        await Watchlist.removeFromWatchlist(code);
        await loadWatchlist(); // 重新加载
      }
    }, 'Remove from Watchlist'));
  });

  // 分析按钮事件
  const analyzeButtons = DOM.watchlistDiv.querySelectorAll('[data-action="analyze"]');
  analyzeButtons.forEach(button => {
    button.addEventListener('click', withErrorHandling(async (event) => {
      const code = event.target.dataset.code;
      if (code) {
        // 填入股票代码并分析
        DOM.stockInput.value = code;
        await analyzeStock(code);
      }
    }, 'Analyze from Watchlist'));
  });

  // 卡片点击事件（跳转到分析）
  const cards = DOM.watchlistDiv.querySelectorAll('.watchlist-card');
  cards.forEach(card => {
    card.addEventListener('click', withErrorHandling(async (event) => {
      // 如果点击的是按钮，不触发卡片点击
      if (event.target.tagName === 'BUTTON') {
        return;
      }

      const code = card.dataset.code;
      if (code) {
        DOM.stockInput.value = code;
        await analyzeStock(code);
      }
    }, 'Watchlist Card Click'));
  });

  logger.debug('Watchlist events bound');
}

/**
 * 添加当前股票到自选股
 */
async function addCurrentToWatchlist() {
  const currentCode = AppState.currentStock.code;
  if (!currentCode) {
    toast.warning('请先分析一只股票');
    return;
  }

  await Watchlist.addToWatchlist(currentCode);
  await loadWatchlist(); // 重新加载
}

/**
 * 批量分析自选股
 */
async function batchAnalyzeWatchlist() {
  try {
    const watchlistData = await Watchlist.refresh();

    if (watchlistData.length === 0) {
      toast.warning('自选股列表为空');
      return;
    }

    logger.info(`Batch analyzing ${watchlistData.length} stocks...`);

    await Watchlist.batchAnalyze(watchlistData);

    toast.success(`批量分析完成，共 ${watchlistData.length} 只股票`);
  } catch (error) {
    logger.error('Failed to batch analyze watchlist:', error);
    globalErrorHandler(error, 'Batch Analyze Watchlist');
  }
}

// ========================================
// 事件绑定
// ========================================

/**
 * 绑定事件监听器
 */
function bindEvents() {
  // 分析按钮点击事件
  DOM.analyzeBtn.addEventListener('click', withErrorHandling(async (event) => {
    const stockCode = DOM.stockInput.value;
    await analyzeStock(stockCode);
  }, 'Analyze Button'));

  // 股票输入框回车事件
  DOM.stockInput.addEventListener('keypress', withSyncErrorHandling((event) => {
    if (event.key === 'Enter') {
      const stockCode = DOM.stockInput.value;
      analyzeStock(stockCode);
    }
  }, 'Stock Input'));

  // 监听股票分析完成事件
  eventBus.on(Events.STOCK_ANALYZED, async ({ code, analysis, signals }) => {
    logger.info(`Stock analyzed event received: ${code}`);

    let quotes = null; // 移到外部定义，以便后续访问

    try {
      // 获取K线数据
      quotes = await stocksApi.getQuotes(code, 'daily', 100);

      if (quotes && quotes.length > 0) {
        logger.info(`Quotes loaded: ${quotes.length} items`);

        // 渲染K线表格
        const tableHTML = KlineTable.render(quotes, 'daily');

        // 插入到DOM
        if (DOM.klineTable) {
          DOM.klineTable.innerHTML = tableHTML;
          logger.info('K线表格渲染完成');
        }

        // 渲染图表
        if (DOM.mainChart) {
          const mainChartInstance = StockChart.initMainChart(DOM.mainChart, quotes, 'daily');
          // 保存图表实例到AppState以便后续销毁
          if (mainChartInstance) {
            AppState.charts.main = mainChartInstance;
            logger.info('主图表渲染完成');
          }
        }

        if (DOM.volumeChart) {
          const volumeChartInstance = StockChart.initVolumeChart(DOM.volumeChart, quotes, 'daily');
          // 保存图表实例到AppState以便后续销毁
          if (volumeChartInstance) {
            AppState.charts.volume = volumeChartInstance;
            logger.info('成交量图渲染完成');
          }
        }
      } else {
        logger.warn('No quotes data available');
        if (DOM.klineTable) {
          DOM.klineTable.innerHTML = '<div class="table-empty">暂无数据</div>';
        }
      }

      // 加载并渲染信号数据
      try {
        const signalsData = await Signals.loadSignals(code);

        if (signalsData && signalsData.length > 0) {
          logger.info(`Signals loaded: ${signalsData.length} items`);

          // 渲染信号列表（最多显示6条）
          const signalsHTML = Signals.render(signalsData, { showStats: true, maxCount: 6 });

          // 插入到DOM
          if (DOM.signalsDiv) {
            DOM.signalsDiv.innerHTML = signalsHTML;
            logger.info('信号列表渲染完成');
          }
        } else {
          logger.warn('No signals data available');
          if (DOM.signalsDiv) {
            DOM.signalsDiv.innerHTML = Signals.generateEmptyState();
          }
        }
      } catch (error) {
        logger.error('Failed to load or render signals:', error);
        if (DOM.signalsDiv) {
          DOM.signalsDiv.innerHTML = '<div class="signals-error">信号加载失败</div>';
        }
      }

      // 加载并渲染多周期分析数据
      try {
        const timeframes = ['30', '60', 'daily', 'weekly', 'monthly'];
        const multiTimeframeData = await MultiTimeframe.loadMultipleTimeframes(code, timeframes);

        if (multiTimeframeData && multiTimeframeData.length > 0) {
          logger.info(`Multi-timeframe data loaded: ${multiTimeframeData.length} timeframes`);

          // 渲染多周期分析
          const mtfHTML = MultiTimeframe.render(multiTimeframeData);

          // 插入到DOM
          if (DOM.multiTimeframeDiv) {
            DOM.multiTimeframeDiv.innerHTML = mtfHTML;
            logger.info('多周期分析渲染完成');
          }
        } else {
          logger.warn('No multi-timeframe data available');
          if (DOM.multiTimeframeDiv) {
            DOM.multiTimeframeDiv.innerHTML = MultiTimeframe.generateEmptyStateHTML();
          }
        }
      } catch (error) {
        logger.error('Failed to load or render multi-timeframe analysis:', error);
        if (DOM.multiTimeframeDiv) {
          DOM.multiTimeframeDiv.innerHTML = '<div class="mtf-error">多周期分析加载失败</div>';
        }
      }

      // 加载并渲染K线预测数据
      try {
        // 需要K线数据和摘要来生成预测
        const summary = analysis.summary;
        if (quotes && quotes.length > 0 && summary) {
          logger.info('Generating K-line predictions...');

          // 生成预测数据
          const predictions = Prediction.predictFutureCandles(quotes, summary);

          if (predictions && predictions.length > 0) {
            logger.info(`Predictions generated: ${predictions.length} days`);

            // 渲染预测
            Prediction.render('prediction', predictions);
            logger.info('K线预测渲染完成');
          } else {
            logger.warn('No predictions generated');
            if (DOM.predictionDiv) {
              DOM.predictionDiv.innerHTML = Prediction.generateEmptyStateHTML();
            }
          }
        } else {
          logger.warn('Insufficient data for prediction');
          if (DOM.predictionDiv) {
            DOM.predictionDiv.innerHTML = Prediction.generateEmptyStateHTML();
          }
        }
      } catch (error) {
        logger.error('Failed to generate or render predictions:', error);
        if (DOM.predictionDiv) {
          DOM.predictionDiv.innerHTML = '<div class="prediction-error">预测生成失败</div>';
        }
      }

      // 加载并渲染形态识别数据
      try {
        if (code) {
          logger.info('Loading pattern recognition data...');

          // 渲染形态识别
          await Patterns.render('patterns', code);

          logger.info('Pattern recognition rendered');
        }
      } catch (error) {
        logger.error('Failed to load or render patterns:', error);
        if (DOM.patternsDiv) {
          DOM.patternsDiv.innerHTML = '<div class="patterns-error">形态识别加载失败</div>';
        }
      }
    } catch (error) {
      logger.error('Failed to load or render quotes:', error);
      if (DOM.klineTable) {
        DOM.klineTable.innerHTML = '<div class="table-error">数据加载失败</div>';
      }
    }
  });

  // 监听错误事件

  // 标签页切换
  if (DOM.tabNav) {
    DOM.tabNav.addEventListener('click', (event) => {
      const btn = event.target.closest('.tab-btn');
      if (!btn) return;

      const tabName = btn.dataset.tab;
      switchTab(tabName);
    });
  }

  // 主题切换
  if (DOM.themeToggle) {
    DOM.themeToggle.addEventListener('click', toggleTheme);
  }

  // 加入自选按钮
  if (DOM.addWatchlistBtn) {
    DOM.addWatchlistBtn.addEventListener('click', withErrorHandling(async () => {
      await addCurrentToWatchlist();
    }, 'Add to Watchlist'));
  }
  eventBus.on(Events.ERROR_OCCURRED, ({ error, context }) => {
    logger.error(`Error event received from ${context}:`, error);
  });

  // 监听自选股变更事件
  eventBus.on('WATCHLIST_CHANGED', async () => {
    logger.info('Watchlist changed event received');
    await loadWatchlist();
  });

  // 设置按钮点击事件
  if (DOM.settingsBtn) {
    DOM.settingsBtn.addEventListener('click', withErrorHandling(async () => {
      logger.info('Settings button clicked');

      try {
        const settings = await Settings.load();
        Settings.render('settings', settings);
        switchTab('settings');
      } catch (error) {
        logger.error('Failed to load settings:', error);
        globalErrorHandler(error, 'Settings Load');
      }
    }, 'Open Settings'));
  }

  logger.debug('Event listeners bound');
}

// ========================================
// 标签页管理
// ========================================

/**
 * 切换标签页
 * @param {string} tabName - 标签页名称
 */
function switchTab(tabName) {
  // 更新标签按钮状态
  const buttons = DOM.tabNav.querySelectorAll('.tab-btn');
  buttons.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabName);
  });

  // 更新面板显示
  const panels = document.querySelectorAll('.tab-panel');
  panels.forEach(panel => {
    panel.classList.toggle('active', panel.id === `tab-${tabName}`);
  });

  logger.info(`Switched to tab: ${tabName}`);
}

// ========================================
// 主题管理
// ========================================

/**
 * 初始化主题
 */
function initTheme() {
  const theme = AppState.theme;
  document.documentElement.setAttribute('data-theme', theme);

  logger.info(`Theme initialized: ${theme}`);
}

/**
 * 切换主题
 */
function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute('data-theme');
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

  document.documentElement.setAttribute('data-theme', newTheme);
  AppState.theme = newTheme;

  // 保存到 localStorage
  localStorage.setItem(AppConfig.UI.THEME.STORAGE_KEY, newTheme);

  // 触发主题变更事件
  eventBus.emit(Events.THEME_CHANGE, { theme: newTheme });

  logger.info(`Theme changed to: ${newTheme}`);
  toast.success(`已切换到${newTheme === 'dark' ? '深色' : '浅色'}模式`);
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

    // 初始化 DOM
    initDOM();
    validateDOM();

    // 初始化主题
    initTheme();

    // 绑定事件
    bindEvents();

    // 加载自选股列表
    await loadWatchlist();

    // 加载系统设置
    try {
      const settings = await Settings.load();
      Settings.render('settings', settings);
      logger.info('Settings loaded successfully');
    } catch (error) {
      logger.warn('Failed to load settings, using defaults:', error);
      // 使用默认设置渲染
      const defaultSettings = Settings.getDefaultSettings();
      Settings.render('settings', defaultSettings);
    }

    // 加载健康检查状态
    try {
      const [healthData, testData] = await Promise.all([
        healthApi.getHealthStatus(),
        healthApi.getTestStatus()
      ]);
      Health.render('health', healthData, testData);
      logger.info('Health status loaded successfully');
    } catch (error) {
      logger.warn('Failed to load health status:', error);
      // 显示错误状态
      if (DOM.healthDiv) {
        DOM.healthDiv.innerHTML = Health.generateErrorHTML(error.message);
        Health.bindEvents();
      }
    }

    // 加载飞书通知配置
    try {
      await Notifications.render('notifications');
      logger.info('Notifications loaded successfully');
    } catch (error) {
      logger.warn('Failed to load notifications:', error);
      // 显示错误状态
      if (DOM.notificationsDiv) {
        DOM.notificationsDiv.innerHTML = Notifications.generateErrorHTML(error.message);
        Notifications.bindEvents();
      }
    }

    // 加载风险管理配置
    try {
      await RiskManagement.render('risk');
      logger.info('RiskManagement loaded successfully');
    } catch (error) {
      logger.warn('Failed to load risk management:', error);
      // 显示错误状态
      if (DOM.riskDiv) {
        DOM.riskDiv.innerHTML = RiskManagement.generateErrorHTML(error.message);
        RiskManagement.bindEvents();
      }
    }

    // 设置默认股票代码（如果有）
    if (AppConfig.DEFAULTS.STOCK.CODE) {
      DOM.stockInput.value = AppConfig.DEFAULTS.STOCK.CODE;
    }

    logger.info('Application initialized successfully');

    // 显示欢迎消息
    toast.info('欢迎使用威科夫股票分析系统');

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
// 暴露全局 API（用于调试）
// ========================================

if (AppConfig.DEBUG) {
  window.WyckoffApp = {
    analyzeStock,
    toggleTheme,
    loadWatchlist,
    addCurrentToWatchlist,
    batchAnalyzeWatchlist,
    loadSignals: (code) => Signals.loadSignals(code),
    loadMultiTimeframe: (code) => MultiTimeframe.loadMultipleTimeframes(code),
    loadPrediction: (quotes, summary) => Prediction.predictFutureCandles(quotes, summary),
    eventBus,
    AppState,
    AppConfig,
    logger
  };

  logger.debug('Debug API exposed to window.WyckoffApp');
}

// ========================================
// 启动应用
// ========================================

startApp();

// 导出主要函数供测试使用
export {
  analyzeStock,
  toggleTheme,
  loadWatchlist,
  addCurrentToWatchlist,
  batchAnalyzeWatchlist,
  initApp,
  startApp
};
