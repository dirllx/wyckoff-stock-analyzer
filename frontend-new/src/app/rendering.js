/**
 * 渲染模块
 * 负责股票分析完成后的各类数据渲染
 */

import { logger } from '../utils/logger.js';
import { stocksApi } from '../api/stocks.js';
import { AppState } from '../config.js';
import { DOM } from './dom.js';
import { updateChartInfoPanel } from '../utils/uiHelpers.js';
import * as echarts from 'echarts';

// Lazy-load modal function
let showQuoteDetailModal = null;
async function getShowQuoteDetailModal() {
  if (!showQuoteDetailModal) {
    const modal = await import('../utils/modal.js');
    showQuoteDetailModal = modal.showQuoteDetailModal;
  }
  return showQuoteDetailModal;
}

// Lazy-loaded component getters
const getKlineTable = () => import('../components/KlineTable.js').then(m => m.KlineTable);
const getStockChart = () => import('../components/StockChart.js').then(m => m.StockChart);
const getSignals = () => import('../components/Signals.js').then(m => m.Signals);
const getMultiTimeframe = () => import('../components/MultiTimeframe.js').then(m => m.MultiTimeframe);
const getPrediction = () => import('../components/Prediction.js').then(m => m.Prediction);
const getPatterns = () => import('../components/Patterns.js').then(m => m.Patterns);

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
 * 绑定K线表格行点击事件 - 显示详情弹窗
 * @param {Array} quotes - K线数据
 * @param {Array} signals - 信号数据
 */
async function bindKlineTableRowClicks(quotes, signals = null) {
  try {
    const modalFn = await getShowQuoteDetailModal();

    // 构建信号映射
    const signalsMap = signals ? signals.reduce((map, signal) => {
      const dateStr = signal.date ? signal.date.substring(0, 10) : null;
      if (dateStr) {
        map[dateStr] = signal;
      }
      return map;
    }, {}) : null;

    // 获取当前时间周期
    const currentTimeframe = AppState.currentStock.timeframe || 'daily';

    // 委托事件监听
    DOM.klineTable?.addEventListener('click', (event) => {
      // 处理重置按钮
      const resetBtn = event.target.closest('[data-action="reset"]');
      if (resetBtn) {
        handleTableFilterReset(quotes, signals);
        return;
      }

      // 处理行点击
      const row = event.target.closest('tr[data-index]');
      if (!row) return;

      const index = parseInt(row.dataset.index, 10);
      if (isNaN(index) || index < 0 || index >= quotes.length) return;

      const quote = quotes[index];
      if (!quote) return;

      // 获取前一根K线数据
      const prevQ = index > 0 ? quotes[index - 1] : null;

      // 显示详情弹窗 - 传递当前K线、前一根K线和时间周期
      modalFn(quote, prevQ, currentTimeframe);
    });

    // 委托筛选事件
    DOM.klineTable?.addEventListener('change', (event) => {
      const filterSelect = event.target.closest('[data-filter-type]');
      if (filterSelect) {
        const filterType = filterSelect.dataset.filterType;
        const value = filterSelect.value;
        handleTableFilterChange(filterType, value, quotes, signals);
      }
    });

    // 委托搜索事件
    DOM.klineTable?.addEventListener('input', (event) => {
      if (event.target.matches('[data-filter-type="search"]')) {
        const value = event.target.value;
        handleTableFilterChange('search', value, quotes, signals);
      }
    });

    // 更新筛选统计
    updateFilterStats();

    logger.debug('K线表格行点击事件已绑定');
  } catch (error) {
    logger.error('Failed to bind kline table row clicks:', error);
  }
}

/**
 * 处理表格筛选变化
 * @param {string} type - 筛选类型
 * @param {string} value - 筛选值
 * @param {Array} quotes - K线数据
 * @param {Array} signals - 信号数据
 */
