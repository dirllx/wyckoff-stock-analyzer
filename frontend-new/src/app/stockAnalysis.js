/**
 * 股票分析模块
 * 负责股票分析逻辑和 UI 更新
 */

import { logger } from '../utils/logger.js';
import { toast } from '../utils/toast.js';
import { handleError } from '../utils/errorHandler.js';
import { stocksApi } from '../api/stocks.js';
import { AppState, updateState, Events, eventBus } from '../config.js';
import { DOM } from './dom.js';
import { updateChartInfoPanel } from '../utils/uiHelpers.js';
import { generateAnalysisSkeleton, showSkeleton, hideSkeleton } from '../utils/skeleton.js';
import { operationLog } from '../utils/operationLog.js';

/**
 * 生成加载状态HTML
 * @param {string} message - 加载消息
 * @param {string} subtext - 副文本
 * @returns {string} 加载状态HTML
 */
function generateLoadingHTML(message = '分析中...', subtext = '正在获取股票数据') {
  return `
    <div class="loading-container">
      <div class="spinner"></div>
      <p class="loading-text">${message}</p>
      <p class="loading-subtext">${subtext}</p>
      <div class="progress-bar">
        <div class="progress-fill"></div>
      </div>
    </div>
  `;
}

/**
 * 生成极简模式结果卡片HTML
 * @param {Object} analysis - 分析结果
 * @param {Array} signals - 信号数据
 * @returns {string} 结果卡片HTML
 */
function generateMinimalResultCard(analysis, signals) {
  const stock = analysis?.stock || {};
  const quote = analysis?.current_quote || {};
  const latestSignal = signals?.[0];

  if (!stock.code) {
    return '<div class="empty-state"><p class="empty-title">暂无数据</p></div>';
  }

  const signalClass = latestSignal?.direction?.toLowerCase() || 'neutral';
  const signalText = {
    'long': '做多',
    'short': '做空',
    'neutral': '中性'
  }[signalClass] || '中性';

  const changePercent = quote.change_percent ?? 0;
  const changeStr = changePercent >= 0 ? `+${changePercent.toFixed(2)}%` : `${changePercent.toFixed(2)}%`;
  const changeColor = changePercent >= 0 ? 'var(--success)' : 'var(--danger)';

  return `
    <div class="result-card">
      <div class="result-header">
        <h2 class="result-title">${stock.name || stock.code}</h2>
        <p class="result-code">${stock.code}</p>
      </div>

      <div class="result-signal ${signalClass}">
        <span class="signal-icon">${signalClass === 'long' ? '📈' : signalClass === 'short' ? '📉' : '➡️'}</span>
        <span>${signalText}</span>
      </div>

      <div class="result-metrics">
        <div class="result-metric">
          <div class="result-metric-value" style="color: ${changeColor}">${changeStr}</div>
          <div class="result-metric-label">涨跌幅</div>
        </div>
        <div class="result-metric">
          <div class="result-metric-value">${latestSignal?.score ?? '-'}</div>
          <div class="result-metric-label">信号评分</div>
        </div>
        <div class="result-metric">
          <div class="result-metric-value">${quote.close ?? '-'}</div>
          <div class="result-metric-label">收盘价</div>
        </div>
      </div>
    </div>
  `;
}

/**
 * 分析股票
 * @param {string} stockCode - 股票代码
 * @param {Function} globalErrorHandler - 全局错误处理器
 * @param {string} timeframe - 分析周期 (daily, weekly, monthly, 30, 60)
 */
