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
 */
async function analyzeStock(stockCode, globalErrorHandler) {
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

    // 显示加载状态
    if (DOM.analysisDiv) {
      DOM.analysisDiv.innerHTML = generateLoadingHTML('分析中...', `正在分析 ${code}`);
    }

    // 禁用输入和按钮
    DOM.stockInput.disabled = true;
    DOM.analyzeBtn.disabled = true;
    DOM.analyzeBtn.innerHTML = '<span class="btn-icon">⟳</span> 分析中...';
    DOM.analyzeBtn.classList.add('loading');

    // 获取今天的日期作为结束日期
    const endDate = new Date().toISOString().split('T')[0];

    // 并行获取数据和分析
    const analysisResult = await stocksApi.analyze(code, endDate, 'daily');

    // 分析API已包含signals
    const signalsResult = analysisResult.signals || [];

    logger.info('Analysis completed:', analysisResult);

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
  if (!DOM.analysisDiv) {
    logger.warn('Analysis container not found');
    return;
  }

  // 检查是否为极简模式
  const isMinimalMode = document.body.classList.contains('minimal-mode');

  if (isMinimalMode) {
    // 使用极简模式样式
    DOM.analysisDiv.innerHTML = generateMinimalResultCard(analysis, signals);
  } else {
    // 使用标准模式样式
    renderStandardAnalysisUI(analysis, signals);
  }

  logger.debug('Analysis UI updated');
}

/**
 * 渲染标准模式分析 UI
 * @param {Object} analysis - 分析结果
 * @param {Object} signals - 信号结果
 */
function renderStandardAnalysisUI(analysis, signals) {
  const stock = analysis.stock || {};
  const quote = analysis.current_quote || {};
  const signalsList = signals || analysis.signals || [];

  let html = '<div class="analysis-result">';
  html += '<h3>分析结果</h3>';

  // 股票信息
  html += '<div class="stock-info">';
  html += `<p><strong>${stock.name || stock.code || ''}</strong> (${stock.code || ''})</p>`;
  if (quote.close) {
    const changeStr = quote.change_percent != null
      ? `${quote.change_percent >= 0 ? '+' : ''}${quote.change_percent.toFixed(2)}%`
      : '';
    const changeColor = quote.change_percent >= 0 ? 'color:#ef5350' : 'color:#26a69a';
    html += `<p>收盘: <strong>${quote.close}</strong> <span style="${changeColor}">${changeStr}</span></p>`;
  }
  html += '</div>';

  // 威科夫信号
  if (signalsList.length > 0) {
    const latest = signalsList[0];
    html += '<div class="signals-info">';
    html += '<h4>最新信号</h4>';
    html += `<p class="signal-direction signal-${latest.direction?.toLowerCase() || 'long'}">${latest.direction === 'LONG' ? '看多' : '看空'}</p>`;
    html += `<p><strong>建议:</strong> ${latest.suggestion || ''}</p>`;
    html += `<p><strong>评分:</strong> ${latest.score}/10 | <strong>强度:</strong> ${latest.strength}</p>`;
    if (latest.reason) {
      html += `<p class="signal-reason">${latest.reason}</p>`;
    }
    html += '</div>';
  }

  html += '</div>';

  DOM.analysisDiv.innerHTML = html;
}

export { analyzeStock, updateAnalysisUI };