async function handleTableFilterChange(type, value, quotes, signals = null) {
  try {
    const KT = await getKlineTable();

    // 设置筛选条件
    KT.setFilter(type, value);

    // 重新渲染表格
    const signalsMap = signals ? KT.buildSignalsMap(signals) : null;
    const tableHTML = KT.render(quotes, 'daily', signals);

    if (DOM.klineTable) {
      DOM.klineTable.innerHTML = tableHTML;

      // 重新绑定事件
      bindKlineTableRowClicks(quotes, signals);
    }

    logger.debug(`表格筛选已更新: ${type} = ${value}`);
  } catch (error) {
    logger.error('Failed to filter table:', error);
  }
}

/**
 * 处理表格筛选重置
 * @param {Array} quotes - K线数据
 * @param {Array} signals - 信号数据
 */
async function handleTableFilterReset(quotes, signals = null) {
  try {
    const KT = await getKlineTable();

    // 重置筛选
    KT.resetFilters();

    // 重新渲染表格
    const signalsMap = signals ? KT.buildSignalsMap(signals) : null;
    const tableHTML = KT.render(quotes, 'daily', signals);

    if (DOM.klineTable) {
      DOM.klineTable.innerHTML = tableHTML;

      // 重新绑定事件
      bindKlineTableRowClicks(quotes, signals);
    }

    logger.debug('表格筛选已重置');
  } catch (error) {
    logger.error('Failed to reset filters:', error);
  }
}

/**
 * 更新筛选统计
 */
function updateFilterStats() {
  const countEl = DOM.klineTable?.querySelector('.filter-count');
  if (countEl) {
    const rowCount = DOM.klineTable?.querySelectorAll('tbody tr[data-index]').length || 0;
    countEl.textContent = rowCount;
  }
}

/**
 * 渲染K线表格和图表
 * @param {string} code - 股票代码
 * @param {Array} quotes - K线数据
 */
async function renderQuotes(code, quotes) {
  if (quotes && quotes.length > 0) {
    logger.info(`Quotes loaded: ${quotes.length} items`);

    // 动态加载并渲染K线表格和图表
    const [KT, SC] = await Promise.all([getKlineTable(), getStockChart()]);

    // 获取已有信号数据（可能在分析阶段已获取）
    const existingSignals = AppState.currentStock?.signals || null;

    // 渲染K线表格（传入信号数据以匹配信号列）
    const signalsMap = existingSignals ? KT.buildSignalsMap(existingSignals) : null;
    const tableHTML = KT.render(quotes, 'daily', existingSignals);

    // 插入到DOM
    if (DOM.klineTable) {
      DOM.klineTable.innerHTML = tableHTML;
      logger.info('K线表格渲染完成');

      // 绑定行点击事件 - 仅在非虚拟滚动模式下绑定
      // 虚拟滚动模式有自己的点击处理（在KlineTable.initVirtualScroll中）
      if (quotes.length <= 50) {
        bindKlineTableRowClicks(quotes, existingSignals);
      }

      // 如果启用了虚拟滚动，初始化它（阈值与KlineTable.js保持一致：50）
      if (quotes.length > 50) {
        const virtualContainer = DOM.klineTable.querySelector('.kline-table-virtual');
        if (virtualContainer) {
          // 延迟初始化以确保DOM布局完成
          setTimeout(() => {
            const vs = KT.initVirtualScroll(virtualContainer, quotes, 'daily', signalsMap);
            if (vs) {
              AppState.virtualScroll = vs;
            }
            logger.info('虚拟滚动已初始化');
          }, 50);
        }
      }
    }

    // 渲染图表
    if (DOM.mainChart) {
      const mainChartInstance = SC.initMainChart(DOM.mainChart, quotes, 'daily');
      if (mainChartInstance) {
        AppState.charts.main = mainChartInstance;
        // 设置响应式调整
        SC.setupResponsiveResize(mainChartInstance, DOM.mainChart);
        logger.info('主图表渲染完成');
      }
    }

    if (DOM.volumeChart) {
      const volumeChartInstance = SC.initVolumeChart(DOM.volumeChart, quotes, 'daily');
      if (volumeChartInstance) {
        AppState.charts.volume = volumeChartInstance;
        // 设置响应式调整
        SC.setupResponsiveResize(volumeChartInstance, DOM.volumeChart);
        logger.info('成交量图渲染完成');
      }
    }

    // 连接图表实现联动（使用 echarts.connect）
    if (AppState.charts.main && AppState.charts.volume) {
      try {
        // 使用 group 数组连接两个图表
        const group = [
          AppState.charts.main,
          AppState.charts.volume
        ];
        echarts.connect(group);

        // 或者使用 connect 直接连接
        // echarts.connect(AppState.charts.main, AppState.charts.volume);

        logger.info('图表联动已启用');
      } catch (error) {
        logger.warn('图表联动连接失败:', error);
      }
    }
  } else {
    logger.warn('No quotes data available');
    if (DOM.klineTable) {
      DOM.klineTable.innerHTML = '<div class="table-empty">暂无数据</div>';
    }
  }
}

