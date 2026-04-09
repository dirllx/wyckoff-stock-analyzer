/**
 * 主入口文件
 * 负责应用初始化、事件绑定和错误处理
 */

import { logger } from './utils/logger.js';
import { toast } from './utils/toast.js';
import { handleError, withErrorHandling, withSyncErrorHandling } from './utils/errorHandler.js';
import { stocksApi } from './api/stocks.js';
import { AppConfig, AppState, eventBus, Events, updateState } from './config.js';

// Lazy-loaded component getters (loaded on first use)
const Signals = () => import('./components/Signals.js').then(m => m.Signals);
const MultiTimeframe = () => import('./components/MultiTimeframe.js').then(m => m.MultiTimeframe);
const Prediction = () => import('./components/Prediction.js').then(m => m.Prediction);
const Settings = () => import('./components/Settings.js').then(m => m.Settings);
const Health = () => import('./components/Health.js').then(m => m.Health);
const Notifications = () => import('./components/Notifications.js').then(m => m.Notifications);
const RiskManagement = () => import('./components/RiskManagement.js').then(m => m.RiskManagement);
const healthApi = () => import('./api/health.js').then(m => m.healthApi);

// 应用模块
import { initDOM, validateDOM } from './app/dom.js';
import { analyzeStock } from './app/stockAnalysis.js';
import { loadWatchlist, addCurrentToWatchlist, batchAnalyzeWatchlist } from './app/watchlistManager.js';
import { handleStockAnalyzed } from './app/rendering.js';
import { switchTab, initTheme, toggleTheme, MinimalMode } from './app/ui.js';

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

/**
 * 包装 analyzeStock，自动注入 globalErrorHandler
 */
function doAnalyzeStock(stockCode) {
  return analyzeStock(stockCode, globalErrorHandler);
}

/**
 * 绑定事件监听器
 */
function bindEvents() {
  // 分析按钮点击事件
  document.getElementById('analyze-btn').addEventListener('click', withErrorHandling(async (event) => {
    const stockCode = document.getElementById('stock-code').value;
    await doAnalyzeStock(stockCode);
  }, 'Analyze Button'));

  // 股票输入框回车事件
  document.getElementById('stock-code').addEventListener('keypress', withSyncErrorHandling((event) => {
    if (event.key === 'Enter') {
      const stockCode = document.getElementById('stock-code').value;
      doAnalyzeStock(stockCode);
    }
  }, 'Stock Input'));

  // 监听股票分析完成事件
  eventBus.on(Events.STOCK_ANALYZED, handleStockAnalyzed);

  // 标签页切换
  const tabNav = document.querySelector('.tab-nav');
  if (tabNav) {
    tabNav.addEventListener('click', (event) => {
      const btn = event.target.closest('.tab-btn');
      if (!btn) return;

      const tabName = btn.dataset.tab;
      switchTab(tabName);
    });
  }

  // 主题切换
  const themeToggle = document.getElementById('theme-toggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', toggleTheme);
  }

  // 极简模式切换
  const minimalModeToggle = document.getElementById('minimal-mode-toggle');
  if (minimalModeToggle) {
    minimalModeToggle.addEventListener('click', withSyncErrorHandling(() => {
      MinimalMode.toggle();
    }, 'Toggle Minimal Mode'));
  }

  // 加入自选按钮
  const addWatchlistBtn = document.getElementById('add-watchlist-btn');
  if (addWatchlistBtn) {
    addWatchlistBtn.addEventListener('click', withErrorHandling(async () => {
      await addCurrentToWatchlist(globalErrorHandler, doAnalyzeStock);
    }, 'Add to Watchlist'));
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

  // 设置按钮点击事件
  const settingsBtn = document.getElementById('settings-btn');
  if (settingsBtn) {
    settingsBtn.addEventListener('click', withErrorHandling(async () => {
      logger.info('Settings button clicked');

      try {
        const S = await Settings();
        const settings = await S.load();
        S.render('settings', settings);
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

    // 初始化极简模式
    MinimalMode.init();

    // 绑定事件
    bindEvents();

    // 加载自选股列表
    await loadWatchlist(globalErrorHandler, doAnalyzeStock);

    // 加载系统设置
    try {
      const S = await Settings();
      const settings = await S.load();
      S.render('settings', settings);
      logger.info('Settings loaded successfully');
    } catch (error) {
      logger.warn('Failed to load settings, using defaults:', error);
      const S = await Settings();
      const defaultSettings = S.getDefaultSettings();
      S.render('settings', defaultSettings);
    }

    // 加载健康检查状态
    try {
      const HA = await healthApi();
      const [healthData, testData] = await Promise.all([
        HA.getHealthStatus(),
        HA.getTestStatus()
      ]);
      const H = await Health();
      H.render('health', healthData, testData);
      logger.info('Health status loaded successfully');
    } catch (error) {
      logger.warn('Failed to load health status:', error);
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

    // 设置默认股票代码（如果有）
    if (AppConfig.DEFAULTS.STOCK.CODE) {
      document.getElementById('stock-code').value = AppConfig.DEFAULTS.STOCK.CODE;
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
    analyzeStock: doAnalyzeStock,
    toggleTheme,
    MinimalMode,
    loadWatchlist: () => loadWatchlist(globalErrorHandler, doAnalyzeStock),
    addCurrentToWatchlist: () => addCurrentToWatchlist(globalErrorHandler, doAnalyzeStock),
    batchAnalyzeWatchlist: () => batchAnalyzeWatchlist(globalErrorHandler),
    loadSignals: async (code) => (await Signals()).loadSignals(code),
    loadMultiTimeframe: async (code) => (await MultiTimeframe()).loadMultipleTimeframes(code),
    loadPrediction: async (quotes, summary) => (await Prediction()).predictFutureCandles(quotes, summary),
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
  doAnalyzeStock as analyzeStock,
  toggleTheme,
  loadWatchlist as _loadWatchlist,
  addCurrentToWatchlist as _addCurrentToWatchlist,
  batchAnalyzeWatchlist as _batchAnalyzeWatchlist,
  initApp,
  startApp
};
