/**
 * 全局配置文件
 * 包含应用配置、状态管理和事件总线
 */

import { logger } from './utils/logger.js';

// ========================================
// AppConfig - 应用配置
// ========================================

export const AppConfig = {
  // API 配置
  API_BASE: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080',
  API_TIMEOUT: 30000,

  // 调试模式
  DEBUG: import.meta.env.MODE === 'development',

  // 默认配置
  DEFAULTS: {
    // 股票分析默认参数
    STOCK: {
      CODE: '',
      TIMEFRAME: 'daily',
      LIMIT: 100,
      END_DATE: new Date().toISOString().split('T')[0]
    },

    // 分页配置
    PAGINATION: {
      PAGE: 1,
      LIMIT: 20,
      MAX_LIMIT: 100
    },

    // 刷新间隔（毫秒）
    REFRESH_INTERVAL: 60000 // 1分钟
  },

  // 图表配置
  CHART: {
    // 主题
    THEME: 'light', // 'light' | 'dark'

    // 动画
    ANIMATION: true,

    // 缩放
    ZOOM: true,

    // 数据点数量限制（性能考虑）
    MAX_DATA_POINTS: 1000,

    // 颜色配置
    COLORS: {
      UP: '#10b981',
      DOWN: '#ef4444',
      MA5: '#f59e0b',
      MA10: '#3b82f6',
      MA20: '#8b5cf6',
      MA60: '#ec4899',
      VOLUME_UP: 'rgba(16, 185, 129, 0.5)',
      VOLUME_DOWN: 'rgba(239, 68, 68, 0.5)'
    },

    // 工具提示
    TOOLTIP: {
      TRIGGER: 'axis',
      AXIS_POINTER: {
        type: 'cross'
      },
      CONFINE: true
    }
  },

  // 性能配置
  PERFORMANCE: {
    // 防抖延迟（毫秒）
    DEBOUNCE_DELAY: 300,

    // 节流延迟（毫秒）
    THROTTLE_DELAY: 200,

    // 虚拟滚动阈值
    VIRTUAL_SCROLL_THRESHOLD: 100,

    // 缓存大小（条目数）
    CACHE_SIZE: 100,

    // 缓存过期时间（毫秒）
    CACHE_TTL: 300000 // 5分钟
  },

  // UI 配置
  UI: {
    // Toast 通知配置
    TOAST: {
      DURATION: 3000, // 默认显示时长
      MAX_COUNT: 5, // 最大同时显示数量
      POSITION: 'top-right' // 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
    },

    // 加载状态
    LOADING: {
      MIN_DURATION: 500, // 最小显示时长（毫秒）
      SPINNER_SIZE: 'md' // 'sm' | 'md' | 'lg'
    },

    // 表格配置
    TABLE: {
      DEFAULT_PAGE_SIZE: 20,
      PAGE_SIZE_OPTIONS: [10, 20, 50, 100],
      SORT_MULTIPLE: true
    },

    // 主题配置
    THEME: {
      STORAGE_KEY: 'app-theme',
      DEFAULT: 'light',
      OPTIONS: ['light', 'dark', 'auto']
    }
  }
};

// ========================================
// AppState - 应用状态
// ========================================

export const AppState = {
  // 当前股票
  currentStock: {
    code: '',
    name: '',
    timeframe: 'daily',
    data: [],
    analysis: null
  },

  // 关注列表
  watchlist: {
    items: [],
    loading: false,
    error: null
  },

  // 当前标签页
  currentTab: 'chart', // 'chart' | 'table' | 'analysis'

  // 加载状态
  loading: {
    stock: false,
    analysis: false,
    watchlist: false
  },

  // 错误状态
  error: {
    stock: null,
    analysis: null,
    watchlist: null
  },

  // 图表实例
  charts: {
    main: null,
    volume: null
  },

  // 主题
  theme: localStorage.getItem(AppConfig.UI.THEME.STORAGE_KEY) || AppConfig.UI.THEME.DEFAULT,

  // 用户偏好
  preferences: {
    autoRefresh: false,
    refreshInterval: AppConfig.DEFAULTS.REFRESH_INTERVAL,
    showVolume: true,
    showMA: true,
    chartType: 'candlestick' // 'candlestick' | 'line'
  }
};

// ========================================
// EventBus - 事件总线
// ========================================

export class EventBus {
  constructor() {
    this.events = {};
    logger.debug('EventBus initialized');
  }

  /**
   * 订阅事件
   * @param {string} event - 事件名称
   * @param {Function} callback - 回调函数
   * @returns {Function} 取消订阅函数
   */
  on(event, callback) {
    if (!this.events[event]) {
      this.events[event] = [];
    }

    this.events[event].push(callback);

    logger.debug(`Event subscribed: ${event}`);

    // 返回取消订阅函数
    return () => this.off(event, callback);
  }

