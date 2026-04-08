/**
 * 渲染模块
 * 负责股票分析完成后的各类数据渲染
 */

import { logger } from '../utils/logger.js';
import { stocksApi } from '../api/stocks.js';
import { AppState } from '../config.js';
import { DOM } from './dom.js';

// Lazy-loaded component getters
const getKlineTable = () => import('../components/KlineTable.js').then(m => m.KlineTable);
const getStockChart = () => import('../components/StockChart.js').then(m => m.StockChart);
const getSignals = () => import('../components/Signals.js').then(m => m.Signals);
const getMultiTimeframe = () => import('../components/MultiTimeframe.js').then(m => m.MultiTimeframe);
const getPrediction = () => import('../components/Prediction.js').then(m => m.Prediction);
const getPatterns = () => import('../components/Patterns.js').then(m => m.Patterns);

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

    // 渲染K线表格
    const tableHTML = KT.render(quotes, 'daily');

    // 插入到DOM
    if (DOM.klineTable) {
      DOM.klineTable.innerHTML = tableHTML;
      logger.info('K线表格渲染完成');
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