/**
 * 渲染信号数据
 * @param {Array} signals - 信号数据
 */
async function renderSignals(signals) {
  try {
    const signalsData = signals || [];

    if (signalsData.length > 0) {
      logger.info(`Signals loaded: ${signalsData.length} items`);

      const SIG = await getSignals();
      const signalsHTML = SIG.render(signalsData, { showStats: true, maxCount: 6 });

      if (DOM.signalsDiv) {
        DOM.signalsDiv.innerHTML = signalsHTML;
        logger.info('信号列表渲染完成');
      }
    } else {
      logger.warn('No signals data available');
      if (DOM.signalsDiv) {
        const SIG = await getSignals();
        DOM.signalsDiv.innerHTML = SIG.generateEmptyState();
      }
    }
  } catch (error) {
    logger.error('Failed to load or render signals:', error);
    if (DOM.signalsDiv) {
      DOM.signalsDiv.innerHTML = '<div class="signals-error">信号加载失败</div>';
    }
  }
}

/**
 * 加载并渲染多周期分析数据
 * @param {string} code - 股票代码
 */
async function renderMultiTimeframe(code) {
  try {
    const timeframes = ['30', '60', 'daily', 'weekly', 'monthly'];
    const MTF = await getMultiTimeframe();
    const multiTimeframeData = await MTF.loadMultipleTimeframes(code, timeframes);

    if (multiTimeframeData && multiTimeframeData.length > 0) {
      logger.info(`Multi-timeframe data loaded: ${multiTimeframeData.length} timeframes`);

      const mtfHTML = MTF.render(multiTimeframeData);

      if (DOM.multiTimeframeDiv) {
        DOM.multiTimeframeDiv.innerHTML = mtfHTML;
        logger.info('多周期分析渲染完成');
      }
    } else {
      logger.warn('No multi-timeframe data available');
      if (DOM.multiTimeframeDiv) {
        DOM.multiTimeframeDiv.innerHTML = MTF.generateEmptyStateHTML();
      }
    }
  } catch (error) {
    logger.error('Failed to load or render multi-timeframe analysis:', error);
    if (DOM.multiTimeframeDiv) {
      DOM.multiTimeframeDiv.innerHTML = '<div class="mtf-error">多周期分析加载失败</div>';
    }
  }
}

/**
 * 生成并渲染K线预测数据
 * @param {Array} quotes - K线数据
 * @param {Object} summary - 信号摘要
 */
async function renderPredictions(quotes, summary) {
  try {
    if (quotes && quotes.length > 0 && summary) {
      logger.info('Generating K-line predictions...');
      const PRED = await getPrediction();
      const predictions = PRED.predictFutureCandles(quotes, summary);

      if (predictions && predictions.length > 0) {
        logger.info(`Predictions generated: ${predictions.length} days`);

        PRED.render('prediction', predictions);
        logger.info('K线预测渲染完成');
      } else {
        logger.warn('No predictions generated');
        if (DOM.predictionDiv) {
          DOM.predictionDiv.innerHTML = PRED.generateEmptyStateHTML();
        }
      }
    } else {
      logger.warn('Insufficient data for prediction');
      if (DOM.predictionDiv) {
        const PRED = await getPrediction();
        DOM.predictionDiv.innerHTML = PRED.generateEmptyStateHTML();
      }
    }
  } catch (error) {
    logger.error('Failed to generate or render predictions:', error);
    if (DOM.predictionDiv) {
      DOM.predictionDiv.innerHTML = '<div class="prediction-error">预测生成失败</div>';
    }
  }
}

