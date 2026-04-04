/**
 * 主入口文件
 * 负责应用初始化、事件绑定和错误处理
 */

import { logger } from './utils/logger.js';
import { toast } from './utils/toast.js';
import { handleError, withErrorHandling } from './utils/errorHandler.js';
import { stocksApi } from './api/stocks.js';
import { AppConfig, AppState, eventBus, Events, updateState } from './config.js';

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
  mainChart: null,
  volumeChart: null,
  klineTable: null,
  analysisDiv: null
};

/**
 * 初始化 DOM 引用
 */
function initDOM() {
  DOM.stockInput = document.getElementById('stock-code');
  DOM.analyzeBtn = document.getElementById('analyze-btn');
  DOM.mainChart = document.getElementById('mainChart');
  DOM.volumeChart = document.getElementById('volumeChart');
  DOM.klineTable = document.getElementById('klineTable');
  DOM.analysisDiv = document.getElementById('analysis');

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
// 事件绑定
// ========================================

/**
 * 绑定事件监听器
 */
function bindEvents() {
  // 分析按钮点击事件
  DOM.analyzeBtn.addEventListener('click', withErrorHandling(async () => {
    const stockCode = DOM.stockInput.value;
    await analyzeStock(stockCode);
  }, 'Analyze Button'));

  // 股票输入框回车事件
  DOM.stockInput.addEventListener('keypress', withErrorHandling((event) => {
    if (event.key === 'Enter') {
      const stockCode = DOM.stockInput.value;
      analyzeStock(stockCode);
    }
  }, 'Stock Input'));

  // 监听股票分析完成事件
  eventBus.on(Events.STOCK_ANALYZED, ({ code, analysis, signals }) => {
    logger.info(`Stock analyzed event received: ${code}`);
    // 这里可以触发图表渲染等后续操作
  });

  // 监听错误事件
  eventBus.on(Events.ERROR_OCCURRED, ({ error, context }) => {
    logger.error(`Error event received from ${context}:`, error);
  });

  logger.debug('Event listeners bound');
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
  initApp,
  startApp
};
