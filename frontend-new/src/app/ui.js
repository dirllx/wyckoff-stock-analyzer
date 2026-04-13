/**
 * UI 管理模块
 * 负责标签页切换、主题管理和极简模式
 */

import { logger } from '../utils/logger.js';
import { toast } from '../utils/toast.js';
import { AppConfig, AppState, Events, eventBus } from '../config.js';
import { DOM } from './dom.js';

/**
 * 极简模式状态
 */
const MinimalMode = {
  isEnabled: false,
  STORAGE_KEY: 'minimal_mode',

  /**
   * 初始化极简模式
   */
  init() {
    const saved = localStorage.getItem(this.STORAGE_KEY);
    if (saved === 'true') {
      this.enable(false); // false = don't show toast
    }
  },

  /**
   * 启用极简模式
   */
  enable(showToast = true) {
    document.body.classList.add('minimal-mode');
    document.getElementById('minimal-style').disabled = false;
    this.isEnabled = true;
    localStorage.setItem(this.STORAGE_KEY, 'true');

    if (showToast) {
      toast.success('已启用极简模式');
    }
    logger.info('Minimal mode enabled');
  },

  /**
   * 禁用极简模式
   */
  disable(showToast = true) {
    document.body.classList.remove('minimal-mode');
    document.getElementById('minimal-style').disabled = true;
    this.isEnabled = false;
    localStorage.setItem(this.STORAGE_KEY, 'false');

    if (showToast) {
      toast.success('已切换到标准模式');
    }
    logger.info('Minimal mode disabled');
  },

  /**
   * 切换极简模式
   */
  toggle() {
    if (this.isEnabled) {
      this.disable();
    } else {
      this.enable();
    }
  }
};

/**
 * 切换标签页
 * @param {string} tabName - 标签页名称
 */
function switchTab(tabName) {
  // 移除所有Tab特定的布局类
  document.body.classList.remove('layout-analyze', 'layout-multi', 'layout-watchlist', 'layout-config', 'layout-status');

  // 添加当前Tab的布局类
  document.body.classList.add(`layout-${tabName}`);

  // 更新标签按钮状态
  const buttons = DOM.tabNav.querySelectorAll('.tab-btn');
  buttons.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabName);
  });

  // 更新面板显示
  const panels = document.querySelectorAll('.tab-content');
  panels.forEach(panel => {
    panel.classList.toggle('active', panel.id === `tab-${tabName}`);
  });

  logger.info(`Switched to tab: ${tabName}`);

  // 触发Tab切换事件
  eventBus.emit(Events.TAB_CHANGE, { tabName });
}

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

export { switchTab, initTheme, toggleTheme, MinimalMode };