/**
 * 渲染形态识别数据
 * @param {string} code - 股票代码
 */
async function renderPatterns(code) {
  try {
    if (code) {
      logger.info('Loading pattern recognition data...');

      const PAT = await getPatterns();
      await PAT.render('patterns', code);

      logger.info('Pattern recognition rendered');
    }
  } catch (error) {
    logger.error('Failed to load or render patterns:', error);
    if (DOM.patternsDiv) {
      DOM.patternsDiv.innerHTML = '<div class="patterns-error">形态识别加载失败</div>';
    }
  }
}

/**
 * 渲染合并后的分析结论卡片
 * @param {Object} analysis - 分析结果
 * @param {Array} signals - 信号数据
 * @param {Object} summary - 信号摘要
 */
async function renderAnalysisCard(analysis, signals, summary) {
  const analysisDiv = document.getElementById('analysis');
  if (!analysisDiv) return;

  const content = analysisDiv.querySelector('.data-card-content');
  if (!content) return;

  try {
    // 获取最新信号
    const latestSignal = signals && signals.length > 0 ? signals[0] : null;

    // 构建分析结论HTML
    let html = '<div class="analysis-conclusion">';

    // 威科夫相位
    if (latestSignal) {
      const phase = latestSignal.wyckoff_phase || '震荡';
      const phaseColor = latestSignal.direction === 'BULLISH' ? '#10b981' :
                        latestSignal.direction === 'BEARISH' ? '#ef4444' : '#f59e0b';
      html += `
        <div class="conclusion-item">
          <span class="conclusion-label">威科夫相位</span>
          <span class="conclusion-value" style="color: ${phaseColor}">${phase}</span>
        </div>
      `;
    }

    // 信号强度
    if (latestSignal && latestSignal.score !== undefined) {
      const score = latestSignal.score;
      const scoreColor = score >= 7 ? '#10b981' : score >= 4 ? '#f59e0b' : '#ef4444';
      html += `
        <div class="conclusion-item">
          <span class="conclusion-label">信号强度</span>
          <span class="conclusion-value" style="color: ${scoreColor}">${score}/10</span>
        </div>
      `;
    }

    // 趋势方向
    if (latestSignal && latestSignal.direction) {
      const directionText = latestSignal.direction === 'BULLISH' ? '看涨' :
                           latestSignal.direction === 'BEARISH' ? '看跌' : '中性';
      const directionColor = latestSignal.direction === 'BULLISH' ? '#10b981' :
                            latestSignal.direction === 'BEARISH' ? '#ef4444' : '#9ca3af';
      html += `
        <div class="conclusion-item">
          <span class="conclusion-label">趋势方向</span>
          <span class="conclusion-value" style="color: ${directionColor}">${directionText}</span>
        </div>
      `;
    }

    html += '</div>';

    // 信号原因
    if (latestSignal && latestSignal.reason) {
      html += `
        <div class="signal-reason">
          <div class="reason-title">分析依据</div>
          <div class="reason-text">${latestSignal.reason}</div>
        </div>
      `;
    }

    content.innerHTML = html;
    logger.info('分析结论卡片渲染完成');
  } catch (error) {
    logger.error('Failed to render analysis card:', error);
    content.innerHTML = '<p class="loading-text">分析结论加载失败</p>';
  }
}

/**
 * 渲染合并后的操作建议卡片
 * @param {Array} signals - 信号数据
 * @param {Array} quotes - K线数据
 * @param {string} code - 股票代码
 */