async function analyzeStock(stockCode, globalErrorHandler, timeframe = 'daily') {
  if (!stockCode || !stockCode.trim()) {
    toast.warning('请输入股票代码');
    return;
  }

  const code = stockCode.trim().toUpperCase();

  logger.info(`========================================`);
  logger.info(`Analyzing stock: ${code}, timeframe: ${timeframe}`);
  logger.info(`========================================`);

  try {
    // 更新加载状态
    updateState({
      loading: { ...AppState.loading, stock: true, analysis: true },
      error: { ...AppState.error, stock: null, analysis: null }
    });

    // 触发加载开始事件
    eventBus.emit(Events.STOCK_LOAD_START, { code, timeframe });

    // 显示骨架屏
    if (DOM.analysisDiv) {
      showSkeleton('analyzeResultDiv', generateAnalysisSkeleton);
    }

    // 禁用输入和按钮
    DOM.stockInput.disabled = true;
    DOM.analyzeBtn.disabled = true;
    DOM.analyzeBtn.innerHTML = '<span class="btn-icon">⟳</span> 分析中...';
    DOM.analyzeBtn.classList.add('loading');

    // 并行获取数据和分析（强制刷新以获取最新数据）
    operationLog.api('请求分析API', `股票: ${code}, 周期: ${timeframe}, 强制刷新`);
    const analysisResult = await stocksApi.analyze(code, null, timeframe, true);

    // 分析API已包含signals
    const signalsResult = analysisResult.signals || [];

    logger.info('Analysis completed:', analysisResult);
    operationLog.success('分析完成', `${code} - ${analysisResult.stock?.name || code}`);

    // 自动添加到浏览股（如果尚未存在于任何列表中）
    try {
      const { watchlistApi } = await import('../api/watchlist.js');
      await watchlistApi.add(code, 'browse');
      logger.info(`Stock ${code} added to browse list (or already exists)`);
    } catch (error) {
      logger.warn(`Failed to add ${code} to browse list:`, error);
      // 不阻塞主流程，静默失败
    }

    // 更新状态
    updateState({
      currentStock: {
        ...AppState.currentStock,
        code,
        name: analysisResult.stock?.name || code,
        timeframe,
        analysis: analysisResult,
        signals: signalsResult
      },
      loading: { ...AppState.loading, stock: false, analysis: false }
    });

    // 触发分析完成事件
    eventBus.emit(Events.STOCK_ANALYZED, {
      code,
      timeframe,
      analysis: analysisResult,
      signals: signalsResult,
      klines: analysisResult.klines || []
    });

    // 显示成功消息（已移除）
    // toast.success(`分析完成: ${code}`);

    // 更新 UI
    updateAnalysisUI(analysisResult, signalsResult);

  } catch (error) {
    logger.error(`Failed to analyze stock ${code}:`, error);
    operationLog.error('分析失败', `${code}: ${error.message}`);

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
    DOM.analyzeBtn.innerHTML = '<span class="btn-icon">🔍</span> 分析';
    DOM.analyzeBtn.classList.remove('loading');
  }
}

/**
 * 更新分析结果 UI
 * @param {Object} analysis - 分析结果
 * @param {Object} signals - 信号结果
 */
function updateAnalysisUI(analysis, signals) {
  if (!analysis) return;

  // 更新图表信息面板
  updateChartInfoPanel(analysis);

  // 优先使用analyzeResultDiv，回退到analysisDiv
  const container = DOM.analyzeResultDiv || DOM.analysisDiv;
  if (!container) {
    logger.warn('Analysis container not found');
    return;
  }

  // 检查是否为极简模式
  const isMinimalMode = document.body.classList.contains('minimal-mode');

  // 生成内容HTML
  let content = '';
  if (isMinimalMode) {
    content = generateMinimalResultCard(analysis, signals);
  } else {
    content = renderStandardAnalysisUI(analysis, signals);
  }

  // 使用hideSkeleton显示内容（带淡入动画）
  const containerId = container.id || 'analyzeResultDiv';
  if (!container.id) {
    container.id = 'analyzeResultDiv';
  }
  hideSkeleton(containerId, content);

  logger.debug('Analysis UI updated');
}

/**
 * 渲染标准模式分析 UI（增强版）
 * @param {Object} analysis - 分析结果
 * @param {Object} signals - 信号结果
 */
