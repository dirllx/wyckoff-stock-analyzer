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

export { DOM, initDOM, validateDOM };