async function renderActionCard(signals, quotes, code) {
  const actionDiv = document.getElementById('actions');
  if (!actionDiv) return;

  const content = actionDiv.querySelector('.data-card-content');
  if (!content) return;

  try {
    const latestSignal = signals && signals.length > 0 ? signals[0] : null;
    let html = '<div class="action-suggestions">';

    if (latestSignal) {
      // 操作建议
      const suggestion = latestSignal.direction === 'BULLISH' ? '考虑买入' :
                        latestSignal.direction === 'BEARISH' ? '考虑卖出' : '观望';
      const suggestionColor = latestSignal.direction === 'BULLISH' ? '#10b981' :
                             latestSignal.direction === 'BEARISH' ? '#ef4444' : '#9ca3af';
      const suggestionIcon = latestSignal.direction === 'BULLISH' ? '▲' :
                            latestSignal.direction === 'BEARISH' ? '▼' : '◆';

      html += `
        <div class="action-main">
          <span class="action-icon" style="color: ${suggestionColor}">${suggestionIcon}</span>
          <span class="action-text" style="color: ${suggestionColor}">${suggestion}</span>
        </div>
      `;

      // 风险提示
      if (latestSignal.score !== undefined) {
        const riskLevel = latestSignal.score >= 7 ? '低风险' :
                         latestSignal.score >= 4 ? '中等风险' : '高风险';
        const riskColor = latestSignal.score >= 7 ? '#10b981' :
                         latestSignal.score >= 4 ? '#f59e0b' : '#ef4444';
        html += `
          <div class="action-item">
            <span class="action-label">风险等级</span>
            <span class="action-value" style="color: ${riskColor}">${riskLevel}</span>
          </div>
        `;
      }

      // 快捷操作
      html += `
        <div class="quick-actions">
          <button class="action-btn" data-action="add-watchlist" data-code="${code}">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
            </svg>
            加入自选
          </button>
          <button class="action-btn" data-action="set-alert" data-code="${code}">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
            </svg>
            设置提醒
          </button>
        </div>
      `;
    } else {
      html += '<p class="loading-text">暂无操作建议</p>';
    }

    html += '</div>';
    content.innerHTML = html;
    logger.info('操作建议卡片渲染完成');
  } catch (error) {
    logger.error('Failed to render action card:', error);
    content.innerHTML = '<p class="loading-text">操作建议加载失败</p>';
  }
}

/**
 * 处理股票分析完成事件 - 编排所有渲染
 * @param {Object} param0 - 事件数据
 * @param {string} param0.code - 股票代码
 * @param {string} param0.timeframe - 分析周期
 * @param {Object} param0.analysis - 分析结果
 * @param {Array} param0.signals - 信号数据
 * @param {Array} param0.klines - K线数据
 */
async function handleStockAnalyzed({ code, timeframe, analysis, signals, klines }) {
  logger.info(`Stock analyzed event received: ${code}, timeframe: ${timeframe}`);

  let quotes = null;

  try {
    // 更新数据刷新时间
    updateDataRefreshTime();

    // 更新图表信息面板
    updateChartInfoPanel(analysis);

    // 优先使用事件中的K线数据，如果没有则重新获取
    if (klines && klines.length > 0) {
      quotes = klines;
      logger.info(`使用事件中的K线数据: ${quotes.length}条`);
    } else {
      // 获取K线数据（使用用户选择的周期）
      quotes = await stocksApi.getQuotes(code, timeframe || 'daily', 500);
    }

    // 渲染K线表格和图表
    await renderQuotes(code, quotes);

    // 渲染合并后的卡片（替代原来的4个卡片）
    const latestSignal = signals && signals.length > 0 ? signals[0] : null;
    const summary = latestSignal ? {
      score: latestSignal.score || 5,
      direction: latestSignal.direction || 'NEUTRAL',
      phase: latestSignal.wyckoff_phase || '震荡'
    } : null;

    await renderAnalysisCard(analysis, signals, summary);
    await renderActionCard(signals, quotes, code);

    // 加载并渲染多周期分析数据（到更多标签页）
    await renderMultiTimeframe(code);

    // 预测和形态识别已合并到卡片中，不再单独渲染
    // await renderPredictions(quotes, summary);
    // await renderPatterns(code);

  } catch (error) {
    logger.error('Failed to load or render quotes:', error);
    if (DOM.klineTable) {
      DOM.klineTable.innerHTML = '<div class="table-error">数据加载失败</div>';
    }
  }
}