  /**
   * 取消订阅事件
   * @param {string} event - 事件名称
   * @param {Function} callback - 回调函数
   */
  off(event, callback) {
    if (!this.events[event]) {
      return;
    }

    this.events[event] = this.events[event].filter(cb => cb !== callback);

    logger.debug(`Event unsubscribed: ${event}`);

    // 如果没有订阅者了，删除事件
    if (this.events[event].length === 0) {
      delete this.events[event];
    }
  }

  /**
   * 触发事件
   * @param {string} event - 事件名称
   * @param {*} data - 事件数据
   */
  emit(event, data) {
    if (!this.events[event]) {
      logger.debug(`Event emitted but no listeners: ${event}`);
      return;
    }

    logger.debug(`Event emitted: ${event}`, data);

    this.events[event].forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        logger.error(`Error in event handler for ${event}:`, error);
      }
    });
  }

  /**
   * 订阅一次性事件
   * @param {string} event - 事件名称
   * @param {Function} callback - 回调函数
   */
  once(event, callback) {
    const onceCallback = (data) => {
      callback(data);
      this.off(event, onceCallback);
    };

    this.on(event, onceCallback);
  }

  /**
   * 清除所有事件监听器
   */
  clear() {
    this.events = {};
    logger.debug('All events cleared');
  }

  /**
   * 获取事件监听器数量
   * @param {string} event - 事件名称
   * @returns {number} 监听器数量
   */
  listenerCount(event) {
    return this.events[event]?.length || 0;
  }
}

// 创建全局事件总线实例
export const eventBus = new EventBus();

// ========================================
// 事件名称常量
// ========================================

export const Events = {
  // 股票相关事件
  STOCK_LOAD_START: 'stock:load:start',
  STOCK_LOAD_SUCCESS: 'stock:load:success',
  STOCK_LOAD_ERROR: 'stock:load:error',
  STOCK_ANALYZED: 'stock:analyzed',

  // 关注列表事件
  WATCHLIST_LOAD_START: 'watchlist:load:start',
  WATCHLIST_LOAD_SUCCESS: 'watchlist:load:success',
  WATCHLIST_LOAD_ERROR: 'watchlist:load:error',
  WATCHLIST_ADD: 'watchlist:add',
  WATCHLIST_REMOVE: 'watchlist:remove',
  WATCHLIST_UPDATE: 'watchlist:update',
  WATCHLIST_CHANGED: 'watchlist:changed',

  // 图表事件
  CHART_READY: 'chart:ready',
  CHART_UPDATE: 'chart:update',
  CHART_ZOOM: 'chart:zoom',
  CHART_RESIZE: 'chart:resize',

  // UI 事件
  TAB_CHANGE: 'ui:tab:change',
  THEME_CHANGE: 'ui:theme:change',
  TOAST_SHOW: 'ui:toast:show',
  TOAST_HIDE: 'ui:toast:hide',

  // 错误事件
  ERROR_OCCURRED: 'error:occurred',
  ERROR_CLEARED: 'error:cleared'
};

// ========================================
// 工具函数
// ========================================

/**
 * 更新应用状态
 * @param {Object} updates - 状态更新
 */
export function updateState(updates) {
  Object.assign(AppState, updates);

  logger.debug('State updated:', updates);

  // 触发状态更新事件
  eventBus.emit(Events.CHART_UPDATE, updates);
}

/**
 * 获取应用配置
 * @param {string} path - 配置路径（例如：'API_TIMEOUT'）
 * @returns {*} 配置值
 */
export function getConfig(path) {
  return path.split('.').reduce((obj, key) => obj?.[key], AppConfig);
}

/**
 * 设置用户偏好
 * @param {Object} preferences - 偏好设置
 */
export function setPreferences(preferences) {
  Object.assign(AppState.preferences, preferences);

  // 保存到 localStorage
  try {
    localStorage.setItem('app-preferences', JSON.stringify(AppState.preferences));
  } catch (error) {
    logger.error('Failed to save preferences:', error);
  }

  logger.debug('Preferences updated:', preferences);
}

/**
 * 加载用户偏好
 */
export function loadPreferences() {
  try {
    const saved = localStorage.getItem('app-preferences');
    if (saved) {
      Object.assign(AppState.preferences, JSON.parse(saved));
      logger.debug('Preferences loaded:', AppState.preferences);
    }
  } catch (error) {
    logger.error('Failed to load preferences:', error);
  }
}

// 初始化时加载用户偏好
loadPreferences();
