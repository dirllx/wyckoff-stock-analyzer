/**
 * 视图状态管理模块
 * 负责管理用户的视图偏好（图表/表格切换）
 */

import { logger } from '../utils/logger.js';
import { DOM } from './dom.js';

const STORAGE_KEY = 'chart-view-preference';
const VIEW_TYPES = {
  CHART: 'chart',
  TABLE: 'table'
};

/**
 * 视图管理器
 */
export class ViewManager {
  constructor() {
    this.currentView = this.loadPreference() || VIEW_TYPES.CHART;
  }

  /**
   * 加载用户视图偏好
   * @returns {string} 视图类型
   */
  loadPreference() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved && (saved === VIEW_TYPES.CHART || saved === VIEW_TYPES.TABLE)) {
        logger.debug(`Loaded view preference: ${saved}`);
        return saved;
      }
    } catch (error) {
      logger.error('Failed to load view preference:', error);
    }
    return VIEW_TYPES.CHART;
  }

  /**
   * 保存用户视图偏好
   * @param {string} viewType - 视图类型
   */
  savePreference(viewType) {
    try {
      localStorage.setItem(STORAGE_KEY, viewType);
      logger.debug(`Saved view preference: ${viewType}`);
    } catch (error) {
      logger.error('Failed to save view preference:', error);
    }
  }

  /**
   * 切换到图表视图
   */
  switchToChart() {
    this.currentView = VIEW_TYPES.CHART;
    this.savePreference(VIEW_TYPES.CHART);
    this.updateView();
    logger.info('Switched to chart view');
  }

  /**
   * 切换到表格视图
   */
  switchToTable() {
    this.currentView = VIEW_TYPES.TABLE;
    this.savePreference(VIEW_TYPES.TABLE);
    this.updateView();
    logger.info('Switched to table view');
  }

  /**
   * 更新视图显示
   */
  updateView() {
    // 更新按钮状态
    const buttons = document.querySelectorAll('.chart-control-btn');
    buttons.forEach(btn => {
      const viewType = btn.dataset.view;
      if (viewType === this.currentView) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    // 更新内容区域显示
    if (this.currentView === VIEW_TYPES.CHART) {
      this.showChartView();
    } else {
      this.showTableView();
    }
  }

  /**
   * 显示图表视图
   */
  showChartView() {
    if (DOM.mainChart) {
      DOM.mainChart.style.display = 'block';
    }
    if (DOM.volumeChart) {
      DOM.volumeChart.style.display = 'block';
    }
    if (DOM.klineTable) {
      DOM.klineTable.style.display = 'none';
    }
  }

  /**
   * 显示表格视图
   */
  showTableView() {
    if (DOM.mainChart) {
      DOM.mainChart.style.display = 'none';
    }
    if (DOM.volumeChart) {
      DOM.volumeChart.style.display = 'none';
    }
    if (DOM.klineTable) {
      DOM.klineTable.style.display = 'block';
    }
  }

  /**
   * 获取当前视图类型
   * @returns {string} 当前视图类型
   */
  getCurrentView() {
    return this.currentView;
  }

  /**
   * 初始化视图管理器
   */
  init() {
    // 绑定图表/表格切换按钮事件
    const buttons = document.querySelectorAll('.chart-control-btn');
    buttons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const viewType = e.target.dataset.view;

        if (viewType === VIEW_TYPES.CHART) {
          this.switchToChart();
        } else if (viewType === VIEW_TYPES.TABLE) {
          this.switchToTable();
        }
      });
    });

    // 应用保存的视图偏好
    this.updateView();

    logger.info('ViewManager initialized');
  }
}

// 导出视图类型常量
export const VIEW_TYPES = {
  CHART: 'chart',
  TABLE: 'table'
};

// 创建全局单例
let viewManager = null;

/**
 * 获取视图管理器实例
 * @returns {ViewManager} 视图管理器实例
 */
export function getViewManager() {
  if (!viewManager) {
    viewManager = new ViewManager();
  }
  return viewManager;
}