/**
 * 在弹窗中显示多周期分析
 * @param {string} code - 股票代码
 * @param {string} name - 股票名称
 */
async function analyzeMultiInModal(code, name = '') {
  logger.info(`Opening multi-timeframe analysis modal for ${code}`);

  // 检测是否为移动端
  const isMobile = window.innerWidth < 768;

  // 创建弹窗
  const modal = document.createElement('div');
  modal.id = 'analysis-modal';
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 10000;
    padding: ${isMobile ? '10px' : '0'};
  `;

  const content = document.createElement('div');
  content.style.cssText = `
    background: #1f2937;
    border-radius: ${isMobile ? '8px' : '12px'};
    max-width: ${isMobile ? '100%' : '800px'};
    width: ${isMobile ? 'calc(100% - 20px)' : '95%'};
    max-height: ${isMobile ? '85vh' : '80vh'};
    padding: ${isMobile ? '12px' : '16px'};
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
    overflow-y: auto;
    position: relative;
    display: flex;
    flex-direction: column;
  `;

  // 关闭按钮
  const closeBtn = document.createElement('button');
  closeBtn.innerHTML = '×';
  closeBtn.style.cssText = `
    position: absolute;
    top: ${isMobile ? '8px' : '12px'};
    right: ${isMobile ? '8px' : '12px'};
    background: #374151;
    border: none;
    color: #f9fafb;
    width: ${isMobile ? '28px' : '32px'};
    height: ${isMobile ? '28px' : '32px'};
    border-radius: 50%;
    cursor: pointer;
    font-size: ${isMobile ? '16px' : '18px'};
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10;
  `;
  closeBtn.onclick = () => {
    document.body.removeChild(modal);
    document.body.style.overflow = '';
  };

  content.innerHTML = `
    <div style="margin-bottom: ${isMobile ? '8px' : '10px'}; padding-right: ${isMobile ? '36px' : '40px'};">
      <h2 style="color: #f9fafb; margin: 0; font-size: ${isMobile ? '14px' : '16px'}; line-height: 1.3;">&#128200; ${code}${name ? ' ' + name : ''} 多周期分析</h2>
    </div>
    <div id="modal-content" style="color: #10b981; text-align: center; padding: ${isMobile ? '12px' : '20px'}; flex: 1; overflow-y: auto;">
      &#127768; 正在加载...
    </div>
  `;

  content.appendChild(closeBtn);
  modal.appendChild(content);
  document.body.appendChild(modal);
  document.body.style.overflow = 'hidden';

  // 获取分析数据
  const modalContent = content.querySelector('#modal-content');

  try {
    // 多周期分析
    const MTF = await getMultiTimeframe();
    const timeframes = ['daily', 'weekly', 'monthly', '30', '60'];

    // 串行获取各周期数据
    const analysisData = [];
    for (const tf of timeframes) {
      try {
        const result = await apiClient.post(`/api/v1/stocks/${code}/analyze`, {
          code,
          timeframe: tf
        });

        analysisData.push({
          timeframe: tf,
          summary: result.analysis_summary || {},
          quote: result.current_quote,
          signals: result.signals || []
        });
      } catch (error) {
        logger.warn(`Failed to load timeframe ${tf}:`, error);
      }
    }

    if (analysisData.length > 0) {
      // 使用弹窗模式渲染
      MTF.renderInModal(code, analysisData, modalContent);
      logger.info('多周期分析弹窗渲染完成');
    } else {
      modalContent.innerHTML = '<div style="color: #ef4444; text-align: center; padding: 40px;">❌ 无法加载分析数据</div>';
    }
  } catch (error) {
    logger.error('Multi-timeframe analysis failed:', error);
    modalContent.innerHTML = `<div style="color: #ef4444; text-align: center; padding: 40px;">❌ 分析失败: ${error.message}</div>`;
  }
}

export {
  renderQuotes,
  renderSignals,
  renderMultiTimeframe,
  renderPredictions,
  renderPatterns,
  handleStockAnalyzed,
  analyzeMultiInModal
};
