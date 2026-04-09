/**
 * 渲染模块
 * 负责股票分析完成后的各类数据渲染
 */

import { logger } from '../utils/logger.js';
import { stocksApi } from '../api/stocks.js';
import { AppState } from '../config.js';
import { DOM } from './dom.js';

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

    // 委托事件监听
    DOM.klineTable?.addEventListener('click', (event) => {
      // 处理排序
      const sortHeader = event.target.closest('th[data-sort-column]');
      if (sortHeader) {
        const column = sortHeader.dataset.sortColumn;
        handleTableSort(column, quotes, signals);
        return;
      }

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

      // 获取对应日期的信号
      const dateStr = quote.date ? quote.date.substring(0, 10) : null;
      const analysis = signalsMap && dateStr ? {
        direction: signalsMap[dateStr]?.direction || 'NEUTRAL',
        score: signalsMap[dateStr]?.score || 0,
        wyckoff_phase: signalsMap[dateStr]?.wyckoff_phase || '震荡',
        suggestion: signalsMap[dateStr]?.reason || ''
      } : null;

      // 显示详情弹窗
      modalFn(quote, analysis);
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
 * 处理表格排序
 * @param {string} column - 排序列
 * @param {Array} quotes - K线数据
 * @param {Array} signals - 信号数据
 */
async function handleTableSort(column, quotes, signals = null) {
  try {
    const KT = await getKlineTable();

    // 执行排序
    const sortedQuotes = KT.handleSort(column, quotes);

    // 重新渲染表格
    const signalsMap = signals ? KT.buildSignalsMap(signals) : null;
    const tableHTML = KT.render(sortedQuotes, 'daily', signals);

    if (DOM.klineTable) {
      DOM.klineTable.innerHTML = tableHTML;

      // 重新绑定事件
      bindKlineTableRowClicks(sortedQuotes, signals);
    }

    logger.debug(`表格已按 ${column} 排序`);
  } catch (error) {
    logger.error('Failed to sort table:', error);
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

      // 绑定行点击事件 - 显示详情弹窗
      bindKlineTableRowClicks(quotes, existingSignals);

      // 如果启用了虚拟滚动，初始化它
      if (quotes.length > 200) {
        const virtualContainer = DOM.klineTable.querySelector('.kline-table-virtual');
        if (virtualContainer) {
          KT.initVirtualScroll(virtualContainer, quotes, 'daily', signalsMap);
          logger.info('虚拟滚动已初始化');
        }
      }
    }

    // 渲染图表
    if (DOM.mainChart) {
      const mainChartInstance = SC.initMainChart(DOM.mainChart, quotes, 'daily');
      if (mainChartInstance) {
        AppState.charts.main = mainChartInstance;
        logger.info('主图表渲染完成');
      }
    }

    if (DOM.volumeChart) {
      const volumeChartInstance = SC.initVolumeChart(DOM.volumeChart, quotes, 'daily');
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
 * 处理股票分析完成事件 - 编排所有渲染
 * @param {Object} param0 - 事件数据
 * @param {string} param0.code - 股票代码
 * @param {Object} param0.analysis - 分析结果
 * @param {Array} param0.signals - 信号数据
 */
async function handleStockAnalyzed({ code, analysis, signals }) {
  logger.info(`Stock analyzed event received: ${code}`);

  let quotes = null;

  try {
    // 更新数据刷新时间
    updateDataRefreshTime();

    // 获取K线数据
    quotes = await stocksApi.getQuotes(code, 'daily', 100);

    // 渲染K线表格和图表
    await renderQuotes(code, quotes);

    // 渲染信号数据
    await renderSignals(signals);

    // 加载并渲染多周期分析数据
    await renderMultiTimeframe(code);

    // 渲染预测数据
    if (quotes && quotes.length > 0 && signals && signals.length > 0) {
      const latestSignal = signals[0];
      const summary = {
        score: latestSignal.score || 5,
        direction: latestSignal.direction || 'NEUTRAL',
        phase: latestSignal.wyckoff_phase || '震荡'
      };
      await renderPredictions(quotes, summary);
    } else {
      await renderPredictions(null, null);
    }

    // 渲染形态识别
    await renderPatterns(code);

  } catch (error) {
    logger.error('Failed to load or render quotes:', error);
    if (DOM.klineTable) {
      DOM.klineTable.innerHTML = '<div class="table-error">数据加载失败</div>';
    }
  }
}

export {
  renderQuotes,
  renderSignals,
  renderMultiTimeframe,
  renderPredictions,
  renderPatterns,
  handleStockAnalyzed
};