function renderStandardAnalysisUI(analysis, signals) {
  const stock = analysis.stock || {};
  const quote = analysis.current_quote || {};
  const summary = analysis.analysis_summary || {};
  const signalsList = signals || analysis.signals || [];

  let html = '<div class="analysis-result-full">';

  // 股票基本信息
  html += '<div class="analysis-section stock-basic-info">';
  html += `<h4 class="stock-name">${stock.name || stock.code || ''} <span class="stock-code">(${stock.code || ''})</span></h4>`;
  if (quote.close) {
    const changeStr = quote.change_percent != null
      ? `${quote.change_percent >= 0 ? '+' : ''}${quote.change_percent.toFixed(2)}%`
      : '';
    const changeColor = quote.change_percent >= 0 ? '#ef4444' : '#10b981';
    const changeIcon = quote.change_percent >= 0 ? '↑' : '↓';
    html += `
      <div class="price-info">
        <span class="current-price">${quote.close}</span>
        <span class="price-change" style="color: ${changeColor}">${changeIcon} ${changeStr}</span>
      </div>
      <div class="price-details">
        <span>开: ${quote.open || '-'}</span>
        <span>高: ${quote.high || '-'}</span>
        <span>低: ${quote.low || '-'}</span>
        <span>量: ${quote.volume ? (quote.volume / 10000).toFixed(0) + '万' : '-'}</span>
      </div>
    `;
  }
  html += '</div>';

  // 威科夫分析结果
  if (summary && Object.keys(summary).length > 0) {
    html += '<div class="analysis-section wyckoff-analysis">';
    html += '<h5>威科夫分析</h5>';

    // 市场阶段和方向
    const directionClass = summary.direction?.toLowerCase() || 'neutral';
    const directionText = {
      'long': '看多',
      'short': '看空',
      'neutral': '中性'
    }[directionClass] || '中性';

    html += `
      <div class="analysis-grid">
        <div class="analysis-item">
          <span class="label">市场阶段</span>
          <span class="value phase-${summary.wyckoff_phase || 'unknown'}">${summary.wyckoff_phase || '-'}</span>
        </div>
        <div class="analysis-item">
          <span class="label">方向</span>
          <span class="value direction-${directionClass}">${directionText}</span>
        </div>
        <div class="analysis-item">
          <span class="label">信号评分</span>
          <span class="value score-${summary.score >= 0 ? 'up' : 'down'}">${summary.score || '-'}/5</span>
        </div>
        <div class="analysis-item">
          <span class="label">置信度</span>
          <span class="value">${summary.confidence ? (summary.confidence * 100).toFixed(0) + '%' : '-'}</span>
        </div>
        <div class="analysis-item">
          <span class="label">建议</span>
          <span class="value suggestion-${summary.suggestion?.toLowerCase()}">${summary.suggestion || '-'}</span>
        </div>
      </div>
    `;

    // 分析原因
    if (summary.reason) {
      html += `<div class="analysis-reason"><strong>分析依据:</strong> ${summary.reason}</div>`;
    }

    html += '</div>';
  }

  // 技术指标
  if (quote && (quote.ma5 || quote.ma20 || quote.ma60)) {
    html += '<div class="analysis-section technical-indicators">';
    html += '<h5>技术指标</h5>';
    html += '<div class="ma-list">';

    const maList = [
      { name: 'MA5', value: quote.ma5 },
      { name: 'MA10', value: quote.ma10 },
      { name: 'MA20', value: quote.ma20 },
      { name: 'MA30', value: quote.ma30 },
      { name: 'MA60', value: quote.ma60 }
    ];

    maList.forEach(ma => {
      if (ma.value) {
        const trend = quote.close && quote.close > ma.value ? 'up' : 'down';
        html += `<span class="ma-item ma-${trend}">${ma.name}: ${ma.value.toFixed(2)}</span>`;
      }
    });

    html += '</div></div>';
  }

  // 最新威科夫信号
  if (signalsList.length > 0) {
    html += '<div class="analysis-section signal-history">';
    html += '<h5>历史信号</h5>';

    // 显示最近3条信号
    const recentSignals = signalsList.slice(0, 3);
    html += '<div class="signal-list">';

    recentSignals.forEach(signal => {
      const signalClass = signal.direction?.toLowerCase() || 'neutral';
      const signalText = signal.direction === 'LONG' ? '看多' : signal.direction === 'SHORT' ? '看空' : 'neutral';

      html += `
        <div class="signal-item signal-${signalClass}">
          <div class="signal-date">${signal.date ? signal.date.substring(0, 10).replace(/^(\d{4})-/, '') : '-'}</div>
          <div class="signal-info">
            <span class="signal-direction-small">${signalText}</span>
            <span class="signal-score">评分: ${signal.score}/5</span>
          </div>
          ${signal.suggestion ? `<div class="signal-suggestion">${signal.suggestion}</div>` : ''}
        </div>
      `;
    });

    html += '</div></div>';
  }

  html += '</div>';

  return html;
}

export { analyzeStock, updateAnalysisUI };
