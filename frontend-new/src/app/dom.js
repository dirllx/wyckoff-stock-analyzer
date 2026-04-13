/**
 * DOM 元素引用模块
 * 负责管理和验证 DOM 元素引用
 */

import { logger } from '../utils/logger.js';

const DOM = {
  stockInput: null,
  analyzeBtn: null,
  addWatchlistBtn: null,
  mainChart: null,
  volumeChart: null,
  klineTable: null,
  analysisDiv: null,
  analyzeResultDiv: null,
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
  tabNav: null,
  // 视图切换按钮
  btnTable: null,
  btnChart: null,
  // 视图模式容器
  tableMode: null,
  chartMode: null,
  // 图表信息面板
  wyckoffPhasePanel: null,
  operationZonePanel: null,
  predictionConfidencePanel: null,
  // 关注列表选择器
  watchlistPickerModal: null,
  watchlistPickerContent: null,
  // 健康状态栏元素
  overallStatusDot: null,
  overallStatusText: null,
  dbStatusDot: null,
  dbStatusText: null,
  redisStatusDot: null,
  redisStatusText: null
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
  // klineTable 现在指向 tableMode 容器（表格模式容器）
  DOM.klineTable = document.getElementById('tableMode') || document.getElementById('klineTable');
  DOM.analysisDiv = document.getElementById('analysis');
  DOM.analyzeResultDiv = document.getElementById('analyzeResult');
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

  // 视图切换按钮
  DOM.btnTable = document.getElementById('btnTable');
  DOM.btnChart = document.getElementById('btnChart');

  // 视图模式容器
  DOM.tableMode = document.getElementById('tableMode');
  DOM.chartMode = document.getElementById('chartMode');

  // 图表信息面板
  DOM.wyckoffPhasePanel = document.getElementById('wyckoff-phase-panel');
  DOM.operationZonePanel = document.getElementById('operation-zone-panel');
  DOM.predictionConfidencePanel = document.getElementById('prediction-confidence-panel');
  DOM.wyckoffPhaseContent = document.getElementById('wyckoff-phase-content');
  DOM.operationZoneContent = document.getElementById('operation-zone-content');
  DOM.predictionConfidence = document.getElementById('prediction-confidence');

  // 关注列表选择器
  DOM.watchlistPickerModal = document.getElementById('watchlistPickerModal');
  DOM.watchlistPickerContent = document.getElementById('watchlistPickerContent');

  // 健康状态栏元素
  DOM.overallStatusDot = document.getElementById('overallStatusDot');
  DOM.overallStatusText = document.getElementById('overallStatusText');
  DOM.dbStatusDot = document.getElementById('dbStatusDot');
  DOM.dbStatusText = document.getElementById('dbStatusText');
  DOM.redisStatusDot = document.getElementById('redisStatusDot');
  DOM.redisStatusText = document.getElementById('redisStatusText');

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
  // klineTable 可选，因为默认使用表格模式(tableMode)
  // if (!DOM.klineTable) missing.push('klineTable container');

  if (missing.length > 0) {
    throw new Error(`Missing DOM elements: ${missing.join(', ')}`);
  }

  logger.debug('DOM validation passed');
}

export { DOM, initDOM, validateDOM };
